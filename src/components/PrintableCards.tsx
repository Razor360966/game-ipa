import React, { useState } from 'react';
import { Printer, FileText, CheckCircle2, RefreshCw, Eye, EyeOff, Layers } from 'lucide-react';
import { GameState, Team, Question } from '../types';
import { sound } from '../utils/sound';

interface PrintableCardsProps {
  gameState: GameState;
}

export const PrintableCards: React.FC<PrintableCardsProps> = ({ gameState }) => {
  const { teams, questions, teamCardDecks, settings } = gameState;
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'student_cards' | 'teacher_key'>('student_cards');
  const [cardsPerPage, setCardsPerPage] = useState<number>(4);

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const getQuestionById = (qId: string): Question | undefined => {
    return questions.find((q) => q.id === qId);
  };

  const filteredTeams =
    selectedTeamFilter === 'all'
      ? teams
      : teams.filter((t) => t.id === selectedTeamFilter);

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* Screen Controls Header (Hidden during physical print) */}
      <div className="print:hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
              <Printer className="w-3.5 h-3.5 text-emerald-300" />
              MODUL CETAK KARTU FISIK
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-1">
              CETAK KARTU SOAL & KUNCI JAWABAN GURU
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Cetak kartu fisik untuk dibagikan ke setiap kelompok sebelum pertandingan dimulai.
            </p>
          </div>

          {/* Big Print Button */}
          <button
            id="btn-trigger-print"
            onClick={handlePrint}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wider uppercase flex items-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            CETAK SEKARANG (PRINT / PDF)
          </button>
        </div>

        {/* View Mode & Filter Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => {
                sound.playClick();
                setActiveView('student_cards');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeView === 'student_cards'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Kartu Soal Siswa (Tanpa Kunci)
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveView('teacher_key');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeView === 'teacher_key'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Master Kunci Jawaban Guru
            </button>
          </div>

          {/* Filter by Team */}
          {activeView === 'student_cards' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Pilih Kelompok:</span>
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="bg-slate-900/80 border border-white/15 text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-cyan-400 backdrop-blur-md"
              >
                <option value="all">Semua Kelompok ({teams.length})</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    Kelompok {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRINT VIEW 1: KARTU SOAL SISWA                               */}
      {/* ------------------------------------------------------------- */}
      {activeView === 'student_cards' && (
        <div id="printable-student-cards-container" className="space-y-8 print:space-y-4">
          {filteredTeams.map((team) => {
            const deck = teamCardDecks[team.id] || [];

            return (
              <div key={team.id} className="space-y-4 print:break-after-page">
                {/* Team Section Title in Screen View */}
                <div className="print:hidden flex items-center justify-between bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700">
                  <h3 className="font-extrabold text-lg text-cyan-400 uppercase tracking-wide">
                    📦 KARTU SOAL KELOMPOK {team.name} ({deck.length} Kartu)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Siap dipotong sesuai garis putus-putus
                  </span>
                </div>

                {/* Cards Grid: 2 columns on paper / screen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4">
                  {deck.map((card) => {
                    const question = getQuestionById(card.questionId);
                    if (!question) return null;

                    return (
                      <div
                        key={card.cardCode}
                        className="bg-white text-slate-900 border-2 border-dashed border-slate-400 rounded-2xl p-5 shadow-sm print:shadow-none print:border-2 print:border-dashed print:border-black flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                      >
                        {/* Cut Line Indicator */}
                        <div className="absolute top-1.5 right-2 text-[9px] text-slate-400 print:text-black uppercase font-mono tracking-widest">
                          ✂ Gunting di sini
                        </div>

                        {/* Card Header */}
                        <div>
                          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-3">
                            <div>
                              <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase block">
                                {settings.matchTitle}
                              </span>
                              <h4 className="text-base font-black text-slate-900 uppercase">
                                KELOMPOK: {team.name}
                              </h4>
                            </div>

                            <div className="text-right">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-black text-sm">
                                {card.cardCode}
                              </span>
                              <span className="block text-[9px] font-bold text-slate-600 mt-0.5">
                                KARTU #{String(card.cardNumber).padStart(2, '0')}
                              </span>
                            </div>
                          </div>

                          {/* Question Text */}
                          <div className="my-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              PERTANYAAN:
                            </span>
                            <p className="text-sm sm:text-base font-bold text-slate-950 leading-snug">
                              {question.questionText}
                            </p>
                            {question.unitHint && (
                              <p className="text-xs font-semibold text-blue-700 mt-1.5">
                                📌 Satuan yang diminta: <strong>{question.unitHint}</strong>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card Footer / Instructions */}
                        <div className="mt-4 pt-2 border-t border-slate-300 text-[10px] text-slate-600 flex items-center justify-between">
                          <span>Nilai: <strong>+{question.points} Poin</strong></span>
                          <span className="italic font-medium">
                            Kerjakan di meja → Selesai → Lari & Tap di Layar!
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRINT VIEW 2: MASTER KUNCI JAWABAN GURU                       */}
      {/* ------------------------------------------------------------- */}
      {activeView === 'teacher_key' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl print:bg-white print:text-black print:border-none print:shadow-none space-y-6">
          <div className="border-b border-slate-800 print:border-black pb-4">
            <h3 className="text-2xl font-black text-white print:text-black uppercase">
              MASTER KUNCI JAWABAN & PANDUAN GURU
            </h3>
            <p className="text-xs text-slate-400 print:text-slate-700 mt-1">
              Dokumen ini khusus pegangan panitia/guru untuk mengawasi jawaban kartu soal setiap kelompok.
            </p>
          </div>

          <div className="space-y-6">
            {teams.map((team) => {
              const deck = teamCardDecks[team.id] || [];

              return (
                <div key={team.id} className="space-y-3">
                  <h4 className="font-extrabold text-base text-cyan-400 print:text-black uppercase border-b border-slate-700 pb-1">
                    KELOMPOK {team.name}
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 print:bg-slate-200 text-slate-300 print:text-black">
                          <th className="p-2 border border-slate-700 print:border-black">No.</th>
                          <th className="p-2 border border-slate-700 print:border-black">Kode Kartu</th>
                          <th className="p-2 border border-slate-700 print:border-black">Pertanyaan</th>
                          <th className="p-2 border border-slate-700 print:border-black">Kunci Jawaban</th>
                          <th className="p-2 border border-slate-700 print:border-black">Variasi Diterima</th>
                          <th className="p-2 border border-slate-700 print:border-black">Poin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deck.map((card) => {
                          const question = getQuestionById(card.questionId);
                          if (!question) return null;

                          return (
                            <tr
                              key={card.cardCode}
                              className="border-b border-slate-800 print:border-slate-300 hover:bg-slate-800/40"
                            >
                              <td className="p-2 font-bold text-center border border-slate-700 print:border-black">
                                {card.cardNumber}
                              </td>
                              <td className="p-2 font-mono font-bold text-cyan-400 print:text-black border border-slate-700 print:border-black">
                                {card.cardCode}
                              </td>
                              <td className="p-2 text-white print:text-black font-medium border border-slate-700 print:border-black max-w-xs">
                                {question.questionText}
                              </td>
                              <td className="p-2 font-bold text-emerald-400 print:text-emerald-800 border border-slate-700 print:border-black">
                                {question.correctAnswer}
                              </td>
                              <td className="p-2 text-slate-400 print:text-slate-700 border border-slate-700 print:border-black">
                                {(question.alternativeAnswers || []).join(', ') || '-'}
                              </td>
                              <td className="p-2 font-bold text-amber-400 print:text-black text-center border border-slate-700 print:border-black">
                                +{question.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
