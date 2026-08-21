import React, { useState, useEffect } from 'react';
import {
  Database,
  Wifi,
  WifiOff,
  Copy,
  Check,
  RefreshCw,
  X,
  Share2,
  Server,
  Cloud,
} from 'lucide-react';
import { getSupabaseConfig } from '../services/supabase';
import {
  checkDbConnection,
  saveCompetitionToDb,
} from '../services/dbService';
import { GameState } from '../types';

interface DbSyncBarProps {
  currentRoomId: string;
  onChangeRoomId: (newRoomId: string) => void;
  gameState: GameState;
  onMigrateSuccess: () => void;
  isSyncing?: boolean;
}

export const DbSyncBar: React.FC<DbSyncBarProps> = ({
  currentRoomId,
  onChangeRoomId,
  gameState,
  onMigrateSuccess,
  isSyncing,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; tablesExist?: boolean; message: string }>({
    ok: false,
    tablesExist: false,
    message: 'Memeriksa koneksi ke Supabase Cloud...',
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrateMessage, setMigrateMessage] = useState<string | null>(null);
  const [inputRoomId, setInputRoomId] = useState(currentRoomId);

  const cfg = getSupabaseConfig();

  const refreshStatus = async () => {
    const res = await checkDbConnection();
    setDbStatus(res);
  };

  useEffect(() => {
    refreshStatus();
    setInputRoomId(currentRoomId);
  }, [currentRoomId]);

  const handlePushCloudBackup = async () => {
    setIsMigrating(true);
    setMigrateMessage(null);
    try {
      const ok = await saveCompetitionToDb(gameState, currentRoomId);
      if (ok) {
        setMigrateMessage('✅ Data berhasil diperbarui di Supabase Cloud!');
        onMigrateSuccess();
        refreshStatus();
      } else {
        setMigrateMessage('❌ Gagal memperbarui data ke cloud.');
      }
    } catch (err: any) {
      setMigrateMessage(`❌ Error: ${err?.message || 'Gagal'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const copyDisplayUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', currentRoomId);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Lock background scroll and handle ESC key when modal is open
  useEffect(() => {
    if (isConfigOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsConfigOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isConfigOpen]);

  return (
    <>
      {/* Top Floating Pill */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-lg cursor-pointer ${
            dbStatus.ok
              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
          }`}
          title="Status Sinkronisasi Supabase Cloud"
        >
          {dbStatus.ok ? (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          )}

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[10px] text-slate-400 uppercase">ROOM:</span>
            <span className="text-white font-black">{currentRoomId}</span>
          </div>

          {isSyncing && (
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin ml-1" />
          )}
        </button>
      </div>

      {/* Sync / Database Info Modal */}
      {isConfigOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsConfigOpen(false)}
        >
          <div
            className="bg-slate-900 border border-cyan-400/30 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] sm:max-h-[85vh] my-auto overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 px-5 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex items-center justify-between bg-slate-900/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
                  <Cloud className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">Supabase Cloud Multi-Device</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">Single Source of Truth untuk Seluruh Gadget</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 sm:space-y-5 text-slate-200">
              {/* Connection Status Badge */}
              <div
                className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                  dbStatus.ok
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {dbStatus.ok ? (
                    <Wifi className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1 flex-1">
                    <p className="font-bold uppercase tracking-wide">
                      {dbStatus.ok ? 'Terhubung ke Supabase Cloud' : 'Menghubungkan ke Cloud...'}
                    </p>
                    <p className="text-slate-300 opacity-90 text-[11px]">{dbStatus.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshStatus}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" /> Cek
                  </button>
                </div>
              </div>

              {/* Room ID Selection */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Room ID Pertandingan Aktif
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                    placeholder="Contoh: MBB-2026-001"
                    className="flex-1 bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inputRoomId.trim()) {
                        onChangeRoomId(inputRoomId.trim());
                        setIsConfigOpen(false);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-bold text-xs text-slate-950 shadow-lg cursor-pointer transition-all shrink-0"
                  >
                    Buka Room
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Buka Room ID yang sama di Laptop Proyektor, HP Juri, dan Tablet untuk menyamakan data real-time.
                </p>
              </div>

              {/* Copy Display Link */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/40 border border-white/10">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" /> Tautan Langsung Perangkat
                  </p>
                  <p className="text-[11px] text-slate-400">Buka di browser HP / Laptop lain untuk langsung terhubung ke room ini</p>
                </div>
                <button
                  type="button"
                  onClick={copyDisplayUrl}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Tersalin!' : 'Salin URL'}
                </button>
              </div>

              {/* Admin Cloud Backup Action */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-400" /> Sinkronisasi Status ke Cloud
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Simpan pembaruan status pertandingan aktif ke Supabase Cloud agar seluruh perangkat langsung menerima data terbaru.
                </p>
                {migrateMessage && (
                  <div className="p-2 rounded-lg bg-slate-900 border border-white/10 text-xs font-medium text-slate-200">
                    {migrateMessage}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handlePushCloudBackup}
                  disabled={isMigrating}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isMigrating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {isMigrating ? 'Menyinkronkan ke Cloud...' : 'Sinkronkan State ke Supabase Cloud'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
