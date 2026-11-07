import React, { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { AudioVisualizerCanvas, VisualizerMode } from './AudioVisualizerCanvas';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Shuffle,
  Repeat,
  Heart,
  Sliders,
  Volume2,
  VolumeX,
  ExternalLink,
  ListMusic,
  FileText,
  Disc,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Radio,
} from 'lucide-react';
import { haptic } from '../utils/haptics';
import { parseLRC, getActiveLyricIndex } from '../utils/lrcParser';

export const FullscreenPlayer: React.FC = () => {
  const {
    isFullscreenPlayerOpen,
    setIsFullscreenPlayerOpen,
    activeTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    skipRelative,
    settings,
    updateSettingsState,
    toggleFavorite,
    setIsEQModalOpen,
    isStreamMode,
    youtubeVideoId,
    openYouTubeExternal,
    streamRecoveryNotice,
    queue,
    queueIndex,
    playTrack,
    activeChannel,
  } = useAudio();

  const [activeTab, setActiveTab] = useState<'visualizer' | 'lyrics' | 'queue' | 'dsp'>('visualizer');
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('turntable');

  const parsedLyrics = React.useMemo(() => parseLRC(activeTrack?.lyrics || ''), [activeTrack?.lyrics]);
  const activeLyricIdx = getActiveLyricIndex(parsedLyrics, currentTime, settings.lyricOffset);

  if (!isFullscreenPlayerOpen || !activeTrack) return null;

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const cycleRepeat = () => {
    haptic.eqTick();
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(settings.repeatMode) + 1) % modes.length];
    updateSettingsState({ repeatMode: nextMode });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c0e]/95 backdrop-blur-3xl flex flex-col text-[#f2efeb] animate-in slide-in-from-bottom duration-300 overflow-hidden">
      {/* Top Bar with Frosted Glass */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10 bg-black/40 backdrop-blur-2xl z-20">
        <button
          onClick={() => setIsFullscreenPlayerOpen(false)}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition active:scale-95"
          aria-label="Minimize Player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#ff3e3e] uppercase">
            kaGO.PIaY PRO ENGINE // CH{activeChannel} ACTIVE
          </span>
          <p className="text-xs font-mono text-[#8c8c9e] max-w-xs sm:max-w-md truncate">
            {activeTrack.album || 'Single Release'}
          </p>
        </div>

        <button
          onClick={() => setIsEQModalOpen(true)}
          className="p-2 text-gray-400 hover:text-[#ff3e3e] hover:bg-white/10 rounded-full transition active:scale-95"
          aria-label="Open Equalizer"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Navigation Tabs with Glass Pill Styling */}
      <div className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-black/30 backdrop-blur-xl border-b border-white/10 z-20 overflow-x-auto">
        <button
          onClick={() => setActiveTab('visualizer')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
            activeTab === 'visualizer'
              ? 'bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold shadow-[0_2px_12px_rgba(255,255,255,0.15)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Visualizer</span>
        </button>

        <button
          onClick={() => setActiveTab('lyrics')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
            activeTab === 'lyrics'
              ? 'bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold shadow-[0_2px_12px_rgba(255,255,255,0.15)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Lyrics</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
            activeTab === 'queue'
              ? 'bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold shadow-[0_2px_12px_rgba(255,255,255,0.15)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Queue ({queue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dsp')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
            activeTab === 'dsp'
              ? 'bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold shadow-[0_2px_12px_rgba(255,255,255,0.15)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>DSP Info</span>
        </button>
      </div>

      {/* Auto-Recovery Notice Banner */}
      {streamRecoveryNotice && (
        <div className="bg-[#ff3e3e]/20 border-b border-[#ff3e3e]/40 px-4 py-2 text-center text-xs font-mono text-[#ff8888] animate-pulse">
          {streamRecoveryNotice}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4">
        {/* TAB 1: VISUALIZER */}
        {activeTab === 'visualizer' && (
          <div className="w-full h-full flex flex-col items-center justify-between max-w-xl mx-auto">
            {/* Visualizer Mode Selector Chips */}
            <div className="flex items-center gap-1.5 bg-[#16161a] border border-[#242430] p-1 rounded-xl z-10 flex-wrap justify-center mb-2">
              <button
                onClick={() => setVisualizerMode('turntable')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition flex items-center gap-1 ${
                  visualizerMode === 'turntable' ? 'bg-[#ff3e3e] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Disc className="w-3 h-3" /> Turntable
              </button>
              <button
                onClick={() => setVisualizerMode('particles')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition flex items-center gap-1 ${
                  visualizerMode === 'particles' ? 'bg-[#ff3e3e] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" /> Particles
              </button>
              <button
                onClick={() => setVisualizerMode('geometry')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition flex items-center gap-1 ${
                  visualizerMode === 'geometry' ? 'bg-[#ff3e3e] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" /> Geometry
              </button>
              <button
                onClick={() => setVisualizerMode('strobe')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition flex items-center gap-1 ${
                  visualizerMode === 'strobe' ? 'bg-[#ff3e3e] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3" /> Strobe
              </button>
              <button
                onClick={() => setVisualizerMode('spectrum')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition flex items-center gap-1 ${
                  visualizerMode === 'spectrum' ? 'bg-[#ff3e3e] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Activity className="w-3 h-3" /> Spectrum
              </button>
            </div>

            {/* Canvas Surface */}
            <div className="flex-1 w-full flex items-center justify-center relative min-h-[220px]">
              <AudioVisualizerCanvas mode={visualizerMode} className="rounded-2xl" />
            </div>
          </div>
        )}

        {/* TAB 2: SYNCHRONIZED LYRICS */}
        {activeTab === 'lyrics' && (
          <div className="w-full h-full max-w-xl mx-auto overflow-y-auto py-6 px-4 text-center space-y-4">
            {parsedLyrics.length > 0 ? (
              parsedLyrics.map((l, idx) => {
                const isActive = idx === activeLyricIdx;
                return (
                  <p
                    key={idx}
                    onClick={() => seek(l.time)}
                    className={`cursor-pointer transition-all duration-200 select-none ${
                      isActive
                        ? 'text-[#ff3e3e] text-2xl font-extrabold font-brand tracking-wide drop-shadow-[0_0_15px_rgba(255,62,62,0.95)] crimson-text-glow scale-105'
                        : 'text-[#606074] hover:text-[#a0a0b8] text-base font-medium'
                    }`}
                  >
                    {l.text}
                  </p>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#8c8c9e]">
                <FileText className="w-10 h-10 mb-2 text-[#242430]" />
                <p className="text-sm">No synchronized lyrics loaded</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PLAYBACK QUEUE */}
        {activeTab === 'queue' && (
          <div className="w-full h-full max-w-xl mx-auto overflow-y-auto p-4 space-y-2">
            {queue.map((t, idx) => {
              const isCur = idx === queueIndex;
              return (
                <div
                  key={t.id}
                  onClick={() => playTrack(t)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                    isCur
                      ? 'bg-[#ff3e3e]/20 border border-[#ff3e3e]/40 text-white'
                      : 'bg-[#141418] hover:bg-[#1c1c22] border border-[#202028] text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-xs font-mono text-[#8c8c9e] w-5 text-right">{idx + 1}</span>
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate">{t.title}</p>
                      <p className="text-xs text-[#8c8c9e] truncate">{t.artist}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#202028] text-gray-400">
                    {t.format}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: DSP AUDIO ENGINE SPECS */}
        {activeTab === 'dsp' && (
          <div className="w-full h-full max-w-xl mx-auto p-4 space-y-4 text-xs font-mono">
            <div className="bg-[#141418] border border-[#242430] p-4 rounded-xl space-y-2">
              <h3 className="text-sm font-bold text-[#ff3e3e] uppercase">Active Engine Architecture</h3>
              <div className="grid grid-cols-2 gap-2 text-[#8c8c9e]">
                <div>Source Mode: <span className="text-white">{isStreamMode ? 'YouTube Iframe Stream' : 'Web Audio Dual-Channel'}</span></div>
                <div>Active Channel: <span className="text-[#ff3e3e] font-bold">Channel {activeChannel}</span></div>
                <div>Crossfade Time: <span className="text-white">{settings.crossfadeDuration}s</span></div>
                <div>Gapless Handoff: <span className="text-white">{settings.gaplessEnabled ? 'Active' : 'Off'}</span></div>
                <div>80Hz Bass Boost: <span className="text-white">{settings.bassBoostEnabled ? `+${settings.bassBoostGain}dB` : 'Bypassed'}</span></div>
                <div>Current EQ Preset: <span className="text-white">{settings.currentPreset}</span></div>
              </div>
            </div>

            <div className="bg-[#141418] border border-[#242430] p-4 rounded-xl space-y-2">
              <h3 className="text-sm font-bold text-[#ff3e3e] uppercase">5-Band Equalizer Frequency States</h3>
              <div className="grid grid-cols-5 gap-1 text-center">
                {['60Hz', '230Hz', '910Hz', '3.6k', '14k'].map((band, i) => (
                  <div key={band} className="bg-[#1e1e28] p-2 rounded">
                    <p className="text-[10px] text-gray-400">{band}</p>
                    <p className="text-xs font-bold text-[#ff3e3e]">
                      {settings.eqGains[i] > 0 ? `+${settings.eqGains[i]}` : settings.eqGains[i]}dB
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Track Meta & Controls Section with Frosted Glass Deck */}
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-6 pt-2 z-20">
        <div className="bg-black/50 backdrop-blur-3xl border border-white/15 rounded-3xl p-5 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.7)] ring-1 ring-white/10 space-y-4">
          {/* Track Title & Artist Info + Heart */}
          <div className="flex items-center justify-between">
          <div className="truncate pr-4">
            <h1 className="text-xl sm:text-2xl font-bold font-brand tracking-wide text-white truncate">
              {activeTrack.title}
            </h1>
            <p className="text-sm font-medium text-[#8c8c9e] truncate">
              {activeTrack.artist}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isStreamMode && youtubeVideoId && (
              <button
                onClick={openYouTubeExternal}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1a1a22] rounded-xl transition"
                title="Open on YouTube"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => toggleFavorite(activeTrack.id)}
              className="p-2 text-gray-400 hover:text-[#ff3e3e] rounded-xl transition"
              aria-label="Toggle Favorite"
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  activeTrack.isFavorite ? 'fill-[#ff3e3e] text-[#ff3e3e]' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Progress Bar & Seek Slider */}
        <div className="space-y-1">
          <div className="relative flex items-center group">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#202028] accent-[#ff3e3e] rounded-lg cursor-pointer"
              aria-label="Seek track"
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-[#8c8c9e]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls Row */}
        <div className="flex items-center justify-between pt-1">
          {/* Shuffle Toggle */}
          <button
            onClick={() => {
              haptic.eqTick();
              updateSettingsState({ shuffle: !settings.shuffle });
            }}
            className={`p-2 transition ${settings.shuffle ? 'text-[#ff3e3e]' : 'text-gray-400 hover:text-white'}`}
            aria-label="Toggle Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Rewind 10s */}
          <button
            onClick={() => skipRelative(-10)}
            className="p-2 text-gray-300 hover:text-white transition"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Previous Track */}
          <button
            onClick={prevTrack}
            className="p-2 text-gray-200 hover:text-white transition"
            aria-label="Previous Track"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          {/* Play / Pause Main Button */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-[#ff3e3e] hover:bg-[#e03030] text-white flex items-center justify-center shadow-lg shadow-[#ff3e3e]/40 transition transform active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-white" />
            ) : (
              <Play className="w-7 h-7 fill-white ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={nextTrack}
            className="p-2 text-gray-200 hover:text-white transition"
            aria-label="Next Track"
          >
            <SkipForward className="w-6 h-6" />
          </button>

          {/* Forward 10s */}
          <button
            onClick={() => skipRelative(10)}
            className="p-2 text-gray-300 hover:text-white transition"
            aria-label="Forward 10 seconds"
          >
            <RotateCw className="w-5 h-5" />
          </button>

          {/* Repeat Mode */}
          <button
            onClick={cycleRepeat}
            className={`p-2 transition relative ${
              settings.repeatMode !== 'off' ? 'text-[#ff3e3e]' : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Toggle Repeat Mode"
          >
            <Repeat className="w-5 h-5" />
            {settings.repeatMode === 'one' && (
              <span className="absolute top-1 right-1 text-[9px] font-bold font-mono">1</span>
            )}
          </button>
        </div>

          {/* Volume Slider Bar */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => updateSettingsState({ volume: settings.volume > 0 ? 0 : 0.8 })}
              className="text-gray-400 hover:text-white"
              aria-label="Mute toggle"
            >
              {settings.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.volume}
              onChange={(e) => updateSettingsState({ volume: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#202028] accent-[#ff3e3e] rounded cursor-pointer"
              aria-label="Volume slider"
            />
            <span className="text-[11px] font-mono text-[#8c8c9e] w-8 text-right">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
