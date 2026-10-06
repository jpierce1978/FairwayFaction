/** Build-time configuration. EXPO_PUBLIC_* values are inlined into the JS bundle: never put secrets here. */
export interface AppConfig {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
}

export function readConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const url = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return { supabaseUrl: url || null, supabaseAnonKey: key || null };
}

export function isSupabaseConfigured(config: AppConfig): boolean {
  return config.supabaseUrl !== null && config.supabaseAnonKey !== null;
}
