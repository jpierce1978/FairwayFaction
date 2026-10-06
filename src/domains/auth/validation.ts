import { fromIssues, type ValidationIssue, type ValidationResult } from '@/types/validation';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;
export const DISPLAY_NAME_MAX_LENGTH = 30;
/** World Handicap System bounds. */
export const HANDICAP_MIN = -10;
export const HANDICAP_MAX = 54;

export function validateCredentials(input: { email: string; password: string }): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!EMAIL.test(input.email.trim())) {
    issues.push({ code: 'INVALID_EMAIL', message: 'Enter a valid email address.', path: 'email' });
  }
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    issues.push({
      code: 'WEAK_PASSWORD',
      message: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
      path: 'password',
    });
  }
  return fromIssues(issues);
}

/** Basic profile (UX_SPEC §6): name + display name required; handicap optional; nothing else. */
export function validateBasicProfile(input: {
  fullName: string;
  displayName: string;
  handicapIndex?: number | null;
}): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (input.fullName.trim().length === 0) {
    issues.push({ code: 'NAME_REQUIRED', message: 'Enter your name.', path: 'fullName' });
  }
  const display = input.displayName.trim();
  if (display.length === 0) {
    issues.push({
      code: 'DISPLAY_NAME_REQUIRED',
      message: 'Enter the name your group will see.',
      path: 'displayName',
    });
  } else if (display.length > DISPLAY_NAME_MAX_LENGTH) {
    issues.push({
      code: 'DISPLAY_NAME_TOO_LONG',
      message: `Keep it to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
      path: 'displayName',
    });
  }
  const hcp = input.handicapIndex;
  if (
    hcp !== undefined &&
    hcp !== null &&
    (Number.isNaN(hcp) || hcp < HANDICAP_MIN || hcp > HANDICAP_MAX)
  ) {
    issues.push({
      code: 'HANDICAP_OUT_OF_RANGE',
      message: `Handicap index must be between ${HANDICAP_MIN} and ${HANDICAP_MAX}.`,
      path: 'handicapIndex',
    });
  }
  return fromIssues(issues);
}
