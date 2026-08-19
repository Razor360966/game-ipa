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

export interface Question {
  id: string;
  code: string; // e.g. "Q-01"
  questionText: string;
  correctAnswer: string;
  alternativeAnswers: string[]; // Variations like ["150 cm", "150cm", "1.5 m", "1,5 meter"]
  points: number;
  category?: string;
  explanation?: string;
  unitHint?: string; // e.g. "cm", "kg", "m/s"
}

export type QuestionCardStatus = 'unanswered' | 'correct' | 'wrong' | 'locked';

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

export interface GameSettings {
  matchTitle: string;
  roundName: string;
  durationMinutes: number;
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
  settings: GameSettings;
  teams: Team[];
  questions: Question[];
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
