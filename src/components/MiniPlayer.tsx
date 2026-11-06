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
    <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-30 px-3 sm:px-6 pb-2 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-[#141418]/95 backdrop-blur-xl border border-[#262634] rounded-2xl shadow-2xl p-2.5 sm:p-3 pointer-events-auto flex flex-col gap-1.5 transition-all">
        {/* Interactive Seek Bar on Top */}
        <div className="w-full relative flex items-center group cursor-pointer -mt-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#242430] accent-[#ff3e3e] rounded-full cursor-pointer"
            aria-label="Seek track"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Left: Thumbnail & Title (opens Fullscreen Player on click) */}
          <div
            onClick={() => setIsFullscreenPlayerOpen(true)}
            className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 group"
          >
            {/* Spinning Disc / Thumbnail */}
            <div className="relative w-11 h-11 rounded-xl bg-[#1c1c24] border border-[#2a2a38] flex items-center justify-center shrink-0 overflow-hidden shadow">
              {activeTrack.thumbnail ? (
                <img
                  src={activeTrack.thumbnail}
                  alt={activeTrack.title}
                  className={`w-full h-full object-cover ${isPlaying ? 'animate-spin-vinyl' : 'animate-spin-vinyl-paused'}`}
                />
              ) : (
                <Disc className={`w-6 h-6 text-[#ff3e3e] ${isPlaying ? 'animate-spin-vinyl' : 'animate-spin-vinyl-paused'}`} />
              )}
              {/* Center red pin */}
              <div className="absolute w-2 h-2 rounded-full bg-[#ff3e3e] border border-white" />
            </div>

            {/* Title & Artist */}
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white group-hover:text-[#ff3e3e] transition truncate">
                  {activeTrack.title}
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#ff3e3e]/20 text-[#ff3e3e]">
                  CH{activeChannel}
                </span>
              </div>
              <p className="text-[11px] text-[#8c8c9e] truncate">
                {activeTrack.artist}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Rewind 10s */}
            <button
              onClick={() => skipRelative(-10)}
              className="p-1.5 text-gray-400 hover:text-white transition hidden xs:block"
              aria-label="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Prev Track */}
            <button
              onClick={prevTrack}
              className="p-1.5 text-gray-400 hover:text-white transition"
              aria-label="Previous track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[#ff3e3e] hover:bg-[#e03030] text-white flex items-center justify-center shadow-md shadow-[#ff3e3e]/30 transition transform active:scale-95"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={nextTrack}
              className="p-1.5 text-gray-400 hover:text-white transition"
              aria-label="Next track"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => skipRelative(10)}
              className="p-1.5 text-gray-400 hover:text-white transition hidden xs:block"
              aria-label="Forward 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Favorite Toggle */}
            <button
              onClick={() => toggleFavorite(activeTrack.id)}
              className="p-1.5 text-gray-400 hover:text-[#ff3e3e] transition"
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
