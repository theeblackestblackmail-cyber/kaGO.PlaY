import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import { parseLRC, getActiveLyricIndex, formatLyricTimestamp } from '../../utils/lrcParser';
import {
  Clock,
  Edit3,
  Upload,
  Check,
  Music2,
  RotateCcw,
  PlusCircle,
  FileText,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { haptic } from '../../utils/haptics';

export const LyricsView: React.FC = () => {
  const { activeTrack, currentTime, seek, settings, updateSettingsState, editTrackMeta } = useAudio();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const rawLyrics = activeTrack?.lyrics || '';
  const parsedLyrics = React.useMemo(() => parseLRC(rawLyrics), [rawLyrics]);
  const activeIndex = getActiveLyricIndex(parsedLyrics, currentTime, settings.lyricOffset);

  // Auto-scroll active lyric into view
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && !isEditing) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isEditing]);

  const handleOffsetChange = (val: number) => {
    const clamped = Math.round(Math.max(-2.0, Math.min(2.0, val)) * 10) / 10;
    updateSettingsState({ lyricOffset: clamped });
    haptic.eqTick();
  };

  const handleResetOffset = () => {
    updateSettingsState({ lyricOffset: 0.0 });
    haptic.eqTick();
  };

  const handleStartEdit = () => {
    haptic.eqTick();
    setEditText(rawLyrics || '[00:00.00] Intro\n[00:15.00] First Verse begins...');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    haptic.eqTick();
    if (activeTrack) {
      await editTrackMeta(activeTrack.id, { lyrics: editText });
      setStatusMessage('Lyrics saved successfully to track!');
      setTimeout(() => setStatusMessage(null), 3000);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Helper to insert current playback time as a standard [mm:ss.xx] tag
  const handleInsertCurrentTimestamp = () => {
    haptic.eqTick();
    const tag = formatLyricTimestamp(currentTime);
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + tag + ' ' + text.substring(end);
      setEditText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length + 1, start + tag.length + 1);
      }, 50);
    } else {
      setEditText((prev) => prev + `\n${tag} `);
    }
  };

  const processLrcFile = async (file: File) => {
    if (!activeTrack) {
      setStatusMessage('Please select and play a track first to attach lyrics.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        await editTrackMeta(activeTrack.id, { lyrics: content });
        setStatusMessage(`Imported lyrics from "${file.name}"!`);
        setTimeout(() => setStatusMessage(null), 3500);
        haptic.trackSkip();
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processLrcFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.lrc') || file.name.endsWith('.txt'))) {
      processLrcFile(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col h-full bg-[#0c0c0e] text-[#f2efeb] p-4 sm:p-6 pb-28 relative ${
        isDragOver ? 'ring-2 ring-[#ff3e3e] bg-[#ff3e3e]/5' : ''
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#202026]">
        <div>
          <div className="flex items-center gap-2.5">
            <Music2 className="w-6 h-6 text-[#ff3e3e]" />
            <h2 className="text-xl sm:text-2xl font-bold font-brand tracking-wider uppercase text-white">
              SYNCHRONIZED LRC LYRICS ENGINE
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#8c8c9e] mt-0.5 truncate max-w-xl font-mono">
            {activeTrack ? (
              <span>
                <strong className="text-white">{activeTrack.title}</strong> — {activeTrack.artist}
              </span>
            ) : (
              'No active track selected — play a song from your library or stream'
            )}
          </p>
        </div>

        {/* Controls: Offset Calibration & Tools */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Timing Calibration Offset Tool (-2.0s to +2.0s in 0.1s steps) */}
          <div className="flex items-center gap-2 bg-[#16161a] border border-[#262632] px-3 py-1.5 rounded-xl text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-[#ff3e3e] shrink-0" />
            <span className="text-gray-400">Offset:</span>

            <button
              onClick={() => handleOffsetChange(settings.lyricOffset - 0.1)}
              className="px-2 py-0.5 bg-[#202028] hover:bg-[#ff3e3e] hover:text-white rounded transition text-xs font-bold active:scale-95"
              title="Minus 0.1s"
            >
              -0.1s
            </button>

            {/* Slider with -2.0 to +2.0 */}
            <input
              type="range"
              min="-2.0"
              max="2.0"
              step="0.1"
              value={settings.lyricOffset}
              onChange={(e) => handleOffsetChange(parseFloat(e.target.value))}
              className="w-16 sm:w-20 accent-[#ff3e3e] cursor-pointer"
              title="Adjust timing offset from -2.0s to +2.0s"
            />

            <span
              className={`w-14 text-center font-bold tabular-nums ${
                settings.lyricOffset !== 0 ? 'text-[#ff3e3e]' : 'text-gray-300'
              }`}
            >
              {settings.lyricOffset > 0
                ? `+${settings.lyricOffset.toFixed(1)}s`
                : `${settings.lyricOffset.toFixed(1)}s`}
            </span>

            <button
              onClick={() => handleOffsetChange(settings.lyricOffset + 0.1)}
              className="px-2 py-0.5 bg-[#202028] hover:bg-[#ff3e3e] hover:text-white rounded transition text-xs font-bold active:scale-95"
              title="Plus 0.1s"
            >
              +0.1s
            </button>

            {settings.lyricOffset !== 0 && (
              <button
                onClick={handleResetOffset}
                className="p-1 hover:text-[#ff3e3e] text-gray-500 transition"
                title="Reset offset to 0.0s"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Built-in Editor Trigger */}
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#16161a] hover:bg-[#202028] border border-[#262632] hover:border-[#ff3e3e] text-xs font-mono font-medium rounded-xl transition active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#ff3e3e]" />
              <span>EDIT LRC</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white text-xs font-mono font-bold rounded-xl transition shadow-lg shadow-[#ff3e3e]/30 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>SAVE LRC</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-2 bg-[#1c1c24] hover:bg-[#262630] text-gray-400 hover:text-white rounded-xl transition"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Import Local .LRC File Tool */}
          <label className="flex items-center gap-1.5 px-3.5 py-2 bg-[#16161a] hover:bg-[#202028] border border-[#262632] hover:border-[#ff3e3e] text-xs font-mono font-medium rounded-xl cursor-pointer transition active:scale-95">
            <Upload className="w-3.5 h-3.5 text-[#ff3e3e]" />
            <span>IMPORT .LRC</span>
            <input type="file" accept=".lrc,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div className="mt-3 p-3 bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 rounded-xl text-xs font-mono text-[#ff3e3e] text-center animate-in fade-in">
          {statusMessage}
        </div>
      )}

      {/* Main Lyrics Display or Built-in Text Editor */}
      <div ref={containerRef} className="flex-1 overflow-y-auto py-8 px-2 max-w-3xl mx-auto w-full">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 bg-[#141418] border border-[#22222c] p-3 rounded-xl">
              <span className="text-xs text-gray-400 font-mono">
                Standard format: <code className="text-[#ff3e3e]">[01:23.45] lyric line</code>
              </span>
              <button
                onClick={handleInsertCurrentTimestamp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff3e3e]/20 hover:bg-[#ff3e3e]/30 border border-[#ff3e3e]/50 text-[#ff3e3e] rounded-lg text-xs font-mono font-bold transition active:scale-95"
                title="Insert current song timestamp at cursor"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>INSERT TIMESTAMP ({formatLyricTimestamp(currentTime)})</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full h-96 bg-[#14141a] border border-[#262636] focus:border-[#ff3e3e] rounded-2xl p-4 font-mono text-sm text-[#f2efeb] outline-none resize-none leading-relaxed shadow-inner"
              placeholder="[00:05.00] Enter timestamped lyrics..."
            />

            <div className="flex items-center justify-between text-xs font-mono text-gray-500">
              <span>Lines: {editText.split('\n').filter(Boolean).length}</span>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-[#ff3e3e] text-white font-bold rounded-xl hover:bg-[#e03030] transition"
              >
                APPLY & SAVE LYRICS
              </button>
            </div>
          </div>
        ) : parsedLyrics.length > 0 ? (
          <div className="space-y-6 text-center py-4">
            {parsedLyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => {
                    haptic.eqTick();
                    seek(line.time);
                  }}
                  className={`cursor-pointer transition-all duration-300 py-2 px-4 rounded-xl group select-none ${
                    isActive
                      ? 'text-[#ff3e3e] text-2xl sm:text-3xl font-extrabold font-brand tracking-wide drop-shadow-[0_0_15px_rgba(255,62,62,0.95)] crimson-text-glow scale-105'
                      : 'text-[#5a5a6e] hover:text-[#b4b4c8] text-base sm:text-lg font-medium'
                  }`}
                >
                  <p className="leading-snug">{line.text || '♪ ♪ ♪'}</p>
                  <span className="text-[10px] font-mono text-transparent group-hover:text-[#ff3e3e] mt-1 block transition-colors">
                    Jump to {Math.floor(line.time / 60)}:{String(Math.floor(line.time % 60)).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#8c8c9e] space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#16161e] border border-[#242432] flex items-center justify-center text-gray-500">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <p className="text-base font-medium text-gray-300">
                No synchronized lyrics loaded for this track
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Import a local <code>.lrc</code> file, drag and drop it here, or click "Edit LRC" to write and sync timestamps.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleStartEdit}
                className="px-4 py-2.5 bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 hover:bg-[#ff3e3e]/25 text-[#ff3e3e] rounded-xl text-xs font-bold font-mono tracking-wider transition active:scale-95"
              >
                + WRITE LYRICS
              </button>
              <label className="px-4 py-2.5 bg-[#16161e] hover:bg-[#202028] border border-[#282836] text-gray-300 hover:text-white rounded-xl text-xs font-mono font-medium cursor-pointer transition active:scale-95">
                <span>BROWSE .LRC</span>
                <input type="file" accept=".lrc,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
