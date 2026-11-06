import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { Sliders, Wifi, WifiOff } from 'lucide-react';
import { haptic } from '../utils/haptics';

export const Navbar: React.FC = () => {
  const { isPlaying, setIsEQModalOpen, setCurrentView, activeChannel } = useAudio();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 py-3 transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div
          onClick={() => {
            haptic.eqTick();
            setCurrentView('dashboard');
          }}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          {/* Logo Badge */}
          <div className="relative w-8 h-8 rounded-xl bg-black/50 border border-[#ff3e3e]/60 backdrop-blur-xl flex items-center justify-center shadow-lg shadow-[#ff3e3e]/20 group-hover:border-[#ff3e3e] transition">
            <svg viewBox="0 0 100 100" className="w-5 h-5">
              <polygon points="30,20 80,50 30,80" fill="#ff3e3e" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-brand font-black text-lg tracking-wider text-[#f2efeb]">
                kaGO<span className="text-[#ff3e3e]">.</span>PIaY
              </span>
              <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#ff3e3e]/15 border border-[#ff3e3e]/30 text-[#ff3e3e] font-bold">
                PRO AUDIO
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#8c8c9e] hidden md:block">
              Offline Audio Engine & Free Music Streamer
            </p>
          </div>
        </div>

        {/* Audio Engine Status Badge */}
        <div className="hidden lg:flex items-center gap-2 bg-white/[0.04] backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-mono shadow-inner">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#ff3e3e] animate-ping' : 'bg-gray-500'}`} />
            <span className="text-[#a0a0b8]">DSP Engine:</span>
            <span className="font-bold text-white">CH{activeChannel}</span>
          </div>
          <span className="text-gray-600">|</span>
          <span className="text-[#a0a0b8]">44.1kHz</span>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-1">
            {isOnline ? (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <Wifi className="w-3 h-3" /> ONLINE
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                <WifiOff className="w-3 h-3" /> OFFLINE
              </span>
            )}
          </div>
        </div>

        {/* Actions Right */}
        <div className="flex items-center gap-2">
          {/* Equalizer Quick Button with Glass Effect */}
          <button
            onClick={() => {
              haptic.eqTick();
              setIsEQModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 hover:border-[#ff3e3e]/60 rounded-full text-xs font-mono text-gray-200 hover:text-white transition backdrop-blur-xl shadow-sm active:scale-95"
            aria-label="Open 5-Band Equalizer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#ff3e3e]" />
            <span className="hidden sm:inline font-bold">EQ & BASS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
