import { asId, type UserId } from '@/types/ids';
import type { AuthResult, AuthService, AuthSession } from './authService';

/**
 * In-memory stand-in used when Supabase env vars are absent so the app is runnable
 * in development. Sessions do NOT persist across launches. Never used in production
 * builds that have Supabase configured.
 */
export function createDevAuthService(
  generateId: () => string,
  now: () => string = () => new Date().toISOString(),
): AuthService {
  const accounts = new Map<string, { password: string; session: AuthSession }>();
  const listeners = new Set<(s: AuthSession | null) => void>();
  let current: AuthSession | null = null;

  const publish = (s: AuthSession | null) => {
    current = s;
    listeners.forEach((l) => l(s));
  };

  return {
    isDevelopmentMock: true,
    async getSession() {
      return current;
    },
    onAuthStateChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async signInWithEmail(email, password): Promise<AuthResult> {
      const account = accounts.get(email.trim().toLowerCase());
      if (!account || account.password !== password) {
        return {
          ok: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'That email and password do not match.' },
        };
      }
      publish(account.session);
      return { ok: true, session: account.session };
    },
    async signUpWithEmail(email, password): Promise<AuthResult> {
      const key = email.trim().toLowerCase();
      if (accounts.has(key)) {
        return {
          ok: false,
          error: {
            code: 'EMAIL_IN_USE',
            message: 'An account with that email already exists. Try signing in.',
          },
        };
      }
      const session: AuthSession = {
        user: { id: asId<'UserId'>(generateId()) as UserId, email: key, createdAt: now() },
      };
      accounts.set(key, { password, session });
      publish(session);
      return { ok: true, session };
    },
    async signInWithProvider(): Promise<AuthResult> {
      return {
        ok: false,
        error: {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: 'Apple and Google sign-in are not set up yet. Use email for now.',
        },
      };
    },
    async signOut() {
      publish(null);
    },
  };
}
