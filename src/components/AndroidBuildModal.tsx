import React, { useState } from 'react';
import { Smartphone, Download, Github, CheckCircle2, QrCode, ExternalLink, X, Terminal, ShieldCheck } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface AndroidBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidBuildModal: React.FC<AndroidBuildModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-dqwkqwk3zcjddc7ahjcupl-998973352665.europe-west2.run.app';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#141418] border border-[#2a2a38] rounded-3xl p-6 sm:p-8 text-[#f2efeb] shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#202028]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 rounded-xl text-[#ff3e3e]">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-brand tracking-wider uppercase text-white">
                Install On Your Phone
              </h2>
              <p className="text-xs text-[#8c8c9e] font-mono mt-0.5">
                Native Android APK (Capacitor) & Instant WebAPK Package
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#202028] rounded-xl transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METHOD 1: Instant WebAPK Install (Fastest, zero wait) */}
        <div className="bg-[#181822] border border-[#ff3e3e]/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#ff3e3e] text-white flex items-center justify-center font-mono font-bold text-xs">
                1
              </span>
              <h3 className="text-sm font-bold font-brand text-white uppercase tracking-wider">
                Instant Android App Install (Recommended)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              ZERO SETUP
            </span>
          </div>

          <p className="text-xs text-[#8c8c9e] leading-relaxed">
            Because kaGO.PIaY is a certified PWA with Web App Manifest and Service Worker, modern Android Chrome creates and installs a real native signed APK directly onto your device:
          </p>

          <div className="bg-[#0c0c0e] border border-[#22222c] rounded-xl p-3.5 space-y-2 text-xs font-mono">
            <p className="text-gray-300">
              1. Open your app URL on your phone's browser (Chrome):
            </p>
            <div className="bg-[#16161e] p-2 rounded text-[#ff3e3e] text-[11px] select-all break-all">
              {appUrl}
            </div>
            <p className="text-gray-300">
              2. Tap the red <strong>"INSTALL APP"</strong> button in the top header, or tap Chrome menu (⋮) → <strong>"Install app"</strong>.
            </p>
            <p className="text-emerald-400">
              ✓ Installs the standalone kaGO.PIaY app icon with 100% offline playback and background audio!
            </p>
          </div>
        </div>

        {/* METHOD 2: GitHub Actions Automated APK Build */}
        <div className="bg-[#181822] border border-[#282836] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#2a2a38] text-white flex items-center justify-center font-mono font-bold text-xs">
                2
              </span>
              <h3 className="text-sm font-bold font-brand text-white uppercase tracking-wider">
                GitHub Actions Automated APK Builder
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff3e3e]/20 text-[#ff3e3e] font-bold">
              CI/CD READY
            </span>
          </div>

          <p className="text-xs text-[#8c8c9e] leading-relaxed">
            Your repository now contains a complete automated CI/CD workflow at <code className="text-[#ff3e3e]">.github/workflows/build-apk.yml</code> and full native Android source under <code className="text-[#ff3e3e]">/android</code>:
          </p>

          <div className="bg-[#0c0c0e] border border-[#22222c] rounded-xl p-3.5 space-y-2 text-xs font-mono text-gray-300">
            <div className="flex items-center gap-2 text-white">
              <Github className="w-4 h-4 text-[#ff3e3e]" />
              <span>How to download the APK from GitHub:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[#8c8c9e] pl-1">
              <li>Push your commits to your linked GitHub repository.</li>
              <li>Go to the <strong>"Actions"</strong> tab on your GitHub repo.</li>
              <li>Click on the workflow <strong>"Build Android APK (kaGO.PIaY)"</strong>.</li>
              <li>Under <strong>Artifacts</strong>, click <strong>"kaGO-PIaY-debug-apk"</strong> to download the APK file directly to your phone or computer!</li>
            </ol>
          </div>
        </div>

        {/* METHOD 3: Android Studio Local Compile */}
        <div className="bg-[#181822] border border-[#282836] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#2a2a38] text-white flex items-center justify-center font-mono font-bold text-xs">
              3
            </span>
            <h3 className="text-sm font-bold font-brand text-white uppercase tracking-wider">
              Compile Locally in Android Studio
            </h3>
          </div>

          <p className="text-xs text-[#8c8c9e] leading-relaxed">
            You can clone your repo and open the generated <code className="text-[#ff3e3e]">/android</code> directory in Android Studio:
          </p>

          <div className="bg-[#0c0c0e] border border-[#22222c] rounded-xl p-3 text-xs font-mono text-[#8c8c9e]">
            <p className="text-white">$ npx cap open android</p>
            <p className="text-gray-400 mt-1">Or run in terminal: <code className="text-emerald-400">cd android &amp;&amp; ./gradlew assembleDebug</code></p>
            <p className="text-gray-500 mt-1">Output APK: <code className="text-white">android/app/build/outputs/apk/debug/app-debug.apk</code></p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#202028]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#ff3e3e] hover:bg-[#e03030] text-white font-mono text-xs font-bold rounded-xl transition shadow"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
