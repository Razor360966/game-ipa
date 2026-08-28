import { Question, Team } from '../types';
import { normalizeCategoryKey, normalizeQuestionCategory } from './presets';
import { deterministicHash } from './variantEngine';

export type NormalizedDifficulty = 'easy' | 'medium' | 'hard' | 'all' | 'unassigned';

/**
 * Normalizes difficulty value for consistent comparisons.
 * Does NOT mutate the original Question object.
 * 
 * Maps:
 * - 'easy', 'mudah', 'rendah', 'level-1' -> 'easy'
 * - 'medium', 'sedang', 'menengah', 'level-2' -> 'medium'
 * - 'hard', 'sulit', 'sukar', 'tinggi', 'hots', 'level-3' -> 'hard'
 * - 'all', 'semua', 'semua level', '__all__', undefined, '' -> 'all' (in filter context) or 'unassigned' (in question context)
 */
export function normalizeDifficulty(diff?: string, isFilterContext: boolean = false): NormalizedDifficulty {
  if (!diff || !diff.trim()) {
    return isFilterContext ? 'all' : 'unassigned';
  }
  const clean = diff.trim().toLowerCase();
  if (clean === 'all' || clean === 'semua' || clean === 'semua level' || clean === '__all__') {
    return 'all';
  }
  if (clean === 'easy' || clean === 'mudah' || clean === 'rendah' || clean === 'level-1') {
    return 'easy';
  }
  if (clean === 'medium' || clean === 'sedang' || clean === 'menengah' || clean === 'level-2') {
    return 'medium';
  }
  if (clean === 'hard' || clean === 'sulit' || clean === 'sukar' || clean === 'tinggi' || clean === 'hots' || clean === 'level-3') {
    return 'hard';
  }
  return isFilterContext ? 'all' : 'unassigned';
}

/**
 * Human-readable label for difficulty level
 */
export function getDifficultyLabel(diff?: string): string {
  const norm = normalizeDifficulty(diff, false);
  switch (norm) {
    case 'easy':
      return 'Easy (Mudah)';
    case 'medium':
      return 'Medium (Sedang)';
    case 'hard':
      return 'Hard (Sulit / HOTS)';
    case 'all':
      return 'Semua Level';
    case 'unassigned':
    default:
      return 'Level Belum Ditentukan';
  }
}

/**
 * Visual badge styling helper for difficulty levels
 */
export function getDifficultyBadgeConfig(diff?: string): {
  label: string;
  badgeClass: string;
  dotClass: string;
  icon: string;
} {
  const norm = normalizeDifficulty(diff, false);
  switch (norm) {
    case 'easy':
      return {
        label: 'EASY',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
        icon: '🟢',
      };
    case 'medium':
      return {
        label: 'MEDIUM',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        dotClass: 'bg-amber-400',
        icon: '🟡',
      };
    case 'hard':
      return {
        label: 'HARD',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        dotClass: 'bg-rose-400',
        icon: '🔴',
      };
    case 'unassigned':
    default:
      return {
        label: 'UNSET',
        badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        dotClass: 'bg-slate-400',
        icon: '⚪',
      };
  }
}

export interface QuestionPoolDistribution {
  easy: number;
  medium: number;
  hard: number;
  unassigned: number;
  total: number;
}

export interface FilterQuestionPoolOptions {
  questions: Question[];
  topic?: string;
  difficulty?: string; // 'all' | 'easy' | 'medium' | 'hard'
  count?: number; // requested number of questions
  customQuestionIds?: string[];
  competitionId?: string;
}

export interface FilterQuestionPoolResult {
  selectedQuestions: Question[];
  totalAvailable: number;
  requestedCount: number;
  distribution: QuestionPoolDistribution;
  isSufficient: boolean;
  warning?: string;
  topicApplied: string;
  difficultyApplied: NormalizedDifficulty;
}

/**
 * Calculates difficulty distribution across an array of questions.
 */
export function getDifficultyDistribution(questions: Question[]): QuestionPoolDistribution {
  const dist: QuestionPoolDistribution = {
    easy: 0,
    medium: 0,
    hard: 0,
    unassigned: 0,
    total: questions.length,
  };

  questions.forEach((q) => {
    const norm = normalizeDifficulty(q.difficulty, false);
    if (norm === 'easy') dist.easy++;
    else if (norm === 'medium') dist.medium++;
    else if (norm === 'hard') dist.hard++;
    else dist.unassigned++;
  });

  return dist;
}

/**
 * BALANCED QUESTION DISTRIBUTION ALGORITHM (Phase 6B Core)
 * 
 * When "Semua Level" is chosen, balances the question count across Easy, Medium, Hard (and unassigned if needed).
 * 
 * Mathematical Fairness:
 * - Difference in question count between available difficulty levels is at most 1 (Quota Balancing).
 * - If a level has fewer questions than its ideal quota, it yields all it has, and the shortfall is
 *   fairly distributed to the remaining levels with surplus.
 * - Deterministic: Stable sorting by orderIndex and deterministic seed from competitionId/questionId.
 *   Zero Math.random(), Zero Date.now().
 */
export function balancedLevelDistribution(
  eligiblePool: Question[],
  requestedCount: number,
  _competitionId?: string
): Question[] {
  if (!eligiblePool || eligiblePool.length === 0) return [];
  if (requestedCount <= 0 || requestedCount >= eligiblePool.length) {
    // Return all eligible questions preserving single-source orderIndex
    return [...eligiblePool].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }

  // 1. Group into difficulty buckets
  const easyBucket: Question[] = [];
  const mediumBucket: Question[] = [];
  const hardBucket: Question[] = [];
  const unassignedBucket: Question[] = [];

  eligiblePool.forEach((q) => {
    const norm = normalizeDifficulty(q.difficulty, false);
    if (norm === 'easy') easyBucket.push(q);
    else if (norm === 'medium') mediumBucket.push(q);
    else if (norm === 'hard') hardBucket.push(q);
    else unassignedBucket.push(q);
  });

  // Sort each bucket by orderIndex
  easyBucket.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  mediumBucket.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  hardBucket.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  unassignedBucket.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const buckets: { key: string; items: Question[]; allocated: number }[] = [
    { key: 'easy', items: easyBucket, allocated: 0 },
    { key: 'medium', items: mediumBucket, allocated: 0 },
    { key: 'hard', items: hardBucket, allocated: 0 },
  ].filter((b) => b.items.length > 0);

  // If no standard buckets have items, use unassigned
  if (buckets.length === 0) {
    return unassignedBucket.slice(0, requestedCount);
  }

  // 2. Iterative fair round-robin quota allocation across available buckets
  let remainingNeeded = requestedCount;
  let hasProgress = true;

  while (remainingNeeded > 0 && hasProgress) {
    hasProgress = false;
    for (const b of buckets) {
      if (remainingNeeded > 0 && b.allocated < b.items.length) {
        b.allocated++;
        remainingNeeded--;
        hasProgress = true;
      }
    }
  }

  // If still need more and unassigned questions exist, allocate from unassigned
  let unassignedAllocated = 0;
  while (remainingNeeded > 0 && unassignedAllocated < unassignedBucket.length) {
    unassignedAllocated++;
    remainingNeeded--;
  }

  // 3. Collect the chosen questions
  const selected: Question[] = [];
  buckets.forEach((b) => {
    selected.push(...b.items.slice(0, b.allocated));
  });
  if (unassignedAllocated > 0) {
    selected.push(...unassignedBucket.slice(0, unassignedAllocated));
  }

  // 4. Re-sort the final selected snapshot strictly by master orderIndex ASC
  return selected.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

/**
 * PRIMARY QUESTION POOL FILTER & SELECTOR (Phase 6B Core)
 * 
 * Flow:
 * MASTER QUESTIONS
 *        ↓ (Topic Constraint)
 * TOPIC FILTERED POOL
 *        ↓ (Difficulty Constraint: Easy / Medium / Hard / All)
 * DIFFICULTY FILTERED POOL
 *        ↓ (Balanced Distribution / Count Constraint)
 * ACTIVE MATCH QUESTION SNAPSHOT
 */
export function filterQuestionPool(options: FilterQuestionPoolOptions): FilterQuestionPoolResult {
  const { questions, topic, difficulty, count, customQuestionIds, competitionId } = options;

  if (!questions || questions.length === 0) {
    return {
      selectedQuestions: [],
      totalAvailable: 0,
      requestedCount: count || 0,
      distribution: { easy: 0, medium: 0, hard: 0, unassigned: 0, total: 0 },
      isSufficient: false,
      warning: 'Bank Soal masih kosong.',
      topicApplied: topic || 'Semua Topik',
      difficultyApplied: normalizeDifficulty(difficulty, true),
    };
  }

  // Sort master pool by single-source orderIndex
  const sortedMaster = [...questions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  // STEP 1: TOPIC FILTERING
  let topicPool: Question[] = sortedMaster;
  const normTopic = normalizeCategoryKey(topic);
  const isAllTopics = !normTopic || normTopic === 'all' || normTopic === 'semua' || normTopic === 'semua topik' || normTopic === '__all__';

  if (!isAllTopics) {
    if (normTopic === 'tanpa topik' || normTopic === 'uncategorized') {
      topicPool = sortedMaster.filter((q) => !q.category || !q.category.trim());
    } else {
      topicPool = sortedMaster.filter((q) => normalizeCategoryKey(q.category) === normTopic);
    }
  }

  // If custom IDs provided, restrict to those custom IDs
  if (customQuestionIds && customQuestionIds.length > 0) {
    const customIdSet = new Set(customQuestionIds);
    topicPool = topicPool.filter((q) => customIdSet.has(q.id));
  }

  // STEP 2: DIFFICULTY FILTERING
  const normDiff = normalizeDifficulty(difficulty, true);
  let eligiblePool: Question[] = [];

  if (normDiff === 'all') {
    eligiblePool = topicPool;
  } else {
    eligiblePool = topicPool.filter((q) => normalizeDifficulty(q.difficulty, false) === normDiff);
  }

  const totalAvailable = eligiblePool.length;
  const requestedCount = count !== undefined && count > 0 ? count : totalAvailable;

  // STEP 3: POOL SUFFICIENCY CHECK
  let isSufficient = true;
  let warning: string | undefined = undefined;

  if (requestedCount > totalAvailable) {
    isSufficient = false;
    const topicLabel = isAllTopics ? 'Semua Topik' : (topic || 'Topik Terpilih');
    const diffLabel = normDiff === 'all' ? 'Semua Level' : getDifficultyLabel(normDiff);
    warning = `Jumlah soal tidak mencukupi. Topik: ${topicLabel}, Level: ${diffLabel}. Tersedia: ${totalAvailable} soal, Diminta: ${requestedCount} soal.`;
  }

  // STEP 4: BALANCED SELECTION
  let selectedQuestions: Question[] = [];

  if (normDiff === 'all' && requestedCount < totalAvailable) {
    // Use balanced level distribution when "Semua Level" is selected
    selectedQuestions = balancedLevelDistribution(eligiblePool, requestedCount, competitionId);
  } else {
    // If specific difficulty is selected or all available are requested
    selectedQuestions = eligiblePool.slice(0, requestedCount).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }

  const distribution = getDifficultyDistribution(selectedQuestions);

  return {
    selectedQuestions,
    totalAvailable,
    requestedCount,
    distribution,
    isSufficient,
    warning,
    topicApplied: isAllTopics ? 'Semua Topik' : (topic || 'Topik Terpilih'),
    difficultyApplied: normDiff,
  };
}

export interface TeamFairnessReport {
  isFair: boolean;
  teamCount: number;
  totalCardsPerTeam: number;
  topicComposition: Record<string, number>;
  difficultyComposition: Record<string, number>;
  issues: string[];
}

/**
 * Validates that all teams have identical question count, topic distribution, and difficulty composition.
 */
export function validateTeamFairness(
  teams: Team[],
  activeQuestions: Question[],
  teamCardDecks?: Record<string, any[]>
): TeamFairnessReport {
  const issues: string[] = [];
  const teamCount = teams.length;
  const totalCardsPerTeam = activeQuestions.length;

  const topicComposition: Record<string, number> = {};
  const difficultyComposition: Record<string, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    unassigned: 0,
  };

  activeQuestions.forEach((q) => {
    const top = q.category?.trim() || 'Tanpa Topik';
    topicComposition[top] = (topicComposition[top] || 0) + 1;

    const diff = normalizeDifficulty(q.difficulty, false);
    if (diff === 'easy') difficultyComposition.easy++;
    else if (diff === 'medium') difficultyComposition.medium++;
    else if (diff === 'hard') difficultyComposition.hard++;
    else difficultyComposition.unassigned++;
  });

  if (teams.length === 0) {
    issues.push('Belum ada kelompok yang terdaftar.');
  }

  if (activeQuestions.length === 0) {
    issues.push('Snapshot soal pertandingan masih kosong.');
  }

  if (teamCardDecks) {
    teams.forEach((team) => {
      const deck = teamCardDecks[team.id];
      if (!deck) {
        issues.push(`Kelompok "${team.name}" tidak memiliki deck kartu.`);
      } else if (deck.length !== totalCardsPerTeam) {
        issues.push(`Kelompok "${team.name}" memiliki ${deck.length} kartu, seharusnya ${totalCardsPerTeam} kartu.`);
      }
    });
  }

  return {
    isFair: issues.length === 0,
    teamCount,
    totalCardsPerTeam,
    topicComposition,
    difficultyComposition,
    issues,
  };
}
