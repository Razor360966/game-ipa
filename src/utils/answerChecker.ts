import { Question } from '../types';

export interface AnswerCheckResult {
  isCorrect: boolean;
  normalizedUserAnswer: string;
  normalizedExpectedAnswer: string;
  matchedAnswer?: string;
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
 * Evaluates whether user's submitted answer is correct based on the question definition
 */
export function checkAnswer(
  submittedAnswer: string,
  question: Question,
  caseSensitive: boolean = false
): AnswerCheckResult {
  const normUser = normalizeString(submittedAnswer, caseSensitive);
  const normTarget = normalizeString(question.correctAnswer, caseSensitive);

  // List of all accepted candidate answers
  const candidateAnswers = [
    question.correctAnswer,
    ...(question.alternativeAnswers || [])
  ].map((a) => normalizeString(a, caseSensitive)).filter(Boolean);

  // 1. Direct exact match with primary or alternatives
  for (const candidate of candidateAnswers) {
    if (normUser === candidate) {
      return {
        isCorrect: true,
        normalizedUserAnswer: normUser,
        normalizedExpectedAnswer: normTarget,
        matchedAnswer: candidate,
      };
    }
  }

  // 2. Tolerance for numbers with/without spaces and units
  // e.g. "25cm" vs "25 cm" or "10 kg" vs "10kg"
  const strippedUser = normUser.replace(/\s+/g, '');
  for (const candidate of candidateAnswers) {
    const strippedCandidate = candidate.replace(/\s+/g, '');
    if (strippedUser === strippedCandidate && strippedUser.length > 0) {
      return {
        isCorrect: true,
        normalizedUserAnswer: normUser,
        normalizedExpectedAnswer: normTarget,
        matchedAnswer: candidate,
      };
    }
  }

  // 3. Compare numeric values if both evaluate to pure numbers
  const userNumData = extractNumericWithUnit(normUser);
  const targetNumData = extractNumericWithUnit(normTarget);

  if (userNumData.num !== null && targetNumData.num !== null) {
    // If unit matches or one has no unit and numbers match within epsilon
    const epsilon = 0.0001;
    const numDiff = Math.abs(userNumData.num - targetNumData.num);
    const unitMatches = !userNumData.unit || !targetNumData.unit || userNumData.unit === targetNumData.unit;

    if (numDiff < epsilon && unitMatches) {
      return {
        isCorrect: true,
        normalizedUserAnswer: normUser,
        normalizedExpectedAnswer: normTarget,
        matchedAnswer: question.correctAnswer,
      };
    }
  }

  return {
    isCorrect: false,
    normalizedUserAnswer: normUser,
    normalizedExpectedAnswer: normTarget,
  };
}
