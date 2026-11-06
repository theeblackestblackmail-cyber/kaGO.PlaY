import React, { useState, useRef, useMemo } from 'react';
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
  Folder,
  FolderOpen,
  FolderPlus,
  FileAudio,
  Shuffle,
  ArrowLeft,
  CheckCircle2,
  Music,
} from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { EditTrackModal } from '../EditTrackModal';
import { CreatePlaylistModal } from '../CreatePlaylistModal';
import { CollaborativePlaylistModal } from '../CollaborativePlaylistModal';
import { savePlaylist } from '../../services/db';
import { groupTracksByFolder, FolderGroup } from '../../utils/folderHelper';

export const LibraryView: React.FC = () => {
  const {
    tracks,
    playlists,
    activeTrack,
    playTrack,
    toggleFavorite,
    removeTrack,
    editTrackMeta,
    refreshPlaylists,
    importTracks,
  } = useAudio();

  const [activeTab, setActiveTab] = useState<LibrarySubTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<Track | null>(null);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [activeCollabPlaylistId, setActiveCollabPlaylistId] = useState<string | null>(null);
  const [selectedTrackMenuId, setSelectedTrackMenuId] = useState<string | null>(null);
  const [selectedPlaylistView, setSelectedPlaylistView] = useState<Playlist | null>(null);
  const [selectedFolderView, setSelectedFolderView] = useState<FolderGroup | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Hidden file inputs
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const songInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album && t.album.toLowerCase().includes(q)) ||
        (t.folder && t.folder.toLowerCase().includes(q));
      if (!matchesQuery) return false;

      if (activeTab === 'favorites') {
        return t.isFavorite;
      }
      return true;
    });
  }, [tracks, searchQuery, activeTab]);

  // Group by Albums
  const albumGroups = useMemo(() => {
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

  // Group by Folders (using helper)
  const folderGroups = useMemo(() => {
    return groupTracksByFolder(tracks);
  }, [tracks]);

  // Filtered folders by search query
  const filteredFolderGroups = useMemo(() => {
    if (!searchQuery.trim()) return folderGroups;
    const q = searchQuery.toLowerCase();
    return folderGroups.filter(
      (grp) =>
        grp.folder.toLowerCase().includes(q) ||
        grp.tracks.some((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    );
  }, [folderGroups, searchQuery]);

  // Group by Artists
  const artistGroups = useMemo(() => {
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

  const showNotification = (msg: string) => {
    setImportNotice(msg);
    setTimeout(() => {
      setImportNotice((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  // Pick Folder handler: uses File System Access API with fallback to input webkitdirectory
  const handlePickFolder = async () => {
    haptic.eqTick();
    if ('showDirectoryPicker' in window) {
      try {
        setIsImporting(true);
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];

        async function scanDir(entry: any) {
          for await (const [, handle] of entry.entries()) {
            if (handle.kind === 'file') {
              const file = await handle.getFile();
              if (file.name.match(/\.(mp3|wav|flac|ogg|m4a|aac)$/i) || file.type.startsWith('audio/')) {
                files.push(file);
              }
            } else if (handle.kind === 'directory') {
              await scanDir(handle);
            }
          }
        }

        await scanDir(dirHandle);

        if (files.length > 0) {
          const folderName = dirHandle.name || 'Selected Folder';
          const count = await importTracks(files, folderName);
          showNotification(`Imported ${count} track${count > 1 ? 's' : ''} from "${folderName}" folder!`);
          setActiveTab('folders');
          setSelectedFolderView(null);
        } else {
          showNotification('No audio files (.mp3, .wav, .flac) found in the selected folder.');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('showDirectoryPicker fallback:', err);
          folderInputRef.current?.click();
        }
      } finally {
        setIsImporting(false);
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  // Hidden folder input fallback change handler
  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsImporting(true);
    const files = Array.from(fileList);
    // Determine top folder name from webkitRelativePath
    const firstRel = files[0]?.webkitRelativePath;
    const folderName = firstRel ? firstRel.split('/')[0] : 'Device Folder';

    const count = await importTracks(files, folderName);
    showNotification(`Imported ${count} track${count > 1 ? 's' : ''} into "${folderName}" folder!`);
    setIsImporting(false);
    setActiveTab('folders');
    setSelectedFolderView(null);
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  // Pick individual song handler
  const handlePickSong = () => {
    haptic.eqTick();
    songInputRef.current?.click();
  };

  const handleSongInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsImporting(true);
    const files = Array.from(fileList);
    const count = await importTracks(files, 'Device Music');
    showNotification(`Added ${count} audio track${count > 1 ? 's' : ''} to Library!`);
    setIsImporting(false);
    if (songInputRef.current) songInputRef.current.value = '';
  };

  const handleCreatePlaylist = async (newPl: Playlist) => {
    await savePlaylist(newPl);
    await refreshPlaylists();
  };

  const handleAddTrackToPlaylist = async (trackId: string, playlistId: string) => {
    haptic.eqTick();
    const pl = playlists.find((p) => p.id === playlistId);
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
      {/* Hidden File Inputs for Pick Folder & Pick Song */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderInputChange}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={songInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
        multiple
        onChange={handleSongInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* View Header with Top Action Buttons: PICK FOLDER & PICK SONG */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-brand tracking-wider uppercase text-white">
            AUDIO LIBRARY
          </h1>
          <p className="text-xs sm:text-sm text-[#8c8c9e] font-mono mt-0.5">
            IndexedDB Local Audio Blobs & Folders Registry
          </p>
        </div>

        {/* Top Actions: PICK FOLDER & PICK SONG */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePickFolder}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ff3e3e]/15 hover:bg-[#ff3e3e]/25 border border-[#ff3e3e]/40 text-[#ff3e3e] rounded-xl text-xs font-mono font-bold tracking-wider transition active:scale-95 disabled:opacity-50"
            aria-label="Pick Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>{isImporting ? 'SCANNING...' : 'PICK FOLDER'}</span>
          </button>

          <button
            onClick={handlePickSong}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a1a24] hover:bg-[#222230] border border-[#2a2a38] text-white rounded-xl text-xs font-mono font-bold tracking-wider transition active:scale-95 disabled:opacity-50"
            aria-label="Pick Song"
          >
            <FileAudio className="w-3.5 h-3.5 text-[#ff3e3e]" />
            <span>PICK SONG</span>
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importNotice && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-mono text-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importNotice}</span>
          </div>
          <button
            onClick={() => setImportNotice(null)}
            className="text-gray-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub Tabs Bar: All Songs, Folders, Playlists, Albums, Artists, Favorites */}
      <div className="flex items-center gap-2 border-b border-[#202028] pb-2 overflow-x-auto">
        {(['all', 'folders', 'playlists', 'albums', 'artists', 'favorites'] as LibrarySubTab[]).map((tab) => {
          let label: string = tab;
          if (tab === 'all') label = `All Songs (${tracks.length})`;
          if (tab === 'folders') label = `Folders (${folderGroups.length})`;
          if (tab === 'playlists') label = `Playlists (${playlists.length})`;
          if (tab === 'albums') label = `Albums (${albumGroups.length})`;
          if (tab === 'artists') label = `Artists (${artistGroups.length})`;
          if (tab === 'favorites') label = `Favorites (${tracks.filter((t) => t.isFavorite).length})`;

          return (
            <button
              key={tab}
              onClick={() => {
                haptic.eqTick();
                setActiveTab(tab);
                setSelectedPlaylistView(null);
                setSelectedFolderView(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#ff3e3e] text-white shadow-md shadow-[#ff3e3e]/25'
                  : 'text-[#8c8c9e] hover:text-white hover:bg-[#16161c]'
              }`}
            >
              {label}
            </button>
          );
        })}
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
                        {track.folder && (
                          <span className="text-gray-500 ml-1">[{track.folder}]</span>
                        )}
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
            <div className="py-16 text-center text-[#8c8c9e] bg-[#121216] border border-[#1e1e26] rounded-2xl p-8 space-y-3">
              <Disc className="w-10 h-10 text-[#242430] mx-auto" />
              <p className="text-sm font-medium">No tracks found</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handlePickFolder}
                  className="px-4 py-2 bg-[#ff3e3e]/20 hover:bg-[#ff3e3e]/30 border border-[#ff3e3e]/50 text-[#ff3e3e] text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>PICK FOLDER</span>
                </button>
                <button
                  onClick={handlePickSong}
                  className="px-4 py-2 bg-[#1e1e28] hover:bg-[#282836] border border-[#2e2e3e] text-white text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <FileAudio className="w-3.5 h-3.5 text-[#ff3e3e]" />
                  <span>PICK SONG</span>
                </button>
              </div>
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

      {/* ----------------- SUB TAB 3: FOLDERS (NEXT TO ALBUMS) ----------------- */}
      {activeTab === 'folders' && (
        <div className="space-y-4">
          {/* Detailed Folder View (if user opened a specific folder) */}
          {selectedFolderView ? (
            <div className="space-y-4 animate-in fade-in">
              <button
                onClick={() => setSelectedFolderView(null)}
                className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition group mb-2"
              >
                <ArrowLeft className="w-4 h-4 text-[#ff3e3e] group-hover:-translate-x-1 transition-transform" />
                <span>BACK TO ALL FOLDERS</span>
              </button>

              {/* Folder Banner */}
              <div className="bg-[#141418] border border-[#22222c] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 text-[#ff3e3e] flex items-center justify-center shadow-lg">
                    <FolderOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold font-brand text-white">
                      {selectedFolderView.folder}
                    </h2>
                    <p className="text-xs text-[#8c8c9e] font-mono mt-0.5">
                      {selectedFolderView.count} track{selectedFolderView.count > 1 ? 's' : ''} •{' '}
                      {formatDuration(selectedFolderView.totalDuration)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playTrack(selectedFolderView.tracks[0], selectedFolderView.tracks)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white rounded-xl text-xs font-mono font-bold tracking-wider transition shadow-md shadow-[#ff3e3e]/30"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>PLAY ALL</span>
                  </button>

                  <button
                    onClick={() => {
                      const shuffled = [...selectedFolderView.tracks].sort(() => Math.random() - 0.5);
                      playTrack(shuffled[0], shuffled);
                    }}
                    className="p-2 bg-[#1e1e28] hover:bg-[#282836] border border-[#2e2e3e] text-gray-300 hover:text-white rounded-xl transition"
                    title="Shuffle Folder"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Folder Tracks List */}
              <div className="space-y-2">
                {selectedFolderView.tracks.map((track, idx) => {
                  const isCur = activeTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(track, selectedFolderView.tracks)}
                      className={`group flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                        isCur
                          ? 'bg-[#ff3e3e]/15 border-[#ff3e3e]/60 shadow-md'
                          : 'bg-[#121216] border-[#1e1e26] hover:border-[#ff3e3e]/40 hover:bg-[#181820]'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate flex-1 min-w-0">
                        <span className="text-xs font-mono text-gray-500 w-5 text-right shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[#ff3e3e] transition truncate">
                            {track.title}
                          </p>
                          <p className="text-[11px] text-[#8c8c9e] truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-[#8c8c9e]">
                          {formatDuration(track.duration || 180)}
                        </span>
                        <Play className="w-4 h-4 text-gray-500 group-hover:text-[#ff3e3e] transition" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Main Folders Grid */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#8c8c9e] uppercase">
                  Folders ({filteredFolderGroups.length})
                </span>
                <button
                  onClick={handlePickFolder}
                  className="flex items-center gap-1.5 text-xs font-mono text-[#ff3e3e] hover:underline"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>UPLOAD ANOTHER FOLDER</span>
                </button>
              </div>

              {filteredFolderGroups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredFolderGroups.map((grp) => (
                    <div
                      key={grp.folder}
                      onClick={() => {
                        haptic.eqTick();
                        setSelectedFolderView(grp);
                      }}
                      className="group cursor-pointer bg-[#141418] border border-[#22222c] hover:border-[#ff3e3e] rounded-2xl p-4 flex flex-col justify-between transition-all space-y-4 hover:shadow-lg hover:shadow-[#ff3e3e]/10"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-[#ff3e3e]/15 border border-[#ff3e3e]/30 flex items-center justify-center text-[#ff3e3e] group-hover:scale-105 transition-transform">
                          <Folder className="w-6 h-6" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(grp.tracks[0], grp.tracks);
                          }}
                          className="p-2.5 rounded-xl bg-[#1e1e28] hover:bg-[#ff3e3e] text-gray-300 hover:text-white transition shadow"
                          title="Play Folder"
                          aria-label={`Play ${grp.folder} folder`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-[#ff3e3e] transition truncate">
                          {grp.folder}
                        </h3>
                        <p className="text-xs text-[#8c8c9e] font-mono mt-0.5">
                          {grp.count} tracks • {formatDuration(grp.totalDuration)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-[#8c8c9e] bg-[#121216] border border-[#1e1e26] rounded-2xl p-8 space-y-3">
                  <Folder className="w-12 h-12 text-[#242430] mx-auto" />
                  <p className="text-sm font-medium">No music folders scanned yet</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Click "Pick Folder" above to scan your music directory with client-side privacy.
                  </p>
                  <button
                    onClick={handlePickFolder}
                    className="mt-2 px-5 py-2.5 bg-[#ff3e3e] hover:bg-[#e03030] text-white text-xs font-mono font-bold tracking-wider rounded-xl transition inline-flex items-center gap-2 shadow-lg shadow-[#ff3e3e]/25"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>PICK A MUSIC FOLDER</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------- SUB TAB 4: ARTISTS ----------------- */}
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

      {/* ----------------- SUB TAB 5: PLAYLISTS ----------------- */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          {/* Header Row with "+ NEW PLAYLIST" Button Moved Here */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-brand tracking-wider uppercase text-white">
                Playlists & Sessions
              </h2>
              <p className="text-[11px] text-[#8c8c9e] font-mono">
                {playlists.length} Custom Playlist{playlists.length !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={() => setIsCreatePlaylistOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white rounded-xl text-xs font-mono font-bold tracking-wider transition shadow-md shadow-[#ff3e3e]/25 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW PLAYLIST</span>
            </button>
          </div>

          {/* Featured Live Collaborative Playlists Banner */}
          <div className="bg-gradient-to-r from-[#1c1c28] via-[#161620] to-[#0c0c0e] border border-[#ff3e3e]/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
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
                  Real-time collaborative session. Invite friends to add, reorder, and stream audio together.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveCollabPlaylistId('cyber-collab-01')}
              className="px-4 py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white text-xs font-mono font-bold tracking-wider rounded-xl transition shadow whitespace-nowrap active:scale-95"
            >
              JOIN SESSION
            </button>
          </div>

          {/* User Custom Playlists Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create New Playlist Card Trigger */}
            <div
              onClick={() => setIsCreatePlaylistOpen(true)}
              className="group cursor-pointer border-2 border-dashed border-[#2a2a38] hover:border-[#ff3e3e]/70 bg-[#121216]/50 hover:bg-[#16161c] rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 min-h-[140px] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1e1e28] group-hover:bg-[#ff3e3e] text-gray-400 group-hover:text-white flex items-center justify-center transition shadow">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#ff3e3e] transition">
                  Create Playlist
                </h4>
                <p className="text-[10px] text-[#8c8c9e] font-mono">Curate your audio mix</p>
              </div>
            </div>

            {playlists.map((pl) => {
              const count = pl.trackIds.length;
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
                    if (plTracks.length > 0) {
                      playTrack(plTracks[0], plTracks);
                    }
                  }}
                  className="group cursor-pointer bg-[#141418] border border-[#22222c] hover:border-[#ff3e3e] rounded-2xl p-4 flex flex-col justify-between transition-all space-y-3 min-h-[140px]"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow"
                      style={{ backgroundColor: pl.color || '#ff3e3e' }}
                    >
                      <ListMusic className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-gray-400">
                      {count} song{count !== 1 ? 's' : ''}
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
