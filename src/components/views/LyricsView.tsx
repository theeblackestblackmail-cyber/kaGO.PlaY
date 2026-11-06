import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import { parseLRC, getActiveLyricIndex } from '../../utils/lrcParser';
import { Clock, Edit3, Upload, Check, Music2, Sliders } from 'lucide-react';
import { haptic } from '../../utils/haptics';

export const LyricsView: React.FC = () => {
  const { activeTrack, currentTime, seek, settings, updateSettingsState, editTrackMeta } = useAudio();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
  };

  const handleStartEdit = () => {
    haptic.eqTick();
    setEditText(rawLyrics);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    haptic.eqTick();
    if (activeTrack) {
      await editTrackMeta(activeTrack.id, { lyrics: editText });
    }
    setIsEditing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content && activeTrack) {
        await editTrackMeta(activeTrack.id, { lyrics: content });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e] text-[#f2efeb] p-4 sm:p-6 pb-28">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#202026]">
        <div>
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-[#ff3e3e]" />
            <h2 className="text-xl sm:text-2xl font-bold font-brand tracking-wider uppercase">
              Synchronized Lyrics
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#8c8c9e] mt-0.5 truncate max-w-md">
            {activeTrack ? `${activeTrack.title} — ${activeTrack.artist}` : 'No active track playing'}
          </p>
        </div>

        {/* Timing Calibration & Tools */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#16161a] border border-[#262632] px-3 py-1.5 rounded-lg text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-[#ff3e3e]" />
            <span>Offset:</span>
            <button
              onClick={() => handleOffsetChange(settings.lyricOffset - 0.1)}
              className="px-1.5 py-0.5 bg-[#202028] hover:bg-[#ff3e3e] hover:text-white rounded transition text-xs font-bold"
              title="Minus 0.1s"
            >
              -0.1s
            </button>
            <span className={`w-12 text-center font-bold ${settings.lyricOffset !== 0 ? 'text-[#ff3e3e]' : 'text-gray-300'}`}>
              {settings.lyricOffset > 0 ? `+${settings.lyricOffset.toFixed(1)}s` : `${settings.lyricOffset.toFixed(1)}s`}
            </span>
            <button
              onClick={() => handleOffsetChange(settings.lyricOffset + 0.1)}
              className="px-1.5 py-0.5 bg-[#202028] hover:bg-[#ff3e3e] hover:text-white rounded transition text-xs font-bold"
              title="Plus 0.1s"
            >
              +0.1s
            </button>
          </div>

          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16161a] hover:bg-[#202028] border border-[#262632] hover:border-[#ff3e3e] text-xs font-medium rounded-lg transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#ff3e3e]" />
              <span>Edit LRC</span>
            </button>
          ) : (
            <button
              onClick={handleSaveEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff3e3e] hover:bg-[#e03030] text-white text-xs font-bold rounded-lg transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          )}

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16161a] hover:bg-[#202028] border border-[#262632] hover:border-[#ff3e3e] text-xs font-medium rounded-lg cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-[#ff3e3e]" />
            <span>Import .LRC</span>
            <input type="file" accept=".lrc,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Lyrics Display Area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto py-8 px-2 max-w-3xl mx-auto w-full">
        {isEditing ? (
          <div className="space-y-3">
            <p className="text-xs text-[#8c8c9e]">
              Enter standard timestamped lyrics lines like <code className="text-[#ff3e3e]">[01:23.45] lyric text</code>
            </p>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full h-96 bg-[#16161a] border border-[#262632] focus:border-[#ff3e3e] rounded-xl p-4 font-mono text-sm text-[#f2efeb] outline-none resize-none leading-relaxed"
              placeholder="[00:05.00] Enter lyrics here..."
            />
          </div>
        ) : parsedLyrics.length > 0 ? (
          <div className="space-y-6 text-center">
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
                  className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-lg group select-none ${
                    isActive
                      ? 'text-white text-2xl sm:text-3xl font-bold font-brand tracking-wide crimson-text-glow scale-105'
                      : 'text-[#5a5a6e] hover:text-[#b4b4c8] text-base sm:text-lg font-medium'
                  }`}
                >
                  <p className="leading-snug">{line.text || '♪ ♪ ♪'}</p>
                  <span className="text-[10px] font-mono text-transparent group-hover:text-[#ff3e3e] mt-0.5 block transition-colors">
                    Jump to {Math.floor(line.time / 60)}:{String(Math.floor(line.time % 60)).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#8c8c9e] space-y-4">
            <Music2 className="w-12 h-12 text-[#262632]" />
            <div>
              <p className="text-base font-medium text-gray-300">No synchronized lyrics available for this track</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Import a local .lrc file or click "Edit LRC" above to synchronize timestamps with playback.
              </p>
            </div>
            <button
              onClick={handleStartEdit}
              className="px-4 py-2 bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 hover:bg-[#ff3e3e]/25 text-[#ff3e3e] rounded-lg text-xs font-bold font-mono tracking-wider transition"
            >
              + ADD LYRICS NOW
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
