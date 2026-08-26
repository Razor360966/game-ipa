import React, { useState } from 'react';
import { Shield, KeyRound, Lock, Eye, EyeOff, Check, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { changeAdminPassword } from '../utils/auth';
import { sound } from '../utils/sound';

interface AccountSecuritySectionProps {
  onSuccessToast?: (msg: string) => void;
  onErrorToast?: (msg: string) => void;
}

export const AccountSecuritySection: React.FC<AccountSecuritySectionProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side validations
    if (!oldPassword) {
      setErrorMessage('Masukkan password lama / PIN saat ini.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('Password baru minimal harus 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok. Periksa kembali.');
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMessage('Password baru tidak boleh sama dengan password lama.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeAdminPassword(oldPassword, newPassword);
      if (res.success) {
        sound.playCorrect();
        setSuccessMessage('Password Guru / Admin berhasil diperbarui dengan aman!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onSuccessToast) {
          onSuccessToast('Password Admin berhasil diubah dan dienkripsi SHA-256.');
        }
      } else {
        sound.playWrong();
        setErrorMessage(res.error || 'Gagal mengubah password.');
        if (onErrorToast) {
          onErrorToast(res.error || 'Gagal mengubah password.');
        }
      }
    } catch (err: any) {
      sound.playWrong();
      const msg = err?.message || 'Terjadi kesalahan sistem saat memperbarui password.';
      setErrorMessage(msg);
      if (onErrorToast) {
        onErrorToast(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
              AKUN & KEAMANAN ADMIN / GURU
            </h3>
            <p className="text-xs text-slate-400">
              Ubah password akun admin untuk melindungi Dashboard, Bank Soal, dan Pengaturan
            </p>
          </div>
        </div>

        <span className="text-[11px] px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-400/30 flex items-center gap-1.5 font-semibold">
          <Lock className="w-3.5 h-3.5" />
          Enkripsi SHA-256 Aktif
        </span>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">Standar Keamanan:</p>
          <p className="text-slate-400">
            Password baru minimal <strong>8 karakter</strong>. Password dienkripsi dengan standar kriptografi 
            (SHA-256) dan tidak pernah disimpan dalam bentuk teks biasa (plaintext) di penyimpanan publik.
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

      {/* Password Change Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Old Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Password Lama / PIN Saat Ini
            </label>
            <div className="relative">
              <input
                id="input-old-password"
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password lama"
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

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Password Baru (Min. 8 Karakter)
            </label>
            <div className="relative">
              <input
                id="input-new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
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

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                id="input-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
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

        {/* Action Button */}
        <div className="flex justify-end pt-2">
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
                <span>Simpan Password Baru</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
