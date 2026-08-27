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
  UserProfile,
} from '../types';
import { filterQuestionsByPlaylist } from '../utils/presets';

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
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'MEASUREMENT BLOCK BLAST',
  round_name VARCHAR(255) DEFAULT 'BABAK PENYISIHAN UTAMA',
  selected_topic VARCHAR(150),
  duration_minutes INT DEFAULT 10,
  question_time_limit_seconds INT DEFAULT 30,
  enable_question_timer BOOLEAN DEFAULT TRUE,
  points_per_correct INT DEFAULT 10,
  penalty_wrong INT DEFAULT 0,
  wrong_answer_rule VARCHAR(20) DEFAULT 'retry',
  case_sensitive BOOLEAN DEFAULT FALSE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  order_locked BOOLEAN DEFAULT FALSE,
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

-- Migration safety for existing competitions table
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS order_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS selected_topic VARCHAR(150);
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS playlist_mode VARCHAR(50) DEFAULT 'all';
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS playlist_name VARCHAR(255);
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS selected_topics TEXT[];
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS custom_question_ids TEXT[];

-- 2. Tabel profiles (Teacher / Admin User Accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role VARCHAR(50) DEFAULT 'teacher',
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
  alternative_answers TEXT[],
  unit VARCHAR(50),
  unit_hint VARCHAR(50),
  explanation TEXT,
  points INT DEFAULT 10,
  category VARCHAR(150),
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
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS alternative_answers TEXT[];
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS unit_hint VARCHAR(50);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS points INT DEFAULT 10;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS category VARCHAR(150);
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

-- 6. Aktifkan RLS & Akses Anon Key serta Teacher/Admin Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can read, authenticated user can manage own profile
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Competitions: Public can read matches for game arena, teachers/admins can create/update
DROP POLICY IF EXISTS "Public access competitions" ON public.competitions;
CREATE POLICY "Public access competitions" ON public.competitions FOR ALL USING (true) WITH CHECK (true);

-- Teams: Public can read and update scores/status during match
DROP POLICY IF EXISTS "Public access teams" ON public.teams;
CREATE POLICY "Public access teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

-- Questions: Public can read for active game arena, teachers can manage
DROP POLICY IF EXISTS "Public access questions" ON public.questions;
CREATE POLICY "Public access questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);

-- Question Assignments: Public can read and submit answers
DROP POLICY IF EXISTS "Public access question_assignments" ON public.question_assignments;
CREATE POLICY "Public access question_assignments" ON public.question_assignments FOR ALL USING (true) WITH CHECK (true);

-- Activity Logs: Public and teachers can read/insert logs
DROP POLICY IF EXISTS "Public access activity_logs" ON public.activity_logs;
CREATE POLICY "Public access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. Aktifkan Realtime Publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles, public.competitions, public.teams, public.questions, public.question_assignments, public.activity_logs;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;
`;

// Track columns that are confirmed not existing in the schema cache to avoid PGRST204 errors
const unsupportedQuestionColumns = new Set<string>();
const unsupportedCompetitionColumns = new Set<string>();

// Helper: Convert Question object to Direct Database row format (prompt, question_type, options, etc.)
export const questionToDbRowDirect = (q: Question, competitionId: string, orderIndex: number) => {
  const alts = Array.isArray(q.alternativeAnswers) ? q.alternativeAnswers.map((s) => String(s).trim()).filter(Boolean) : [];
  const codeVal = q.code || q.id || 'Q';
  const normalizedCategory = typeof q.category === 'string' && q.category.trim() !== '' ? q.category.trim() : null;

  // For short_answer, preserve alternativeAnswers in options jsonb as universal fallback
  let optionsPayload: any = q.options || null;
  if (!optionsPayload && q.type === 'short_answer' && alts.length > 0) {
    optionsPayload = { alternativeAnswers: alts };
  }

  // Also preserve in statement_config if statement_config is null and alts exist
  let statementConfigPayload: any = q.statementConfig || null;
  if (!statementConfigPayload && q.type === 'short_answer' && alts.length > 0) {
    statementConfigPayload = { alternativeAnswers: alts };
  }

  return {
    id: String(q.id),
    competition_id: competitionId,
    code: codeVal,
    title: codeVal,
    question_type: q.type || 'short_answer',
    type: q.type || 'short_answer',
    prompt: q.questionText || '',
    question_text: q.questionText || '',
    correct_answer: q.correctAnswer || '',
    alternative_answers: alts,
    unit: q.unitHint || '',
    unit_hint: q.unitHint || '',
    explanation: q.explanation || '',
    points: typeof q.points === 'number' ? q.points : 10,
    category: normalizedCategory,
    order_index: orderIndex,
    time_limit_seconds: q.timeLimitSeconds || null,
    options: optionsPayload,
    correct_option_id: q.correctOptionId || null,
    statement_config: statementConfigPayload,
    multi_part_config: q.multiPartConfig || null,
  };
};

// Helper: Convert Question object to Clean/Core Database row format (without extra optional columns)
export const questionToDbRowClean = (q: Question, competitionId: string, orderIndex: number) => {
  const alts = Array.isArray(q.alternativeAnswers) ? q.alternativeAnswers.map((s) => String(s).trim()).filter(Boolean) : [];
  const codeVal = q.code || q.id || 'Q';
  const normalizedCategory = typeof q.category === 'string' && q.category.trim() !== '' ? q.category.trim() : null;

  let optionsPayload: any = q.options || null;
  if (!optionsPayload && q.type === 'short_answer' && alts.length > 0) {
    optionsPayload = { alternativeAnswers: alts };
  }

  return {
    id: String(q.id),
    competition_id: competitionId,
    code: codeVal,
    title: codeVal,
    question_type: q.type || 'short_answer',
    type: q.type || 'short_answer',
    prompt: q.questionText || '',
    question_text: q.questionText || '',
    correct_answer: q.correctAnswer || '',
    alternative_answers: alts,
    unit: q.unitHint || '',
    unit_hint: q.unitHint || '',
    explanation: q.explanation || '',
    points: typeof q.points === 'number' ? q.points : 10,
    category: normalizedCategory,
    order_index: orderIndex,
    time_limit_seconds: q.timeLimitSeconds || null,
    options: optionsPayload,
    correct_option_id: q.correctOptionId || null,
    statement_config: q.statementConfig || null,
    multi_part_config: q.multiPartConfig || null,
  };
};

// Helper: Convert Question object to minimal safe columns row format
export const questionToDbRowMinimal = (q: Question, competitionId: string, orderIndex: number) => {
  const codeVal = q.code || q.id || 'Q';
  return {
    id: String(q.id),
    competition_id: competitionId,
    code: codeVal,
    title: codeVal,
    prompt: q.questionText || '',
    question_text: q.questionText || '',
    correct_answer: q.correctAnswer || '',
    order_index: orderIndex,
  };
};

// Dynamic adaptive question row builder
export const buildAdaptiveQuestionRow = (
  q: Question,
  competitionId: string,
  orderIndex: number,
  excludeCols: Set<string> = unsupportedQuestionColumns
): Record<string, any> => {
  const base = questionToDbRowDirect(q, competitionId, orderIndex);
  const row: Record<string, any> = { ...base };

  for (const col of excludeCols) {
    delete row[col];
  }

  // If alternative_answers column is unsupported/excluded, preserve in options/statement_config if possible
  const alts = Array.isArray(q.alternativeAnswers) ? q.alternativeAnswers.map((s) => String(s).trim()).filter(Boolean) : [];
  if (excludeCols.has('alternative_answers') && alts.length > 0) {
    if (!excludeCols.has('options') && !row.options) {
      row.options = { alternativeAnswers: alts };
    } else if (!excludeCols.has('statement_config') && !row.statement_config) {
      row.statement_config = { alternativeAnswers: alts };
    }
  }

  // Ensure mandatory columns are never omitted
  const codeVal = q.code || q.id || 'Q';
  if (!row.id) row.id = String(q.id);
  if (!row.competition_id) row.competition_id = competitionId;
  if (!row.code) row.code = codeVal;
  if (!row.title) row.title = codeVal;

  return row;
};

// Default export mapper
export const questionToDbRow = questionToDbRowDirect;

// Helper: Convert Database row back to Question model (Multi-schema tolerant)
export const dbRowToQuestion = (row: any): Question => {
  const answerData = row.answer_data || {};
  const type: QuestionType = (row.type || row.question_type || 'short_answer') as QuestionType;

  // Safe parsing of JSON/object columns if returned as string
  let parsedOptions = row.options;
  if (typeof parsedOptions === 'string') {
    try {
      parsedOptions = JSON.parse(parsedOptions);
    } catch {
      // keep as string if parse fails
    }
  }

  let parsedStatementConfig = row.statement_config;
  if (typeof parsedStatementConfig === 'string') {
    try {
      parsedStatementConfig = JSON.parse(parsedStatementConfig);
    } catch {
      // keep as string if parse fails
    }
  }

  // Extract correct answer with multi-field fallback
  let correctAnswer =
    row.correct_answer ||
    answerData.correctAnswer ||
    (answerData.acceptedAnswers && answerData.acceptedAnswers[0]) ||
    '';

  // Extract alternative answers with multi-field fallback
  let rawAlts = row.alternative_answers;
  if (typeof rawAlts === 'string') {
    try {
      rawAlts = JSON.parse(rawAlts);
    } catch {
      rawAlts = rawAlts.split(',').map((s: string) => s.trim());
    }
  }

  const optionsAlts =
    parsedOptions && !Array.isArray(parsedOptions) && Array.isArray(parsedOptions.alternativeAnswers)
      ? parsedOptions.alternativeAnswers
      : null;

  const stmtAlts =
    parsedStatementConfig && Array.isArray(parsedStatementConfig.alternativeAnswers)
      ? parsedStatementConfig.alternativeAnswers
      : null;

  let alternativeAnswers: string[] =
    (Array.isArray(rawAlts) && rawAlts.length > 0 ? rawAlts : null) ||
    (Array.isArray(optionsAlts) && optionsAlts.length > 0 ? optionsAlts : null) ||
    (Array.isArray(stmtAlts) && stmtAlts.length > 0 ? stmtAlts : null) ||
    (Array.isArray(answerData.alternativeAnswers) && answerData.alternativeAnswers.length > 0
      ? answerData.alternativeAnswers
      : null) ||
    (Array.isArray(answerData.acceptedAnswers) && answerData.acceptedAnswers.length > 1
      ? answerData.acceptedAnswers.slice(1)
      : []) ||
    (Array.isArray(rawAlts) ? rawAlts : []) ||
    [];

  // If short_answer and acceptedAnswers exists, normalize
  if (type === 'short_answer' && Array.isArray(answerData.acceptedAnswers) && answerData.acceptedAnswers.length > 0) {
    if (!correctAnswer) correctAnswer = answerData.acceptedAnswers[0];
    if (alternativeAnswers.length === 0 && answerData.acceptedAnswers.length > 1) {
      alternativeAnswers = answerData.acceptedAnswers.slice(1);
    }
  }

  // Ensure clean string array
  const sanitizedAlts = (Array.isArray(alternativeAnswers) ? alternativeAnswers : [])
    .map((s: any) => (typeof s === 'string' ? s.trim() : String(s || '')))
    .filter(Boolean);

  // Extract options (only if array of MultipleChoiceOption)
  const resolvedOptions = Array.isArray(parsedOptions)
    ? parsedOptions
    : Array.isArray(answerData.options)
    ? answerData.options
    : undefined;

  const correctOptionId =
    row.correct_option_id ||
    answerData.correctOptionId ||
    (type === 'multiple_choice' ? correctAnswer : undefined);

  // Extract statement config
  const resolvedStatementConfig =
    parsedStatementConfig && (parsedStatementConfig.statement || parsedStatementConfig.isTrue !== undefined)
      ? parsedStatementConfig
      : answerData.statementConfig || undefined;

  // Extract multi part config
  const multiPartConfig = row.multi_part_config || answerData.multiPartConfig || undefined;

  const qObj: Question = {
    id: String(row.id),
    code: row.code || row.title || String(row.id),
    type: type,
    questionText: row.question_text || row.prompt || row.text || row.title || '',
    correctAnswer: String(correctAnswer || ''),
    alternativeAnswers: sanitizedAlts,
    points: Number(row.points) || 10,
    category:
      typeof row.category === 'string' && row.category.trim() !== ''
        ? row.category.trim()
        : typeof row.topic === 'string' && row.topic.trim() !== ''
        ? row.topic.trim()
        : undefined,
    explanation: row.explanation || row.pembahasan || undefined,
    unitHint: row.unit_hint || row.unit || undefined,
    options: resolvedOptions,
    correctOptionId,
    statementConfig: resolvedStatementConfig,
    multiPartConfig,
    timeLimitSeconds: row.time_limit_seconds ? Number(row.time_limit_seconds) : undefined,
    orderIndex: row.order_index !== undefined && row.order_index !== null ? Number(row.order_index) : undefined,
  };

  console.log('[MBB][QUESTION LOAD]', {
    id: row.id,
    category: row.category,
    topic: row.topic,
  });

  return qObj;
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
 * Adaptive question upsert that gracefully handles differences in Supabase schemas
 * by dynamically stripping out missing columns when PGRST204 errors are encountered.
 */
export const adaptiveUpsertQuestions = async (
  supabase: any,
  questions: { question: Question; orderIndex: number }[],
  competitionId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!questions || questions.length === 0) return { success: true };

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    attempts++;
    const rows = questions.map(({ question, orderIndex }) =>
      buildAdaptiveQuestionRow(question, competitionId, orderIndex, unsupportedQuestionColumns)
    );

    console.log('[MBB][DB QUESTION PAYLOAD]', rows.map((r) => ({ id: r.id, code: r.code, category: r.category })));

    const { error } = await supabase.from('questions').upsert(rows);
    if (!error) {
      rows.forEach((r) => {
        console.log('[MBB][QUESTION SAVED]', {
          id: r.id,
          category: r.category,
        });
      });
      return { success: true };
    }

    // Check for missing column error (PGRST204 or PostgreSQL column error)
    if (error.code === 'PGRST204' || (error.message && error.message.toLowerCase().includes('column'))) {
      const match =
        error.message.match(/Could not find the '([^']+)' column/i) ||
        error.message.match(/column "([^"]+)" of relation/i) ||
        error.message.match(/column '([^']+)'/i);

      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`[Supabase Adaptive Upsert] Kolom '${missingCol}' tidak ada di tabel 'questions'. Mengabaikan kolom ini.`);
        unsupportedQuestionColumns.add(missingCol);
        continue;
      }

      // If cannot parse specific column from message, sequentially remove optional non-core columns
      const candidateRemovals = [
        'alternative_answers',
        'statement_config',
        'multi_part_config',
        'options',
        'correct_option_id',
        'unit_hint',
        'question_type',
        'question_text',
        'prompt',
        'unit',
        'explanation',
        'time_limit_seconds',
        'points',
        'category',
      ];
      let removedAny = false;
      for (const col of candidateRemovals) {
        if (!unsupportedQuestionColumns.has(col)) {
          unsupportedQuestionColumns.add(col);
          removedAny = true;
          break;
        }
      }
      if (removedAny) continue;
    }

    // For any other error (or if all candidate columns tried)
    console.error('[Supabase Adaptive Upsert Error]', error);
    return { success: false, error: error.message };
  }

  return { success: false, error: 'Gagal menyimpan soal ke Supabase setelah beberapa percobaan.' };
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
    const res = await adaptiveUpsertQuestions(supabase, [{ question, orderIndex }], competitionId);
    if (res.success) {
      console.info(`[Supabase Bank Soal] Soal ${question.code} (${question.id}) berhasil disimpan.`);
    }
    return res;
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
 * Save all questions array to Supabase
 */
export const saveAllQuestionsToDb = async (
  competitionId: string,
  questions: Question[],
  pruneDeleted: boolean = false
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase || !competitionId) {
    return { success: false, error: 'Database belum terhubung.' };
  }

  try {
    if (questions.length > 0) {
      const qItems = questions.map((question, orderIndex) => ({ question, orderIndex }));
      const res = await adaptiveUpsertQuestions(supabase, qItems, competitionId);
      if (!res.success) {
        return res;
      }
    }

    // Clean up only if explicitly requested (e.g. bulk full-bank replacement)
    if (pruneDeleted) {
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

    const masterQuestions: Question[] = (questionsData || []).map(dbRowToQuestion);

    const settings: GameSettings = {
      matchTitle: compData.title || 'MEASUREMENT BLOCK BLAST',
      roundName: compData.round_name || 'BABAK PENYISIHAN UTAMA',
      playlistMode: (compData.playlist_mode as any) || (compData.selected_topic ? 'topic' : 'all'),
      playlistName: compData.playlist_name || undefined,
      selectedTopic: compData.selected_topic || '',
      selectedTopics: Array.isArray(compData.selected_topics) ? compData.selected_topics : undefined,
      customQuestionIds: Array.isArray(compData.custom_question_ids) ? compData.custom_question_ids : undefined,
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

    // Resolve Active Match Question Snapshot based on playlist configuration & customQuestionIds
    let activeQuestions: Question[] = [];
    const activeQuestionIds = Array.isArray(compData.custom_question_ids) ? compData.custom_question_ids : [];

    if (activeQuestionIds.length > 0) {
      const qMap = new Map(masterQuestions.map((q) => [q.id, q]));
      activeQuestions = activeQuestionIds.map((id) => qMap.get(id)).filter(Boolean) as Question[];
    }

    if (activeQuestions.length === 0) {
      activeQuestions = filterQuestionsByPlaylist(masterQuestions, {
        playlistMode: settings.playlistMode,
        selectedTopic: settings.selectedTopic,
        selectedTopics: settings.selectedTopics,
        customQuestionIds: settings.customQuestionIds,
      });
    }

    if (activeQuestions.length === 0) {
      activeQuestions = masterQuestions;
    }

    console.log('[LOAD] Master Questions:', masterQuestions.length);
    console.log('[LOAD] Active Question IDs:', activeQuestions.map((q) => q.id));
    console.log('[LOAD] Active Questions:', activeQuestions.map((q) => q.code));

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

    return {
      competitionId: compData.id,
      createdBy: compData.created_by || undefined,
      startedAt: compData.started_at ? Number(compData.started_at) : null,
      orderLocked: compData.order_locked ?? false,
      activeQuestionIds: activeQuestions.map((q) => q.id),
      settings,
      teams,
      questions: activeQuestions, // ACTIVE MATCH SNAPSHOT ONLY (DO NOT USE MASTER QUESTIONS)
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
 * Dynamic adaptive competition row builder that strips missing columns
 */
export const buildAdaptiveCompetitionRow = (
  compRow: Record<string, any>,
  excludeCols: Set<string> = unsupportedCompetitionColumns
): Record<string, any> => {
  const row = { ...compRow };
  for (const col of excludeCols) {
    delete row[col];
  }
  return row;
};

/**
 * Adaptive competition upsert that gracefully handles differences in Supabase schemas
 * by dynamically stripping out missing columns (like order_locked, playlist_mode, etc.)
 * when PGRST204 errors are encountered.
 */
export const adaptiveUpsertCompetition = async (
  supabase: any,
  compRow: Record<string, any>
): Promise<{ success: boolean; error?: any }> => {
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    attempts++;
    const rowToSave = buildAdaptiveCompetitionRow(compRow, unsupportedCompetitionColumns);

    const { error } = await supabase.from('competitions').upsert(rowToSave);
    if (!error) {
      return { success: true };
    }

    // Check for missing column error (PGRST204 or PostgreSQL column error)
    if (error.code === 'PGRST204' || (error.message && error.message.toLowerCase().includes('column'))) {
      const match =
        error.message.match(/Could not find the '([^']+)' column/i) ||
        error.message.match(/column "([^"]+)" of relation/i) ||
        error.message.match(/column '([^']+)'/i);

      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`[Supabase Adaptive Comp] Kolom '${missingCol}' belum ada di tabel 'competitions'. Mengabaikan kolom ini secara adaptif.`);
        unsupportedCompetitionColumns.add(missingCol);
        continue;
      }

      // If specific column name cannot be parsed from regex, strip optional candidate columns sequentially
      const candidateCompRemovals = [
        'created_by',
        'order_locked',
        'playlist_mode',
        'playlist_name',
        'selected_topics',
        'custom_question_ids',
        'selected_topic',
        'enable_question_timer',
        'question_time_limit_seconds',
        'wrong_answer_rule',
        'case_sensitive',
        'sound_enabled',
        'last_evaluation',
        'active_since',
        'active_card_number',
        'active_team_id',
        'started_at',
        'time_remaining_seconds',
      ];
      let removedAny = false;
      for (const col of candidateCompRemovals) {
        if (!unsupportedCompetitionColumns.has(col) && rowToSave[col] !== undefined) {
          unsupportedCompetitionColumns.add(col);
          removedAny = true;
          break;
        }
      }
      if (removedAny) continue;
    }

    // If it is table missing (PGRST205)
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      console.warn('[Save Comp Supabase] Tabel belum siap di Supabase. Jalankan skema SQL di SQL Editor Supabase untuk mengaktifkan sinkronisasi.');
      return { success: false, error };
    }

    console.error('[Save Comp Error]', error);
    return { success: false, error };
  }

  return { success: false, error: new Error('Gagal menyimpan kompetisi ke Supabase setelah beberapa percobaan.') };
};

/**
 * Save complete GameState to Supabase (Full sync / migration)
 */
export const saveCompetitionToDb = async (state: GameState, competitionId: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const roomId = competitionId || state.competitionId || DEFAULT_ROOM_ID;

    const activeQIds =
      state.activeQuestionIds && state.activeQuestionIds.length > 0
        ? state.activeQuestionIds
        : state.settings.customQuestionIds && state.settings.customQuestionIds.length > 0
        ? state.settings.customQuestionIds
        : state.questions && state.questions.length > 0
        ? state.questions.map((q) => q.id)
        : null;

    // 1. Upsert competition using adaptive column stripper
    const compRow: Record<string, any> = {
      id: roomId,
      created_by: state.createdBy || null,
      title: state.settings.matchTitle,
      round_name: state.settings.roundName,
      playlist_mode: state.settings.playlistMode || (state.settings.selectedTopic ? 'topic' : 'all'),
      playlist_name: state.settings.playlistName || null,
      selected_topic: state.settings.selectedTopic || null,
      selected_topics: state.settings.selectedTopics || null,
      custom_question_ids: activeQIds,
      duration_minutes: state.settings.durationMinutes,
      question_time_limit_seconds: state.settings.questionTimeLimitSeconds ?? 30,
      enable_question_timer: state.settings.enableQuestionTimer ?? true,
      points_per_correct: state.settings.pointsPerCorrect,
      penalty_wrong: state.settings.penaltyWrong,
      wrong_answer_rule: state.settings.wrongAnswerRule,
      case_sensitive: state.settings.caseSensitive,
      sound_enabled: state.settings.soundEnabled,
      order_locked: state.orderLocked ?? false,
      status: state.status,
      time_remaining_seconds: state.timeRemainingSeconds,
      started_at: state.startedAt || null,
      active_team_id: state.activeTeamId,
      active_card_number: state.activeQuestionIndex,
      active_since: state.activeSince,
      last_evaluation: state.lastEvaluation,
      updated_at: new Date().toISOString(),
    };

    const compRes = await adaptiveUpsertCompetition(supabase, compRow);
    if (!compRes.success) {
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
    const cleanPatch: Record<string, any> = { ...patch, updated_at: new Date().toISOString() };
    for (const col of unsupportedCompetitionColumns) {
      delete cleanPatch[col];
    }

    const { error } = await supabase
      .from('competitions')
      .update(cleanPatch)
      .eq('id', competitionId);

    if (error && (error.code === 'PGRST204' || (error.message && error.message.toLowerCase().includes('column')))) {
      const match =
        error.message.match(/Could not find the '([^']+)' column/i) ||
        error.message.match(/column "([^"]+)" of relation/i) ||
        error.message.match(/column '([^']+)'/i);
      if (match && match[1]) {
        unsupportedCompetitionColumns.add(match[1]);
        delete cleanPatch[match[1]];
        await supabase.from('competitions').update(cleanPatch).eq('id', competitionId);
      }
    }
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

/**
 * Explicitly update the order_locked status for a competition
 */
export const setCompetitionOrderLockedInDb = async (
  competitionId: string,
  locked: boolean
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase client tidak tersedia.' };

  if (unsupportedCompetitionColumns.has('order_locked')) {
    // Column not available on remote table yet, local state remains locked safely
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('competitions')
      .update({
        order_locked: locked,
        updated_at: new Date().toISOString(),
      })
      .eq('id', competitionId);

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('order_locked') || error.message?.includes('column')) {
        console.warn(`[Supabase setOrderLocked] Kolom 'order_locked' belum ada di schema DB remote. Status kunci tetap diamankan secara lokal.`);
        unsupportedCompetitionColumns.add('order_locked');
        return { success: true };
      }
      console.error('[setCompetitionOrderLockedInDb Error]', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[setCompetitionOrderLockedInDb Exception]', err);
    return { success: false, error: err?.message || 'Gagal mengubah status kunci urutan.' };
  }
};

/**
 * Fetch teacher / admin user profile from Supabase profiles table
 */
export const getUserProfileFromDb = async (userId: string): Promise<UserProfile | null> => {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('profiles')) {
        return null;
      }
      console.warn('[getUserProfileFromDb Warning]', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: data.email || '',
      name: data.name || undefined,
      role: (data.role as any) || 'teacher',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error('[getUserProfileFromDb Error]', err);
    return null;
  }
};

/**
 * Upsert teacher / admin user profile in Supabase profiles table
 */
export const upsertUserProfileInDb = async (
  profile: Partial<UserProfile> & { id: string }
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabase();
  if (!supabase || !profile.id) return { success: false, error: 'Database / ID tidak tersedia.' };

  try {
    const payload: Record<string, any> = {
      id: profile.id,
      email: profile.email || null,
      name: profile.name || null,
      role: profile.role || 'teacher',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('profiles')) {
        return { success: true };
      }
      console.error('[upsertUserProfileInDb Error]', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[upsertUserProfileInDb Exception]', err);
    return { success: false, error: err?.message || 'Gagal menyimpan profil pengguna.' };
  }
};


