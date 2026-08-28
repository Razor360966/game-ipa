import { Question, Team, TeamCardAssignment, TeamColor, PlaylistMode, QuestionPlaylist, QuestionVariant } from '../types';
import { resolveTeamQuestionVariants } from './variantEngine';
import { filterQuestionPool, normalizeDifficulty, getDifficultyLabel, getDifficultyBadgeConfig, balancedLevelDistribution, getDifficultyDistribution, validateTeamFairness } from './questionPool';

export {
  resolveTeamQuestionVariants,
  getResolvedQuestionForTeam,
  validateTeamQuestionDistribution,
  computeVariantSnapshotHash,
  deterministicHash,
} from './variantEngine';

export {
  filterQuestionPool,
  normalizeDifficulty,
  getDifficultyLabel,
  getDifficultyBadgeConfig,
  balancedLevelDistribution,
  getDifficultyDistribution,
  validateTeamFairness,
} from './questionPool';

export const INITIAL_TEAMS: Team[] = [
  { id: 'team-alpha', name: 'ALPHA', color: 'cyan', score: 0, correctCount: 0, wrongCount: 0 },
  { id: 'team-bravo', name: 'BRAVO', color: 'emerald', score: 0, correctCount: 0, wrongCount: 0 },
  { id: 'team-charlie', name: 'CHARLIE', color: 'amber', score: 0, correctCount: 0, wrongCount: 0 },
  { id: 'team-delta', name: 'DELTA', color: 'rose', score: 0, correctCount: 0, wrongCount: 0 },
];

export const COLOR_MAP: Record<
  TeamColor,
  {
    bg: string;
    bgHover: string;
    border: string;
    borderActive: string;
    text: string;
    badge: string;
    glow: string;
    accent: string;
  }
> = {
  cyan: {
    bg: 'bg-cyan-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-cyan-500/15 hover:border-cyan-400/50',
    border: 'border-cyan-400/30',
    borderActive: 'border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.3)] ring-2 ring-cyan-400/50',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(34,211,238,0.25)]',
    accent: '#22d3ee',
  },
  emerald: {
    bg: 'bg-emerald-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-emerald-500/15 hover:border-emerald-400/50',
    border: 'border-emerald-400/30',
    borderActive: 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.3)] ring-2 ring-emerald-400/50',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(52,211,153,0.25)]',
    accent: '#34d399',
  },
  amber: {
    bg: 'bg-amber-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-amber-500/15 hover:border-amber-400/50',
    border: 'border-amber-400/30',
    borderActive: 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.3)] ring-2 ring-amber-400/50',
    text: 'text-amber-400',
    badge: 'bg-amber-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(251,191,36,0.25)]',
    accent: '#fbbf24',
  },
  rose: {
    bg: 'bg-rose-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-rose-500/15 hover:border-rose-400/50',
    border: 'border-rose-400/30',
    borderActive: 'border-rose-400 shadow-[0_0_35px_rgba(251,113,133,0.3)] ring-2 ring-rose-400/50',
    text: 'text-rose-400',
    badge: 'bg-rose-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(251,113,133,0.25)]',
    accent: '#fb7185',
  },
  purple: {
    bg: 'bg-purple-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-purple-500/15 hover:border-purple-400/50',
    border: 'border-purple-400/30',
    borderActive: 'border-purple-400 shadow-[0_0_35px_rgba(192,132,252,0.3)] ring-2 ring-purple-400/50',
    text: 'text-purple-400',
    badge: 'bg-purple-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(192,132,252,0.25)]',
    accent: '#c084fc',
  },
  blue: {
    bg: 'bg-blue-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-blue-500/15 hover:border-blue-400/50',
    border: 'border-blue-400/30',
    borderActive: 'border-blue-400 shadow-[0_0_35px_rgba(96,165,250,0.3)] ring-2 ring-blue-400/50',
    text: 'text-blue-400',
    badge: 'bg-blue-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(96,165,250,0.25)]',
    accent: '#60a5fa',
  },
  orange: {
    bg: 'bg-orange-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-orange-500/15 hover:border-orange-400/50',
    border: 'border-orange-400/30',
    borderActive: 'border-orange-400 shadow-[0_0_35px_rgba(251,146,60,0.3)] ring-2 ring-orange-400/50',
    text: 'text-orange-400',
    badge: 'bg-orange-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(251,146,60,0.25)]',
    accent: '#fb923c',
  },
  indigo: {
    bg: 'bg-indigo-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-indigo-500/15 hover:border-indigo-400/50',
    border: 'border-indigo-400/30',
    borderActive: 'border-indigo-400 shadow-[0_0_35px_rgba(129,140,248,0.3)] ring-2 ring-indigo-400/50',
    text: 'text-indigo-400',
    badge: 'bg-indigo-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(129,140,248,0.25)]',
    accent: '#818cf8',
  },
};

export const DEMO_QUESTIONS: Question[] = [
  {
    id: 'q-01',
    code: 'MB-01',
    type: 'short_answer',
    questionText: 'Berapa centimeter (cm) dalam 2,5 meter?',
    correctAnswer: '250 cm',
    alternativeAnswers: ['250', '250cm', '250 centimeter', '250 cm'],
    points: 10,
    category: 'Konversi Panjang',
    difficulty: 'easy',
    explanation: '1 meter = 100 cm, maka 2,5 m × 100 = 250 cm.',
    unitHint: 'cm',
  },
  {
    id: 'q-02',
    code: 'MB-02',
    type: 'multiple_choice',
    questionText: 'Alat ukur yang paling tepat dan teliti untuk mengukur diameter luar koin atau kelereng adalah...',
    correctAnswer: 'B',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A', text: 'Mistar Kayu' },
      { id: 'B', label: 'B', text: 'Jangka Sorong' },
      { id: 'C', label: 'C', text: 'Meteran Pita' },
      { id: 'D', label: 'D', text: 'Neraca Ohaus' },
    ],
    alternativeAnswers: ['Jangka Sorong', 'jangka sorong', 'B'],
    points: 10,
    category: 'Alat Ukur',
    difficulty: 'medium',
    explanation: 'Jangka sorong memiliki rahang bawah untuk mengukur diameter luar benda bundar dengan ketelitian 0,01 cm.',
  },
  {
    id: 'q-03',
    code: 'MB-03',
    type: 'short_answer',
    questionText: 'Sebuah balok kayu memiliki panjang 8 cm, lebar 5 cm, dan tinggi 3 cm. Berapakah volume balok tersebut dalam cm³?',
    correctAnswer: '120 cm³',
    alternativeAnswers: ['120', '120 cm3', '120cm3', '120 cm^3', '120 kubik'],
    points: 10,
    category: 'Volume & Geometri',
    difficulty: 'medium',
    explanation: 'Volume balok = panjang × lebar × tinggi = 8 × 5 × 3 = 120 cm³.',
    unitHint: 'cm³',
  },
  {
    id: 'q-04',
    code: 'MB-04',
    type: 'multiple_choice',
    questionText: 'Satuan Internasional (SI) yang sah untuk besaran pokok Suhu Mutlak adalah...',
    correctAnswer: 'C',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A', text: 'Derajat Celcius (°C)' },
      { id: 'B', label: 'B', text: 'Derajat Fahrenheit (°F)' },
      { id: 'C', label: 'C', text: 'Kelvin (K)' },
      { id: 'D', label: 'D', text: 'Reamur (°R)' },
    ],
    alternativeAnswers: ['Kelvin', 'kelvin', 'C', 'K'],
    points: 10,
    category: 'Besaran & Satuan SI',
    difficulty: 'easy',
    explanation: 'Dalam sistem Satuan Internasional (SI), standar baku suhu mutlak adalah Kelvin (K).',
  },
  {
    id: 'q-05',
    code: 'MB-05',
    type: 'statement_correction',
    questionText: 'Periksa kebenaran pernyataan berikut: "1 kilogram massa benda setara dengan 100 gram."',
    correctAnswer: 'SALAH (Koreksi: 1000 gram)',
    alternativeAnswers: ['1000 gram', '1000 g', '1000g', '1000'],
    points: 10,
    category: 'Pernyataan Konversi Massa',
    difficulty: 'easy',
    explanation: '1 kilogram = 1.000 gram (kilo = 10³ = seribu).',
    statementConfig: {
      statement: '1 kilogram massa benda setara dengan 100 gram.',
      isTrue: false,
      correctionKey: '1000 gram',
      correctionAlternatives: ['1000 gram', '1000 g', '1000', '1000gram', '1 kg = 1000 g'],
      scoringMode: 'partial',
    },
  },
  {
    id: 'q-06',
    code: 'MB-06',
    type: 'short_answer',
    questionText: 'Jika sebuah mobil menempuh jarak 120 km dalam waktu 2 jam, berapakah kecepatan rata-rata mobil tersebut dalam km/jam?',
    correctAnswer: '60 km/jam',
    alternativeAnswers: ['60', '60 kmh', '60km/jam', '60 km / jam'],
    points: 10,
    category: 'Kecepatan & Waktu',
    difficulty: 'medium',
    explanation: 'Kecepatan v = s / t = 120 km / 2 jam = 60 km/jam.',
    unitHint: 'km/jam',
  },
  {
    id: 'q-07',
    code: 'MB-07',
    type: 'statement_correction',
    questionText: 'Periksa kebenaran pernyataan berikut: "Mikrometer sekrup memiliki tingkat ketelitian 0,01 mm dan dapat digunakan untuk mengukur ketebalan koin atau kertas tipis."',
    correctAnswer: 'BENAR',
    alternativeAnswers: ['benar', 'true'],
    points: 10,
    category: 'Pernyataan Alat Ukur',
    difficulty: 'medium',
    explanation: 'Pernyataan benar, mikrometer sekrup memiliki ketelitian 0,01 mm atau 0,001 cm.',
    statementConfig: {
      statement: 'Mikrometer sekrup memiliki tingkat ketelitian 0,01 mm dan dapat digunakan untuk mengukur ketebalan koin atau kertas tipis.',
      isTrue: true,
      scoringMode: 'full',
    },
  },
  {
    id: 'q-08',
    code: 'MB-08',
    type: 'multi_part',
    questionText: 'Soal Terstruktur: Analisis Massa Jenis dan Daya Apung Benda Logam',
    correctAnswer: 'Part 1: 4 g/cm³ | Part 2: Tenggelam',
    alternativeAnswers: [],
    points: 10,
    category: 'Soal Terstruktur',
    difficulty: 'hard',
    explanation: 'ρ = m / V = 200 / 50 = 4 g/cm³. Karena ρ benda (4 g/cm³) > ρ air (1 g/cm³), benda akan tenggelam.',
    multiPartConfig: {
      introduction: 'Sebuah balok padat memiliki massa 200 gram dan volume 50 cm³. Balok tersebut kemudian dimasukkan ke dalam bejana berisi air (massa jenis air = 1 g/cm³).',
      scoringMode: 'partial',
      parts: [
        {
          id: 'mp-1',
          question: 'Berapakah massa jenis (densitas) balok padat tersebut dalam g/cm³?',
          correctAnswer: '4 g/cm³',
          alternativeAnswers: ['4', '4 g/cm3', '4g/cm3', '4 g/cm^3'],
        },
        {
          id: 'mp-2',
          question: 'Apakah balok tersebut akan Terapung, Melayang, atau Tenggelam di dalam air?',
          correctAnswer: 'Tenggelam',
          alternativeAnswers: ['tenggelam', 'Tenggelam.', 'akan tenggelam'],
        },
      ],
    },
  },
  {
    id: 'q-09',
    code: 'MB-09',
    type: 'multiple_choice',
    questionText: 'Dari kelompok besaran fisika berikut, manakah yang seluruhnya merupakan Besaran Pokok dalam SI?',
    correctAnswer: 'A',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A', text: 'Panjang, Massa, Waktu, Suhu' },
      { id: 'B', label: 'B', text: 'Kecepatan, Percepatan, Gaya, Usaha' },
      { id: 'C', label: 'C', text: 'Volume, Luas, Massa Jenis, Daya' },
      { id: 'D', label: 'D', text: 'Energi, Tegangan, Kuat Arus, Tekanan' },
    ],
    alternativeAnswers: ['A'],
    points: 10,
    category: 'Besaran Pokok & Turunan',
    difficulty: 'easy',
    explanation: '7 besaran pokok: Panjang, Massa, Waktu, Suhu, Kuat Arus, Intensitas Cahaya, Jumlah Zat.',
  },
  {
    id: 'q-10',
    code: 'MB-10',
    type: 'short_answer',
    questionText: 'Berapa detik dalam waktu 15 menit?',
    correctAnswer: '900 detik',
    alternativeAnswers: ['900', '900 s', '900 s', '900detik', '900 sekon'],
    points: 10,
    category: 'Konversi Waktu',
    difficulty: 'easy',
    explanation: '1 menit = 60 detik. 15 menit × 60 = 900 detik.',
    unitHint: 'detik',
  },
];

export const DEFAULT_QUESTIONS: Question[] = DEMO_QUESTIONS;

/**
 * Returns an appropriate contextual emoji icon based on topic/category name.
 */
export function getTopicIcon(topicName: string): string {
  if (!topicName) return '📚';
  const lower = topicName.toLowerCase();
  if (lower === 'all' || lower.includes('semua')) return '🎯';
  if (lower.includes('suhu') || lower.includes('termometer') || lower.includes('kalor') || lower.includes('panas')) return '🌡️';
  if (lower.includes('panjang') || lower.includes('ukur') || lower.includes('jangka') || lower.includes('mikrometer') || lower.includes('pengukuran')) return '📏';
  if (lower.includes('tekanan') || lower.includes('gas') || lower.includes('fluida') || lower.includes('hidrostatis')) return '💨';
  if (lower.includes('listrik') || lower.includes('energi') || lower.includes('daya') || lower.includes('tegangan') || lower.includes('arus')) return '⚡';
  if (lower.includes('gelombang') || lower.includes('getaran') || lower.includes('bunyi') || lower.includes('frekuensi')) return '🌊';
  if (lower.includes('massa') || lower.includes('berat') || lower.includes('neraca') || lower.includes('timbangan')) return '⚖️';
  if (lower.includes('waktu') || lower.includes('stopwatch') || lower.includes('periode') || lower.includes('detik')) return '⏱️';
  if (lower.includes('gerak') || lower.includes('kecepatan') || lower.includes('gaya') || lower.includes('percepatan')) return '🚀';
  if (lower.includes('optik') || lower.includes('cahaya') || lower.includes('cermin') || lower.includes('lensa')) return '🔍';
  if (lower.includes('sel') || lower.includes('pernapasan') || lower.includes('organ') || lower.includes('ekosistem') || lower.includes('tumbuhan') || lower.includes('hewan') || lower.includes('biologi')) return '🧬';
  if (lower.includes('zat') || lower.includes('larutan') || lower.includes('asam') || lower.includes('basa') || lower.includes('kimia') || lower.includes('unsur') || lower.includes('senyawa')) return '🧪';
  if (lower.includes('astronomi') || lower.includes('tata surya') || lower.includes('planet') || lower.includes('bumi') || lower.includes('bulan')) return '🪐';
  if (lower.includes('hots') || lower.includes('olimpiade') || lower.includes('kompetisi') || lower.includes('juara')) return '🏆';
  if (lower.includes('remedial') || lower.includes('ulangan') || lower.includes('evaluasi') || lower.includes('bab')) return '📝';
  if (lower.includes('tanpa topik') || lower.includes('uncategorized')) return '📋';
  return '📑';
}

/**
 * Category Normalization Helper (Phase 4 requirement)
 * Normalizes a category name for grouping and playlist matching (case-insensitive and trimmed).
 * e.g. "Suhu" -> "suhu", " suhu " -> "suhu", "SUHU" -> "suhu".
 * Does NOT alter the original category text stored in question.
 */
export function normalizeQuestionCategory(category?: string): string {
  if (!category) return '';
  return category.trim().toLowerCase();
}

/**
 * Backward compatibility alias for normalizeQuestionCategory
 */
export const normalizeCategoryKey = normalizeQuestionCategory;

export interface QuestionCategoryItem {
  key: string;
  label: string;
  count: number;
}

/**
 * Extracts unique topic/category names and their question counts from Master Question Bank.
 * Returns structured items sorted alphabetically for clean UI rendering.
 */
export function getQuestionCategoryItems(questions: Question[]): QuestionCategoryItem[] {
  if (!questions || questions.length === 0) return [];
  const map = new Map<string, { label: string; count: number }>();

  questions.forEach((q) => {
    const raw = q.category?.trim();
    if (raw) {
      const key = normalizeQuestionCategory(raw);
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { label: raw, count: 1 });
      }
    }
  });

  return Array.from(map.entries())
    .map(([key, item]) => ({
      key,
      label: item.label,
      count: item.count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id', { sensitivity: 'base' }));
}

/**
 * Extracts unique topic/category names from a list of questions, sorted alphabetically.
 * Case-insensitive deduplication, preserving the first cleanest display format.
 */
export function getUniqueQuestionCategories(questions: Question[]): string[] {
  if (!questions || questions.length === 0) return [];
  return getQuestionCategoryItems(questions).map((item) => item.label);
}

/**
 * Auto-generates structured Question Playlists from Master Question Bank based on question categories.
 * Single Source of Truth: The "category" field of each question is the sole source for grouping.
 * 
 * Rules:
 * 1. Takes all questions from master bank.
 * 2. Reads `q.category`.
 * 3. Normalizes category (e.g. "Suhu", "suhu", " Suhu " map to the same playlist).
 * 4. Sorts questions in each playlist strictly by `orderIndex ASC` (preserving master sequence).
 * 5. Returns "Semua Topik" as primary playlist plus all topic playlists with live counts.
 * 6. Adds "Tanpa Topik" playlist if there are questions with empty category.
 */
export function getQuestionPlaylists(questions: Question[]): QuestionPlaylist[] {
  if (!questions || questions.length === 0) {
    return [
      {
        id: 'all',
        name: 'Semua Topik',
        count: 0,
        questionIds: [],
        questions: [],
        icon: '🎯',
        isDefaultAll: true,
      },
    ];
  }

  // Sort master pool by orderIndex ASC
  const sortedMaster = [...questions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  // Map for category groups: normalizedKey -> { displayName, questions: Question[] }
  const categoryGroups = new Map<string, { displayName: string; questions: Question[] }>();
  const uncategorizedQuestions: Question[] = [];

  sortedMaster.forEach((q) => {
    const rawCat = q.category?.trim();
    if (!rawCat) {
      uncategorizedQuestions.push(q);
      return;
    }

    const key = normalizeCategoryKey(rawCat);
    if (!categoryGroups.has(key)) {
      categoryGroups.set(key, {
        displayName: rawCat,
        questions: [q],
      });
    } else {
      categoryGroups.get(key)!.questions.push(q);
    }
  });

  // 1. Primary "Semua Topik" Playlist
  const allPlaylist: QuestionPlaylist = {
    id: 'all',
    name: 'Semua Topik',
    count: sortedMaster.length,
    questionIds: sortedMaster.map((q) => q.id),
    questions: sortedMaster,
    icon: '🎯',
    isDefaultAll: true,
  };

  // 2. Category Playlists (sorted alphabetically by display name)
  const topicPlaylists: QuestionPlaylist[] = Array.from(categoryGroups.entries())
    .map(([key, group]) => {
      const qList = group.questions.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      return {
        id: key,
        name: group.displayName,
        count: qList.length,
        questionIds: qList.map((q) => q.id),
        questions: qList,
        icon: getTopicIcon(group.displayName),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

  // 3. Optional "Tanpa Topik" Playlist if questions without category exist
  const result: QuestionPlaylist[] = [allPlaylist, ...topicPlaylists];

  if (uncategorizedQuestions.length > 0) {
    const sortedUncat = uncategorizedQuestions.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    result.push({
      id: 'uncategorized',
      name: 'Tanpa Topik',
      count: sortedUncat.length,
      questionIds: sortedUncat.map((q) => q.id),
      questions: sortedUncat,
      icon: '📋',
    });
  }

  return result;
}

/**
 * Filters questions by category/topic.
 * - If topic is empty, undefined, "ALL", or "Semua Topik" -> returns all questions sorted by orderIndex ASC.
 * - If topic is "Tanpa Topik" / "uncategorized" -> returns questions with empty/whitespace category.
 * - Otherwise, matches normalized category key.
 * - Strictly maintains single-source orderIndex ASC.
 */
export function filterQuestionsByCategory(questions: Question[], category?: string): Question[] {
  if (!questions || questions.length === 0) return [];
  
  const sorted = [...questions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  
  if (!category || !category.trim() || category === '__ALL__') {
    return sorted;
  }

  const normalized = normalizeCategoryKey(category);
  if (normalized === 'all' || normalized === 'semua' || normalized === 'semua topik' || normalized === '__all__') {
    return sorted;
  }

  if (normalized === 'tanpa topik' || normalized === 'uncategorized') {
    return sorted.filter((q) => !q.category || !q.category.trim());
  }

  return sorted.filter((q) => normalizeCategoryKey(q.category) === normalized);
}

export interface PlaylistFilterOptions {
  playlistMode?: PlaylistMode;
  selectedTopic?: string;
  selectedTopics?: string[];
  selectedDifficulty?: string;
  questionCount?: number;
  customQuestionIds?: string[];
  competitionId?: string;
}

/**
 * Filters Master Question Bank into match questions snapshot based on Playlist settings:
 * 1. 'all': All questions from master pool in their defined sequence.
 * 2. 'topic': Questions filtered by single selectedTopic.
 * 3. 'custom': Questions filtered by custom selection (customQuestionIds, or fallback selectedTopics).
 * Also integrates Topic + Difficulty Level + Balanced Distribution constraints.
 * Strictly preserves master question order / sequence!
 */
export function filterQuestionsByPlaylist(
  questions: Question[],
  options: PlaylistFilterOptions
): Question[] {
  if (!questions || questions.length === 0) return [];
  const mode = options.playlistMode || 'all';

  // If difficulty filter or count limit is explicitly set, route via filterQuestionPool
  if (options.selectedDifficulty || (options.questionCount && options.questionCount > 0)) {
    let targetTopic = '';
    if (mode === 'topic') {
      targetTopic = options.selectedTopic || '';
    }

    const result = filterQuestionPool({
      questions,
      topic: targetTopic,
      difficulty: options.selectedDifficulty,
      count: options.questionCount,
      customQuestionIds: mode === 'custom' ? options.customQuestionIds : undefined,
      competitionId: options.competitionId,
    });
    return result.selectedQuestions;
  }

  if (mode === 'all') {
    return filterQuestionsByCategory(questions, '');
  }

  if (mode === 'topic') {
    return filterQuestionsByCategory(questions, options.selectedTopic);
  }

  if (mode === 'custom') {
    const customIds = options.customQuestionIds;
    if (customIds && customIds.length > 0) {
      const idSet = new Set(customIds);
      // Filter from master pool preserving order_index / sequence
      return [...questions]
        .filter((q) => idSet.has(q.id))
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    }

    // Fallback if multiple topics selected but no individual IDs
    const topics = options.selectedTopics;
    if (topics && topics.length > 0) {
      const normalizedTopics = new Set(topics.map((t) => normalizeCategoryKey(t)));
      return [...questions]
        .filter((q) => normalizedTopics.has(normalizeCategoryKey(q.category)))
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    }

    return filterQuestionsByCategory(questions, '');
  }

  return filterQuestionsByCategory(questions, '');
}

/**
 * Generates initial/demo state with 4 teams, 10 questions, 5 min duration
 */
export function createDemoState(): {
  teams: Team[];
  questions: Question[];
  durationMinutes: number;
  teamQuestionVariants?: Record<string, Record<string, QuestionVariant>>;
} {
  const teams: Team[] = [
    { id: 'team-alpha', name: 'ALPHA', color: 'cyan', score: 0, correctCount: 0, wrongCount: 0 },
    { id: 'team-bravo', name: 'BRAVO', color: 'emerald', score: 0, correctCount: 0, wrongCount: 0 },
    { id: 'team-charlie', name: 'CHARLIE', color: 'amber', score: 0, correctCount: 0, wrongCount: 0 },
    { id: 'team-delta', name: 'DELTA', color: 'rose', score: 0, correctCount: 0, wrongCount: 0 },
  ];
  const questions = [...DEMO_QUESTIONS];
  return {
    teams,
    questions,
    durationMinutes: 5,
    teamQuestionVariants: resolveTeamQuestionVariants(teams, questions),
  };
}

/**
 * Generates fixed, deterministic card decks for all teams from question pool.
 * CORE RULE (SINGLE SOURCE OF TRUTH):
 * Every team gets ALL questions in the EXACT order of the question bank (order_index / array sequence).
 * Card 1 = Question 1, Card 2 = Question 2, ..., Card N = Question N for all teams.
 * This guarantees 100% consistency across Print, Admin Editor, DB, and Game Arena.
 */
export function generateTeamCardDecks(
  teams: Team[],
  questions: Question[],
  _cardsPerTeam?: number,
  randomized: boolean = false
): Record<string, TeamCardAssignment[]> {
  const decks: Record<string, TeamCardAssignment[]> = {};
  if (!questions || questions.length === 0 || !teams || teams.length === 0) {
    return decks;
  }

  // Generate deck for each team
  teams.forEach((team) => {
    const teamPrefix = team.name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'K';

    // If randomized is requested, create a unique permutation for this team
    let teamQuestions = [...questions];
    if (randomized) {
      for (let i = teamQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teamQuestions[i], teamQuestions[j]] = [teamQuestions[j], teamQuestions[i]];
      }
    }

    const cards: TeamCardAssignment[] = teamQuestions.map((q, cardIndex) => {
      const cardNum = cardIndex + 1;
      const formattedNum = String(cardNum).padStart(2, '0');
      return {
        cardNumber: cardNum,
        cardCode: `${teamPrefix}-${formattedNum}`,
        questionId: q.id,
        status: 'unanswered',
        attempts: 0,
      };
    });

    decks[team.id] = cards;
  });

  return decks;
}

export interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
  totalCards: number;
  questionsCount: number;
  teamsCount: number;
}

/**
 * Validates question bank and team card decks against MBB Core Rules:
 * 1. Minimal 1 question
 * 2. Minimal 1 team
 * 3. All questions have complete data
 * 4. Every team has exactly questions.length cards
 * 5. No duplicates within any team's deck
 * 6. Set of questions in each deck === Set of questions in bank
 * 7. All teams have mapping
 */
export function validateDecksAndQuestions(
  teams: Team[],
  questions: Question[],
  teamCardDecks: Record<string, TeamCardAssignment[]>
): DeckValidationResult {
  const errors: string[] = [];
  const questionsCount = questions.length;
  const teamsCount = teams.length;
  const totalCards = questionsCount * teamsCount;

  if (questionsCount === 0) {
    errors.push('Bank Soal masih kosong. Tambahkan minimal 1 soal.');
  }

  if (teamsCount === 0) {
    errors.push('Belum ada kelompok peserta. Tambahkan minimal 1 kelompok.');
  }

  // Check question completeness
  const incompleteQuestions = questions.filter(
    (q) => !q.questionText || !q.questionText.trim() || !q.correctAnswer || !q.correctAnswer.trim()
  );
  if (incompleteQuestions.length > 0) {
    errors.push(`${incompleteQuestions.length} soal belum memiliki pertanyaan atau kunci jawaban lengkap.`);
  }

  const bankQuestionIdSet = new Set(questions.map((q) => q.id));

  // Check each team's deck
  teams.forEach((team) => {
    const deck = teamCardDecks[team.id];
    if (!deck || deck.length === 0) {
      errors.push(`Kelompok "${team.name}" belum memiliki mapping urutan kartu soal.`);
      return;
    }

    if (deck.length !== questionsCount) {
      errors.push(
        `Kelompok "${team.name}" memiliki ${deck.length} kartu, seharusnya ${questionsCount} kartu (sesuai Bank Soal).`
      );
    }

    const deckQuestionIds = deck.map((c) => c.questionId);
    const uniqueDeckQuestionIds = new Set(deckQuestionIds);

    if (uniqueDeckQuestionIds.size !== deckQuestionIds.length) {
      errors.push(`Ditemukan soal duplikat pada kelompok "${team.name}".`);
    }

    // Check if every question in Bank Soal is present in the team's deck
    const missingInDeck = questions.filter((q) => !uniqueDeckQuestionIds.has(q.id));
    if (missingInDeck.length > 0) {
      errors.push(
        `Kelompok "${team.name}" belum memuat semua soal dari Bank Soal (${missingInDeck.length} soal tidak ditemukan).`
      );
    }
  });

  return {
    isValid: errors.length === 0 && questionsCount > 0 && teamsCount > 0,
    errors,
    totalCards,
    questionsCount,
    teamsCount,
  };
}
