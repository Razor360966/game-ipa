import React, { useState, useMemo } from 'react';
import { Printer, FileText, CheckCircle2, AlertTriangle, Layers, XCircle, ArrowLeft } from 'lucide-react';
import { GameState, Team, Question } from '../types';
import { sound } from '../utils/sound';
import { validateDecksAndQuestions } from '../utils/presets';

interface PrintableCardsProps {
  gameState: GameState;
  onBackToAdmin?: () => void;
}

export const PrintableCards: React.FC<PrintableCardsProps> = ({ gameState, onBackToAdmin }) => {
  const { teams, questions, teamCardDecks, settings } = gameState;
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'student_cards' | 'teacher_key'>('student_cards');

  // Validate Question Bank and Team Decks
  const validation = useMemo(() => {
    return validateDecksAndQuestions(teams, questions, teamCardDecks);
  }, [teams, questions, teamCardDecks]);

  const handlePrint = () => {
    if (!validation.isValid) {
      sound.playWrong();
      alert('Kartu belum valid untuk dicetak:\n' + validation.errors.join('\n'));
      return;
    }
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
      <div className="print:hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              {onBackToAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onBackToAdmin();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
                </button>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                <Printer className="w-3.5 h-3.5 text-emerald-300" />
                MODUL CETAK KARTU FISIK
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              CETAK KARTU SOAL & KUNCI GURU
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Setiap kelompok mendapatkan seluruh soal di Bank Soal dengan urutan acak yang unik.
            </p>
          </div>

          {/* Big Print Button */}
          <button
            id="btn-trigger-print"
            onClick={handlePrint}
            disabled={!validation.isValid}
            className={`px-6 py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center gap-2 transition-all shadow-xl cursor-pointer ${
              validation.isValid
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95'
                : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
            }`}
          >
            <Printer className="w-5 h-5" />
            CETAK SEKARANG (PRINT / PDF)
          </button>
        </div>

        {/* SUMMARY STATS & VALIDATION BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Bank Soal</span>
            <span className="text-xl font-black text-cyan-400">{validation.questionsCount} Soal</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Jumlah Kelompok</span>
            <span className="text-xl font-black text-emerald-400">{validation.teamsCount} Kelompok</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Kartu Fisik</span>
            <span className="text-xl font-black text-amber-400">
              {validation.totalCards} Kartu
              <span className="text-[10px] font-normal text-slate-400 ml-1">
                ({validation.questionsCount} × {validation.teamsCount})
              </span>
            </span>
          </div>

          <div
            className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
              validation.isValid
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                : 'bg-rose-500/15 border-rose-400/40 text-rose-200'
            }`}
          >
            {validation.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <span className="text-xs font-bold block">
                {validation.isValid ? 'Validasi Lolos' : 'Perlu Perbaikan'}
              </span>
              <span className="text-[10px] opacity-80 line-clamp-1">
                {validation.isValid
                  ? 'Semua kelompok memiliki seluruh soal unik.'
                  : `${validation.errors.length} masalah ditemukan.`}
              </span>
            </div>
          </div>
        </div>

        {/* Validation Errors Notice */}
        {!validation.isValid && (
          <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Syarat Validasi Belum Terpenuhi Sebelum Cetak:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-200/90 pl-1">
              {validation.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* View Mode & Filter Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => {
                sound.playClick();
                setActiveView('student_cards');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeView === 'student_cards'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Kartu Soal Siswa (Tanpa Kunci / Poin / ID Bank)
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveView('teacher_key');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
                    📦 KARTU SOAL KELOMPOK {team.name} ({deck.length} Kartu Soal)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Semua {validation.questionsCount} soal lengkap dengan urutan acak kelompok {team.name}
                  </span>
                </div>

                {/* Cards Grid: 2 columns on paper / screen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4">
                  {deck.map((card) => {
                    const question = getQuestionById(card.questionId);
                    if (!question) return null;

                    const formattedCardNum = String(card.cardNumber).padStart(2, '0');
                    const qType = question.type || 'short_answer';

                    return (
                      <div
                        key={card.cardCode || `${team.id}-${card.cardNumber}`}
                        className="bg-white text-slate-900 border-2 border-dashed border-slate-400 rounded-2xl p-5 shadow-sm print:shadow-none print:border-2 print:border-dashed print:border-black flex flex-col justify-between min-h-[240px] relative overflow-hidden"
                      >
                        {/* Cut Line Indicator */}
                        <div className="absolute top-1.5 right-2 text-[9px] text-slate-400 print:text-black uppercase font-mono tracking-widest">
                          ✂ Gunting di sini
                        </div>

                        {/* Card Header */}
                        <div>
                          <div className="border-b-2 border-slate-900 pb-2 mb-3">
                            <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase block">
                              {settings.matchTitle || 'MEASUREMENT BLOCK BLAST'}
                            </span>
                            <div className="flex items-baseline justify-between mt-0.5">
                              <h4 className="text-base font-black text-slate-950 uppercase">
                                KELOMPOK: {team.name}
                              </h4>
                              <span className="text-base font-black text-slate-950 uppercase font-mono">
                                KARTU SOAL: {formattedCardNum}
                              </span>
                            </div>
                          </div>

                          {/* Question Text & Options */}
                          <div className="my-2 space-y-2">
                            {/* Short Answer */}
                            {qType === 'short_answer' && (
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                  PERTANYAAN:
                                </span>
                                <p className="text-sm sm:text-base font-bold text-slate-950 leading-snug">
                                  {question.questionText}
                                </p>
                                {question.unitHint && (
                                  <p className="text-xs font-semibold text-blue-700 mt-2 bg-blue-50 border border-blue-200 rounded-lg p-1.5 inline-block">
                                    📌 Satuan yang diminta: <strong>{question.unitHint}</strong>
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Multiple Choice */}
                            {qType === 'multiple_choice' && (
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                  PERTANYAAN PILIHAN GANDA:
                                </span>
                                <p className="text-sm sm:text-base font-bold text-slate-950 leading-snug mb-3">
                                  {question.questionText}
                                </p>
                                <div className="space-y-1.5">
                                  {(question.options || []).map((opt) => (
                                    <div
                                      key={opt.id}
                                      className="flex items-start gap-2 text-xs font-semibold text-slate-800 p-1 rounded border border-slate-200"
                                    >
                                      <span className="w-5 h-5 rounded bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                                        {opt.label}
                                      </span>
                                      <span className="pt-0.5">{opt.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Statement Correction */}
                            {qType === 'statement_correction' && (
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                  PERNYATAAN (BENAR / SALAH + KOREKSI):
                                </span>
                                <p className="text-sm sm:text-base font-bold text-slate-950 leading-snug p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                  "{question.statementConfig?.statement || question.questionText}"
                                </p>
                                <div className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                                  <div className="flex items-center gap-6 font-bold">
                                    <span>[ &nbsp; ] BENAR</span>
                                    <span>[ &nbsp; ] SALAH</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500">
                                    *Jika SALAH, siapkan kalimat pembetulan saat menjawab di layar.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Multi Part */}
                            {qType === 'multi_part' && (
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                  SOAL TERSTRUKTUR (2 PERTANYAAN):
                                </span>
                                {question.multiPartConfig?.introduction && (
                                  <p className="text-xs text-slate-700 italic mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                    {question.multiPartConfig.introduction}
                                  </p>
                                )}
                                <div className="space-y-2">
                                  {(question.multiPartConfig?.parts || []).map((part, pIdx) => (
                                    <div key={part.id || pIdx} className="text-xs font-semibold text-slate-900">
                                      <span className="font-bold text-blue-700 mr-1">
                                        [#{pIdx + 1}]
                                      </span>
                                      {part.question}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Footer / Instructions (No Points / No Keys / No Database IDs) */}
                        <div className="mt-4 pt-2 border-t border-slate-300 text-[10px] text-slate-600 flex items-center justify-between">
                          <span className="font-semibold text-slate-700">
                            {team.name} • Kartu #{formattedCardNum}
                          </span>
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
              Dokumen ini khusus pegangan panitia/guru untuk mengawasi mapping nomor kartu soal dan kunci jawaban setiap kelompok.
            </p>
          </div>

          <div className="space-y-6">
            {teams.map((team) => {
              const deck = teamCardDecks[team.id] || [];

              return (
                <div key={team.id} className="space-y-3">
                  <h4 className="font-extrabold text-base text-cyan-400 print:text-black uppercase border-b border-slate-700 pb-1">
                    KELOMPOK {team.name} ({deck.length} Kartu Soal)
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 print:bg-slate-200 text-slate-300 print:text-black">
                          <th className="p-2 border border-slate-700 print:border-black text-center w-16">No Kartu</th>
                          <th className="p-2 border border-slate-700 print:border-black text-center w-20">ID Soal Bank</th>
                          <th className="p-2 border border-slate-700 print:border-black">Pertanyaan</th>
                          <th className="p-2 border border-slate-700 print:border-black">Kunci Jawaban</th>
                          <th className="p-2 border border-slate-700 print:border-black">Variasi Diterima</th>
                          <th className="p-2 border border-slate-700 print:border-black text-center w-16">Poin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deck.map((card) => {
                          const question = getQuestionById(card.questionId);
                          if (!question) return null;

                          return (
                            <tr
                              key={card.cardCode || `${team.id}-${card.cardNumber}`}
                              className="border-b border-slate-800 print:border-slate-300 hover:bg-slate-800/40"
                            >
                              <td className="p-2 font-bold text-center border border-slate-700 print:border-black font-mono">
                                {String(card.cardNumber).padStart(2, '0')}
                              </td>
                              <td className="p-2 font-mono font-bold text-cyan-400 print:text-black border border-slate-700 print:border-black text-center">
                                {question.code || question.id}
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
                                +{question.points || 10}
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
