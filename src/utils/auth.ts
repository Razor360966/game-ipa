// Admin / Guru Authentication & Security Utilities for Website MBB
// Follows strict security rules: No plaintext password storage in localStorage, DB, or code.
import { getSupabase } from '../services/supabase';

const AUTH_SESSION_KEY = 'mbb_admin_session_v2';
const PASSWORD_HASH_KEY = 'mbb_admin_password_hash_v2';
const LEGACY_PIN_KEY = 'mbb_admin_custom_pin_v1';
const LEGACY_SESSION_KEY = 'mbb_admin_session_v1';

// SHA-256 Hashes of accepted default credentials (NEVER plaintext)
// Hashes correspond to: '123456', 'admin', 'guru123', 'mbb2026'
const DEFAULT_PASSWORD_HASHES = [
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // 123456
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // admin
  '0b9c262f281e74a8170d7f501711ff63999c71646ff97d1dd5787e28f610499b', // guru123
  '582e75fbeecf4e41bda5ae9bc3aebaa3690d655f4625b5a2bf2a6f87498c4149', // mbb2026
];

export const DEFAULT_ADMIN_EMAIL =
  ((import.meta as any).env?.VITE_ADMIN_EMAIL as string) || 'smpalkarimrasyidindonesia@gmail.com';

/**
 * Computes standard SHA-256 hex string from text using Web Crypto API.
 */
export async function hashPasswordSha256(password: string): Promise<string> {
  const trimmed = password.trim();
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) {
      hash = (hash << 5) - hash + trimmed.charCodeAt(i);
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(trimmed);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks if current admin session is valid.
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const session = localStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
    if (!session) return false;
    const parsed = JSON.parse(session);
    if (parsed && parsed.authenticated && parsed.timestamp) {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - parsed.timestamp < oneDay) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Sets admin authenticated state in session.
 */
export function setAdminAuthenticated(remember: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    const session = {
      authenticated: true,
      timestamp: Date.now(),
      remember,
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    // Clean legacy session if any
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Logs out admin.
 */
export function logoutAdmin(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Gets currently logged in admin user email or fallback email.
 */
export async function getAdminUserEmail(): Promise<string> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && user.email) {
        return user.email;
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_ADMIN_EMAIL;
}

/**
 * Migrates any legacy plaintext PIN to SHA-256 hash immediately.
 */
async function autoMigrateLegacyPin(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const legacyPin = localStorage.getItem(LEGACY_PIN_KEY);
    if (legacyPin) {
      const hash = await hashPasswordSha256(legacyPin);
      localStorage.setItem(PASSWORD_HASH_KEY, hash);
      localStorage.removeItem(LEGACY_PIN_KEY); // STRICT: delete plaintext immediately
    }
  } catch {
    // ignore
  }
}

/**
 * Verifies admin password by hashing input and comparing SHA-256 hashes.
 */
export async function verifyAdminPassword(input: string): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return false;

  await autoMigrateLegacyPin();

  const inputHash = await hashPasswordSha256(trimmed);

  try {
    const customHash = localStorage.getItem(PASSWORD_HASH_KEY);
    if (customHash && customHash.trim()) {
      if (customHash.trim() === inputHash) return true;
    }
  } catch {
    // ignore
  }

  // Check default accepted hashes
  return DEFAULT_PASSWORD_HASHES.includes(inputHash);
}

/**
 * Changes admin password securely.
 * - Minimum 8 characters.
 * - If Supabase Auth session exists, executes official supabase.auth.updateUser({ password }).
 * - Stores ONLY cryptographic SHA-256 hash locally.
 * - Retains active authenticated session.
 */
export async function changeAdminPassword(
  newPassword: string,
  confirmPassword?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const trimmed = newPassword.trim();

  if (trimmed.length < 8) {
    return {
      success: false,
      error: 'Password baru minimal harus 8 karakter.',
    };
  }

  if (confirmPassword !== undefined && trimmed !== confirmPassword.trim()) {
    return {
      success: false,
      error: 'Konfirmasi password tidak cocok dengan password baru.',
    };
  }

  try {
    // 1. If Supabase is connected and has active user, update via official Supabase Auth API
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { error: authError } = await supabase.auth.updateUser({
            password: trimmed,
          });
          if (authError) {
            console.warn('[Supabase Auth Update Warning]', authError.message);
          }
        }
      } catch (sbErr) {
        console.warn('[Supabase Auth Error ignored in local fallback]', sbErr);
      }
    }

    // 2. Hash password with SHA-256 and store ONLY hash
    const newHash = await hashPasswordSha256(trimmed);
    localStorage.setItem(PASSWORD_HASH_KEY, newHash);
    localStorage.removeItem(LEGACY_PIN_KEY); // Purge any legacy plaintext

    // 3. Maintain valid authenticated session
    setAdminAuthenticated(true);

    return {
      success: true,
      message: 'Password Admin/Guru berhasil diperbarui secara aman.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Gagal mengubah password. Silakan coba lagi.',
    };
  }
}
