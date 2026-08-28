import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Team, Question, GameSettings, PlaylistMode, TeamCardAssignment, VariantSnapshotMeta } from './types';
import { getInitialGameState, saveGameState, DEFAULT_SETTINGS, getStoredRoomId, setStoredRoomId } from './utils/storage';
import {
  generateTeamCardDecks,
  createDemoState,
  DEMO_QUESTIONS,
  INITIAL_TEAMS,
  filterQuestionsByCategory,
  filterQuestionsByPlaylist,
  getUniqueQuestionCategories,
  getResolvedQuestionForTeam,
  resolveTeamQuestionVariants,
  computeVariantSnapshotHash,
} from './utils/presets';
import { sound } from './utils/sound';
import { checkAnswer } from './utils/answerChecker';
import { HeaderNav } from './components/HeaderNav';
import { GameArena } from './components/GameArena';
import { ScoreboardView } from './components/ScoreboardView';
import { AdminDashboard } from './components/AdminDashboard';
import { PrintableCards } from './components/PrintableCards';
import { GameOverModal } from './components/GameOverModal';
import { AccessGate } from './components/AccessGate';
import { AdminLoginModal } from './components/AdminLoginModal';
import { isAdminAuthenticated, logoutAdmin, getAdminSession, onAdminAuthStateChange } from './utils/auth';
import { RefreshCw, Check, Copy, Share2 } from 'lucide-react';
import {
  loadCompetitionFromDb,
  saveCompetitionToDb,
  saveAllQuestionsToDb,
  insertOrUpdateQuestionInDb,
  deleteQuestionFromDb,
  updateDbGameState,
  updateDbCardAssignment,
  updateDbTeamScore,
  insertDbActivityLog,
  subscribeToRoomRealtime,
  setCompetitionOrderLockedInDb,
  fetchQuestionsFromDb,
} from './services/dbService';

export default function App() {
  const [currentRoomId, setCurrentRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        const formatted = roomParam.trim().toUpperCase();
        setStoredRoomId(formatted);
        return formatted;
      }
    }
    return getStoredRoomId();
  });

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [gameState, setGameState] = useState<GameState>(() => {
    const initial = getInitialGameState();
    initial.competitionId = getStoredRoomId();
    return initial;
  });

  // Master Question Bank (Full pool of questions across all categories)
  const [masterQuestions, setMasterQuestions] = useState<Question[]>(() => DEMO_QUESTIONS);

  // Authentication State for Guru / Admin (Supabase Cloud Auth)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => isAdminAuthenticated());
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(null);

  // Supabase Auth session listener
  useEffect(() => {
    getAdminSession().then((session) => {
      setIsAdminLoggedIn(!!session);
    });

    const { unsubscribe } = onAdminAuthStateChange((_event, session) => {
      setIsAdminLoggedIn(!!session);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'gate' | 'arena' | 'scoreboard' | 'admin' | 'print'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'gate' || tabParam === 'arena' || tabParam === 'scoreboard' || tabParam === 'admin' || tabParam === 'print') {
        if (tabParam === 'admin' && !isAdminAuthenticated()) {
          return 'gate';
        }
        return tabParam;
      }
      // If a team is provided in URL, go straight to arena
      if (params.get('team')) {
        return 'arena';
      }
    }
    // Default to Access Gate so participants or general visitors see the public landing gate
    return 'gate';
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showGameOverModal, setShowGameOverModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Prevent double click on answer submissions
  const isSubmittingRef = useRef<boolean>(false);

  // Auto-save game state to localStorage as local cache
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  // Sync audio enabled setting
  useEffect(() => {
    sound.setEnabled(gameState.settings.soundEnabled);
  }, [gameState.settings.soundEnabled]);

  // -------------------------------------------------------------
  // DATABASE LOADER & REALTIME SYNC (SUPABASE SINGLE SOURCE OF TRUTH)
  // -------------------------------------------------------------
  const loadRoomData = useCallback(async (roomId: string, isBackgroundSync: boolean = false) => {
    if (!isBackgroundSync) setIsSyncing(true);
    try {
      const [cloudState, allMasterQuestions] = await Promise.all([
        loadCompetitionFromDb(roomId),
        fetchQuestionsFromDb(roomId),
      ]);

      if (allMasterQuestions && allMasterQuestions.length > 0) {
        setMasterQuestions(allMasterQuestions);
      }

      if (cloudState) {
        setGameState((prev) => {
          // If match is running, compute real-time remaining from started_at
          let calculatedRemaining = cloudState.timeRemainingSeconds;
          if (cloudState.status === 'running' && cloudState.startedAt) {
            const elapsed = Math.floor((Date.now() - cloudState.startedAt) / 1000);
            calculatedRemaining = Math.max(0, cloudState.timeRemainingSeconds - elapsed);
          }

          // Active master pool to resolve questions from
          const masterPool =
            allMasterQuestions && allMasterQuestions.length > 0
              ? allMasterQuestions
              : masterQuestions && masterQuestions.length > 0
              ? masterQuestions
              : DEMO_QUESTIONS;

          // Determine official active match questions snapshot
          let finalQuestions: Question[] = [];

          const activeIds =
            cloudState.activeQuestionIds && cloudState.activeQuestionIds.length > 0
              ? cloudState.activeQuestionIds
              : cloudState.settings.customQuestionIds && cloudState.settings.customQuestionIds.length > 0
              ? cloudState.settings.customQuestionIds
              : [];

          if (activeIds.length > 0) {
            const qMap = new Map(masterPool.map((q) => [q.id, q]));
            finalQuestions = activeIds.map((id) => qMap.get(id)).filter(Boolean) as Question[];
          }

          if (finalQuestions.length === 0) {
            if (cloudState.questions && cloudState.questions.length > 0) {
              finalQuestions = cloudState.questions;
            } else {
              finalQuestions = filterQuestionsByPlaylist(masterPool, {
                playlistMode: cloudState.settings.playlistMode,
                selectedTopic: cloudState.settings.selectedTopic,
                selectedTopics: cloudState.settings.selectedTopics,
                customQuestionIds: cloudState.settings.customQuestionIds,
              });
            }
          }

          if (finalQuestions.length === 0) {
            finalQuestions = prev.questions && prev.questions.length > 0 ? prev.questions : DEMO_QUESTIONS;
          }

          // Protect teams: if cloud has teams, use them
          const finalTeams =
            cloudState.teams && cloudState.teams.length > 0
              ? cloudState.teams
              : prev.teams && prev.teams.length > 0
              ? prev.teams
              : INITIAL_TEAMS;

          // Ensure decks are generated & validated for the active snapshot only
          let finalDecks = cloudState.teamCardDecks;
          if (!finalDecks || Object.keys(finalDecks).length === 0) {
            finalDecks = generateTeamCardDecks(finalTeams, finalQuestions);
          } else {
            // Check if existing deck cards match the active snapshot
            const validQIds = new Set(finalQuestions.map((q) => q.id));
            const validatedDecks: Record<string, TeamCardAssignment[]> = {};
            let deckMismatch = false;

            Object.entries(finalDecks).forEach(([tId, cards]) => {
              const matchedCards = cards.filter((c) => validQIds.has(c.questionId));
              if (matchedCards.length !== finalQuestions.length) {
                deckMismatch = true;
              }
              validatedDecks[tId] = matchedCards;
            });

            if (deckMismatch && !cloudState.orderLocked) {
              finalDecks = generateTeamCardDecks(finalTeams, finalQuestions);
            } else if (Object.keys(validatedDecks).length > 0 && !deckMismatch) {
              finalDecks = validatedDecks;
            }
          }

          return {
            ...cloudState,
            activeQuestionIds: finalQuestions.map((q) => q.id),
            questions: finalQuestions, // ACTIVE MATCH SNAPSHOT ONLY
            teams: finalTeams,
            teamCardDecks: finalDecks,
            timeRemainingSeconds: calculatedRemaining,
          };
        });
      } else {
        // If room does not exist in DB yet, attempt to initialize it with current initial state
        const initial = getInitialGameState();
        initial.competitionId = roomId;
        saveCompetitionToDb(initial, roomId).catch(() => {});
        setGameState(initial);
      }
    } catch (err) {
      console.error('[loadRoomData Error]', err);
    } finally {
      if (!isBackgroundSync) {
        setIsSyncing(false);
        setIsInitialLoading(false);
      }
    }
  }, [masterQuestions]);

  // Load room data on mount and whenever currentRoomId changes
  useEffect(() => {
    loadRoomData(currentRoomId, false);
  }, [currentRoomId, loadRoomData]);

  // Realtime subscription: When another PC changes something in this room
  useEffect(() => {
    if (!currentRoomId) return;

    const unsubscribe = subscribeToRoomRealtime(currentRoomId, () => {
      // Trigger background reload without flashing loaders
      loadRoomData(currentRoomId, true);
    });

    return () => {
      unsubscribe();
    };
  }, [currentRoomId, loadRoomData]);

  const handleChangeRoomId = (newRoomId: string) => {
    const formatted = newRoomId.trim().toUpperCase();
    if (!formatted) return;
    setStoredRoomId(formatted);
    setCurrentRoomId(formatted);
    setGameState((prev) => ({ ...prev, competitionId: formatted }));
  };

  const handleRefreshFromCloud = async () => {
    await loadRoomData(currentRoomId, false);
  };

  // -------------------------------------------------------------
  // SYNCHRONIZED TIMER LOGIC (Rule 14)
  // -------------------------------------------------------------
  useEffect(() => {
    let timer: number | null = null;

    if (gameState.status === 'running') {
      timer = window.setInterval(() => {
        setGameState((prev) => {
          if (prev.timeRemainingSeconds <= 1) {
            // Time up!
            setShowGameOverModal(true);
            const finishedLogs = [
              {
                id: `log-${Date.now()}`,
                timestamp: Date.now(),
                timeFormatted: new Date().toLocaleTimeString('id-ID'),
                type: 'game_finish' as const,
                message: '⏰ Waktu pertandingan telah habis!',
              },
              ...prev.activityLogs,
            ];

            updateDbGameState(currentRoomId, {
              status: 'finished',
              time_remaining_seconds: 0,
              started_at: null,
            });

            return {
              ...prev,
              timeRemainingSeconds: 0,
              status: 'finished',
              activityLogs: finishedLogs,
            };
          }

          // Sound tick if 10 seconds or less
          if (prev.timeRemainingSeconds <= 10 && prev.timeRemainingSeconds > 0) {
            sound.playTick();
          }

          return {
            ...prev,
            timeRemainingSeconds: prev.timeRemainingSeconds - 1,
          };
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState.status, currentRoomId]);

  // Auto-dismiss evaluation popup after delay to release lock
  useEffect(() => {
    let timeout: number | null = null;
    if (gameState.lastEvaluation) {
      const delay = (gameState.settings.autoReturnDelaySeconds || 2.5) * 1000;
      timeout = window.setTimeout(() => {
        handleDismissEvaluation();
      }, delay);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [gameState.lastEvaluation]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen API may be blocked in some iframe contexts
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleToggleSound = () => {
    setGameState((prev) => {
      const nextSound = !prev.settings.soundEnabled;
      sound.setEnabled(nextSound);
      if (nextSound) sound.playClick();
      return {
        ...prev,
        settings: {
          ...prev.settings,
          soundEnabled: nextSound,
        },
      };
    });
  };

  // -------------------------------------------------------------
  // GAME MATCH CONTROLS
  // -------------------------------------------------------------
  const handleStartPause = () => {
    const now = Date.now();
    setGameState((prev) => {
      if (prev.status === 'running') {
        const nextLogs = [
          {
            id: `log-${now}`,
            timestamp: now,
            timeFormatted: new Date(now).toLocaleTimeString('id-ID'),
            type: 'game_pause' as const,
            message: 'Pertandingan di-jeda oleh panitia.',
          },
          ...prev.activityLogs,
        ];

        // Sync pause to DB
        updateDbGameState(currentRoomId, {
          status: 'paused',
          time_remaining_seconds: prev.timeRemainingSeconds,
          started_at: null,
        });

        return {
          ...prev,
          status: 'paused',
          activityLogs: nextLogs,
        };
      } else {
        sound.playStart();
        const nextLogs = [
          {
            id: `log-${now}`,
            timestamp: now,
            timeFormatted: new Date(now).toLocaleTimeString('id-ID'),
            type: 'game_start' as const,
            message: 'Pertandingan dimulai! Waktu berjalan.',
          },
          ...prev.activityLogs,
        ];

        // Sync start to DB
        updateDbGameState(currentRoomId, {
          status: 'running',
          started_at: now,
          time_remaining_seconds: prev.timeRemainingSeconds,
        });

        return {
          ...prev,
          status: 'running',
          startedAt: now,
          activityLogs: nextLogs,
        };
      }
    });
  };

  const handleResetTimer = () => {
    const newRemaining = gameState.settings.durationMinutes * 60;
    setGameState((prev) => ({
      ...prev,
      status: 'ready',
      timeRemainingSeconds: newRemaining,
      startedAt: null,
      activeTeamId: null,
      activeSince: null,
      activeQuestionIndex: null,
      lastEvaluation: null,
    }));

    updateDbGameState(currentRoomId, {
      status: 'ready',
      time_remaining_seconds: newRemaining,
      started_at: null,
      active_team_id: null,
      active_card_number: null,
      active_since: null,
      last_evaluation: null,
    });
  };

  // -------------------------------------------------------------
  // "SIAPA CEPAT DIA DAPAT" GAMEPLAY ACTIONS
  // -------------------------------------------------------------
  const handleSelectTeam = (teamId: string) => {
    const team = gameState.teams.find((t) => t.id === teamId);
    if (!team) return;

    const now = Date.now();
    const timeFormatted = new Date(now).toLocaleTimeString('id-ID') + `.${String(now % 1000).padStart(3, '0')}`;

    const newLog = {
      id: `log-${now}`,
      timestamp: now,
      timeFormatted,
      teamId,
      teamName: team.name,
      type: 'tap' as const,
      message: `⚡ Kelompok ${team.name} berhasil melakukan tap buzzer! (Waktu: ${timeFormatted})`,
    };

    setGameState((prev) => ({
      ...prev,
      activeTeamId: teamId,
      activeSince: now,
      activeQuestionIndex: null,
      lastEvaluation: null,
      activityLogs: [newLog, ...prev.activityLogs],
    }));

    // Sync to DB
    updateDbGameState(currentRoomId, {
      active_team_id: teamId,
      active_since: now,
      active_card_number: null,
      last_evaluation: null,
    });
    insertDbActivityLog(currentRoomId, newLog);
  };

  const handleSelectCard = (cardNumber: number | null) => {
    const num = cardNumber !== null ? Number(cardNumber) : null;
    setGameState((prev) => ({
      ...prev,
      activeQuestionIndex: num,
    }));

    updateDbGameState(currentRoomId, {
      active_card_number: num,
    });
  };

  const handleCancelActiveTeam = () => {
    setGameState((prev) => ({
      ...prev,
      activeTeamId: null,
      activeSince: null,
      activeQuestionIndex: null,
      lastEvaluation: null,
    }));

    updateDbGameState(currentRoomId, {
      active_team_id: null,
      active_since: null,
      active_card_number: null,
      last_evaluation: null,
    });
  };

  const handleSubmitAnswer = (cardNumber: number, submittedAnswer: string) => {
    if (!gameState.activeTeamId) return;

    // Prevent double submission
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const numCard = Number(cardNumber);
      const activeTeam = gameState.teams.find((t) => t.id === gameState.activeTeamId);
      if (!activeTeam) {
        isSubmittingRef.current = false;
        return;
      }

      const activeDeck = gameState.teamCardDecks[gameState.activeTeamId] || [];
      const card = activeDeck.find((c) => Number(c.cardNumber) === numCard) || {
        cardNumber: numCard,
        cardCode: `K-${String(numCard).padStart(2, '0')}`,
        questionId: gameState.questions[(numCard - 1) % Math.max(1, gameState.questions.length)]?.id || 'q-01',
        status: 'unanswered' as const,
        attempts: 0,
      };

      const question = getResolvedQuestionForTeam(
        gameState,
        gameState.activeTeamId,
        card.questionId || numCard
      );

      if (!question) {
        isSubmittingRef.current = false;
        return;
      }

      const isTimeout = submittedAnswer === '__TIMEOUT__';
      const evalResult = isTimeout
        ? { isCorrect: false, scoreEarned: 0, feedback: 'Waktu menjawab soal habis!' }
        : checkAnswer(submittedAnswer, question, gameState.settings.caseSensitive);
      const isCorrect = evalResult.isCorrect;
      const pointsAwarded =
        typeof evalResult.scoreEarned === 'number'
          ? evalResult.scoreEarned
          : isCorrect
          ? question.points || gameState.settings.pointsPerCorrect
          : 0;

      const now = Date.now();
      const timeFormatted = new Date(now).toLocaleTimeString('id-ID');

      // Update Team score and counts
      let updatedScore = activeTeam.score;
      let updatedCorrect = activeTeam.correctCount;
      let updatedWrong = activeTeam.wrongCount;

      const updatedTeams = gameState.teams.map((t) => {
        if (t.id === activeTeam.id) {
          updatedScore = t.score + pointsAwarded;
          updatedCorrect = isCorrect ? t.correctCount + 1 : t.correctCount;
          updatedWrong = !isCorrect ? t.wrongCount + 1 : t.wrongCount;
          return {
            ...t,
            score: updatedScore,
            correctCount: updatedCorrect,
            wrongCount: updatedWrong,
          };
        }
        return t;
      });

      // Update Card status in team deck
      let nextStatus = isCorrect
        ? 'correct'
        : gameState.settings.wrongAnswerRule === 'lock'
        ? 'locked'
        : 'wrong';

      let nextAttempts = card.attempts + 1;

      let foundCardInDeck = false;
      let updatedDeck = activeDeck.map((c) => {
        if (Number(c.cardNumber) === numCard) {
          foundCardInDeck = true;
          return {
            ...c,
            status: nextStatus as any,
            attempts: c.attempts + 1,
            lastAnswer: isTimeout ? '(WAKTU HABIS)' : submittedAnswer,
            answeredAt: now,
          };
        }
        return c;
      });

      if (!foundCardInDeck) {
        updatedDeck = [
          ...updatedDeck,
          {
            cardNumber: numCard,
            cardCode: `K-${String(numCard).padStart(2, '0')}`,
            questionId: question.id,
            status: nextStatus as any,
            attempts: 1,
            lastAnswer: isTimeout ? '(WAKTU HABIS)' : submittedAnswer,
            answeredAt: now,
          },
        ];
      }

      const updatedDecks = {
        ...gameState.teamCardDecks,
        [gameState.activeTeamId]: updatedDeck,
      };

      if (isCorrect) {
        sound.playCorrect();
      } else {
        sound.playWrong();
      }

      const evalData = {
        teamId: activeTeam.id,
        cardNumber: numCard,
        isCorrect,
        points: pointsAwarded,
        submittedAnswer: isTimeout ? '(WAKTU MENJAWAB HABIS)' : submittedAnswer,
        expectedAnswer: question.correctAnswer,
        timestamp: now,
      };

      const newLog = {
        id: `log-${now}`,
        timestamp: now,
        timeFormatted,
        teamId: activeTeam.id,
        teamName: activeTeam.name,
        type: (isCorrect ? 'answer_correct' : 'answer_wrong') as any,
        message: isTimeout
          ? `⏰ Kelompok ${activeTeam.name} kehabisan waktu menjawab Kartu #${String(numCard).padStart(2, '0')}!`
          : isCorrect
          ? `🟢 Kelompok ${activeTeam.name} BENAR pada Kartu #${String(numCard).padStart(2, '0')} (+${pointsAwarded} Poin)`
          : `🔴 Kelompok ${activeTeam.name} SALAH pada Kartu #${String(numCard).padStart(2, '0')}`,
        pointsChange: pointsAwarded,
      };

      setGameState((prev) => ({
        ...prev,
        teams: updatedTeams,
        teamCardDecks: updatedDecks,
        lastEvaluation: evalData,
        activityLogs: [newLog, ...prev.activityLogs],
      }));

      // Async write to Database
      updateDbTeamScore(currentRoomId, activeTeam.id, updatedScore, updatedCorrect, updatedWrong);
      updateDbCardAssignment(currentRoomId, activeTeam.id, numCard, {
        status: nextStatus,
        attempts: nextAttempts,
        last_answer: isTimeout ? '(WAKTU HABIS)' : submittedAnswer,
        answered_at: now,
      });
      updateDbGameState(currentRoomId, {
        last_evaluation: evalData,
      });
      insertDbActivityLog(currentRoomId, newLog);
    } finally {
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 500);
    }
  };

  const handleDismissEvaluation = () => {
    // Release active lock and return to main screen
    setGameState((prev) => ({
      ...prev,
      activeTeamId: null,
      activeSince: null,
      activeQuestionIndex: null,
      lastEvaluation: null,
    }));

    updateDbGameState(currentRoomId, {
      active_team_id: null,
      active_since: null,
      active_card_number: null,
      last_evaluation: null,
    });
  };

  // -------------------------------------------------------------
  // ADMIN UPDATE HANDLERS (With Supabase Sync, Custom Playlist & Snapshot)
  // -------------------------------------------------------------
  const handleApplyPlaylist = (
    playlistMode: PlaylistMode,
    options: {
      selectedTopic?: string;
      selectedTopics?: string[];
      selectedDifficulty?: string;
      questionCount?: number;
      customQuestionIds?: string[];
      playlistName?: string;
    }
  ) => {
    if (gameState.orderLocked) {
      console.warn('[handleApplyPlaylist blocked: order is locked]');
      return;
    }

    const snapshotQuestions = filterQuestionsByPlaylist(masterQuestions, {
      playlistMode,
      selectedTopic: options.selectedTopic,
      selectedTopics: options.selectedTopics,
      selectedDifficulty: options.selectedDifficulty,
      questionCount: options.questionCount,
      customQuestionIds: options.customQuestionIds,
      competitionId: currentRoomId,
    });

    const activeQuestionIds = snapshotQuestions.map((q) => q.id);
    const newDecks = generateTeamCardDecks(gameState.teams, snapshotQuestions);
    const nextVariants = resolveTeamQuestionVariants(gameState.teams, snapshotQuestions, currentRoomId);
    const snapshotHash = computeVariantSnapshotHash(nextVariants);
    const snapshotMeta: VariantSnapshotMeta = {
      version: 1,
      generatedAt: new Date().toISOString(),
      engineVersion: 'v1.0-deterministic',
      sourceQuestionIds: activeQuestionIds,
      snapshotHash,
    };

    console.log('[PLAYLIST SNAPSHOT CREATED]');
    console.log('selected playlist:', options.playlistName || options.selectedTopic || playlistMode);
    console.log('difficulty:', options.selectedDifficulty || 'all');
    console.log('filtered questions:', snapshotQuestions.map((q) => q.code));
    console.log('activeQuestionIds:', activeQuestionIds);
    console.log('snapshotHash:', snapshotHash);
    console.log('deck count:', Object.keys(newDecks).map((tId) => `${tId}: ${newDecks[tId].length}`));

    setGameState((prev) => {
      const nextSettings: GameSettings = {
        ...prev.settings,
        playlistMode,
        playlistName:
          options.playlistName ||
          (playlistMode === 'topic'
            ? `Topik: ${options.selectedTopic || 'Semua Topik'}`
            : playlistMode === 'custom'
            ? 'Custom Playlist'
            : 'Semua Soal Master'),
        selectedTopic: options.selectedTopic || '',
        selectedTopics: options.selectedTopics || [],
        selectedDifficulty: options.selectedDifficulty || 'all',
        questionCount: options.questionCount,
        customQuestionIds: activeQuestionIds,
        teamQuestionVariants: nextVariants,
        variantSnapshotMeta: snapshotMeta,
      };

      const nextState: GameState = {
        ...prev,
        activeQuestionIds,
        settings: nextSettings,
        questions: snapshotQuestions, // MATCH QUESTION SNAPSHOT
        teamCardDecks: newDecks,
        teamQuestionVariants: nextVariants,
        variantSnapshotMeta: snapshotMeta,
      };
      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
  };

  const handleSelectTopic = (newTopic: string) => {
    if (gameState.orderLocked) {
      console.warn('[handleSelectTopic blocked because order is locked]');
      return;
    }

    handleApplyPlaylist(newTopic ? 'topic' : 'all', {
      selectedTopic: newTopic,
      selectedDifficulty: gameState.settings.selectedDifficulty,
      questionCount: gameState.settings.questionCount,
    });
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    const topicChanged = (newSettings.selectedTopic || '') !== (gameState.settings.selectedTopic || '');
    const modeChanged = (newSettings.playlistMode || 'all') !== (gameState.settings.playlistMode || 'all');
    const diffChanged = (newSettings.selectedDifficulty || 'all') !== (gameState.settings.selectedDifficulty || 'all');
    const countChanged = (newSettings.questionCount || 0) !== (gameState.settings.questionCount || 0);
    const customIdsChanged =
      JSON.stringify(newSettings.customQuestionIds || []) !== JSON.stringify(gameState.settings.customQuestionIds || []);

    if ((topicChanged || modeChanged || diffChanged || countChanged || customIdsChanged) && gameState.orderLocked) {
      console.warn('[Changing playlist, difficulty or topic blocked because order is locked]');
      return;
    }

    let nextQuestions = gameState.questions;
    let nextDecks = gameState.teamCardDecks;
    let nextActiveIds = gameState.activeQuestionIds || gameState.questions.map((q) => q.id);

    if ((topicChanged || modeChanged || diffChanged || countChanged || customIdsChanged) && !gameState.orderLocked) {
      nextQuestions = filterQuestionsByPlaylist(masterQuestions, {
        playlistMode: newSettings.playlistMode,
        selectedTopic: newSettings.selectedTopic,
        selectedTopics: newSettings.selectedTopics,
        selectedDifficulty: newSettings.selectedDifficulty,
        questionCount: newSettings.questionCount,
        customQuestionIds: newSettings.customQuestionIds,
        competitionId: currentRoomId,
      });
      nextActiveIds = nextQuestions.map((q) => q.id);
      nextDecks = generateTeamCardDecks(gameState.teams, nextQuestions);
    }

    setGameState((prev) => {
      const nextVariants = resolveTeamQuestionVariants(gameState.teams, nextQuestions, currentRoomId);
      const nextState: GameState = {
        ...prev,
        activeQuestionIds: nextActiveIds,
        settings: {
          ...newSettings,
          customQuestionIds: nextActiveIds,
        },
        questions: nextQuestions,
        teamCardDecks: nextDecks,
        teamQuestionVariants: nextVariants,
        timeRemainingSeconds: prev.status === 'ready' ? newSettings.durationMinutes * 60 : prev.timeRemainingSeconds,
      };
      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
  };

  const handleUpdateTeams = (newTeams: Team[]) => {
    setGameState((prev) => {
      const isMatchStarted =
        prev.status === 'running' ||
        prev.status === 'paused' ||
        prev.teams.some((t) => (t.score && t.score > 0) || (t.correctCount && t.correctCount > 0));

      const newDecks = !isMatchStarted
        ? generateTeamCardDecks(newTeams, prev.questions)
        : prev.teamCardDecks;

      const nextVariants = resolveTeamQuestionVariants(newTeams, prev.questions, currentRoomId);
      const nextState: GameState = {
        ...prev,
        teams: newTeams,
        teamCardDecks: newDecks,
        teamQuestionVariants: nextVariants,
      };

      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
  };

  const handleUpdateQuestions = (newQuestions: Question[]) => {
    if (gameState.orderLocked) {
      console.warn('[handleUpdateQuestions blocked because order is locked]');
      return;
    }

    setGameState((prev) => {
      const isMatchStarted =
        prev.status === 'running' ||
        prev.status === 'paused' ||
        prev.teams.some((t) => (t.score && t.score > 0) || (t.correctCount && t.correctCount > 0));

      const newDecks = !isMatchStarted
        ? generateTeamCardDecks(prev.teams, newQuestions)
        : prev.teamCardDecks;

      const nextVariants = resolveTeamQuestionVariants(prev.teams, newQuestions, currentRoomId);
      const nextState: GameState = {
        ...prev,
        questions: newQuestions,
        teamCardDecks: newDecks,
        teamQuestionVariants: nextVariants,
      };

      // Persist questions directly to Supabase
      saveAllQuestionsToDb(currentRoomId, newQuestions).catch((err) => {
        console.error('[handleUpdateQuestions saveAllQuestions error]', err);
      });
      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
  };

  const handleToggleOrderLock = async (locked: boolean): Promise<{ success: boolean; error?: string }> => {
    setGameState((prev) => {
      const nextState: GameState = {
        ...prev,
        orderLocked: locked,
      };
      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
    return setCompetitionOrderLockedInDb(currentRoomId, locked);
  };

  const handleSaveQuestionDirect = async (
    question: Question,
    isEdit: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (gameState.orderLocked && !isEdit) {
      return {
        success: false,
        error: 'Urutan kartu sudah dikunci. Tidak dapat menambah soal baru ke dalam deck.',
      };
    }

    console.log('[MBB][QUESTION SAVE]', {
      id: question.id,
      code: question.code,
      category: question.category,
      isEdit,
    });

    const nextMaster = isEdit
      ? masterQuestions.map((q) => (q.id === question.id ? question : q))
      : [...masterQuestions, question];
    setMasterQuestions(nextMaster);

    const orderIdx = isEdit
      ? gameState.questions.findIndex((q) => q.id === question.id)
      : gameState.questions.length;

    const result = await insertOrUpdateQuestionInDb(currentRoomId, question, Math.max(0, orderIdx));
    if (result.success) {
      setGameState((prev) => {
        const isMatchStarted =
          prev.status === 'running' ||
          prev.status === 'paused' ||
          prev.teams.some((t) => (t.score && t.score > 0) || (t.correctCount && t.correctCount > 0));

        let nextQuestions: Question[];
        if (isEdit) {
          // Update the question inside match snapshot if present
          nextQuestions = prev.questions.map((q) => (q.id === question.id ? question : q));
        } else {
          // If match order is locked, adding to master doesn't alter snapshot
          if (prev.orderLocked) {
            nextQuestions = prev.questions;
          } else {
            // If active playlist is 'all' (or not set), include new question in active match questions
            const mode = prev.settings.playlistMode || 'all';
            if (mode === 'all') {
              nextQuestions = [...prev.questions, question];
            } else if (
              mode === 'topic' &&
              prev.settings.selectedTopic &&
              question.category &&
              question.category.trim().toLowerCase() === prev.settings.selectedTopic.trim().toLowerCase()
            ) {
              nextQuestions = [...prev.questions, question];
            } else {
              nextQuestions = prev.questions;
            }
          }
        }

        const newDecks = !isMatchStarted
          ? generateTeamCardDecks(prev.teams, nextQuestions)
          : prev.teamCardDecks;

        // Master Question Isolation: When editing a master question, preserve active match variant snapshot!
        const nextVariants =
          isEdit && prev.teamQuestionVariants && Object.keys(prev.teamQuestionVariants).length > 0
            ? prev.teamQuestionVariants
            : resolveTeamQuestionVariants(prev.teams, nextQuestions, currentRoomId);

        const nextState: GameState = {
          ...prev,
          questions: nextQuestions,
          teamCardDecks: newDecks,
          teamQuestionVariants: nextVariants,
        };
        saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
        return nextState;
      });
      return { success: true };
    } else {
      return result;
    }
  };

  const handleDeleteQuestionDirect = async (
    questionId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (gameState.orderLocked) {
      return {
        success: false,
        error: 'Urutan kartu sudah dikunci. Buka kembali status finalisasi sebelum menghapus soal.',
      };
    }

    const nextMaster = masterQuestions.filter((q) => q.id !== questionId);
    setMasterQuestions(nextMaster);

    const result = await deleteQuestionFromDb(currentRoomId, questionId);
    if (result.success) {
      setGameState((prev) => {
        const isMatchStarted =
          prev.status === 'running' ||
          prev.status === 'paused' ||
          prev.teams.some((t) => (t.score && t.score > 0) || (t.correctCount && t.correctCount > 0));

        // If the deleted question was in the active snapshot, remove it from active snapshot
        const nextQuestions = prev.questions.filter((q) => q.id !== questionId);
        const newDecks = !isMatchStarted
          ? generateTeamCardDecks(prev.teams, nextQuestions)
          : prev.teamCardDecks;

        const nextVariants = resolveTeamQuestionVariants(prev.teams, nextQuestions, currentRoomId);
        const nextState: GameState = {
          ...prev,
          questions: nextQuestions,
          teamCardDecks: newDecks,
          teamQuestionVariants: nextVariants,
        };
        saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
        return nextState;
      });
      return { success: true };
    } else {
      return result;
    }
  };

  const handleRegenerateDecks = (cardsPerTeam?: number, randomized: boolean = false) => {
    setGameState((prev) => {
      const newDecks = generateTeamCardDecks(prev.teams, prev.questions, cardsPerTeam, randomized);
      const nextState: GameState = {
        ...prev,
        teamCardDecks: newDecks,
      };
      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
  };

  const handleResetAllScores = () => {
    setGameState((prev) => {
      const resetTeams = prev.teams.map((t) => ({
        ...t,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
      }));

      const resetDecks: Record<string, typeof prev.teamCardDecks[string]> = {};
      Object.keys(prev.teamCardDecks).forEach((tId) => {
        resetDecks[tId] = prev.teamCardDecks[tId].map((c) => ({
          ...c,
          status: 'unanswered',
          attempts: 0,
          lastAnswer: undefined,
          answeredAt: undefined,
        }));
      });

      const resetLog = {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString('id-ID'),
        type: 'reset' as const,
        message: 'Seluruh skor dan status kartu di-reset ke 0 oleh admin.',
      };

      const nextState: GameState = {
        ...prev,
        teams: resetTeams,
        teamCardDecks: resetDecks,
        activeTeamId: null,
        activeSince: null,
        activeQuestionIndex: null,
        lastEvaluation: null,
        activityLogs: [resetLog, ...prev.activityLogs],
      };

      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
  };

  const handleUnlockBuzzer = () => {
    handleCancelActiveTeam();
  };

  const handleOverrideTeamScore = (teamId: string, delta: number) => {
    setGameState((prev) => {
      const targetTeam = prev.teams.find((t) => t.id === teamId);
      const updated = prev.teams.map((t) => (t.id === teamId ? { ...t, score: t.score + delta } : t));
      const log = {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString('id-ID'),
        type: 'score_override' as const,
        message: `Koreksi skor kelompok ${targetTeam?.name || ''}: ${delta > 0 ? `+${delta}` : delta} poin.`,
        pointsChange: delta,
      };

      const updatedTeam = updated.find((t) => t.id === teamId);
      if (updatedTeam) {
        updateDbTeamScore(currentRoomId, teamId, updatedTeam.score, updatedTeam.correctCount, updatedTeam.wrongCount);
        insertDbActivityLog(currentRoomId, log);
      }

      return {
        ...prev,
        teams: updated,
        activityLogs: [log, ...prev.activityLogs],
      };
    });
  };

  const handleLoadDemoData = () => {
    setMasterQuestions(DEMO_QUESTIONS);
    const demo = createDemoState();
    const activeTopic = gameState.settings.selectedTopic || '';
    const filtered = filterQuestionsByCategory(DEMO_QUESTIONS, activeTopic);
    const decks = generateTeamCardDecks(demo.teams, filtered);
    const variants = resolveTeamQuestionVariants(demo.teams, filtered, currentRoomId);
    const now = Date.now();
    const demoState: GameState = {
      competitionId: currentRoomId,
      settings: {
        ...DEFAULT_SETTINGS,
        selectedTopic: activeTopic,
        durationMinutes: 5,
        pointsPerCorrect: 10,
        penaltyWrong: 0,
        wrongAnswerRule: 'retry',
      },
      teams: demo.teams,
      questions: filtered,
      teamCardDecks: decks,
      teamQuestionVariants: variants,
      status: 'ready',
      timeRemainingSeconds: 5 * 60,
      activeTeamId: null,
      activeSince: null,
      activeQuestionIndex: null,
      lastEvaluation: null,
      activityLogs: [
        {
          id: `log-${now}`,
          timestamp: now,
          timeFormatted: new Date(now).toLocaleTimeString('id-ID'),
          type: 'game_start',
          message: `📦 Data Demo berhasil dimuat: 4 Kelompok, ${filtered.length} Soal${activeTopic ? ` (Topik: "${activeTopic}")` : ''}, Durasi 5 Menit.`,
        },
      ],
    };

    setGameState(demoState);
    saveCompetitionToDb(demoState, currentRoomId).catch(() => {});
    sound.playClick();
  };

  const handleResetMatch = () => {
    const now = Date.now();
    setGameState((prev) => {
      const decks = generateTeamCardDecks(prev.teams, prev.questions);
      const resetTeams = prev.teams.map((t) => ({ ...t, score: 0, correctCount: 0, wrongCount: 0 }));
      const nextState: GameState = {
        ...prev,
        teams: resetTeams,
        teamCardDecks: decks,
        status: 'ready',
        timeRemainingSeconds: prev.settings.durationMinutes * 60,
        activeTeamId: null,
        activeSince: null,
        activeQuestionIndex: null,
        lastEvaluation: null,
        activityLogs: [
          {
            id: `log-${now}`,
            timestamp: now,
            timeFormatted: new Date(now).toLocaleTimeString('id-ID'),
            type: 'score_override',
            message: '🔄 Pertandingan baru dimulai. Semua skor telah di-reset ke 0.',
          },
          ...prev.activityLogs,
        ],
      };
      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
    sound.playClick();
  };

  const handleRestartNewGame = () => {
    handleResetMatch();
    setActiveTab('arena');
    setShowGameOverModal(false);
  };

  const handleEndGameManually = () => {
    const now = Date.now();
    setGameState((prev) => {
      const nextState: GameState = {
        ...prev,
        status: 'finished',
        activeTeamId: null,
        activeSince: null,
        activeQuestionIndex: null,
        activityLogs: [
          {
            id: `log-${now}`,
            timestamp: now,
            timeFormatted: new Date(now).toLocaleTimeString('id-ID'),
            type: 'game_finish',
            message: '🛑 Pertandingan telah diakhiri secara manual oleh Admin/Guru.',
          },
          ...prev.activityLogs,
        ],
      };
      updateDbGameState(currentRoomId, {
        status: 'finished',
        started_at: null,
        active_team_id: null,
        active_card_number: null,
      });
      return nextState;
    });
    setShowGameOverModal(true);
    sound.playGameOver();
  };

  // Calculate total completed questions across all teams
  const totalCorrect = gameState.teams.reduce((acc, t) => acc + t.correctCount, 0);
  const totalWrong = gameState.teams.reduce((acc, t) => acc + t.wrongCount, 0);

  // Tab switcher with login guard for Admin
  const handleTabChange = (tab: 'gate' | 'arena' | 'scoreboard' | 'admin' | 'print') => {
    if (tab === 'admin' && !isAdminLoggedIn) {
      sound.playClick();
      setShowLoginModal(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setShowLoginModal(false);
    setActiveTab('admin');
  };

  const handleLogoutAdmin = () => {
    logoutAdmin();
    setIsAdminLoggedIn(false);
    sound.playClick();
    setActiveTab('gate');
  };

  const handleShareLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}&tab=gate`;
    navigator.clipboard.writeText(url);
    sound.playClick();
    setShareToastMessage(`Link Room ${currentRoomId} berhasil disalin!`);
    setTimeout(() => setShareToastMessage(null), 3000);
  };

  const handleEnterAsTeamFromGate = (teamId: string) => {
    handleSelectTeam(teamId);
    setActiveTab('arena');
  };

  const handleEnterArenaHostFromGate = () => {
    handleCancelActiveTeam();
    setActiveTab('arena');
  };

  const handleEnterScoreboardFromGate = () => {
    setActiveTab('scoreboard');
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="pointer-events-none fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/15 blur-[130px] rounded-full z-0" />
        <div className="pointer-events-none fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/15 blur-[130px] rounded-full z-0" />

        <div className="relative z-10 max-w-md w-full bg-slate-900/90 backdrop-blur-2xl border border-cyan-400/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(6,182,212,0.15)] text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase">
              <span>ROOM: {currentRoomId}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              Memuat Data dari Supabase...
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Menghubungkan ke database cloud bersama untuk sinkronisasi seluruh perangkat (Laptop, HP, Tablet)...
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 text-[11px] text-slate-300 space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-white">Sinkronisasi Real-Time Aktif</span>
            </div>
            <p className="text-slate-400 text-[10px]">
              Data soal, pengaturan, dan kelompok disamakan secara instan antargadget.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsInitialLoading(false)}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Lewati / Buka Langsung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950"
      style={{
        background: 'radial-gradient(circle at 0% 0%, #1e1b4b 0%, #020617 100%)',
      }}
    >
      {/* Frosted Glass Ambient Glow Orbs */}
      <div className="pointer-events-none fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/15 blur-[130px] rounded-full z-0" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/15 blur-[130px] rounded-full z-0" />
      <div className="pointer-events-none fixed top-[40%] left-[30%] w-[400px] h-[400px] bg-purple-500/10 blur-[140px] rounded-full z-0" />

      {/* Quick Toast Notification */}
      {shareToastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-bold text-xs flex items-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.4)] backdrop-blur-xl animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{shareToastMessage}</span>
        </div>
      )}

      {/* Top Fixed Header with Global Timer & Navigation & Room Sync */}
      <HeaderNav
        gameState={gameState}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onStartPause={handleStartPause}
        onResetTimer={handleResetTimer}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSound={handleToggleSound}
        currentRoomId={currentRoomId}
        onChangeRoomId={handleChangeRoomId}
        onMigrateSuccess={() => loadRoomData(currentRoomId, false)}
        isSyncing={isSyncing}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogoutAdmin={handleLogoutAdmin}
        onShareLink={handleShareLink}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-4 px-2 sm:px-6 relative z-10">
        {/* PUBLIC ACCESS GATE: Peserta & Link Game */}
        {activeTab === 'gate' && (
          <AccessGate
            gameState={gameState}
            currentRoomId={currentRoomId}
            onChangeRoomId={handleChangeRoomId}
            onEnterAsTeam={handleEnterAsTeamFromGate}
            onEnterArenaHost={handleEnterArenaHostFromGate}
            onEnterScoreboard={handleEnterScoreboardFromGate}
            onRequestAdminLogin={() => setShowLoginModal(true)}
          />
        )}

        {/* ARENA PERTANDINGAN */}
        {activeTab === 'arena' && (
          <GameArena
            gameState={gameState}
            onSelectTeam={handleSelectTeam}
            onSelectCard={handleSelectCard}
            onCancelActiveTeam={handleCancelActiveTeam}
            onSubmitAnswer={handleSubmitAnswer}
            onDismissEvaluation={handleDismissEvaluation}
            onEndGame={handleEndGameManually}
          />
        )}

        {/* KLASEMEN SCOREBOARD */}
        {activeTab === 'scoreboard' && <ScoreboardView gameState={gameState} />}

        {/* DASHBOARD ADMIN / GURU (SOAL, MATCH, SETTING) */}
        {activeTab === 'admin' && (
          <AdminDashboard
            gameState={gameState}
            masterQuestions={masterQuestions}
            onSelectTopic={handleSelectTopic}
            onApplyPlaylist={handleApplyPlaylist}
            onUpdateSettings={handleUpdateSettings}
            onUpdateTeams={handleUpdateTeams}
            onUpdateQuestions={handleUpdateQuestions}
            onSaveQuestionDirect={handleSaveQuestionDirect}
            onDeleteQuestionDirect={handleDeleteQuestionDirect}
            onRefreshFromCloud={handleRefreshFromCloud}
            onRegenerateDecks={handleRegenerateDecks}
            onStartPauseGame={handleStartPause}
            onResetTimer={handleResetTimer}
            onResetAllScores={handleResetAllScores}
            onUnlockBuzzer={handleUnlockBuzzer}
            onOverrideTeamScore={handleOverrideTeamScore}
            onLoadDemoData={handleLoadDemoData}
            onResetMatch={handleResetMatch}
            onToggleOrderLock={handleToggleOrderLock}
            onOpenArena={() => setActiveTab('arena')}
            onOpenPrint={() => setActiveTab('print')}
            onOpenScoreboard={() => setActiveTab('scoreboard')}
            onOpenGate={() => setActiveTab('gate')}
            onLogoutAdmin={handleLogoutAdmin}
          />
        )}

        {/* CETAK KARTU FISIK */}
        {activeTab === 'print' && (
          <PrintableCards
            gameState={gameState}
            onBackToAdmin={() => setActiveTab('admin')}
          />
        )}
      </main>

      {/* Frosted Glass Footer Status Bar */}
      <footer className="print:hidden h-14 px-4 sm:px-8 flex flex-wrap justify-between items-center bg-black/40 backdrop-blur-xl border-t border-white/10 text-[11px] uppercase font-bold tracking-widest text-slate-400 relative z-10">
        <div className="flex items-center gap-4 sm:gap-8">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>{totalCorrect} Soal Terjawab</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 bg-rose-400 rounded-full" />
            <span>{totalWrong} Jawaban Salah</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-slate-300">
            <span className={`w-2 h-2 rounded-full ${gameState.activeTeamId ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
            <span>
              {gameState.activeTeamId
                ? `Kelompok ${gameState.teams.find((t) => t.id === gameState.activeTeamId)?.name} Aktif`
                : 'Buzzer Terbuka'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 hidden md:inline">Measurement Block Blast v2.5 (Public Gate & Admin Protected)</span>
          <span className="bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/10 text-cyan-300 font-mono text-[10px]">
            ROOM: {currentRoomId} 🟢
          </span>
        </div>
      </footer>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Game Over Celebration Modal */}
      {showGameOverModal && (
        <GameOverModal
          gameState={gameState}
          onClose={() => setShowGameOverModal(false)}
          onRestartNewGame={handleRestartNewGame}
          onViewScoreboard={() => {
            setShowGameOverModal(false);
            setActiveTab('scoreboard');
          }}
        />
      )}
    </div>
  );
}
