export type UserRole = 'admin' | 'teacher';

export interface UserProfile {
  id: string; // UUID from auth.users
  email: string;
  name?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export type TeamColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'orange' | 'indigo';

export interface Team {
  id: string;
  name: string;
  color: TeamColor;
  score: number;
  correctCount: number;
  wrongCount: number;
  lastTapTimestamp?: number;
}

export type QuestionType =
  | 'short_answer'
  | 'multiple_choice'
  | 'statement_correction'
  | 'multi_part';

export interface MultipleChoiceOption {
  id: string; // e.g. "A", "B", "C", "D"
  label: string; // e.g. "A", "B", "C", "D"
  text: string;
}

export interface StatementCorrectionConfig {
  statement: string; // Keterangan / Pernyataan
  isTrue: boolean; // Kunci: true = BENAR, false = SALAH
  correctionKey?: string; // Kunci pernyataan yang benar jika salah
  correctionAlternatives?: string[]; // Alternatif jawaban koreksi
  scoringMode?: 'full' | 'partial'; // 'full' (100% or 0%) or 'partial' (e.g. 50% each)
}

export interface MultiPartItem {
  id: string;
  question: string;
  answerType?: 'short_answer';
  correctAnswer: string;
  alternativeAnswers?: string[];
  pointsWeight?: number;
}

export interface MultiPartConfig {
  introduction?: string;
  parts: MultiPartItem[];
  scoringMode?: 'full' | 'partial'; // 'full' or 'partial'
}

export interface QuestionVariant {
  id: string; // e.g. "q-01-var-1", "q-01-beta"
  baseQuestionId: string; // Reference to parent base question ID
  variantCode?: string; // e.g. "VAR-A", "VAR-B"
  variantLabel?: string; // e.g. "Variasi Alpha", "Variasi 1"
  questionText: string;
  correctAnswer: string;
  alternativeAnswers: string[];
  type?: QuestionType;
  points?: number;
  category?: string;
  explanation?: string;
  unitHint?: string;
  timeLimitSeconds?: number;
  options?: MultipleChoiceOption[];
  correctOptionId?: string;
  statementConfig?: StatementCorrectionConfig;
  multiPartConfig?: MultiPartConfig;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  parameters?: Record<string, any>; // e.g. { massa: 200, volume: 50 }
}

export interface Question {
  id: string;
  code: string; // e.g. "Q-01"
  type?: QuestionType; // Defaults to 'short_answer' if undefined (backward compatible)
  questionText: string;
  correctAnswer: string;
  alternativeAnswers: string[]; // Variations like ["150 cm", "150cm", "1.5 m", "1,5 meter"]
  points: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  explanation?: string;
  unitHint?: string; // e.g. "cm", "kg", "m/s"
  timeLimitSeconds?: number; // Optional custom time limit for this specific question in seconds

  // Extension for Multiple Choice
  options?: MultipleChoiceOption[];
  correctOptionId?: string; // "A", "B", "C", etc.

  // Extension for Statement Correction
  statementConfig?: StatementCorrectionConfig;

  // Extension for Multi Part
  multiPartConfig?: MultiPartConfig;

  // Single Source of Truth Order
  orderIndex?: number;

  // Phase 6: Predefined question variants for deterministic per-team assignment
  variantLabel?: string;
  variantCode?: string;
  variants?: QuestionVariant[];
  hasVariants?: boolean;
}

export type QuestionCardStatus = 'unanswered' | 'correct' | 'wrong' | 'locked';

export type PlaylistMode = 'all' | 'topic' | 'custom';

export interface QuestionPlaylist {
  id: string; // e.g. "all", "suhu", "pengukuran", "tanpa-topik"
  name: string; // Display name e.g. "Semua Topik", "Suhu", "Pengukuran"
  count: number; // Total number of questions in playlist
  questionIds: string[];
  questions: Question[];
  icon?: string; // Visual topic emoji e.g. "🌡", "📏", "💨", "⚡"
  isDefaultAll?: boolean;
}

export interface TeamCardAssignment {
  cardNumber: number; // 1, 2, 3... (Physical card number given to student)
  cardCode: string; // e.g. "ALP-01"
  questionId: string;
  status: QuestionCardStatus;
  attempts: number;
  lastAnswer?: string;
  answeredAt?: number;
}

export interface TeamCardDeck {
  teamId: string;
  cards: TeamCardAssignment[];
}

export interface MatchPlaylistConfig {
  mode: PlaylistMode; // 'all' | 'topic' | 'custom'
  selectedTopic?: string;
  selectedTopics?: string[];
  selectedDifficulty?: 'all' | 'easy' | 'medium' | 'hard' | string;
  questionCount?: number;
  questionIds: string[]; // explicit snapshot list of question IDs
}

export interface VariantSnapshotMeta {
  version: number;
  generatedAt: string;
  engineVersion: string;
  sourceQuestionIds: string[];
  snapshotHash?: string;
}

export interface GameSettings {
  matchTitle: string;
  roundName: string;
  playlistMode?: PlaylistMode; // 'all' | 'topic' | 'custom' (defaults to 'all')
  playlistName?: string; // e.g. "Pengukuran Dasar IPA Kelas 7"
  selectedTopic?: string; // Single topic mode (e.g. "Alat Ukur")
  selectedTopics?: string[]; // Multi-topic list for custom playlist mode
  selectedDifficulty?: 'all' | 'easy' | 'medium' | 'hard' | string; // Level selection (all | easy | medium | hard)
  questionCount?: number; // Quota of questions selected for match
  customQuestionIds?: string[]; // Explicit list of question IDs included in custom playlist
  playlist?: MatchPlaylistConfig; // Official snapshot configuration for match
  teamQuestionVariants?: Record<string, Record<string, QuestionVariant>>; // Persisted snapshot in settings
  variantSnapshotMeta?: VariantSnapshotMeta; // Snapshot metadata
  durationMinutes: number; // Durasi keseluruhan game dalam menit
  questionTimeLimitSeconds: number; // Batas waktu menjawab khusus per soal (detik), misal 30 detik
  enableQuestionTimer: boolean; // Aktifkan/nonaktifkan batas waktu khusus per soal
  pointsPerCorrect: number;
  penaltyWrong: number;
  wrongAnswerRule: 'retry' | 'lock'; // 'retry' = can try again; 'lock' = locked after wrong
  caseSensitive: boolean;
  allowAnyQuestionOrder: boolean;
  soundEnabled: boolean;
  autoReturnDelaySeconds: number;
}

export type GameStatus = 'setup' | 'ready' | 'running' | 'paused' | 'finished';

export interface ActivityLog {
  id: string;
  timestamp: number;
  timeFormatted: string;
  teamId?: string;
  teamName?: string;
  type: 'tap' | 'answer_correct' | 'answer_wrong' | 'game_start' | 'game_pause' | 'game_resume' | 'game_finish' | 'score_override' | 'reset';
  message: string;
  pointsChange?: number;
}

export interface GameState {
  competitionId?: string; // Room ID e.g. "MBB-2026-001"
  createdBy?: string; // UUID of owner teacher / admin from auth.users
  startedAt?: number | null; // Server/host timestamp when timer started running
  orderLocked?: boolean; // Single source of truth for question order lock status (defaults to false)
  activeQuestionIds?: string[]; // Explicit snapshot list of question IDs actively used in match
  settings: GameSettings;
  teams: Team[];
  questions: Question[]; // ACTIVE MATCH QUESTION SNAPSHOT
  teamCardDecks: Record<string, TeamCardAssignment[]>; // key is teamId
  teamQuestionVariants?: Record<string, Record<string, QuestionVariant>>; // Phase 6: teamId -> baseQuestionId -> QuestionVariant
  variantSnapshotMeta?: VariantSnapshotMeta; // Phase 6B.1: Immutable snapshot metadata & verification hash
  status: GameStatus;
  timeRemainingSeconds: number;
  activeTeamId: string | null;
  activeSince: number | null; // Timestamp when team tapped
  activeQuestionIndex: number | null; // which card the active team is currently answering
  activityLogs: ActivityLog[];
  lastEvaluation: {
    teamId: string;
    cardNumber: number;
    isCorrect: boolean;
    points: number;
    submittedAnswer: string;
    expectedAnswer: string;
    timestamp: number;
  } | null;
}
