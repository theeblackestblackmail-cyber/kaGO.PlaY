/**
 * YouTube Video ID and URL parsing utility
 * Validates authentic 11-character alphanumeric video IDs: ^[a-zA-Z0-9_-]{11}$
 * Strictly filters out 26-character Mix/Playlist IDs (RDEM..., PL..., etc.) which crash embedded players.
 */

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function isValidYouTubeId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  // Strictly 11 characters, alphanumeric + underscore + hyphen
  if (!YOUTUBE_ID_REGEX.test(id)) return false;
  // Reject playlist/mix prefixes
  if (id.startsWith('RD') || id.startsWith('PL')) return false;
  return true;
}

export function extractYouTubeId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // If already an 11-char ID
  if (isValidYouTubeId(trimmed)) {
    return trimmed;
  }

  // Handle standard URLs: youtube.com/watch?v=XXXXXXXXXXX
  const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vMatch && isValidYouTubeId(vMatch[1])) {
    return vMatch[1];
  }

  // Handle short URLs: youtu.be/XXXXXXXXXXX
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && isValidYouTubeId(shortMatch[1])) {
    return shortMatch[1];
  }

  // Handle embed URLs: youtube.com/embed/XXXXXXXXXXX
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && isValidYouTubeId(embedMatch[1])) {
    return embedMatch[1];
  }

  return null;
}

/**
 * Generates an alternative query for embed-restricted tracks (Error 150 / 101)
 * E.g., Appending "audio" or "lyrics" to find a streamable version without VEVO/UMG iframe block.
 */
export function buildRecoveryQuery(title: string, artist: string, attempt: number): string {
  const cleanTitle = title.replace(/\[.*?\]|\(.*?\)/g, '').trim();
  const cleanArtist = artist.replace(/\[.*?\]|\(.*?\)/g, '').trim();

  if (attempt === 1) {
    return `${cleanArtist} ${cleanTitle} audio`;
  }
  if (attempt === 2) {
    return `${cleanArtist} ${cleanTitle} lyrics`;
  }
  return `${cleanArtist} ${cleanTitle} live acoustic`;
}

export function formatYouTubeDeepLink(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
