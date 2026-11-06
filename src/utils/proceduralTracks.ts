import { Track } from '../types/audio';
import { audioBufferToWav } from './audioBufferToWav';

interface ProceduralTrackConfig {
  id: string;
  title: string;
  artist: string;
  album: string;
  bpm: number;
  duration: number; // in seconds
  scale: number[]; // frequencies
  baseBassFreq: number;
  themeColor: string;
  lrcLyrics: string;
}

const DEMO_CONFIGS: ProceduralTrackConfig[] = [
  {
    id: 'demo-cyber-overdrive',
    title: 'Cyber Overdrive',
    artist: 'kaGO Soundworks',
    album: 'Neon Horizon Vol. 1',
    bpm: 124,
    duration: 24,
    scale: [220, 261.63, 293.66, 329.63, 392.0, 440], // Am pentatonic
    baseBassFreq: 55, // A1
    themeColor: '#ff3e3e',
    lrcLyrics: `[00:00.00] kaGO.PIaY System Online...
[00:03.50] Initializing Dual-Channel DSP Audio Engine
[00:07.20] 80Hz Low-Shelf Bass Boost Activated
[00:11.00] Speeding through the crimson neon highway
[00:15.40] 5-Band Biquad Graphic Equalizer in sync
[00:19.80] Feel the sub-bass pulse in real-time
[00:23.00] Seamless crossfade standby...`,
  },
  {
    id: 'demo-neon-highway',
    title: 'Neon Highway 1984',
    artist: 'Vector Runner',
    album: 'Synthesized Dreams',
    bpm: 110,
    duration: 26,
    scale: [196, 220, 246.94, 293.66, 329.63, 392], // G major pentatonic
    baseBassFreq: 49, // G1
    themeColor: '#f43f5e',
    lrcLyrics: `[00:00.00] [Synthesizer Arpeggios echoing in dark]
[00:04.00] Midnight cruising on electric asphalt
[00:08.50] Turntable needle tracing analog vinyl grooves
[00:13.20] Audio Spectrum Analyser radiating 60 frames per second
[00:17.80] Retro-futuristic soundscapes running 100% offline
[00:22.50] Sound waves echoing into the infinite night`,
  },
  {
    id: 'demo-crimson-pulse',
    title: 'Crimson Pulse (Sub-Bass VIP)',
    artist: 'Kago Lab Unit',
    album: 'Pro Audio Stems',
    bpm: 96,
    duration: 25,
    scale: [164.81, 196.0, 220.0, 246.94, 293.66], // Em
    baseBassFreq: 41.2, // E1
    themeColor: '#ff2a55',
    lrcLyrics: `[00:00.00] Subwoofer resonance calibration test
[00:03.20] Sub-bass excursion check at 60Hz
[00:07.50] Lo-fi vinyl warmth layered with studio transient punch
[00:12.00] Zero-latency crossfade between Channel 0 and 1
[00:16.80] Dynamic biquad curves calibrated to hardware standards
[00:21.00] Maximum headroom preserved`,
  },
  {
    id: 'demo-neuro-glitch',
    title: 'Neuro Glitch & Bass',
    artist: 'Sub-Orbital',
    album: 'Underground Frequency',
    bpm: 138,
    duration: 22,
    scale: [146.83, 174.61, 196.0, 220.0, 261.63], // Dm
    baseBassFreq: 36.7, // D1
    themeColor: '#ff5c5c',
    lrcLyrics: `[00:00.00] System alert: Bass frequency overload
[00:03.00] Reeses bass modulation spinning up
[00:06.80] Frequency spectrum spikes detected
[00:11.20] Dual channel handoff engaged
[00:15.50] Cyberpunk distortion meets pro studio mastering
[00:19.00] Terminal link established`,
  },
];

export const INITIAL_DEMO_TRACKS: Track[] = DEMO_CONFIGS.map(cfg => ({
  id: cfg.id,
  title: cfg.title,
  artist: cfg.artist,
  album: cfg.album,
  duration: cfg.duration,
  format: 'SYNTH',
  lyrics: cfg.lrcLyrics,
  addedAt: Date.now(),
  playCount: 0,
  isFavorite: cfg.id === 'demo-cyber-overdrive',
}));

/**
 * Procedurally generates audio for a track using OfflineAudioContext
 */
export async function generateDemoTrackAudio(config: ProceduralTrackConfig): Promise<Blob> {
  const sampleRate = 44100;
  const length = Math.floor(sampleRate * config.duration);
  const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

  const secondsPerBeat = 60 / config.bpm;
  const sixteenth = secondsPerBeat / 4;
  const totalSixteenths = Math.floor(config.duration / sixteenth);

  // 1. Kick Drum (Sine sweep from 150Hz to 40Hz with fast decay)
  for (let s = 0; s < totalSixteenths; s += 4) {
    const t = s * sixteenth;
    if (t + 0.3 >= config.duration) break;

    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();

    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(offlineCtx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  // 2. Snare / Clap (White noise + short bandpass at 2kHz)
  const bufferSize = sampleRate * 0.18;
  const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  for (let s = 4; s < totalSixteenths; s += 8) {
    const t = s * sixteenth;
    if (t + 0.2 >= config.duration) break;

    const noise = offlineCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 1.2;

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(offlineCtx.destination);

    noise.start(t);
    noise.stop(t + 0.2);
  }

  // 3. Hi-Hats (16th note pattern)
  for (let s = 2; s < totalSixteenths; s += 2) {
    const t = s * sixteenth;
    if (t + 0.08 >= config.duration) break;

    const hatSource = offlineCtx.createBufferSource();
    hatSource.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;

    const gain = offlineCtx.createGain();
    const isAccent = s % 4 === 2;
    gain.gain.setValueAtTime(isAccent ? 0.22 : 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    hatSource.connect(filter);
    filter.connect(gain);
    gain.connect(offlineCtx.destination);

    hatSource.start(t);
    hatSource.stop(t + 0.08);
  }

  // 4. Bassline (Sawtooth + Lowpass filter modulated)
  for (let s = 0; s < totalSixteenths; s += 2) {
    const t = s * sixteenth;
    if (t + 0.25 >= config.duration) break;

    const bassOsc = offlineCtx.createOscillator();
    bassOsc.type = 'sawtooth';

    const octaveShift = (s % 8 === 6) ? 2 : 1;
    bassOsc.frequency.setValueAtTime(config.baseBassFreq * octaveShift, t);

    const bassFilter = offlineCtx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(320, t);
    bassFilter.frequency.exponentialRampToValueAtTime(110, t + 0.2);

    const bassGain = offlineCtx.createGain();
    bassGain.gain.setValueAtTime(0.45, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(offlineCtx.destination);

    bassOsc.start(t);
    bassOsc.stop(t + 0.25);
  }

  // 5. Arpeggio Synth Melody (Square wave through resonant filter)
  for (let s = 0; s < totalSixteenths; s++) {
    const t = s * sixteenth;
    if (t + 0.2 >= config.duration) break;

    // Pick note from scale based on pattern
    const noteIdx = (s * 3) % config.scale.length;
    const freq = config.scale[noteIdx];

    const leadOsc = offlineCtx.createOscillator();
    leadOsc.type = 'square';
    leadOsc.frequency.setValueAtTime(freq, t);

    const leadFilter = offlineCtx.createBiquadFilter();
    leadFilter.type = 'bandpass';
    leadFilter.frequency.setValueAtTime(freq * 1.5, t);
    leadFilter.Q.value = 2.0;

    const leadGain = offlineCtx.createGain();
    leadGain.gain.setValueAtTime(0.18, t);
    leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    leadOsc.connect(leadFilter);
    leadFilter.connect(leadGain);
    leadGain.connect(offlineCtx.destination);

    leadOsc.start(t);
    leadOsc.stop(t + 0.2);
  }

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

/**
 * Creates default initial tracks with real playable audio blobs
 */
export async function createDefaultDemoTracks(): Promise<Track[]> {
  const tracks: Track[] = [];

  for (const cfg of DEMO_CONFIGS) {
    try {
      const blob = await generateDemoTrackAudio(cfg);
      const url = URL.createObjectURL(blob);
      tracks.push({
        id: cfg.id,
        title: cfg.title,
        artist: cfg.artist,
        album: cfg.album,
        duration: cfg.duration,
        format: 'SYNTH',
        url,
        blob,
        lyrics: cfg.lrcLyrics,
        addedAt: Date.now(),
        playCount: 0,
        isFavorite: cfg.id === 'demo-cyber-overdrive',
      });
    } catch (e) {
      console.warn('Failed to synthesize demo track:', cfg.title, e);
    }
  }

  return tracks;
}
