import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, ArrowRight, KeyRound, Sparkles, Mail, Cloud, HelpCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { loginAdminWithSupabase, requestPasswordReset, DEFAULT_ADMIN_EMAIL } from '../utils/auth';
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
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Silakan masukkan email akun Guru/Admin');
        return;
      }
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      try {
        const res = await requestPasswordReset(email);
        if (res.success) {
          sound.playCorrect();
          setSuccessMsg(res.message || 'Link reset password telah dikirim ke email Anda.');
        } else {
          sound.playWrong();
          setError(res.error || 'Gagal mengirim email reset password.');
        }
      } catch (err: any) {
        setError(err?.message || 'Terjadi kesalahan pengiriman email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      setError('Silakan masukkan Password Admin');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await loginAdminWithSupabase(password, email);
      if (res.success) {
        sound.playCorrect();
        setError(null);
        setPassword('');
        onSuccess();
      } else {
        sound.playWrong();
        setError(res.error || 'Password atau email admin salah. Periksa kembali akun Anda.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan validasi ke server Supabase.');
    } finally {
      setLoading(false);
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
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            {mode === 'login' ? <ShieldCheck className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Supabase Cloud Auth
              </span>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight mt-0.5">
              {mode === 'login' ? 'Login Guru / Admin' : 'Pemulihan Password'}
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-5 leading-relaxed">
          {mode === 'login'
            ? 'Autentikasi akun Guru/Admin terhubung ke cloud. Password berlaku di seluruh perangkat (Laptop, HP, Tablet).'
            : 'Masukkan email akun Guru / Admin Anda untuk menerima tautan pemulihan password langsung ke inbox email.'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Info / Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <label htmlFor="input-admin-email" className="uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Akun Email Guru / Admin</span>
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setShowEmailInput(!showEmailInput)}
                  className="text-[10px] text-cyan-400 hover:underline cursor-pointer font-normal"
                >
                  {showEmailInput ? 'Gunakan Default' : 'Ubah Email'}
                </button>
              )}
            </div>

            {showEmailInput || mode === 'forgot' ? (
              <input
                id="input-admin-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="nama@sekolah.sch.id"
                required
                className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl px-4 py-2.5 text-xs font-mono text-white outline-none"
              />
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300 truncate">
                {email}
              </div>
            )}
          </div>

          {/* Password Input (Only in Login Mode) */}
          {mode === 'login' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="input-admin-password" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password Admin
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setSuccessMsg(null);
                    sound.playClick();
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Masukkan password admin..."
                  autoFocus
                  autoComplete="current-password"
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl pl-10 pr-11 py-3 text-sm font-mono font-bold text-white outline-none transition-all placeholder:font-sans placeholder:font-normal placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-400 font-semibold mt-1 flex items-center gap-1.5 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              <span>⚠️</span> {error}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1.5 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
            </p>
          )}

          {/* Remember Me */}
          {mode === 'login' && (
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-white/20 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Pertahankan sesi login di browser ini</span>
            </label>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col gap-2">
            {mode === 'login' ? (
              <button
                id="btn-submit-admin-login"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Memverifikasi ke Cloud...' : 'Masuk Dashboard Admin'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="btn-submit-reset-password"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>{loading ? 'Mengirim Permintaan...' : 'Kirim Link Reset Password'}</span>
              </button>
            )}

            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                  sound.playClick();
                }}
                className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Form Login
              </button>
            ) : (
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
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

