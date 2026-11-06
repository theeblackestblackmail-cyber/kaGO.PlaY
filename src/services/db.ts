import { Track, Playlist, AudioSettings } from '../types/audio';
import { EQ_PRESETS } from '../utils/equalizerPresets';
import { createDefaultDemoTracks, INITIAL_DEMO_TRACKS } from '../utils/proceduralTracks';

const DB_NAME = 'kaGO_PIaY_Audio_DB';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AudioSettings = {
  bassBoostEnabled: true,
  bassBoostGain: 8, // +8dB default low-shelf
  crossfadeDuration: 3, // 3 seconds seamless crossfade
  gaplessEnabled: true,
  eqGains: [...EQ_PRESETS[0].gains],
  currentPreset: 'Flat',
  volume: 0.9,
  repeatMode: 'all',
  shuffle: false,
  lyricOffset: 0.0,
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('tracks')) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('title', 'title', { unique: false });
        trackStore.createIndex('artist', 'artist', { unique: false });
        trackStore.createIndex('album', 'album', { unique: false });
        trackStore.createIndex('isFavorite', 'isFavorite', { unique: false });
      }

      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('recentSearches')) {
        db.createObjectStore('recentSearches', { keyPath: 'query' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// ----------------- TRACKS -----------------

export async function getAllTracks(): Promise<Track[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('tracks', 'readonly');
    const store = tx.objectStore('tracks');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        let tracks: Track[] = request.result || [];
        // If empty, immediately provide default demo tracks and seed in background
        if (tracks.length === 0) {
          tracks = [...INITIAL_DEMO_TRACKS];
          resolve(tracks);
          (async () => {
            try {
              const demoTracks = await createDefaultDemoTracks();
              for (const t of demoTracks) {
                await saveTrack(t);
              }
            } catch (e) {
              console.warn('Background stem generation:', e);
            }
          })();
          return;
        }

        // Recreate blob object URLs for tracks that have stored blobs
        tracks = tracks.map((t) => {
          if (t.blob && !t.url) {
            return { ...t, url: URL.createObjectURL(t.blob) };
          }
          return t;
        });

        resolve(tracks);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error fetching tracks from DB:', err);
    return [];
  }
}

export async function saveTrack(track: Track): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tracks', 'readwrite');
  const store = tx.objectStore('tracks');
  // Avoid saving transient object URLs in indexedDB
  const toSave = { ...track };
  if (toSave.blob && toSave.url && toSave.url.startsWith('blob:')) {
    // We retain the blob in DB, URL is regenerated on session load
  }
  store.put(toSave);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tracks', 'readwrite');
  tx.objectStore('tracks').delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateTrack(id: string, updates: Partial<Track>): Promise<Track | null> {
  const db = await getDB();
  const tx = db.transaction('tracks', 'readwrite');
  const store = tx.objectStore('tracks');
  const getReq = store.get(id);

  return new Promise((resolve, reject) => {
    getReq.onsuccess = () => {
      const existing = getReq.result as Track | undefined;
      if (!existing) {
        resolve(null);
        return;
      }
      const updated = { ...existing, ...updates };
      store.put(updated);
      tx.oncomplete = () => resolve(updated);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function toggleFavoriteTrack(id: string): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction('tracks', 'readwrite');
  const store = tx.objectStore('tracks');
  const getReq = store.get(id);

  return new Promise((resolve, reject) => {
    getReq.onsuccess = () => {
      const track = getReq.result as Track | undefined;
      if (!track) {
        resolve(false);
        return;
      }
      const newStatus = !track.isFavorite;
      track.isFavorite = newStatus;
      store.put(track);
      tx.oncomplete = () => resolve(newStatus);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ----------------- PLAYLISTS -----------------

export async function getAllPlaylists(): Promise<Playlist[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('playlists', 'readonly');
    const store = tx.objectStore('playlists');
    const req = store.getAll();

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        let playlists: Playlist[] = req.result || [];
        if (playlists.length === 0) {
          // Create initial starter playlist
          const starter: Playlist = {
            id: 'playlist-cyber-essentials',
            name: 'Cyberpunk Essentials',
            description: 'Heavy basslines, synthwave arpeggios, and futuristic pro audio stems',
            color: '#ff3e3e',
            trackIds: ['demo-cyber-overdrive', 'demo-neon-highway', 'demo-crimson-pulse', 'demo-neuro-glitch'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          savePlaylist(starter);
          playlists = [starter];
        }
        resolve(playlists);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('playlists', 'readwrite');
  tx.objectStore('playlists').put(playlist);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('playlists', 'readwrite');
  tx.objectStore('playlists').delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ----------------- SETTINGS -----------------

export async function getSettings(): Promise<AudioSettings> {
  try {
    const db = await getDB();
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('audio_settings');

    return new Promise((resolve) => {
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AudioSettings): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key: 'audio_settings', value: settings });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// ----------------- RECENT SEARCHES (YouTube) -----------------

export interface RecentSearchEntry {
  query: string;
  timestamp: number;
}

export async function getRecentSearches(): Promise<string[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('recentSearches', 'readonly');
    const store = tx.objectStore('recentSearches');
    const req = store.getAll();

    return new Promise((resolve) => {
      req.onsuccess = () => {
        const list: RecentSearchEntry[] = req.result || [];
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list.slice(0, 5).map(item => item.query));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function addRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  try {
    const db = await getDB();
    const tx = db.transaction('recentSearches', 'readwrite');
    const store = tx.objectStore('recentSearches');
    store.put({ query: trimmed, timestamp: Date.now() });

    await new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
    return getRecentSearches();
  } catch {
    return [];
  }
}

export async function removeRecentSearch(query: string): Promise<string[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('recentSearches', 'readwrite');
    tx.objectStore('recentSearches').delete(query);
    await new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
    return getRecentSearches();
  } catch {
    return [];
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('recentSearches', 'readwrite');
    tx.objectStore('recentSearches').clear();
    await new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
  } catch (e) {
    console.error(e);
  }
}
