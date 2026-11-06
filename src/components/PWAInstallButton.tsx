import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstallClick = async () => {
    haptic.eqTick();
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback instructions
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff3e3e]/20 hover:bg-[#ff3e3e]/30 border border-[#ff3e3e]/50 text-[#ff3e3e] hover:text-white rounded-lg text-xs font-mono font-bold tracking-wider transition shadow-sm"
        title="Install kaGO.PIaY PWA to your device"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">INSTALL APP</span>
        <span className="xs:hidden">INSTALL</span>
      </button>

      {/* Guided Modal for iOS Safari / Manual Installation */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm bg-[#16161a] border border-[#2a2a38] rounded-2xl p-6 text-[#f2efeb] shadow-2xl">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white rounded-lg"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Download className="w-5 h-5 text-[#ff3e3e]" />
              <h3 className="text-base font-bold font-brand tracking-wider uppercase">
                Install kaGO.PIaY
              </h3>
            </div>

            <p className="text-xs text-[#8c8c9e] mb-4">
              Install kaGO.PIaY onto your home screen for full offline audio playback, background controls, and standalone window experience:
            </p>

            <div className="space-y-3 bg-[#0c0c0e] p-3.5 rounded-xl border border-[#202028] text-xs">
              <div className="flex items-start gap-2.5">
                <Share2 className="w-4 h-4 text-[#ff3e3e] shrink-0 mt-0.5" />
                <span>1. Tap the <strong>Share</strong> button in your browser toolbar.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <PlusSquare className="w-4 h-4 text-[#ff3e3e] shrink-0 mt-0.5" />
                <span>2. Select <strong>"Add to Home Screen"</strong> or <strong>"Install Application"</strong>.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white text-xs font-bold font-mono tracking-wider rounded-xl transition"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  );
};
