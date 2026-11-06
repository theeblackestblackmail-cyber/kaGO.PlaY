import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json());

// ----------------- YOUTUBE RESOLVER & SEARCH -----------------
// Regex for strictly authentic 11-char YouTube Video IDs
const YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function cleanYouTubeId(id: string): string | null {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (trimmed.startsWith('RD') || trimmed.startsWith('PL')) return null;
  if (!YT_ID_REGEX.test(trimmed)) return null;
  return trimmed;
}

interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  views?: string;
}

// Scrape authentic 11-char YouTube videos safely
async function searchYouTubeVideos(query: string): Promise<YouTubeSearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query.trim());
    // &sp=EgIQAQ%253D%253D strictly filters to individual video results (no playlists, no channels)
    const url = `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIQAQ%253D%253D`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`YouTube responded with status ${res.status}`);
    }

    const html = await res.text();

    // Extract ytInitialData json from HTML
    const initialDataMatch = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/s) ||
                             html.match(/window\["ytInitialData"\]\s*=\s*({.+?});<\/script>/s);

    const results: YouTubeSearchResult[] = [];

    if (initialDataMatch && initialDataMatch[1]) {
      try {
        const data = JSON.parse(initialDataMatch[1]);
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (Array.isArray(contents)) {
          for (const section of contents) {
            const itemSection = section?.itemSectionRenderer?.contents;
            if (Array.isArray(itemSection)) {
              for (const item of itemSection) {
                const vr = item?.videoRenderer;
                if (!vr || !vr.videoId) continue;

                const validId = cleanYouTubeId(vr.videoId);
                if (!validId) continue;

                const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Unknown Title';
                const channel = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || 'YouTube Creator';
                const durationText = vr.lengthText?.simpleText || vr.lengthText?.runs?.[0]?.text || '3:30';
                
                // Parse duration in seconds
                const parts = durationText.split(':').map((p: string) => parseInt(p, 10));
                let durSec = 210;
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  durSec = parts[0] * 60 + parts[1];
                } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                  durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                }

                const thumbs = vr.thumbnail?.thumbnails;
                const thumb = (thumbs && thumbs.length > 0) ? thumbs[thumbs.length - 1].url : `https://img.youtube.com/vi/${validId}/hqdefault.jpg`;
                const views = vr.shortViewCountText?.simpleText || vr.viewCountText?.simpleText || '';

                results.push({
                  id: validId,
                  title,
                  artist: channel,
                  duration: durationText,
                  durationSeconds: durSec,
                  thumbnail: thumb,
                  views,
                });

                if (results.length >= 15) break;
              }
            }
            if (results.length >= 15) break;
          }
        }
      } catch (e) {
        console.warn('Failed to parse ytInitialData JSON:', e);
      }
    }

    // Fallback: Regex scan if JSON parsing did not return results
    if (results.length === 0) {
      const vidRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
      const seen = new Set<string>();
      let match;
      while ((match = vidRegex.exec(html)) !== null) {
        const id = cleanYouTubeId(match[1]);
        if (id && !seen.has(id)) {
          seen.add(id);
          results.push({
            id,
            title: `${query} (Audio Stream)`,
            artist: 'YouTube Music Stream',
            duration: '3:45',
            durationSeconds: 225,
            thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          });
          if (results.length >= 12) break;
        }
      }
    }

    return results;
  } catch (err) {
    console.warn('searchYouTubeVideos error:', err);
    return [];
  }
}

// Search endpoint
app.get('/api/youtube/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({ results: [] });
  }

  // Check if query is already an 11-character video ID
  const directId = cleanYouTubeId(query);
  if (directId) {
    return res.json({
      results: [
        {
          id: directId,
          title: `Direct Video (${directId})`,
          artist: 'YouTube Stream',
          duration: '3:30',
          durationSeconds: 210,
          thumbnail: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
        },
      ],
    });
  }

  const results = await searchYouTubeVideos(query);
  res.json({ results });
});

// Resolve endpoint (used also for Auto-Recovery on Error 150/101)
app.get('/api/youtube/resolve', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  const excludeId = req.query.exclude as string || '';
  if (!query) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const results = await searchYouTubeVideos(query);
  const filtered = results.filter(r => r.id !== excludeId);

  if (filtered.length > 0) {
    return res.json({
      success: true,
      videoId: filtered[0].id,
      title: filtered[0].title,
      artist: filtered[0].artist,
      duration: filtered[0].durationSeconds,
      thumbnail: filtered[0].thumbnail,
      alternatives: filtered.slice(1, 4).map(r => r.id),
    });
  }

  return res.json({
    success: false,
    error: 'No video streams resolved',
  });
});

// ----------------- REAL-TIME COLLABORATIVE PLAYLISTS -----------------
interface CollabTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  addedBy: string;
  youtubeId?: string;
}

interface CollabPlaylist {
  id: string;
  name: string;
  description: string;
  color: string;
  tracks: CollabTrack[];
  createdAt: number;
  updatedAt: number;
}

// In-memory server-authoritative store for collaborative playlists
const collaborativePlaylists = new Map<string, CollabPlaylist>();

// Seed a public community collaboration playlist
collaborativePlaylists.set('cyber-collab-01', {
  id: 'cyber-collab-01',
  name: 'Cyberpunk Collective 2077',
  description: 'Public real-time collaborative audio queue. Anyone can add and reorder tracks!',
  color: '#ff3e3e',
  tracks: [
    { id: 'track-1', title: 'Cyber Overdrive', artist: 'kaGO Soundworks', duration: 24, addedBy: 'kaGO Admin' },
    { id: 'track-2', title: 'Neon Highway 1984', artist: 'Vector Runner', duration: 26, addedBy: 'DJ Glitch' },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

app.get('/api/collaborative-playlists', (_req: Request, res: Response) => {
  const list = Array.from(collaborativePlaylists.values());
  res.json({ playlists: list });
});

app.get('/api/collaborative-playlists/:id', (req: Request, res: Response) => {
  const pl = collaborativePlaylists.get(req.params.id);
  if (!pl) return res.status(404).json({ error: 'Collaborative playlist not found' });
  res.json({ playlist: pl });
});

app.post('/api/collaborative-playlists', (req: Request, res: Response) => {
  const { name, description, color, initialTracks } = req.body;
  const id = `collab-${Math.random().toString(36).substring(2, 9)}`;
  const newPl: CollabPlaylist = {
    id,
    name: name || 'Shared Cyber Jam',
    description: description || 'Collaborative playlist session',
    color: color || '#ff3e3e',
    tracks: Array.isArray(initialTracks) ? initialTracks : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  collaborativePlaylists.set(id, newPl);
  res.json({ success: true, playlist: newPl });
});

// Setup WebSocket Server for real-time collaboration
const wss = new WebSocketServer({ server, path: '/ws/collaborate' });

interface ClientInfo {
  ws: WebSocket;
  playlistId: string;
  userId: string;
  userName: string;
  userColor: string;
}

const connectedClients = new Map<WebSocket, ClientInfo>();

function broadcastToPlaylist(playlistId: string, message: object, senderWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const [ws, info] of connectedClients.entries()) {
    if (info.playlistId === playlistId && ws.readyState === WebSocket.OPEN) {
      if (!senderWs || ws !== senderWs) {
        ws.send(payload);
      }
    }
  }
}

function getActiveUsers(playlistId: string) {
  const users: { id: string; name: string; color: string }[] = [];
  const seen = new Set<string>();
  for (const info of connectedClients.values()) {
    if (info.playlistId === playlistId && !seen.has(info.userId)) {
      seen.add(info.userId);
      users.push({ id: info.userId, name: info.userName, color: info.userColor });
    }
  }
  return users;
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const { type, payload } = data;

      switch (type) {
        case 'join': {
          const { playlistId, user } = payload;
          connectedClients.set(ws, {
            ws,
            playlistId,
            userId: user.id || 'user-' + Math.random().toString(36).substring(2, 6),
            userName: user.name || 'Neon Operator',
            userColor: user.color || '#ff3e3e',
          });

          const currentPl = collaborativePlaylists.get(playlistId);
          // Send initial state to the joined user
          ws.send(JSON.stringify({
            type: 'init',
            payload: {
              playlist: currentPl || null,
              activeUsers: getActiveUsers(playlistId),
            },
          }));

          // Broadcast user joined to other collaborators
          broadcastToPlaylist(playlistId, {
            type: 'user:joined',
            payload: {
              user: connectedClients.get(ws),
              activeUsers: getActiveUsers(playlistId),
            },
          }, ws);
          break;
        }

        case 'track:add': {
          const info = connectedClients.get(ws);
          if (!info) return;
          const pl = collaborativePlaylists.get(info.playlistId);
          if (pl) {
            const newTrack: CollabTrack = {
              id: payload.id || `track-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              title: payload.title || 'Untitled Track',
              artist: payload.artist || 'Unknown Artist',
              duration: payload.duration || 180,
              addedBy: info.userName,
              youtubeId: payload.youtubeId,
            };
            pl.tracks.push(newTrack);
            pl.updatedAt = Date.now();

            broadcastToPlaylist(info.playlistId, {
              type: 'track:added',
              payload: { track: newTrack, playlist: pl },
            });
          }
          break;
        }

        case 'track:remove': {
          const info = connectedClients.get(ws);
          if (!info) return;
          const pl = collaborativePlaylists.get(info.playlistId);
          if (pl) {
            pl.tracks = pl.tracks.filter(t => t.id !== payload.trackId);
            pl.updatedAt = Date.now();

            broadcastToPlaylist(info.playlistId, {
              type: 'track:removed',
              payload: { trackId: payload.trackId, playlist: pl },
            });
          }
          break;
        }

        case 'tracks:reorder': {
          const info = connectedClients.get(ws);
          if (!info) return;
          const pl = collaborativePlaylists.get(info.playlistId);
          if (pl && Array.isArray(payload.tracks)) {
            pl.tracks = payload.tracks;
            pl.updatedAt = Date.now();

            broadcastToPlaylist(info.playlistId, {
              type: 'tracks:reordered',
              payload: { playlist: pl },
            });
          }
          break;
        }
      }
    } catch (e) {
      console.warn('WS message parsing error:', e);
    }
  });

  ws.on('close', () => {
    const info = connectedClients.get(ws);
    if (info) {
      connectedClients.delete(ws);
      broadcastToPlaylist(info.playlistId, {
        type: 'user:left',
        payload: {
          userId: info.userId,
          activeUsers: getActiveUsers(info.playlistId),
        },
      });
    }
  });
});

// ----------------- VITE MIDDLEWARE (DEV) / STATIC (PROD) -----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`kaGO.PIaY Pro Audio Server running on http://localhost:${port}`);
  });
}

startServer();
