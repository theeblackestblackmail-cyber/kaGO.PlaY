import React, { useState } from 'react';
import { Playlist } from '../types/audio';
import { X, ListMusic, Plus } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (playlist: Playlist) => Promise<void>;
}

const COLOR_OPTIONS = ['#ff3e3e', '#f43f5e', '#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ isOpen, onClose, onCreate }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    haptic.eqTick();

    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description.trim(),
      color,
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await onCreate(newPlaylist);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#141418] border border-[#2a2a38] rounded-2xl p-6 text-[#f2efeb] shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#202028]">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-[#ff3e3e]" />
            <h3 className="text-base font-bold font-brand tracking-wider uppercase">
              Create New Playlist
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-mono text-[#8c8c9e] mb-1">PLAYLIST NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cyberpunk Overdrive Stems"
              className="w-full bg-[#0c0c0e] border border-[#242430] focus:border-[#ff3e3e] rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8c8c9e] mb-1">DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this collection..."
              className="w-full bg-[#0c0c0e] border border-[#242430] focus:border-[#ff3e3e] rounded-xl px-3.5 py-2 text-sm text-white outline-none h-20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8c8c9e] mb-2">THEME COLOR</label>
            <div className="flex items-center gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-125 border-white shadow-lg' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1e1e28] hover:bg-[#282836] text-xs font-mono rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-[#ff3e3e] hover:bg-[#e03030] text-white text-xs font-mono font-bold rounded-xl transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Playlist</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
