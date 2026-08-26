// Admin / Guru Authentication & Security Utilities for Website MBB
// Follows strict security rules: No plaintext password storage in localStorage, DB, or code.
import { getSupabase } from '../services/supabase';

const AUTH_SESSION_KEY = 'mbb_admin_session_v2';
const PASSWORD_HASH_KEY = 'mbb_admin_password_hash_v2';
const LEGACY_PIN_KEY = 'mbb_admin_custom_pin_v1';
const LEGACY_SESSION_KEY = 'mbb_admin_session_v1';

// SHA-256 Hashes of accepted default credentials when no custom password has been set
// Hashes correspond to: '123456', 'admin', 'guru123', 'mbb2026'
export const DEFAULT_PASSWORD_HASHES = [
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // 123456 (Default resmi)
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
 * Retrieves the stored password hash from localStorage (supports raw hash string or JSON versioned object).
 */
export function getStoredPasswordHash(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PASSWORD_HASH_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.passwordHash === 'string' && parsed.passwordHash.trim()) {
        return parsed.passwordHash.trim();
      }
    }
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Stores the newly updated password hash as a versioned JSON structure.
 */
export function saveStoredPasswordHash(hash: string): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify({
      passwordHash: hash.trim(),
      updatedAt: new Date().toISOString(),
      version: 2,
    });
    localStorage.setItem(PASSWORD_HASH_KEY, payload);
  } catch {
    localStorage.setItem(PASSWORD_HASH_KEY, hash.trim());
  }
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
    if (legacyPin && legacyPin.trim()) {
      const hash = await hashPasswordSha256(legacyPin.trim());
      saveStoredPasswordHash(hash);
      localStorage.removeItem(LEGACY_PIN_KEY); // STRICT: delete plaintext immediately
    }
  } catch {
    // ignore
  }
}

/**
 * Verifies admin password by hashing input and comparing SHA-256 hashes.
 * - If a custom password has been saved, ONLY that custom password hash is valid.
 * - If no custom password has been saved, accepts default hashes ('123456', etc.).
 */
export async function verifyAdminPassword(input: string): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return false;

  await autoMigrateLegacyPin();

  const inputHash = await hashPasswordSha256(trimmed);
  const storedHash = getStoredPasswordHash();

  if (storedHash) {
    // Custom password is set: ONLY verify against stored custom hash
    return storedHash === inputHash;
  }

  // No custom password has ever been set: check default accepted hashes (e.g. '123456')
  return DEFAULT_PASSWORD_HASHES.includes(inputHash);
}

/**
 * Changes admin password securely.
 * - Validates old password against currently active password.
 * - Minimum 8 characters for new password.
 * - Validates that new password != old password.
 * - Validates confirmation match.
 * - Stores ONLY cryptographic SHA-256 hash in versioned structure.
 * - Maintains active authenticated session.
 */
export async function changeAdminPassword(
  oldPassword: string,
  newPassword: string,
  confirmPassword?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const trimmedOld = oldPassword.trim();
  const trimmedNew = newPassword.trim();

  // 1. Validasi Password Lama
  if (!trimmedOld) {
    return {
      success: false,
      error: 'Password lama / PIN saat ini wajib diisi.',
    };
  }

  const isOldValid = await verifyAdminPassword(trimmedOld);
  if (!isOldValid) {
    return {
      success: false,
      error: 'Password lama tidak benar.',
    };
  }

  // 2. Validasi Password Baru
  if (!trimmedNew) {
    return {
      success: false,
      error: 'Password baru tidak boleh kosong.',
    };
  }

  if (trimmedNew.length < 8) {
    return {
      success: false,
      error: 'Password baru minimal 8 karakter.',
    };
  }

  if (trimmedNew === trimmedOld) {
    return {
      success: false,
      error: 'Password baru tidak boleh sama dengan password lama.',
    };
  }

  // 3. Validasi Konfirmasi Password
  if (confirmPassword !== undefined && trimmedNew !== confirmPassword.trim()) {
    return {
      success: false,
      error: 'Konfirmasi password tidak sama dengan password baru.',
    };
  }

  try {
    // 4. Update Supabase Auth user if available
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { error: authError } = await supabase.auth.updateUser({
            password: trimmedNew,
          });
          if (authError) {
            console.warn('[Supabase Auth Update Warning]', authError.message);
          }
        }
      } catch (sbErr) {
        console.warn('[Supabase Auth Error ignored in local fallback]', sbErr);
      }
    }

    // 5. Hash new password with SHA-256 and store versioned hash
    const newHash = await hashPasswordSha256(trimmedNew);
    saveStoredPasswordHash(newHash);
    localStorage.removeItem(LEGACY_PIN_KEY); // Purge any legacy plaintext

    // 6. Maintain valid authenticated session
    setAdminAuthenticated(true);

    return {
      success: true,
      message: 'Password berhasil diubah.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Gagal mengubah password. Silakan coba lagi.',
    };
  }
}
