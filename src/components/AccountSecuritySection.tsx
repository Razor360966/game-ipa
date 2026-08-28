import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RotateCcw,
  UserCheck,
  Mail,
  Send,
  User,
  Sparkles,
} from 'lucide-react';
import { changeAdminPassword, getCurrentAdminProfile, requestPasswordReset } from '../utils/auth';
import { upsertUserProfileInDb } from '../services/dbService';
import type { UserProfile } from '../types';
import { sound } from '../utils/sound';

interface AccountSecuritySectionProps {
  onSuccessToast?: (msg: string) => void;
  onErrorToast?: (msg: string) => void;
}

export const AccountSecuritySection: React.FC<AccountSecuritySectionProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    getCurrentAdminProfile().then((p) => {
      if (p) {
        setProfile(p);
        setDisplayName(p.name || '');
      }
    });
  }, []);

  const handleSaveProfileName = async () => {
    if (!profile?.id) return;
    setIsSavingProfile(true);
    try {
      const res = await upsertUserProfileInDb({
        id: profile.id,
        name: displayName.trim(),
        email: profile.email,
        role: profile.role,
      });
      if (res.success) {
        setProfile((prev) => (prev ? { ...prev, name: displayName.trim() } : prev));
        setProfileSaveSuccess(true);
        sound.playCorrect();
        if (onSuccessToast) onSuccessToast('Nama profil Guru/Admin berhasil diperbarui!');
        setTimeout(() => setProfileSaveSuccess(false), 3000);
      } else {
        sound.playWrong();
        if (onErrorToast) onErrorToast(res.error || 'Gagal memperbarui profil.');
      }
    } catch {
      sound.playWrong();
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!profile?.email) return;
    setIsSendingReset(true);
    setResetMessage(null);
    try {
      const res = await requestPasswordReset(profile.email);
      if (res.success) {
        sound.playCorrect();
        setResetMessage(res.message || 'Link reset password telah dikirim ke email Anda.');
        if (onSuccessToast) onSuccessToast('Link reset password telah dikirim!');
      } else {
        sound.playWrong();
        setErrorMessage(res.error || 'Gagal mengirim email reset password.');
        if (onErrorToast) onErrorToast(res.error || 'Gagal mengirim email.');
      }
    } catch (err: any) {
      sound.playWrong();
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSendingReset(false);
    }
  };

  // Real-time validation indicators
  const isMinLength = form.newPassword.trim().length >= 8;
  const isMatchConfirm =
    form.confirmPassword.trim().length > 0 && form.newPassword.trim() === form.confirmPassword.trim();
  const isDifferentFromOld =
    form.newPassword.trim().length > 0 &&
    form.oldPassword.trim().length > 0 &&
    form.newPassword.trim() !== form.oldPassword.trim();

  const handleResetForm = () => {
    setForm({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    sound.playClick();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const oldPass = form.oldPassword.trim();
    const newPass = form.newPassword.trim();
    const confirmPass = form.confirmPassword.trim();

    // 1. Validasi Password Lama Terisi
    if (!oldPass) {
      setErrorMessage('Password lama / PIN saat ini wajib diisi.');
      sound.playWrong();
      return;
    }

    // 2. Validasi Password Baru
    if (!newPass || newPass.length < 8) {
      setErrorMessage('Password baru minimal 8 karakter.');
      sound.playWrong();
      return;
    }

    if (newPass === oldPass) {
      setErrorMessage('Password baru tidak boleh sama dengan password lama.');
      sound.playWrong();
      return;
    }

    // 3. Validasi Konfirmasi
    if (newPass !== confirmPass) {
      setErrorMessage('Konfirmasi password tidak sama dengan password baru.');
      sound.playWrong();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeAdminPassword(oldPass, newPass, confirmPass);
      if (res.success) {
        sound.playCorrect();
        setSuccessMessage('Password berhasil diubah. Akun Admin kini terlindungi di semua perangkat!');
        setForm({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        if (onSuccessToast) {
          onSuccessToast('Password Admin berhasil diubah.');
        }
      } else {
        sound.playWrong();
        setErrorMessage(res.error || 'Password lama tidak benar.');
        if (onErrorToast) {
          onErrorToast(res.error || 'Password lama tidak benar.');
        }
      }
    } catch (err: any) {
      sound.playWrong();
      const msg = err?.message || 'Terjadi kesalahan saat mengubah password.';
      setErrorMessage(msg);
      if (onErrorToast) {
        onErrorToast(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                Profil Pengguna Guru / Admin
              </h3>
              <p className="text-xs text-slate-400">
                Informasi identitas akun dan hak akses kontrol kompetensi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                profile?.role === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ROLE: {profile?.role ? profile.role.toUpperCase() : 'GURU / TEACHER'}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Display */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-white/5 border border-white/10">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Email Akun Terdaftar</span>
            </label>
            <div className="text-sm font-mono font-bold text-white break-all">
              {profile?.email || 'Memuat...'}
            </div>
            <p className="text-[10px] text-slate-400">
              Autentikasi terpusat pada Supabase GoTrue Auth Service.
            </p>
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Nama Lengkap Guru / Admin</span>
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Bpk. Rasyid, S.Pd."
                  className="flex-1 bg-slate-950/90 border border-white/15 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveProfileName}
                  disabled={isSavingProfile}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-all shrink-0 flex items-center gap-1.5"
                >
                  {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Simpan</span>
                </button>
              </div>
            </div>
            {profileSaveSuccess && (
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                ✓ Nama profil berhasil diperbarui di database.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Password Management Card */}
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                Ganti Password Akun Guru / Admin
              </h3>
              <p className="text-xs text-slate-400">
                Ubah password akun admin untuk melindungi Dashboard, Bank Soal, dan Pengaturan
              </p>
            </div>
          </div>

          <span className="text-[11px] px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-400/30 flex items-center gap-1.5 font-semibold">
            <Lock className="w-3.5 h-3.5" />
            Supabase Cloud Auth Aktif
          </span>
        </div>

        {/* Security notice */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-bold text-white">Keamanan Cloud Multi-Perangkat:</p>
            <p className="text-slate-400">
              Perubahan password langsung diverifikasi dan disimpan ke <strong>Supabase Cloud Auth</strong>. Saat diganti di Perangkat A (misal Laptop Guru), password baru langsung berlaku untuk login di Perangkat B (misal HP/Tablet) tanpa perlu konfigurasi ulang.
            </p>
          </div>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-3 animate-fade-in font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3 animate-fade-in font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {resetMessage && (
          <div className="p-4 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-3 animate-fade-in font-medium">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {/* Password Change Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Old Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Password Lama</span>
                <span className="text-[10px] text-slate-400 font-normal">Wajib</span>
              </label>
              <div className="relative">
                <input
                  id="input-old-password"
                  type={showOldPassword ? 'text' : 'password'}
                  value={form.oldPassword}
                  onChange={(e) => {
                    setForm({ ...form, oldPassword: e.target.value });
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Masukkan password lama..."
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  title={showOldPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 2. New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Password Baru</span>
                <span className="text-[10px] text-slate-400 font-normal">Min. 8 Karakter</span>
              </label>
              <div className="relative">
                <input
                  id="input-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={(e) => {
                    setForm({ ...form, newPassword: e.target.value });
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Minimal 8 karakter..."
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  title={showNewPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Confirm New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Konfirmasi Password Baru</span>
                <span className="text-[10px] text-slate-400 font-normal">Cocokkan</span>
              </label>
              <div className="relative">
                <input
                  id="input-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => {
                    setForm({ ...form, confirmPassword: e.target.value });
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Ketik ulang password baru..."
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  title={showConfirmPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Checklist Indicators */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Indikator Kelayakan Password:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-medium">
              {/* Length Indicator */}
              <div
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  form.newPassword.length === 0
                    ? 'bg-white/5 border-white/10 text-slate-400'
                    : isMinLength
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                }`}
              >
                {isMinLength ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                <span>Minimal 8 karakter</span>
              </div>

              {/* Match Indicator */}
              <div
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  form.confirmPassword.length === 0
                    ? 'bg-white/5 border-white/10 text-slate-400'
                    : isMatchConfirm
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                }`}
              >
                {isMatchConfirm ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <X className="w-4 h-4 text-rose-400" />
                )}
                <span>{isMatchConfirm ? 'Password baru dan konfirmasi sama' : 'Password belum sama'}</span>
              </div>

              {/* Different from old Indicator */}
              <div
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  form.newPassword.length === 0 || form.oldPassword.length === 0
                    ? 'bg-white/5 border-white/10 text-slate-400'
                    : isDifferentFromOld
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                }`}
              >
                {isDifferentFromOld ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <X className="w-4 h-4 text-rose-400" />
                )}
                <span>Berbeda dari password lama</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Simpan, Reset Email & Batal */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={isSendingReset || !profile?.email}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingReset ? 'Mengirim link...' : 'Kirim Link Reset Password ke Email'}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>

              <button
                id="btn-submit-change-password"
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Password...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
