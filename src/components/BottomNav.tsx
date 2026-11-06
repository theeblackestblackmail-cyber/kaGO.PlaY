import React from 'react';
import { useAudio } from '../context/AudioContext';
import { ViewType } from '../types/audio';
import { LayoutDashboard, Radio, Library, FileText, FolderDown } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'stream', label: 'Streams', icon: Radio },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'lyrics', label: 'Lyrics', icon: FileText },
  { id: 'import', label: 'Scanner', icon: FolderDown },
];

export const BottomNav: React.FC = () => {
  const { currentView, setCurrentView } = useAudio();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-md border-t border-[#1c1c24] pb-safe sm:hidden">
      <div className="grid grid-cols-5 h-14 items-center">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                haptic.eqTick();
                setCurrentView(item.id);
              }}
              className={`flex flex-col items-center justify-center h-full transition ${
                isActive ? 'text-[#ff3e3e]' : 'text-[#707084] hover:text-[#b0b0c2]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-mono mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
