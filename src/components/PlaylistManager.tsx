import React, { useState, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  Search,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Filter,
  CheckCircle2,
  BookOpen,
  FolderSync,
  Tag,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';
import { Question, PlaylistMode, GameSettings, QuestionPlaylist } from '../types';
import {
  getQuestionPlaylists,
  normalizeCategoryKey,
} from '../utils/presets';
import {
  filterQuestionPool,
  getDifficultyLabel,
  getDifficultyBadgeConfig,
  NormalizedDifficulty,
} from '../utils/questionPool';
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
      selectedDifficulty?: string;
      questionCount?: number;
      customQuestionIds?: string[];
      playlistName?: string;
    }
  ) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onToggleOrderLock?: (locked: boolean) => Promise<{ success: boolean; error?: string }>;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  masterQuestions,
  currentSettings,
  isOrderLocked,
  onApplyPlaylist,
  onShowToast,
  onToggleOrderLock,
}) => {
  // Mode selection: 'all' | 'topic' | 'custom'
  const [mode, setMode] = useState<PlaylistMode>(() => {
    return currentSettings.playlistMode || (currentSettings.selectedTopic ? 'topic' : 'all');
  });

  // Mode 'topic' state
  const [selectedSingleTopic, setSelectedSingleTopic] = useState<string>(() => {
    return currentSettings.selectedTopic || '';
  });

  // Difficulty Filter state ('all' | 'easy' | 'medium' | 'hard')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(() => {
    return currentSettings.selectedDifficulty || 'all';
  });

  // Question Count Limit state (0 = all available)
  const [questionCountQuota, setQuestionCountQuota] = useState<number>(() => {
    return currentSettings.questionCount || 0;
  });

  // Mode 'custom' states
  const [playlistName, setPlaylistName] = useState<string>(() => {
    return currentSettings.playlistName || 'Custom Playlist';
  });

  const [selectedTopicsFilter, setSelectedTopicsFilter] = useState<string[]>(() => {
    return currentSettings.selectedTopics || [];
  });

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(() => {
    if (currentSettings.customQuestionIds && currentSettings.customQuestionIds.length > 0) {
      return currentSettings.customQuestionIds;
    }
    return masterQuestions.map((q) => q.id);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showPreviewList, setShowPreviewList] = useState(true);
  const [isLocking, setIsLocking] = useState(false);

  // Auto-generate topic playlists from master questions (Single Source of Truth)
  const autoPlaylists: QuestionPlaylist[] = useMemo(() => {
    return getQuestionPlaylists(masterQuestions);
  }, [masterQuestions]);

  // Master difficulty counts
  const masterDifficultyCounts = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0, unassigned: 0 };
    masterQuestions.forEach((q) => {
      const d = (q.difficulty || '').toLowerCase();
      if (d === 'easy' || d === 'mudah') counts.easy++;
      else if (d === 'medium' || d === 'sedang') counts.medium++;
      else if (d === 'hard' || d === 'sulit' || d === 'hots') counts.hard++;
      else counts.unassigned++;
    });
    return counts;
  }, [masterQuestions]);

  // Filtered master questions for custom selection UI
  const displayedQuestions = useMemo(() => {
    return masterQuestions.filter((q) => {
      if (selectedTopicsFilter.length > 0) {
        const normCat = normalizeCategoryKey(q.category);
        const matchTopic = selectedTopicsFilter.some((t) => normalizeCategoryKey(t) === normCat);
        if (!matchTopic) return false;
      }

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

  // Computed snapshot questions & distribution via filterQuestionPool
  const poolResult = useMemo(() => {
    let topicToFilter = '';
    if (mode === 'topic') {
      topicToFilter = selectedSingleTopic;
    }

    return filterQuestionPool({
      questions: masterQuestions,
      topic: topicToFilter,
      difficulty: selectedDifficulty,
      count: questionCountQuota > 0 ? questionCountQuota : undefined,
      customQuestionIds: mode === 'custom' ? selectedQuestionIds : undefined,
    });
  }, [masterQuestions, mode, selectedSingleTopic, selectedDifficulty, questionCountQuota, selectedQuestionIds]);

  const previewQuestions = poolResult.selectedQuestions;

  // Active playlist descriptor
  const activePlaylist = useMemo(() => {
    if (mode === 'all') {
      return autoPlaylists.find((p) => p.isDefaultAll) || autoPlaylists[0];
    }
    if (mode === 'topic') {
      if (!selectedSingleTopic) return autoPlaylists[0];
      const normKey = normalizeCategoryKey(selectedSingleTopic);
      return autoPlaylists.find((p) => p.id === normKey || p.name.toLowerCase() === normKey) || {
        id: normKey,
        name: selectedSingleTopic,
        count: masterQuestions.filter((q) => normalizeCategoryKey(q.category) === normKey).length,
        questionIds: [],
        questions: [],
        icon: '📚',
      };
    }
    return {
      id: 'custom',
      name: playlistName || 'Custom Playlist',
      count: selectedQuestionIds.length,
      questionIds: selectedQuestionIds,
      questions: [],
      icon: '✨',
    };
  }, [autoPlaylists, mode, selectedSingleTopic, playlistName, selectedQuestionIds, masterQuestions]);

  // Select a category playlist directly
  const handleSelectCategoryPlaylist = (playlist: QuestionPlaylist) => {
    if (isOrderLocked) return;
    if (playlist.isDefaultAll) {
      setMode('all');
      setSelectedSingleTopic('');
    } else if (playlist.id === 'uncategorized') {
      setMode('topic');
      setSelectedSingleTopic('Tanpa Topik');
    } else {
      setMode('topic');
      setSelectedSingleTopic(playlist.name);
    }
    sound.playClick();
  };

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

  // Select all displayed questions
  const handleSelectAllDisplayed = () => {
    if (isOrderLocked) return;
    const idsToAdd = displayedQuestions.map((q) => q.id);
    setSelectedQuestionIds((prev) => {
      const set = new Set([...prev, ...idsToAdd]);
      return Array.from(set);
    });
    sound.playClick();
  };

  // Deselect all displayed questions
  const handleDeselectAllDisplayed = () => {
    if (isOrderLocked) return;
    const idsToRemove = new Set(displayedQuestions.map((q) => q.id));
    setSelectedQuestionIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
    sound.playClick();
  };

  // Toggle topic checkbox in custom filter
  const handleToggleTopicFilter = (topic: string) => {
    if (isOrderLocked) return;
    const norm = normalizeCategoryKey(topic);
    setSelectedTopicsFilter((prev) => {
      const has = prev.some((t) => normalizeCategoryKey(t) === norm);
      if (has) {
        return prev.filter((t) => normalizeCategoryKey(t) !== norm);
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
      onShowToast('Playlist belum memiliki soal yang memenuhi kriteria. Periksa kembali filter topik dan level.', 'error');
      return;
    }

    let finalName = 'Semua Topik';
    if (mode === 'topic') {
      finalName = selectedSingleTopic ? `Topik: ${selectedSingleTopic}` : 'Semua Topik';
    } else if (mode === 'custom') {
      finalName = playlistName.trim() || 'Custom Playlist';
    }

    if (selectedDifficulty && selectedDifficulty !== 'all') {
      finalName += ` (${getDifficultyLabel(selectedDifficulty)})`;
    }

    onApplyPlaylist(mode, {
      selectedTopic: selectedSingleTopic,
      selectedTopics: selectedTopicsFilter,
      selectedDifficulty,
      questionCount: questionCountQuota > 0 ? questionCountQuota : undefined,
      customQuestionIds: selectedQuestionIds,
      playlistName: finalName,
    });

    sound.playStart();
    onShowToast(`🎉 Playlist "${finalName}" berhasil diterapkan! (${previewQuestions.length} soal siap dimainkan)`, 'success');
  };

  // Quick finalize & lock from playlist card
  const handleFinalizeAndLock = async () => {
    if (!onToggleOrderLock) return;
    if (previewQuestions.length === 0) {
      onShowToast('Tidak ada soal untuk difinalisasi.', 'error');
      return;
    }
    setIsLocking(true);
    try {
      // First apply current playlist
      handleApply();
      const res = await onToggleOrderLock(true);
      if (res && !res.success) {
        onShowToast(res.error || 'Gagal mengunci urutan pertandingan.', 'error');
      } else {
        sound.playStart();
        onShowToast('🔒 Urutan soal resmi berhasil difinalisasi & dikunci! Kartu siap dicetak.', 'success');
      }
    } catch (e: any) {
      onShowToast(e?.message || 'Gagal memfinalisasi urutan.', 'error');
    } finally {
      setIsLocking(false);
    }
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
                DISTRIBUSI SOAL & PLAYLIST PERTANDINGAN (FASE 6B)
              </h3>
              {isOrderLocked && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  TERKUNCI
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Pilih Topik/Kategori, Level Kesulitan, dan Kuota Soal dengan Distribusi Berimbang
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty Breakdown Badges */}
          <span className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
            🟢 {poolResult.distribution.easy} Easy
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold">
            🟡 {poolResult.distribution.medium} Medium
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono font-bold">
            🔴 {poolResult.distribution.hard} Hard
          </span>
          <span className="text-xs px-3 py-1.5 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 font-mono font-bold">
            Total: {previewQuestions.length} Soal
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

      {/* 1. TOPIC SELECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FolderSync className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Pilih Topik / Kategori Soal</span>
          </label>
          <span className="text-[11px] text-slate-400">
            Total {autoPlaylists.length} Playlist Tersedia
          </span>
        </div>

        {/* Dropdown Selector */}
        <div className="relative">
          <select
            id="select-auto-playlist-dropdown"
            value={mode === 'all' ? 'all' : selectedSingleTopic || 'all'}
            disabled={isOrderLocked}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') {
                setMode('all');
                setSelectedSingleTopic('');
              } else {
                setMode('topic');
                setSelectedSingleTopic(val);
              }
              sound.playClick();
            }}
            className={`w-full bg-slate-950/90 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none cursor-pointer appearance-none ${
              isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {autoPlaylists.map((pl) => {
              const val = pl.isDefaultAll ? 'all' : pl.name;
              return (
                <option key={pl.id} value={val} className="bg-slate-900 text-white font-medium">
                  {pl.icon ? `${pl.icon} ` : ''}{pl.name} — {pl.count} soal
                </option>
              );
            })}
          </select>
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-bold">
            ▼
          </span>
        </div>

        {/* Visual Topic Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
          {autoPlaylists.map((pl) => {
            const isSelected =
              (pl.isDefaultAll && mode === 'all') ||
              (!pl.isDefaultAll && mode === 'topic' && normalizeCategoryKey(selectedSingleTopic) === normalizeCategoryKey(pl.name));

            return (
              <button
                key={pl.id}
                type="button"
                disabled={isOrderLocked}
                onClick={() => handleSelectCategoryPlaylist(pl)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400 scale-[1.02]'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{pl.icon || '📚'}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-slate-200">{pl.name}</p>
                    <p className="text-[10px] text-cyan-400 font-mono font-bold">{pl.count} soal</p>
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DIFFICULTY LEVEL SELECTOR & QUOTA (FASE 6B CORE) */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>2. Tingkat Kesulitan Soal (Difficulty Level)</span>
          </label>
          <span className="text-[11px] text-slate-400">
            Pilih level spesifik atau seimbangkan seluruh level
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Semua Level */}
          <button
            type="button"
            disabled={isOrderLocked}
            onClick={() => {
              setSelectedDifficulty('all');
              sound.playClick();
            }}
            className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
              selectedDifficulty === 'all'
                ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
            } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-sm">⚖️</span>
            <span className="text-xs font-bold">Semua Level</span>
            <span className="text-[10px] text-cyan-300 font-mono">Distribusi Seimbang</span>
          </button>

          {/* Easy */}
          <button
            type="button"
            disabled={isOrderLocked}
            onClick={() => {
              setSelectedDifficulty('easy');
              sound.playClick();
            }}
            className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
              selectedDifficulty === 'easy'
                ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-400'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
            } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-sm">🟢</span>
            <span className="text-xs font-bold text-emerald-300">Easy (Mudah)</span>
            <span className="text-[10px] text-slate-400 font-mono">Tersedia: {masterDifficultyCounts.easy} soal</span>
          </button>

          {/* Medium */}
          <button
            type="button"
            disabled={isOrderLocked}
            onClick={() => {
              setSelectedDifficulty('medium');
              sound.playClick();
            }}
            className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
              selectedDifficulty === 'medium'
                ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-400'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
            } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-sm">🟡</span>
            <span className="text-xs font-bold text-amber-300">Medium (Sedang)</span>
            <span className="text-[10px] text-slate-400 font-mono">Tersedia: {masterDifficultyCounts.medium} soal</span>
          </button>

          {/* Hard */}
          <button
            type="button"
            disabled={isOrderLocked}
            onClick={() => {
              setSelectedDifficulty('hard');
              sound.playClick();
            }}
            className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
              selectedDifficulty === 'hard'
                ? 'bg-rose-500/20 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.2)] ring-1 ring-rose-400'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
            } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-sm">🔴</span>
            <span className="text-xs font-bold text-rose-300">Hard (HOTS)</span>
            <span className="text-[10px] text-slate-400 font-mono">Tersedia: {masterDifficultyCounts.hard} soal</span>
          </button>
        </div>

        {/* Quota / Limit Setting */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300">Batas Kuota Soal Pertandingan:</span>
          </div>

          <div className="flex items-center gap-2">
            {[0, 5, 8, 10, 15].map((val) => (
              <button
                key={val}
                type="button"
                disabled={isOrderLocked}
                onClick={() => {
                  setQuestionCountQuota(val);
                  sound.playClick();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  questionCountQuota === val
                    ? 'bg-cyan-500 text-slate-950 font-black ring-2 ring-cyan-400'
                    : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white'
                } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {val === 0 ? 'Semua' : `${val} Soal`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Warning if Insufficient Questions */}
      {poolResult.warning && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3 animate-fade-in font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{poolResult.warning}</span>
        </div>
      )}

      {/* Mode Switcher Tabs (All / Topic / Custom Advanced) */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          <span>Mode Playlist Alternatif</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mode: Semua Soal */}
          <button
            type="button"
            disabled={isOrderLocked}
            onClick={() => {
              if (!isOrderLocked) {
                setMode('all');
                setSelectedSingleTopic('');
                sound.playClick();
              }
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'all'
                ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
            } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                1. Semua Topik
              </span>
              {mode === 'all' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
            </div>
            <p className="text-[11px] text-slate-400">
              Gunakan seluruh koleksi soal master ({masterQuestions.length} soal).
            </p>
          </button>

          {/* Mode: Satu Topik */}
          <button
            type="button"
            disabled={isOrderLocked}
            onClick={() => {
              if (!isOrderLocked) {
                setMode('topic');
                if (!selectedSingleTopic && autoPlaylists.length > 1) {
                  setSelectedSingleTopic(autoPlaylists[1].name);
                }
                sound.playClick();
              }
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'topic'
                ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
            } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-cyan-400" />
                2. Satu Topik
              </span>
              {mode === 'topic' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
            </div>
            <p className="text-[11px] text-slate-400">
              Fokus pada 1 kategori saja (misal: Suhu, Pengukuran).
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
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'custom'
                ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
            } ${isOrderLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                3. Pilihan Kustom
              </span>
              {mode === 'custom' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
            </div>
            <p className="text-[11px] text-slate-400">
              Pilih soal individual atau kombinasi topik tertentu.
            </p>
          </button>
        </div>
      </div>

      {/* CUSTOM PLAYLIST EDITOR (Shown when mode === 'custom') */}
      {mode === 'custom' && (
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-cyan-500/30 space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                KUSTOMISASI PLAYLIST MULTI-TOPIK
              </h4>
              <p className="text-xs text-slate-400">
                Pilih topik filter atau centang manual soal-soal yang ingin disertakan
              </p>
            </div>

            <div className="w-full sm:w-72">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Nama Playlist
              </label>
              <input
                type="text"
                value={playlistName}
                disabled={isOrderLocked}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Contoh: Paket Ujian Bab 1 & 2"
                className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
              />
            </div>
          </div>

          {/* Quick Multi-Topic Filter Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Filter Berdasarkan Topik:
            </span>
            <div className="flex flex-wrap gap-2">
              {autoPlaylists
                .filter((p) => !p.isDefaultAll)
                .map((p) => {
                  const isChecked = selectedTopicsFilter.some((t) => normalizeCategoryKey(t) === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOrderLocked}
                      onClick={() => handleToggleTopicFilter(p.name)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                          : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{p.icon || '📚'}</span>
                      <span>{p.name}</span>
                      <span className="font-mono text-[10px] opacity-75">({p.count})</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Search and Bulk Controls */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode soal, isi pertanyaan, atau jawaban..."
                  className="w-full bg-slate-900 border border-white/10 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
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
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {displayedQuestions.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Tidak ada soal yang cocok dengan filter atau pencarian.
                </div>
              ) : (
                displayedQuestions.map((q, idx) => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  const diffBadge = getDifficultyBadgeConfig(q.difficulty);
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
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 cursor-pointer shrink-0"
                        />
                        <span className="font-mono text-[11px] font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 shrink-0">
                          {q.code || `Q-${String(idx + 1).padStart(2, '0')}`}
                        </span>
                        <span className="text-xs truncate font-medium text-slate-200">{q.questionText}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${diffBadge.badgeClass}`}>
                          {diffBadge.label}
                        </span>
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
          <span>Playlist belum memiliki soal. Pilih topik atau level yang memiliki soal di Bank Soal.</span>
        </div>
      )}

      {/* PREVIEW SNAPSHOT SECTION */}
      {showPreviewList && previewQuestions.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3 animate-fade-in shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activePlaylist.icon || '📚'}</span>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>PLAYLIST: {activePlaylist.name.toUpperCase()}</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                    {previewQuestions.length} Soal Terurut
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  Urutan kartu pertandingan mempertahankan urutan resmi nomor soal terkecil.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPreviewList(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Sembunyikan</span>
            </button>
          </div>

          {/* Table of Preview Sequence with Difficulty Badges */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {previewQuestions.map((q, idx) => {
              const diffBadge = getDifficultyBadgeConfig(q.difficulty);
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyan-500/20 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-cyan-400 font-black text-xs w-8 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-slate-300 font-bold px-2 py-0.5 rounded bg-slate-950 border border-white/10 text-[11px] shrink-0">
                      {q.code || `Q${String(idx + 1).padStart(2, '0')}`}
                    </span>
                    <span className="font-medium text-slate-200 truncate">{q.questionText}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${diffBadge.badgeClass}`}>
                      {diffBadge.label}
                    </span>
                    <span className="text-emerald-400 font-mono text-[11px] font-bold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                      Kunci: {q.correctAnswer}
                    </span>
                    {q.category && (
                      <span className="text-slate-400 text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full hidden sm:inline">
                        {q.category}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        {!showPreviewList && (
          <button
            type="button"
            onClick={() => setShowPreviewList(true)}
            className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer font-semibold transition-colors"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Lihat Urutan Snapshot ({previewQuestions.length} Soal)</span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {/* Apply Playlist */}
          <button
            id="btn-apply-playlist"
            type="button"
            disabled={isOrderLocked || previewQuestions.length === 0}
            onClick={handleApply}
            className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <Tag className="w-4 h-4 text-cyan-400" />
            <span>Terapkan Playlist</span>
          </button>

          {/* Finalize and Lock Order */}
          {onToggleOrderLock && !isOrderLocked && (
            <button
              id="btn-finalize-playlist-lock"
              type="button"
              disabled={isLocking || previewQuestions.length === 0}
              onClick={handleFinalizeAndLock}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Lock className="w-4 h-4" />
              <span>{isLocking ? 'Mengunci...' : 'FINALISASI & KUNCI'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
