import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { verifyAdminPassword, setAdminAuthenticated } from '../utils/auth';
import { sound } from '../utils/sound';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Silakan masukkan PIN / Password Admin');
      return;
    }

    if (verifyAdminPassword(pin)) {
      setAdminAuthenticated(remember);
      sound.playCorrect();
      setError(null);
      setPin('');
      onSuccess();
    } else {
      sound.playWrong();
      setError('PIN / Password salah! (Default: 123456 atau admin)');
    }
  };

  return (
    <div
      id="admin-login-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-slate-900/95 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(79,70,229,0.3)] relative overflow-hidden text-slate-100">
        {/* Glow Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500" />
        
        {/* Close Button */}
        <button
          id="btn-close-admin-login"
          type="button"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                Akses Terproteksi
              </span>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight mt-0.5">
              Login Guru / Admin
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Silakan masukkan PIN atau Password Administrator untuk mengelola <strong>Bank Soal</strong>, <strong>Kontrol Match</strong>, dan <strong>Pengaturan Pertandingan</strong>.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>PIN / Password Guru</span>
              <span className="text-[10px] text-indigo-400 font-normal">Default: 123456</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-admin-password"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Masukkan PIN Admin..."
                autoFocus
                className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl pl-10 pr-11 py-3 text-sm font-mono font-bold text-white outline-none transition-all placeholder:font-sans placeholder:font-normal placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                title={showPin ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-rose-400 font-semibold mt-1 flex items-center gap-1.5">
                <span>⚠️</span> {error}
              </p>
            )}
          </div>

          {/* Quick PIN Pills for Convenience */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400">Pilihan Cepat:</span>
            <button
              type="button"
              onClick={() => {
                setPin('123456');
                setError(null);
              }}
              className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300"
            >
              123456
            </button>
            <button
              type="button"
              onClick={() => {
                setPin('admin');
                setError(null);
              }}
              className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300"
            >
              admin
            </button>
          </div>

          {/* Remember Me */}
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-white/20 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Ingat sesi login di perangkat ini</span>
          </label>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col gap-2">
            <button
              id="btn-submit-admin-login"
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Masuk Dashboard Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Kembali ke Akses Publik
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
