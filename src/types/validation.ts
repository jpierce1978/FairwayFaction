/** A single validation problem. `path` identifies the offending field (e.g. "config.holes"). */
export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export type ValidationResult = { valid: true } | { valid: false; issues: ValidationIssue[] };

export const VALID: ValidationResult = { valid: true };

export function invalid(...issues: ValidationIssue[]): ValidationResult {
  return { valid: false, issues };
}

/** Collapse a list of issues into a ValidationResult. */
export function fromIssues(issues: ValidationIssue[]): ValidationResult {
  return issues.length === 0 ? VALID : { valid: false, issues };
}

export function mergeValidation(...results: ValidationResult[]): ValidationResult {
  return fromIssues(results.flatMap((r) => (r.valid ? [] : r.issues)));
}
