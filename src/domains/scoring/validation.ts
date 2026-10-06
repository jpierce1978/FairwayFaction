import { fromIssues, type ValidationIssue, type ValidationResult } from '@/types/validation';

export const MIN_GROSS_SCORE = 1;
export const MAX_GROSS_SCORE = 30;

export interface ScoreInput {
  grossScore: number;
  putts?: number | null;
  penalties?: number | null;
}

/**
 * Only the gross score is required. Advanced stats must never be required to
 * save a score (SCREEN_CONTRACTS §10), so they are only range-checked when present.
 */
export function validateScoreInput(input: ScoreInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (
    !Number.isInteger(input.grossScore) ||
    input.grossScore < MIN_GROSS_SCORE ||
    input.grossScore > MAX_GROSS_SCORE
  ) {
    issues.push({
      code: 'INVALID_GROSS_SCORE',
      message: `Score must be a whole number from ${MIN_GROSS_SCORE} to ${MAX_GROSS_SCORE}.`,
      path: 'grossScore',
    });
  }
  for (const field of ['putts', 'penalties'] as const) {
    const v = input[field];
    if (v !== undefined && v !== null && (!Number.isInteger(v) || v < 0)) {
      issues.push({
        code: 'INVALID_COUNT',
        message: `${field} must be zero or a positive whole number.`,
        path: field,
      });
    }
  }
  return fromIssues(issues);
}
