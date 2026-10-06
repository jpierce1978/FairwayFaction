import { fromIssues, type ValidationIssue, type ValidationResult } from '@/types/validation';
import type { FactionVisibility } from './types';

export const FACTION_NAME_MAX_LENGTH = 60;

/** UX_SPEC §8: creation asks only for a name, optional home course, and visibility. */
export function validateFactionCreation(input: {
  name: string;
  visibility: FactionVisibility;
}): ValidationResult {
  const issues: ValidationIssue[] = [];
  const name = input.name.trim();
  if (name.length === 0) {
    issues.push({ code: 'NAME_REQUIRED', message: 'Give your group a name.', path: 'name' });
  } else if (name.length > FACTION_NAME_MAX_LENGTH) {
    issues.push({
      code: 'NAME_TOO_LONG',
      message: `Keep the name to ${FACTION_NAME_MAX_LENGTH} characters or fewer.`,
      path: 'name',
    });
  }
  if (input.visibility !== 'PRIVATE' && input.visibility !== 'INVITE_ONLY') {
    issues.push({
      code: 'INVALID_VISIBILITY',
      message: 'Public groups are not available yet.',
      path: 'visibility',
    });
  }
  return fromIssues(issues);
}
