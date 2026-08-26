// Supabase Authentication & Security Module for MBB Admin / Guru
// Single Source of Truth: Supabase Cloud Authentication (GoTrue)
// NO plaintext or hardcoded admin passwords in localStorage as source of truth.
import { getSupabase } from '../services/supabase';
import { getUserProfileFromDb, upsertUserProfileInDb } from '../services/dbService';
import type { UserProfile, UserRole } from '../types';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

// Default Admin / Teacher Email
export const DEFAULT_ADMIN_EMAIL =
  ((import.meta as any).env?.VITE_ADMIN_EMAIL as string) || 'smpalkarimrasyidindonesia@gmail.com';

// Clean up any legacy localStorage password hashes and plaintexts
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('mbb_admin_password_hash_v2');
    localStorage.removeItem('mbb_admin_custom_pin_v1');
    localStorage.removeItem('mbb_admin_session_v1');
    localStorage.removeItem('mbb_admin_session_v2');
  } catch {
    // ignore
  }
}

/**
 * Returns the currently authenticated Supabase Auth session if active.
 */
export async function getAdminSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return data.session;
  } catch (err) {
    console.error('[getAdminSession Error]', err);
    return null;
  }
}

/**
 * Returns the currently authenticated Supabase user.
 */
export async function getCurrentAdminUser(): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch (err) {
    console.error('[getCurrentAdminUser Error]', err);
    return null;
  }
}

/**
 * Synchronous / initial check for admin session in local Supabase storage cache.
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Check if Supabase standard auth token exists in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth-token')) && key.endsWith('-auth-token')) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && (parsed.access_token || parsed.user)) {
            return true;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Subscribes to Supabase Auth state changes.
 */
export function onAdminAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): { unsubscribe: () => void } {
  const supabase = getSupabase();
  if (!supabase) {
    return { unsubscribe: () => {} };
  }
  const { data } = supabase.auth.onAuthStateChange(callback);
  return {
    unsubscribe: () => {
      data.subscription.unsubscribe();
    },
  };
}

/**
 * Signs in admin/guru using Supabase Authentication.
 */
export async function loginAdminWithSupabase(
  password: string,
  email?: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client belum terkonfigurasi. Periksa VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.',
    };
  }

  const targetEmail = (email && email.trim()) || DEFAULT_ADMIN_EMAIL;
  const targetPassword = password.trim();

  if (!targetPassword) {
    return { success: false, error: 'Password admin tidak boleh kosong.' };
  }

  try {
    // 1. Attempt Sign In with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: targetPassword,
    });

    if (!error && data.user) {
      console.log('[MBB][AUTH] Admin login successful via Supabase Auth:', data.user.email);
      return { success: true, user: data.user };
    }

    // 2. If user doesn't exist yet on fresh Supabase project, try auto sign-up
    if (error && (error.message.includes('Invalid login credentials') || error.message.includes('User not found'))) {
      // If default credentials or first setup, attempt initial sign-up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: targetEmail,
        password: targetPassword,
      });

      if (!signUpError && signUpData.user) {
        console.log('[MBB][AUTH] Admin account initialized via Supabase Auth:', signUpData.user.email);
        return { success: true, user: signUpData.user };
      }
    }

    return {
      success: false,
      error: error?.message || 'Login gagal. Periksa kembali email dan password admin.',
    };
  } catch (err: any) {
    console.error('[MBB][AUTH Login Error]', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan saat memverifikasi ke Supabase Cloud.',
    };
  }
}

/**
 * Legacy compatibility alias for verifyAdminPassword
 */
export async function verifyAdminPassword(password: string, email?: string): Promise<boolean> {
  const res = await loginAdminWithSupabase(password, email);
  return res.success;
}

/**
 * Marks admin authenticated (kept for interface compatibility).
 */
export function setAdminAuthenticated(_remember: boolean = true): void {
  // Session is now handled directly by Supabase Auth persistSession
}

/**
 * Logs out admin from Supabase Cloud session.
 */
export async function logoutAdmin(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
      console.log('[MBB][AUTH] Admin logged out from Supabase Auth.');
    } catch (err) {
      console.warn('[MBB][AUTH SignOut Warning]', err);
    }
  }
  // Clear any residual keys
  try {
    localStorage.removeItem('mbb_admin_session_v2');
    localStorage.removeItem('mbb_admin_password_hash_v2');
  } catch {
    // ignore
  }
}

/**
 * Gets currently logged in admin user email or fallback.
 */
export async function getAdminUserEmail(): Promise<string> {
  const user = await getCurrentAdminUser();
  if (user && user.email) {
    return user.email;
  }
  return DEFAULT_ADMIN_EMAIL;
}

/**
 * Changes admin password in Supabase Cloud Authentication.
 * Updates password directly on Supabase GoTrue server so it propagates to all devices instantly!
 */
export async function changeAdminPassword(
  oldPassword: string,
  newPassword: string,
  confirmPassword?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const trimmedOld = oldPassword.trim();
  const trimmedNew = newPassword.trim();

  // 1. Validation
  if (!trimmedOld) {
    return { success: false, error: 'Password lama saat ini wajib diisi.' };
  }

  if (!trimmedNew) {
    return { success: false, error: 'Password baru tidak boleh kosong.' };
  }

  if (trimmedNew.length < 8) {
    return { success: false, error: 'Password baru minimal 8 karakter.' };
  }

  if (trimmedNew === trimmedOld) {
    return { success: false, error: 'Password baru tidak boleh sama dengan password lama.' };
  }

  if (confirmPassword !== undefined && trimmedNew !== confirmPassword.trim()) {
    return { success: false, error: 'Konfirmasi password tidak sama dengan password baru.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client tidak tersedia. Tidak dapat mengubah password cloud.',
    };
  }

  try {
    // 2. Verify current credentials against Supabase Auth
    const email = await getAdminUserEmail();
    const verifyRes = await supabase.auth.signInWithPassword({
      email,
      password: trimmedOld,
    });

    if (verifyRes.error) {
      return {
        success: false,
        error: 'Password lama tidak benar sesuai data Supabase Cloud.',
      };
    }

    // 3. Update password on Supabase Auth Cloud
    const { error: updateError } = await supabase.auth.updateUser({
      password: trimmedNew,
    });

    if (updateError) {
      return {
        success: false,
        error: `Gagal memperbarui password di Supabase: ${updateError.message}`,
      };
    }

    console.log('[MBB][AUTH] Password successfully updated in Supabase Cloud for:', email);

    return {
      success: true,
      message: 'Password berhasil diubah di Supabase Cloud dan berlaku untuk semua perangkat!',
    };
  } catch (err: any) {
    console.error('[MBB][AUTH Change Password Error]', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat mengubah password.',
    };
  }
}

/**
 * Sends a password reset recovery link via Supabase Auth email.
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client belum terkonfigurasi. Periksa koneksi Supabase Anda.',
    };
  }

  const targetEmail = email.trim();
  if (!targetEmail) {
    return {
      success: false,
      error: 'Email wajib diisi untuk mengirim link pemulihan password.',
    };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Gagal mengirim email reset password.',
      };
    }

    return {
      success: true,
      message: `Link reset password telah dikirim ke ${targetEmail}. Silakan periksa inbox / spam Anda.`,
    };
  } catch (err: any) {
    console.error('[MBB][AUTH Reset Password Error]', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan saat memproses permintaan reset password.',
    };
  }
}

/**
 * Returns the current authenticated admin / teacher UserProfile from DB.
 */
export async function getCurrentAdminProfile(): Promise<UserProfile | null> {
  const user = await getCurrentAdminUser();
  if (!user) return null;

  try {
    const dbProfile = await getUserProfileFromDb(user.id);
    if (dbProfile) return dbProfile;

    // Fallback initialize profile
    const userRole: UserRole =
      user.email === DEFAULT_ADMIN_EMAIL || (user.app_metadata && user.app_metadata.role === 'admin')
        ? 'admin'
        : 'teacher';

    const fallbackProfile: UserProfile = {
      id: user.id,
      email: user.email || DEFAULT_ADMIN_EMAIL,
      role: userRole,
    };

    await upsertUserProfileInDb(fallbackProfile);
    return fallbackProfile;
  } catch (err) {
    console.error('[getCurrentAdminProfile Error]', err);
    return {
      id: user.id,
      email: user.email || DEFAULT_ADMIN_EMAIL,
      role: 'teacher',
    };
  }
}

