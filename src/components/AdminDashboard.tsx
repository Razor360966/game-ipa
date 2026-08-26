import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshCw,
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
  Eye,
  CheckSquare,
  ListOrdered,
  FileText,
  Check,
  Loader2,
  ArrowUp,
  ArrowDown,
  LogOut,
} from 'lucide-react';
import {
  GameState,
  Team,
  Question,
  QuestionType,
  TeamColor,
  GameSettings,
  MultipleChoiceOption,
  StatementCorrectionConfig,
  MultiPartConfig,
  MultiPartItem,
  PlaylistMode,
} from '../types';
import {
  COLOR_MAP,
  DEFAULT_QUESTIONS,
  generateTeamCardDecks,
  validateDecksAndQuestions,
  getUniqueQuestionCategories,
  filterQuestionsByCategory,
} from '../utils/presets';
import { sound } from '../utils/sound';
import { AccountSecuritySection } from './AccountSecuritySection';
import { PlaylistManager } from './PlaylistManager';

interface AdminDashboardProps {
  gameState: GameState;
  masterQuestions?: Question[];
  onSelectTopic?: (topic: string) => void;
  onApplyPlaylist?: (
    mode: PlaylistMode,
    options: {
      selectedTopic?: string;
      selectedTopics?: string[];
      customQuestionIds?: string[];
      playlistName?: string;
    }
  ) => void;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onUpdateTeams: (newTeams: Team[]) => void;
  onUpdateQuestions: (newQuestions: Question[]) => void;
  onSaveQuestionDirect?: (question: Question, isEdit: boolean) => Promise<{ success: boolean; error?: string }>;
  onDeleteQuestionDirect?: (questionId: string) => Promise<{ success: boolean; error?: string }>;
  onRefreshFromCloud?: () => Promise<void>;
  onRegenerateDecks: (cardsPerTeam: number, randomized: boolean) => void;
  onStartPauseGame: () => void;
  onResetTimer: () => void;
  onResetAllScores: () => void;
  onUnlockBuzzer: () => void;
  onOverrideTeamScore: (teamId: string, delta: number) => void;
  onLoadDemoData?: () => void;
  onResetMatch?: () => void;
  onToggleOrderLock?: (locked: boolean) => Promise<{ success: boolean; error?: string } | void>;
  onOpenArena?: () => void;
  onOpenPrint?: () => void;
  onOpenScoreboard?: () => void;
  onOpenGate?: () => void;
  onLogoutAdmin?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  gameState,
  masterQuestions,
  onSelectTopic,
  onApplyPlaylist,
  onUpdateSettings,
  onUpdateTeams,
  onUpdateQuestions,
  onSaveQuestionDirect,
  onDeleteQuestionDirect,
  onRefreshFromCloud,
  onRegenerateDecks,
  onStartPauseGame,
  onResetTimer,
  onResetAllScores,
  onUnlockBuzzer,
  onOverrideTeamScore,
  onLoadDemoData,
  onResetMatch,
  onToggleOrderLock,
  onOpenArena,
  onOpenPrint,
  onOpenScoreboard,
  onOpenGate,
  onLogoutAdmin,
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

  // Sync matchForm when settings update from other devices
  useEffect(() => {
    setMatchForm({ ...settings });
  }, [settings]);

  // Team creation / editing state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState<TeamColor>('cyan');

  // Question Modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [questionSearch, setQuestionSearch] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);

  // Question Order Lock State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [isLockingOrder, setIsLockingOrder] = useState(false);
  const isOrderLocked = Boolean(gameState.orderLocked);
  const [questionForm, setQuestionForm] = useState<{
    code: string;
    type: QuestionType;
    questionText: string;
    correctAnswer: string;
    alternativeAnswersText: string;
    points: number;
    category: string;
    unitHint: string;
    explanation: string;
    // Multiple Choice
    options: MultipleChoiceOption[];
    correctOptionId: string;
    // Statement Correction
    statementText: string;
    statementIsTrue: boolean;
    correctionKey: string;
    correctionAlternativesText: string;
    statementScoringMode: 'full' | 'partial';
    // Multi Part
    multiPartIntro: string;
    multiPartItems: { id: string; question: string; correctAnswer: string; alternativeAnswersText: string }[];
    multiPartScoringMode: 'full' | 'partial';
    // Per-Question Custom Timer (in seconds, optional)
    timeLimitSeconds: number | string;
  }>({
    code: '',
    type: 'short_answer',
    questionText: '',
    correctAnswer: '',
    alternativeAnswersText: '',
    points: 10,
    category: 'Pengukuran Fisika',
    unitHint: '',
    explanation: '',
    options: [
      { id: 'A', label: 'A', text: '' },
      { id: 'B', label: 'B', text: '' },
      { id: 'C', label: 'C', text: '' },
      { id: 'D', label: 'D', text: '' },
    ],
    correctOptionId: 'A',
    statementText: '',
    statementIsTrue: false,
    correctionKey: '',
    correctionAlternativesText: '',
    statementScoringMode: 'full',
    multiPartIntro: '',
    multiPartItems: [
      { id: 'p-1', question: '', correctAnswer: '', alternativeAnswersText: '' },
      { id: 'p-2', question: '', correctAnswer: '', alternativeAnswersText: '' },
    ],
    multiPartScoringMode: 'partial',
    timeLimitSeconds: '',
  });
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Demo confirmation modal
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  // Reset match confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Regenerate deck confirmation modal
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  // Selected team for deck preview
  const [previewTeamId, setPreviewTeamId] = useState<string>('all');

  // Card deck generator settings
  const [cardsCountPerTeam, setCardsCountPerTeam] = useState<number>(10);
  const [isRandomized, setIsRandomized] = useState<boolean>(true);

  // Check if match has already started or has active progress
  const isMatchStarted = useMemo(() => {
    const decks = gameState.teamCardDecks || {};
    return (
      gameStatus === 'running' ||
      gameStatus === 'paused' ||
      gameStatus === 'finished' ||
      teams.some((t) => (t.score && t.score > 0) || (t.correctCount && t.correctCount > 0) || (t.wrongCount && t.wrongCount > 0)) ||
      Object.keys(decks).some((teamId) => {
        const teamDeck = decks[teamId] || [];
        return teamDeck.some((card) => card.status !== 'unanswered' || (card.attempts && card.attempts > 0));
      })
    );
  }, [gameStatus, teams, gameState.teamCardDecks]);

  // Validate Question Bank and Team Decks
  const deckValidation = useMemo(() => {
    return validateDecksAndQuestions(teams, questions, gameState.teamCardDecks || {});
  }, [teams, questions, gameState.teamCardDecks]);

  // Master Pool for Topic Selection (Full master bank if provided, otherwise active questions)
  const masterPool = useMemo(() => {
    return masterQuestions && masterQuestions.length > 0 ? masterQuestions : questions;
  }, [masterQuestions, questions]);

  // Available topics derived from Master Pool
  const availableTopics = useMemo(() => {
    return getUniqueQuestionCategories(masterPool);
  }, [masterPool]);

  // Handler for topic selection change
  const handleTopicChange = (topic: string) => {
    if (isOrderLocked) {
      showToast('Urutan kartu sudah dikunci. Buka kunci urutan sebelum mengganti topik playlist.', 'error');
      return;
    }
    setMatchForm((prev) => ({ ...prev, selectedTopic: topic }));
    if (onSelectTopic) {
      onSelectTopic(topic);
    } else {
      onUpdateSettings({ ...matchForm, selectedTopic: topic });
    }
    sound.playClick();
    showToast(topic ? `Playlist topik diubah ke: "${topic}" 📚` : 'Menampilkan semua topik soal (Semua Topik) 📚');
  };

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
    if (isOrderLocked) {
      showToast('Urutan kartu sudah dikunci. Buka kunci urutan terlebih dahulu jika ingin menambah soal baru.', 'error');
      return;
    }
    setEditingQuestionId(null);
    setQuestionError(null);
    const nextNumber = String(questions.length + 1).padStart(2, '0');
    setQuestionForm({
      code: `Q-${nextNumber}`,
      type: 'short_answer',
      questionText: '',
      correctAnswer: '',
      alternativeAnswersText: '',
      points: settings.pointsPerCorrect || 10,
      category: 'Pengukuran Fisika',
      unitHint: '',
      explanation: '',
      options: [
        { id: 'A', label: 'A', text: '' },
        { id: 'B', label: 'B', text: '' },
        { id: 'C', label: 'C', text: '' },
        { id: 'D', label: 'D', text: '' },
      ],
      correctOptionId: 'A',
      statementText: '',
      statementIsTrue: false,
      correctionKey: '',
      correctionAlternativesText: '',
      statementScoringMode: 'full',
      multiPartIntro: '',
      multiPartItems: [
        { id: 'p-1', question: '', correctAnswer: '', alternativeAnswersText: '' },
        { id: 'p-2', question: '', correctAnswer: '', alternativeAnswersText: '' },
      ],
      multiPartScoringMode: 'partial',
      timeLimitSeconds: '',
    });
    setIsQuestionModalOpen(true);
  };

  const openEditQuestionModal = (question: Question) => {
    setEditingQuestionId(question.id);
    setQuestionError(null);
    const qType: QuestionType = question.type || 'short_answer';

    // Parse options for Multiple Choice
    const defaultOptions: MultipleChoiceOption[] = [
      { id: 'A', label: 'A', text: '' },
      { id: 'B', label: 'B', text: '' },
      { id: 'C', label: 'C', text: '' },
      { id: 'D', label: 'D', text: '' },
    ];
    const resolvedOptions = question.options && question.options.length > 0 ? question.options : defaultOptions;

    // Parse Statement Correction fields
    const statementText = question.statementConfig?.statement || (qType === 'statement_correction' ? question.questionText : '');
    const statementIsTrue = question.statementConfig?.isTrue ?? false;
    const correctionKey = question.statementConfig?.correctionKey || (qType === 'statement_correction' ? question.correctAnswer : '');
    const correctionAlternativesText = (question.statementConfig?.correctionAlternatives || []).join(', ');
    const statementScoringMode = question.statementConfig?.scoringMode || 'full';

    // Parse Multi Part fields
    const multiPartIntro = question.multiPartConfig?.introduction || '';
    const multiPartItems = (question.multiPartConfig?.parts || []).map((p, idx) => ({
      id: p.id || `p-${idx + 1}`,
      question: p.question || '',
      correctAnswer: p.correctAnswer || '',
      alternativeAnswersText: (p.alternativeAnswers || []).join(', '),
    }));
    const resolvedMultiParts = multiPartItems.length > 0
      ? multiPartItems
      : [
          { id: 'p-1', question: question.questionText, correctAnswer: question.correctAnswer, alternativeAnswersText: '' },
          { id: 'p-2', question: '', correctAnswer: '', alternativeAnswersText: '' },
        ];
    const multiPartScoringMode = question.multiPartConfig?.scoringMode || 'partial';

    setQuestionForm({
      code: question.code || `Q-${question.id}`,
      type: qType,
      questionText: question.questionText || '',
      correctAnswer: question.correctAnswer || '',
      alternativeAnswersText: (question.alternativeAnswers || []).join(', '),
      points: question.points || 10,
      category: question.category || 'Pengukuran Fisika',
      unitHint: question.unitHint || '',
      explanation: question.explanation || '',
      options: resolvedOptions,
      correctOptionId: question.correctOptionId || 'A',
      statementText,
      statementIsTrue,
      correctionKey,
      correctionAlternativesText,
      statementScoringMode,
      multiPartIntro,
      multiPartItems: resolvedMultiParts,
      multiPartScoringMode,
      timeLimitSeconds: question.timeLimitSeconds !== undefined ? String(question.timeLimitSeconds) : '',
    });
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (questionForm.points <= 0) {
      setQuestionError('Poin harus lebih besar dari 0.');
      return;
    }

    let finalQuestionText = '';
    let finalCorrectAnswer = '';
    let finalAltAnswers: string[] = [];
    let extraData: Partial<Question> = {
      type: questionForm.type,
    };

    if (questionForm.type === 'short_answer') {
      if (!questionForm.questionText.trim()) {
        setQuestionError('Pertanyaan harus diisi.');
        return;
      }
      if (!questionForm.correctAnswer.trim()) {
        setQuestionError('Kunci jawaban harus diisi.');
        return;
      }
      finalQuestionText = questionForm.questionText.trim();
      finalCorrectAnswer = questionForm.correctAnswer.trim();
      finalAltAnswers = questionForm.alternativeAnswersText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      extraData.unitHint = questionForm.unitHint.trim();
    } else if (questionForm.type === 'multiple_choice') {
      if (!questionForm.questionText.trim()) {
        setQuestionError('Teks pertanyaan pilihan ganda harus diisi.');
        return;
      }
      const validOptions = questionForm.options.filter((o) => o.text.trim().length > 0);
      if (validOptions.length < 2) {
        setQuestionError('Minimal harus ada 2 pilihan jawaban.');
        return;
      }
      const selectedOpt = validOptions.find((o) => o.id === questionForm.correctOptionId) || validOptions[0];
      finalQuestionText = questionForm.questionText.trim();
      finalCorrectAnswer = selectedOpt.id;
      finalAltAnswers = [selectedOpt.id, selectedOpt.text.trim()];
      extraData.options = validOptions;
      extraData.correctOptionId = selectedOpt.id;
    } else if (questionForm.type === 'statement_correction') {
      if (!questionForm.statementText.trim()) {
        setQuestionError('Teks pernyataan harus diisi.');
        return;
      }
      if (!questionForm.statementIsTrue && !questionForm.correctionKey.trim()) {
        setQuestionError('Kunci pernyataan yang benar wajib diisi karena pernyataan bernilai SALAH.');
        return;
      }
      finalQuestionText = questionForm.statementText.trim();
      finalCorrectAnswer = questionForm.statementIsTrue
        ? 'BENAR'
        : `SALAH (Koreksi: ${questionForm.correctionKey.trim()})`;
      const corrAlts = questionForm.correctionAlternativesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      finalAltAnswers = questionForm.statementIsTrue
        ? ['benar', 'true']
        : [questionForm.correctionKey.trim(), ...corrAlts];
      extraData.statementConfig = {
        statement: questionForm.statementText.trim(),
        isTrue: questionForm.statementIsTrue,
        correctionKey: questionForm.statementIsTrue ? undefined : questionForm.correctionKey.trim(),
        correctionAlternatives: questionForm.statementIsTrue ? undefined : corrAlts,
        scoringMode: questionForm.statementScoringMode,
      };
    } else if (questionForm.type === 'multi_part') {
      const validParts = questionForm.multiPartItems.filter(
        (p) => p.question.trim().length > 0 && p.correctAnswer.trim().length > 0
      );
      if (validParts.length < 2) {
        setQuestionError('Minimal harus ada 2 sub-pertanyaan yang diisi dengan lengkap.');
        return;
      }
      finalQuestionText = questionForm.multiPartIntro.trim() || validParts[0].question.trim();
      finalCorrectAnswer = validParts.map((p, idx) => `P${idx + 1}: ${p.correctAnswer.trim()}`).join(' | ');
      finalAltAnswers = [];
      extraData.multiPartConfig = {
        introduction: questionForm.multiPartIntro.trim(),
        scoringMode: questionForm.multiPartScoringMode,
        parts: validParts.map((p) => ({
          id: p.id,
          question: p.question.trim(),
          correctAnswer: p.correctAnswer.trim(),
          alternativeAnswers: p.alternativeAnswersText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        })),
      };
    }

    // Process per-question time limit
    const parsedTimeLimit = Number(questionForm.timeLimitSeconds);
    if (!isNaN(parsedTimeLimit) && parsedTimeLimit > 0) {
      extraData.timeLimitSeconds = parsedTimeLimit;
    } else {
      extraData.timeLimitSeconds = undefined;
    }

    setIsSavingQuestion(true);
    try {
      const isEdit = Boolean(editingQuestionId);
      let questionObj: Question;

      if (editingQuestionId) {
        const existing = questions.find((q) => q.id === editingQuestionId);
        questionObj = {
          ...(existing || {}),
          id: editingQuestionId,
          code: questionForm.code.trim() || existing?.code || `Q-${editingQuestionId}`,
          questionText: finalQuestionText,
          correctAnswer: finalCorrectAnswer,
          alternativeAnswers: finalAltAnswers,
          points: Number(questionForm.points),
          category: questionForm.category.trim(),
          explanation: questionForm.explanation.trim(),
          ...extraData,
        };
      } else {
        questionObj = {
          id: `q-${Date.now()}`,
          code: questionForm.code.trim() || `Q-${String(questions.length + 1).padStart(2, '0')}`,
          questionText: finalQuestionText,
          correctAnswer: finalCorrectAnswer,
          alternativeAnswers: finalAltAnswers,
          points: Number(questionForm.points),
          category: questionForm.category.trim(),
          explanation: questionForm.explanation.trim(),
          ...extraData,
        };
      }

      if (onSaveQuestionDirect) {
        const res = await onSaveQuestionDirect(questionObj, isEdit);
        if (!res.success) {
          setQuestionError(res.error || 'Gagal menyimpan soal ke Supabase.');
          setIsSavingQuestion(false);
          return;
        }
      } else {
        if (isEdit) {
          const updated = questions.map((q) => (q.id === editingQuestionId ? questionObj : q));
          onUpdateQuestions(updated);
        } else {
          onUpdateQuestions([...questions, questionObj]);
        }
      }

      showToast(isEdit ? 'Soal berhasil diperbarui di Supabase! 💾' : 'Soal baru berhasil tersimpan permanen di Supabase! 💾');
      setIsQuestionModalOpen(false);
      setEditingQuestionId(null);
      sound.playClick();
    } catch (err: any) {
      setQuestionError(err.message || 'Terjadi kesalahan saat menyimpan soal.');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (isOrderLocked) {
      showToast('Urutan kartu sudah dikunci. Buka kunci urutan terlebih dahulu jika ingin menghapus soal.', 'error');
      return;
    }
    if (questions.length <= 1) {
      showToast('Minimal harus ada 1 soal dalam bank soal.', 'error');
      return;
    }
    const qToDelete = questions.find((q) => q.id === id);
    if (confirm(`Hapus soal "${qToDelete?.code || id}"?`)) {
      if (onDeleteQuestionDirect) {
        const res = await onDeleteQuestionDirect(id);
        if (!res.success) {
          showToast(res.error || 'Gagal menghapus soal dari Supabase.', 'error');
          return;
        }
      } else {
        const updated = questions.filter((q) => q.id !== id);
        onUpdateQuestions(updated);
      }
      sound.playClick();
      showToast('Soal berhasil dihapus.');
    }
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (isOrderLocked) {
      showToast('Urutan kartu sudah dikunci. Urutan soal tidak dapat diubah.', 'error');
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const newQuestions = [...questions];
    const [moved] = newQuestions.splice(index, 1);
    newQuestions.splice(targetIndex, 0, moved);
    onUpdateQuestions(newQuestions);
    sound.playClick();
    showToast(`Urutan soal berhasil dipindahkan ke posisi #${targetIndex + 1}. 💾`);
  };

  // -------------------------------------------------------------
  // ORDER LOCK & FINALIZATION ACTIONS
  // -------------------------------------------------------------
  const validateOrderBeforeLock = (): { valid: boolean; error?: string } => {
    if (!questions || questions.length === 0) {
      return { valid: false, error: 'Tidak ada soal dalam bank soal untuk difinalisasi.' };
    }
    const idSet = new Set<string>();
    for (const q of questions) {
      if (!q.id) return { valid: false, error: 'Terdapat soal dengan ID tidak valid/kosong.' };
      if (idSet.has(q.id)) return { valid: false, error: `Terdapat ID soal duplikat: ${q.id}` };
      idSet.add(q.id);
      if (!q.questionText || !q.questionText.trim()) {
        return { valid: false, error: `Soal #${q.code || 'Tanpa Kode'} belum memiliki teks pertanyaan.` };
      }
    }
    return { valid: true };
  };

  const handleConfirmFinalizeLock = async () => {
    const validation = validateOrderBeforeLock();
    if (!validation.valid) {
      showToast(validation.error || 'Validasi urutan soal gagal.', 'error');
      return;
    }

    setIsLockingOrder(true);
    try {
      if (onToggleOrderLock) {
        const res = await onToggleOrderLock(true);
        if (res && typeof res === 'object' && 'success' in res && !res.success) {
          showToast(res.error || 'Gagal menyimpan status kunci urutan ke database.', 'error');
          return;
        }
      }
      setShowFinalizeModal(false);
      sound.playClick();
      showToast('🔒 Urutan soal resmi berhasil difinalisasi & dikunci! Kartu siap dicetak.');
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan saat memfinalisasi urutan.', 'error');
    } finally {
      setIsLockingOrder(false);
    }
  };

  const handleConfirmUnlock = async () => {
    setIsLockingOrder(true);
    try {
      if (onToggleOrderLock) {
        const res = await onToggleOrderLock(false);
        if (res && typeof res === 'object' && 'success' in res && !res.success) {
          showToast(res.error || 'Gagal membuka kunci urutan di database.', 'error');
          return;
        }
      }
      setShowUnlockModal(false);
      sound.playClick();
      showToast('🔓 Kunci urutan soal telah dibuka. Anda dapat mengatur ulang urutan soal.');
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan saat membuka kunci.', 'error');
    } finally {
      setIsLockingOrder(false);
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

          {/* Overview Item */}
          <button
            id="sidebar-item-dashboard"
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('dashboard');
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>Dashboard Ringkasan</span>
            </div>
          </button>

          {/* PILAR 1: SOAL */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-black text-cyan-400 uppercase tracking-widest border-t border-white/5 flex items-center gap-1.5 mt-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>1. PILAR SOAL</span>
          </div>

          {[
            { id: 'questions', label: 'Bank Soal Master', icon: HelpCircle, badge: questions.length },
            { id: 'decks', label: 'Urutan Kartu & Deck', icon: Layers },
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
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
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

          {/* PILAR 2: MATCH */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-black text-amber-400 uppercase tracking-widest border-t border-white/5 flex items-center gap-1.5 mt-1">
            <Activity className="w-3.5 h-3.5" />
            <span>2. PILAR MATCH</span>
          </div>

          {[
            { id: 'live', label: 'Monitoring Live & Buzzer', icon: Activity },
            { id: 'teams', label: 'Kelompok Peserta', icon: Users, badge: teams.length },
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
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* PILAR 3: SETTING */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest border-t border-white/5 flex items-center gap-1.5 mt-1">
            <Settings className="w-3.5 h-3.5" />
            <span>3. PILAR SETTING</span>
          </div>

          {[
            { id: 'settings', label: 'Pengaturan Pertandingan', icon: Settings },
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
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-indigo-300 border border-indigo-400/40 shadow-[0_0_15px_rgba(79,70,229,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
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
              id="btn-sidebar-gate"
              type="button"
              onClick={() => {
                sound.playClick();
                if (onOpenGate) onOpenGate();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Gerbang Peserta</span>
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

          {/* Bottom Sidebar Status & Logout */}
          <div className="mt-4 pt-3 border-t border-white/10 px-2 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <div>
                <p className="font-bold text-white">AKUN GURU / ADMIN</p>
                <p className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Sesi Terverifikasi
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

            {onLogoutAdmin && (
              <button
                id="btn-sidebar-logout-admin"
                type="button"
                onClick={() => {
                  sound.playClick();
                  onLogoutAdmin();
                }}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar dari Akun Guru</span>
              </button>
            )}
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

                  {/* Durasi Keseluruhan Game */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Durasi Keseluruhan Game
                      </label>
                      <span className="text-[10px] text-cyan-400 font-bold">Total Waktu Babak</span>
                    </div>
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
                    <p className="text-[11px] text-slate-400">Total waktu hitung mundur untuk keseluruhan ronde pertandingan</p>
                  </div>

                  {/* Batas Waktu Menjawab Per Soal */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Batas Waktu Per Soal (Detik)
                      </label>
                      <span className="text-[10px] text-amber-400 font-bold">Khusus Tiap Soal</span>
                    </div>
                    <div className="relative">
                      <select
                        id="select-question-time-limit"
                        value={matchForm.questionTimeLimitSeconds ?? 30}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            questionTimeLimitSeconds: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-950/70 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none transition-all cursor-pointer appearance-none"
                      >
                        <option value={10} className="bg-slate-900 text-white">10 Detik (Sangat Cepat)</option>
                        <option value={15} className="bg-slate-900 text-white">15 Detik (Cepat)</option>
                        <option value={20} className="bg-slate-900 text-white">20 Detik</option>
                        <option value={30} className="bg-slate-900 text-white">30 Detik (Standar Rekomendasi)</option>
                        <option value={45} className="bg-slate-900 text-white">45 Detik</option>
                        <option value={60} className="bg-slate-900 text-white">60 Detik (1 Menit)</option>
                        <option value={90} className="bg-slate-900 text-white">90 Detik (1.5 Menit)</option>
                        <option value={120} className="bg-slate-900 text-white">120 Detik (2 Menit)</option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-bold">
                        ▼
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Durasi batas waktu regu menjawab setelah kartu soal dibuka</p>
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
                    <p className="text-[11px] text-slate-400">Poin default jika soal tidak diatur poin khusus</p>
                  </div>

                  {/* Pilihan Topik / Playlist Soal */}
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Playlist Topik Soal (Topic Selector)</span>
                      </label>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">
                        {matchForm.selectedTopic ? `Topik Aktif: "${matchForm.selectedTopic}"` : 'Semua Topik (Snapshot Master)'}
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        id="select-match-topic-dashboard"
                        value={matchForm.selectedTopic || ''}
                        disabled={isOrderLocked}
                        onChange={(e) => handleTopicChange(e.target.value)}
                        className={`w-full bg-slate-950/70 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none transition-all cursor-pointer appearance-none ${
                          isOrderLocked ? 'opacity-60 cursor-not-allowed bg-slate-900/50' : ''
                        }`}
                      >
                        <option value="" className="bg-slate-900 text-white">
                          Semua Topik ({masterPool.length} Soal Master)
                        </option>
                        {availableTopics.map((topic) => {
                          const count = masterPool.filter((q) => q.category === topic).length;
                          return (
                            <option key={topic} value={topic} className="bg-slate-900 text-white">
                              Topik: {topic} ({count} Soal)
                            </option>
                          );
                        })}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-bold">
                        ▼
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {isOrderLocked
                          ? '🔒 Urutan terkunci: Topik playlist tidak dapat diubah selama pertandingan aktif.'
                          : 'Pilih topik tertentu untuk memfilter snapshot soal pertandingan dan menata ulang urutan kartu secara otomatis.'}
                      </span>
                      <span className="text-cyan-400 font-mono font-bold text-[10px] ml-2 shrink-0">
                        {questions.length} Soal di Match
                      </span>
                    </div>
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

              {/* CARD: CUSTOM PLAYLIST & SNAPSHOT IN DASHBOARD */}
              <PlaylistManager
                masterQuestions={masterPool}
                currentSettings={matchForm}
                isOrderLocked={isOrderLocked}
                onApplyPlaylist={(mode, opts) => {
                  if (onApplyPlaylist) {
                    onApplyPlaylist(mode, opts);
                  } else {
                    handleTopicChange(opts.selectedTopic || '');
                  }
                }}
                onShowToast={showToast}
              />

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
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                          BANK SOAL
                        </h3>
                        {isOrderLocked ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400" />
                            URUTAN TERKUNCI
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Urutan Terbuka
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Jumlah Soal: <span className="text-cyan-400 font-bold">{questions.length}</span> soal aktif • Urutan Single Source of Truth
                      </p>
                    </div>
                  </div>

                  {/* Question Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {isOrderLocked ? (
                      <button
                        type="button"
                        onClick={() => setShowUnlockModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Buka Kunci Urutan untuk Mengubah Urutan"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        BUKA KUNCI URUTAN
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowFinalizeModal(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                        title="Finalisasi dan Kunci Urutan Soal Sebelum Cetak Kartu"
                      >
                        <Lock className="w-4 h-4" />
                        FINALISASI & KUNCI
                      </button>
                    )}

                    <button
                      id="btn-open-add-question-modal"
                      type="button"
                      disabled={isOrderLocked}
                      onClick={openNewQuestionModal}
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title={isOrderLocked ? 'Urutan terkunci. Tidak dapat menambah soal baru.' : '+ Tambah Soal'}
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
                          <th className="p-3 w-32">Jenis</th>
                          <th className="p-3">Pertanyaan</th>
                          <th className="p-3">Kunci Jawaban (Admin)</th>
                          <th className="p-3 w-16 text-center">Poin</th>
                          <th className="p-3 w-28 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {questions.slice(0, 6).map((q, idx) => {
                          const qType = q.type || 'short_answer';
                          const typeLabel =
                            qType === 'multiple_choice'
                              ? 'Pilihan Ganda'
                              : qType === 'statement_correction'
                              ? 'B/S + Koreksi'
                              : qType === 'multi_part'
                              ? 'Multi Part'
                              : 'Jawaban Singkat';
                          const typeColor =
                            qType === 'multiple_choice'
                              ? 'bg-purple-500/15 border-purple-400/30 text-purple-300'
                              : qType === 'statement_correction'
                              ? 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                              : qType === 'multi_part'
                              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                              : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300';

                          return (
                            <tr key={q.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-3 text-center font-bold text-cyan-400">
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeColor}`}
                                >
                                  {typeLabel}
                                </span>
                              </td>
                              <td className="p-3 text-slate-200">
                                <p className="line-clamp-1 font-semibold">{q.questionText}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {q.category && (
                                    <span className="text-[10px] text-slate-500 font-normal">{q.category}</span>
                                  )}
                                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                    q.timeLimitSeconds
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'text-slate-500'
                                  }`}>
                                    ⏱️ {q.timeLimitSeconds ? `${q.timeLimitSeconds}s (Khusus)` : `${settings.questionTimeLimitSeconds ?? 30}s (Default)`}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 font-mono font-bold text-[11px] line-clamp-1">
                                  {q.correctAnswer}
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold text-cyan-400">{q.points || 10}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewQuestion(q)}
                                    className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white cursor-pointer"
                                    title="Preview Soal"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditQuestionModal(q)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                                    title="Edit Soal"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isOrderLocked}
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title={isOrderLocked ? 'Urutan terkunci. Tidak dapat menghapus soal.' : 'Hapus Soal'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
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
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300 uppercase">Durasi Keseluruhan Game (Menit)</label>
                    <span className="text-[10px] text-cyan-400 font-bold">Total Waktu Babak</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={matchForm.durationMinutes}
                    onChange={(e) => setMatchForm({ ...matchForm, durationMinutes: Number(e.target.value) || 10 })}
                    className="w-full bg-slate-950/70 border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                  <p className="text-[11px] text-slate-400">Total hitung mundur seluruh permainan dalam 1 ronde</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300 uppercase">Batas Waktu Per Soal (Detik)</label>
                    <span className="text-[10px] text-amber-400 font-bold">Khusus Tiap Soal</span>
                  </div>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={matchForm.questionTimeLimitSeconds ?? 30}
                    onChange={(e) => setMatchForm({ ...matchForm, questionTimeLimitSeconds: Number(e.target.value) || 30 })}
                    className="w-full bg-slate-950/70 border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                  <p className="text-[11px] text-slate-400">Waktu menjawab setiap kali regu membuka kartu soal</p>
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
                  <p className="text-[11px] text-slate-400">Poin default jika soal tidak memiliki poin khusus</p>
                </div>

                {/* Pilihan Topik / Playlist Soal */}
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Playlist Topik Soal Pertandingan</span>
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold">
                      {matchForm.selectedTopic ? `Topik: "${matchForm.selectedTopic}"` : 'Semua Topik (Master Bank)'}
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      id="select-match-topic-settings"
                      value={matchForm.selectedTopic || ''}
                      disabled={isOrderLocked}
                      onChange={(e) => handleTopicChange(e.target.value)}
                      className={`w-full bg-slate-950/70 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none transition-all cursor-pointer appearance-none ${
                        isOrderLocked ? 'opacity-60 cursor-not-allowed bg-slate-900/50' : ''
                      }`}
                    >
                      <option value="" className="bg-slate-900 text-white">
                        Semua Topik ({masterPool.length} Soal Master)
                      </option>
                      {availableTopics.map((topic) => {
                        const count = masterPool.filter((q) => q.category === topic).length;
                        return (
                          <option key={topic} value={topic} className="bg-slate-900 text-white">
                            Topik: {topic} ({count} Soal)
                          </option>
                        );
                      })}
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-bold">
                      ▼
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {isOrderLocked
                        ? '🔒 Urutan kartu terkunci. Buka kunci untuk mengganti topik.'
                        : 'Memilih topik akan membuat snapshot soal pertandingan dan otomatis mengurutkan kartu berdasarkan nomor soal terkecil.'}
                    </span>
                    <span className="text-cyan-400 font-mono font-bold text-[10px] ml-2 shrink-0">
                      {questions.length} Soal Aktif
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-white/10 cursor-pointer">
                  <div>
                    <p className="text-sm font-bold text-white">Aktifkan Batas Waktu Menjawab Per Soal</p>
                    <p className="text-xs text-slate-400">
                      Jika aktif, peserta memiliki hitung mundur khusus untuk menjawab setiap soal
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={matchForm.enableQuestionTimer ?? true}
                    onChange={(e) => setMatchForm({ ...matchForm, enableQuestionTimer: e.target.checked })}
                    className="w-5 h-5 rounded text-cyan-500 cursor-pointer"
                  />
                </label>

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

            {/* CUSTOM PLAYLIST MANAGEMENT CARD IN SETTINGS */}
            <PlaylistManager
              masterQuestions={masterPool}
              currentSettings={matchForm}
              isOrderLocked={isOrderLocked}
              onApplyPlaylist={(mode, opts) => {
                if (onApplyPlaylist) {
                  onApplyPlaylist(mode, opts);
                } else {
                  handleTopicChange(opts.selectedTopic || '');
                }
              }}
              onShowToast={showToast}
            />

            {/* ACCOUNT & SECURITY (GANTI PASSWORD ADMIN) */}
            <AccountSecuritySection
              onSuccessToast={(msg) => showToast(msg, 'success')}
              onErrorToast={(msg) => showToast(msg, 'error')}
            />
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
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                      BANK SOAL ({questions.length})
                    </h2>
                    {isOrderLocked ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        URUTAN KARTU TERKUNCI (RESMI)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Urutan Dapat Diubah
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Supabase Synced
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isOrderLocked
                      ? 'Urutan soal telah difinalisasi dan terkunci untuk pertandingan. Kartu fisik siap dicetak.'
                      : 'Daftar lengkap soal dan kunci jawaban. Anda dapat mengatur urutan sebelum mencetak kartu.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {isOrderLocked ? (
                    <button
                      type="button"
                      onClick={() => setShowUnlockModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:text-amber-200 font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Buka Kunci Urutan untuk Mengatur Ulang"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kunci Urutan</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowFinalizeModal(true)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                      title="Finalisasi dan Kunci Urutan Soal Sebelum Cetak Kartu"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Finalisasi & Kunci Urutan</span>
                    </button>
                  )}

                  {onRefreshFromCloud && (
                    <button
                      type="button"
                      disabled={isRefreshingCloud}
                      onClick={async () => {
                        setIsRefreshingCloud(true);
                        try {
                          await onRefreshFromCloud();
                          showToast('Bank Soal berhasil disinkronkan dari Supabase! 🔄');
                        } catch (err) {
                          showToast('Gagal memuat dari cloud', 'error');
                        } finally {
                          setIsRefreshingCloud(false);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCloud ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>{isRefreshingCloud ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
                    </button>
                  )}

                  <div className="relative">
                    <select
                      id="select-match-topic-questions-tab"
                      value={matchForm.selectedTopic || ''}
                      disabled={isOrderLocked}
                      onChange={(e) => handleTopicChange(e.target.value)}
                      className={`bg-slate-950/70 border border-white/15 rounded-xl pl-3 pr-7 py-1.5 text-xs text-white outline-none cursor-pointer appearance-none ${
                        isOrderLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-400 focus:border-cyan-400'
                      }`}
                      title={isOrderLocked ? 'Urutan terkunci. Topik tidak dapat diubah.' : 'Pilih Topik Soal'}
                    >
                      <option value="" className="bg-slate-900 text-white">
                        Semua Topik ({masterPool.length} Soal Master)
                      </option>
                      {availableTopics.map((topic) => {
                        const count = masterPool.filter((q) => q.category === topic).length;
                        return (
                          <option key={topic} value={topic} className="bg-slate-900 text-white">
                            Topik: {topic} ({count} Soal)
                          </option>
                        );
                      })}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] font-bold">
                      ▼
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      placeholder="Cari soal atau kunci..."
                      className="bg-slate-950/70 border border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none w-44"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isOrderLocked}
                    onClick={openNewQuestionModal}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-cyan-500/20"
                    title={isOrderLocked ? 'Urutan terkunci. Tidak dapat menambah soal baru.' : '+ Tambah Soal'}
                  >
                    <Plus className="w-4 h-4" />
                    + Tambah Soal
                  </button>
                </div>
              </div>

              {/* Full Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3 w-14 text-center">No</th>
                      <th className="p-3 w-32">Jenis Soal</th>
                      <th className="p-3">Pertanyaan & Pengantar</th>
                      <th className="p-3">Kunci Jawaban</th>
                      <th className="p-3">Alternatif / Detail</th>
                      <th className="p-3 w-16 text-center">Poin</th>
                      <th className="p-3 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {filteredQuestions.map((q, idx) => {
                      const qType = q.type || 'short_answer';
                      const typeLabel =
                        qType === 'multiple_choice'
                          ? 'Pilihan Ganda'
                          : qType === 'statement_correction'
                          ? 'B/S + Koreksi'
                          : qType === 'multi_part'
                          ? 'Multi Part'
                          : 'Jawaban Singkat';
                      const typeColor =
                        qType === 'multiple_choice'
                          ? 'bg-purple-500/15 border-purple-400/30 text-purple-300'
                          : qType === 'statement_correction'
                          ? 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                          : qType === 'multi_part'
                          ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                          : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300';

                      return (
                        <tr key={q.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  disabled={isOrderLocked || idx === 0}
                                  onClick={() => {
                                    const originalIdx = questions.findIndex((item) => item.id === q.id);
                                    if (originalIdx > 0) handleMoveQuestion(originalIdx, 'up');
                                  }}
                                  className="p-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                  title={isOrderLocked ? 'Urutan terkunci setelah finalisasi.' : 'Geser Soal ke Atas (Ubah Urutan)'}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isOrderLocked || idx === filteredQuestions.length - 1}
                                  onClick={() => {
                                    const originalIdx = questions.findIndex((item) => item.id === q.id);
                                    if (originalIdx >= 0 && originalIdx < questions.length - 1) handleMoveQuestion(originalIdx, 'down');
                                  }}
                                  className="p-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                  title={isOrderLocked ? 'Urutan terkunci setelah finalisasi.' : 'Geser Soal ke Bawah (Ubah Urutan)'}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="font-bold text-cyan-400 font-mono text-sm ml-1">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeColor}`}
                            >
                              {typeLabel}
                            </span>
                          </td>
                          <td className="p-3 text-slate-200">
                            <p className="font-semibold">{q.questionText}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {q.category && (
                                <span className="text-[10px] text-slate-500">{q.category}</span>
                              )}
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                q.timeLimitSeconds
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'text-slate-500'
                              }`}>
                                ⏱️ {q.timeLimitSeconds ? `${q.timeLimitSeconds}s (Khusus)` : `${settings.questionTimeLimitSeconds ?? 30}s (Default)`}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 font-mono font-bold text-[11px]">
                              {q.correctAnswer}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {qType === 'multiple_choice' && q.options && q.options.length > 0
                              ? `${q.options.length} Opsi (${q.options.map((o) => o.id).join(', ')})`
                              : qType === 'statement_correction'
                              ? q.statementConfig?.isTrue
                                ? 'Status: BENAR'
                                : `Koreksi: ${q.statementConfig?.correctionKey || '-'}`
                              : qType === 'multi_part'
                              ? `${q.multiPartConfig?.parts?.length || 0} Sub-Soal (${q.multiPartConfig?.scoringMode === 'partial' ? 'Poin Parsial' : 'Poin Penuh'})`
                              : (q.alternativeAnswers || []).join(', ') || '-'}
                          </td>
                          <td className="p-3 text-center font-bold text-cyan-400">{q.points || 10}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewQuestion(q)}
                                className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white cursor-pointer"
                                title="Preview Soal"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditQuestionModal(q)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                                title="Edit Soal"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isOrderLocked}
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                title={isOrderLocked ? 'Urutan terkunci. Tidak dapat menghapus soal.' : 'Hapus Soal'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold tracking-wider uppercase backdrop-blur-md mb-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    MANAJEMEN KARTU SOAL & URUTAN ACAK
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                    MAPPING KARTU SOAL PER KELOMPOK
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Setiap kelompok mendapatkan seluruh soal di Bank Soal ({questions.length} soal) dalam urutan acak yang unik.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Generate Ulang Button */}
                  <button
                    id="btn-trigger-regenerate-decks"
                    type="button"
                    onClick={() => {
                      if (isMatchStarted) {
                        showToast('Urutan soal tidak dapat diubah setelah pertandingan dimulai.', 'error');
                        sound.playWrong();
                        return;
                      }
                      if (isOrderLocked) {
                        showToast('Urutan kartu sudah dikunci resmi. Buka kunci urutan terlebih dahulu jika ingin mengacak ulang.', 'error');
                        sound.playWrong();
                        return;
                      }
                      sound.playClick();
                      setShowRegenerateConfirm(true);
                    }}
                    disabled={isMatchStarted || isOrderLocked}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center gap-2 transition-all ${
                      isMatchStarted || isOrderLocked
                        ? 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 cursor-pointer active:scale-95'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    {isMatchStarted ? 'Pertandingan Berlangsung' : isOrderLocked ? 'Urutan Terkunci' : 'Generate Ulang Urutan'}
                  </button>

                  {/* Cetak Button */}
                  <button
                    id="btn-open-printable-cards"
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      if (onOpenPrint) onOpenPrint();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Lembar Soal A4 ({teams.length} Lembar)
                  </button>
                </div>
              </div>

              {/* STATISTIK RINGKASAN */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Bank Soal</span>
                  <span className="text-2xl font-black text-cyan-400">{deckValidation.questionsCount} Soal</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Sumber master soal</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Jumlah Kelompok</span>
                  <span className="text-2xl font-black text-emerald-400">{deckValidation.teamsCount} Kelompok</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Semua dapat soal lengkap</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Total Kartu Fisik</span>
                  <span className="text-2xl font-black text-amber-400">
                    {deckValidation.totalCards} Kartu
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {deckValidation.questionsCount} soal × {deckValidation.teamsCount} kelompok
                  </span>
                </div>

                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    deckValidation.isValid
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-400/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {deckValidation.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <span className="text-xs font-black uppercase tracking-wider">
                      {deckValidation.isValid ? 'Status Valid' : 'Perlu Validasi'}
                    </span>
                  </div>
                  <span className="text-[11px] opacity-85 mt-1">
                    {deckValidation.isValid
                      ? 'Semua kelompok memiliki seluruh soal unik.'
                      : `${deckValidation.errors.length} masalah ditemukan.`}
                  </span>
                </div>
              </div>

              {/* Match Started Notice */}
              {isMatchStarted && (
                <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-amber-300">
                      Pertandingan Sedang Berjalan / Memiliki Progres
                    </span>
                    <span className="opacity-90">
                      Urutan kartu soal tidak dapat diubah setelah pertandingan dimulai demi integritas data dan penilaian.
                    </span>
                  </div>
                </div>
              )}

              {/* Validation Errors Notice */}
              {!deckValidation.isValid && (
                <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Masalah Ditemukan Pada Mapping Kartu:</span>
                    </div>
                    {!isMatchStarted && (
                      <button
                        type="button"
                        onClick={() => {
                          onRegenerateDecks(questions.length, true);
                          showToast('Mapping kartu soal berhasil diperbaiki!');
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Perbaiki & Generate Otomatis
                      </button>
                    )}
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1 opacity-90">
                    {deckValidation.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* PREVIEW URUTAN SOAL PER KELOMPOK */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      Preview Mapping Kartu Soal
                    </h3>
                    <p className="text-xs text-slate-400">
                      Lihat relasi Nomor Kartu Siswa ke Soal Asli di Bank Soal
                    </p>
                  </div>

                  {/* Team Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPreviewTeamId('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        previewTeamId === 'all'
                          ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua Kelompok
                    </button>
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPreviewTeamId(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          previewTeamId === t.id
                            ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Per Team */}
                <div className="space-y-5">
                  {(previewTeamId === 'all' ? teams : teams.filter((t) => t.id === previewTeamId)).map((team) => {
                    const deck = gameState.teamCardDecks[team.id] || [];

                    return (
                      <div
                        key={team.id}
                        className="bg-slate-950/50 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-3.5 h-3.5 rounded-full shadow-[0_0_10px_currentColor]"
                              style={{ backgroundColor: COLOR_MAP[team.color]?.glow || '#06b6d4' }}
                            />
                            <h4 className="text-base font-black text-white uppercase tracking-wider">
                              KELOMPOK {team.name}
                            </h4>
                            <span className="text-xs font-mono font-bold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-md">
                              {deck.length} Kartu Soal
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Skor: <strong className="text-cyan-300">{team.score || 0}</strong> • Benar:{' '}
                            <strong className="text-emerald-400">{team.correctCount || 0}</strong>
                          </span>
                        </div>

                        {deck.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-2">
                            Belum ada deck kartu soal untuk kelompok ini.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                                  <th className="py-2.5 px-3 font-bold w-20 text-center">No Kartu</th>
                                  <th className="py-2.5 px-3 font-bold w-24 text-center">ID Bank Soal</th>
                                  <th className="py-2.5 px-3 font-bold">Pertanyaan</th>
                                  <th className="py-2.5 px-3 font-bold w-28">Jenis Soal</th>
                                  <th className="py-2.5 px-3 font-bold w-36">Kunci Jawaban</th>
                                  <th className="py-2.5 px-3 font-bold w-28 text-center">Status Live</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {deck.map((card) => {
                                  const question = questions.find((q) => q.id === card.questionId);
                                  const formattedNum = String(card.cardNumber).padStart(2, '0');
                                  const qType = question?.type || 'short_answer';

                                  return (
                                    <tr key={card.cardNumber} className="hover:bg-white/5 transition-colors">
                                      <td className="py-2.5 px-3 text-center">
                                        <span className="inline-block px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-black text-xs border border-cyan-400/30">
                                          #{formattedNum}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                                        {question?.code || card.questionId}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-200 font-medium max-w-sm">
                                        {question ? question.questionText : <span className="text-rose-400 italic">Soal tidak ditemukan</span>}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 text-slate-300 border border-white/10">
                                          {qType === 'short_answer'
                                            ? 'Isian'
                                            : qType === 'multiple_choice'
                                            ? 'PG'
                                            : qType === 'statement_correction'
                                            ? 'B/S Koreksi'
                                            : 'Multi-Part'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 font-bold text-emerald-400 font-mono text-[11px]">
                                        {question?.correctAnswer || '-'}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        {card.status === 'correct' ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                            <CheckCircle2 className="w-3 h-3" /> Benar
                                          </span>
                                        ) : card.status === 'wrong' ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                                            <XCircle className="w-3 h-3" /> Salah
                                          </span>
                                        ) : card.status === 'locked' ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                            🔒 Terkunci
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-slate-500 font-medium">
                                            Belum
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* 5. MODAL TAMBAH & EDIT SOAL (DYNAMIC MULTI-TYPE) */}
      {/* ========================================================= */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-400/30 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.2)] space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
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

            <form onSubmit={handleSaveQuestion} className="space-y-5">
              {/* Question Type Selector (4 Types) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  PILIH JENIS SOAL <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      type: 'short_answer' as QuestionType,
                      label: 'Jawaban Singkat',
                      desc: 'Isian teks / angka',
                      icon: <FileText className="w-4 h-4" />,
                      color: 'border-cyan-400 text-cyan-300 bg-cyan-500/20',
                    },
                    {
                      type: 'multiple_choice' as QuestionType,
                      label: 'Pilihan Ganda',
                      desc: 'Opsi A, B, C, D...',
                      icon: <CheckSquare className="w-4 h-4" />,
                      color: 'border-purple-400 text-purple-300 bg-purple-500/20',
                    },
                    {
                      type: 'statement_correction' as QuestionType,
                      label: 'B/S + Koreksi',
                      desc: 'Verifikasi & pembetulan',
                      icon: <CheckCircle className="w-4 h-4" />,
                      color: 'border-amber-400 text-amber-300 bg-amber-500/20',
                    },
                    {
                      type: 'multi_part' as QuestionType,
                      label: '2 Soal (Multi-Part)',
                      desc: 'Sub-pertanyaan 1 & 2',
                      icon: <ListOrdered className="w-4 h-4" />,
                      color: 'border-emerald-400 text-emerald-300 bg-emerald-500/20',
                    },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setQuestionForm({ ...questionForm, type: item.type })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        questionForm.type === item.type
                          ? `${item.color} shadow-lg shadow-black/40 ring-1 ring-white/20`
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="p-1.5 rounded-lg bg-white/5">{item.icon}</span>
                        {questionForm.type === item.type && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{item.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 opacity-80">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* DYNAMIC FORM FIELDS BASED ON QUESTION TYPE */}

              {/* 1. TIPE: JAWABAN SINGKAT */}
              {questionForm.type === 'short_answer' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-950/50 border border-cyan-400/20">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Pertanyaan <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={questionForm.questionText}
                      onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                      placeholder="Tuliskan teks pertanyaan isian singkat di sini..."
                      className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-xl p-3 text-sm font-semibold text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 uppercase">
                        Kunci Jawaban Utama <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={questionForm.correctAnswer}
                        onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                        placeholder="Contoh: 250 cm atau 120"
                        className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 uppercase">
                        Petunjuk Satuan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={questionForm.unitHint}
                        onChange={(e) => setQuestionForm({ ...questionForm, unitHint: e.target.value })}
                        placeholder="Contoh: cm, kg, m/s"
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Variasi Kunci Jawaban (Pisahkan Koma)
                    </label>
                    <input
                      type="text"
                      value={questionForm.alternativeAnswersText}
                      onChange={(e) => setQuestionForm({ ...questionForm, alternativeAnswersText: e.target.value })}
                      placeholder="Contoh: 250cm, 2.5 m, 2,5 meter"
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 2. TIPE: PILIHAN GANDA */}
              {questionForm.type === 'multiple_choice' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-950/50 border border-purple-400/20">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Pertanyaan Pilihan Ganda <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={questionForm.questionText}
                      onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                      placeholder="Tuliskan teks pertanyaan pilihan ganda di sini..."
                      className="w-full bg-slate-900 border border-white/15 focus:border-purple-400 rounded-xl p-3 text-sm font-semibold text-white outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300 uppercase">
                        Daftar Pilihan Jawaban & Kunci Benar <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[11px] text-purple-300">Pilih radio button pada opsi yang BENAR</span>
                    </div>

                    <div className="space-y-2.5">
                      {questionForm.options.map((opt, optIdx) => {
                        const isCorrect = questionForm.correctOptionId === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                              isCorrect
                                ? 'bg-purple-500/20 border-purple-400/60 ring-1 ring-purple-400/30'
                                : 'bg-slate-900 border-white/10'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setQuestionForm({ ...questionForm, correctOptionId: opt.id })}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer ${
                                isCorrect
                                  ? 'bg-purple-500 text-white font-black'
                                  : 'bg-white/5 text-slate-400 hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>

                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newOpts = [...questionForm.options];
                                newOpts[optIdx] = { ...opt, text: e.target.value };
                                setQuestionForm({ ...questionForm, options: newOpts });
                              }}
                              placeholder={`Pilihan teks untuk opsi ${opt.label}...`}
                              className="flex-1 bg-transparent border-0 text-sm text-white outline-none font-medium"
                            />

                            {questionForm.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = questionForm.options.filter((_, i) => i !== optIdx);
                                  const updatedCorrectId =
                                    questionForm.correctOptionId === opt.id
                                      ? newOpts[0]?.id || 'A'
                                      : questionForm.correctOptionId;
                                  setQuestionForm({
                                    ...questionForm,
                                    options: newOpts,
                                    correctOptionId: updatedCorrectId,
                                  });
                                }}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                title="Hapus Opsi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {questionForm.options.length < 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          const labels = ['A', 'B', 'C', 'D', 'E'];
                          const nextLabel = labels[questionForm.options.length] || `O${questionForm.options.length + 1}`;
                          setQuestionForm({
                            ...questionForm,
                            options: [...questionForm.options, { id: nextLabel, label: nextLabel, text: '' }],
                          });
                        }}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Opsi ({['A', 'B', 'C', 'D', 'E'][questionForm.options.length] || '+'})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 3. TIPE: PERNYATAAN BENAR/SALAH + KOREKSI */}
              {questionForm.type === 'statement_correction' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-950/50 border border-amber-400/20">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Teks Pernyataan <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={questionForm.statementText}
                      onChange={(e) => setQuestionForm({ ...questionForm, statementText: e.target.value })}
                      placeholder='Contoh: "1 kilogram setara dengan 100 gram." atau "Mikrometer sekrup memiliki ketelitian 0,01 mm."'
                      className="w-full bg-slate-900 border border-white/15 focus:border-amber-400 rounded-xl p-3 text-sm font-semibold text-white outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Kunci Status Kebenaran Pernyataan <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, statementIsTrue: true })}
                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs uppercase cursor-pointer transition-all ${
                          questionForm.statementIsTrue
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md ring-1 ring-emerald-400/40'
                            : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Pernyataan BENAR
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, statementIsTrue: false })}
                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs uppercase cursor-pointer transition-all ${
                          !questionForm.statementIsTrue
                            ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-md ring-1 ring-rose-400/40'
                            : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <XCircle className="w-4 h-4 text-rose-400" />
                        Pernyataan SALAH (Butuh Koreksi)
                      </button>
                    </div>
                  </div>

                  {/* Jika SALAH, tampilkan input koreksi */}
                  {!questionForm.statementIsTrue && (
                    <div className="space-y-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 animate-in fade-in">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-amber-300 uppercase">
                          Kunci Pembetulan / Koreksi Yang Benar <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={questionForm.correctionKey}
                          onChange={(e) => setQuestionForm({ ...questionForm, correctionKey: e.target.value })}
                          placeholder="Contoh: 1000 gram atau 1.000 gram"
                          className="w-full bg-slate-900 border border-amber-400/40 focus:border-amber-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-300 uppercase">
                          Variasi Jawaban Koreksi (Pisahkan Koma)
                        </label>
                        <input
                          type="text"
                          value={questionForm.correctionAlternativesText}
                          onChange={(e) =>
                            setQuestionForm({ ...questionForm, correctionAlternativesText: e.target.value })
                          }
                          placeholder="Contoh: 1000 g, 1000gr, seribu gram"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mode Penilaian B/S */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">Mode Penilaian</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, statementScoringMode: 'full' })}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                          questionForm.statementScoringMode === 'full'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                      >
                        <p className="text-xs font-bold">Penilaian Penuh</p>
                        <p className="text-[10px] text-slate-400">100% poin jika seluruhnya benar</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, statementScoringMode: 'partial' })}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                          questionForm.statementScoringMode === 'partial'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                      >
                        <p className="text-xs font-bold">Penilaian Parsial</p>
                        <p className="text-[10px] text-slate-400">50% cek B/S + 50% teks koreksi</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. TIPE: MULTI PART (2+ SUB-PERTANYAAN) */}
              {questionForm.type === 'multi_part' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-950/50 border border-emerald-400/20">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Teks Pengantar / Kasus (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={questionForm.multiPartIntro}
                      onChange={(e) => setQuestionForm({ ...questionForm, multiPartIntro: e.target.value })}
                      placeholder="Contoh: Sebuah balok padat bermassa 200 gram dan bervolume 50 cm³ dimasukkan ke bejana air..."
                      className="w-full bg-slate-900 border border-white/15 focus:border-emerald-400 rounded-xl p-3 text-sm text-white outline-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300 uppercase">
                        Daftar Sub-Pertanyaan ({questionForm.multiPartItems.length}) <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[11px] text-emerald-300">Setiap bagian memiliki kunci jawaban terpisah</span>
                    </div>

                    <div className="space-y-3">
                      {questionForm.multiPartItems.map((part, partIdx) => (
                        <div
                          key={part.id}
                          className="p-3.5 rounded-xl bg-slate-900 border border-emerald-400/30 space-y-2.5 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-400">
                              SUB-PERTANYAAN #{partIdx + 1}
                            </span>
                            {questionForm.multiPartItems.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = questionForm.multiPartItems.filter((_, i) => i !== partIdx);
                                  setQuestionForm({ ...questionForm, multiPartItems: updated });
                                }}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                title="Hapus Sub-Pertanyaan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">
                              Teks Pertanyaan
                            </label>
                            <input
                              type="text"
                              value={part.question}
                              onChange={(e) => {
                                const updated = [...questionForm.multiPartItems];
                                updated[partIdx] = { ...part, question: e.target.value };
                                setQuestionForm({ ...questionForm, multiPartItems: updated });
                              }}
                              placeholder={`Pertanyaan sub #${partIdx + 1}...`}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none font-semibold"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                Kunci Jawaban
                              </label>
                              <input
                                type="text"
                                value={part.correctAnswer}
                                onChange={(e) => {
                                  const updated = [...questionForm.multiPartItems];
                                  updated[partIdx] = { ...part, correctAnswer: e.target.value };
                                  setQuestionForm({ ...questionForm, multiPartItems: updated });
                                }}
                                placeholder="Kunci jawaban sub ini..."
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none font-bold"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                Variasi Kunci (Pisahkan Koma)
                              </label>
                              <input
                                type="text"
                                value={part.alternativeAnswersText}
                                onChange={(e) => {
                                  const updated = [...questionForm.multiPartItems];
                                  updated[partIdx] = { ...part, alternativeAnswersText: e.target.value };
                                  setQuestionForm({ ...questionForm, multiPartItems: updated });
                                }}
                                placeholder="Contoh: 4, 4 g/cm3"
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {questionForm.multiPartItems.length < 4 && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionForm({
                            ...questionForm,
                            multiPartItems: [
                              ...questionForm.multiPartItems,
                              {
                                id: `p-${questionForm.multiPartItems.length + 1}`,
                                question: '',
                                correctAnswer: '',
                                alternativeAnswersText: '',
                              },
                            ],
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        + Tambah Sub-Pertanyaan (#{questionForm.multiPartItems.length + 1})
                      </button>
                    )}
                  </div>

                  {/* Mode Penilaian Multi-Part */}
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase">Mode Pembagian Skor</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, multiPartScoringMode: 'partial' })}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                          questionForm.multiPartScoringMode === 'partial'
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                      >
                        <p className="text-xs font-bold">Skor Proporsional (Parsial)</p>
                        <p className="text-[10px] text-slate-400">Poin dibagi rata sesuai sub yang benar</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, multiPartScoringMode: 'full' })}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                          questionForm.multiPartScoringMode === 'full'
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                      >
                        <p className="text-xs font-bold">Semua Wajib Benar (Penuh)</p>
                        <p className="text-[10px] text-slate-400">Poin hanya jika semua sub benar</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* COMMON FIELDS: POIN, KATEGORI, BATAS WAKTU KHUSUS, PENJELASAN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Total Poin</label>
                  <input
                    type="number"
                    min={1}
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: Number(e.target.value) || 10 })}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-sm font-bold text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Kategori / Topik</label>
                  <input
                    type="text"
                    list="category-topic-options"
                    value={questionForm.category}
                    onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value })}
                    placeholder="Contoh: Pengukuran Panjang"
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                  />
                  <datalist id="category-topic-options">
                    {availableTopics.map((top) => (
                      <option key={top} value={top} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Batas Waktu (Detik)
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold">Opsional</span>
                  </div>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={questionForm.timeLimitSeconds}
                    onChange={(e) => setQuestionForm({ ...questionForm, timeLimitSeconds: e.target.value })}
                    placeholder={`Default (${settings.questionTimeLimitSeconds ?? 30}s)`}
                    className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3.5 py-2 text-sm font-bold text-amber-300 placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Pembahasan / Penjelasan Guru (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Tuliskan rumus atau pembahasan yang akan tampil di ulasan ronde..."
                  className="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-xs text-slate-200 outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  disabled={isSavingQuestion}
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuestion}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isSavingQuestion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>MENYIMPAN KE SUPABASE...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SIMPAN SOAL</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL INTERAKTIF: PREVIEW SOAL GURU */}
      {/* ========================================================= */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-400/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.2)] space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">
                    PREVIEW SOAL ({previewQuestion.code})
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {previewQuestion.type === 'multiple_choice'
                      ? 'Pilihan Ganda'
                      : previewQuestion.type === 'statement_correction'
                      ? 'Pernyataan Benar / Salah + Koreksi'
                      : previewQuestion.type === 'multi_part'
                      ? 'Soal 2 Pertanyaan (Multi Part)'
                      : 'Jawaban Singkat'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Kategori: {previewQuestion.category || 'Pengukuran Fisika'} • {previewQuestion.points || 10} Poin</span>
                  <span className="text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    ⏱️ Batas Waktu: {previewQuestion.timeLimitSeconds ? `${previewQuestion.timeLimitSeconds} Detik (Khusus)` : `${settings.questionTimeLimitSeconds ?? 30} Detik (Default Game)`}
                  </span>
                </div>
                <p className="text-base font-semibold text-white leading-relaxed">
                  {previewQuestion.questionText}
                </p>
              </div>

              {/* Multiple Choice Preview */}
              {previewQuestion.type === 'multiple_choice' && previewQuestion.options && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Pilihan Jawaban:</span>
                  <div className="space-y-2">
                    {previewQuestion.options.map((opt) => {
                      const isCorrect = previewQuestion.correctOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border flex items-center justify-between ${
                            isCorrect
                              ? 'bg-purple-500/20 border-purple-400/60 text-purple-200 font-bold'
                              : 'bg-slate-950/40 border-white/10 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center font-bold text-xs">
                              {opt.label}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {isCorrect && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500 text-white">
                              KUNCI
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Statement Correction Preview */}
              {previewQuestion.type === 'statement_correction' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase">Status Pernyataan:</span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                        previewQuestion.statementConfig?.isTrue
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {previewQuestion.statementConfig?.isTrue ? 'BENAR' : 'SALAH'}
                    </span>
                  </div>
                  {!previewQuestion.statementConfig?.isTrue && (
                    <div className="pt-2 border-t border-amber-400/20 text-xs">
                      <span className="text-slate-400">Kunci Koreksi: </span>
                      <strong className="text-amber-200 font-mono">
                        {previewQuestion.statementConfig?.correctionKey}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Multi-Part Preview */}
              {previewQuestion.type === 'multi_part' && previewQuestion.multiPartConfig && (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Sub-Pertanyaan ({previewQuestion.multiPartConfig.parts.length}):
                  </span>
                  <div className="space-y-2">
                    {previewQuestion.multiPartConfig.parts.map((part, idx) => (
                      <div key={part.id} className="p-3 rounded-xl bg-slate-950 border border-emerald-400/30 space-y-1">
                        <p className="text-xs font-bold text-white">
                          #{idx + 1}: {part.question}
                        </p>
                        <p className="text-xs text-emerald-300 font-mono">
                          Kunci: <strong>{part.correctAnswer}</strong>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Answer Preview */}
              {(!previewQuestion.type || previewQuestion.type === 'short_answer') && (
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Kunci Jawaban:</span>
                  <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-sm">
                    {previewQuestion.correctAnswer}
                  </span>
                </div>
              )}

              {/* Explanation */}
              {previewQuestion.explanation && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                  <span className="font-bold text-slate-400 block mb-0.5">Pembahasan:</span>
                  {previewQuestion.explanation}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase cursor-pointer"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL KONFIRMASI MUAT DATA DEMO */}
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
                • <strong className="text-cyan-300">10 Soal Lengkap</strong> (Jawaban Singkat, Pilihan Ganda, B/S Koreksi, Multi-Part)
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
      {/* 8. MODAL KONFIRMASI RESET MATCH */}
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

      {/* ========================================================= */}
      {/* 9. MODAL KONFIRMASI GENERATE ULANG URUTAN KARTU */}
      {/* ========================================================= */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-400/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin-reverse" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Generate Ulang Urutan Kartu Soal?</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Tindakan ini akan mengacak ulang urutan kartu untuk semua kelompok (
                <strong className="text-cyan-300">{teams.length} kelompok</strong> ×{' '}
                <strong className="text-cyan-300">{questions.length} soal</strong> ={' '}
                <strong className="text-amber-300">{teams.length * questions.length} kartu</strong>).
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-[11px] text-left">
                ⚠️ <strong>Perhatian:</strong> Pastikan Anda belum mencetak/membagikan kartu fisik lama kepada peserta, atau cetak kembali kartu baru setelah pengacakan ulang.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onRegenerateDecks(questions.length, true);
                  setShowRegenerateConfirm(false);
                  sound.playClick();
                  showToast(`Urutan kartu soal untuk ${teams.length} kelompok berhasil diacak ulang!`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Ya, Acak Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. MODAL KONFIRMASI FINALISASI & KUNCI URUTAN SOAL */}
      {/* ========================================================= */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Lock className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">
                Finalisasi & Kunci Urutan Kartu Soal?
              </h3>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Topik: {matchForm.selectedTopic ? `"${matchForm.selectedTopic}"` : 'Semua Topik'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {questions.length} Soal Snapshot
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Tindakan ini akan mengunci urutan <strong className="text-cyan-300 font-bold">{questions.length} soal</strong> sebagai <strong className="text-amber-300 font-bold">Single Source of Truth</strong>.
              </p>
            </div>

            {/* Verification checklist before lock */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2.5 text-xs text-slate-300">
              <p className="font-bold text-amber-300 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Konfirmasi Urutan Resmi:
              </p>
              <ul className="space-y-1.5 text-[11px] text-slate-400 pl-1">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  Urutan di Bank Soal (<strong className="text-white">1 s/d {questions.length}</strong>) akan identik dengan Kartu Cetak & Game Arena.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  Tombol geser posisi naik/turun dan hapus soal akan dinonaktifkan untuk mencegah perubahan tidak disengaja.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">ℹ</span>
                  Anda tetap dapat mengedit teks soal/kunci jawaban, atau membuka kunci kembali jika diperlukan.
                </li>
              </ul>
            </div>

            {/* Quick Preview of First 3 & Last 1 Questions */}
            {questions.length > 0 && (
              <div className="bg-slate-950/40 rounded-xl p-2.5 border border-white/5 text-[11px]">
                <span className="text-slate-500 font-mono block mb-1">Preview Urutan Kartu Resmi:</span>
                <div className="space-y-1 font-mono text-slate-300">
                  {questions.slice(0, 3).map((q, idx) => (
                    <div key={q.id} className="flex items-center gap-2 truncate">
                      <span className="text-cyan-400 font-bold w-6">#{idx + 1}</span>
                      <span className="text-slate-200 truncate">{q.code ? `[${q.code}]` : ''} {q.questionText}</span>
                    </div>
                  ))}
                  {questions.length > 3 && (
                    <div className="text-slate-500 pl-8">... dan {questions.length - 3} soal lainnya hingga #{questions.length}</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isLockingOrder}
                onClick={() => setShowFinalizeModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all disabled:opacity-50"
              >
                Batal / Periksa Lagi
              </button>
              <button
                type="button"
                disabled={isLockingOrder}
                onClick={handleConfirmFinalizeLock}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {isLockingOrder ? 'Mengunci...' : 'Ya, Kunci Urutan Resmi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 11. MODAL KONFIRMASI BUKA KUNCI URUTAN SOAL */}
      {/* ========================================================= */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-400/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto">
              <Unlock className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                Buka Kunci Urutan Soal?
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Setelah dibuka kunci, Anda dapat menambah, menghapus, atau memindahkan urutan soal kembali.
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-[11px] text-left">
                ⚠️ <strong>Perhatian:</strong> Jika Anda mengubah urutan setelah kartu fisik dicetak, pastikan untuk mencetak ulang kartu agar nomor kartu tetap sama dengan arena game.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isLockingOrder}
                onClick={() => setShowUnlockModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isLockingOrder}
                onClick={handleConfirmUnlock}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                {isLockingOrder ? 'Membuka...' : 'Buka Kunci Urutan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
