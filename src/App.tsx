import React, { useState, useEffect, useRef } from 'react';
import { GameState, Team, Question, GameSettings } from './types';
import { getInitialGameState, saveGameState, DEFAULT_SETTINGS } from './utils/storage';
import { generateTeamCardDecks, createDemoState, DEMO_QUESTIONS } from './utils/presets';
import { sound } from './utils/sound';
import { checkAnswer } from './utils/answerChecker';
import { HeaderNav } from './components/HeaderNav';
import { GameArena } from './components/GameArena';
import { ScoreboardView } from './components/ScoreboardView';
import { AdminDashboard } from './components/AdminDashboard';
import { PrintableCards } from './components/PrintableCards';
import { GameOverModal } from './components/GameOverModal';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => getInitialGameState());
  const [activeTab, setActiveTab] = useState<'arena' | 'scoreboard' | 'admin' | 'print'>('admin');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showGameOverModal, setShowGameOverModal] = useState<boolean>(false);

  // Auto-save game state to localStorage
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  // Sync audio enabled setting
  useEffect(() => {
    sound.setEnabled(gameState.settings.soundEnabled);
  }, [gameState.settings.soundEnabled]);

  // Global Timer Interval
  useEffect(() => {
    let timer: number | null = null;

    if (gameState.status === 'running') {
      timer = window.setInterval(() => {
        setGameState((prev) => {
          if (prev.timeRemainingSeconds <= 1) {
            // Time up!
            setShowGameOverModal(true);
            return {
              ...prev,
              timeRemainingSeconds: 0,
              status: 'finished',
              activityLogs: [
                {
                  id: `log-${Date.now()}`,
                  timestamp: Date.now(),
                  timeFormatted: new Date().toLocaleTimeString('id-ID'),
                  type: 'game_finish',
                  message: '⏰ Waktu pertandingan telah habis!',
                },
                ...prev.activityLogs,
              ],
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
  }, [gameState.status]);

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
    setGameState((prev) => {
      if (prev.status === 'running') {
        return {
          ...prev,
          status: 'paused',
          activityLogs: [
            {
              id: `log-${Date.now()}`,
              timestamp: Date.now(),
              timeFormatted: new Date().toLocaleTimeString('id-ID'),
              type: 'game_pause',
              message: 'Pertandingan di-jeda oleh panitia.',
            },
            ...prev.activityLogs,
          ],
        };
      } else {
        sound.playStart();
        return {
          ...prev,
          status: 'running',
          activityLogs: [
            {
              id: `log-${Date.now()}`,
              timestamp: Date.now(),
              timeFormatted: new Date().toLocaleTimeString('id-ID'),
              type: 'game_start',
              message: 'Pertandingan dimulai! Waktu berjalan.',
            },
            ...prev.activityLogs,
          ],
        };
      }
    });
  };

  const handleResetTimer = () => {
    setGameState((prev) => ({
      ...prev,
      status: 'ready',
      timeRemainingSeconds: prev.settings.durationMinutes * 60,
      activeTeamId: null,
      activeSince: null,
      activeQuestionIndex: null,
      lastEvaluation: null,
    }));
  };

  // -------------------------------------------------------------
  // "SIAPA CEPAT DIA DAPAT" GAMEPLAY ACTIONS
  // -------------------------------------------------------------
  const handleSelectTeam = (teamId: string) => {
    const team = gameState.teams.find((t) => t.id === teamId);
    if (!team) return;

    const now = Date.now();
    const timeFormatted = new Date(now).toLocaleTimeString('id-ID') + `.${String(now % 1000).padStart(3, '0')}`;

    setGameState((prev) => ({
      ...prev,
      activeTeamId: teamId,
      activeSince: now,
      activeQuestionIndex: null,
      lastEvaluation: null,
      activityLogs: [
        {
          id: `log-${now}`,
          timestamp: now,
          timeFormatted,
          teamId,
          teamName: team.name,
          type: 'tap',
          message: `⚡ Kelompok ${team.name} berhasil melakukan tap buzzer! (Waktu: ${timeFormatted})`,
        },
        ...prev.activityLogs,
      ],
    }));
  };

  const handleSelectCard = (cardNumber: number | null) => {
    setGameState((prev) => ({
      ...prev,
      activeQuestionIndex: cardNumber !== null ? Number(cardNumber) : null,
    }));
  };

  const handleCancelActiveTeam = () => {
    setGameState((prev) => ({
      ...prev,
      activeTeamId: null,
      activeSince: null,
      activeQuestionIndex: null,
      lastEvaluation: null,
    }));
  };

  const handleSubmitAnswer = (cardNumber: number, submittedAnswer: string) => {
    if (!gameState.activeTeamId) return;

    const numCard = Number(cardNumber);
    const activeTeam = gameState.teams.find((t) => t.id === gameState.activeTeamId);
    if (!activeTeam) return;

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

    if (!question) return;

    const evalResult = checkAnswer(submittedAnswer, question, gameState.settings.caseSensitive);
    const isCorrect = evalResult.isCorrect;
    const pointsAwarded = isCorrect ? question.points || gameState.settings.pointsPerCorrect : 0;

    const now = Date.now();
    const timeFormatted = new Date(now).toLocaleTimeString('id-ID');

    // Update Team score and counts
    const updatedTeams = gameState.teams.map((t) => {
      if (t.id === activeTeam.id) {
        return {
          ...t,
          score: t.score + pointsAwarded,
          correctCount: isCorrect ? t.correctCount + 1 : t.correctCount,
          wrongCount: !isCorrect ? t.wrongCount + 1 : t.wrongCount,
        };
      }
      return t;
    });

    // Update Card status in team deck
    let foundCardInDeck = false;
    let updatedDeck = activeDeck.map((c) => {
      if (Number(c.cardNumber) === numCard) {
        foundCardInDeck = true;
        let nextStatus = c.status;
        if (isCorrect) {
          nextStatus = 'correct';
        } else {
          nextStatus = gameState.settings.wrongAnswerRule === 'lock' ? 'locked' : 'wrong';
        }
        return {
          ...c,
          status: nextStatus,
          attempts: c.attempts + 1,
          lastAnswer: submittedAnswer,
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
          status: isCorrect ? 'correct' : (gameState.settings.wrongAnswerRule === 'lock' ? 'locked' : 'wrong'),
          attempts: 1,
          lastAnswer: submittedAnswer,
          answeredAt: now,
        }
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

    setGameState((prev) => ({
      ...prev,
      teams: updatedTeams,
      teamCardDecks: updatedDecks,
      lastEvaluation: {
        teamId: activeTeam.id,
        cardNumber: numCard,
        isCorrect,
        points: pointsAwarded,
        submittedAnswer,
        expectedAnswer: question.correctAnswer,
        timestamp: now,
      },
      activityLogs: [
        {
          id: `log-${now}`,
          timestamp: now,
          timeFormatted,
          teamId: activeTeam.id,
          teamName: activeTeam.name,
          type: isCorrect ? 'answer_correct' : 'answer_wrong',
          message: isCorrect
            ? `🟢 Kelompok ${activeTeam.name} BENAR pada Kartu #${String(numCard).padStart(2, '0')} (+${pointsAwarded} Poin)`
            : `🔴 Kelompok ${activeTeam.name} SALAH pada Kartu #${String(numCard).padStart(2, '0')}`,
          pointsChange: pointsAwarded,
        },
        ...prev.activityLogs,
      ],
    }));
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
  };

  // -------------------------------------------------------------
  // ADMIN UPDATE HANDLERS
  // -------------------------------------------------------------
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setGameState((prev) => ({
      ...prev,
      settings: newSettings,
      timeRemainingSeconds: prev.status === 'ready' ? newSettings.durationMinutes * 60 : prev.timeRemainingSeconds,
    }));
  };

  const handleUpdateTeams = (newTeams: Team[]) => {
    setGameState((prev) => ({
      ...prev,
      teams: newTeams,
    }));
  };

  const handleUpdateQuestions = (newQuestions: Question[]) => {
    setGameState((prev) => ({
      ...prev,
      questions: newQuestions,
    }));
  };

  const handleRegenerateDecks = (cardsPerTeam: number, randomized: boolean) => {
    setGameState((prev) => {
      const newDecks = generateTeamCardDecks(prev.teams, prev.questions, cardsPerTeam, randomized);
      return {
        ...prev,
        teamCardDecks: newDecks,
      };
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

      return {
        ...prev,
        teams: resetTeams,
        teamCardDecks: resetDecks,
        activeTeamId: null,
        activeSince: null,
        activeQuestionIndex: null,
        lastEvaluation: null,
        activityLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: Date.now(),
            timeFormatted: new Date().toLocaleTimeString('id-ID'),
            type: 'reset',
            message: 'Seluruh skor dan status kartu di-reset ke 0 oleh admin.',
          },
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleUnlockBuzzer = () => {
    setGameState((prev) => ({
      ...prev,
      activeTeamId: null,
      activeSince: null,
      activeQuestionIndex: null,
      lastEvaluation: null,
    }));
  };

  const handleOverrideTeamScore = (teamId: string, delta: number) => {
    setGameState((prev) => {
      const targetTeam = prev.teams.find((t) => t.id === teamId);
      const updated = prev.teams.map((t) => (t.id === teamId ? { ...t, score: t.score + delta } : t));
      return {
        ...prev,
        teams: updated,
        activityLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: Date.now(),
            timeFormatted: new Date().toLocaleTimeString('id-ID'),
            type: 'score_override',
            message: `Koreksi skor kelompok ${targetTeam?.name || ''}: ${delta > 0 ? `+${delta}` : delta} poin.`,
            pointsChange: delta,
          },
          ...prev.activityLogs,
        ],
      };
    });
  };

  const handleLoadDemoData = () => {
    const demo = createDemoState();
    const decks = generateTeamCardDecks(demo.teams, demo.questions, 10, true);
    const now = Date.now();
    setGameState({
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
    });
    sound.playClick();
  };

  const handleResetMatch = () => {
    const now = Date.now();
    setGameState((prev) => {
      const decks = generateTeamCardDecks(prev.teams, prev.questions, 10, true);
      const resetTeams = prev.teams.map((t) => ({ ...t, score: 0, correctCount: 0, wrongCount: 0 }));
      return {
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
    setGameState((prev) => ({
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
    }));
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

      {/* Top Fixed Header with Global Timer & Navigation (Frosted Glass) */}
      <HeaderNav
        gameState={gameState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onStartPause={handleStartPause}
        onResetTimer={handleResetTimer}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSound={handleToggleSound}
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

        {activeTab === 'print' && <PrintableCards gameState={gameState} />}
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
          <span className="text-slate-400 hidden md:inline">Measurement Block Blast v2.4</span>
          <span className="bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/10 text-cyan-300 font-mono text-[10px]">
            SISTEM ONLINE 🟢
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
