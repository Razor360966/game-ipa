import React, { useState } from 'react';
import {
  Gamepad2,
  Users,
  Trophy,
  ShieldCheck,
  Share2,
  QrCode,
  Sparkles,
  Play,
  Copy,
  Check,
  Flame,
  ArrowRight,
  ExternalLink,
  Layers,
  Clock,
  ChevronRight,
  Monitor,
} from 'lucide-react';
import { GameState, Team } from '../types';
import { COLOR_MAP } from '../utils/presets';
import { sound } from '../utils/sound';

interface AccessGateProps {
  gameState: GameState;
  currentRoomId: string;
  onChangeRoomId: (newRoomId: string) => void;
  onEnterAsTeam: (teamId: string) => void;
  onEnterArenaHost: () => void;
  onEnterScoreboard: () => void;
  onRequestAdminLogin: () => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({
  gameState,
  currentRoomId,
  onChangeRoomId,
  onEnterAsTeam,
  onEnterArenaHost,
  onEnterScoreboard,
  onRequestAdminLogin,
}) => {
  const { teams, questions, settings, status, teamCardDecks } = gameState;
  const [roomInput, setRoomInput] = useState(currentRoomId);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const getShareUrl = (teamId?: string) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const params = new URLSearchParams();
    params.set('room', currentRoomId);
    if (teamId) {
      params.set('team', teamId);
      params.set('tab', 'arena');
    } else {
      params.set('tab', 'gate');
    }
    return `${origin}${pathname}?${params.toString()}`;
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    sound.playClick();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    const formatted = roomInput.trim().toUpperCase();
    onChangeRoomId(formatted);
    sound.playClick();
  };

  // Total cards in deck
  const totalQuestions = questions.length;

  return (
    <div id="access-gate-view" className="max-w-5xl mx-auto w-full py-6 px-3 sm:px-6 space-y-8 animate-fade-in text-slate-100">
      {/* Top Banner / Hero Gate Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-white/15 p-6 sm:p-10 backdrop-blur-2xl shadow-[0_0_50px_rgba(34,211,238,0.15)]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Public Access Gate • Peserta & Arena</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <span>{settings.matchTitle}</span>
            </h1>
            
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Selamat datang di portal game interaktif sains dan fisika. Pilih kelompok tim Anda di bawah ini untuk langsung masuk ke arena pertandingan dan menjawab kartu soal.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Topik: <strong className="text-white">{settings.selectedTopic || 'Semua Topik'}</strong></span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Durasi: <strong className="text-white">{settings.durationMinutes} Menit</strong></span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Status: <strong className="text-emerald-400 uppercase">{status === 'running' ? '⚡ Sedang Berlangsung' : status === 'paused' ? '⏸️ Dijeda' : '🟢 Siap Dimulai'}</strong></span>
              </span>
            </div>
          </div>

          {/* Quick Room & Teacher Gate Box */}
          <div className="w-full md:w-auto bg-slate-950/70 border border-white/15 rounded-2xl p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Room Kode:</span>
              <span className="font-mono text-sm font-black text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                {currentRoomId}
              </span>
            </div>

            <form onSubmit={handleRoomSubmit} className="flex gap-1.5">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="Ganti Room ID..."
                className="w-32 bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-cyan-400 uppercase"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
              >
                Ganti
              </button>
            </form>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white"
                title="Tampilkan QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Gate Content: Select Participant Role */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              Pilih Tim / Kelompok Peserta
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Klik kelompok Anda untuk mulai menjawab kartu soal
          </span>
        </div>

        {/* Team Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map((team) => {
            const colors = COLOR_MAP[team.color] || COLOR_MAP.cyan;
            const deck = teamCardDecks[team.id] || [];
            const answeredCount = deck.filter((c) => c.status === 'correct').length;

            return (
              <div
                key={team.id}
                id={`gate-team-card-${team.id}`}
                onClick={() => {
                  sound.playClick();
                  onEnterAsTeam(team.id);
                }}
                className={`group relative overflow-hidden rounded-3xl p-6 border transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] ${colors.bg} ${colors.border}`}
              >
                {/* Glow pill */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${colors.badge}`}>
                    {team.color}
                  </span>
                  <span className="font-mono text-2xl font-black text-white">
                    {team.score || 0} <span className="text-xs font-normal text-slate-400">PTS</span>
                  </span>
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 flex items-center justify-between">
                  <span>{team.name}</span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Kemajuan Kartu:</span>
                    <span className="font-bold text-white">
                      {answeredCount} / {totalQuestions} Selesai
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-500"
                      style={{
                        width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${colors.button}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Masuk Tim Ini</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alternative Displays (Projector Arena & Scoreboard) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Arena Proyektor Layar Utama */}
        <div
          id="gate-enter-arena-host"
          onClick={() => {
            sound.playClick();
            onEnterArenaHost();
          }}
          className="rounded-3xl bg-slate-900/60 hover:bg-slate-900/90 border border-cyan-500/20 hover:border-cyan-400/50 p-6 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-white uppercase tracking-tight group-hover:text-cyan-300 transition-colors">
                Layar Proyektor Kelas (Arena Utama)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tampilkan seluruh 4 kelompok berdampingan untuk layar besar di depan kelas.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
        </div>

        {/* Live Scoreboard Display */}
        <div
          id="gate-enter-scoreboard"
          onClick={() => {
            sound.playClick();
            onEnterScoreboard();
          }}
          className="rounded-3xl bg-slate-900/60 hover:bg-slate-900/90 border border-amber-500/20 hover:border-amber-400/50 p-6 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-white uppercase tracking-tight group-hover:text-amber-300 transition-colors">
                Layar Klasemen & Leaderboard
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tampilan skor panggung dengan animasi perolehan poin dan podium juara.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* Bottom Teacher / Admin Gate Bar */}
      <div className="rounded-2xl bg-indigo-950/30 border border-indigo-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Anda Guru / Panitia Pertandingan?</h4>
            <p className="text-xs text-slate-400">
              Masuk ke Dashboard Guru untuk mengedit Soal, mengatur Durasi, dan mengontrol Match.
            </p>
          </div>
        </div>

        <button
          id="btn-gate-teacher-login"
          type="button"
          onClick={() => {
            sound.playClick();
            onRequestAdminLogin();
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all cursor-pointer shrink-0"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Login Guru / Admin</span>
        </button>
      </div>

      {/* QR Code Share Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(34,211,238,0.3)]">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Scan untuk Masuk Pertandingan
            </h3>
            <p className="text-xs text-slate-300">
              Siswa dapat mengarahkan kamera HP ke QR Code di bawah untuk langsung membuka Room: <strong>{currentRoomId}</strong>
            </p>

            {/* QR Code Display via Public API */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  getShareUrl()
                )}`}
                alt="QR Code Game Link"
                className="w-48 h-48 mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="text-[11px] font-mono text-cyan-300 break-all bg-black/40 p-2.5 rounded-xl border border-white/10">
              {getShareUrl()}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all"
              >
                {copiedLink ? 'Tersalin!' : 'Salin URL'}
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
