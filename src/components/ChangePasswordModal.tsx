import React, { useState } from 'react';
import {
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
} from 'lucide-react';
import { changeAdminPassword } from '../utils/auth';
import { sound } from '../utils/sound';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
  onErrorToast?: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
  onErrorToast,
}) => {
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMinLength = form.newPassword.trim().length >= 8;
  const isMatchConfirm =
    form.confirmPassword.trim().length > 0 && form.newPassword.trim() === form.confirmPassword.trim();
  const isDifferentFromOld =
    form.newPassword.trim().length > 0 &&
    form.oldPassword.trim().length > 0 &&
    form.newPassword.trim() !== form.oldPassword.trim();

  const handleClose = () => {
    setForm({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const oldPass = form.oldPassword.trim();
    const newPass = form.newPassword.trim();
    const confirmPass = form.confirmPassword.trim();

    if (!oldPass) {
      setErrorMessage('Password lama / PIN saat ini wajib diisi.');
      sound.playWrong();
      return;
    }

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
        setSuccessMessage('Password berhasil diubah.');
        if (onSuccessToast) {
          onSuccessToast('Password Admin berhasil diubah.');
        }
        setTimeout(() => {
          handleClose();
        }, 1200);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(168,85,247,0.2)] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-purple-400 uppercase tracking-widest">
                KEAMANAN AKUN
              </span>
              <h3 className="text-base font-bold text-white">Ganti Password Admin / Guru</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notices & Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5 animate-fade-in font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-fade-in font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Old Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Password Lama (Default: 123456)
            </label>
            <div className="relative">
              <input
                id="modal-input-old-password"
                type={showOldPassword ? 'text' : 'password'}
                value={form.oldPassword}
                onChange={(e) => {
                  setForm({ ...form, oldPassword: e.target.value });
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Masukkan password lama..."
                className="w-full bg-slate-950/80 border border-white/15 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
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
                id="modal-input-new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => {
                  setForm({ ...form, newPassword: e.target.value });
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Minimal 8 karakter..."
                className="w-full bg-slate-950/80 border border-white/15 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                id="modal-input-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => {
                  setForm({ ...form, confirmPassword: e.target.value });
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Ulangi password baru..."
                className="w-full bg-slate-950/80 border border-white/15 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Indicators */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              {isMinLength ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
              <span className={isMinLength ? 'text-emerald-300' : 'text-slate-400'}>Minimal 8 karakter</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {isMatchConfirm ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
              <span className={isMatchConfirm ? 'text-emerald-300' : 'text-slate-400'}>Password baru dan konfirmasi sama</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {isDifferentFromOld ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
              <span className={isDifferentFromOld ? 'text-emerald-300' : 'text-slate-400'}>Berbeda dari password lama</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-modal-save-password"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
