import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Settings,
  Users,
  HelpCircle,
  Layers,
  Tv,
  Activity,
  Trophy,
  History,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Printer,
  Sparkles,
  Search,
  ArrowRight,
  ShieldAlert,
  Sliders,
  ChevronRight,
  Menu,
  X,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import { GameState, Team, Question, TeamColor, GameSettings } from '../types';
import { COLOR_MAP, DEFAULT_QUESTIONS, generateTeamCardDecks } from '../utils/presets';
import { sound } from '../utils/sound';

interface AdminDashboardProps {
  gameState: GameState;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onUpdateTeams: (newTeams: Team[]) => void;
  onUpdateQuestions: (newQuestions: Question[]) => void;
  onRegenerateDecks: (cardsPerTeam: number, randomized: boolean) => void;
  onStartPauseGame: () => void;
  onResetTimer: () => void;
  onResetAllScores: () => void;
  onUnlockBuzzer: () => void;
  onOverrideTeamScore: (teamId: string, delta: number) => void;
  onLoadDemoData?: () => void;
  onResetMatch?: () => void;
  onOpenArena?: () => void;
  onOpenPrint?: () => void;
  onOpenScoreboard?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  gameState,
  onUpdateSettings,
  onUpdateTeams,
  onUpdateQuestions,
  onRegenerateDecks,
  onStartPauseGame,
  onResetTimer,
  onResetAllScores,
  onUnlockBuzzer,
  onOverrideTeamScore,
  onLoadDemoData,
  onResetMatch,
  onOpenArena,
  onOpenPrint,
  onOpenScoreboard,
}) => {
  const { settings, teams, questions, status: gameStatus, activeTeamId, activityLogs } = gameState;

  // Active Admin Sub-Navigation
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'settings' | 'teams' | 'questions' | 'decks' | 'live' | 'results' | 'history'
  >('dashboard');

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form state for match settings
  const [matchForm, setMatchForm] = useState<GameSettings>({ ...settings });

  // Team creation / editing state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState<TeamColor>('cyan');

  // Question Modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionForm, setQuestionForm] = useState<{
    code: string;
    questionText: string;
    correctAnswer: string;
    alternativeAnswersText: string;
    points: number;
    answerType: 'text' | 'number' | 'multiple_choice';
    category: string;
    unitHint: string;
    explanation: string;
  }>({
    code: '',
    questionText: '',
    correctAnswer: '',
    alternativeAnswersText: '',
    points: 10,
    answerType: 'text',
    category: 'Pengukuran Fisika',
    unitHint: '',
    explanation: '',
  });
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Demo confirmation modal
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  // Reset match confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Card deck generator settings
  const [cardsCountPerTeam, setCardsCountPerTeam] = useState<number>(10);
  const [isRandomized, setIsRandomized] = useState<boolean>(true);

  // Feedback Notification Banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // READINESS CHECKLIST EVALUATION
  // -------------------------------------------------------------
  const readiness = useMemo(() => {
    const isTitleValid = matchForm.matchTitle.trim().length > 0;
    const isRoundValid = matchForm.roundName.trim().length > 0;
    const isTeamsCountValid = teams.length >= 2;
    const areTeamNamesValid = teams.length > 0 && teams.every((t) => t.name.trim().length > 0);
    const areQuestionsAvailable = questions.length >= 1;
    const areQuestionKeysValid = questions.length > 0 && questions.every((q) => q.correctAnswer.trim().length > 0);
    const isDurationValid = matchForm.durationMinutes > 0;

    const allReady =
      isTitleValid &&
      isTeamsCountValid &&
      areTeamNamesValid &&
      areQuestionsAvailable &&
      areQuestionKeysValid &&
      isDurationValid;

    const missingReasons: string[] = [];
    if (!isTitleValid) missingReasons.push('Nama pertandingan harus diisi.');
    if (!isTeamsCountValid) missingReasons.push('Tambahkan minimal 2 kelompok peserta.');
    if (!areTeamNamesValid) missingReasons.push('Semua kelompok harus memiliki nama yang valid.');
    if (!areQuestionsAvailable) missingReasons.push('Bank soal masih kosong, tambahkan minimal 1 soal.');
    if (!areQuestionKeysValid) missingReasons.push('Ada soal yang belum memiliki kunci jawaban.');
    if (!isDurationValid) missingReasons.push('Tentukan durasi pertandingan yang valid.');

    return {
      isTitleValid,
      isRoundValid,
      isTeamsCountValid,
      areTeamNamesValid,
      areQuestionsAvailable,
      areQuestionKeysValid,
      isDurationValid,
      allReady,
      missingReasons,
    };
  }, [matchForm, teams, questions]);

  // -------------------------------------------------------------
  // TEAM MANAGEMENT ACTIONS
  // -------------------------------------------------------------
  const handleAddTeam = (name?: string, color?: TeamColor) => {
    const teamColors: TeamColor[] = ['cyan', 'emerald', 'amber', 'rose', 'purple', 'blue', 'orange', 'indigo'];
    const teamNames = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'EAGLE', 'FALCON', 'GALAXY', 'HAWK', 'OMEGA', 'TITAN'];

    const nextIndex = teams.length;
    const assignedName = name || newTeamName.trim() || teamNames[nextIndex] || `KELOMPOK ${nextIndex + 1}`;
    const assignedColor = color || newTeamColor || teamColors[nextIndex % teamColors.length];

    const newTeam: Team = {
      id: `team-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: assignedName.toUpperCase(),
      color: assignedColor,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
    };

    const updated = [...teams, newTeam];
    onUpdateTeams(updated);
    onRegenerateDecks(cardsCountPerTeam, isRandomized);

    setNewTeamName('');
    sound.playClick();
    showToast(`Kelompok "${newTeam.name}" berhasil ditambahkan!`);
  };

  const handleUpdateTeamField = (id: string, updates: Partial<Team>) => {
    const updated = teams.map((t) => (t.id === id ? { ...t, ...updates } : t));
    onUpdateTeams(updated);
  };

  const handleDeleteTeam = (id: string) => {
    if (teams.length <= 2) {
      showToast('Minimal harus ada 2 kelompok dalam pertandingan.', 'error');
      return;
    }
    const teamToDelete = teams.find((t) => t.id === id);
    const updated = teams.filter((t) => t.id !== id);
    onUpdateTeams(updated);
    onRegenerateDecks(cardsCountPerTeam, isRandomized);
    sound.playClick();
    showToast(`Kelompok "${teamToDelete?.name || ''}" berhasil dihapus.`);
  };

  const handleAdjustTeamCount = (targetCount: number) => {
    if (targetCount < 2) {
      showToast('Minimal 2 kelompok diperlukan.', 'error');
      return;
    }
    if (targetCount > 12) {
      showToast('Maksimal 12 kelompok disarankan untuk kelancaran.', 'info');
      return;
    }

    if (targetCount > teams.length) {
      // Add teams up to target
      let currentTeams = [...teams];
      const teamColors: TeamColor[] = ['cyan', 'emerald', 'amber', 'rose', 'purple', 'blue', 'orange', 'indigo'];
      const teamNames = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'EAGLE', 'FALCON', 'GALAXY', 'HAWK', 'OMEGA', 'TITAN', 'VICTOR', 'ZULU'];

      for (let i = teams.length; i < targetCount; i++) {
        currentTeams.push({
          id: `team-${Date.now()}-${i}`,
          name: teamNames[i] || `KELOMPOK ${i + 1}`,
          color: teamColors[i % teamColors.length],
          score: 0,
          correctCount: 0,
          wrongCount: 0,
        });
      }
      onUpdateTeams(currentTeams);
      onRegenerateDecks(cardsCountPerTeam, isRandomized);
      sound.playClick();
      showToast(`Jumlah kelompok diubah menjadi ${targetCount}.`);
    } else if (targetCount < teams.length) {
      // Remove excess teams from end
      const currentTeams = teams.slice(0, targetCount);
      onUpdateTeams(currentTeams);
      onRegenerateDecks(cardsCountPerTeam, isRandomized);
      sound.playClick();
      showToast(`Jumlah kelompok diubah menjadi ${targetCount}.`);
    }
  };

  // -------------------------------------------------------------
  // QUESTION MANAGEMENT ACTIONS
  // -------------------------------------------------------------
  const openNewQuestionModal = () => {
    setEditingQuestionId(null);
    setQuestionError(null);
    const nextNumber = String(questions.length + 1).padStart(2, '0');
    setQuestionForm({
      code: `Q-${nextNumber}`,
      questionText: '',
      correctAnswer: '',
      alternativeAnswersText: '',
      points: settings.pointsPerCorrect || 10,
      answerType: 'text',
      category: 'Pengukuran Fisika',
      unitHint: '',
      explanation: '',
    });
    setIsQuestionModalOpen(true);
  };

  const openEditQuestionModal = (question: Question) => {
    setEditingQuestionId(question.id);
    setQuestionError(null);
    setQuestionForm({
      code: question.code || `Q-${question.id}`,
      questionText: question.questionText,
      correctAnswer: question.correctAnswer,
      alternativeAnswersText: (question.alternativeAnswers || []).join(', '),
      points: question.points || 10,
      answerType: 'text',
      category: question.category || 'Pengukuran Fisika',
      unitHint: question.unitHint || '',
      explanation: question.explanation || '',
    });
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionForm.questionText.trim()) {
      setQuestionError('Pertanyaan harus diisi.');
      return;
    }
    if (!questionForm.correctAnswer.trim()) {
      setQuestionError('Kunci jawaban harus diisi.');
      return;
    }
    if (questionForm.points <= 0) {
      setQuestionError('Poin harus lebih besar dari 0.');
      return;
    }

    const altAnswers = questionForm.alternativeAnswersText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingQuestionId) {
      // Update existing
      const updated = questions.map((q) =>
        q.id === editingQuestionId
          ? {
              ...q,
              code: questionForm.code.trim() || q.code,
              questionText: questionForm.questionText.trim(),
              correctAnswer: questionForm.correctAnswer.trim(),
              alternativeAnswers: altAnswers,
              points: Number(questionForm.points),
              category: questionForm.category.trim(),
              unitHint: questionForm.unitHint.trim(),
              explanation: questionForm.explanation.trim(),
            }
          : q
      );
      onUpdateQuestions(updated);
      showToast('Soal berhasil diperbarui!');
    } else {
      // Add new
      const newQuestion: Question = {
        id: `q-${Date.now()}`,
        code: questionForm.code.trim() || `Q-${String(questions.length + 1).padStart(2, '0')}`,
        questionText: questionForm.questionText.trim(),
        correctAnswer: questionForm.correctAnswer.trim(),
        alternativeAnswers: altAnswers,
        points: Number(questionForm.points),
        category: questionForm.category.trim(),
        unitHint: questionForm.unitHint.trim(),
        explanation: questionForm.explanation.trim(),
      };
      const updated = [...questions, newQuestion];
      onUpdateQuestions(updated);
      showToast('Soal baru berhasil ditambahkan!');
    }

    setIsQuestionModalOpen(false);
    setEditingQuestionId(null);
    sound.playClick();
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      showToast('Minimal harus ada 1 soal dalam bank soal.', 'error');
      return;
    }
    const qToDelete = questions.find((q) => q.id === id);
    if (confirm(`Hapus soal "${qToDelete?.code || id}"?`)) {
      const updated = questions.filter((q) => q.id !== id);
      onUpdateQuestions(updated);
      sound.playClick();
      showToast('Soal berhasil dihapus.');
    }
  };

  // -------------------------------------------------------------
  // SAVE & START ACTIONS
  // -------------------------------------------------------------
  const handleSaveAllSettings = () => {
    onUpdateSettings(matchForm);
    sound.playClick();
    showToast('Pengaturan berhasil disimpan. 💾');
  };

  const handleStartGameDirectly = () => {
    if (!readiness.allReady) {
      showToast('Tidak dapat memulai: ' + readiness.missingReasons[0], 'error');
      return;
    }

    // Save form settings first
    onUpdateSettings(matchForm);

    if (gameStatus !== 'running') {
      onStartPauseGame();
    }
    sound.playStart();
    showToast('🚀 Pertandingan telah dimulai!', 'success');

    // Switch view to Game Arena
    if (onOpenArena) {
      onOpenArena();
    }
  };

  const handleConfirmDemoData = () => {
    if (onLoadDemoData) {
      onLoadDemoData();
      setShowDemoConfirm(false);
      showToast('Data demo (4 Kelompok, 10 Soal Fisika) berhasil dimuat! ⚡');
    }
  };

  // Filtered Questions List
  const filteredQuestions = questions.filter(
    (q) =>
      q.questionText.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.code.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.correctAnswer.toLowerCase().includes(questionSearch.toLowerCase()) ||
      (q.category && q.category.toLowerCase().includes(questionSearch.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-2 sm:p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-2xl border flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === 'error'
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 shadow-rose-950/50'
              : toastMessage.type === 'info'
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 shadow-cyan-950/50'
              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. HEADER CONTROL ROOM (FROSTED GLASS) */}
      {/* ========================================================= */}
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center font-black text-2xl text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.4)] border border-cyan-300/30">
            M
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              MEASUREMENT BLOCK BLAST
            </h1>
            <p className="text-xs sm:text-sm font-semibold tracking-widest text-cyan-400 uppercase">
              ADMIN CONTROL PANEL
            </p>
          </div>
        </div>

        {/* Right: Status & Quick Mode Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">STATUS SISTEM:</span>
            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>

          {/* Quick Settings Shortcut */}
          <button
            id="btn-nav-settings-shortcut"
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('settings');
            }}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>PENGATURAN</span>
          </button>

          {/* Tombol Mulai Pertandingan di Akun Admin */}
          {gameStatus === 'running' ? (
            <button
              id="btn-header-pause-game-admin"
              type="button"
              onClick={() => {
                sound.playClick();
                onStartPauseGame();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-black text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              <span>JEDA PERTANDINGAN</span>
            </button>
          ) : (
            <button
              id="btn-header-start-game-admin"
              type="button"
              onClick={handleStartGameDirectly}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 border border-emerald-400/50 text-slate-950 font-black text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>🚀 MULAI PERTANDINGAN</span>
            </button>
          )}

          {/* Mode Layar Pertandingan (Buka Arena) */}
          <button
            id="btn-open-game-arena"
            type="button"
            onClick={() => {
              sound.playClick();
              if (onOpenArena) onOpenArena();
            }}
            className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-black text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Tv className="w-4 h-4" />
            <span>LAYAR PERTANDINGAN</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. 4 KARTU STATUS PERTANDINGAN */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Kartu 1: Status Pertandingan */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              STATUS PERTANDINGAN
            </span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-1">
            {gameStatus === 'running' && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-base sm:text-lg font-black text-emerald-400 uppercase tracking-wide">
                  BERLANGSUNG
                </span>
              </div>
            )}
            {gameStatus === 'paused' && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-base sm:text-lg font-black text-amber-400 uppercase tracking-wide">
                  DI-JEDA
                </span>
              </div>
            )}
            {gameStatus === 'finished' && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-base sm:text-lg font-black text-rose-400 uppercase tracking-wide">
                  SELESAI
                </span>
              </div>
            )}
            {(gameStatus === 'setup' || gameStatus === 'ready') && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-base sm:text-lg font-black text-slate-300 uppercase tracking-wide">
                  BELUM DIMULAI
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            {readiness.allReady ? '✓ Siap Dimulai' : '• Menunggu Konfigurasi'}
          </div>
        </div>

        {/* Kartu 2: Jumlah Kelompok */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              JUMLAH KELOMPOK
            </span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{teams.length}</div>
          <div className="mt-2 flex items-center gap-1.5">
            {teams.slice(0, 5).map((t) => (
              <span
                key={t.id}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLOR_MAP[t.color]?.glow || '#06b6d4' }}
                title={t.name}
              />
            ))}
            {teams.length > 5 && <span className="text-[10px] text-slate-400">+{teams.length - 5}</span>}
          </div>
        </div>

        {/* Kartu 3: Jumlah Soal */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              JUMLAH SOAL
            </span>
            <HelpCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{questions.length}</div>
          <div className="mt-2 text-[11px] text-slate-400">
            Total Poin:{' '}
            <span className="text-cyan-400 font-bold">
              {questions.reduce((acc, q) => acc + (q.points || settings.pointsPerCorrect), 0)}
            </span>
          </div>
        </div>

        {/* Kartu 4: Durasi Pertandingan */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">DURASI</span>
            <span className="text-xs text-cyan-400 font-mono">
              {Math.floor(gameState.timeRemainingSeconds / 60)}:
              {String(gameState.timeRemainingSeconds % 60).padStart(2, '0')}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white uppercase">
            {matchForm.durationMinutes} MENIT
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {gameStatus === 'running' ? '⏱ Timer sedang berjalan' : 'Default waktu pertandingan'}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT WITH SIDEBAR */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SIDEBAR NAVIGATION (Col 1-3) */}
        <aside className="lg:col-span-3 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-xl flex flex-col gap-1.5">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 mb-2">
            NAVIGASI KONTROL
          </div>

          {/* Menu Items */}
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'settings', label: 'Pengaturan Pertandingan', icon: Settings },
            { id: 'teams', label: 'Kelompok Peserta', icon: Users, badge: teams.length },
            { id: 'questions', label: 'Bank Soal', icon: HelpCircle, badge: questions.length },
            { id: 'decks', label: 'Kartu Soal & Deck', icon: Layers },
            { id: 'live', label: 'Monitoring Langsung', icon: Activity },
            { id: 'results', label: 'Hasil Pertandingan', icon: Trophy },
            { id: 'history', label: 'Riwayat Log', icon: History },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-item-${item.id}`}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab(item.id as typeof activeTab);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick External Actions */}
          <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
            {gameStatus !== 'running' && (
              <button
                id="btn-sidebar-start-match"
                type="button"
                onClick={handleStartGameDirectly}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <div className="flex items-center gap-2.5">
                  <Play className="w-4 h-4 text-emerald-400 fill-current" />
                  <span>Mulai Pertandingan</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            )}

            <button
              id="btn-sidebar-arena"
              type="button"
              onClick={() => {
                sound.playClick();
                if (onOpenArena) onOpenArena();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-cyan-400" />
                <span>Layar Pertandingan</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>

            <button
              id="btn-sidebar-print"
              type="button"
              onClick={() => {
                sound.playClick();
                if (onOpenPrint) onOpenPrint();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Cetak Kartu Fisik</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>
          </div>

          {/* Bottom Sidebar Status */}
          <div className="mt-6 pt-4 border-t border-white/10 px-3 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              <p className="font-bold text-white">ADMIN / GURU</p>
              <p className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Sistem Online
              </p>
            </div>
            <button
              id="btn-sidebar-reset"
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold transition-all cursor-pointer"
              title="Reset Skor & Pertandingan"
            >
              Reset Match
            </button>
          </div>
        </aside>

        {/* MAIN PANEL CONTENT (Col 4-12) */}
        <main className="lg:col-span-9 space-y-6">
          {/* ------------------------------------------------------------- */}
          {/* TAB: DASHBOARD (Ringkasan & Setup Cepat) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Quick Action Banner */}
              <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-indigo-950/60 backdrop-blur-2xl border border-cyan-400/30 rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Pusat Pengaturan Pertandingan
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                    {matchForm.matchTitle || 'Measurement Block Blast'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Babak: <span className="text-cyan-400 font-bold">{matchForm.roundName}</span> •{' '}
                    {teams.length} Kelompok • {questions.length} Soal • {matchForm.durationMinutes} Menit
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    id="btn-dashboard-load-demo"
                    type="button"
                    onClick={() => setShowDemoConfirm(true)}
                    className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    MUAT DATA DEMO
                  </button>

                  <button
                    id="btn-dashboard-save-all"
                    type="button"
                    onClick={handleSaveAllSettings}
                    className="px-5 py-2.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md"
                  >
                    <Save className="w-4 h-4" />
                    SIMPAN PENGATURAN
                  </button>
                </div>
              </div>

              {/* CARD: PENGATURAN PERTANDINGAN */}
              <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                        PENGATURAN PERTANDINGAN
                      </h3>
                      <p className="text-xs text-slate-400">Atur judul, babak, durasi waktu, dan aturan penilaian</p>
                    </div>
                  </div>

                  <span className="text-xs px-3 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                    Konfigurasi Utama
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Nama Pertandingan */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Nama Pertandingan
                    </label>
                    <input
                      id="input-match-title"
                      type="text"
                      value={matchForm.matchTitle}
                      onChange={(e) => setMatchForm({ ...matchForm, matchTitle: e.target.value })}
                      placeholder="Contoh: Gebyar Santri Alkarim Rasyid 2026"
                      className="w-full bg-slate-950/70 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all"
                    />
                  </div>

                  {/* Nama Babak */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Nama Babak
                    </label>
                    <input
                      id="input-round-name"
                      type="text"
                      value={matchForm.roundName}
                      onChange={(e) => setMatchForm({ ...matchForm, roundName: e.target.value })}
                      placeholder="Contoh: Babak Penyisihan - Measurement Block Blast"
                      className="w-full bg-slate-950/70 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all"
                    />
                  </div>

                  {/* Durasi Pertandingan */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Durasi Pertandingan
                    </label>
                    <div className="relative">
                      <select
                        id="select-match-duration"
                        value={matchForm.durationMinutes}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            durationMinutes: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-950/70 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none transition-all cursor-pointer appearance-none"
                      >
                        <option value={1} className="bg-slate-900 text-white">1 Menit (Uji Coba Cepat)</option>
                        <option value={3} className="bg-slate-900 text-white">3 Menit</option>
                        <option value={5} className="bg-slate-900 text-white">5 Menit (Standar Pendek)</option>
                        <option value={10} className="bg-slate-900 text-white">10 Menit (Rekomendasi Standar)</option>
                        <option value={15} className="bg-slate-900 text-white">15 Menit</option>
                        <option value={20} className="bg-slate-900 text-white">20 Menit</option>
                        <option value={30} className="bg-slate-900 text-white">30 Menit</option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-bold">
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Poin Jawaban Benar */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Poin Jawaban Benar
                    </label>
                    <input
                      id="input-points-per-correct"
                      type="number"
                      min={1}
                      max={100}
                      value={matchForm.pointsPerCorrect}
                      onChange={(e) =>
                        setMatchForm({
                          ...matchForm,
                          pointsPerCorrect: Number(e.target.value) || 10,
                        })
                      }
                      className="w-full bg-slate-950/70 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Aturan Jika Jawaban Salah */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Jika Jawaban Salah:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                        matchForm.wrongAnswerRule === 'retry'
                          ? 'bg-cyan-500/10 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-slate-950/50 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="wrongAnswerRule"
                        checked={matchForm.wrongAnswerRule === 'retry'}
                        onChange={() => setMatchForm({ ...matchForm, wrongAnswerRule: 'retry' })}
                        className="w-4 h-4 text-cyan-400 focus:ring-cyan-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-bold">Soal dapat dicoba kembali</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Kelompok dapat mengerjakan ulang dan menjawab nomor soal yang sama nanti (Default).
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                        matchForm.wrongAnswerRule === 'lock'
                          ? 'bg-cyan-500/10 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-slate-950/50 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="wrongAnswerRule"
                        checked={matchForm.wrongAnswerRule === 'lock'}
                        onChange={() => setMatchForm({ ...matchForm, wrongAnswerRule: 'lock' })}
                        className="w-4 h-4 text-cyan-400 focus:ring-cyan-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-bold">Soal langsung terkunci</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Kartu hangus dan tidak dapat dijawab lagi oleh kelompok tersebut.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Save Button for Settings Section */}
                <div className="flex justify-end pt-2">
                  <button
                    id="btn-save-match-settings"
                    type="button"
                    onClick={handleSaveAllSettings}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    SIMPAN PENGATURAN
                  </button>
                </div>
              </div>

              {/* CARD: KELOMPOK PESERTA (Overview Grid) */}
              <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                        KELOMPOK PESERTA
                      </h3>
                      <p className="text-xs text-slate-400">Atur jumlah dan nama kelompok yang bertanding</p>
                    </div>
                  </div>

                  {/* Counter Stepper [ - ] N [ + ] */}
                  <div className="flex items-center gap-3 bg-slate-950/70 border border-white/15 px-3 py-1.5 rounded-2xl">
                    <span className="text-xs font-bold text-slate-400 uppercase mr-1">Jumlah:</span>
                    <button
                      id="btn-decrease-teams-counter"
                      type="button"
                      onClick={() => handleAdjustTeamCount(teams.length - 1)}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-sm transition-all cursor-pointer"
                      title="Kurangi Kelompok"
                    >
                      -
                    </button>
                    <span className="font-black text-base text-cyan-400 px-2 min-w-6 text-center">
                      {teams.length}
                    </span>
                    <button
                      id="btn-increase-teams-counter"
                      type="button"
                      onClick={() => handleAdjustTeamCount(teams.length + 1)}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-sm transition-all cursor-pointer"
                      title="Tambah Kelompok"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Team Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {teams.map((team, idx) => {
                    const styles = COLOR_MAP[team.color] || COLOR_MAP.cyan;
                    return (
                      <div
                        key={team.id}
                        className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 space-y-3 relative group hover:border-white/20 transition-all shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Kelompok"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Nama Kelompok
                          </label>
                          <input
                            type="text"
                            value={team.name}
                            onChange={(e) => handleUpdateTeamField(team.id, { name: e.target.value.toUpperCase() })}
                            className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none"
                            placeholder="NAMA KELOMPOK"
                          />
                        </div>

                        {/* Color Picker */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                            Warna
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(['cyan', 'emerald', 'amber', 'rose', 'purple', 'blue', 'orange', 'indigo'] as TeamColor[]).map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => handleUpdateTeamField(team.id, { color: c })}
                                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                                  team.color === c ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: COLOR_MAP[c]?.glow || '#06b6d4' }}
                                title={c}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Team Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    id="btn-add-new-team"
                    type="button"
                    onClick={() => handleAddTeam()}
                    className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-cyan-400" />
                    + TAMBAH KELOMPOK
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Preset Cepat:</span>
                    {[2, 4, 6, 8].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleAdjustTeamCount(count)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          teams.length === count
                            ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {count} Tim
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CARD: BANK SOAL (Overview Table) */}
              <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                        BANK SOAL
                      </h3>
                      <p className="text-xs text-slate-400">
                        Jumlah Soal: <span className="text-cyan-400 font-bold">{questions.length}</span> soal aktif
                      </p>
                    </div>
                  </div>

                  {/* Question Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      id="btn-open-add-question-modal"
                      type="button"
                      onClick={openNewQuestionModal}
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      + TAMBAH SOAL
                    </button>

                    <button
                      id="btn-manage-all-questions"
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setActiveTab('questions');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      KELOLA SOAL
                    </button>

                    <button
                      id="btn-quick-print-cards"
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        if (onOpenPrint) onOpenPrint();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      CETAK KARTU SOAL
                    </button>
                  </div>
                </div>

                {/* Question Preview Table */}
                {questions.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-white/15 rounded-2xl p-6">
                    <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-300">
                      Belum ada soal. Silakan tambahkan soal terlebih dahulu.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Atau gunakan tombol "Muat Data Demo" untuk mengisi soal secara instan.
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={openNewQuestionModal}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        + Tambah Soal Pertama
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDemoConfirm(true)}
                        className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs cursor-pointer"
                      >
                        Muat Data Demo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3 w-12 text-center">No</th>
                          <th className="p-3">Pertanyaan</th>
                          <th className="p-3">Kunci Jawaban (Admin)</th>
                          <th className="p-3 w-20 text-center">Poin</th>
                          <th className="p-3 w-24 text-center">Status</th>
                          <th className="p-3 w-24 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {questions.slice(0, 5).map((q, idx) => (
                          <tr key={q.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 text-center font-bold text-cyan-400">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="p-3 text-slate-200">
                              <p className="line-clamp-1 font-semibold">{q.questionText}</p>
                              {q.category && (
                                <span className="text-[10px] text-slate-500 font-normal">{q.category}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 font-mono font-bold">
                                {q.correctAnswer}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-cyan-400">{q.points || 10}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                                Aktif
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditQuestionModal(q)}
                                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                                  title="Edit Soal"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 cursor-pointer"
                                  title="Hapus Soal"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* 4. AREA CHECKLIST & TOMBOL SIAP MEMULAI */}
              {/* ========================================================= */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 backdrop-blur-2xl border-2 border-cyan-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-black text-cyan-400 uppercase tracking-[0.25em]">
                      STATUS VERIFIKASI PERTANDINGAN
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-1">
                      SIAP MEMULAI PERTANDINGAN?
                    </h2>
                  </div>

                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase border ${
                      readiness.allReady
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        : 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                    }`}
                  >
                    {readiness.allReady ? '✓ SEMUA SYARAT TERPENUHI' : 'BELUM LENGKAP'}
                  </span>
                </div>

                {/* Checklist Requirements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                      readiness.isTitleValid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {readiness.isTitleValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold">Nama pertandingan sudah diisi</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                      readiness.isTeamsCountValid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {readiness.isTeamsCountValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold">Kelompok sudah dibuat (min. 2)</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                      readiness.areQuestionsAvailable
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {readiness.areQuestionsAvailable ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold">Soal sudah tersedia ({questions.length})</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                      readiness.areQuestionKeysValid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {readiness.areQuestionKeysValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold">Kunci jawaban sudah diisi</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                      readiness.isDurationValid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {readiness.isDurationValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold">Durasi sudah ditentukan ({matchForm.durationMinutes}m)</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                      readiness.areTeamNamesValid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {readiness.areTeamNamesValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold">Nama kelompok valid</span>
                  </div>
                </div>

                {/* Big Start Game Button */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-400">
                    {readiness.allReady
                      ? 'Semua data telah valid. Klik tombol untuk memulai hitung mundur dan membuka layar pertandingan.'
                      : `Peringatan: ${readiness.missingReasons[0] || 'Lengkapi data terlebih dahulu.'}`}
                  </p>

                  <button
                    id="btn-launch-game-competition"
                    type="button"
                    disabled={!readiness.allReady}
                    onClick={handleStartGameDirectly}
                    className={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-lg tracking-wider uppercase flex items-center justify-center gap-3 transition-all ${
                      readiness.allReady
                        ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 cursor-pointer'
                        : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-6 h-6 fill-current" />
                    🚀 MULAI PERTANDINGAN
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: SETTINGS (Pengaturan Pertandingan Lengkap) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'settings' && (
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                  PENGATURAN LENGKAP PERTANDINGAN
                </h2>
                <p className="text-xs text-slate-400">
                  Konfigurasi waktu, bobot poin, toleransi huruf besar/kecil, dan efek suara
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Nama Pertandingan</label>
                  <input
                    type="text"
                    value={matchForm.matchTitle}
                    onChange={(e) => setMatchForm({ ...matchForm, matchTitle: e.target.value })}
                    className="w-full bg-slate-950/70 border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Nama Babak</label>
                  <input
                    type="text"
                    value={matchForm.roundName}
                    onChange={(e) => setMatchForm({ ...matchForm, roundName: e.target.value })}
                    className="w-full bg-slate-950/70 border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={matchForm.durationMinutes}
                    onChange={(e) => setMatchForm({ ...matchForm, durationMinutes: Number(e.target.value) || 10 })}
                    className="w-full bg-slate-950/70 border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Poin Jawaban Benar</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={matchForm.pointsPerCorrect}
                    onChange={(e) => setMatchForm({ ...matchForm, pointsPerCorrect: Number(e.target.value) || 10 })}
                    className="w-full bg-slate-950/70 border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-white/10 cursor-pointer">
                  <div>
                    <p className="text-sm font-bold text-white">Efek Suara Permainan</p>
                    <p className="text-xs text-slate-400">Aktifkan efek buzzer, nada benar, dan nada salah</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={matchForm.soundEnabled}
                    onChange={(e) => setMatchForm({ ...matchForm, soundEnabled: e.target.checked })}
                    className="w-5 h-5 rounded text-cyan-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-white/10 cursor-pointer">
                  <div>
                    <p className="text-sm font-bold text-white">Sensitivitas Huruf (Case Sensitive)</p>
                    <p className="text-xs text-slate-400">
                      Jika non-aktif, "cm" dan "CM" atau "Jupiter" dan "jupiter" dianggap sama
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={matchForm.caseSensitive}
                    onChange={(e) => setMatchForm({ ...matchForm, caseSensitive: e.target.checked })}
                    className="w-5 h-5 rounded text-cyan-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleSaveAllSettings}
                  className="px-6 py-3 rounded-2xl bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  SIMPAN PENGATURAN
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: TEAMS (Kelola Kelompok Peserta) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'teams' && (
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                    KELOLA KELOMPOK PESERTA ({teams.length})
                  </h2>
                  <p className="text-xs text-slate-400">Tambah, edit nama, ubah warna, dan hapus kelompok</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddTeam()}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase cursor-pointer"
                  >
                    + Tambah Kelompok
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {teams.map((team, idx) => (
                  <div
                    key={team.id}
                    className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-cyan-400">KARTU #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Nama Kelompok
                      </label>
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => handleUpdateTeamField(team.id, { name: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Warna</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(['cyan', 'emerald', 'amber', 'rose', 'purple', 'blue', 'orange', 'indigo'] as TeamColor[]).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleUpdateTeamField(team.id, { color: c })}
                            className={`w-5 h-5 rounded-full ${
                              team.color === c ? 'ring-2 ring-white scale-110' : 'opacity-60'
                            }`}
                            style={{ backgroundColor: COLOR_MAP[c]?.glow || '#06b6d4' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: QUESTIONS (Bank Soal Penuh) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'questions' && (
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                    BANK SOAL ({questions.length})
                  </h2>
                  <p className="text-xs text-slate-400">Daftar lengkap soal dan kunci jawaban</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      placeholder="Cari soal atau kunci..."
                      className="bg-slate-950/70 border border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none w-48"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={openNewQuestionModal}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase cursor-pointer"
                  >
                    + Tambah Soal
                  </button>
                </div>
              </div>

              {/* Full Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-white/10 text-slate-400 font-bold uppercase">
                    <tr>
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3">Pertanyaan</th>
                      <th className="p-3">Kunci Jawaban</th>
                      <th className="p-3">Alternatif Jawaban</th>
                      <th className="p-3 w-20 text-center">Poin</th>
                      <th className="p-3 w-24 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {filteredQuestions.map((q, idx) => (
                      <tr key={q.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center font-bold text-cyan-400">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="p-3 text-slate-200">
                          <p className="font-semibold">{q.questionText}</p>
                          <span className="text-[10px] text-slate-500">{q.category}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 font-mono font-bold">
                            {q.correctAnswer}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {(q.alternativeAnswers || []).join(', ') || '-'}
                        </td>
                        <td className="p-3 text-center font-bold text-cyan-400">{q.points || 10}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditQuestionModal(q)}
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: LIVE MONITORING & RESULTS */}
          {/* ------------------------------------------------------------- */}
          {(activeTab === 'live' || activeTab === 'results' || activeTab === 'history') && (
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                    {activeTab === 'live' && 'MONITORING PERTANDINGAN LANGSUNG'}
                    {activeTab === 'results' && 'HASIL & KLASEMEN PERTANDINGAN'}
                    {activeTab === 'history' && 'RIWAYAT LOG AKTIVITAS'}
                  </h2>
                  <p className="text-xs text-slate-400">Pantau skor, penyesuaian nilai, dan log aktivitas</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onUnlockBuzzer}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                  >
                    Buka Kunci Buzzer
                  </button>
                </div>
              </div>

              {/* Team Scores Live Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {teams.map((t) => (
                  <div key={t.id} className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{t.name}</span>
                      <span className="text-xl font-black text-cyan-400">{t.score}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Benar: {t.correctCount}</span>
                      <span>Salah: {t.wrongCount}</span>
                    </div>
                    {/* Score Override Buttons */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => onOverrideTeamScore(t.id, 10)}
                        className="flex-1 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold cursor-pointer"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => onOverrideTeamScore(t.id, -10)}
                        className="flex-1 py-1 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold cursor-pointer"
                      >
                        -10
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Activity Logs Feed */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Log Aktivitas Terbaru</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {activityLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Belum ada aktivitas pertandingan.</p>
                  ) : (
                    activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-300">{log.message}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{log.timeFormatted}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: DECKS & PRINTING */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'decks' && (
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                    DECK KARTU SOAL PER KELOMPOK
                  </h2>
                  <p className="text-xs text-slate-400">
                    Generate pembagian nomor kartu soal fisik untuk setiap kelompok
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPrint) onOpenPrint();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Buka Halaman Cetak
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Acak Urutan Soal Tiap Kelompok</p>
                  <p className="text-xs text-slate-400">
                    Mencegah kelompok melihat jawaban kelompok lain karena nomor soal diacak per kelompok
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onRegenerateDecks(10, true);
                    showToast('Deck kartu soal berhasil diacak ulang!');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-bold cursor-pointer"
                >
                  Acak Ulang Sekarang
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* 5. MODAL TAMBAH & EDIT SOAL */}
      {/* ========================================================= */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-400/30 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.2)] space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">
                  {editingQuestionId ? 'EDIT SOAL' : 'TAMBAH SOAL BARU'}
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  Nomor Soal: <span className="font-mono text-cyan-300">{questionForm.code}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {questionError && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{questionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Pertanyaan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Pertanyaan <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={questionForm.questionText}
                  onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                  placeholder="Tuliskan teks pertanyaan soal lengkap di sini..."
                  className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-2xl p-3.5 text-sm font-semibold text-white outline-none"
                />
              </div>

              {/* Kunci Jawaban */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Kunci Jawaban Utama <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                    placeholder="Contoh: 250 cm atau 12"
                    className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none"
                  />
                </div>

                {/* Alternatif Jawaban */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Variasi Jawaban (Pisahkan Koma)
                  </label>
                  <input
                    type="text"
                    value={questionForm.alternativeAnswersText}
                    onChange={(e) => setQuestionForm({ ...questionForm, alternativeAnswersText: e.target.value })}
                    placeholder="Contoh: 250cm, 2.5 m, 2,5 meter"
                    className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Poin, Tipe, Satuan */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Poin</label>
                  <input
                    type="number"
                    min={1}
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: Number(e.target.value) || 10 })}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Tipe Jawaban</label>
                  <select
                    value={questionForm.answerType}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        answerType: e.target.value as typeof questionForm.answerType,
                      })
                    }
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none cursor-pointer"
                  >
                    <option value="text">Text</option>
                    <option value="number">Angka</option>
                    <option value="multiple_choice">Pilihan Ganda</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Petunjuk Satuan</label>
                  <input
                    type="text"
                    value={questionForm.unitHint}
                    onChange={(e) => setQuestionForm({ ...questionForm, unitHint: e.target.value })}
                    placeholder="Contoh: cm, kg"
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  SIMPAN SOAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL KONFIRMASI MUAT DATA DEMO */}
      {/* ========================================================= */}
      {showDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-400/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Muat Data Contoh Pertandingan?</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Ini akan menyiapkan secara otomatis:
                <br />
                • <strong className="text-cyan-300">4 Kelompok</strong> (ALPHA, BRAVO, CHARLIE, DELTA)
                <br />
                • <strong className="text-cyan-300">10 Soal Contoh</strong> Pengukuran Fisika & Matematika
                <br />
                • <strong className="text-cyan-300">Durasi 5 Menit</strong> & 10 Poin per soal
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDemoConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDemoData}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Ya, Muat Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL KONFIRMASI RESET MATCH */}
      {/* ========================================================= */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Reset Semua Skor Pertandingan?</h3>
              <p className="text-xs text-slate-300 mt-2">
                Semua skor kelompok akan di-reset kembali ke 0 dan status soal akan dibuka kembali.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetMatch) onResetMatch();
                  setShowResetConfirm(false);
                  showToast('Semua skor telah di-reset ke 0.');
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase cursor-pointer"
              >
                Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
