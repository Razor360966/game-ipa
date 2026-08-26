import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables are bundled at build/deployment time
const SUPABASE_URL = ((import.meta as any).env?.VITE_SUPABASE_URL as string || '').trim();
const SUPABASE_ANON_KEY = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string || '').trim();

export const getSupabaseConfig = () => {
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    isConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')),
  };
};

let cachedClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('[Supabase Init Error]', err);
    return null;
  }
};
