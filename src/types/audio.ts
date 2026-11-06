export type AudioFormat = 'MP3' | 'WAV' | 'FLAC' | 'STREAM' | 'SYNTH';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  format: AudioFormat;
  url?: string; // blob URL, synthesized audio URL, or remote stream URL
  blob?: Blob;
  thumbnail?: string;
  lyrics?: string; // LRC or raw lyrics
  youtubeId?: string;
  addedAt: number;
  playCount: number;
  isFavorite: boolean;
  fileSize?: number;
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface EQPreset {
  name: string;
  description: string;
  gains: [number, number, number, number, number]; // 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz in dB (-12 to +12)
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  color: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AudioSettings {
  bassBoostEnabled: boolean;
  bassBoostGain: number; // 0 to 14 dB
  crossfadeDuration: number; // 0 to 12s
  gaplessEnabled: boolean;
  eqGains: [number, number, number, number, number];
  currentPreset: string;
  volume: number; // 0 to 1
  repeatMode: 'off' | 'all' | 'one';
  shuffle: boolean;
  lyricOffset: number; // -2.0 to +2.0 seconds
}

export type ViewType = 'dashboard' | 'stream' | 'library' | 'import' | 'lyrics';
export type LibrarySubTab = 'all' | 'albums' | 'artists' | 'playlists' | 'favorites';
