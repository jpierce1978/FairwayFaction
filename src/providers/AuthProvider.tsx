import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession } from '@/infrastructure/auth/authService';
import type { Profile } from '@/domains/auth/types';
import { useServices } from './ServicesProvider';

/**
 * - loading: restoring a persisted session
 * - signedOut: show the auth flow
 * - needsProfile: signed in but no local basic profile yet (UX_SPEC §6 screen 3)
 * - ready: normal app
 */
export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  profile: Profile | null;
  isDevelopmentMock: boolean;
  signOut(): Promise<void>;
  /** Call after the profile is saved to move from needsProfile to ready. */
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, profiles } = useServices();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const resolve = useCallback(
    async (next: AuthSession | null) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setStatus('signedOut');
        return;
      }
      const existing = await profiles.get(next.user.id);
      setProfile(existing);
      setStatus(existing ? 'ready' : 'needsProfile');
    },
    [profiles],
  );

  useEffect(() => {
    let active = true;
    auth.getSession().then((s) => {
      if (active) void resolve(s);
    });
    const unsubscribe = auth.onAuthStateChange((s) => {
      if (active) void resolve(s);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth, resolve]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      isDevelopmentMock: auth.isDevelopmentMock,
      signOut: () => auth.signOut(),
      refreshProfile: () => resolve(session),
    }),
    [status, session, profile, auth, resolve],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
