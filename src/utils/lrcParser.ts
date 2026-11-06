import { LyricLine } from '../types/audio';

/**
 * Parses LRC format lyrics text into structured array of LyricLine objects
 * Supports formats like:
 * [00:12.34] Lyric text
 * [01:05.8] Another line
 * [02:10] Line without hundredths
 * [00:10.00][00:20.00] Repeated lines
 */
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const lines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const matches = Array.from(line.matchAll(timeRegex));
    if (matches.length === 0) continue;

    // The text is whatever is left after stripping all time tags
    const text = line.replace(timeRegex, '').trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let millis = 0;
      if (match[3]) {
        // Handle 1, 2, or 3 digits
        millis = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
      }
      const totalSeconds = minutes * 60 + seconds + millis / 1000;
      result.push({
        time: Math.round(totalSeconds * 100) / 100,
        text,
      });
    }
  }

  // Sort chronologically
  result.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * Finds the currently active lyric line index given current audio playback time and user offset calibration
 */
export function getActiveLyricIndex(
  lyrics: LyricLine[],
  currentTime: number,
  offsetSeconds: number = 0
): number {
  if (!lyrics || lyrics.length === 0) return -1;
  const calibratedTime = Math.max(0, currentTime + offsetSeconds);

  let activeIdx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= calibratedTime) {
      activeIdx = i;
    } else {
      break;
    }
  }
  return activeIdx;
}

/**
 * Formats seconds back to [mm:ss.xx]
 */
export function formatLyricTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}]`;
}
