import { createDevAuthService } from '@/infrastructure/auth/devAuthService';
import {
  createChunkedStorage,
  type AsyncKeyValueStorage,
} from '@/infrastructure/auth/secureStorage';
import { isSupabaseConfigured, readConfig } from '@/infrastructure/config';
import { sequentialIds } from './helpers/fixtures';

describe('dev auth service', () => {
  const make = () => createDevAuthService(sequentialIds('user'), () => '2026-10-10T00:00:00.000Z');

  it('signs up, publishes the session, and signs out', async () => {
    const auth = make();
    const seen: (string | null)[] = [];
    auth.onAuthStateChange((s) => seen.push(s?.user.email ?? null));
    const result = await auth.signUpWithEmail(' JP@Example.com ', 'password1');
    expect(result).toMatchObject({
      ok: true,
      session: { user: { id: 'user-1', email: 'jp@example.com' } },
    });
    expect(await auth.getSession()).toMatchObject({ user: { id: 'user-1' } });
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
    expect(seen).toEqual(['jp@example.com', null]);
  });
  it('rejects duplicate sign-ups and wrong passwords with plain-language errors', async () => {
    const auth = make();
    await auth.signUpWithEmail('a@b.co', 'password1');
    expect(await auth.signUpWithEmail('A@B.co', 'password1')).toMatchObject({
      ok: false,
      error: { code: 'EMAIL_IN_USE' },
    });
    await auth.signOut();
    expect(await auth.signInWithEmail('a@b.co', 'wrong')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });
    expect(await auth.signInWithEmail('a@b.co', 'password1')).toMatchObject({ ok: true });
  });
  it('unsubscribe stops notifications', async () => {
    const auth = make();
    const listener = jest.fn();
    const off = auth.onAuthStateChange(listener);
    off();
    await auth.signUpWithEmail('a@b.co', 'password1');
    expect(listener).not.toHaveBeenCalled();
  });
  it('flags itself as a development mock and reports unconfigured OAuth providers honestly', async () => {
    const auth = make();
    expect(auth.isDevelopmentMock).toBe(true);
    expect(await auth.signInWithProvider('apple')).toMatchObject({
      ok: false,
      error: { code: 'PROVIDER_NOT_CONFIGURED' },
    });
  });
});

describe('chunked secure storage', () => {
  const memory = (): AsyncKeyValueStorage & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: async (k) => data.get(k) ?? null,
      setItem: async (k, v) => void data.set(k, v),
      removeItem: async (k) => void data.delete(k),
    };
  };

  it('round-trips values larger than the SecureStore limit', async () => {
    const backend = memory();
    const store = createChunkedStorage(backend);
    const big = JSON.stringify({ token: 'x'.repeat(5000), n: [1, 2, 3] });
    await store.setItem('session', big);
    expect([...backend.data.values()].every((v) => v.length <= 1800)).toBe(true);
    expect(await store.getItem('session')).toBe(big);
  });
  it('overwrites shrinking values without leaving stale chunks, and removes cleanly', async () => {
    const backend = memory();
    const store = createChunkedStorage(backend);
    await store.setItem('k', 'a'.repeat(5000));
    await store.setItem('k', 'short');
    expect(await store.getItem('k')).toBe('short');
    await store.removeItem('k');
    expect(await store.getItem('k')).toBeNull();
    expect(backend.data.size).toBe(0);
  });
  it('treats a torn write as signed out instead of returning corrupt data', async () => {
    const backend = memory();
    const store = createChunkedStorage(backend);
    await store.setItem('k', 'a'.repeat(4000));
    backend.data.delete('k.1');
    expect(await store.getItem('k')).toBeNull();
  });
});

describe('config', () => {
  it('is unconfigured without both env vars', () => {
    expect(isSupabaseConfigured(readConfig({}))).toBe(false);
    expect(
      isSupabaseConfigured(readConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })),
    ).toBe(false);
    expect(
      isSupabaseConfigured(
        readConfig({ EXPO_PUBLIC_SUPABASE_URL: ' ', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' }),
      ),
    ).toBe(false);
  });
  it('is configured with both', () => {
    expect(
      readConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k',
      }),
    ).toEqual({
      supabaseUrl: 'https://x.supabase.co',
      supabaseAnonKey: 'k',
    });
  });
});
