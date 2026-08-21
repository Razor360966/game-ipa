import { getSupabase } from './supabase';
import {
  GameState,
  GameSettings,
  Team,
  Question,
  QuestionType,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, competition_id)
);

-- 3. Tabel questions
CREATE TABLE IF NOT EXISTS public.questions (
  id VARCHAR(100) NOT NULL,
  competition_id VARCHAR(100) REFERENCES public.competitions(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  title VARCHAR(100),
  question_type VARCHAR(50) DEFAULT 'short_answer',
  type VARCHAR(50) DEFAULT 'short_answer',
  prompt TEXT,
  question_text TEXT,
  correct_answer TEXT,
  unit VARCHAR(50),
  unit_hint VARCHAR(50),
  explanation TEXT,
  order_index INT DEFAULT 0,
  time_limit_seconds INT,
  options JSONB,
  correct_option_id TEXT,
  statement_config JSONB,
  multi_part_config JSONB,
  answer_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, competition_id)
);

-- Migration safety for existing questions tables
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS title VARCHAR(100);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'short_answer';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'short_answer';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS unit_hint VARCHAR(50);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_option_id TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS statement_config JSONB;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS multi_part_config JSONB;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS answer_data JSONB DEFAULT '{}'::jsonb;

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

// Helper: Convert Question object to Direct Database row format (prompt, question_type, options, etc.)
export const questionToDbRowDirect = (q: Question, competitionId: string, orderIndex: number) => {
  return {
    id: String(q.id),
    competition_id: competitionId,
    code: q.code || q.id,
    title: q.code || q.id,
    question_type: q.type || 'short_answer',
    prompt: q.questionText || '',
    correct_answer: q.correctAnswer || '',
    unit: q.unitHint || '',
    explanation: q.explanation || '',
    order_index: orderIndex,
    time_limit_seconds: q.timeLimitSeconds || null,
    options: q.options || null,
    correct_option_id: q.correctOptionId || null,
    statement_config: q.statementConfig || null,
    multi_part_config: q.multiPartConfig || null,
  };
};

// Helper: Convert Question object to AnswerData Database row format (question_text, type, answer_data)
export const questionToDbRowAnswerData = (q: Question, competitionId: string, orderIndex: number) => {
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
    id: String(q.id),
    competition_id: competitionId,
    code: q.code || q.id,
    type: q.type || 'short_answer',
    question_text: q.questionText || '',
    points: typeof q.points === 'number' ? q.points : 10,
    category: q.category || '',
    explanation: q.explanation || '',
    unit_hint: q.unitHint || '',
    time_limit_seconds: q.timeLimitSeconds || null,
    order_index: orderIndex,
    answer_data: answerData,
  };
};

// Default export mapper
export const questionToDbRow = questionToDbRowDirect;

// Helper: Convert Database row back to Question model (Multi-schema tolerant)
export const dbRowToQuestion = (row: any): Question => {
  const answerData = row.answer_data || {};
  const type: QuestionType = (row.type || row.question_type || 'short_answer') as QuestionType;

  // Extract correct answer with multi-field fallback
  let correctAnswer =
    row.correct_answer ||
    answerData.correctAnswer ||
    (answerData.acceptedAnswers && answerData.acceptedAnswers[0]) ||
    '';

  // Extract alternative answers with multi-field fallback
  let alternativeAnswers: string[] =
    row.alternative_answers ||
    answerData.alternativeAnswers ||
    (answerData.acceptedAnswers && answerData.acceptedAnswers.length > 1
      ? answerData.acceptedAnswers.slice(1)
      : []) ||
    [];

  // If short_answer and acceptedAnswers exists, normalize
  if (type === 'short_answer' && answerData.acceptedAnswers && answerData.acceptedAnswers.length > 0) {
    if (!correctAnswer) correctAnswer = answerData.acceptedAnswers[0];
    if (alternativeAnswers.length === 0 && answerData.acceptedAnswers.length > 1) {
      alternativeAnswers = answerData.acceptedAnswers.slice(1);
    }
  }

  // Extract options (can be in column or inside answer_data)
  const options = row.options || answerData.options || undefined;
  const correctOptionId =
    row.correct_option_id ||
    answerData.correctOptionId ||
    (type === 'multiple_choice' ? correctAnswer : undefined);

  // Extract statement config
  const statementConfig = row.statement_config || answerData.statementConfig || undefined;

  // Extract multi part config
  const multiPartConfig = row.multi_part_config || answerData.multiPartConfig || undefined;

  return {
    id: String(row.id),
    code: row.code || row.title || String(row.id),
    type: type,
    questionText: row.question_text || row.prompt || row.text || row.title || '',
    correctAnswer: String(correctAnswer || ''),
    alternativeAnswers: Array.isArray(alternativeAnswers) ? alternativeAnswers : [],
    points: Number(row.points) || 10,
    category: row.category || row.topic || undefined,
    explanation: row.explanation || row.pembahasan || undefined,
    unitHint: row.unit_hint || row.unit || undefined,
    timeLimitSeconds: row.time_limit_seconds ? Number(row.time_limit_seconds) : undefined,
    options: options,
    correctOptionId: correctOptionId,
    statementConfig: statementConfig,
    multiPartConfig: multiPartConfig,
  };
};

/**
 * Fetch all questions for a competition directly from Supabase
 */
export const fetchQuestionsFromDb = async (competitionId: string): Promise<Question[]> => {
  const supabase = getSupabase();
  if (!supabase || !competitionId) return [];

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('competition_id', competitionId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[Supabase fetchQuestions error]', error);
      return [];
    }

    return (data || []).map(dbRowToQuestion);
  } catch (err) {
    console.error('[Supabase fetchQuestions exception]', err);
    return [];
  }
};

/**
 * Insert or update a single Question in Supabase directly
 */
export const insertOrUpdateQuestionInDb = async (
  competitionId: string,
  question: Question,
  orderIndex: number = 0
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase || !competitionId) {
    return { success: false, error: 'Database belum terhubung.' };
  }

  try {
    const directRow = questionToDbRowDirect(question, competitionId, orderIndex);
    const { error: directErr } = await supabase.from('questions').upsert(directRow);

    if (directErr) {
      if (directErr.code === 'PGRST204' || directErr.message?.includes('column')) {
        const altRow = questionToDbRowAnswerData(question, competitionId, orderIndex);
        const { error: altErr } = await supabase.from('questions').upsert(altRow);
        if (altErr) {
          console.error('[Supabase insertOrUpdateQuestion alt error]', altErr);
          return { success: false, error: altErr.message };
        }
      } else {
        console.error('[Supabase insertOrUpdateQuestion error]', directErr);
        return { success: false, error: directErr.message };
      }
    }

    console.info(`[Supabase Bank Soal] Soal ${question.code} (${question.id}) berhasil disimpan.`);
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase insertOrUpdateQuestion exception]', err);
    return { success: false, error: err?.message || 'Gagal menyimpan soal.' };
  }
};

/**
 * Delete a Question from Supabase directly
 */
export const deleteQuestionFromDb = async (
  competitionId: string,
  questionId: string
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase || !competitionId || !questionId) {
    return { success: false, error: 'Parameter tidak lengkap.' };
  }

  try {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('competition_id', competitionId)
      .eq('id', questionId);

    if (error) {
      console.error('[Supabase deleteQuestion error]', error);
      return { success: false, error: error.message };
    }

    console.info(`[Supabase Bank Soal] Soal ${questionId} berhasil dihapus dari DB.`);
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase deleteQuestion exception]', err);
    return { success: false, error: err?.message || 'Gagal menghapus soal.' };
  }
};

/**
 * Save all questions array to Supabase with pruning of removed questions
 */
export const saveAllQuestionsToDb = async (
  competitionId: string,
  questions: Question[]
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase || !competitionId) {
    return { success: false, error: 'Database belum terhubung.' };
  }

  try {
    if (questions.length > 0) {
      // First attempt direct column schema (prompt, question_type, options, etc.)
      const directRows = questions.map((q, idx) => questionToDbRowDirect(q, competitionId, idx));
      const { error: directErr } = await supabase.from('questions').upsert(directRows);

      if (directErr) {
        // If column mismatch error (PGRST204), try AnswerData format
        if (directErr.code === 'PGRST204' || directErr.message?.includes('column')) {
          console.warn('[Supabase saveAllQuestions] Retrying with answer_data format...');
          const altRows = questions.map((q, idx) => questionToDbRowAnswerData(q, competitionId, idx));
          const { error: altErr } = await supabase.from('questions').upsert(altRows);
          if (altErr) {
            console.error('[Supabase saveAllQuestions alt upsert error]', altErr);
            return { success: false, error: altErr.message };
          }
        } else {
          console.error('[Supabase saveAllQuestions upsert error]', directErr);
          return { success: false, error: directErr.message };
        }
      }
    }

    // Clean up any questions from this competition that are no longer in the list
    const currentIds = questions.map((q) => String(q.id));
    const { data: existingData, error: fetchErr } = await supabase
      .from('questions')
      .select('id')
      .eq('competition_id', competitionId);

    if (!fetchErr && existingData && existingData.length > 0) {
      const idsToDelete = existingData
        .filter((item) => !currentIds.includes(String(item.id)))
        .map((item) => item.id);

      if (idsToDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('questions')
          .delete()
          .eq('competition_id', competitionId)
          .in('id', idsToDelete);

        if (delErr) {
          console.warn('[Supabase prune deleted questions warning]', delErr);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase saveAllQuestions exception]', err);
    return { success: false, error: err?.message || 'Gagal menyinkronkan seluruh soal.' };
  }
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
      const { error: teamsErr } = await supabase.from('teams').upsert(teamRows);
      if (teamsErr) {
        console.error('[Save Teams Error]', teamsErr);
      }
    }

    // 3. Upsert & sync questions (with pruning of deleted questions)
    if (state.questions && state.questions.length > 0) {
      await saveAllQuestionsToDb(roomId, state.questions);
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
