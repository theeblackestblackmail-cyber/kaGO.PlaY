import { AudioFormat } from '../types/audio';

export interface SanitizedTrackMeta {
  title: string;
  artist: string;
  album: string;
  format: AudioFormat;
}

const NOISE_TAGS = [
  /\[official\s*(music\s*)?video\]/gi,
  /\[official\s*audio\]/gi,
  /\[official\s*hd\s*video\]/gi,
  /\[official\s*4k\]/gi,
  /\[official\s*visualizer\]/gi,
  /\[audio\]/gi,
  /\[hd\]/gi,
  /\[4k\]/gi,
  /\[hq\]/gi,
  /\[lyrics?\]/gi,
  /\[clean\]/gi,
  /\[explicit\]/gi,
  /\(official\s*(music\s*)?video\)/gi,
  /\(official\s*audio\)/gi,
  /\(official\s*visualizer\)/gi,
  /\(lyrics?\)/gi,
  /\(audio\)/gi,
  /\(visualizer\)/gi,
  /\(slowed\s*\+\s*reverb\)/gi,
  /\(sped\s*up\)/gi,
  /\(radio\s*edit\)/gi,
  /\(original\s*mix\)/gi,
];

export function sanitizeFilename(filename: string): SanitizedTrackMeta {
  // 1. Identify format extension
  const extMatch = filename.match(/\.(mp3|wav|flac|ogg|m4a|aac)$/i);
  let ext = extMatch ? extMatch[1].toUpperCase() : 'MP3';
  let format: AudioFormat = 'MP3';
  if (ext === 'WAV') format = 'WAV';
  else if (ext === 'FLAC') format = 'FLAC';
  else format = 'MP3';

  // 2. Remove file extension
  let clean = filename.replace(/\.[^/.]+$/, '');

  // 3. Remove noise tags
  for (const pattern of NOISE_TAGS) {
    clean = clean.replace(pattern, '');
  }

  // 4. Strip track number prefixes like "01 - ", "01. ", "01 ", "1 - "
  clean = clean.replace(/^\s*\d{1,3}\s*[-._]\s*/, '');

  // 5. Replace underscores with spaces
  clean = clean.replace(/_+/g, ' ');

  // 6. Fix mojibake / corrupt UTF sequences
  clean = clean.replace(/[\uFFFD]/g, '');

  // 7. Parse Artist - Title if separated by hyphen or "by"
  let artist = 'Unknown Artist';
  let title = clean.trim();
  let album = 'Unknown Album';

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    if (parts.length >= 2) {
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
  } else if (clean.toLowerCase().includes(' by ')) {
    const parts = clean.split(/ by /i);
    if (parts.length === 2) {
      title = parts[0].trim();
      artist = parts[1].trim();
    }
  }

  // Clean trailing spaces and excessive whitespace
  title = title.replace(/\s+/g, ' ').trim() || 'Untitled Track';
  artist = artist.replace(/\s+/g, ' ').trim() || 'Unknown Artist';

  return {
    title,
    artist,
    album,
    format,
  };
}
