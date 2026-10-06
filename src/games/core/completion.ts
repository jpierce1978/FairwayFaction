import type { ValidationIssue } from '@/types/validation';

/** Whether a game has enough data to be finalized, and what is missing (feeds Round Check). */
export type CompletionValidation =
  { complete: true } | { complete: false; issues: ValidationIssue[]; unresolvedTies?: string[] };

export const COMPLETE: CompletionValidation = { complete: true };

export function incomplete(
  issues: ValidationIssue[],
  unresolvedTies?: string[],
): CompletionValidation {
  return unresolvedTies ? { complete: false, issues, unresolvedTies } : { complete: false, issues };
}
