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

export interface Question {
  id: string;
  code: string; // e.g. "Q-01"
  type?: QuestionType; // Defaults to 'short_answer' if undefined (backward compatible)
  questionText: string;
  correctAnswer: string;
  alternativeAnswers: string[]; // Variations like ["150 cm", "150cm", "1.5 m", "1,5 meter"]
  points: number;
  category?: string;
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
  questionIds: string[]; // explicit snapshot list of question IDs
}

export interface GameSettings {
  matchTitle: string;
  roundName: string;
  playlistMode?: PlaylistMode; // 'all' | 'topic' | 'custom' (defaults to 'all')
  playlistName?: string; // e.g. "Pengukuran Dasar IPA Kelas 7"
  selectedTopic?: string; // Single topic mode (e.g. "Alat Ukur")
  selectedTopics?: string[]; // Multi-topic list for custom playlist mode
  customQuestionIds?: string[]; // Explicit list of question IDs included in custom playlist
  playlist?: MatchPlaylistConfig; // Official snapshot configuration for match
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
  startedAt?: number | null; // Server/host timestamp when timer started running
  orderLocked?: boolean; // Single source of truth for question order lock status (defaults to false)
  activeQuestionIds?: string[]; // Explicit snapshot list of question IDs actively used in match
  settings: GameSettings;
  teams: Team[];
  questions: Question[]; // ACTIVE MATCH QUESTION SNAPSHOT
  teamCardDecks: Record<string, TeamCardAssignment[]>; // key is teamId
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
