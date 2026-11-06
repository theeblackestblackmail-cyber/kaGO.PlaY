import React, { useState, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import {
  FolderDown,
  Upload,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Sparkles,
  Zap,
} from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { createDefaultDemoTracks } from '../../utils/proceduralTracks';
import { saveTrack } from '../../services/db';

export const ImportView: React.FC = () => {
  const { importTracks, refreshTracks, setCurrentView } = useAudio();
  const [isScanning, setIsScanning] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modern File System Access API (showDirectoryPicker)
  const handleDirectoryPicker = async () => {
    haptic.eqTick();
    if ('showDirectoryPicker' in window) {
      try {
        setIsScanning(true);
        setImportSummary(null);

        // Request directory handle
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
          const count = await importTracks(files);
          setImportSummary(`Successfully imported and sanitized ${count} audio track${count > 1 ? 's' : ''} from folder!`);
        } else {
          setImportSummary('No supported audio files (.mp3, .wav, .flac) found in the selected folder.');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('showDirectoryPicker error:', err);
          // Fallback to standard input
          fileInputRef.current?.click();
        }
      } finally {
        setIsScanning(false);
      }
    } else {
      // Browser fallback (e.g. mobile Safari / older browsers)
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsScanning(true);
    setImportSummary(null);

    const files = Array.from(fileList);
    const count = await importTracks(files);
    setImportSummary(`Successfully imported and sanitized ${count} audio track${count > 1 ? 's' : ''}!`);
    setIsScanning(false);
  };

  // Drag and drop handler
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles: File[] = [];
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.name.match(/\.(mp3|wav|flac|ogg|m4a|aac)$/i) || file.type.startsWith('audio/')) {
          droppedFiles.push(file);
        }
      }
    }

    if (droppedFiles.length > 0) {
      setIsScanning(true);
      const count = await importTracks(droppedFiles);
      setImportSummary(`Imported ${count} track${count > 1 ? 's' : ''} via drag-and-drop!`);
      setIsScanning(false);
    }
  };

  // Seed / Regenerate demo tracks
  const handleRecreateDemoStems = async () => {
    haptic.eqTick();
    setIsScanning(true);
    setImportSummary('Generating procedural cyberpunk synthwave stems in Web Audio...');
    try {
      const demoTracks = await createDefaultDemoTracks();
      for (const t of demoTracks) {
        await saveTrack(t);
      }
      await refreshTracks();
      setImportSummary(`Generated ${demoTracks.length} procedural audio tracks stored in IndexedDB!`);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-32">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <FolderDown className="w-5 h-5 text-[#ff3e3e]" />
          <h1 className="text-xl sm:text-2xl font-bold font-brand tracking-wider uppercase text-white">
            DEVICE MUSIC FOLDER SCANNER
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#8c8c9e] font-mono mt-0.5">
          100% Client-Side Privacy • ID3 Tag & Mojibake Sanitizer • No Server Uploads
        </p>
      </div>

      {/* Main Drag & Drop / Directory Picker Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition flex flex-col items-center justify-center space-y-4 ${
          isDragOver
            ? 'border-[#ff3e3e] bg-[#ff3e3e]/10 scale-[1.01]'
            : 'border-[#2a2a38] bg-[#141418] hover:border-[#ff3e3e]/60'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-[#1e1e28] border border-[#2a2a38] flex items-center justify-center text-[#ff3e3e] shadow-xl">
          <HardDrive className="w-8 h-8" />
        </div>

        <div className="max-w-md space-y-1">
          <h2 className="text-lg font-bold font-brand text-white">
            Select Music Folder or Drop Audio Files
          </h2>
          <p className="text-xs text-[#8c8c9e] leading-relaxed">
            Scan your device's music library. Filenames like <code className="text-[#ff3e3e]">01 - Drake - Hotline Bling [Official Audio].mp3</code> are automatically cleaned into pure song and artist metadata.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
          <button
            onClick={handleDirectoryPicker}
            disabled={isScanning}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff3e3e] hover:bg-[#e03030] text-white font-mono text-xs font-bold tracking-wider rounded-xl shadow-lg shadow-[#ff3e3e]/30 transition disabled:opacity-50"
          >
            <FolderDown className="w-4 h-4" />
            <span>{isScanning ? 'SCANNING FOLDER...' : 'BATCH SCAN FOLDER'}</span>
          </button>

          <label className="flex items-center gap-2 px-5 py-3 bg-[#1e1e28] hover:bg-[#282836] border border-[#2e2e3e] text-gray-200 hover:text-white font-mono text-xs font-medium rounded-xl cursor-pointer transition">
            <Upload className="w-4 h-4 text-[#ff3e3e]" />
            <span>SELECT AUDIO FILES</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Formats Supported Badge */}
        <div className="flex items-center gap-2 pt-2 text-[10px] font-mono text-gray-500">
          <span>SUPPORTED FORMATS:</span>
          {['MP3', 'WAV', 'FLAC', 'AAC', 'OGG', 'M4A'].map((f) => (
            <span key={f} className="px-1.5 py-0.5 rounded bg-[#1e1e28] text-gray-400">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Import Status Alert */}
      {importSummary && (
        <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-mono text-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{importSummary}</span>
          </div>
          <button
            onClick={() => setCurrentView('library')}
            className="text-white hover:underline uppercase font-bold shrink-0 ml-3"
          >
            Go to Library →
          </button>
        </div>
      )}

      {/* Procedural Demo Audio Generator Card */}
      <div className="bg-[#121216] border border-[#202028] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 text-[#ff3e3e] rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-brand tracking-wider uppercase text-white">
              Procedural Cyberpunk Synth Stems
            </h3>
            <p className="text-xs text-[#8c8c9e] mt-0.5">
              Generate 4 high-energy offline audio stems rendered with Web Audio oscillators.
            </p>
          </div>
        </div>

        <button
          onClick={handleRecreateDemoStems}
          disabled={isScanning}
          className="px-4 py-2 bg-[#1e1e28] hover:bg-[#282836] border border-[#2e2e3e] text-xs font-mono font-bold text-[#ff3e3e] rounded-xl transition whitespace-nowrap"
        >
          GENERATE STEMS
        </button>
      </div>
    </div>
  );
};
