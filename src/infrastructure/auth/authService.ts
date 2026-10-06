import type { User } from '@/domains/auth/types';

export interface AuthSession {
  user: User;
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_IN_USE'
  | 'EMAIL_CONFIRMATION_REQUIRED'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'NETWORK'
  | 'UNKNOWN';

export interface AuthError {
  code: AuthErrorCode;
  /** Plain-language message safe to show the user (UX_SPEC §41: say what happened and what to do). */
  message: string;
}

export type AuthResult = { ok: true; session: AuthSession } | { ok: false; error: AuthError };

export type OAuthProvider = 'apple' | 'google';

/**
 * The only way the app talks to an identity provider. UI and domain code depend on
 * this interface, never on Supabase directly, so a provider can be added or swapped
 * (UX_SPEC §6: future auth methods without redesigning onboarding).
 */
export interface AuthService {
  /** True when running against the in-memory development mock instead of Supabase Auth. */
  readonly isDevelopmentMock: boolean;
  getSession(): Promise<AuthSession | null>;
  /** Returns an unsubscribe function. */
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<AuthResult>;
  signUpWithEmail(email: string, password: string): Promise<AuthResult>;
  signInWithProvider(provider: OAuthProvider): Promise<AuthResult>;
  signOut(): Promise<void>;
}
