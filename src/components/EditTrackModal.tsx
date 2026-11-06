import React, { useState } from 'react';
import { Track } from '../types/audio';
import { X, Edit3, Check } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface EditTrackModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (trackId: string, updates: Partial<Track>) => Promise<void>;
}

export const EditTrackModal: React.FC<EditTrackModalProps> = ({ track, isOpen, onClose, onSave }) => {
  if (!isOpen || !track) return null;

  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [album, setAlbum] = useState(track.album || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    haptic.eqTick();
    await onSave(track.id, {
      title: title.trim() || 'Untitled Track',
      artist: artist.trim() || 'Unknown Artist',
      album: album.trim() || 'Unknown Album',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#141418] border border-[#2a2a38] rounded-2xl p-6 text-[#f2efeb] shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#202028]">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[#ff3e3e]" />
            <h3 className="text-base font-bold font-brand tracking-wider uppercase">
              Edit Track Metadata
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-mono text-[#8c8c9e] mb-1">TRACK TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-[#242430] focus:border-[#ff3e3e] rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8c8c9e] mb-1">ARTIST</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-[#242430] focus:border-[#ff3e3e] rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8c8c9e] mb-1">ALBUM</label>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-[#242430] focus:border-[#ff3e3e] rounded-xl px-3.5 py-2 text-sm text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1e1e28] hover:bg-[#282836] text-xs font-mono rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white text-xs font-mono font-bold rounded-xl transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
