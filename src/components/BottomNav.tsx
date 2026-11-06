import React from 'react';
import { useAudio } from '../context/AudioContext';
import { ViewType } from '../types/audio';
import { Home, Radio, Library, Search } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface PrimaryNavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'stream', label: 'Stream', icon: Radio },
  { id: 'library', label: 'Library', icon: Library },
];

export const BottomNav: React.FC = () => {
  const { currentView, setCurrentView } = useAudio();

  const isSearchActive = currentView === 'stream';

  return (
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center gap-1.5 sm:gap-2.5 max-w-[98vw] pointer-events-auto select-none md:hidden">
      {/* Floating Liquid Glass Navigation Capsule */}
      <div className="flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-full bg-black/50 backdrop-blur-3xl border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.7)] ring-1 ring-white/10 transition-all">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                haptic.eqTick();
                setCurrentView(item.id);
              }}
              className={`flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-[0_2px_14px_rgba(255,255,255,0.18)] scale-[1.02]'
                  : 'text-white/65 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.5)]' : ''}`} />
              <span className={`text-[11px] sm:text-xs font-sans tracking-tight ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating Circular Frosted Glass Search Button */}
      <button
        onClick={() => {
          haptic.eqTick();
          setCurrentView('stream');
          setTimeout(() => {
            const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement | null;
            input?.focus();
          }, 100);
        }}
        aria-label="Search and stream music"
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-3xl border shrink-0 ${
          isSearchActive
            ? 'bg-[#ff3e3e]/30 border-[#ff3e3e]/60 text-white ring-2 ring-[#ff3e3e]/50 shadow-[0_0_24px_rgba(255,62,62,0.4)] scale-[1.04]'
            : 'bg-black/50 text-white/80 hover:text-white hover:bg-white/10 border-white/20 ring-1 ring-white/10'
        }`}
      >
        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow" />
      </button>
    </nav>
  );
};
