import React, { useState, useMemo } from 'react';
import {
  Layers,
  CheckSquare,
  Square,
  Sparkles,
  Search,
  Check,
  AlertTriangle,
  Lock,
  ListOrdered,
  Eye,
  EyeOff,
  Filter,
  CheckCircle2,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { Question, PlaylistMode, GameSettings } from '../types';
import { getUniqueQuestionCategories, filterQuestionsByPlaylist } from '../utils/presets';
import { sound } from '../utils/sound';

interface PlaylistManagerProps {
  masterQuestions: Question[];
  currentSettings: GameSettings;
  isOrderLocked: boolean;
  onApplyPlaylist: (
    mode: PlaylistMode,
    options: {
      selectedTopic?: string;
      selectedTopics?: string[];
      customQuestionIds?: string[];
      playlistName?: string;
    }
  ) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  masterQuestions,
  currentSettings,
  isOrderLocked,
  onApplyPlaylist,
  onShowToast,
}) => {
  // Mode selection: 'all' | 'topic' | 'custom'
  const [mode, setMode] = useState<PlaylistMode>(() => {
    return currentSettings.playlistMode || (currentSettings.selectedTopic ? 'topic' : 'all');
  });

  // Mode 'topic' state
  const [selectedSingleTopic, setSelectedSingleTopic] = useState<string>(() => {
    return currentSettings.selectedTopic || '';
  });

  // Mode 'custom' states
  const [playlistName, setPlaylistName] = useState<string>(() => {
    return currentSettings.playlistName || 'Custom Playlist 1';
  });

  const [selectedTopicsFilter, setSelectedTopicsFilter] = useState<string[]>(() => {
    return currentSettings.selectedTopics || [];
  });

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(() => {
    if (currentSettings.customQuestionIds && currentSettings.customQuestionIds.length > 0) {
      return currentSettings.customQuestionIds;
    }
    // Default to all master questions if custom wasn't configured yet
    return masterQuestions.map((q) => q.id);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showPreviewList, setShowPreviewList] = useState(false);

  // Available topics in master bank
  const availableTopics = useMemo(() => {
    return getUniqueQuestionCategories(masterQuestions);
  }, [masterQuestions]);

  // Filtered master questions for selection UI (in custom mode)
  const displayedQuestions = useMemo(() => {
    return masterQuestions.filter((q) => {
      // Topic filter in custom mode
      if (selectedTopicsFilter.length > 0) {
        const cat = (q.category || '').trim();
        if (!selectedTopicsFilter.includes(cat)) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textMatch = (q.questionText || '').toLowerCase().includes(query);
        const codeMatch = (q.code || '').toLowerCase().includes(query);
        const catMatch = (q.category || '').toLowerCase().includes(query);
        const ansMatch = (q.correctAnswer || '').toLowerCase().includes(query);
        if (!textMatch && !codeMatch && !catMatch && !ansMatch) {
          return false;
        }
      }

      return true;
    });
  }, [masterQuestions, selectedTopicsFilter, searchQuery]);

  // Computed snapshot questions for the active configuration
  const previewQuestions = useMemo(() => {
    return filterQuestionsByPlaylist(masterQuestions, {
      playlistMode: mode,
      selectedTopic: selectedSingleTopic,
      selectedTopics: selectedTopicsFilter,
      customQuestionIds: selectedQuestionIds,
    });
  }, [masterQuestions, mode, selectedSingleTopic, selectedTopicsFilter, selectedQuestionIds]);

  // Toggle single question in custom list
  const handleToggleQuestion = (id: string) => {
    if (isOrderLocked) return;
    setSelectedQuestionIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Select all currently displayed questions
  const handleSelectAllDisplayed = () => {
    if (isOrderLocked) return;
    const idsToAdd = displayedQuestions.map((q) => q.id);
    setSelectedQuestionIds((prev) => {
      const set = new Set([...prev, ...idsToAdd]);
      return Array.from(set);
    });
    sound.playClick();
  };

  // Deselect all currently displayed questions
  const handleDeselectAllDisplayed = () => {
    if (isOrderLocked) return;
    const idsToRemove = new Set(displayedQuestions.map((q) => q.id));
    setSelectedQuestionIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
    sound.playClick();
  };

  // Toggle topic checkbox in custom filter
  const handleToggleTopicFilter = (topic: string) => {
    if (isOrderLocked) return;
    setSelectedTopicsFilter((prev) => {
      if (prev.includes(topic)) {
        return prev.filter((t) => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  // Apply playlist handler
  const handleApply = () => {
    if (isOrderLocked) {
      onShowToast('Urutan pertandingan terkunci. Buka kunci terlebih dahulu untuk mengganti playlist.', 'error');
      return;
    }

    if (previewQuestions.length === 0) {
      onShowToast('Playlist belum memiliki soal. Pilih topik atau soal terlebih dahulu.', 'error');
      return;
    }

    let finalName = 'Semua Soal Master';
    if (mode === 'topic') {
      finalName = selectedSingleTopic ? `Topik: ${selectedSingleTopic}` : 'Semua Topik';
    } else if (mode === 'custom') {
      finalName = playlistName.trim() || 'Custom Playlist';
    }

    onApplyPlaylist(mode, {
      selectedTopic: selectedSingleTopic,
      selectedTopics: selectedTopicsFilter,
      customQuestionIds: selectedQuestionIds,
      playlistName: finalName,
    });

    sound.playStart();
    onShowToast(`🎉 Playlist "${finalName}" berhasil diterapkan! (${previewQuestions.length} soal dimuat ke pertandingan)`, 'success');
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                CUSTOM QUESTION PLAYLIST & SNAPSHOT
              </h3>
              {isOrderLocked && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  TERKUNCI
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Pilih mode playlist untuk pertandingan: Semua Soal, Satu Topik, atau Custom Pilihan Soal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 font-mono font-bold">
            {previewQuestions.length} Soal Terpilih
          </span>
        </div>
      </div>

      {/* Lock Notice if Order is locked */}
      {isOrderLocked && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3 font-medium">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Urutan kartu pertandingan saat ini sudah <strong>DIFINALISASI & DIKUNCI</strong>. Untuk mengganti playlist
            atau memilih soal lain, silakan klik tombol <strong>"Buka Kunci Urutan"</strong> terlebih dahulu.
          </span>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Mode: Semua Soal */}
        <button
          type="button"
          disabled={isOrderLocked}
          onClick={() => {
            if (!isOrderLocked) {
              setMode('all');
              sound.playClick();
            }
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            mode === 'all'
              ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
              : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
          } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              1. Semua Soal
            </span>
            {mode === 'all' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Gunakan seluruh koleksi soal master ({masterQuestions.length} soal) tanpa filter.
          </p>
        </button>

        {/* Mode: Satu Topik */}
        <button
          type="button"
          disabled={isOrderLocked}
          onClick={() => {
            if (!isOrderLocked) {
              setMode('topic');
              sound.playClick();
            }
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            mode === 'topic'
              ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
              : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
          } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-cyan-400" />
              2. Satu Topik
            </span>
            {mode === 'topic' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Filter pertandingan berdasarkan satu topik/kategori spesifik.
          </p>
        </button>

        {/* Mode: Custom Playlist */}
        <button
          type="button"
          disabled={isOrderLocked}
          onClick={() => {
            if (!isOrderLocked) {
              setMode('custom');
              sound.playClick();
            }
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            mode === 'custom'
              ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
              : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
          } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              3. Custom Playlist
            </span>
            {mode === 'custom' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Bebas memilih soal individual, kombinasi multi-topik, dan nama babak kustom.
          </p>
        </button>
      </div>

      {/* Mode 2 Configuration: Satu Topik */}
      {mode === 'topic' && (
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-4 animate-fade-in">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Pilih Kategori / Topik Soal:
            </label>
            <div className="relative">
              <select
                id="select-playlist-single-topic"
                value={selectedSingleTopic}
                disabled={isOrderLocked}
                onChange={(e) => setSelectedSingleTopic(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none cursor-pointer appearance-none"
              >
                <option value="" className="bg-slate-900 text-white">
                  -- Pilih Topik Soal --
                </option>
                {availableTopics.map((topic) => {
                  const count = masterQuestions.filter((q) => (q.category || '').trim() === topic.trim()).length;
                  return (
                    <option key={topic} value={topic} className="bg-slate-900 text-white">
                      {topic} ({count} Soal Tersedia)
                    </option>
                  );
                })}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-bold">
                ▼
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pertandingan hanya akan menyajikan soal yang bertopik ini, tetap mempertahankan urutan aslinya.
            </p>
          </div>
        </div>
      )}

      {/* Mode 3 Configuration: Custom Playlist Builder */}
      {mode === 'custom' && (
        <div className="space-y-5 animate-fade-in">
          {/* Playlist Name Input */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Nama Playlist Kustom
                </label>
                <input
                  id="input-custom-playlist-name"
                  type="text"
                  value={playlistName}
                  disabled={isOrderLocked}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="Contoh: Babak Semifinal - Besaran & Dimensi"
                  className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white outline-none"
                />
              </div>

              {/* Multi-topic quick filter checkboxes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Filter Berdasarkan Topik
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {availableTopics.map((topic) => {
                    const isChecked = selectedTopicsFilter.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        disabled={isOrderLocked}
                        onClick={() => handleToggleTopicFilter(topic)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {isChecked ? <Check className="w-3 h-3 text-cyan-400" /> : null}
                        <span>{topic}</span>
                      </button>
                    );
                  })}
                  {selectedTopicsFilter.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTopicsFilter([])}
                      className="px-2.5 py-1 rounded-xl text-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 bg-rose-500/10 cursor-pointer"
                    >
                      Reset Filter Topik
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Individual Question Selector Table */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Pilih Soal Individual ({selectedQuestionIds.length} dari {masterQuestions.length} Soal Dipilih)
                </h4>
              </div>

              {/* Action buttons: Select all / Deselect all & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari teks/kode soal..."
                    className="bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none w-48"
                  />
                </div>

                <button
                  type="button"
                  disabled={isOrderLocked}
                  onClick={handleSelectAllDisplayed}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Pilih Semua ({displayedQuestions.length})
                </button>

                <button
                  type="button"
                  disabled={isOrderLocked}
                  onClick={handleDeselectAllDisplayed}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-400 hover:text-rose-300 cursor-pointer"
                >
                  Hapus Pilihan
                </button>
              </div>
            </div>

            {/* Questions Selection List */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {displayedQuestions.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Tidak ada soal yang cocok dengan filter atau pencarian.
                </div>
              ) : (
                displayedQuestions.map((q, idx) => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleToggleQuestion(q.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-400/40 text-white'
                          : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isOrderLocked}
                          onChange={() => {}} // Handled by parent div
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 cursor-pointer shrink-0"
                        />
                        <span className="font-mono text-[11px] font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 shrink-0">
                          {q.code || `Q-${String(idx + 1).padStart(2, '0')}`}
                        </span>
                        <span className="text-xs truncate font-medium text-slate-200">{q.questionText}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {q.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                            {q.category}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-amber-300 font-mono">
                          {q.points || 10} pt
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 0 Questions Warning */}
      {previewQuestions.length === 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-3 animate-fade-in font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Playlist belum memiliki soal. Pilih topik atau soal terlebih dahulu.</span>
        </div>
      )}

      {/* Preview Accordion & Apply Action Bar */}
      <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setShowPreviewList(!showPreviewList)}
          className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer font-semibold transition-colors"
        >
          {showPreviewList ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showPreviewList ? 'Sembunyikan Preview Snapshot' : `Lihat Preview Urutan Soal (${previewQuestions.length} Soal)`}</span>
        </button>

        <button
          id="btn-apply-playlist"
          type="button"
          disabled={isOrderLocked || previewQuestions.length === 0}
          onClick={handleApply}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Gunakan Playlist Ini (Buat Snapshot)</span>
        </button>
      </div>

      {/* Preview Questions List Modal / Accordion */}
      {showPreviewList && previewQuestions.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase border-b border-white/10 pb-2 mb-2">
            <span>Urutan Kartu (#)</span>
            <span>Pertanyaan & Kunci</span>
            <span>Kategori</span>
          </div>
          {previewQuestions.map((q, idx) => (
            <div key={q.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-cyan-400 font-bold w-12 shrink-0">Kartu #{idx + 1}</span>
                <span className="font-semibold text-slate-200 truncate">{q.questionText}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-emerald-400 text-[11px] font-mono font-bold truncate max-w-[120px]">
                  {q.correctAnswer}
                </span>
                <span className="text-slate-500 text-[10px]">{q.category || '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
