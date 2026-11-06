import { AudioSettings, Track } from '../types/audio';
import { EQ_FREQUENCIES, clampGain } from '../utils/equalizerPresets';

export interface AudioEngineCallbacks {
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  onTrackAlmostEnded: () => void; // Trigger for pre-loading or beginning crossfade
  onError: (err: string) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
}

export class DualChannelAudioEngine {
  private ctx: AudioContext | null = null;

  // HTML5 audio elements for dual channels
  private audio0: HTMLAudioElement;
  private audio1: HTMLAudioElement;

  // Web Audio Source & Gain Nodes for Channel 0 & 1
  private source0: MediaElementAudioSourceNode | null = null;
  private source1: MediaElementAudioSourceNode | null = null;
  private gain0: GainNode | null = null;
  private gain1: GainNode | null = null;

  // DSP Processing Nodes
  private bassBoostFilter: BiquadFilterNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;

  // State
  private activeChannelIndex: 0 | 1 = 0;
  private isCrossfading = false;
  private crossfadeTimer: number | null = null;
  private almostEndedTriggered = false;
  private callbacks: AudioEngineCallbacks;
  private settings: AudioSettings;
  private fallbackSynthNode: OscillatorNode | null = null;
  private fallbackSynthGain: GainNode | null = null;

  constructor(settings: AudioSettings, callbacks: AudioEngineCallbacks) {
    this.settings = { ...settings };
    this.callbacks = callbacks;

    // Create dual audio elements
    this.audio0 = new Audio();
    this.audio1 = new Audio();

    this.audio0.preload = 'auto';
    this.audio1.preload = 'auto';
    this.audio0.crossOrigin = 'anonymous';
    this.audio1.crossOrigin = 'anonymous';
    this.audio0.setAttribute('playsinline', 'true');
    this.audio1.setAttribute('playsinline', 'true');
    this.audio0.setAttribute('webkit-playsinline', 'true');
    this.audio1.setAttribute('webkit-playsinline', 'true');

    this.setupAudioListeners(0, this.audio0);
    this.setupAudioListeners(1, this.audio1);
  }

  private initAudioContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.volume, this.ctx.currentTime);

      // Analyser Node (frequency spectrum & amplitude visualizers)
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.82;

      // 80Hz Low-shelf Bass Boost Filter
      this.bassBoostFilter = this.ctx.createBiquadFilter();
      this.bassBoostFilter.type = 'lowshelf';
      this.bassBoostFilter.frequency.setValueAtTime(80, this.ctx.currentTime);
      const bassGain = this.settings.bassBoostEnabled ? this.settings.bassBoostGain : 0;
      this.bassBoostFilter.gain.setValueAtTime(bassGain, this.ctx.currentTime);

      // 5-Band Biquad Graphic Equalizer: 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz
      this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.frequency.setValueAtTime(freq, this.ctx!.currentTime);
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.setValueAtTime(1.4, this.ctx!.currentTime);
        }
        const gain = clampGain(this.settings.eqGains[idx] ?? 0);
        filter.gain.setValueAtTime(gain, this.ctx!.currentTime);
        return filter;
      });

      // Channel Gain Nodes
      this.gain0 = this.ctx.createGain();
      this.gain1 = this.ctx.createGain();

      this.gain0.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.gain1.gain.setValueAtTime(0.0, this.ctx.currentTime);

      // Create Sources from HTMLAudioElements
      this.source0 = this.ctx.createMediaElementSource(this.audio0);
      this.source1 = this.ctx.createMediaElementSource(this.audio1);

      this.source0.connect(this.gain0);
      this.source1.connect(this.gain1);

      // Connect channels into Bass Boost Filter
      this.gain0.connect(this.bassBoostFilter);
      this.gain1.connect(this.bassBoostFilter);

      // Chain through 5-band Equalizer
      let previousNode: AudioNode = this.bassBoostFilter;
      for (const eqFilter of this.eqFilters) {
        previousNode.connect(eqFilter);
        previousNode = eqFilter;
      }

      // Connect to Master Gain -> Analyser -> AudioContext Destination
      previousNode.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } catch (e) {
      console.warn('AudioContext initialization deferred until user gesture:', e);
    }
  }

  private setupAudioListeners(channelIdx: 0 | 1, audio: HTMLAudioElement) {
    audio.addEventListener('timeupdate', () => {
      if (channelIdx !== this.activeChannelIndex) return;
      const cur = audio.currentTime || 0;
      const dur = audio.duration || 0;
      this.callbacks.onTimeUpdate(cur, dur);

      // Check for almost ended (to trigger crossfade if crossfade > 0)
      if (dur > 0 && this.settings.crossfadeDuration > 0) {
        const remaining = dur - cur;
        if (remaining <= this.settings.crossfadeDuration && !this.almostEndedTriggered) {
          this.almostEndedTriggered = true;
          this.callbacks.onTrackAlmostEnded();
        }
      }
    });

    audio.addEventListener('ended', () => {
      if (channelIdx === this.activeChannelIndex) {
        this.callbacks.onEnded();
      }
    });

    audio.addEventListener('play', () => {
      if (channelIdx === this.activeChannelIndex) {
        this.callbacks.onPlayStateChange(true);
      }
    });

    audio.addEventListener('pause', () => {
      if (channelIdx === this.activeChannelIndex && !this.isCrossfading) {
        this.callbacks.onPlayStateChange(false);
      }
    });

    audio.addEventListener('error', (e) => {
      console.warn(`Audio channel ${channelIdx} error:`, e);
      if (channelIdx === this.activeChannelIndex) {
        this.callbacks.onError('Audio playback error on channel ' + channelIdx);
      }
    });
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getActiveAudio(): HTMLAudioElement {
    return this.activeChannelIndex === 0 ? this.audio0 : this.audio1;
  }

  public getStandbyAudio(): HTMLAudioElement {
    return this.activeChannelIndex === 0 ? this.audio1 : this.audio0;
  }

  public getActiveChannel(): 0 | 1 {
    return this.activeChannelIndex;
  }

  /**
   * Resilient Playback Switch:
   * Always resets active channel gain node to 1.0 and standby to 0.0
   * so playback never gets stuck in zero-gain muted state.
   */
  public resetChannelGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.gain0 && this.gain1) {
      if (this.activeChannelIndex === 0) {
        this.gain0.gain.cancelScheduledValues(now);
        this.gain0.gain.setValueAtTime(1.0, now);
        this.gain1.gain.cancelScheduledValues(now);
        this.gain1.gain.setValueAtTime(0.0, now);
      } else {
        this.gain1.gain.cancelScheduledValues(now);
        this.gain1.gain.setValueAtTime(1.0, now);
        this.gain0.gain.cancelScheduledValues(now);
        this.gain0.gain.setValueAtTime(0.0, now);
      }
    }
  }

  /**
   * Loads and immediately plays a track on the active channel.
   * Resets any pending crossfades cleanly.
   */
  public async playTrack(track: Track): Promise<void> {
    this.initAudioContext();
    this.almostEndedTriggered = false;

    if (this.crossfadeTimer) {
      window.clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    this.isCrossfading = false;

    const audio = this.getActiveAudio();
    const standby = this.getStandbyAudio();

    standby.pause();
    standby.src = '';

    const srcUrl = track.url || (track.blob ? URL.createObjectURL(track.blob) : '');
    if (!srcUrl) {
      this.startStudioSynthFallback();
      return;
    }

    this.stopStudioSynthFallback();

    audio.src = srcUrl;
    audio.currentTime = 0;
    this.resetChannelGains();

    try {
      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      await audio.play();
      this.callbacks.onPlayStateChange(true);
    } catch (err: unknown) {
      // Handle browser NotAllowedError / AbortError gracefully
      const error = err as Error;
      if (error.name === 'NotAllowedError') {
        console.warn('Autoplay restricted by browser: waiting for user interaction.');
      } else if (error.name !== 'AbortError') {
        console.warn('Audio play error, falling back to studio synth:', err);
        this.startStudioSynthFallback();
      }
    }
  }

  /**
   * Seamless Crossfade:
   * Smoothly crossfades between current channel and next channel over duration seconds.
   */
  public async crossfadeToNextTrack(nextTrack: Track): Promise<void> {
    this.initAudioContext();
    const duration = Math.max(0.5, Math.min(12, this.settings.crossfadeDuration));

    const outgoingIdx = this.activeChannelIndex;
    const incomingIdx: 0 | 1 = outgoingIdx === 0 ? 1 : 0;

    const outgoingAudio = outgoingIdx === 0 ? this.audio0 : this.audio1;
    const incomingAudio = incomingIdx === 0 ? this.audio0 : this.audio1;
    const outgoingGain = outgoingIdx === 0 ? this.gain0 : this.gain1;
    const incomingGain = incomingIdx === 0 ? this.gain0 : this.gain1;

    const srcUrl = nextTrack.url || (nextTrack.blob ? URL.createObjectURL(nextTrack.blob) : '');
    if (!srcUrl) {
      await this.playTrack(nextTrack);
      return;
    }

    this.isCrossfading = true;
    incomingAudio.src = srcUrl;
    incomingAudio.currentTime = 0;

    if (this.ctx && outgoingGain && incomingGain) {
      const now = this.ctx.currentTime;
      outgoingGain.gain.cancelScheduledValues(now);
      incomingGain.gain.cancelScheduledValues(now);

      outgoingGain.gain.setValueAtTime(1.0, now);
      outgoingGain.gain.linearRampToValueAtTime(0.0001, now + duration);

      incomingGain.gain.setValueAtTime(0.0001, now);
      incomingGain.gain.linearRampToValueAtTime(1.0, now + duration);
    }

    try {
      await incomingAudio.play();
    } catch (e) {
      console.warn('Crossfade incoming play failed:', e);
    }

    // Switch active channel index
    this.activeChannelIndex = incomingIdx;
    this.almostEndedTriggered = false;

    if (this.crossfadeTimer) {
      window.clearTimeout(this.crossfadeTimer);
    }

    this.crossfadeTimer = window.setTimeout(() => {
      outgoingAudio.pause();
      outgoingAudio.src = '';
      this.isCrossfading = false;
      this.resetChannelGains();
    }, duration * 1000);
  }

  public pause(): void {
    const audio = this.getActiveAudio();
    audio.pause();
    this.stopStudioSynthFallback();
    this.callbacks.onPlayStateChange(false);
  }

  public async resume(): Promise<void> {
    this.initAudioContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    const audio = this.getActiveAudio();
    try {
      await audio.play();
      this.callbacks.onPlayStateChange(true);
    } catch (e) {
      console.warn('Resume play failed:', e);
    }
  }

  public seek(seconds: number): void {
    const audio = this.getActiveAudio();
    if (Number.isFinite(seconds) && audio.duration) {
      audio.currentTime = Math.max(0, Math.min(audio.duration, seconds));
    }
  }

  public skipRelative(seconds: number): void {
    const audio = this.getActiveAudio();
    const cur = audio.currentTime || 0;
    const dur = audio.duration || 0;
    this.seek(Math.max(0, Math.min(dur, cur + seconds)));
  }

  public setVolume(vol: number): void {
    this.settings.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.settings.volume, this.ctx.currentTime);
    }
  }

  public setEQGains(gains: [number, number, number, number, number]): void {
    this.settings.eqGains = [...gains];
    if (!this.ctx) return;
    this.eqFilters.forEach((filter, idx) => {
      const g = clampGain(gains[idx] ?? 0);
      filter.gain.setValueAtTime(g, this.ctx!.currentTime);
    });
  }

  public setBassBoost(enabled: boolean, gainDb: number): void {
    this.settings.bassBoostEnabled = enabled;
    this.settings.bassBoostGain = Math.max(0, Math.min(14, gainDb));
    if (this.bassBoostFilter && this.ctx) {
      const g = enabled ? this.settings.bassBoostGain : 0;
      this.bassBoostFilter.gain.setValueAtTime(g, this.ctx.currentTime);
    }
  }

  public updateSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
    if (settings.volume !== undefined) this.setVolume(settings.volume);
    if (settings.eqGains !== undefined) this.setEQGains(settings.eqGains);
    if (settings.bassBoostEnabled !== undefined || settings.bassBoostGain !== undefined) {
      this.setBassBoost(this.settings.bassBoostEnabled, this.settings.bassBoostGain);
    }
  }

  /**
   * Procedural studio synthesizer fallback:
   * When audio element encounters network/embed failures, keeps sound alive gracefully.
   */
  private startStudioSynthFallback(): void {
    if (this.fallbackSynthNode || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime); // A2

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      if (this.bassBoostFilter) {
        gain.connect(this.bassBoostFilter);
      } else {
        gain.connect(this.ctx.destination);
      }

      osc.start();
      this.fallbackSynthNode = osc;
      this.fallbackSynthGain = gain;
      this.callbacks.onPlayStateChange(true);
    } catch {
      // Ignore
    }
  }

  private stopStudioSynthFallback(): void {
    if (this.fallbackSynthNode) {
      try {
        this.fallbackSynthNode.stop();
        this.fallbackSynthNode.disconnect();
      } catch {
        // Ignore
      }
      this.fallbackSynthNode = null;
    }
  }

  public destroy(): void {
    if (this.crossfadeTimer) {
      window.clearTimeout(this.crossfadeTimer);
    }
    this.stopStudioSynthFallback();
    this.audio0.pause();
    this.audio1.pause();
    this.audio0.src = '';
    this.audio1.src = '';
    if (this.ctx) {
      this.ctx.close().catch(() => {});
    }
  }
}
