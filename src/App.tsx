import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Team, Question, GameSettings } from './types';
import { getInitialGameState, saveGameState, DEFAULT_SETTINGS, getStoredRoomId, setStoredRoomId } from './utils/storage';
import { generateTeamCardDecks, createDemoState, DEMO_QUESTIONS } from './utils/presets';
import { sound } from './utils/sound';
import { checkAnswer } from './utils/answerChecker';
import { HeaderNav } from './components/HeaderNav';
import { GameArena } from './components/GameArena';
import { ScoreboardView } from './components/ScoreboardView';
import { AdminDashboard } from './components/AdminDashboard';
import { PrintableCards } from './components/PrintableCards';
import { GameOverModal } from './components/GameOverModal';
import {
  loadCompetitionFromDb,
  saveCompetitionToDb,
  updateDbGameState,
  updateDbCardAssignment,
  updateDbTeamScore,
  insertDbActivityLog,
  subscribeToRoomRealtime,
} from './services/dbService';

export default function App() {
  const [currentRoomId, setCurrentRoomId] = useState<string>(() => getStoredRoomId());
  const [gameState, setGameState] = useState<GameState>(() => {
    const initial = getInitialGameState();
    initial.competitionId = getStoredRoomId();
    return initial;
  });

  const [activeTab, setActiveTab] = useState<'arena' | 'scoreboard' | 'admin' | 'print'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'arena' || tabParam === 'scoreboard' || tabParam === 'admin' || tabParam === 'print') {
        return tabParam;
      }
    }
    return 'admin';
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
  // DATABASE LOADER & REALTIME SYNC
  // -------------------------------------------------------------
  const loadRoomData = useCallback(async (roomId: string, isBackgroundSync: boolean = false) => {
    if (!isBackgroundSync) setIsSyncing(true);
    try {
      const cloudState = await loadCompetitionFromDb(roomId);
      if (cloudState) {
        setGameState((prev) => {
          // If match is running, compute real-time remaining from started_at
          let calculatedRemaining = cloudState.timeRemainingSeconds;
          if (cloudState.status === 'running' && cloudState.startedAt) {
            const elapsed = Math.floor((Date.now() - cloudState.startedAt) / 1000);
            calculatedRemaining = Math.max(0, cloudState.timeRemainingSeconds - elapsed);
          }

          return {
            ...cloudState,
            timeRemainingSeconds: calculatedRemaining,
          };
        });
      } else {
        // If room does not exist in DB yet, attempt to initialize it with current local state
        saveCompetitionToDb(gameState, roomId).catch(() => {});
      }
    } catch (err) {
      console.error('[loadRoomData Error]', err);
    } finally {
      if (!isBackgroundSync) setIsSyncing(false);
    }
  }, [gameState]);

  // Load room data on mount and whenever currentRoomId changes
  useEffect(() => {
    loadRoomData(currentRoomId, false);
  }, [currentRoomId]);

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

      const question =
        gameState.questions.find((q) => q.id === card.questionId) ||
        gameState.questions[(numCard - 1) % Math.max(1, gameState.questions.length)] ||
        gameState.questions[0];

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
  // ADMIN UPDATE HANDLERS (With Supabase Sync)
  // -------------------------------------------------------------
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setGameState((prev) => {
      const nextState: GameState = {
        ...prev,
        settings: newSettings,
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
        ? generateTeamCardDecks(newTeams, prev.questions, prev.questions.length, true)
        : prev.teamCardDecks;

      const nextState: GameState = {
        ...prev,
        teams: newTeams,
        teamCardDecks: newDecks,
      };

      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
  };

  const handleUpdateQuestions = (newQuestions: Question[]) => {
    setGameState((prev) => {
      const isMatchStarted =
        prev.status === 'running' ||
        prev.status === 'paused' ||
        prev.teams.some((t) => (t.score && t.score > 0) || (t.correctCount && t.correctCount > 0));

      const newDecks = !isMatchStarted
        ? generateTeamCardDecks(prev.teams, newQuestions, newQuestions.length, true)
        : prev.teamCardDecks;

      const nextState: GameState = {
        ...prev,
        questions: newQuestions,
        teamCardDecks: newDecks,
      };

      saveCompetitionToDb(nextState, currentRoomId).catch(() => {});
      return nextState;
    });
  };

  const handleRegenerateDecks = (_cardsPerTeam?: number, randomized: boolean = true) => {
    setGameState((prev) => {
      const newDecks = generateTeamCardDecks(prev.teams, prev.questions, prev.questions.length, randomized);
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
    const demo = createDemoState();
    const decks = generateTeamCardDecks(demo.teams, demo.questions, 10, true);
    const now = Date.now();
    const demoState: GameState = {
      competitionId: currentRoomId,
      settings: {
        ...DEFAULT_SETTINGS,
        durationMinutes: 5,
        pointsPerCorrect: 10,
        penaltyWrong: 0,
        wrongAnswerRule: 'retry',
      },
      teams: demo.teams,
      questions: demo.questions,
      teamCardDecks: decks,
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
          message: '📦 Data Demo berhasil dimuat: 4 Kelompok (ALPHA, BRAVO, CHARLIE, DELTA), 10 Soal, Durasi 5 Menit.',
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
      const decks = generateTeamCardDecks(prev.teams, prev.questions, 10, true);
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

      {/* Top Fixed Header with Global Timer & Navigation & Room Sync */}
      <HeaderNav
        gameState={gameState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onStartPause={handleStartPause}
        onResetTimer={handleResetTimer}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSound={handleToggleSound}
        currentRoomId={currentRoomId}
        onChangeRoomId={handleChangeRoomId}
        onMigrateSuccess={() => loadRoomData(currentRoomId, false)}
        isSyncing={isSyncing}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-4 px-2 sm:px-6 relative z-10">
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

        {activeTab === 'scoreboard' && <ScoreboardView gameState={gameState} />}

        {activeTab === 'admin' && (
          <AdminDashboard
            gameState={gameState}
            onUpdateSettings={handleUpdateSettings}
            onUpdateTeams={handleUpdateTeams}
            onUpdateQuestions={handleUpdateQuestions}
            onRegenerateDecks={handleRegenerateDecks}
            onStartPauseGame={handleStartPause}
            onResetTimer={handleResetTimer}
            onResetAllScores={handleResetAllScores}
            onUnlockBuzzer={handleUnlockBuzzer}
            onOverrideTeamScore={handleOverrideTeamScore}
            onLoadDemoData={handleLoadDemoData}
            onResetMatch={handleResetMatch}
            onOpenArena={() => setActiveTab('arena')}
            onOpenPrint={() => setActiveTab('print')}
            onOpenScoreboard={() => setActiveTab('scoreboard')}
          />
        )}

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
          <span className="text-slate-400 hidden md:inline">Measurement Block Blast v2.5 (Cloud Sync)</span>
          <span className="bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/10 text-cyan-300 font-mono text-[10px]">
            ROOM: {currentRoomId} 🟢
          </span>
        </div>
      </footer>

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
