import React from 'react';
import { useAudio } from '../../context/AudioContext';
import { Play, Pause, Disc, Zap, Sliders, FolderDown, Radio, Activity, Music, Clock, Database, CheckCircle2 } from 'lucide-react';
import { haptic } from '../../utils/haptics';

export const DashboardView: React.FC = () => {
  const {
    tracks,
    activeTrack,
    isPlaying,
    playTrack,
    togglePlay,
    setCurrentView,
    setIsEQModalOpen,
    activeChannel,
    settings,
  } = useAudio();

  const featuredTrack = activeTrack || tracks[0] || null;

  // Calculate quick stats
  const totalSongs = tracks.length;
  const totalSeconds = tracks.reduce((acc, t) => acc + (t.duration || 180), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const offlineCachedCount = tracks.filter(t => t.blob || t.format !== 'STREAM').length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-32">
      {/* 1. HERO BANNER & FEATURED TRACK */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#1c1c24] via-[#121216] to-[#0c0c0e] border border-[#2a2a38] p-6 sm:p-8 overflow-hidden shadow-2xl">
        {/* Ambient Crimson Glow Backdrop */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#ff3e3e]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#ff3e3e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ff3e3e]/20 border border-[#ff3e3e]/40 text-[#ff3e3e] text-[10px] font-mono font-bold tracking-widest uppercase">
                CYBERPUNK AUDIO ENGINE
              </span>
              <span className="text-xs font-mono text-gray-400">
                // DUAL DSP CH{activeChannel}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold font-brand tracking-tight text-white leading-tight">
              {featuredTrack ? featuredTrack.title : 'kaGO.PIaY Engine'}
            </h1>

            <p className="text-sm sm:text-base font-medium text-[#8c8c9e]">
              {featuredTrack ? `By ${featuredTrack.artist} • ${featuredTrack.album || 'Featured Audio'}` : 'Offline-first pro audio player and free music streamer.'}
            </p>

            {/* Quick Play & Action Buttons */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              {featuredTrack && (
                <button
                  onClick={() => {
                    if (activeTrack && activeTrack.id === featuredTrack.id) {
                      togglePlay();
                    } else {
                      playTrack(featuredTrack);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#ff3e3e] hover:bg-[#e03030] text-white font-mono text-xs font-bold tracking-wider rounded-xl shadow-lg shadow-[#ff3e3e]/30 transition transform active:scale-95"
                >
                  {isPlaying && activeTrack?.id === featuredTrack.id ? (
                    <>
                      <Pause className="w-4 h-4 fill-white" />
                      <span>PAUSE TRACK</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>QUICK PLAY</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  haptic.eqTick();
                  setCurrentView('library');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a22] hover:bg-[#242430] border border-[#2a2a38] text-gray-300 hover:text-white font-mono text-xs font-medium rounded-xl transition"
              >
                <Music className="w-4 h-4 text-[#ff3e3e]" />
                <span>ALL TRACKS ({tracks.length})</span>
              </button>
            </div>
          </div>

          {/* Turntable Artwork Disc */}
          <div className="shrink-0 flex items-center justify-center self-center md:self-auto">
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#16161c] border-2 border-[#ff3e3e]/40 shadow-2xl flex items-center justify-center p-2">
              {/* Concentric rings */}
              <div className="absolute inset-4 rounded-full border border-[#282834]" />
              <div className="absolute inset-8 rounded-full border border-[#ff3e3e]/20" />
              <div
                className={`w-full h-full rounded-full flex items-center justify-center ${
                  isPlaying ? 'animate-spin-vinyl' : 'animate-spin-vinyl-paused'
                }`}
              >
                <Disc className="w-20 h-20 text-[#ff3e3e]/80" />
              </div>
              <div className="absolute w-6 h-6 rounded-full bg-[#ff3e3e] border-2 border-white shadow" />
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-[#242430] text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1c1c24] rounded-lg text-[#ff3e3e]">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[#8c8c9e]">Total Songs</p>
              <p className="font-bold text-white text-sm">{totalSongs}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1c1c24] rounded-lg text-[#ff3e3e]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[#8c8c9e]">Runtime</p>
              <p className="font-bold text-white text-sm">{totalHours}h Audio</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1c1c24] rounded-lg text-[#ff3e3e]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[#8c8c9e]">Local Cached</p>
              <p className="font-bold text-white text-sm">{offlineCachedCount} Files</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1c1c24] rounded-lg text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[#8c8c9e]">DSP Status</p>
              <p className="font-bold text-emerald-400 text-sm">Hardware Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. QUICK LAUNCH ACTION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Direct Offline Play */}
        <div
          onClick={() => {
            haptic.eqTick();
            setCurrentView('library');
          }}
          className="group cursor-pointer rounded-2xl bg-[#141418] border border-[#242430] hover:border-[#ff3e3e] p-5 transition flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#ff3e3e]/15 text-[#ff3e3e] rounded-xl group-hover:scale-110 transition">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-[#ff3e3e] uppercase">
              100% OFFLINE
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold font-brand text-white group-hover:text-[#ff3e3e] transition">
              Direct Offline Play
            </h3>
            <p className="text-xs text-[#8c8c9e] mt-1">
              Play local files directly from device storage without internet access.
            </p>
          </div>
        </div>

        {/* Card 2: 5-Band Equalizer & Bass */}
        <div
          onClick={() => {
            haptic.eqTick();
            setIsEQModalOpen(true);
          }}
          className="group cursor-pointer rounded-2xl bg-[#141418] border border-[#242430] hover:border-[#ff3e3e] p-5 transition flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#ff3e3e]/15 text-[#ff3e3e] rounded-xl group-hover:scale-110 transition">
              <Sliders className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-[#ff3e3e] uppercase">
              {settings.currentPreset}
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold font-brand text-white group-hover:text-[#ff3e3e] transition">
              Equalizer & Bass Boost
            </h3>
            <p className="text-xs text-[#8c8c9e] mt-1">
              Fine-tune 5 acoustic frequency bands, 80Hz bass boost, and crossfade timing.
            </p>
          </div>
        </div>

        {/* Card 3: Batch Music Folders Scanner */}
        <div
          onClick={() => {
            haptic.eqTick();
            setCurrentView('import');
          }}
          className="group cursor-pointer rounded-2xl bg-[#141418] border border-[#242430] hover:border-[#ff3e3e] p-5 transition flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#ff3e3e]/15 text-[#ff3e3e] rounded-xl group-hover:scale-110 transition">
              <FolderDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-[#ff3e3e] uppercase">
              LOCAL BATCH TOOL
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold font-brand text-white group-hover:text-[#ff3e3e] transition">
              Device Folder Scanner
            </h3>
            <p className="text-xs text-[#8c8c9e] mt-1">
              Import entire music folders with automatic ID3 tag cleaning and mojibake sanitizer.
            </p>
          </div>
        </div>
      </div>

      {/* 3. RECENT TRACKS & QUICK DISCOVERY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-brand tracking-wider uppercase text-white">
            Audio Queue & Stems
          </h2>
          <button
            onClick={() => setCurrentView('library')}
            className="text-xs font-mono text-[#ff3e3e] hover:underline"
          >
            VIEW ALL ({tracks.length}) →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tracks.slice(0, 8).map((track) => {
            const isCur = activeTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className={`group p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                  isCur
                    ? 'bg-[#ff3e3e]/15 border-[#ff3e3e] shadow-lg shadow-[#ff3e3e]/20'
                    : 'bg-[#141418] border-[#22222c] hover:border-[#ff3e3e]/60 hover:bg-[#1a1a22]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="relative w-10 h-10 rounded-xl bg-[#1e1e28] flex items-center justify-center shrink-0 overflow-hidden">
                    {track.thumbnail ? (
                      <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <Disc className="w-5 h-5 text-[#ff3e3e]" />
                    )}
                    {isCur && isPlaying && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-[#ff3e3e] animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white group-hover:text-[#ff3e3e] transition truncate">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-[#8c8c9e] truncate">
                      {track.artist}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#20202a] text-gray-400">
                    {track.format}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
