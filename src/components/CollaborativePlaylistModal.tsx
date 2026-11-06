import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { Track } from '../types/audio';
import {
  Users,
  Share2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Play,
  X,
  Check,
  Disc,
  Radio,
  Copy,
} from 'lucide-react';
import { haptic } from '../utils/haptics';

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

interface UserPresence {
  id: string;
  name: string;
  color: string;
}

interface CollabModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
}

export const CollaborativePlaylistModal: React.FC<CollabModalProps> = ({
  isOpen,
  onClose,
  playlistId,
}) => {
  const { tracks: localTracks, playTrack } = useAudio();
  const [playlist, setPlaylist] = useState<CollabPlaylist | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  const currentUser = useRef({
    id: 'user-' + Math.random().toString(36).substring(2, 7),
    name: 'Cyber Collaborator #' + Math.floor(Math.random() * 900 + 100),
    color: ['#ff3e3e', '#f43f5e', '#38bdf8', '#a855f7', '#10b981'][Math.floor(Math.random() * 5)],
  });

  useEffect(() => {
    if (!isOpen) return;

    // Connect to WebSocket server on /ws/collaborate
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/collaborate`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setWsStatus('connected');
      socket.send(
        JSON.stringify({
          type: 'join',
          payload: {
            playlistId,
            user: currentUser.current,
          },
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'init':
            if (msg.payload.playlist) setPlaylist(msg.payload.playlist);
            if (Array.isArray(msg.payload.activeUsers)) setActiveUsers(msg.payload.activeUsers);
            break;
          case 'user:joined':
          case 'user:left':
            if (Array.isArray(msg.payload.activeUsers)) setActiveUsers(msg.payload.activeUsers);
            break;
          case 'track:added':
          case 'track:removed':
          case 'tracks:reordered':
            if (msg.payload.playlist) setPlaylist(msg.payload.playlist);
            break;
        }
      } catch (err) {
        console.warn('WS parse error:', err);
      }
    };

    socket.onclose = () => {
      setWsStatus('disconnected');
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [isOpen, playlistId]);

  if (!isOpen) return null;

  const handleCopyShareLink = () => {
    haptic.eqTick();
    const shareUrl = `${window.location.origin}/?collab=${playlistId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleAddTrack = (track: Track) => {
    haptic.eqTick();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'track:add',
          payload: {
            id: `collab-t-${Date.now()}`,
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            youtubeId: track.youtubeId,
          },
        })
      );
    }
    setShowAddMenu(false);
  };

  const handleRemoveTrack = (trackId: string) => {
    haptic.eqTick();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'track:remove',
          payload: { trackId },
        })
      );
    }
  };

  const handleMoveTrack = (index: number, direction: 'up' | 'down') => {
    if (!playlist) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= playlist.tracks.length) return;

    haptic.eqTick();
    const newTracks = [...playlist.tracks];
    const [moved] = newTracks.splice(index, 1);
    newTracks.splice(newIdx, 0, moved);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'tracks:reorder',
          payload: { tracks: newTracks },
        })
      );
    }
  };

  const handlePlayCollabTrack = (cTrack: CollabTrack) => {
    // Look up in local tracks or play as stream
    const existing = localTracks.find(t => t.title.toLowerCase() === cTrack.title.toLowerCase());
    if (existing) {
      playTrack(existing);
    } else {
      playTrack({
        id: cTrack.id,
        title: cTrack.title,
        artist: cTrack.artist,
        album: playlist?.name || 'Shared Playlist',
        duration: cTrack.duration,
        format: cTrack.youtubeId ? 'STREAM' : 'SYNTH',
        youtubeId: cTrack.youtubeId,
        addedAt: Date.now(),
        playCount: 0,
        isFavorite: false,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#141418] border border-[#2a2a38] rounded-2xl shadow-2xl p-5 sm:p-7 text-[#f2efeb] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#202028]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 rounded-lg text-[#ff3e3e]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-brand tracking-wider">
                  {playlist?.name || 'Collaborative Playlist'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                  {wsStatus === 'connected' ? 'LIVE SYNC' : 'CONNECTING...'}
                </span>
              </div>
              <p className="text-xs text-[#8c8c9e] font-mono mt-0.5">
                Real-Time Multi-User Audio Jam Session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#202028] rounded-lg transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Collaborators Bar */}
        <div className="py-3 px-3.5 bg-[#0c0c0e] border border-[#1e1e26] rounded-xl my-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8c8c9e]">Online Collaborators:</span>
            <div className="flex items-center -space-x-2">
              {activeUsers.map((u) => (
                <div
                  key={u.id}
                  className="w-6 h-6 rounded-full border-2 border-[#0c0c0e] flex items-center justify-center text-[10px] font-bold text-white shadow"
                  style={{ backgroundColor: u.color }}
                  title={u.name}
                >
                  {u.name.slice(0, 1)}
                </div>
              ))}
            </div>
            <span className="text-xs font-mono font-bold text-white">
              ({activeUsers.length})
            </span>
          </div>

          {/* Copy Share Link */}
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#1e1e28] hover:bg-[#282836] border border-[#2e2e3e] text-xs font-mono rounded-lg transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#ff3e3e]" />}
            <span>{copiedLink ? 'LINK COPIED!' : 'INVITE LINK'}</span>
          </button>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
          {playlist && playlist.tracks.length > 0 ? (
            playlist.tracks.map((t, idx) => (
              <div
                key={t.id}
                className="group flex items-center justify-between p-3 bg-[#0e0e12] hover:bg-[#181820] border border-[#1e1e26] hover:border-[#ff3e3e]/50 rounded-xl transition gap-3"
              >
                <div
                  onClick={() => handlePlayCollabTrack(t)}
                  className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                >
                  <span className="text-xs font-mono text-gray-500 w-5">{idx + 1}</span>
                  <div className="truncate">
                    <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[#ff3e3e] transition truncate">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-[#8c8c9e] truncate">
                      {t.artist} • <span className="text-gray-500">Added by {t.addedBy}</span>
                    </p>
                  </div>
                </div>

                {/* Reorder and Delete Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handlePlayCollabTrack(t)}
                    className="p-1.5 text-gray-400 hover:text-[#ff3e3e] transition"
                    title="Play track"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={() => handleMoveTrack(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20 transition"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleMoveTrack(idx, 'down')}
                    disabled={idx === playlist.tracks.length - 1}
                    className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20 transition"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleRemoveTrack(t.id)}
                    className="p-1.5 text-gray-400 hover:text-[#ff3e3e] transition"
                    title="Remove from playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-[#8c8c9e] space-y-2">
              <Disc className="w-10 h-10 mx-auto text-[#242430]" />
              <p className="text-sm font-medium">Shared playlist is empty</p>
              <p className="text-xs text-gray-500">Add songs from your library below to start collaborating!</p>
            </div>
          )}
        </div>

        {/* Add Track Action Drawer / Selector */}
        <div className="pt-3 border-t border-[#202028]">
          {!showAddMenu ? (
            <button
              onClick={() => setShowAddMenu(true)}
              className="w-full py-2.5 bg-[#ff3e3e]/15 hover:bg-[#ff3e3e]/25 border border-[#ff3e3e]/40 text-[#ff3e3e] rounded-xl text-xs font-mono font-bold tracking-wider transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>ADD TRACK FROM LIBRARY</span>
            </button>
          ) : (
            <div className="space-y-2 bg-[#0c0c0e] p-3 rounded-xl border border-[#242430]">
              <div className="flex items-center justify-between text-xs font-mono text-[#8c8c9e]">
                <span>SELECT TRACK TO SHARE:</span>
                <button onClick={() => setShowAddMenu(false)} className="text-[#ff3e3e] hover:underline">
                  Cancel
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {localTracks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleAddTrack(t)}
                    className="flex items-center justify-between p-2 hover:bg-[#1a1a24] rounded-lg cursor-pointer text-xs transition"
                  >
                    <span className="font-bold text-white truncate max-w-xs">{t.title}</span>
                    <span className="text-[#8c8c9e] font-mono">{t.artist}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
