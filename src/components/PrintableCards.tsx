import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings2,
  FileCheck2,
  HelpCircle,
} from 'lucide-react';
import { GameState, Team, Question } from '../types';
import { sound } from '../utils/sound';
import { validateDecksAndQuestions, getResolvedQuestionForTeam } from '../utils/presets';

interface PrintableCardsProps {
  gameState: GameState;
  onBackToAdmin?: () => void;
}

export type PrintFormatMode = 'a4_sheet' | 'individual_cards' | 'teacher_key';

export const PrintableCards: React.FC<PrintableCardsProps> = ({ gameState, onBackToAdmin }) => {
  const { teams, questions, teamCardDecks, settings } = gameState;

  // Format Cetak: Default 'a4_sheet' (1 Kelompok = 1 Lembar A4)
  const [printFormat, setPrintFormat] = useState<PrintFormatMode>('a4_sheet');

  // Preview Mode: 'all_sheets' (tampilkan semua kelompok berurutan) or 'single_sheet' (preview per lembar)
  const [previewMode, setPreviewMode] = useState<'all_sheets' | 'single_sheet'>('all_sheets');
  const [currentSheetIndex, setCurrentSheetIndex] = useState<number>(0);

  // Filter selected team (for individual cards or focused print)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');

  // Compact layout mode for A4 (useful if >10 questions to ensure it stays in 1 A4 page)
  const [isCompactA4, setIsCompactA4] = useState<boolean>(questions.length > 10);

  // Validate Question Bank and Team Decks
  const validation = useMemo(() => {
    return validateDecksAndQuestions(teams, questions, teamCardDecks);
  }, [teams, questions, teamCardDecks]);

  const getQuestionForTeam = (qId: string, teamId?: string): Question => {
    return getResolvedQuestionForTeam(gameState, teamId, qId);
  };

  const handlePrint = () => {
    if (!validation.isValid) {
      sound.playWrong();
      alert('Data belum valid untuk dicetak:\n' + validation.errors.join('\n'));
      return;
    }
    sound.playClick();
    window.print();
  };

  const activeTeamsForPrint = useMemo(() => {
    if (previewMode === 'single_sheet' && printFormat === 'a4_sheet' && teams.length > 0) {
      const idx = Math.min(Math.max(0, currentSheetIndex), teams.length - 1);
      return [teams[idx]];
    }
    if (selectedTeamId !== 'all') {
      return teams.filter((t) => t.id === selectedTeamId);
    }
    return teams;
  }, [teams, previewMode, printFormat, currentSheetIndex, selectedTeamId]);

  // Capacity estimate: over 14 questions might spill past 1 A4 page if text is long
  const isQuestionCountHigh = questions.length > 12;

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* CONTROL PANEL HEADER (Hidden during physical paper print)    */}
      {/* ------------------------------------------------------------- */}
      <div className="print:hidden bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
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
                MODUL CETAK SOAL FISIK
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              CETAK SOAL FISIK & MASTER KUNCI
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Format default: <strong className="text-emerald-400">1 Kelompok = 1 Lembar A4</strong> (Setiap kelompok mendapat seluruh {questions.length} soal dengan urutan acak unik).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="btn-trigger-print"
              onClick={handlePrint}
              disabled={!validation.isValid}
              className={`px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 transition-all shadow-xl cursor-pointer ${
                validation.isValid
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
              }`}
            >
              <Printer className="w-5 h-5" />
              {printFormat === 'a4_sheet'
                ? `CETAK SEMUA KELOMPOK (${teams.length} LEMBAR A4)`
                : printFormat === 'individual_cards'
                ? `CETAK KARTU (${validation.totalCards} KARTU)`
                : 'CETAK MASTER KUNCI GURU'}
            </button>
          </div>
        </div>

        {/* SUMMARY STATS & VALIDATION */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Bank Soal</span>
            <span className="text-xl font-black text-cyan-400">{validation.questionsCount} Soal</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Semua soal masuk ke setiap lembar</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Jumlah Kelompok</span>
            <span className="text-xl font-black text-emerald-400">{validation.teamsCount} Kelompok</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Masing-masing 1 lembar A4</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
              {printFormat === 'a4_sheet' ? 'Total Lembar Cetak' : 'Total Kartu Cetak'}
            </span>
            <span className="text-xl font-black text-amber-400">
              {printFormat === 'a4_sheet' ? `${teams.length} Lembar A4` : `${validation.totalCards} Kartu`}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {printFormat === 'a4_sheet'
                ? `1 lembar per kelompok (${questions.length} soal/lembar)`
                : `${questions.length} soal × ${teams.length} kelompok`}
            </span>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${
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
                {validation.isValid ? 'Validasi Lolos' : 'Perlu Diperbaiki'}
              </span>
              <span className="text-[10px] opacity-80 line-clamp-1">
                {validation.isValid
                  ? 'Setiap kelompok memiliki seluruh soal unik.'
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
              <span>Syarat Validasi Sebelum Cetak:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-200/90 pl-1">
              {validation.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* FORMAT CETAK SELECTOR (RADIO STYLE) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-cyan-400" />
              PILIHAN FORMAT CETAK:
            </span>

            {printFormat === 'a4_sheet' && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={isCompactA4}
                    onChange={(e) => setIsCompactA4(e.target.checked)}
                    className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Mode Rapat / Compact (Pastikan Tetap Muat 1 Lembar A4)</span>
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mode 1: 1 Kelompok = 1 Lembar A4 (Default & Recommended) */}
            <label
              className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                printFormat === 'a4_sheet'
                  ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <input
                type="radio"
                name="printFormat"
                value="a4_sheet"
                checked={printFormat === 'a4_sheet'}
                onChange={() => {
                  sound.playClick();
                  setPrintFormat('a4_sheet');
                }}
                className="mt-0.5 accent-cyan-400 w-4 h-4 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-xs sm:text-sm text-white">
                    1 Kelompok = 1 Lembar A4 (Utama)
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Semua {questions.length} soal tercetak dalam 1 lembar A4 portrait untuk tiap kelompok. Total {teams.length} lembar kertas.
                </p>
              </div>
            </label>

            {/* Mode 2: 1 Soal = 1 Kartu */}
            <label
              className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                printFormat === 'individual_cards'
                  ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <input
                type="radio"
                name="printFormat"
                value="individual_cards"
                checked={printFormat === 'individual_cards'}
                onChange={() => {
                  sound.playClick();
                  setPrintFormat('individual_cards');
                }}
                className="mt-0.5 accent-cyan-400 w-4 h-4 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-xs sm:text-sm text-white">
                    1 Soal = 1 Kartu (Format Potong)
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Kartu soal individual dengan garis gunting ({validation.totalCards} kartu total untuk digunting).
                </p>
              </div>
            </label>

            {/* Mode 3: Master Kunci Jawaban Guru */}
            <label
              className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                printFormat === 'teacher_key'
                  ? 'bg-amber-500/15 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <input
                type="radio"
                name="printFormat"
                value="teacher_key"
                checked={printFormat === 'teacher_key'}
                onChange={() => {
                  sound.playClick();
                  setPrintFormat('teacher_key');
                }}
                className="mt-0.5 accent-amber-400 w-4 h-4 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs sm:text-sm text-white">
                    Master Kunci Jawaban Guru
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Tabel pemetaan nomor soal per kelompok dan kunci jawaban untuk pengawasan guru / panitia.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* HIGH QUESTION COUNT WARNING FOR A4 */}
        {printFormat === 'a4_sheet' && isQuestionCountHigh && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Jumlah Bank Soal ({questions.length} soal) cukup panjang untuk 1 halaman A4.{' '}
                {isCompactA4
                  ? 'Mode Rapat aktif untuk mengoptimalkan ruang.'
                  : 'Aktifkan Mode Rapat jika ingin memastikan muat tepat dalam 1 lembar.'}
              </span>
            </div>
            {!isCompactA4 && (
              <button
                type="button"
                onClick={() => setIsCompactA4(true)}
                className="px-3 py-1 bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] shrink-0 cursor-pointer hover:bg-amber-300"
              >
                Tetap 1 A4 (Gunakan Mode Rapat)
              </button>
            )}
          </div>
        )}

        {/* PREVIEW A4 NAVIGATION TOOLBAR */}
        {printFormat === 'a4_sheet' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPreviewMode('all_sheets');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  previewMode === 'all_sheets'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tampilkan Semua Lembar ({teams.length} Halaman A4)
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPreviewMode('single_sheet');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  previewMode === 'single_sheet'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pratinjau Lembar Per Kelompok
              </button>
            </div>

            {/* Pagination Controls when in single sheet preview */}
            {previewMode === 'single_sheet' && teams.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/10">
                <button
                  type="button"
                  disabled={currentSheetIndex <= 0}
                  onClick={() => {
                    sound.playClick();
                    setCurrentSheetIndex((prev) => Math.max(0, prev - 1));
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-slate-200">
                  Kelompok <strong className="text-cyan-400">{teams[currentSheetIndex]?.name}</strong> ({currentSheetIndex + 1} / {teams.length})
                </span>

                <button
                  type="button"
                  disabled={currentSheetIndex >= teams.length - 1}
                  onClick={() => {
                    sound.playClick();
                    setCurrentSheetIndex((prev) => Math.min(teams.length - 1, prev + 1));
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick jump team pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {teams.map((team, idx) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    if (previewMode === 'single_sheet') {
                      setCurrentSheetIndex(idx);
                    } else {
                      const el = document.getElementById(`a4-sheet-${team.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    previewMode === 'single_sheet' && currentSheetIndex === idx
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. VIEW A4 SHEETS (1 KELOMPOK = 1 LEMBAR A4)                  */}
      {/* ------------------------------------------------------------- */}
      {printFormat === 'a4_sheet' && (
        <div className="space-y-8 print:space-y-0">
          {activeTeamsForPrint.map((team) => {
            const deck = teamCardDecks[team.id] || [];

            return (
              <div
                key={team.id}
                id={`a4-sheet-${team.id}`}
                className="a4-page-print bg-white text-slate-950 rounded-2xl print:rounded-none shadow-2xl p-6 sm:p-10 border border-slate-300 print:border-none print:shadow-none print:break-after-page max-w-[210mm] mx-auto flex flex-col justify-between"
                style={{
                  minHeight: '297mm',
                  boxSizing: 'border-box',
                }}
              >
                {/* A4 Sheet Header */}
                <div className="space-y-3 border-b-2 border-slate-950 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 font-serif">
                        {settings.matchTitle || 'MEASUREMENT BLOCK BLAST'}
                      </h1>
                      <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest block">
                        LEMBAR KERJA SOAL FISIK KELOMPOK
                      </span>
                    </div>

                    <div className="text-right border-2 border-slate-950 px-3.5 py-1.5 rounded-lg bg-slate-50">
                      <span className="text-[9px] font-bold text-slate-600 uppercase block tracking-wider">
                        KELOMPOK
                      </span>
                      <span className="text-lg sm:text-xl font-black text-slate-950 uppercase tracking-wider">
                        {team.name}
                      </span>
                    </div>
                  </div>

                  {/* Instruction Box */}
                  <div className={`p-2.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 ${isCompactA4 ? 'text-[10px] space-y-0.5' : 'text-xs space-y-1'}`}>
                    <span className="font-bold text-slate-950 block uppercase tracking-wider text-[10px]">
                      📋 PETUNJUK PENGERJAAN:
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-700 font-medium">
                      <li>Kerjakan seluruh soal pada lembar ini bersama tim Anda terlebih dahulu.</li>
                      <li>Setelah selesai / menemukan jawaban, segera utus perwakilan kelompok menuju <strong>Layar Pertandingan</strong>.</li>
                      <li>Pilih <strong>Nomor Soal (01, 02, ...)</strong> yang sesuai di layar dan ketikkan jawaban Anda untuk merebut blok dan mencetak skor.</li>
                    </ol>
                  </div>
                </div>

                {/* Question List (Numbered 01, 02, ... without bank ID or keys) */}
                <div className={`flex-1 my-3 space-y-3 ${isCompactA4 ? 'space-y-2' : 'space-y-3.5'}`}>
                  {deck.map((card) => {
                    const question = getQuestionForTeam(card.questionId, team.id);
                    if (!question) return null;

                    const formattedNum = String(card.cardNumber).padStart(2, '0');
                    const qType = question.type || 'short_answer';

                    return (
                      <div
                        key={card.cardCode || `${team.id}-${card.cardNumber}`}
                        className={`border-b border-dashed border-slate-300 pb-2.5 ${isCompactA4 ? 'text-xs pb-1.5' : 'text-sm'}`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Question Number (01, 02, ...) */}
                          <span className="font-black text-slate-950 font-mono text-sm sm:text-base shrink-0 pt-0.5">
                            {formattedNum}.
                          </span>

                          <div className="flex-1 space-y-1.5">
                            {/* 1. Short Answer */}
                            {qType === 'short_answer' && (
                              <div className="space-y-1">
                                <p className="font-bold text-slate-950 leading-snug">
                                  {question.questionText}
                                </p>
                                {question.unitHint && (
                                  <span className="inline-block text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                    📌 Satuan yang diminta: <strong>{question.unitHint}</strong>
                                  </span>
                                )}
                                <div className="pt-1 flex items-center gap-2 text-slate-500 text-xs font-mono">
                                  <span>Jawaban:</span>
                                  <span className="border-b border-dotted border-slate-500 flex-1 min-h-[14px]"></span>
                                </div>
                              </div>
                            )}

                            {/* 2. Multiple Choice */}
                            {qType === 'multiple_choice' && (
                              <div className="space-y-1.5">
                                <p className="font-bold text-slate-950 leading-snug">
                                  {question.questionText}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-0.5 text-xs text-slate-800">
                                  {(question.options || []).map((opt) => (
                                    <div key={opt.id} className="flex items-start gap-1.5">
                                      <span className="font-bold text-slate-950 w-4">{opt.label}.</span>
                                      <span>{opt.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 3. Statement Correction */}
                            {qType === 'statement_correction' && (
                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                                  PERNYATAAN:
                                </p>
                                <p className="font-bold text-slate-950 italic p-1.5 bg-slate-50 border border-slate-200 rounded">
                                  "{question.statementConfig?.statement || question.questionText}"
                                </p>
                                <div className="flex items-center gap-6 pt-1 text-xs font-bold text-slate-800">
                                  <span>Apakah pernyataan tersebut benar?</span>
                                  <span className="inline-flex items-center gap-1.5">[ &nbsp; ] BENAR</span>
                                  <span className="inline-flex items-center gap-1.5">[ &nbsp; ] SALAH</span>
                                </div>
                                <div className="pt-0.5 flex items-center gap-2 text-slate-500 text-xs font-mono">
                                  <span>Jika salah, apa yang benar:</span>
                                  <span className="border-b border-dotted border-slate-500 flex-1 min-h-[14px]"></span>
                                </div>
                              </div>
                            )}

                            {/* 4. Multi Part */}
                            {qType === 'multi_part' && (
                              <div className="space-y-1">
                                {question.multiPartConfig?.introduction && (
                                  <p className="text-xs text-slate-700 italic bg-slate-50 p-1.5 rounded border border-slate-200">
                                    {question.multiPartConfig.introduction}
                                  </p>
                                )}
                                <div className="space-y-1.5 pt-0.5">
                                  {(question.multiPartConfig?.parts || []).map((part, pIdx) => (
                                    <div key={part.id || pIdx} className="text-xs text-slate-900 space-y-0.5">
                                      <p className="font-semibold">
                                        <span className="font-bold text-slate-950 mr-1">
                                          {pIdx + 1}. Pertanyaan {pIdx === 0 ? 'pertama' : 'kedua'}:
                                        </span>
                                        {part.question}
                                      </p>
                                      <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px] pl-4">
                                        <span>Jawaban #{pIdx + 1}:</span>
                                        <span className="border-b border-dotted border-slate-500 flex-1 min-h-[12px]"></span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* A4 Sheet Footer */}
                <div className="border-t border-slate-950 pt-2 text-[10px] text-slate-600 flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-slate-800">
                    KELOMPOK {team.name} • TOTAL {deck.length} SOAL
                  </span>
                  <span className="italic font-medium">
                    Measurement Block Blast • Lembar Resmi Peserta
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. VIEW INDIVIDUAL CARDS (1 SOAL = 1 KARTU POTONG)           */}
      {/* ------------------------------------------------------------- */}
      {printFormat === 'individual_cards' && (
        <div id="printable-student-cards-container" className="space-y-8 print:space-y-4">
          {teams.map((team) => {
            const deck = teamCardDecks[team.id] || [];

            return (
              <div key={team.id} className="space-y-4 print:break-after-page">
                <div className="print:hidden flex items-center justify-between bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700">
                  <h3 className="font-extrabold text-lg text-cyan-400 uppercase tracking-wide">
                    📦 KARTU SOAL KELOMPOK {team.name} ({deck.length} Kartu Soal Potong)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Semua {validation.questionsCount} soal lengkap dengan urutan acak kelompok {team.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4">
                  {deck.map((card) => {
                    const question = getQuestionForTeam(card.questionId, team.id);
                    if (!question) return null;

                    const formattedCardNum = String(card.cardNumber).padStart(2, '0');
                    const qType = question.type || 'short_answer';

                    return (
                      <div
                        key={card.cardCode || `${team.id}-${card.cardNumber}`}
                        className="bg-white text-slate-900 border-2 border-dashed border-slate-400 rounded-2xl p-5 shadow-sm print:shadow-none print:border-2 print:border-dashed print:border-black flex flex-col justify-between min-h-[240px] relative overflow-hidden"
                      >
                        <div className="absolute top-1.5 right-2 text-[9px] text-slate-400 print:text-black uppercase font-mono tracking-widest">
                          ✂ Gunting di sini
                        </div>

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

                          <div className="my-2 space-y-2">
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
      {/* 3. VIEW TEACHER MASTER ANSWER KEY                             */}
      {/* ------------------------------------------------------------- */}
      {printFormat === 'teacher_key' && (
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
                    KELOMPOK {team.name} ({deck.length} Soal)
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 print:bg-slate-200 text-slate-300 print:text-black">
                          <th className="p-2 border border-slate-700 print:border-black text-center w-16">No Soal</th>
                          <th className="p-2 border border-slate-700 print:border-black text-center w-20">ID Bank Soal</th>
                          <th className="p-2 border border-slate-700 print:border-black">Pertanyaan</th>
                          <th className="p-2 border border-slate-700 print:border-black">Kunci Jawaban</th>
                          <th className="p-2 border border-slate-700 print:border-black">Variasi Diterima</th>
                          <th className="p-2 border border-slate-700 print:border-black text-center w-16">Poin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deck.map((card) => {
                          const question = getQuestionForTeam(card.questionId, team.id);
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
