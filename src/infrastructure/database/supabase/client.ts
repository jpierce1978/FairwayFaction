import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSessionStorage } from '@/infrastructure/auth/secureStorage';
import { isSupabaseConfigured, type AppConfig } from '@/infrastructure/config';

export function createSupabaseClient(config: AppConfig): SupabaseClient {
  if (!isSupabaseConfigured(config)) {
    throw new Error(
      'Supabase is not configured (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
    );
  }
  return createClient(config.supabaseUrl!, config.supabaseAnonKey!, {
    auth: {
      storage: createSessionStorage(),
      autoRefreshToken: true,
      persistSession: true,
      // Deep-link/OAuth callbacks are handled explicitly when providers are added.
      detectSessionInUrl: false,
    },
  });
}
