import React, { useState, useEffect } from 'react';
import {
  Database,
  Wifi,
  WifiOff,
  Share2,
  Copy,
  Check,
  UploadCloud,
  Settings,
  RefreshCw,
  X,
  Layers,
  ExternalLink,
} from 'lucide-react';
import {
  getSupabaseConfig,
  setCustomSupabaseConfig,
  clearCustomSupabaseConfig,
} from '../services/supabase';
import {
  checkDbConnection,
  saveCompetitionToDb,
  SUPABASE_SQL_SCHEMA,
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
    message: 'Memeriksa koneksi...',
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrateMessage, setMigrateMessage] = useState<string | null>(null);

  const [inputRoomId, setInputRoomId] = useState(currentRoomId);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  const cfg = getSupabaseConfig();

  const refreshStatus = async () => {
    const res = await checkDbConnection();
    setDbStatus(res);
  };

  useEffect(() => {
    refreshStatus();
    setInputRoomId(currentRoomId);
    setCustomUrl(cfg.url);
    setCustomKey(cfg.anonKey);
  }, [currentRoomId]);

  const handleSaveConfig = () => {
    if (customUrl && customKey) {
      setCustomSupabaseConfig(customUrl, customKey);
      refreshStatus();
      setMigrateMessage('Kredensial disimpan.');
    }
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    setMigrateMessage(null);
    try {
      const ok = await saveCompetitionToDb(gameState, currentRoomId);
      if (ok) {
        setMigrateMessage('✅ Berhasil migrasi data ke Cloud Database Supabase!');
        onMigrateSuccess();
        refreshStatus();
      } else {
        setMigrateMessage('❌ Gagal migrasi. Pastikan tabel SQL sudah dibuat di Supabase.');
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

  const copySqlSchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
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
          title="Sinkronisasi Cloud Database Supabase"
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

      {/* Sync / Database Management Modal */}
      {isConfigOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsConfigOpen(false)}
        >
          <div
            className="bg-slate-900 border border-cyan-400/30 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] sm:max-h-[85vh] my-auto overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Sticky Header: Never clipped, always visible */}
            <div className="shrink-0 px-5 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex items-center justify-between bg-slate-900/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
                  <Database className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">Sinkronisasi Database Supabase</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">Satu Database Bersama untuk Semua PC & Layar</p>
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

            {/* Scrollable Content Body: Smooth vertical scroll for short viewports */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 sm:space-y-5 text-slate-200">
              {/* Connection Status Badge */}
              <div
                className={`p-4 rounded-2xl border flex flex-col gap-3 ${
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
                    <p className="font-bold">{dbStatus.ok ? 'DATABASE TERHUBUNG AKTIF' : 'KONEKSI LOKAL / STANDALONE'}</p>
                    <p className="text-slate-300 opacity-90">{dbStatus.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshStatus}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" /> Cek
                  </button>
                </div>

                {!dbStatus.ok && (
                  <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-200/90 font-medium">
                      Jalankan skema SQL di Supabase SQL Editor sekali saja:
                    </span>
                    <button
                      type="button"
                      onClick={copySqlSchema}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? 'Skema SQL Tersalin!' : 'Salin Skema SQL'}
                    </button>
                  </div>
                )}
              </div>

              {/* Room ID Selection */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Room ID Pertandingan Saat Ini
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
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-xs text-white shadow-lg cursor-pointer transition-all shrink-0"
                  >
                    Buka Room
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  PC Layar Utama & PC Juri cukup memasukkan Room ID yang sama untuk terhubung.
                </p>
              </div>

              {/* Copy Display Link */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-2xl bg-slate-950/40 border border-white/10">
                <div>
                  <p className="text-xs font-bold text-white">Tautan Cepat Layar Pertandingan</p>
                  <p className="text-[11px] text-slate-400">Salin URL untuk dibuka langsung di PC Proyektor</p>
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

              {/* LocalStorage Migration Action */}
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4" /> Migrasi Data LocalStorage ke Database
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Unggah seluruh data kelompok, 4 tipe soal, dan urutan soal yang ada saat ini ke Supabase Room ({currentRoomId}).
                    </p>
                  </div>
                </div>

                {migrateMessage && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold">
                    {migrateMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleMigrate}
                  disabled={isMigrating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isMigrating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {isMigrating ? 'Mengunggah Data...' : 'MIGRASIKAN DATA LAMA KE DATABASE'}
                </button>
              </div>

              {/* Supabase Custom Keys / SQL Schema Accordion */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <details className="text-xs text-slate-400 space-y-2 cursor-pointer">
                  <summary className="font-bold text-slate-300 hover:text-white flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5" /> Konfigurasi Kredensial Supabase & Skema SQL
                  </summary>
                  <div className="pt-3 space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-400">VITE_SUPABASE_URL</label>
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://xyzcompany.supabase.co"
                        className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-400">VITE_SUPABASE_ANON_KEY</label>
                      <input
                        type="password"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value)}
                        placeholder="eyJhbGciOi..."
                        className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSaveConfig}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white cursor-pointer transition-colors"
                      >
                        Simpan Kredensial
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearCustomSupabaseConfig();
                          setCustomUrl('');
                          setCustomKey('');
                          refreshStatus();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-slate-300 cursor-pointer transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={copySqlSchema}
                        className="ml-auto px-3 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-indigo-600/40 transition-colors"
                      >
                        {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedSql ? 'SQL Tersalin!' : 'Salin Skema SQL'}
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
