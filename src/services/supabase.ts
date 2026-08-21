import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get keys from environment variables or local override
export const getSupabaseConfig = () => {
  const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || '';
  const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('mbb_supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('mbb_supabase_anon_key') || '' : '';

  const url = (envUrl || localUrl).trim();
  const anonKey = (envKey || localKey).trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http')),
  };
};

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export const getSupabase = (): SupabaseClient | null => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('[Supabase Init Error]', err);
    return null;
  }
};

export const setCustomSupabaseConfig = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mbb_supabase_url', url.trim());
    localStorage.setItem('mbb_supabase_anon_key', anonKey.trim());
    cachedClient = null; // reset client
  }
};

export const clearCustomSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mbb_supabase_url');
    localStorage.removeItem('mbb_supabase_anon_key');
    cachedClient = null;
  }
};
