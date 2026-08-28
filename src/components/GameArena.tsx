import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Zap,
  ArrowLeft,
  Send,
  Lock,
  RotateCcw,
  Volume2,
  HelpCircle,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameState, Team, QuestionCardStatus } from '../types';
import { COLOR_MAP, getResolvedQuestionForTeam } from '../utils/presets';
import { sound } from '../utils/sound';
import { checkAnswer } from '../utils/answerChecker';

interface GameArenaProps {
  gameState: GameState;
  onSelectTeam: (teamId: string) => void;
  onSelectCard: (cardNumber: number | null) => void;
  onCancelActiveTeam: () => void;
  onSubmitAnswer: (cardNumber: number, answer: string) => void;
  onDismissEvaluation: () => void;
  onEndGame?: () => void;
}

export const GameArena: React.FC<GameArenaProps> = ({
  gameState,
  onSelectTeam,
  onSelectCard,
  onCancelActiveTeam,
  onSubmitAnswer,
  onDismissEvaluation,
  onEndGame,
}) => {
  const {
    teams,
    questions,
    teamCardDecks,
    activeTeamId,
    activeSince,
    activeQuestionIndex,
    lastEvaluation,
    settings,
    status: gameStatus,
  } = gameState;

  const [inputAnswer, setInputAnswer] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [statementChoice, setStatementChoice] = useState<boolean | null>(null);
  const [correctionInput, setCorrectionInput] = useState('');
  const [multiPartAnswers, setMultiPartAnswers] = useState<string[]>(['', '', '', '']);
  const [lockoutNotice, setLockoutNotice] = useState<string | null>(null);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  // Guarantee non-empty deck for active team
  const activeDeck = React.useMemo(() => {
    if (!activeTeamId) return [];
    const deck = teamCardDecks[activeTeamId];
    if (deck && deck.length > 0) return deck;

    // Fallback deck generator
    const team = teams.find((t) => t.id === activeTeamId);
    const teamPrefix = team?.name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'K';
    return questions.map((q, idx) => ({
      cardNumber: idx + 1,
      cardCode: `${teamPrefix}-${String(idx + 1).padStart(2, '0')}`,
      questionId: q.id,
      status: 'unanswered' as const,
      attempts: 0,
    }));
  }, [activeTeamId, teamCardDecks, teams, questions]);

  // Currently selected card object with robust fallback
  const selectedCard = React.useMemo(() => {
    if (activeQuestionIndex === null) return null;
    const num = Number(activeQuestionIndex);
    const found = activeDeck.find((c) => Number(c.cardNumber) === num);
    if (found) return found;

    // Fallback card
    const team = teams.find((t) => t.id === activeTeamId);
    const teamPrefix = team?.name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'K';
    const fallbackQ = questions[(num - 1) % Math.max(1, questions.length)] || questions[0];
    return {
      cardNumber: num,
      cardCode: `${teamPrefix}-${String(num).padStart(2, '0')}`,
      questionId: fallbackQ?.id || 'q-01',
      status: 'unanswered' as const,
      attempts: 0,
    };
  }, [activeQuestionIndex, activeDeck, activeTeamId, teams, questions]);

  const selectedQuestion = React.useMemo(() => {
    if (!selectedCard) return null;
    return getResolvedQuestionForTeam(gameState, activeTeamId, selectedCard.questionId || selectedCard.cardNumber);
  }, [selectedCard, activeTeamId, gameState]);

  // -------------------------------------------------------------
  // PER-QUESTION TIMER HOOKS & CALCULATIONS
  // -------------------------------------------------------------
  const questionTimeLimit =
    selectedQuestion?.timeLimitSeconds && selectedQuestion.timeLimitSeconds > 0
      ? selectedQuestion.timeLimitSeconds
      : (settings.questionTimeLimitSeconds ?? 30);
  const isQuestionTimerEnabled = settings.enableQuestionTimer ?? true;

  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number>(questionTimeLimit);

  // Reset timer on card open
  useEffect(() => {
    if (activeQuestionIndex !== null && selectedCard) {
      setQuestionSecondsLeft(questionTimeLimit);
    }
  }, [activeQuestionIndex, selectedCard?.cardNumber, questionTimeLimit]);

  // Question countdown interval when game is running
  useEffect(() => {
    if (
      activeQuestionIndex === null ||
      !selectedCard ||
      !isQuestionTimerEnabled ||
      gameStatus !== 'running'
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setQuestionSecondsLeft((prev) => {
        if (prev <= 1) {
          sound.playWrong();
          onSubmitAnswer(activeQuestionIndex, '__TIMEOUT__');
          return 0;
        }
        if (prev <= 5 && prev > 0) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [activeQuestionIndex, selectedCard, isQuestionTimerEnabled, gameStatus, onSubmitAnswer]);

  // Auto-focus and reset inputs when card is selected
  useEffect(() => {
    if (activeQuestionIndex !== null) {
      setInputAnswer('');
      setSelectedOptionId(null);
      setStatementChoice(null);
      setCorrectionInput('');
      setMultiPartAnswers(['', '', '', '']);
      if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }, [activeQuestionIndex]);

  // Confetti trigger on correct answer
  useEffect(() => {
    if (lastEvaluation && lastEvaluation.isCorrect) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#f59e0b', '#3b82f6', '#ec4899'],
      });
    }
  }, [lastEvaluation]);

  const handleTeamClick = (team: Team) => {
    if (gameStatus === 'finished') return;

    if (activeTeamId && activeTeamId !== team.id) {
      sound.playWrong();
      setLockoutNotice(
        `⛔ SEDANG DIGUNAKAN OLEH KELOMPOK ${activeTeam?.name || ''}! TUNGGU GILIRAN.`
      );
      setTimeout(() => setLockoutNotice(null), 2500);
      return;
    }

    if (!activeTeamId) {
      sound.playBuzzer();
      onSelectTeam(team.id);
    }
  };

  const handleCardPick = (cardNumber: number, cardStatus: QuestionCardStatus) => {
    if (cardStatus === 'correct') {
      sound.playWrong();
      return; // Already completed
    }
    if (cardStatus === 'locked' && settings.wrongAnswerRule === 'lock') {
      sound.playWrong();
      return; // Locked permanently
    }

    sound.playClick();
    onSelectCard(cardNumber);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeQuestionIndex === null || !selectedQuestion) return;

    const qType = selectedQuestion.type || 'short_answer';

    if (qType === 'multiple_choice') {
      if (!selectedOptionId) return;
      onSubmitAnswer(activeQuestionIndex, selectedOptionId);
    } else if (qType === 'statement_correction') {
      if (statementChoice === null) return;
      const payload = JSON.stringify({
        isTrue: statementChoice,
        correctionText: statementChoice ? '' : correctionInput.trim(),
      });
      onSubmitAnswer(activeQuestionIndex, payload);
    } else if (qType === 'multi_part') {
      const partsCount = selectedQuestion.multiPartConfig?.parts?.length || 2;
      const answersToSubmit = multiPartAnswers.slice(0, partsCount).map((a) => a.trim());
      if (answersToSubmit.some((a) => !a)) return;
      onSubmitAnswer(activeQuestionIndex, JSON.stringify(answersToSubmit));
    } else {
      if (!inputAnswer.trim()) return;
      onSubmitAnswer(activeQuestionIndex, inputAnswer.trim());
    }
  };

  // -------------------------------------------------------------
  // VIEW 1: EVALUATION POPUP RESULT OVERLAY (FROSTED GLASS)
  // -------------------------------------------------------------
  if (lastEvaluation) {
    const evalTeam = teams.find((t) => t.id === lastEvaluation.teamId);

    let displaySubmittedAnswer = lastEvaluation.submittedAnswer;
    try {
      if (displaySubmittedAnswer.startsWith('{') && displaySubmittedAnswer.endsWith('}')) {
        const parsed = JSON.parse(displaySubmittedAnswer);
        if (typeof parsed.isTrue === 'boolean') {
          displaySubmittedAnswer = `${parsed.isTrue ? 'BENAR' : 'SALAH'}${
            parsed.correctionText ? ` (Koreksi: ${parsed.correctionText})` : ''
          }`;
        }
      } else if (displaySubmittedAnswer.startsWith('[') && displaySubmittedAnswer.endsWith(']')) {
        const parsed = JSON.parse(displaySubmittedAnswer);
        if (Array.isArray(parsed)) {
          displaySubmittedAnswer = parsed.map((p, idx) => `[#${idx + 1}] ${p}`).join(' | ');
        }
      }
    } catch {
      // Keep raw string
    }

    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in duration-200">
        <div
          id="evaluation-result-modal"
          className={`w-full max-w-2xl rounded-[36px] p-8 sm:p-12 border-2 text-center backdrop-blur-2xl shadow-2xl relative overflow-hidden ${
            lastEvaluation.isCorrect
              ? 'bg-slate-900/85 border-emerald-400/60 shadow-[0_0_60px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900/85 border-rose-400/60 shadow-[0_0_60px_rgba(244,63,94,0.3)]'
          }`}
        >
          {/* Top glowing banner */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-6 bg-white/5 border border-white/10 text-slate-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            HASIL JAWABAN KELOMPOK {evalTeam?.name}
          </div>

          {lastEvaluation.isCorrect ? (
            <div className="space-y-4">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce">
                <CheckCircle2 className="w-14 h-14" />
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-wider">
                🟢 JAWABAN BENAR!
              </h2>
              <div className="inline-block px-8 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-2xl sm:text-3xl tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                +{lastEvaluation.points} POIN
              </div>
              <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto">
                Kartu Soal #{String(lastEvaluation.cardNumber).padStart(2, '0')} berhasil diselesaikan! Skor kelompok bertambah.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.4)] animate-pulse">
                <XCircle className="w-14 h-14" />
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-rose-400 tracking-wider">
                🔴 JAWABAN SALAH!
              </h2>
              <div className="inline-block px-8 py-2.5 rounded-2xl bg-rose-500/20 border border-rose-500 text-rose-300 font-black text-xl sm:text-2xl tracking-widest">
                +0 POIN
              </div>
              <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto">
                {settings.wrongAnswerRule === 'retry'
                  ? 'Jawaban belum tepat. Soal ini masih bisa dicoba lagi pada kesempatan berikutnya!'
                  : 'Jawaban belum tepat. Soal ini terkunci.'}
              </p>
            </div>
          )}

          {/* Answer Breakdown Detail */}
          <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs sm:text-sm space-y-1.5 max-w-md mx-auto backdrop-blur-md">
            <div className="flex justify-between text-slate-400">
              <span>Jawaban Dikirim:</span>
              <span className="font-mono font-bold text-white">"{displaySubmittedAnswer}"</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Status Giliran:</span>
              <span className="font-semibold text-cyan-400">Giliran dilepas ke semua kelompok</span>
            </div>
          </div>

          {/* Quick return button */}
          <div className="mt-8">
            <button
              id="btn-dismiss-eval"
              onClick={onDismissEvaluation}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base tracking-wider uppercase shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              Kembali ke Arena Sekarang ⚡
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
              (Otomatis kembali dalam beberapa detik...)
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: ACTIVE TEAM - STEP 2: INPUT JAWABAN SOAL (FROSTED GLASS)
  // -------------------------------------------------------------
  if (activeTeam && selectedCard && selectedQuestion) {
    return (
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full p-3 sm:p-6 animate-in fade-in duration-200">
        {/* Top Active Team Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-to-card-list"
              onClick={() => onSelectCard(null)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all backdrop-blur-md cursor-pointer"
              title="Pilih Nomor Soal Lain"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="font-bold text-lg text-white uppercase tracking-wider">
                  KELOMPOK {activeTeam.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Kartu Soal No.{String(selectedCard.cardNumber).padStart(2, '0')} • Kode: {selectedCard.cardCode}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Per-Question Timer Pill in Header */}
            {isQuestionTimerEnabled && (
              <div
                id="question-answering-timer"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-all ${
                  questionSecondsLeft <= 5
                    ? 'bg-rose-500/25 border-rose-400 text-rose-300 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                    : questionSecondsLeft <= 10
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                    : 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300'
                }`}
              >
                <Clock className={`w-4 h-4 ${questionSecondsLeft <= 5 ? 'text-rose-400 animate-spin' : ''}`} />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-75">WAKTU SOAL</span>
                  <span className="font-mono font-black text-sm">{questionSecondsLeft}s</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setQuestionSecondsLeft((prev) => prev + 10);
                  }}
                  title="Tambah +10 Detik Waktu Menjawab"
                  className="ml-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white cursor-pointer"
                >
                  +10s
                </button>
              </div>
            )}

            <span className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-xs">
              +{selectedQuestion.points || settings.pointsPerCorrect} POIN
            </span>
            <button
              id="btn-cancel-turn"
              onClick={() => {
                sound.playClick();
                onCancelActiveTeam();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all backdrop-blur-md"
            >
              Batalkan Giliran
            </button>
          </div>
        </div>

        {/* Question Confirmation Box */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-cyan-400/30 rounded-[36px] p-6 sm:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative">
          {/* Question Answering Progress Bar */}
          {isQuestionTimerEnabled && (
            <div className="mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                <span
                  className={`flex items-center gap-1.5 ${
                    questionSecondsLeft <= 5
                      ? 'text-rose-400 animate-pulse'
                      : questionSecondsLeft <= 10
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Sisa Waktu Menjawab Soal: <span className="font-mono font-black text-sm">{questionSecondsLeft} Detik</span>
                </span>
                <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                  Batas Waktu: {questionTimeLimit}s
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    questionSecondsLeft <= 5
                      ? 'bg-rose-500 animate-pulse'
                      : questionSecondsLeft <= 10
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (questionSecondsLeft / questionTimeLimit) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs tracking-widest uppercase">
              <HelpCircle className="w-4 h-4" />
              KONFIRMASI SOAL PADA KARTU #{String(selectedCard.cardNumber).padStart(2, '0')}
            </div>
            <div className="flex items-center gap-2">
              {/* Type badge */}
              {selectedQuestion.type === 'multiple_choice' && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  Pilihan Ganda
                </span>
              )}
              {selectedQuestion.type === 'statement_correction' && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  Benar / Salah + Koreksi
                </span>
              )}
              {selectedQuestion.type === 'multi_part' && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  2 Pertanyaan Terkait
                </span>
              )}
              {(!selectedQuestion.type || selectedQuestion.type === 'short_answer') && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                  Isian Singkat
                </span>
              )}
              {selectedQuestion.category && (
                <span className="text-[11px] px-3 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 backdrop-blur-md">
                  {selectedQuestion.category}
                </span>
              )}
            </div>
          </div>

          {/* Question Text */}
          <div className="my-6">
            <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
              "{selectedQuestion.questionText}"
            </p>
            {selectedQuestion.unitHint && (
              <p className="text-xs text-cyan-400 mt-2 font-medium">
                💡 Satuan yang diminta: <span className="underline font-bold">{selectedQuestion.unitHint}</span>
              </p>
            )}
          </div>

          {/* Dynamic Answer Input Form based on Question Type */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* TYPE 1: MULTIPLE CHOICE */}
            {selectedQuestion.type === 'multiple_choice' && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Salah Satu Opsi Jawaban:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {(selectedQuestion.options && selectedQuestion.options.length > 0
                    ? selectedQuestion.options
                    : [
                        { id: 'A', label: 'A', text: 'Opsi A' },
                        { id: 'B', label: 'B', text: 'Opsi B' },
                        { id: 'C', label: 'C', text: 'Opsi C' },
                        { id: 'D', label: 'D', text: 'Opsi D' },
                      ]
                  ).map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        id={`btn-option-${opt.id}`}
                        onClick={() => {
                          sound.playClick();
                          setSelectedOptionId(opt.id);
                        }}
                        className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3.5 transition-all cursor-pointer backdrop-blur-md ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.3)] ring-2 ring-cyan-400/50 scale-[1.02]'
                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-sm transition-all ${
                            isSelected
                              ? 'bg-cyan-400 text-slate-950 shadow-md font-bold'
                              : 'bg-white/10 text-white border border-white/10'
                          }`}
                        >
                          {opt.label || opt.id}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className={`text-base font-semibold leading-snug ${isSelected ? 'text-cyan-200' : 'text-white'}`}>
                            {opt.text}
                          </p>
                        </div>
                        <div className="pt-1">
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TYPE 2: STATEMENT CORRECTION (BENAR / SALAH + KOREKSI) */}
            {selectedQuestion.type === 'statement_correction' && (
              <div className="space-y-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tentukan Kebenaran Pernyataan di Atas:
                </label>

                {/* 2 Big Choice Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    id="btn-statement-benar"
                    onClick={() => {
                      sound.playClick();
                      setStatementChoice(true);
                    }}
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                      statementChoice === true
                        ? 'bg-emerald-500/25 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)] text-emerald-300 ring-2 ring-emerald-400/50 scale-[1.02]'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                    }`}
                  >
                    <CheckCircle2 className={`w-8 h-8 ${statementChoice === true ? 'text-emerald-400 animate-bounce' : 'text-slate-400'}`} />
                    <span className="text-xl font-black tracking-wider uppercase">BENAR</span>
                    <span className="text-[11px] text-slate-400 font-medium">Pernyataan sudah tepat</span>
                  </button>

                  <button
                    type="button"
                    id="btn-statement-salah"
                    onClick={() => {
                      sound.playClick();
                      setStatementChoice(false);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                      statementChoice === false
                        ? 'bg-rose-500/25 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.4)] text-rose-300 ring-2 ring-rose-400/50 scale-[1.02]'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/30'
                    }`}
                  >
                    <XCircle className={`w-8 h-8 ${statementChoice === false ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
                    <span className="text-xl font-black tracking-wider uppercase">SALAH</span>
                    <span className="text-[11px] text-slate-400 font-medium">Perlu dikoreksi</span>
                  </button>
                </div>

                {/* Conditional Correction Input when False is Selected */}
                {statementChoice === false && (
                  <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <label htmlFor="input-correction-text" className="block text-xs font-bold text-rose-300 uppercase tracking-wider">
                        ✍️ Tuliskan Koreksi / Pembetulan yang Benar:
                      </label>
                      <span className="text-[11px] text-slate-400">Wajib diisi jika memilih SALAH</span>
                    </div>

                    <div className="relative">
                      <input
                        ref={inputRef}
                        id="input-correction-text"
                        type="text"
                        value={correctionInput}
                        onChange={(e) => setCorrectionInput(e.target.value)}
                        placeholder="Tuliskan nilai / satuan / konsep yang benar..."
                        autoComplete="off"
                        className="w-full bg-slate-950/80 border-2 border-rose-500/40 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/20 rounded-2xl px-5 py-3.5 text-lg font-bold text-white placeholder:text-slate-600 outline-none transition-all"
                      />
                      {correctionInput && (
                        <button
                          type="button"
                          onClick={() => setCorrectionInput('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Quick helper keypad for correction */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Angka:</span>
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ',', '.'].map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCorrectionInput((prev) => prev + key)}
                          className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono font-bold cursor-pointer"
                        >
                          {key}
                        </button>
                      ))}
                      {['cm', 'meter', 'gram', 'kg', 'detik', 'menit', 'cm³'].map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setCorrectionInput((prev) => prev.trim() ? `${prev.trim()} ${unit}` : unit)}
                          className="px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold cursor-pointer"
                        >
                          +{unit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TYPE 3: MULTI-PART (2 SUB-PERTANYAAN) */}
            {selectedQuestion.type === 'multi_part' && (
              <div className="space-y-5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Jawab Seluruh Pertanyaan Berikut:
                </label>

                {(selectedQuestion.multiPartConfig?.parts || [
                  { id: 'p1', question: 'Pertanyaan Bagian 1' },
                  { id: 'p2', question: 'Pertanyaan Bagian 2' },
                ]).map((part, idx) => (
                  <div key={part.id || idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <p className="text-sm sm:text-base font-bold text-white">
                        {part.question}
                      </p>
                    </div>

                    <div className="relative">
                      <input
                        id={`input-multipart-${idx}`}
                        type="text"
                        value={multiPartAnswers[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMultiPartAnswers((prev) => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        placeholder={`Jawaban untuk bagian #${idx + 1}...`}
                        autoComplete="off"
                        className="w-full bg-slate-950/70 border-2 border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-base font-bold text-white placeholder:text-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TYPE 4: SHORT ANSWER (DEFAULT ISIAN SINGKAT) */}
            {(!selectedQuestion.type || selectedQuestion.type === 'short_answer') && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label
                    htmlFor="input-student-answer"
                    className="block text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >
                    Masukkan Jawaban Kelompokmu:
                  </label>
                  <span className="text-[11px] text-cyan-400 font-medium">
                    Ketik atau tekan tombol bantuan di bawah
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={inputRef}
                    id="input-student-answer"
                    type="text"
                    value={inputAnswer}
                    onChange={(e) => setInputAnswer(e.target.value)}
                    placeholder="Ketik jawaban di sini (contoh: 250 cm)..."
                    autoComplete="off"
                    className="w-full bg-slate-950/70 border-2 border-white/20 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 rounded-2xl px-6 py-4 text-xl sm:text-2xl font-bold text-white placeholder:text-slate-600 outline-none transition-all backdrop-blur-md"
                  />
                  {inputAnswer && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputAnswer('');
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
                      title="Hapus Jawaban"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick Touch Virtual Helper Buttons for Fast Answering */}
                <div className="mt-3 space-y-2">
                  {/* Numeric Keys */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Angka:</span>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ',', '.'].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setInputAnswer((prev) => prev + key);
                          if (inputRef.current) inputRef.current.focus();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
                      >
                        {key}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setInputAnswer((prev) => prev.slice(0, -1));
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
                    >
                      ⌫ Hapus
                    </button>
                  </div>

                  {/* Common Units Quick Fill */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Satuan:</span>
                    {['cm', 'meter', 'gram', 'kg', 'detik', 'menit', 'cm³', 'km/jam', 'Kelvin'].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setInputAnswer((prev) => {
                            const trimmed = prev.trim();
                            return trimmed ? `${trimmed} ${unit}` : unit;
                          });
                          if (inputRef.current) inputRef.current.focus();
                        }}
                        className="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/20 hover:border-cyan-400/50 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                      >
                        +{unit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Virtual Pad / Submit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => onSelectCard(null)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-sm transition-all backdrop-blur-md cursor-pointer hover:text-white"
              >
                ← Ganti Nomor Soal
              </button>

              <button
                id="btn-submit-answer"
                type="submit"
                disabled={
                  selectedQuestion.type === 'multiple_choice'
                    ? !selectedOptionId
                    : selectedQuestion.type === 'statement_correction'
                    ? statementChoice === null || (statementChoice === false && !correctionInput.trim())
                    : selectedQuestion.type === 'multi_part'
                    ? !(selectedQuestion.multiPartConfig?.parts || [1, 2]).every((_, idx) => (multiPartAnswers[idx] || '').trim().length > 0)
                    : !inputAnswer.trim()
                }
                className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-base sm:text-lg tracking-wider uppercase flex items-center justify-center gap-2 transition-all ${
                  (selectedQuestion.type === 'multiple_choice'
                    ? Boolean(selectedOptionId)
                    : selectedQuestion.type === 'statement_correction'
                    ? statementChoice === true || (statementChoice === false && Boolean(correctionInput.trim()))
                    : selectedQuestion.type === 'multi_part'
                    ? (selectedQuestion.multiPartConfig?.parts || [1, 2]).every((_, idx) => (multiPartAnswers[idx] || '').trim().length > 0)
                    : Boolean(inputAnswer.trim()))
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
                SUBMIT JAWABAN
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: ACTIVE TEAM - STEP 1: PILIH NOMOR SOAL (FROSTED GLASS MODAL)
  // -------------------------------------------------------------
  if (activeTeam) {
    const teamStyles = COLOR_MAP[activeTeam.color] || COLOR_MAP.cyan;

    return (
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full p-3 sm:p-6 animate-in fade-in duration-200">
        {/* Active Team Banner */}
        <div
          className={`p-6 rounded-3xl border-2 ${teamStyles.borderActive} ${teamStyles.bg} shadow-2xl mb-6 flex flex-wrap items-center justify-between gap-4`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse">
              <Zap className="w-8 h-8 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-cyan-400 text-slate-950 text-xs font-black tracking-widest uppercase">
                  🟢 ACTIVE PLAYER
                </span>
                {activeSince && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Tap: {new Date(activeSince).toLocaleTimeString('id-ID')}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wider mt-1">
                KELOMPOK {activeTeam.name}
              </h2>
            </div>
          </div>

          {/* Cancel Lock / Action */}
          <button
            id="btn-cancel-active-team"
            onClick={() => {
              sound.playClick();
              onCancelActiveTeam();
            }}
            className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-rose-400 text-xs font-bold transition-all backdrop-blur-md"
          >
            Batal / Lepas Lock
          </button>
        </div>

        {/* Question Selector Card Grid (Frosted Glass) */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-cyan-400/30 rounded-[36px] p-6 sm:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
          <div className="text-center mb-8">
            <h3 className="text-cyan-400 text-xs font-black uppercase tracking-[0.25em] mb-2">
              Kelompok {activeTeam.name} Aktif
            </h3>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide uppercase">
              PILIH NOMOR SOAL
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 font-medium">
              Tekan nomor soal yang sesuai dengan kartu fisik kelompok Anda
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8">
            {activeDeck.map((card) => {
              const isCorrect = card.status === 'correct';
              const isWrong = card.status === 'wrong';
              const isLocked = card.status === 'locked';

              return (
                <button
                  key={card.cardNumber}
                  id={`btn-card-num-${card.cardNumber}`}
                  onClick={() => handleCardPick(card.cardNumber, card.status)}
                  disabled={isCorrect || (isLocked && settings.wrongAnswerRule === 'lock')}
                  className={`h-16 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden backdrop-blur-md ${
                    isCorrect
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 cursor-not-allowed opacity-60'
                      : isWrong
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                      : 'bg-white/5 border-white/20 text-white hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-cyan-300 hover:scale-105 active:scale-95 shadow-lg'
                  }`}
                >
                  <span className="text-2xl font-black">
                    {String(card.cardNumber).padStart(2, '0')}
                  </span>

                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" /> Selesai
                      </span>
                    ) : isWrong ? (
                      <span className="flex items-center gap-1 text-rose-300">
                        <XCircle className="w-3 h-3" /> Coba Lagi
                      </span>
                    ) : (
                      <span className="text-slate-400">{card.cardCode}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <div className="bg-white/5 px-6 py-2.5 rounded-full flex items-center gap-4 border border-white/10 text-slate-400 text-xs font-bold uppercase backdrop-blur-md">
              <span>Waktu Menjawab Berjalan</span>
              <div className="w-[1px] h-4 bg-white/10" />
              <span>Tap Batal untuk Melepas Giliran</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 4: MAIN ARENA (FROSTED GLASS PODS - SIAPA CEPAT DIA DAPAT KIOSK)
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full p-3 sm:p-6 animate-in fade-in duration-300">
      {/* Central Announcement Header */}
      <div className="text-center mb-6 sm:mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs sm:text-sm font-bold tracking-widest uppercase backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          SISTEM KARTU SOAL • SIAPA CEPAT DIA DAPAT!
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">
          TEKAN NAMA KELOMPOKMU DI LAYAR!
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Kerjakan kartu soal bersama kelompok di meja. Ketika sudah selesai, berlari ke depan dan tekan nama kelompokmu untuk menjawab!
        </p>
      </div>

      {/* Lockout Notification Alert */}
      {lockoutNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/20 backdrop-blur-xl border-2 border-rose-500 text-rose-300 font-bold text-center text-sm sm:text-base animate-shake shadow-[0_0_30px_rgba(244,63,94,0.3)]">
          {lockoutNotice}
        </div>
      )}

      {/* Big Team Pods Grid (Frosted Glass Theme) */}
      <div
        className={`grid gap-5 sm:gap-6 ${
          teams.length === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : teams.length === 3
            ? 'grid-cols-1 sm:grid-cols-3'
            : teams.length === 4
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        }`}
      >
        {teams.map((team, idx) => {
          const colorStyles = COLOR_MAP[team.color] || COLOR_MAP.cyan;
          const deck = teamCardDecks[team.id] || [];
          const completedCount = deck.filter((c) => c.status === 'correct').length;
          const totalCount = deck.length;
          const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          const isThisTeamActive = activeTeamId === team.id;
          const isOtherTeamActive = activeTeamId && activeTeamId !== team.id;

          return (
            <div
              key={team.id}
              id={`team-pod-${team.id}`}
              onClick={() => handleTeamClick(team)}
              className={`flex flex-col gap-4 transition-all duration-300 cursor-pointer ${
                isOtherTeamActive ? 'opacity-40 grayscale-[20%] pointer-events-none' : 'opacity-100'
              }`}
            >
              <div
                className={`p-6 sm:p-7 rounded-3xl relative overflow-hidden transition-all duration-300 flex flex-col justify-between h-full select-none ${
                  isThisTeamActive
                    ? 'bg-cyan-600/15 backdrop-blur-xl border-2 border-cyan-400/60 shadow-[0_0_40px_rgba(34,211,238,0.25)] scale-[1.02]'
                    : 'bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/25 shadow-xl hover:scale-[1.02]'
                }`}
              >
                {/* Active Player Pulse Tag */}
                {isThisTeamActive && (
                  <div className="absolute top-3 right-4 flex items-center gap-1.5 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-400/40">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                    <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-tight">
                      Active Player
                    </span>
                  </div>
                )}

                {/* Team Name and Score Tag */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                      KELOMPOK #{idx + 1}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black italic tracking-wide text-white uppercase">
                      {team.name}
                    </h2>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black tracking-wider ${
                      isThisTeamActive ? 'bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : colorStyles.badge
                    }`}
                  >
                    {team.score} PTS
                  </span>
                </div>

                {/* Progress Bar & Counter */}
                <div className="space-y-2 my-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>PROGRES</span>
                    <span className="text-white font-mono">{completedCount}/{totalCount}</span>
                  </div>
                  <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: colorStyles.accent,
                      }}
                    />
                  </div>
                </div>

                {/* 5-Column Mini Card Grid Badges */}
                <div className="mt-4 grid grid-cols-5 gap-1.5">
                  {deck.map((c) => {
                    if (c.status === 'correct') {
                      return (
                        <div
                          key={c.cardNumber}
                          title={`Kartu #${c.cardNumber} (Selesai)`}
                          className="w-full aspect-square bg-emerald-500/30 border border-emerald-400/50 rounded-lg flex items-center justify-center text-[10px] font-bold text-emerald-300"
                        >
                          ✓
                        </div>
                      );
                    }
                    if (c.status === 'wrong') {
                      return (
                        <div
                          key={c.cardNumber}
                          title={`Kartu #${c.cardNumber} (Salah)`}
                          className="w-full aspect-square bg-rose-500/30 border border-rose-400/50 rounded-lg flex items-center justify-center text-[10px] font-bold text-rose-300"
                        >
                          ✕
                        </div>
                      );
                    }
                    return (
                      <div
                        key={c.cardNumber}
                        title={`Kartu #${c.cardNumber} (Belum)`}
                        className="w-full aspect-square bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-[9px] font-mono text-slate-500"
                      >
                        {String(c.cardNumber).padStart(2, '0')}
                      </div>
                    );
                  })}
                </div>

                {/* Status Bottom Button */}
                <div className="mt-6">
                  {isThisTeamActive ? (
                    <div className="text-center py-3 bg-cyan-400 rounded-2xl text-slate-950 font-black uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.4)] animate-pulse">
                      Sedang Menjawab
                    </div>
                  ) : (
                    <div className="text-center py-3 bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 rounded-2xl text-slate-300 hover:text-cyan-300 font-bold uppercase text-xs tracking-widest transition-all">
                      {isOtherTeamActive ? 'Terkunci' : 'Tap untuk Menjawab ⚡'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* SAFE BOTTOM ARENA BAR: PANDUAN & TOMBOL AKHIRI PERTANDINGAN */}
      {/* ========================================================= */}
      <div className="mt-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <span>
            💡 <strong>Tips Panitia:</strong> Klik kartu kelompok saat regu mengangkat tangan terlebih dahulu untuk mengunci kesempatan menjawab.
          </span>
        </div>

        {/* Safe End Game Button (Requires 2-step confirmation) */}
        <button
          id="btn-trigger-end-game-modal"
          type="button"
          onClick={() => {
            sound.playClick();
            setShowEndGameConfirm(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:text-rose-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ml-auto"
          title="Akhiri pertandingan sekarang dan tampilkan skor akhir"
        >
          <Lock className="w-3.5 h-3.5 text-rose-400" />
          <span>🛑 AKHIRI PERTANDINGAN</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI PENGAKHIRAN PERTANDINGAN (SAFETY MODAL) */}
      {/* ========================================================= */}
      {showEndGameConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-rose-500/60 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(244,63,94,0.3)] space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 mx-auto shadow-lg animate-pulse">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-rose-400 block mb-1">
                KONFIRMASI KEPUTUSAN PANITIA
              </span>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                AKHIRI PERTANDINGAN SEKARANG?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Tindakan ini akan <strong>menghentikan waktu pertandingan</strong> dan mengunci seluruh skor kelompok untuk menentukan pemenang kompetisi.
              </p>
            </div>

            {/* Match Stats Snapshot */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 text-left text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sisa Waktu</span>
                <span className="text-cyan-400 font-mono font-black text-sm">
                  {Math.floor(gameState.timeRemainingSeconds / 60)}:
                  {String(gameState.timeRemainingSeconds % 60).padStart(2, '0')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Kelompok</span>
                <span className="text-white font-black text-sm">{teams.length} Kelompok</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                id="btn-cancel-end-game"
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowEndGameConfirm(false);
                }}
                className="w-full sm:flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                ↩ Lanjutkan Pertandingan
              </button>

              <button
                id="btn-confirm-end-game"
                type="button"
                onClick={() => {
                  setShowEndGameConfirm(false);
                  if (onEndGame) {
                    onEndGame();
                  }
                }}
                className="w-full sm:flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-950/60 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                🛑 Ya, Akhiri Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
