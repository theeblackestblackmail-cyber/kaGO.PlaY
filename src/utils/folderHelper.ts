import { Track } from '../types/audio';

export interface FolderGroup {
  folder: string;
  tracks: Track[];
  count: number;
  totalDuration: number;
}

/**
 * Extracts a sensible folder name from a File object based on webkitRelativePath or fallback.
 */
export function extractFolderName(file: { name: string; webkitRelativePath?: string }, fallbackFolder: string = 'Device Storage'): string {
  if (file.webkitRelativePath && file.webkitRelativePath.includes('/')) {
    const parts = file.webkitRelativePath.split('/').filter(Boolean);
    if (parts.length > 1) {
      // Use the root folder of the directory tree
      return parts[0];
    }
  }
  return fallbackFolder;
}

/**
 * Returns the folder name for a given track, defaulting to 'Device Storage' or 'Offline Stems'.
 */
export function getTrackFolder(track: Track): string {
  if (track.folder && track.folder.trim()) {
    return track.folder.trim();
  }
  if (track.format === 'SYNTH') {
    return 'Cyber Stems';
  }
  if (track.format === 'STREAM') {
    return 'Stream Captures';
  }
  return 'Device Storage';
}

/**
 * Groups an array of tracks by their associated folder.
 */
export function groupTracksByFolder(tracks: Track[]): FolderGroup[] {
  const map = new Map<string, Track[]>();

  for (const track of tracks) {
    const folder = getTrackFolder(track);
    if (!map.has(folder)) {
      map.set(folder, []);
    }
    map.get(folder)!.push(track);
  }

  const groups: FolderGroup[] = [];
  for (const [folder, folderTracks] of map.entries()) {
    groups.push({
      folder,
      tracks: folderTracks,
      count: folderTracks.length,
      totalDuration: folderTracks.reduce((acc, t) => acc + (t.duration || 180), 0),
    });
  }

  // Sort alphabetically by folder name
  return groups.sort((a, b) => a.folder.localeCompare(b.folder));
}
