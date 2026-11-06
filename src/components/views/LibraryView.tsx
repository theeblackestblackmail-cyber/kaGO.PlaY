import React, { useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { Track, Playlist, LibrarySubTab } from '../../types/audio';
import {
  Search,
  Play,
  Heart,
  MoreVertical,
  Plus,
  Users,
  Disc,
  Mic2,
  ListMusic,
  Trash2,
  Edit,
  Clock,
  Sparkles,
  Share2,
} from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { EditTrackModal } from '../EditTrackModal';
import { CreatePlaylistModal } from '../CreatePlaylistModal';
import { CollaborativePlaylistModal } from '../CollaborativePlaylistModal';
import { savePlaylist } from '../../services/db';

export const LibraryView: React.FC = () => {
  const {
    tracks,
    playlists,
    activeTrack,
    isPlaying,
    playTrack,
    toggleFavorite,
    removeTrack,
    editTrackMeta,
    refreshPlaylists,
  } = useAudio();

  const [activeTab, setActiveTab] = useState<LibrarySubTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<Track | null>(null);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [activeCollabPlaylistId, setActiveCollabPlaylistId] = useState<string | null>(null);
  const [selectedTrackMenuId, setSelectedTrackMenuId] = useState<string | null>(null);
  const [selectedPlaylistView, setSelectedPlaylistView] = useState<Playlist | null>(null);

  // Filtered tracks
  const filteredTracks = tracks.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || (t.album && t.album.toLowerCase().includes(q));
    if (!matchesQuery) return false;

    if (activeTab === 'favorites') {
      return t.isFavorite;
    }
    return true;
  });

  // Group by Albums
  const albumGroups = React.useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const t of tracks) {
      const album = t.album || 'Unknown Album';
      if (!map.has(album)) map.set(album, []);
      map.get(album)!.push(t);
    }
    return Array.from(map.entries()).map(([album, trks]) => ({
      album,
      artist: trks[0]?.artist || 'Various Artists',
      tracks: trks,
      count: trks.length,
    }));
  }, [tracks]);

  // Group by Artists
  const artistGroups = React.useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const t of tracks) {
      const artist = t.artist || 'Unknown Artist';
      if (!map.has(artist)) map.set(artist, []);
      map.get(artist)!.push(t);
    }
    return Array.from(map.entries()).map(([artist, trks]) => ({
      artist,
      tracks: trks,
      count: trks.length,
      totalDuration: trks.reduce((acc, cur) => acc + (cur.duration || 180), 0),
    }));
  }, [tracks]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCreatePlaylist = async (newPl: Playlist) => {
    await savePlaylist(newPl);
    await refreshPlaylists();
  };

  const handleAddTrackToPlaylist = async (trackId: string, playlistId: string) => {
    haptic.eqTick();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl && !pl.trackIds.includes(trackId)) {
      const updated: Playlist = {
        ...pl,
        trackIds: [...pl.trackIds, trackId],
        updatedAt: Date.now(),
      };
      await savePlaylist(updated);
      await refreshPlaylists();
    }
    setSelectedTrackMenuId(null);
  };

  return (
    <div className="space-y-6 pb-32">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-brand tracking-wider uppercase text-white">
            AUDIO LIBRARY
          </h1>
          <p className="text-xs sm:text-sm text-[#8c8c9e] font-mono mt-0.5">
            IndexedDB Local Audio Blobs & Synchronized Stream Registry
          </p>
        </div>

        {/* Create Playlist / New Collab Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCollabPlaylistId('cyber-collab-01')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ff3e3e]/15 hover:bg-[#ff3e3e]/25 border border-[#ff3e3e]/40 text-[#ff3e3e] rounded-xl text-xs font-mono font-bold tracking-wider transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>LIVE COLLAB JAM</span>
          </button>

          <button
            onClick={() => setIsCreatePlaylistOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a1a24] hover:bg-[#222230] border border-[#2a2a38] text-white rounded-xl text-xs font-mono font-bold tracking-wider transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#ff3e3e]" />
            <span>NEW PLAYLIST</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#202028] pb-2 overflow-x-auto">
        {(['all', 'albums', 'artists', 'playlists', 'favorites'] as LibrarySubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              haptic.eqTick();
              setActiveTab(tab);
              setSelectedPlaylistView(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition whitespace-nowrap ${
              activeTab === tab
                ? 'bg-[#ff3e3e] text-white shadow-md shadow-[#ff3e3e]/25'
                : 'text-[#8c8c9e] hover:text-white hover:bg-[#16161c]'
            }`}
          >
            {tab === 'all' ? `All Songs (${tracks.length})` : tab}
          </button>
        ))}
      </div>

      {/* Filter / Search within Library */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#8c8c9e]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Filter ${activeTab}...`}
          className="w-full bg-[#141418] border border-[#22222c] focus:border-[#ff3e3e] rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-white placeholder:text-[#6a6a7c] outline-none"
        />
      </div>

      {/* ----------------- SUB TAB 1: ALL SONGS & FAVORITES ----------------- */}
      {(activeTab === 'all' || activeTab === 'favorites') && (
        <div className="space-y-2">
          {filteredTracks.length > 0 ? (
            filteredTracks.map((track, idx) => {
              const isCur = activeTrack?.id === track.id;
              const isMenuOpen = selectedTrackMenuId === track.id;

              return (
                <div
                  key={track.id}
                  className={`group relative flex items-center justify-between p-3 rounded-2xl border transition ${
                    isCur
                      ? 'bg-[#ff3e3e]/15 border-[#ff3e3e]/60 shadow-md'
                      : 'bg-[#121216] border-[#1e1e26] hover:border-[#ff3e3e]/40 hover:bg-[#181820]'
                  }`}
                >
                  {/* Track Left: Number / Play / Title */}
                  <div
                    onClick={() => playTrack(track, filteredTracks)}
                    className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                  >
                    <span className="text-xs font-mono text-gray-500 w-5 text-right shrink-0">
                      {idx + 1}
                    </span>

                    <div className="relative w-10 h-10 rounded-xl bg-[#1c1c24] border border-[#282834] flex items-center justify-center shrink-0 overflow-hidden">
                      {track.thumbnail ? (
                        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                        <Disc className="w-5 h-5 text-[#ff3e3e]" />
                      )}
                    </div>

                    <div className="truncate">
                      <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[#ff3e3e] transition truncate">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-[#8c8c9e] truncate">
                        {track.artist} • <span className="text-gray-500">{track.album || 'Unknown Album'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Track Right: Format / Duration / Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#1e1e28] text-gray-400 font-bold hidden xs:inline">
                      {track.format}
                    </span>

                    <span className="text-xs font-mono text-[#8c8c9e] w-12 text-right">
                      {formatDuration(track.duration || 180)}
                    </span>

                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(track.id)}
                      className="p-1.5 text-gray-400 hover:text-[#ff3e3e] transition"
                      aria-label="Toggle Favorite"
                    >
                      <Heart
                        className={`w-4 h-4 ${track.isFavorite ? 'fill-[#ff3e3e] text-[#ff3e3e]' : ''}`}
                      />
                    </button>

                    {/* Context Menu Button */}
                    <div className="relative">
                      <button
                        onClick={() => setSelectedTrackMenuId(isMenuOpen ? null : track.id)}
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg transition"
                        aria-label="Track options menu"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 top-8 z-30 w-48 bg-[#181820] border border-[#2a2a38] rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in">
                          <button
                            onClick={() => {
                              setSelectedTrackForEdit(track);
                              setSelectedTrackMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#22222e] rounded-lg transition text-left"
                          >
                            <Edit className="w-3.5 h-3.5 text-[#ff3e3e]" />
                            <span>Edit Metadata</span>
                          </button>

                          {/* Add to Playlist sub-actions */}
                          {playlists.length > 0 && (
                            <div className="border-t border-[#252532] pt-1">
                              <span className="px-3 py-1 text-[10px] font-mono text-gray-500 uppercase block">
                                Add to Playlist:
                              </span>
                              {playlists.map((pl) => (
                                <button
                                  key={pl.id}
                                  onClick={() => handleAddTrackToPlaylist(track.id, pl.id)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#22222e] rounded-lg transition text-left truncate"
                                >
                                  <ListMusic className="w-3.5 h-3.5 text-[#ff3e3e]" />
                                  <span className="truncate">{pl.name}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="border-t border-[#252532] pt-1">
                            <button
                              onClick={() => {
                                removeTrack(track.id);
                                setSelectedTrackMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Track</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-[#8c8c9e] bg-[#121216] border border-[#1e1e26] rounded-2xl p-8 space-y-2">
              <Disc className="w-10 h-10 text-[#242430] mx-auto" />
              <p className="text-sm font-medium">No tracks found</p>
              <p className="text-xs text-gray-500">Import music folders or stream from YouTube above.</p>
            </div>
          )}
        </div>
      )}

      {/* ----------------- SUB TAB 2: ALBUMS ----------------- */}
      {activeTab === 'albums' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {albumGroups.map((grp) => (
            <div
              key={grp.album}
              onClick={() => playTrack(grp.tracks[0], grp.tracks)}
              className="group cursor-pointer bg-[#141418] border border-[#22222c] hover:border-[#ff3e3e] rounded-2xl p-4 flex flex-col justify-between transition-all space-y-3"
            >
              <div className="relative aspect-square w-full rounded-xl bg-gradient-to-tr from-[#161620] via-[#242432] to-[#ff3e3e]/30 border border-[#2e2e3e] flex items-center justify-center overflow-hidden">
                <Disc className="w-16 h-16 text-[#ff3e3e]/60 group-hover:scale-110 transition-transform" />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white">
                  {grp.count} tracks
                </div>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#ff3e3e] transition truncate">
                  {grp.album}
                </h3>
                <p className="text-[11px] text-[#8c8c9e] truncate">{grp.artist}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ----------------- SUB TAB 3: ARTISTS ----------------- */}
      {activeTab === 'artists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artistGroups.map((grp) => (
            <div
              key={grp.artist}
              onClick={() => playTrack(grp.tracks[0], grp.tracks)}
              className="group cursor-pointer bg-[#141418] border border-[#22222c] hover:border-[#ff3e3e] rounded-2xl p-4 flex items-center justify-between transition"
            >
              <div className="flex items-center gap-3 truncate">
                <div className="w-12 h-12 rounded-full bg-[#1c1c24] border border-[#ff3e3e]/40 flex items-center justify-center shrink-0">
                  <Mic2 className="w-6 h-6 text-[#ff3e3e]" />
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#ff3e3e] transition truncate">
                    {grp.artist}
                  </h3>
                  <p className="text-xs text-[#8c8c9e] font-mono">
                    {grp.count} tracks • {formatDuration(grp.totalDuration)}
                  </p>
                </div>
              </div>
              <Play className="w-4 h-4 text-gray-500 group-hover:text-[#ff3e3e] transition shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* ----------------- SUB TAB 4: PLAYLISTS ----------------- */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          {/* Featured Live Collaborative Playlists Banner */}
          <div className="bg-gradient-to-r from-[#1c1c28] via-[#161620] to-[#0c0c0e] border border-[#ff3e3e]/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-[#ff3e3e] text-white rounded-xl shadow-lg shadow-[#ff3e3e]/40">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-brand tracking-wider uppercase text-white">
                    Live Collaborative Audio Jam
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-[#8c8c9e] mt-0.5">
                  Real-time collaborative playlist. Invite friends to add, reorder, and stream together.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveCollabPlaylistId('cyber-collab-01')}
              className="px-4 py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white text-xs font-mono font-bold tracking-wider rounded-xl transition shadow"
            >
              JOIN SESSION
            </button>
          </div>

          {/* User Custom Playlists Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((pl) => {
              const count = pl.trackIds.length;
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    const plTracks = tracks.filter(t => pl.trackIds.includes(t.id));
                    if (plTracks.length > 0) {
                      playTrack(plTracks[0], plTracks);
                    }
                  }}
                  className="group cursor-pointer bg-[#141418] border border-[#22222c] hover:border-[#ff3e3e] rounded-2xl p-4 flex flex-col justify-between transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow"
                      style={{ backgroundColor: pl.color || '#ff3e3e' }}
                    >
                      <ListMusic className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-gray-400">
                      {count} songs
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#ff3e3e] transition">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-[#8c8c9e] mt-1 line-clamp-2">
                      {pl.description || 'Personal playlist collection'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      <EditTrackModal
        track={selectedTrackForEdit}
        isOpen={!!selectedTrackForEdit}
        onClose={() => setSelectedTrackForEdit(null)}
        onSave={editTrackMeta}
      />

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreate={handleCreatePlaylist}
      />

      {/* Live Collaborative Session Modal */}
      {activeCollabPlaylistId && (
        <CollaborativePlaylistModal
          isOpen={!!activeCollabPlaylistId}
          onClose={() => setActiveCollabPlaylistId(null)}
          playlistId={activeCollabPlaylistId}
        />
      )}
    </div>
  );
};
