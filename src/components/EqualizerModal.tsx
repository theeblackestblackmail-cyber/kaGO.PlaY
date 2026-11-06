import React from 'react';
import { useAudio } from '../context/AudioContext';
import { EQ_FREQUENCIES, EQ_PRESETS, clampGain } from '../utils/equalizerPresets';
import { X, Sliders, Zap, Repeat, Volume2 } from 'lucide-react';
import { haptic } from '../utils/haptics';

export const EqualizerModal: React.FC = () => {
  const { isEQModalOpen, setIsEQModalOpen, settings, updateSettingsState } = useAudio();

  if (!isEQModalOpen) return null;

  const handleBandChange = (index: number, val: number) => {
    haptic.eqTick();
    const newGains = [...settings.eqGains] as [number, number, number, number, number];
    newGains[index] = clampGain(val);
    updateSettingsState({ eqGains: newGains, currentPreset: 'Custom' });
  };

  const handleSelectPreset = (presetName: string) => {
    haptic.eqTick();
    const p = EQ_PRESETS.find(pr => pr.name === presetName);
    if (p) {
      updateSettingsState({
        eqGains: [...p.gains],
        currentPreset: p.name,
      });
    }
  };

  const handleBassToggle = () => {
    haptic.eqTick();
    updateSettingsState({ bassBoostEnabled: !settings.bassBoostEnabled });
  };

  const handleBassGainChange = (val: number) => {
    haptic.eqTick();
    updateSettingsState({ bassBoostGain: Math.max(0, Math.min(14, val)) });
  };

  const handleCrossfadeChange = (val: number) => {
    haptic.eqTick();
    updateSettingsState({ crossfadeDuration: Math.max(0, Math.min(12, val)) });
  };

  const handleGaplessToggle = () => {
    haptic.eqTick();
    updateSettingsState({ gaplessEnabled: !settings.gaplessEnabled });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-black/75 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.8)] ring-1 ring-white/10 p-5 sm:p-7 overflow-hidden text-[#f2efeb] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#202026]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 rounded-lg">
              <Sliders className="w-5 h-5 text-[#ff3e3e]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-brand tracking-wider">
                5-BAND EQUALIZER & DSP
              </h2>
              <p className="text-xs text-[#8c8c9e] font-mono">
                Hardware-Grade Biquad Filter Curve & Bass Sub-System
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEQModalOpen(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#202028] rounded-lg transition"
            aria-label="Close Equalizer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
          {/* Preset Buttons Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-[#8c8c9e] uppercase tracking-wider">
                Acoustic Presets
              </span>
              <span className="text-xs font-mono text-[#ff3e3e] font-bold">
                [{settings.currentPreset}]
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {EQ_PRESETS.map((preset) => {
                const isSelected = settings.currentPreset === preset.name;
                return (
                  <button
                    key={preset.name}
                    onClick={() => handleSelectPreset(preset.name)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium font-mono transition text-center truncate ${
                      isSelected
                        ? 'bg-[#ff3e3e] text-white shadow-lg shadow-[#ff3e3e]/30 font-bold'
                        : 'bg-[#181820] hover:bg-[#22222c] text-[#a0a0b2] border border-[#242430]'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5-Band Vertical Faders */}
          <div className="bg-[#0c0c0e] border border-[#202028] rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-[#8c8c9e] uppercase">
                Biquad Peaking / Shelving Faders (-12dB to +12dB)
              </span>
              <button
                onClick={() => handleSelectPreset('Flat')}
                className="text-[11px] font-mono text-[#ff3e3e] hover:underline"
              >
                Reset to Flat
              </button>
            </div>

            <div className="grid grid-cols-5 gap-3 sm:gap-6 items-end justify-items-center h-52 pt-2">
              {EQ_FREQUENCIES.map((freq, idx) => {
                const gain = settings.eqGains[idx] ?? 0;
                const freqLabel = freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`;

                return (
                  <div key={freq} className="flex flex-col items-center h-full justify-between w-full">
                    {/* Gain Value readout */}
                    <span className="text-[11px] font-mono font-bold text-[#f2efeb]">
                      {gain > 0 ? `+${gain.toFixed(0)}` : gain.toFixed(0)}dB
                    </span>

                    {/* Vertical Range Slider */}
                    <div className="relative flex-1 flex items-center justify-center my-2 w-full">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={gain}
                        onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                        className="h-36 w-2 accent-[#ff3e3e] cursor-pointer appearance-none bg-[#202028] rounded-full [writing-mode:vertical-lr] [direction:rtl]"
                        aria-label={`Gain for ${freqLabel}`}
                      />
                    </div>

                    {/* Frequency Band Label */}
                    <span className="text-[11px] font-mono text-[#8c8c9e] mt-1 font-semibold">
                      {freqLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 80Hz Low-Shelf Bass Boost & Crossfade Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bass Boost Card */}
            <div className="bg-[#0c0c0e] border border-[#202028] rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ff3e3e]" />
                  <span className="text-xs font-bold font-brand tracking-wider">
                    80Hz BASS BOOST
                  </span>
                </div>
                <button
                  onClick={handleBassToggle}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    settings.bassBoostEnabled ? 'bg-[#ff3e3e]' : 'bg-[#252530]'
                  }`}
                  aria-label="Toggle Bass Boost"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.bassBoostEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-[11px] text-[#8c8c9e] mb-3">
                Hardware resonant low-shelf analog filter boost for sub-frequencies.
              </p>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-[#8c8c9e]">Boost Amount:</span>
                  <span className="font-bold text-[#ff3e3e]">+{settings.bassBoostGain}dB</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="1"
                  value={settings.bassBoostGain}
                  disabled={!settings.bassBoostEnabled}
                  onChange={(e) => handleBassGainChange(parseInt(e.target.value, 10))}
                  className="w-full accent-[#ff3e3e] cursor-pointer disabled:opacity-40"
                  aria-label="Bass boost gain fader"
                />
              </div>
            </div>

            {/* Crossfade & Gapless Card */}
            <div className="bg-[#0c0c0e] border border-[#202028] rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-[#ff3e3e]" />
                  <span className="text-xs font-bold font-brand tracking-wider">
                    SEAMLESS CROSSFADE
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[#ff3e3e]">
                  {settings.crossfadeDuration}s
                </span>
              </div>

              <p className="text-[11px] text-[#8c8c9e] mb-3">
                Dual-channel linear gain ramping between consecutive tracks.
              </p>

              <div className="space-y-3">
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={settings.crossfadeDuration}
                  onChange={(e) => handleCrossfadeChange(parseInt(e.target.value, 10))}
                  className="w-full accent-[#ff3e3e] cursor-pointer"
                  aria-label="Crossfade duration slider"
                />

                <div className="flex items-center justify-between pt-1 border-t border-[#1e1e26]">
                  <span className="text-xs text-[#8c8c9e] font-mono">Gapless Audio Handoff</span>
                  <button
                    onClick={handleGaplessToggle}
                    className={`text-xs font-mono px-2 py-0.5 rounded font-bold transition ${
                      settings.gaplessEnabled ? 'bg-[#ff3e3e]/20 text-[#ff3e3e]' : 'bg-[#202028] text-gray-400'
                    }`}
                  >
                    {settings.gaplessEnabled ? 'ENABLED' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#202026] flex justify-end">
          <button
            onClick={() => setIsEQModalOpen(false)}
            className="px-5 py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white text-xs font-bold font-mono tracking-wider rounded-lg transition"
          >
            APPLY & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
