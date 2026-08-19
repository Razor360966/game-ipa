import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Trophy,
  Gamepad2,
  Settings,
  Printer,
  Timer as TimerIcon,
  Flame,
} from 'lucide-react';
import { GameState } from '../types';
import { sound } from '../utils/sound';

interface HeaderNavProps {
  gameState: GameState;
  activeTab: 'arena' | 'scoreboard' | 'admin' | 'print';
  setActiveTab: (tab: 'arena' | 'scoreboard' | 'admin' | 'print') => void;
  onStartPause: () => void;
  onResetTimer: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleSound: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  gameState,
  activeTab,
  setActiveTab,
  onStartPause,
  onResetTimer,
  isFullscreen,
  onToggleFullscreen,
  onToggleSound,
}) => {
  const { status, timeRemainingSeconds, settings } = gameState;

  // Format time remaining MM:SS
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;

  const isLowTime = timeRemainingSeconds <= 60 && timeRemainingSeconds > 0 && status === 'running';

  return (
    <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 px-3 sm:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Game Title & Round Badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] text-white font-black text-xl tracking-wider">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-white tracking-tight uppercase flex items-center gap-2">
                {settings.matchTitle}
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span>{settings.roundName}</span>
              <span className="text-white/20">•</span>
              <span className="text-emerald-400 font-bold">Online 🟢</span>
            </p>
          </div>
        </div>

        {/* Global Timer Centerpiece (Frosted Capsule) */}
        <div
          id="global-timer-display"
          className={`flex items-center gap-3 px-6 py-2 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
            isLowTime
              ? 'bg-rose-500/20 border-rose-400/60 animate-pulse text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
              : status === 'running'
              ? 'bg-black/40 border-cyan-400/40 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
              : status === 'paused'
              ? 'bg-amber-500/10 border-amber-400/40 text-amber-300'
              : status === 'finished'
              ? 'bg-rose-950/60 border-rose-500/60 text-rose-400'
              : 'bg-black/40 border-white/10 text-slate-300'
          }`}
        >
          <TimerIcon className={`w-5 h-5 ${status === 'running' ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
          <div className="text-center px-1">
            <span className="font-mono text-2xl sm:text-3xl font-bold tracking-wider block text-cyan-400 leading-none">
              {formattedTime}
            </span>
            <span className="text-[9px] tracking-widest uppercase font-bold text-slate-400 mt-0.5 block">
              {status === 'running'
                ? 'SISA WAKTU'
                : status === 'paused'
                ? 'DI-JEDA (PAUSED)'
                : status === 'finished'
                ? 'WAKTU HABIS!'
                : 'SIAP DIMULAI'}
            </span>
          </div>

          {/* Quick Play/Pause Button */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
            <button
              id="btn-header-play-pause"
              onClick={() => {
                sound.playClick();
                onStartPause();
              }}
              title={status === 'running' ? 'Jeda Waktu' : 'Mulai Waktu'}
              className={`p-2 rounded-xl font-bold text-xs transition-all backdrop-blur-md ${
                status === 'running'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              }`}
            >
              {status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              id="btn-header-reset-timer"
              onClick={() => {
                sound.playClick();
                onResetTimer();
              }}
              title="Reset Timer"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all backdrop-blur-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Main Navigation Tabs */}
          <nav className="flex items-center bg-white/5 backdrop-blur-lg p-1.5 rounded-2xl border border-white/10">
            <button
              id="tab-arena-btn"
              onClick={() => {
                sound.playClick();
                setActiveTab('arena');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'arena'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Arena Game</span>
            </button>

            <button
              id="tab-scoreboard-btn"
              onClick={() => {
                sound.playClick();
                setActiveTab('scoreboard');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'scoreboard'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Scoreboard</span>
            </button>

            <button
              id="tab-admin-btn"
              onClick={() => {
                sound.playClick();
                setActiveTab('admin');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Admin / Guru</span>
            </button>

            <button
              id="tab-print-btn"
              onClick={() => {
                sound.playClick();
                setActiveTab('print');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'print'
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">Cetak Kartu</span>
            </button>
          </nav>

          {/* Audio Sound Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={() => {
              onToggleSound();
            }}
            title={settings.soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
            className={`p-2.5 rounded-2xl border backdrop-blur-md transition-all ${
              settings.soundEnabled
                ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="btn-toggle-fullscreen"
            onClick={() => {
              sound.playClick();
              onToggleFullscreen();
            }}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Fullscreen)'}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-all"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
