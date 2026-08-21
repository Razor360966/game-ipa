import { getSupabase } from './supabase';
import {
  GameState,
  GameSettings,
  Team,
  Question,
  TeamCardAssignment,
  ActivityLog,
  GameStatus,
} from '../types';

export const DEFAULT_ROOM_ID = 'MBB-2026-001';

/**
 * SQL Schema definition for Supabase PostgreSQL
 */
export const SUPABASE_SQL_SCHEMA = `-- =======================================================
-- MEASUREMENT BLOCK BLAST - SUPABASE DATABASE SCHEMA
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =======================================================

-- 1. Tabel competitions
CREATE TABLE IF NOT EXISTS public.competitions (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL DEFAULT 'MEASUREMENT BLOCK BLAST',
  round_name VARCHAR(255) DEFAULT 'BABAK PENYISIHAN UTAMA',
  duration_minutes INT DEFAULT 10,
  question_time_limit_seconds INT DEFAULT 30,
  enable_question_timer BOOLEAN DEFAULT TRUE,
  points_per_correct INT DEFAULT 10,
  penalty_wrong INT DEFAULT 0,
  wrong_answer_rule VARCHAR(20) DEFAULT 'retry',
  case_sensitive BOOLEAN DEFAULT FALSE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'ready',
  time_remaining_seconds INT DEFAULT 600,
  started_at BIGINT,
  active_team_id VARCHAR(100),
  active_card_number INT,
  active_since BIGINT,
  last_evaluation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel teams
CREATE TABLE IF NOT EXISTS public.teams (
  id VARCHAR(100) NOT NULL,
  competition_id VARCHAR(100) REFERENCES public.competitions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  score INT DEFAULT 0,
  correct_count INT DEFAULT 0,
  wrong_count INT DEFAULT 0,
  order_index INT DEFAULT 0,
  PRIMARY KEY (id, competition_id)
);

-- 3. Tabel questions
CREATE TABLE IF NOT EXISTS public.questions (
  id VARCHAR(100) NOT NULL,
  competition_id VARCHAR(100) REFERENCES public.competitions(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'short_answer',
  question_text TEXT NOT NULL,
  points INT DEFAULT 10,
  category VARCHAR(100),
  explanation TEXT,
  unit_hint VARCHAR(50),
  time_limit_seconds INT,
  order_index INT DEFAULT 0,
  answer_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, competition_id)
);

-- 4. Tabel question_assignments (Urutan Soal Per Kelompok)
CREATE TABLE IF NOT EXISTS public.question_assignments (
  id VARCHAR(255) PRIMARY KEY,
  competition_id VARCHAR(100) REFERENCES public.competitions(id) ON DELETE CASCADE,
  team_id VARCHAR(100) NOT NULL,
  card_number INT NOT NULL,
  card_code VARCHAR(50) NOT NULL,
  question_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'unanswered',
  attempts INT DEFAULT 0,
  last_answer TEXT,
  answered_at BIGINT
);

-- 5. Tabel activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id VARCHAR(255) PRIMARY KEY,
  competition_id VARCHAR(100) REFERENCES public.competitions(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  time_formatted VARCHAR(50) NOT NULL,
  team_id VARCHAR(100),
  team_name VARCHAR(100),
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  points_change INT DEFAULT 0
);

-- 6. Aktifkan RLS & Akses Anon Key
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access competitions" ON public.competitions;
CREATE POLICY "Public access competitions" ON public.competitions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access teams" ON public.teams;
CREATE POLICY "Public access teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access questions" ON public.questions;
CREATE POLICY "Public access questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access question_assignments" ON public.question_assignments;
CREATE POLICY "Public access question_assignments" ON public.question_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access activity_logs" ON public.activity_logs;
CREATE POLICY "Public access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. Aktifkan Realtime Publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions, public.teams, public.questions, public.question_assignments, public.activity_logs;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;
`;

// Helper: Convert Question object to Database row format
export const questionToDbRow = (q: Question, competitionId: string, orderIndex: number) => {
  let answerData: Record<string, any> = {};

  if (q.type === 'multiple_choice') {
    answerData = {
      options: q.options || [],
      correctOptionId: q.correctOptionId || q.correctAnswer || 'A',
      correctAnswer: q.correctAnswer,
    };
  } else if (q.type === 'statement_correction') {
    answerData = {
      statementConfig: q.statementConfig || {
        statement: q.questionText,
        isTrue: true,
      },
      correctAnswer: q.correctAnswer,
      alternativeAnswers: q.alternativeAnswers || [],
    };
  } else if (q.type === 'multi_part') {
    answerData = {
      multiPartConfig: q.multiPartConfig || {
        parts: [],
      },
      correctAnswer: q.correctAnswer,
    };
  } else {
    // short_answer
    answerData = {
      acceptedAnswers: [q.correctAnswer, ...(q.alternativeAnswers || [])].filter(Boolean),
      correctAnswer: q.correctAnswer,
      alternativeAnswers: q.alternativeAnswers || [],
    };
  }

  return {
    id: q.id,
    competition_id: competitionId,
    code: q.code,
    type: q.type || 'short_answer',
    question_text: q.questionText,
    points: q.points || 10,
    category: q.category || '',
    explanation: q.explanation || '',
    unit_hint: q.unitHint || '',
    time_limit_seconds: q.timeLimitSeconds || null,
    order_index: orderIndex,
    answer_data: answerData,
  };
};

// Helper: Convert Database row back to Question model
export const dbRowToQuestion = (row: any): Question => {
  const answerData = row.answer_data || {};
  const type = row.type || 'short_answer';

  let correctAnswer = answerData.correctAnswer || '';
  let alternativeAnswers = answerData.alternativeAnswers || [];

  if (type === 'short_answer' && answerData.acceptedAnswers && answerData.acceptedAnswers.length > 0) {
    if (!correctAnswer) correctAnswer = answerData.acceptedAnswers[0];
    if (alternativeAnswers.length === 0) {
      alternativeAnswers = answerData.acceptedAnswers.slice(1);
    }
  }

  return {
    id: row.id,
    code: row.code,
    type: type,
    questionText: row.question_text || '',
    correctAnswer: correctAnswer,
    alternativeAnswers: alternativeAnswers,
    points: Number(row.points) || 10,
    category: row.category || undefined,
    explanation: row.explanation || undefined,
    unitHint: row.unit_hint || undefined,
    timeLimitSeconds: row.time_limit_seconds ? Number(row.time_limit_seconds) : undefined,
    options: answerData.options || undefined,
    correctOptionId: answerData.correctOptionId || undefined,
    statementConfig: answerData.statementConfig || undefined,
    multiPartConfig: answerData.multiPartConfig || undefined,
  };
};

/**
 * Check Database Connection
 */
export const checkDbConnection = async (): Promise<{
  ok: boolean;
  tablesExist: boolean;
  message: string;
}> => {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      ok: false,
      tablesExist: false,
      message: 'Kredensial Supabase (URL / Anon Key) belum dikonfigurasi.',
    };
  }

  try {
    const { data, error } = await supabase.from('competitions').select('id').limit(1);
    if (error) {
      const isMissingTable =
        error.code === 'PGRST205' ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist');

      if (isMissingTable) {
        return {
          ok: false,
          tablesExist: false,
          message: 'Tabel database belum dibuat di Supabase. Silakan jalankan Skema SQL di SQL Editor Supabase.',
        };
      }

      return {
        ok: false,
        tablesExist: false,
        message: `Database error: ${error.message}`,
      };
    }
    return { ok: true, tablesExist: true, message: 'Database Supabase Terhubung & Tabel Aktif.' };
  } catch (err: any) {
    return {
      ok: false,
      tablesExist: false,
      message: `Koneksi gagal: ${err?.message || 'Network error'}`,
    };
  }
};

/**
 * Load complete Competition from Supabase
 */
export const loadCompetitionFromDb = async (competitionId: string): Promise<GameState | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    // 1. Fetch competition info
    const { data: compData, error: compErr } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .maybeSingle();

    if (compErr || !compData) {
      return null;
    }

    // 2. Fetch teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('competition_id', competitionId)
      .order('order_index', { ascending: true });

    // 3. Fetch questions
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('competition_id', competitionId)
      .order('order_index', { ascending: true });

    // 4. Fetch assignments
    const { data: assignData } = await supabase
      .from('question_assignments')
      .select('*')
      .eq('competition_id', competitionId)
      .order('card_number', { ascending: true });

    // 5. Fetch recent activity logs
    const { data: logsData } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('competition_id', competitionId)
      .order('timestamp', { ascending: false })
      .limit(50);

    const teams: Team[] = (teamsData || []).map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color as any,
      score: Number(t.score) || 0,
      correctCount: Number(t.correct_count) || 0,
      wrongCount: Number(t.wrong_count) || 0,
    }));

    const questions: Question[] = (questionsData || []).map(dbRowToQuestion);

    // Group assignments by teamId
    const teamCardDecks: Record<string, TeamCardAssignment[]> = {};
    (assignData || []).forEach((a) => {
      if (!teamCardDecks[a.team_id]) {
        teamCardDecks[a.team_id] = [];
      }
      teamCardDecks[a.team_id].push({
        cardNumber: Number(a.card_number),
        cardCode: a.card_code,
        questionId: a.question_id,
        status: a.status as any,
        attempts: Number(a.attempts) || 0,
        lastAnswer: a.last_answer || undefined,
        answeredAt: a.answered_at ? Number(a.answered_at) : undefined,
      });
    });

    // Ensure sorted by cardNumber
    Object.keys(teamCardDecks).forEach((tId) => {
      teamCardDecks[tId].sort((a, b) => a.cardNumber - b.cardNumber);
    });

    const activityLogs: ActivityLog[] = (logsData || []).reverse().map((l) => ({
      id: l.id,
      timestamp: Number(l.timestamp),
      timeFormatted: l.time_formatted,
      teamId: l.team_id || undefined,
      teamName: l.team_name || undefined,
      type: l.type as any,
      message: l.message,
      pointsChange: l.points_change ? Number(l.points_change) : undefined,
    }));

    const settings: GameSettings = {
      matchTitle: compData.title || 'MEASUREMENT BLOCK BLAST',
      roundName: compData.round_name || 'BABAK PENYISIHAN UTAMA',
      durationMinutes: Number(compData.duration_minutes) || 10,
      questionTimeLimitSeconds: Number(compData.question_time_limit_seconds) || 30,
      enableQuestionTimer: compData.enable_question_timer ?? true,
      pointsPerCorrect: Number(compData.points_per_correct) || 10,
      penaltyWrong: Number(compData.penalty_wrong) || 0,
      wrongAnswerRule: (compData.wrong_answer_rule as any) || 'retry',
      caseSensitive: compData.case_sensitive ?? false,
      allowAnyQuestionOrder: true,
      soundEnabled: compData.sound_enabled ?? true,
      autoReturnDelaySeconds: 4,
    };

    return {
      competitionId: compData.id,
      startedAt: compData.started_at ? Number(compData.started_at) : null,
      settings,
      teams,
      questions,
      teamCardDecks,
      status: (compData.status as GameStatus) || 'ready',
      timeRemainingSeconds: Number(compData.time_remaining_seconds) || settings.durationMinutes * 60,
      activeTeamId: compData.active_team_id || null,
      activeSince: compData.active_since ? Number(compData.active_since) : null,
      activeQuestionIndex: compData.active_card_number ? Number(compData.active_card_number) : null,
      activityLogs,
      lastEvaluation: compData.last_evaluation || null,
    };
  } catch (err) {
    console.error('[loadCompetitionFromDb Error]', err);
    return null;
  }
};

/**
 * Save complete GameState to Supabase (Full sync / migration)
 */
export const saveCompetitionToDb = async (state: GameState, competitionId: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const roomId = competitionId || state.competitionId || DEFAULT_ROOM_ID;

    // 1. Upsert competition
    const compRow = {
      id: roomId,
      title: state.settings.matchTitle,
      round_name: state.settings.roundName,
      duration_minutes: state.settings.durationMinutes,
      question_time_limit_seconds: state.settings.questionTimeLimitSeconds ?? 30,
      enable_question_timer: state.settings.enableQuestionTimer ?? true,
      points_per_correct: state.settings.pointsPerCorrect,
      penalty_wrong: state.settings.penaltyWrong,
      wrong_answer_rule: state.settings.wrongAnswerRule,
      case_sensitive: state.settings.caseSensitive,
      sound_enabled: state.settings.soundEnabled,
      status: state.status,
      time_remaining_seconds: state.timeRemainingSeconds,
      started_at: state.startedAt || null,
      active_team_id: state.activeTeamId,
      active_card_number: state.activeQuestionIndex,
      active_since: state.activeSince,
      last_evaluation: state.lastEvaluation,
      updated_at: new Date().toISOString(),
    };

    const { error: compErr } = await supabase.from('competitions').upsert(compRow);
    if (compErr) {
      if (compErr.code === 'PGRST205' || compErr.message?.includes('Could not find the table')) {
        console.warn('[Save Comp Supabase] Tabel belum siap di Supabase. Jalankan skema SQL di SQL Editor Supabase untuk mengaktifkan sinkronisasi.');
      } else {
        console.error('[Save Comp Error]', compErr);
      }
      return false;
    }

    // 2. Upsert teams
    const teamRows = state.teams.map((t, idx) => ({
      id: t.id,
      competition_id: roomId,
      name: t.name,
      color: t.color,
      score: t.score,
      correct_count: t.correctCount,
      wrong_count: t.wrongCount,
      order_index: idx,
    }));
    if (teamRows.length > 0) {
      await supabase.from('teams').upsert(teamRows);
    }

    // 3. Upsert questions
    const questionRows = state.questions.map((q, idx) => questionToDbRow(q, roomId, idx));
    if (questionRows.length > 0) {
      await supabase.from('questions').upsert(questionRows);
    }

    // 4. Upsert question assignments
    const assignmentRows: any[] = [];
    Object.entries(state.teamCardDecks).forEach(([teamId, cards]) => {
      cards.forEach((c) => {
        assignmentRows.push({
          id: `${roomId}_${teamId}_${c.cardNumber}`,
          competition_id: roomId,
          team_id: teamId,
          card_number: c.cardNumber,
          card_code: c.cardCode,
          question_id: c.questionId,
          status: c.status,
          attempts: c.attempts,
          last_answer: c.lastAnswer || null,
          answered_at: c.answeredAt || null,
        });
      });
    });

    if (assignmentRows.length > 0) {
      await supabase.from('question_assignments').upsert(assignmentRows);
    }

    // 5. Upsert recent activity logs
    if (state.activityLogs && state.activityLogs.length > 0) {
      const logRows = state.activityLogs.slice(-30).map((l) => ({
        id: l.id || `${roomId}_log_${l.timestamp}`,
        competition_id: roomId,
        timestamp: l.timestamp,
        time_formatted: l.timeFormatted,
        team_id: l.teamId || null,
        team_name: l.teamName || null,
        type: l.type,
        message: l.message,
        points_change: l.pointsChange || 0,
      }));
      await supabase.from('activity_logs').upsert(logRows);
    }

    return true;
  } catch (err) {
    console.error('[saveCompetitionToDb Error]', err);
    return false;
  }
};

/**
 * Patch Game State in Database (Lightweight Realtime sync)
 */
export const updateDbGameState = async (
  competitionId: string,
  patch: {
    status?: GameStatus;
    time_remaining_seconds?: number;
    started_at?: number | null;
    active_team_id?: string | null;
    active_card_number?: number | null;
    active_since?: number | null;
    last_evaluation?: any;
    title?: string;
    round_name?: string;
  }
) => {
  const supabase = getSupabase();
  if (!supabase || !competitionId) return;

  try {
    await supabase
      .from('competitions')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', competitionId);
  } catch (err) {
    console.error('[updateDbGameState Error]', err);
  }
};

/**
 * Update single card assignment in Database
 */
export const updateDbCardAssignment = async (
  competitionId: string,
  teamId: string,
  cardNumber: number,
  patch: {
    status: string;
    attempts?: number;
    last_answer?: string;
    answered_at?: number;
  }
) => {
  const supabase = getSupabase();
  if (!supabase || !competitionId) return;

  const id = `${competitionId}_${teamId}_${cardNumber}`;
  try {
    await supabase
      .from('question_assignments')
      .update(patch)
      .eq('id', id);
  } catch (err) {
    console.error('[updateDbCardAssignment Error]', err);
  }
};

/**
 * Update team score in Database
 */
export const updateDbTeamScore = async (
  competitionId: string,
  teamId: string,
  score: number,
  correctCount: number,
  wrongCount: number
) => {
  const supabase = getSupabase();
  if (!supabase || !competitionId) return;

  try {
    await supabase
      .from('teams')
      .update({
        score,
        correct_count: correctCount,
        wrong_count: wrongCount,
      })
      .eq('competition_id', competitionId)
      .eq('id', teamId);
  } catch (err) {
    console.error('[updateDbTeamScore Error]', err);
  }
};

/**
 * Append Activity Log in Database
 */
export const insertDbActivityLog = async (competitionId: string, log: ActivityLog) => {
  const supabase = getSupabase();
  if (!supabase || !competitionId) return;

  try {
    await supabase.from('activity_logs').insert({
      id: log.id || `${competitionId}_log_${Date.now()}`,
      competition_id: competitionId,
      timestamp: log.timestamp,
      time_formatted: log.timeFormatted,
      team_id: log.teamId || null,
      team_name: log.teamName || null,
      type: log.type,
      message: log.message,
      points_change: log.pointsChange || 0,
    });
  } catch (err) {
    console.error('[insertDbActivityLog Error]', err);
  }
};

/**
 * Realtime Subscription for instant synchronization across multiple PCs
 */
export const subscribeToRoomRealtime = (
  competitionId: string,
  onRemoteChange: () => void
) => {
  const supabase = getSupabase();
  if (!supabase || !competitionId) return () => {};

  const channel = supabase
    .channel(`room_${competitionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'competitions',
        filter: `id=eq.${competitionId}`,
      },
      () => {
        onRemoteChange();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'teams',
        filter: `competition_id=eq.${competitionId}`,
      },
      () => {
        onRemoteChange();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'question_assignments',
        filter: `competition_id=eq.${competitionId}`,
      },
      () => {
        onRemoteChange();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'questions',
        filter: `competition_id=eq.${competitionId}`,
      },
      () => {
        onRemoteChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
