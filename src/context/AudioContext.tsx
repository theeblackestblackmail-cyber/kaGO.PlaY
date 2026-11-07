import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Track, AudioSettings, Playlist, ViewType } from '../types/audio';
import { DualChannelAudioEngine } from '../services/audioEngine';
import {
  getAllTracks,
  getAllPlaylists,
  getSettings,
  saveSettings,
  saveTrack,
  toggleFavoriteTrack,
  deleteTrack,
  updateTrack,
} from '../services/db';
import { haptic } from '../utils/haptics';
import { buildRecoveryQuery, extractYouTubeId } from '../utils/youtubeHelper';
import { INITIAL_DEMO_TRACKS } from '../utils/proceduralTracks';

// YouTube IFrame Player global type declaration
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface AudioContextValue {
  // Navigation & View
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Track Collection & Playlists
  tracks: Track[];
  playlists: Playlist[];
  refreshTracks: () => Promise<void>;
  refreshPlaylists: () => Promise<void>;
  toggleFavorite: (trackId: string) => Promise<void>;
  removeTrack: (trackId: string) => Promise<void>;
  editTrackMeta: (trackId: string, partial: Partial<Track>) => Promise<void>;
  importTracks: (files: File[], defaultFolder?: string) => Promise<number>;

  // Playback State
  activeTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: Track[];
  queueIndex: number;
  isStreamMode: boolean; // YouTube streaming vs local native audio
  youtubeVideoId: string | null;
  activeChannel: 0 | 1;
  isLoading: boolean;
  errorMessage: string | null;

  // Controls
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  skipRelative: (seconds: number) => void;

  // Audio DSP & Settings
  settings: AudioSettings;
  updateSettingsState: (partial: Partial<AudioSettings>) => void;
  getAudioAnalyser: () => AnalyserNode | null;

  // Fullscreen & Modals
  isFullscreenPlayerOpen: boolean;
  setIsFullscreenPlayerOpen: (open: boolean) => void;
  isEQModalOpen: boolean;
  setIsEQModalOpen: (open: boolean) => void;

  // YouTube Auto-Recovery State
  streamRecoveryNotice: string | null;
  openYouTubeExternal: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [tracks, setTracks] = useState<Track[]>(INITIAL_DEMO_TRACKS);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTrack, setActiveTrack] = useState<Track | null>(INITIAL_DEMO_TRACKS[0] || null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(INITIAL_DEMO_TRACKS[0]?.duration || 24);
  const [queue, setQueue] = useState<Track[]>(INITIAL_DEMO_TRACKS);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [isStreamMode, setIsStreamMode] = useState<boolean>(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<0 | 1>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamRecoveryNotice, setStreamRecoveryNotice] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<AudioSettings>({
    bassBoostEnabled: true,
    bassBoostGain: 8,
    crossfadeDuration: 3,
    gaplessEnabled: true,
    eqGains: [0, 0, 0, 0, 0],
    currentPreset: 'Flat',
    volume: 0.9,
    repeatMode: 'all',
    shuffle: false,
    lyricOffset: 0.0,
  });

  // UI Modals
  const [isFullscreenPlayerOpen, setIsFullscreenPlayerOpen] = useState(false);
  const [isEQModalOpen, setIsEQModalOpen] = useState(false);

  // References
  const engineRef = useRef<DualChannelAudioEngine | null>(null);
  const queueRef = useRef<Track[]>([]);
  queueRef.current = queue;
  const queueIndexRef = useRef<number>(-1);
  queueIndexRef.current = queueIndex;
  const settingsRef = useRef<AudioSettings>(settings);
  settingsRef.current = settings;
  const activeTrackRef = useRef<Track | null>(null);
  activeTrackRef.current = activeTrack;

  // YouTube Player iframe ref
  const ytPlayerRef = useRef<any>(null);
  const ytContainerId = 'yt-player-container';
  const ytIntervalRef = useRef<number | null>(null);
  const recoveryAttemptRef = useRef<number>(0);

  // Load initial settings and tracks from DB
  useEffect(() => {
    async function initData() {
      const savedSettings = await getSettings();
      setSettings(savedSettings);

      const loadedTracks = await getAllTracks();
      setTracks(loadedTracks);
      setQueue(loadedTracks);

      const loadedPlaylists = await getAllPlaylists();
      setPlaylists(loadedPlaylists);

      if (loadedTracks.length > 0) {
        setActiveTrack(loadedTracks[0]);
        setQueueIndex(0);
      }
    }
    initData();
  }, []);

  // Hidden background carrier audio ref to guarantee Android / Samsung keeps playback alive when app is backgrounded
  const carrierAudioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Helper to resolve absolute artwork URLs for Samsung Now Bar and Android System Media Player
  const getArtworkList = useCallback((thumb?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let src = thumb || `${origin}/pwa-512x512.png`;
    if (src.startsWith('/')) {
      src = `${origin}${src}`;
    }
    return [
      { src, sizes: '96x96', type: 'image/png' },
      { src, sizes: '128x128', type: 'image/png' },
      { src, sizes: '192x192', type: 'image/png' },
      { src, sizes: '256x256', type: 'image/png' },
      { src, sizes: '384x384', type: 'image/png' },
      { src, sizes: '512x512', type: 'image/png' },
    ];
  }, []);

  // Sync Samsung Now Bar & Android Media Position State
  const syncMediaSessionPosition = useCallback((cur: number, dur: number) => {
    if (
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator &&
      'setPositionState' in navigator.mediaSession &&
      dur > 0 &&
      Number.isFinite(dur) &&
      Number.isFinite(cur)
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0.1, dur),
          playbackRate: 1.0,
          position: Math.max(0, Math.min(cur, dur)),
        });
      } catch {
        // Ignore bounds check exceptions during fast seeks
      }
    }
  }, []);

  // Request & release wake lock for screen / audio keepalive
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // WakeLock request can fail if device battery is low or policy disallows
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release().catch(() => {});
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  // Initialize background carrier audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      // 1-second silent stereo PCM WAV in base64
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w==';
      audio.loop = true;
      audio.volume = 0.01;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      carrierAudioRef.current = audio;
    }

    return () => {
      releaseWakeLock();
      if (carrierAudioRef.current) {
        carrierAudioRef.current.pause();
        carrierAudioRef.current.src = '';
      }
    };
  }, [releaseWakeLock]);

  // Keep audio alive across page hide / app switching (gaming, texting, lock screen)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // User switched to another app or locked screen: ensure audio engine doesn't pause
        if (engineRef.current && isPlaying) {
          engineRef.current.resume();
        }
      } else {
        // Returned to app: re-verify wake lock if still playing
        if (isPlaying) {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying, requestWakeLock]);

  // Sync carrier audio & wake lock to isPlaying
  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
      if (carrierAudioRef.current) {
        carrierAudioRef.current.play().catch(() => {});
      }
    } else {
      releaseWakeLock();
      if (carrierAudioRef.current) {
        carrierAudioRef.current.pause();
      }
    }

    // Sync playback state to Samsung Now Bar & Android Media Player
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

  // Initialize Dual-Channel Web Audio Engine
  useEffect(() => {
    const engine = new DualChannelAudioEngine(settings, {
      onTimeUpdate: (cur, dur) => {
        setCurrentTime(cur);
        if (dur && Number.isFinite(dur)) {
          setDuration(dur);
          syncMediaSessionPosition(cur, dur);
        }
      },
      onEnded: () => {
        handleTrackEnded();
      },
      onTrackAlmostEnded: () => {
        handleTrackAlmostEnded();
      },
      onError: (err) => {
        setErrorMessage(err);
      },
      onPlayStateChange: (playing) => {
        setIsPlaying(playing);
        setActiveChannel(engineRef.current?.getActiveChannel() ?? 0);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, [syncMediaSessionPosition]);

  // Update MediaSession API for Samsung Now Bar, Lockscreen & Android Notification Media Player
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !activeTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeTrack.title,
        artist: activeTrack.artist,
        album: activeTrack.album || 'kaGO.PIaY Pro Audio',
        artwork: getArtworkList(activeTrack.thumbnail),
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Comprehensive action handlers for Samsung Now Bar and Android Lock Screen
      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying) togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying) togglePlay();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        if (isPlaying) togglePlay();
        seek(0);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && Number.isFinite(details.seekTime)) {
          seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        skipRelative(-(details?.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        skipRelative(details?.seekOffset || 10);
      });
    } catch (e) {
      console.warn('Samsung Now Bar / MediaSession registration exception:', e);
    }
  }, [activeTrack, isPlaying, getArtworkList]);

  const refreshTracks = async () => {
    const list = await getAllTracks();
    setTracks(list);
  };

  const refreshPlaylists = async () => {
    const list = await getAllPlaylists();
    setPlaylists(list);
  };

  const toggleFavorite = async (trackId: string) => {
    haptic.eqTick();
    const isFav = await toggleFavoriteTrack(trackId);
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, isFavorite: isFav } : t));
    if (activeTrack && activeTrack.id === trackId) {
      setActiveTrack(prev => prev ? { ...prev, isFavorite: isFav } : null);
    }
  };

  const removeTrack = async (trackId: string) => {
    haptic.trackSkip();
    await deleteTrack(trackId);
    setTracks(prev => prev.filter(t => t.id !== trackId));
    setQueue(prev => prev.filter(t => t.id !== trackId));
  };

  const editTrackMeta = async (trackId: string, partial: Partial<Track>) => {
    const updated = await updateTrack(trackId, partial);
    if (updated) {
      setTracks(prev => prev.map(t => t.id === trackId ? updated : t));
      if (activeTrack && activeTrack.id === trackId) {
        setActiveTrack(updated);
      }
    }
  };

  const importTracks = async (files: File[], defaultFolder?: string): Promise<number> => {
    let imported = 0;
    const { sanitizeFilename } = await import('../utils/filenameSanitizer');
    const { extractFolderName } = await import('../utils/folderHelper');
    const { readID3Metadata } = await import('../utils/id3Reader');

    for (const file of files) {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a|aac)$/i)) {
        continue;
      }
      const cleanFromFilename = sanitizeFilename(file.name);
      let title = cleanFromFilename.title;
      let artist = cleanFromFilename.artist;
      let album = cleanFromFilename.album;

      try {
        const id3 = await readID3Metadata(file);
        if (id3.hasId3) {
          if (id3.title && id3.title.trim()) title = id3.title.trim();
          if (id3.artist && id3.artist.trim()) artist = id3.artist.trim();
          if (id3.album && id3.album.trim()) album = id3.album.trim();
        }
      } catch (err) {
        console.debug('Failed reading ID3 tags, using sanitized filename:', err);
      }

      const id = `track-local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const url = URL.createObjectURL(file);
      const folder = extractFolderName(file, defaultFolder || 'Device Storage');

      const track: Track = {
        id,
        title,
        artist,
        album,
        folder,
        duration: 180, // Estimated initially, updated on play
        format: cleanFromFilename.format,
        url,
        blob: file,
        addedAt: Date.now(),
        playCount: 0,
        isFavorite: false,
        fileSize: file.size,
      };

      await saveTrack(track);
      imported++;
    }

    await refreshTracks();
    return imported;
  };

  const updateSettingsState = (partial: Partial<AudioSettings>) => {
    haptic.eqTick();
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveSettings(updated);
    if (engineRef.current) {
      engineRef.current.updateSettings(partial);
    }
  };

  const getAudioAnalyser = (): AnalyserNode | null => {
    return engineRef.current ? engineRef.current.getAnalyser() : null;
  };

  // Play a track
  const playTrack = async (track: Track, newQueue?: Track[]) => {
    haptic.playPause();
    setIsLoading(true);
    setErrorMessage(null);
    setStreamRecoveryNotice(null);
    recoveryAttemptRef.current = 0;

    let targetQueue = newQueue || queue;
    if (newQueue) {
      setQueue(newQueue);
    }

    const idx = targetQueue.findIndex(t => t.id === track.id);
    setQueueIndex(idx >= 0 ? idx : 0);
    setActiveTrack(track);

    // Check if track is a YouTube stream
    const isStream = Boolean(track.format === 'STREAM' || track.youtubeId || (track.url && track.url.includes('youtube')));
    setIsStreamMode(isStream);

    if (isStream) {
      const ytId = track.youtubeId || extractYouTubeId(track.url || '');
      if (ytId) {
        setYoutubeVideoId(ytId);
        // Pause Web Audio engine channels
        if (engineRef.current) {
          engineRef.current.pause();
        }
        playYouTubeStream(ytId, track);
        setIsLoading(false);
        return;
      }
    }

    // Local / Offline Web Audio Playback
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
      } catch {}
    }
    setYoutubeVideoId(null);

    if (engineRef.current) {
      await engineRef.current.playTrack(track);
      setActiveChannel(engineRef.current.getActiveChannel());
    }
    setIsLoading(false);
  };

  // YouTube Player setup & Auto-Recovery (Error 150 / 101)
  const playYouTubeStream = (videoId: string, track: Track) => {
    if (!window.YT || !window.YT.Player) {
      loadYouTubeIFrameAPI(() => initYTPlayer(videoId, track));
    } else {
      initYTPlayer(videoId, track);
    }
  };

  const loadYouTubeIFrameAPI = (onReady: () => void) => {
    if (window.YT && window.YT.Player) {
      onReady();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      onReady();
    };
  };

  const initYTPlayer = (videoId: string, track: Track) => {
    if (ytIntervalRef.current) {
      window.clearInterval(ytIntervalRef.current);
    }

    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      try {
        ytPlayerRef.current.loadVideoById(videoId);
        ytPlayerRef.current.playVideo();
        startYTTimeTracking();
        return;
      } catch (e) {
        console.warn('Re-initializing YT player:', e);
      }
    }

    try {
      ytPlayerRef.current = new window.YT.Player(ytContainerId, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.playVideo();
            setIsPlaying(true);
            startYTTimeTracking();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              handleTrackEnded();
            }
          },
          onError: (event: any) => {
            handleYouTubeError(event.data, track, videoId);
          },
        },
      });
    } catch (e) {
      console.warn('YT Player init failed:', e);
    }
  };

  const startYTTimeTracking = () => {
    if (ytIntervalRef.current) window.clearInterval(ytIntervalRef.current);
    ytIntervalRef.current = window.setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const cur = ytPlayerRef.current.getCurrentTime() || 0;
        const dur = ytPlayerRef.current.getDuration() || 0;
        setCurrentTime(cur);
        if (dur) {
          setDuration(dur);
          syncMediaSessionPosition(cur, dur);
        }
      }
    }, 250);
  };

  // Auto-Recovery for Embed-Restricted Tracks (Error 150 / 101)
  const handleYouTubeError = async (errorCode: number, track: Track, failedVideoId: string) => {
    console.warn(`YouTube Player Error: ${errorCode} on video ${failedVideoId}`);

    // Codes 150 & 101 mean embedding blocked by publisher (VEVO/UMG)
    if (errorCode === 150 || errorCode === 101 || errorCode === 2) {
      recoveryAttemptRef.current += 1;
      const attempt = recoveryAttemptRef.current;

      if (attempt <= 2) {
        const query = buildRecoveryQuery(track.title, track.artist, attempt);
        setStreamRecoveryNotice(`Recovering embed-restricted track: searching audio stream (${attempt}/2)...`);

        try {
          const res = await fetch(`/api/youtube/resolve?q=${encodeURIComponent(query)}&exclude=${failedVideoId}`);
          const data = await res.json();
          if (data && data.success && data.videoId) {
            setStreamRecoveryNotice(`Restricted video bypassed! Streaming alternative: "${data.title}"`);
            setYoutubeVideoId(data.videoId);
            initYTPlayer(data.videoId, track);
            return;
          }
        } catch (e) {
          console.warn('Auto recovery fetch failed:', e);
        }
      }

      // If all alternatives failed, gracefully fall back to local studio synth audio
      setStreamRecoveryNotice('Remote video blocked by publisher licensing. Engaging local studio synthesizer audio.');
      setIsStreamMode(false);
      setYoutubeVideoId(null);
      if (engineRef.current) {
        await engineRef.current.playTrack({
          ...track,
          format: 'SYNTH',
          url: '',
        });
      }
    }
  };

  const togglePlay = () => {
    haptic.playPause();
    if (isStreamMode && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      return;
    }

    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.pause();
    } else {
      engineRef.current.resume();
    }
  };

  const nextTrack = useCallback(() => {
    haptic.trackSkip();
    const q = queueRef.current;
    if (q.length === 0) return;

    let nextIdx = queueIndexRef.current + 1;
    if (settingsRef.current.shuffle) {
      nextIdx = Math.floor(Math.random() * q.length);
    } else if (nextIdx >= q.length) {
      if (settingsRef.current.repeatMode === 'all') {
        nextIdx = 0;
      } else {
        return;
      }
    }

    const nextTrk = q[nextIdx];
    if (nextTrk) {
      playTrack(nextTrk);
    }
  }, [playTrack]);

  const prevTrack = useCallback(() => {
    haptic.trackSkip();
    const q = queueRef.current;
    if (q.length === 0) return;

    // If current time > 3s, restart current track
    if (currentTime > 3) {
      seek(0);
      return;
    }

    let prevIdx = queueIndexRef.current - 1;
    if (prevIdx < 0) {
      prevIdx = q.length - 1;
    }

    const prevTrk = q[prevIdx];
    if (prevTrk) {
      playTrack(prevTrk);
    }
  }, [currentTime, playTrack]);

  const seek = (seconds: number) => {
    if (isStreamMode && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
      syncMediaSessionPosition(seconds, duration);
      return;
    }
    if (engineRef.current) {
      engineRef.current.seek(seconds);
      setCurrentTime(seconds);
      syncMediaSessionPosition(seconds, duration);
    }
  };

  const skipRelative = (seconds: number) => {
    haptic.eqTick();
    seek(Math.max(0, Math.min(duration, currentTime + seconds)));
  };

  const handleTrackAlmostEnded = () => {
    // Check if crossfading is enabled and we are not in stream mode
    if (isStreamMode || settingsRef.current.crossfadeDuration <= 0) return;

    const q = queueRef.current;
    if (q.length <= 1) return;

    let nextIdx = queueIndexRef.current + 1;
    if (settingsRef.current.shuffle) {
      nextIdx = Math.floor(Math.random() * q.length);
    } else if (nextIdx >= q.length) {
      if (settingsRef.current.repeatMode === 'all') {
        nextIdx = 0;
      } else {
        return;
      }
    }

    const nextTrk = q[nextIdx];
    if (nextTrk && engineRef.current && nextTrk.format !== 'STREAM') {
      setQueueIndex(nextIdx);
      setActiveTrack(nextTrk);
      engineRef.current.crossfadeToNextTrack(nextTrk);
      setActiveChannel(engineRef.current.getActiveChannel());
    }
  };

  const handleTrackEnded = () => {
    if (settingsRef.current.repeatMode === 'one') {
      seek(0);
      togglePlay();
      return;
    }
    nextTrack();
  };

  const openYouTubeExternal = () => {
    if (youtubeVideoId) {
      window.open(`https://www.youtube.com/watch?v=${youtubeVideoId}`, '_blank');
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentView,
        setCurrentView,
        tracks,
        playlists,
        refreshTracks,
        refreshPlaylists,
        toggleFavorite,
        removeTrack,
        editTrackMeta,
        importTracks,
        activeTrack,
        isPlaying,
        currentTime,
        duration,
        queue,
        queueIndex,
        isStreamMode,
        youtubeVideoId,
        activeChannel,
        isLoading,
        errorMessage,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seek,
        skipRelative,
        settings,
        updateSettingsState,
        getAudioAnalyser,
        isFullscreenPlayerOpen,
        setIsFullscreenPlayerOpen,
        isEQModalOpen,
        setIsEQModalOpen,
        streamRecoveryNotice,
        openYouTubeExternal,
      }}
    >
      {children}
      {/* Hidden YouTube Player Host */}
      <div
        id={ytContainerId}
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within an AudioProvider');
  return ctx;
};
