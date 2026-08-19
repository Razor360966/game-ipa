import React, { useEffect } from 'react';
import { Trophy, Award, Medal, Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameState } from '../types';
import { COLOR_MAP } from '../utils/presets';
import { sound } from '../utils/sound';

interface GameOverModalProps {
  gameState: GameState;
  onClose: () => void;
  onRestartNewGame: () => void;
  onViewScoreboard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  onClose,
  onRestartNewGame,
  onViewScoreboard,
}) => {
  const { teams, settings } = gameState;

  const sortedTeams = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.correctCount - a.correctCount;
  });

  const winner = sortedTeams[0];

  useEffect(() => {
    sound.playGameOver();
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div
        id="game-over-dialog"
        className="w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-10 text-center shadow-2xl shadow-amber-500/20 relative overflow-hidden"
      >
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-black tracking-widest uppercase mb-4 animate-pulse">
          ⏰ WAKTU HABIS! • PERTANDINGAN SELESAI
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-wide">
          HASIL AKHIR KOMPETISI
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {settings.matchTitle} — {settings.roundName}
        </p>

        {/* Winner Highlight Card */}
        {winner && (
          <div className="my-6 p-6 rounded-3xl bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border-2 border-amber-400 shadow-xl shadow-amber-500/20 space-y-3">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-lg animate-bounce">
              <Trophy className="w-12 h-12" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400 block">
                👑 JUARA 1 / PEMENANG
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider mt-1">
                KELOMPOK {winner.name}
              </h3>
            </div>

            <div className="inline-block px-6 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl sm:text-3xl tracking-widest shadow-md">
              {winner.score} POIN
            </div>

            <p className="text-xs text-amber-200/80 font-medium">
              Berhasil menjawab benar {winner.correctCount} soal!
            </p>
          </div>
        )}

        {/* Final Standings List */}
        <div className="space-y-2 max-h-48 overflow-y-auto my-4 text-left">
          {sortedTeams.map((team, idx) => {
            const colorStyles = COLOR_MAP[team.color] || COLOR_MAP.cyan;
            return (
              <div
                key={team.id}
                className={`p-3 rounded-2xl border flex items-center justify-between text-xs sm:text-sm ${
                  idx === 0
                    ? 'bg-amber-500/10 border-amber-500/40 font-black text-amber-300'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold">#{idx + 1}</span>
                  <span className="uppercase font-extrabold">{team.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 text-xs">
                    {team.correctCount} Benar • {team.wrongCount} Salah
                  </span>
                  <span className="font-mono font-black text-white text-base">
                    {team.score} Poin
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onViewScoreboard();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase transition-colors"
          >
            Lihat Scoreboard Lengkap 🏆
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onRestartNewGame();
              onClose();
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            Mulai Babak Baru
          </button>
        </div>
      </div>
    </div>
  );
};
