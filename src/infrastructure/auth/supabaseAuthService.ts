import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { asId, type UserId } from '@/types/ids';
import type { AuthError, AuthResult, AuthService, AuthSession } from './authService';

function toSession(s: Session | null): AuthSession | null {
  if (!s) return null;
  return {
    user: {
      id: asId<'UserId'>(s.user.id) as UserId,
      email: s.user.email ?? null,
      createdAt: s.user.created_at,
    },
  };
}

function mapError(message: string, status?: number): AuthError {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) {
    return { code: 'INVALID_CREDENTIALS', message: 'That email and password do not match.' };
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return {
      code: 'EMAIL_IN_USE',
      message: 'An account with that email already exists. Try signing in.',
    };
  }
  if (lower.includes('fetch') || lower.includes('network') || status === 0) {
    return {
      code: 'NETWORK',
      message: "You're offline. Check your connection and try again. Nothing was lost.",
    };
  }
  return { code: 'UNKNOWN', message: 'Something went wrong signing in. Please try again.' };
}

export function createSupabaseAuthService(client: SupabaseClient): AuthService {
  return {
    isDevelopmentMock: false,
    async getSession() {
      const { data } = await client.auth.getSession();
      return toSession(data.session);
    },
    onAuthStateChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) =>
        listener(toSession(session)),
      );
      return () => data.subscription.unsubscribe();
    },
    async signInWithEmail(email, password): Promise<AuthResult> {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { ok: false, error: mapError(error.message, error.status) };
      const session = toSession(data.session);
      return session
        ? { ok: true, session }
        : { ok: false, error: { code: 'UNKNOWN', message: 'Sign-in did not return a session.' } };
    },
    async signUpWithEmail(email, password): Promise<AuthResult> {
      const { data, error } = await client.auth.signUp({ email: email.trim(), password });
      if (error) return { ok: false, error: mapError(error.message, error.status) };
      const session = toSession(data.session);
      if (!session) {
        return {
          ok: false,
          error: {
            code: 'EMAIL_CONFIRMATION_REQUIRED',
            message: 'Check your email to confirm your account, then sign in.',
          },
        };
      }
      return { ok: true, session };
    },
    async signInWithProvider(): Promise<AuthResult> {
      // Apple/Google need native credential flows and provider setup (a later milestone).
      return {
        ok: false,
        error: {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: 'Apple and Google sign-in are not set up yet. Use email for now.',
        },
      };
    },
    async signOut() {
      await client.auth.signOut();
    },
  };
}
