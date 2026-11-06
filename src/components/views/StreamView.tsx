import React, { useState, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import { Track } from '../../types/audio';
import {
  Search,
  History,
  X,
  Play,
  ListPlus,
  Heart,
  Radio,
  Sparkles,
  ExternalLink,
  Flame,
} from 'lucide-react';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  saveTrack,
} from '../../services/db';
import { haptic } from '../../utils/haptics';

interface StreamItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  views?: string;
}

const GENRE_PILLS = [
  'Top Global Hits',
  'Afrobeats',
  'Hip-Hop & Rap',
  'Lo-Fi Chill Beats',
  'Synthwave 80s',
  'Pop Anthems',
  'Electronic & EDM',
  'Rock Classics',
  'R&B Soul',
];

export const StreamView: React.FC = () => {
  const { playTrack, queue, activeTrack, isPlaying, toggleFavorite } = useAudio();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StreamItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeGenre, setActiveGenre] = useState<string>('Synthwave 80s');

  useEffect(() => {
    async function loadHistory() {
      const searches = await getRecentSearches();
      setRecentSearches(searches);
    }
    loadHistory();
    // Perform initial default search with first genre
    handleSearch('Synthwave 80s Cyberpunk');
  }, []);

  const handleSearch = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    haptic.eqTick();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (data && Array.isArray(data.results)) {
        setResults(data.results);
        // Save to recent searches
        const updated = await addRecentSearch(term);
        setRecentSearches(updated);
      }
    } catch (e) {
      console.warn('Stream search error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRecent = async (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    haptic.eqTick();
    const updated = await removeRecentSearch(term);
    setRecentSearches(updated);
  };

  const handleClearAllRecents = async () => {
    haptic.eqTick();
    await clearRecentSearches();
    setRecentSearches([]);
  };

  const streamItemToTrack = (item: StreamItem): Track => ({
    id: `stream-${item.id}`,
    title: item.title,
    artist: item.artist,
    album: 'YouTube Stream',
    duration: item.durationSeconds,
    format: 'STREAM',
    youtubeId: item.id,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    thumbnail: item.thumbnail,
    addedAt: Date.now(),
    playCount: 0,
    isFavorite: false,
  });

  const handleStreamNow = async (item: StreamItem) => {
    const track = streamItemToTrack(item);
    await saveTrack(track);
    playTrack(track);
  };

  const handleAddToQueue = async (item: StreamItem) => {
    haptic.eqTick();
    const track = streamItemToTrack(item);
    await saveTrack(track);
    // Queue is updated through audio context
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#ff3e3e]" />
          <h1 className="text-xl sm:text-2xl font-bold font-brand tracking-wider uppercase text-white">
            FREE MUSIC STREAMER
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#8c8c9e] mt-1 font-mono">
          Zero-Signup Streaming • Auto-Resolving 11-Char Video Stream Architecture
        </p>
      </div>

      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="relative flex items-center"
      >
        <Search className="absolute left-4 w-5 h-5 text-[#8c8c9e]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, YouTube links, or 11-char video IDs..."
          className="w-full bg-[#141418] border border-[#242432] focus:border-[#ff3e3e] rounded-2xl py-3.5 pl-12 pr-28 text-sm text-[#f2efeb] placeholder:text-[#6a6a7c] outline-none transition shadow-lg"
        />
        <button
          type="submit"
          className="absolute right-2 px-4 py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white font-mono text-xs font-bold rounded-xl transition shadow"
        >
          SEARCH
        </button>
      </form>

      {/* RECENT SEARCHES SECTION */}
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#8c8c9e]">
              <History className="w-3.5 h-3.5 text-[#ff3e3e]" />
              RECENT SEARCHES (LAST 5)
            </span>
            <button
              onClick={handleClearAllRecents}
              className="text-gray-500 hover:text-[#ff3e3e] transition text-[11px]"
            >
              Clear all
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {recentSearches.map((term) => (
              <div
                key={term}
                onClick={() => {
                  setQuery(term);
                  handleSearch(term);
                }}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-[#141418] hover:bg-[#1e1e26] border border-[#242430] hover:border-[#ff3e3e] rounded-xl text-xs font-mono text-gray-300 hover:text-white cursor-pointer transition select-none shadow-sm"
              >
                <span>{term}</span>
                <button
                  onClick={(e) => handleRemoveRecent(e, term)}
                  className="p-0.5 text-gray-500 hover:text-[#ff3e3e] transition"
                  aria-label={`Remove recent search for ${term}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-Curated Genre Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {GENRE_PILLS.map((genre) => {
          const isSelected = activeGenre === genre;
          return (
            <button
              key={genre}
              onClick={() => {
                setActiveGenre(genre);
                setQuery(genre);
                handleSearch(genre);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition border ${
                isSelected
                  ? 'bg-[#ff3e3e] text-white border-[#ff3e3e] font-bold shadow-md shadow-[#ff3e3e]/30'
                  : 'bg-[#141418] text-gray-400 border-[#242430] hover:text-white hover:border-[#333344]'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {/* Results Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-[#8c8c9e] uppercase tracking-wider">
            {isLoading ? 'RESOLVING VIDEO STREAMS...' : `RESOLVED RESULTS (${results.length})`}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-28 bg-[#141418] border border-[#202028] rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item) => {
              const isPlayingThis = isPlaying && activeTrack?.youtubeId === item.id;

              return (
                <div
                  key={item.id}
                  className="group relative bg-[#141418] border border-[#22222e] hover:border-[#ff3e3e] rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-[#ff3e3e]/10 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {/* High-Res Video Thumbnail */}
                    <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-[#1c1c24] shrink-0 border border-[#282836]">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[9px] px-1 py-0.2 rounded text-white font-bold">
                        {item.duration}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#ff3e3e] transition line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-[#8c8c9e] mt-1 truncate">
                        {item.artist}
                      </p>
                      {item.views && (
                        <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                          {item.views}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1e1e28]">
                    <span className="text-[10px] font-mono text-[#ff3e3e] font-bold">
                      ID: {item.id}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStreamNow(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff3e3e] hover:bg-[#e03030] text-white rounded-lg text-xs font-mono font-bold transition shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>STREAM</span>
                      </button>

                      <button
                        onClick={() => handleAddToQueue(item)}
                        className="p-1.5 bg-[#1e1e28] hover:bg-[#282836] text-gray-300 hover:text-white rounded-lg transition"
                        title="Add to queue"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-[#8c8c9e] bg-[#121216] border border-[#202028] rounded-3xl p-8 space-y-3">
            <Radio className="w-10 h-10 text-[#2c2c38] mx-auto" />
            <p className="text-sm font-medium text-gray-300">No stream results found</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Try searching with artist names, track titles, or paste direct YouTube URLs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
