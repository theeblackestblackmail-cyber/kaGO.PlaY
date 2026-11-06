import React from 'react';
import { useAudio } from '../context/AudioContext';
import { Play, Pause, SkipForward, SkipBack, Heart, Sliders, Disc, RotateCcw, RotateCw } from 'lucide-react';
import { haptic } from '../utils/haptics';

export const MiniPlayer: React.FC = () => {
  const {
    activeTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    skipRelative,
    toggleFavorite,
    setIsFullscreenPlayerOpen,
    setIsEQModalOpen,
    activeChannel,
  } = useAudio();

  if (!activeTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] md:bottom-4 left-0 right-0 z-30 px-2 sm:px-4 md:px-6 pointer-events-none transition-all">
      <div className="max-w-4xl 2xl:max-w-5xl mx-auto bg-black/60 backdrop-blur-3xl border border-white/15 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.75)] ring-1 ring-white/10 p-2 sm:p-3 pointer-events-auto flex flex-col gap-1 transition-all">
        {/* Interactive Seek Bar on Top */}
        <div className="w-full relative flex items-center group cursor-pointer -mt-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/15 accent-[#ff3e3e] rounded-full cursor-pointer hover:h-1.5 transition-all"
            aria-label="Seek track"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Thumbnail & Title (opens Fullscreen Player on click) */}
          <div
            onClick={() => setIsFullscreenPlayerOpen(true)}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0 flex-1 group"
          >
            {/* Spinning Disc / Thumbnail */}
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#1c1c24] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow">
              {activeTrack.thumbnail ? (
                <img
                  src={activeTrack.thumbnail}
                  alt={activeTrack.title}
                  className={`w-full h-full object-cover ${isPlaying ? 'animate-spin-vinyl' : 'animate-spin-vinyl-paused'}`}
                />
              ) : (
                <Disc className={`w-5 h-5 sm:w-6 sm:h-6 text-[#ff3e3e] ${isPlaying ? 'animate-spin-vinyl' : 'animate-spin-vinyl-paused'}`} />
              )}
              {/* Center red pin */}
              <div className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#ff3e3e] border border-white" />
            </div>

            {/* Title & Artist */}
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#ff3e3e] transition truncate">
                  {activeTrack.title}
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#ff3e3e]/20 text-[#ff3e3e] shrink-0">
                  CH{activeChannel}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#8c8c9e] truncate">
                {activeTrack.artist}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2 shrink-0">
            {/* Rewind 10s */}
            <button
              onClick={() => skipRelative(-10)}
              className="p-1.5 text-gray-400 hover:text-white transition hidden md:block"
              aria-label="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Prev Track */}
            <button
              onClick={prevTrack}
              className="p-1 sm:p-1.5 text-gray-300 hover:text-white transition"
              aria-label="Previous track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ff3e3e] hover:bg-[#e03030] text-white flex items-center justify-center shadow-md shadow-[#ff3e3e]/30 transition transform active:scale-95"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={nextTrack}
              className="p-1 sm:p-1.5 text-gray-300 hover:text-white transition"
              aria-label="Next track"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => skipRelative(10)}
              className="p-1.5 text-gray-400 hover:text-white transition hidden md:block"
              aria-label="Forward 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Favorite Toggle */}
            <button
              onClick={() => toggleFavorite(activeTrack.id)}
              className="p-1 sm:p-1.5 text-gray-400 hover:text-[#ff3e3e] transition"
              aria-label="Toggle Favorite"
            >
              <Heart
                className={`w-4 h-4 ${activeTrack.isFavorite ? 'fill-[#ff3e3e] text-[#ff3e3e]' : ''}`}
              />
            </button>

            {/* EQ Trigger */}
            <button
              onClick={() => setIsEQModalOpen(true)}
              className="p-1.5 text-gray-400 hover:text-[#ff3e3e] transition hidden sm:block"
              aria-label="Open Equalizer"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
