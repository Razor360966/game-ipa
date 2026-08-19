import { Question } from '../types';

export interface AnswerCheckResult {
  isCorrect: boolean;
  scoreEarned?: number;
  totalPossiblePoints?: number;
  normalizedUserAnswer: string;
  normalizedExpectedAnswer: string;
  matchedAnswer?: string;
  feedbackDetails?: string;
}

/**
 * Normalizes an answer string for robust comparison:
 * - Trims and converts to lower case (if not case-sensitive)
 * - Replaces Indonesian decimal commas with dots (e.g. 2,5 -> 2.5)
 * - Removes excessive internal spaces
 * - Standardizes common punctuation
 */
export function normalizeString(text: string, caseSensitive: boolean = false): string {
  if (!text) return '';
  let str = text.trim();
  if (!caseSensitive) {
    str = str.toLowerCase();
  }
  // Replace comma surrounded by digits with a dot: e.g. "1,5" -> "1.5"
  str = str.replace(/(\d+),(\d+)/g, '$1.$2');
  // Collapse whitespace
  str = str.replace(/\s+/g, ' ');
  return str;
}

/**
 * Extracts a numeric value and unit if present
 */
function extractNumericWithUnit(str: string): { num: number | null; unit: string } {
  const match = str.match(/^([+-]?\d+(?:\.\d+)?)\s*([a-zA-Z°%^/²³0-9]*)$/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    return { num, unit };
  }
  return { num: null, unit: '' };
}

/**
 * Evaluates candidate text match against list of acceptable answers
 */
function matchTextCandidate(
  submittedText: string,
  acceptedList: string[],
  caseSensitive: boolean = false
): { matched: boolean; matchedAnswer?: string } {
  const normUser = normalizeString(submittedText, caseSensitive);
  const candidates = acceptedList.map((a) => normalizeString(a, caseSensitive)).filter(Boolean);

  // 1. Direct exact match
  for (const cand of candidates) {
    if (normUser === cand) {
      return { matched: true, matchedAnswer: cand };
    }
  }

  // 2. Tolerance for spaces (e.g. "25cm" vs "25 cm")
  const strippedUser = normUser.replace(/\s+/g, '');
  for (const cand of candidates) {
    const strippedCand = cand.replace(/\s+/g, '');
    if (strippedUser === strippedCand && strippedUser.length > 0) {
      return { matched: true, matchedAnswer: cand };
    }
  }

  // 3. Numeric tolerance with units
  const userNum = extractNumericWithUnit(normUser);
  for (const cand of candidates) {
    const candNum = extractNumericWithUnit(cand);
    if (userNum.num !== null && candNum.num !== null) {
      const epsilon = 0.0001;
      const numDiff = Math.abs(userNum.num - candNum.num);
      const unitMatches = !userNum.unit || !candNum.unit || userNum.unit === candNum.unit;
      if (numDiff < epsilon && unitMatches) {
        return { matched: true, matchedAnswer: cand };
      }
    }
  }

  return { matched: false };
}

/**
 * Evaluates whether user's submitted answer is correct based on the question definition and type
 */
export function checkAnswer(
  submittedAnswer: string,
  question: Question,
  caseSensitive: boolean = false
): AnswerCheckResult {
  const questionType = question.type || 'short_answer';
  const totalPoints = question.points || 10;

  // -------------------------------------------------------------
  // 1. MULTIPLE CHOICE
  // -------------------------------------------------------------
  if (questionType === 'multiple_choice') {
    const expectedOptionId = question.correctOptionId || question.correctAnswer || 'A';
    const normSubmitted = normalizeString(submittedAnswer, false);
    const normExpectedId = normalizeString(expectedOptionId, false);

    // Look for matching option text
    const correctOpt = question.options?.find(
      (o) => o.id.toLowerCase() === expectedOptionId.toLowerCase()
    );
    const normOptText = correctOpt ? normalizeString(correctOpt.text, false) : '';

    const isMatch =
      normSubmitted === normExpectedId ||
      (normOptText && (normSubmitted === normOptText || normSubmitted.includes(normOptText)));

    return {
      isCorrect: Boolean(isMatch),
      scoreEarned: isMatch ? totalPoints : 0,
      totalPossiblePoints: totalPoints,
      normalizedUserAnswer: submittedAnswer,
      normalizedExpectedAnswer: correctOpt ? `Opsi ${correctOpt.label}: ${correctOpt.text}` : expectedOptionId,
      matchedAnswer: isMatch ? expectedOptionId : undefined,
    };
  }

  // -------------------------------------------------------------
  // 2. STATEMENT CORRECTION (Benar / Salah + Koreksi)
  // -------------------------------------------------------------
  if (questionType === 'statement_correction') {
    const config = question.statementConfig || {
      statement: question.questionText,
      isTrue: question.correctAnswer.toLowerCase().includes('benar') || question.correctAnswer.toLowerCase() === 'true',
      correctionKey: question.correctAnswer,
      correctionAlternatives: question.alternativeAnswers || [],
      scoringMode: 'full' as const,
    };

    let userIsTrue: boolean | null = null;
    let userCorrection: string = '';

    // Attempt JSON parse first
    try {
      if (submittedAnswer.startsWith('{') && submittedAnswer.endsWith('}')) {
        const parsed = JSON.parse(submittedAnswer);
        userIsTrue = typeof parsed.isTrue === 'boolean' ? parsed.isTrue : null;
        userCorrection = parsed.correctionText || '';
      }
    } catch {
      // Fallback format
    }

    if (userIsTrue === null) {
      const lower = submittedAnswer.toLowerCase().trim();
      if (lower.startsWith('benar') || lower === 'true' || lower === 'b') {
        userIsTrue = true;
      } else if (lower.startsWith('salah') || lower === 'false' || lower === 's') {
        userIsTrue = false;
        userCorrection = submittedAnswer.replace(/^(salah|false|s)[:\s-]*/i, '').trim();
      } else {
        userIsTrue = false;
        userCorrection = submittedAnswer;
      }
    }

    const expectedIsTrue = Boolean(config.isTrue);
    const isChoiceCorrect = userIsTrue === expectedIsTrue;

    let isCorrectionCorrect = false;
    if (!expectedIsTrue) {
      // Statement was FALSE, so correction is required
      const candidateCorrections = [
        config.correctionKey || question.correctAnswer,
        ...(config.correctionAlternatives || question.alternativeAnswers || []),
      ].filter(Boolean) as string[];

      const matchRes = matchTextCandidate(userCorrection, candidateCorrections, caseSensitive);
      isCorrectionCorrect = matchRes.matched;
    } else {
      // Statement was TRUE, no correction required
      isCorrectionCorrect = true;
    }

    const isFullyCorrect = isChoiceCorrect && isCorrectionCorrect;
    const isPartialScoring = config.scoringMode === 'partial';

    let scoreEarned = 0;
    if (isFullyCorrect) {
      scoreEarned = totalPoints;
    } else if (isPartialScoring && !expectedIsTrue) {
      // 50% for recognizing it's False, 50% for correct correction
      if (isChoiceCorrect) scoreEarned += Math.round(totalPoints / 2);
      if (isCorrectionCorrect) scoreEarned += Math.round(totalPoints / 2);
    }

    const expectedSummary = expectedIsTrue
      ? 'BENAR'
      : `SALAH. Koreksi yang tepat: ${config.correctionKey || question.correctAnswer}`;

    return {
      isCorrect: isFullyCorrect || (isPartialScoring && scoreEarned > 0),
      scoreEarned,
      totalPossiblePoints: totalPoints,
      normalizedUserAnswer: `${userIsTrue ? 'BENAR' : 'SALAH'}${userCorrection ? ` (Koreksi: ${userCorrection})` : ''}`,
      normalizedExpectedAnswer: expectedSummary,
      matchedAnswer: isFullyCorrect ? expectedSummary : undefined,
      feedbackDetails: expectedIsTrue
        ? (isChoiceCorrect ? 'Identifikasi BENAR tepat.' : 'Pernyataan sebenarnya BENAR.')
        : (isFullyCorrect
            ? 'Identifikasi SALAH dan koreksi tepat.'
            : isChoiceCorrect
            ? 'Identifikasi SALAH tepat, namun koreksi belum sesuai kunci.'
            : 'Pernyataan ini SALAH dan memerlukan koreksi.'),
    };
  }

  // -------------------------------------------------------------
  // 3. MULTI-PART / 2 PERTANYAAN
  // -------------------------------------------------------------
  if (questionType === 'multi_part') {
    const config = question.multiPartConfig || {
      parts: [
        {
          id: 'p1',
          question: question.questionText,
          correctAnswer: question.correctAnswer,
          alternativeAnswers: question.alternativeAnswers,
        },
      ],
      scoringMode: 'full' as const,
    };

    const parts = config.parts || [];
    let submittedParts: string[] = [];

    try {
      if (submittedAnswer.startsWith('[') && submittedAnswer.endsWith(']')) {
        submittedParts = JSON.parse(submittedAnswer);
      }
    } catch {
      // Fallback delimiter
    }

    if (submittedParts.length === 0) {
      submittedParts = submittedAnswer.split('|||').map((s) => s.trim());
    }

    let correctCount = 0;
    const partEvaluations = parts.map((part, index) => {
      const userPartAns = submittedParts[index] || '';
      const accepted = [part.correctAnswer, ...(part.alternativeAnswers || [])].filter(Boolean);
      const match = matchTextCandidate(userPartAns, accepted, caseSensitive);
      if (match.matched) correctCount++;
      return {
        partNumber: index + 1,
        question: part.question,
        userAnswer: userPartAns,
        expectedAnswer: part.correctAnswer,
        isCorrect: match.matched,
      };
    });

    const isFullyCorrect = correctCount === parts.length && parts.length > 0;
    const isPartialScoring = config.scoringMode === 'partial';

    const scoreEarned = isFullyCorrect
      ? totalPoints
      : isPartialScoring && parts.length > 0
      ? Math.round((totalPoints * correctCount) / parts.length)
      : 0;

    const expectedSummary = parts.map((p, idx) => `P${idx + 1}: ${p.correctAnswer}`).join(' | ');
    const userSummary = partEvaluations
      .map((e, idx) => `P${idx + 1}: ${e.userAnswer || '-'} (${e.isCorrect ? '✓' : '✗'})`)
      .join(' | ');

    return {
      isCorrect: isFullyCorrect || (isPartialScoring && scoreEarned > 0),
      scoreEarned,
      totalPossiblePoints: totalPoints,
      normalizedUserAnswer: userSummary,
      normalizedExpectedAnswer: expectedSummary,
      matchedAnswer: isFullyCorrect ? expectedSummary : undefined,
      feedbackDetails: `Benar ${correctCount} dari ${parts.length} pertanyaan.`,
    };
  }

  // -------------------------------------------------------------
  // 4. SHORT ANSWER (Default / Legacy)
  // -------------------------------------------------------------
  const normUser = normalizeString(submittedAnswer, caseSensitive);
  const normTarget = normalizeString(question.correctAnswer, caseSensitive);

  const candidateAnswers = [
    question.correctAnswer,
    ...(question.alternativeAnswers || []),
  ];

  const matchRes = matchTextCandidate(submittedAnswer, candidateAnswers, caseSensitive);

  if (matchRes.matched) {
    return {
      isCorrect: true,
      scoreEarned: totalPoints,
      totalPossiblePoints: totalPoints,
      normalizedUserAnswer: normUser,
      normalizedExpectedAnswer: normTarget,
      matchedAnswer: matchRes.matchedAnswer,
    };
  }

  return {
    isCorrect: false,
    scoreEarned: 0,
    totalPossiblePoints: totalPoints,
    normalizedUserAnswer: normUser,
    normalizedExpectedAnswer: normTarget,
  };
}

