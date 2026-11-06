import React from 'react';
import { AudioProvider, useAudio } from './context/AudioContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullscreenPlayer } from './components/FullscreenPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { DashboardView } from './components/views/DashboardView';
import { StreamView } from './components/views/StreamView';
import { LibraryView } from './components/views/LibraryView';
import { LyricsView } from './components/views/LyricsView';
import { ImportView } from './components/views/ImportView';
import {
  LayoutDashboard,
  Radio,
  Library,
  FileText,
  FolderDown,
  WifiOff,
} from 'lucide-react';
import { haptic } from './utils/haptics';

const AppContent: React.FC = () => {
  const { currentView, setCurrentView } = useAudio();
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'stream', label: 'Stream', icon: Radio },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'lyrics', label: 'Sync Lyrics', icon: FileText },
    { id: 'import', label: 'Folder Scanner', icon: FolderDown },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#f2efeb] flex flex-col selection:bg-[#ff3e3e]/30 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Viewport Container */}
      <div className="flex-1 max-w-7xl 2xl:max-w-[1536px] w-full mx-auto px-3 sm:px-6 pt-3 sm:pt-6 flex gap-4 lg:gap-6">
        {/* Desktop & Tablet Landscape Sidebar Navigation with Frosted Glass */}
        <aside className="hidden md:flex flex-col w-52 lg:w-60 shrink-0 space-y-1.5 p-3 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl h-fit sticky top-20">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#ff3e3e] uppercase px-3 py-1">
            NAVIGATION
          </span>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  haptic.eqTick();
                  setCurrentView(item.id);
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold transition text-left ${
                  isActive
                    ? 'bg-[#ff3e3e] text-white shadow-lg shadow-[#ff3e3e]/25'
                    : 'text-[#8c8c9e] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Quick Hardware Spec Box */}
          <div className="pt-4 mt-4 border-t border-white/10 px-2 space-y-1.5 text-[10px] font-mono text-[#606074]">
            <p className="text-[#a0a0b8] font-bold">SYSTEM SPECS</p>
            <p>Engine: Web Audio 2.0</p>
            <p>Channels: 2 (Dual DSP)</p>
            <p>Bass: 80Hz Low-Shelf</p>
            <p>EQ: 5-Band Biquad</p>
            <p>Background: Active Wake Lock</p>
          </div>
        </aside>

        {/* View Content Area */}
        <main className="flex-1 min-w-0 pb-40 sm:pb-28">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'stream' && <StreamView />}
          {currentView === 'library' && <LibraryView />}
          {currentView === 'lyrics' && <LyricsView />}
          {currentView === 'import' && <ImportView />}
        </main>
      </div>

      {/* Offline Connectivity Toast */}
      {!isOnline && (
        <div className="fixed bottom-24 sm:bottom-20 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs shadow-xl animate-bounce">
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode Active • Playing local cached audio</span>
        </div>
      )}

      {/* Floating Mini Player */}
      <MiniPlayer />

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Fullscreen Vinyl & Visualizer Player Modal */}
      <FullscreenPlayer />

      {/* 5-Band Equalizer & Bass Modal */}
      <EqualizerModal />
    </div>
  );
};

export default function App() {
  return (
    <AudioProvider>
      <AppContent />
    </AudioProvider>
  );
}
