import React from 'react';
import { Trophy, Medal, Award, Flame, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { GameState, Team } from '../types';
import { COLOR_MAP } from '../utils/presets';

interface ScoreboardViewProps {
  gameState: GameState;
}

export const ScoreboardView: React.FC<ScoreboardViewProps> = ({ gameState }) => {
  const { teams, teamCardDecks, activityLogs, settings } = gameState;

  // Sort teams descending by score, then by correctCount
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.correctCount - a.correctCount;
  });

  const topThree = sortedTeams.slice(0, 3);

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-widest uppercase backdrop-blur-md">
          <Trophy className="w-4 h-4 text-amber-400" />
          KLASEMEN REAL-TIME PERTANDINGAN
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
          LIVE SCOREBOARD & RANKING
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Peringkat diperbarui secara otomatis setiap kali ada poin yang masuk.
        </p>
      </div>

      {/* Top 3 Podium Visualizer (if at least 2 teams) */}
      {sortedTeams.length >= 2 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-8 max-w-3xl mx-auto">
          {/* Rank 2 (Silver) */}
          {sortedTeams[1] && (
            <div className="flex flex-col items-center">
              <div className="mb-2 text-center">
                <span className="inline-block p-2.5 rounded-2xl bg-white/10 text-slate-200 border border-white/20 backdrop-blur-md shadow-lg">
                  <Medal className="w-6 h-6 sm:w-8 sm:h-8" />
                </span>
                <h4 className="font-extrabold text-sm sm:text-lg text-white mt-2 uppercase tracking-wide">
                  {sortedTeams[1].name}
                </h4>
                <p className="text-slate-400 font-bold text-xs sm:text-sm">
                  {sortedTeams[1].score} Poin
                </p>
              </div>
              <div className="w-full h-28 sm:h-36 rounded-t-3xl bg-gradient-to-t from-white/5 to-white/15 backdrop-blur-xl border-t-2 border-slate-300 flex items-center justify-center font-black text-2xl sm:text-4xl text-slate-200 shadow-xl">
                2
              </div>
            </div>
          )}

          {/* Rank 1 (Gold - Highest) */}
          {sortedTeams[0] && (
            <div className="flex flex-col items-center">
              <div className="mb-2 text-center">
                <span className="inline-block p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.4)] backdrop-blur-md animate-bounce">
                  <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
                </span>
                <h4 className="font-black text-base sm:text-xl text-amber-300 mt-2 uppercase tracking-wider">
                  {sortedTeams[0].name}
                </h4>
                <p className="text-amber-400 font-black text-sm sm:text-base">
                  {sortedTeams[0].score} Poin
                </p>
              </div>
              <div className="w-full h-36 sm:h-48 rounded-t-3xl bg-gradient-to-t from-amber-500/20 via-amber-500/30 to-amber-500/40 backdrop-blur-2xl border-t-2 border-amber-300 flex items-center justify-center font-black text-3xl sm:text-5xl text-amber-200 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
                1
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {sortedTeams[2] && (
            <div className="flex flex-col items-center">
              <div className="mb-2 text-center">
                <span className="inline-block p-2.5 rounded-2xl bg-amber-800/30 text-amber-400 border border-amber-700/50 backdrop-blur-md shadow-lg">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8" />
                </span>
                <h4 className="font-extrabold text-sm sm:text-lg text-white mt-2 uppercase tracking-wide">
                  {sortedTeams[2].name}
                </h4>
                <p className="text-slate-400 font-bold text-xs sm:text-sm">
                  {sortedTeams[2].score} Poin
                </p>
              </div>
              <div className="w-full h-20 sm:h-28 rounded-t-3xl bg-gradient-to-t from-white/5 to-amber-900/30 backdrop-blur-xl border-t-2 border-amber-600 flex items-center justify-center font-black text-xl sm:text-3xl text-amber-500 shadow-lg">
                3
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete Rankings List Table (Frosted Glass) */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Detail Seluruh Kelompok:
        </h3>

        {sortedTeams.map((team, rankIndex) => {
          const colorStyles = COLOR_MAP[team.color] || COLOR_MAP.cyan;
          const deck = teamCardDecks[team.id] || [];
          const completedCount = deck.filter((c) => c.status === 'correct').length;
          const totalCount = deck.length;
          const accuracy =
            team.correctCount + team.wrongCount > 0
              ? Math.round((team.correctCount / (team.correctCount + team.wrongCount)) * 100)
              : 0;

          return (
            <div
              key={team.id}
              className={`p-4 sm:p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition-all ${
                rankIndex === 0
                  ? 'bg-amber-500/10 border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-md'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              {/* Rank & Team */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-[200px]">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg ${
                    rankIndex === 0
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : rankIndex === 1
                      ? 'bg-slate-300 text-slate-950'
                      : rankIndex === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  #{rankIndex + 1}
                </div>
                <div>
                  <h4 className={`font-black text-lg sm:text-xl uppercase ${colorStyles.text}`}>
                    {team.name}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Selesai: <strong className="text-white">{completedCount}/{totalCount}</strong> kartu
                  </p>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-4 sm:gap-8 text-xs sm:text-sm">
                <div className="text-center">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Benar</span>
                  <span className="text-emerald-400 font-extrabold text-base sm:text-lg">
                    {team.correctCount}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Salah</span>
                  <span className="text-rose-400 font-extrabold text-base sm:text-lg">
                    {team.wrongCount}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Akurasi</span>
                  <span className="text-cyan-400 font-extrabold text-base sm:text-lg">
                    {accuracy}%
                  </span>
                </div>
              </div>

              {/* Total Score */}
              <div className="text-right pl-4 border-l border-white/10 min-w-[120px]">
                <span className="text-2xl sm:text-3xl font-black text-white block leading-none">
                  {team.score}
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  TOTAL POIN
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Timeline Feed (Frosted Glass) */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Aktivitas & Riwayat Jawaban Terakhir:
        </h3>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {activityLogs.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Belum ada aktivitas tercatat.</p>
          ) : (
            activityLogs.slice(0, 15).map((log) => (
              <div
                key={log.id}
                className="text-xs p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3 backdrop-blur-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-500 text-[10px]">
                    {log.timeFormatted}
                  </span>
                  <span
                    className={`font-semibold ${
                      log.type === 'answer_correct'
                        ? 'text-emerald-400'
                        : log.type === 'answer_wrong'
                        ? 'text-rose-400'
                        : log.type === 'tap'
                        ? 'text-cyan-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
                {log.pointsChange !== undefined && (
                  <span
                    className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] ${
                      log.pointsChange > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {log.pointsChange > 0 ? `+${log.pointsChange}` : `${log.pointsChange}`} Poin
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

