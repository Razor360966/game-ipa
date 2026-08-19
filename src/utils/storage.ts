import { GameSettings, GameState, Question, Team } from '../types';
import { DEFAULT_QUESTIONS, INITIAL_TEAMS, generateTeamCardDecks } from './presets';

const STORAGE_KEY = 'mbb_game_state_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  matchTitle: 'MEASUREMENT BLOCK BLAST',
  roundName: 'BABAK PENYISIHAN UTAMA',
  durationMinutes: 10,
  pointsPerCorrect: 10,
  penaltyWrong: 0,
  wrongAnswerRule: 'retry', // 'retry' | 'lock'
  caseSensitive: false,
  allowAnyQuestionOrder: true,
  soundEnabled: true,
  autoReturnDelaySeconds: 2,
};

export function getInitialGameState(): GameState {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.teams && parsed.questions) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  const teams: Team[] = INITIAL_TEAMS;
  const questions: Question[] = DEFAULT_QUESTIONS;
  const teamCardDecks = generateTeamCardDecks(teams, questions, 10, true);

  return {
    settings: DEFAULT_SETTINGS,
    teams,
    questions,
    teamCardDecks,
    status: 'ready',
    timeRemainingSeconds: DEFAULT_SETTINGS.durationMinutes * 60,
    activeTeamId: null,
    activeSince: null,
    activeQuestionIndex: null,
    activityLogs: [
      {
        id: 'log-init',
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString('id-ID'),
        type: 'reset',
        message: 'Sistem kompetisi siap dimulai.',
      },
    ],
    lastEvaluation: null,
  };
}

export function saveGameState(state: GameState): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota exceeded
    }
  }
}
