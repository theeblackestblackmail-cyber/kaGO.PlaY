import React, { useState, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import {
  FolderDown,
  Upload,
  HardDrive,
  CheckCircle2,
  FileAudio,
  Sparkles,
  Zap,
  FolderOpen,
  ArrowRight,
  Music,
  Tag,
  Search,
} from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { createDefaultDemoTracks } from '../../utils/proceduralTracks';
import { saveTrack } from '../../services/db';
import { sanitizeFilename } from '../../utils/filenameSanitizer';

interface RecentImportItem {
  id: string;
  title: string;
  artist: string;
  folder: string;
  format: string;
  source: 'id3' | 'filename';
}

export const ImportView: React.FC = () => {
  const { importTracks, refreshTracks, setCurrentView, playTrack, tracks } = useAudio();
  const [isScanning, setIsScanning] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importedItems, setImportedItems] = useState<RecentImportItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [testFilename, setTestFilename] = useState('01 - The Weeknd - Blinding Lights [Official Music Video] (HQ).mp3');

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live test sanitizer output
  const testSanitized = sanitizeFilename(testFilename);

  // Modern File System Access API (showDirectoryPicker) with webkitdirectory fallback
  const handleDirectoryPicker = async () => {
    haptic.eqTick();
    if ('showDirectoryPicker' in window) {
      try {
        setIsScanning(true);
        setImportSummary(null);

        // Request directory handle from user
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        const folderName = dirHandle.name || 'Device Storage';

        async function scanDir(entry: any) {
          for await (const [, handle] of entry.entries()) {
            if (handle.kind === 'file') {
              const file = await handle.getFile();
              if (
                file.name.match(/\.(mp3|wav|flac|ogg|m4a|aac)$/i) ||
                file.type.startsWith('audio/')
              ) {
                files.push(file);
              }
            } else if (handle.kind === 'directory') {
              await scanDir(handle);
            }
          }
        }

        await scanDir(dirHandle);

        if (files.length > 0) {
          const count = await importTracks(files, folderName);
          setImportSummary(
            `Scanned folder "${folderName}": imported and sanitized ${count} audio track${count > 1 ? 's' : ''} with ID3 extraction!`
          );
          // Update recent imported preview
          const recent = files.slice(0, 8).map((f, i) => {
            const meta = sanitizeFilename(f.name);
            return {
              id: `imported-${Date.now()}-${i}`,
              title: meta.title,
              artist: meta.artist,
              folder: folderName,
              format: meta.format,
              source: 'id3' as const,
            };
          });
          setImportedItems(recent);
        } else {
          setImportSummary(`No supported audio files (.mp3, .wav, .flac) found in "${folderName}".`);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('showDirectoryPicker error, falling back to webkitdirectory:', err);
          // Fallback to HTML input with webkitdirectory
          folderInputRef.current?.click();
        }
      } finally {
        setIsScanning(false);
      }
    } else {
      // Browser fallback (Firefox, Safari, older browsers or iframe restrictions)
      folderInputRef.current?.click();
    }
  };

  // Fallback handler for <input type="file" webkitdirectory />
  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsScanning(true);
    setImportSummary(null);

    const files = Array.from(fileList).filter(
      (f) => f.name.match(/\.(mp3|wav|flac|ogg|m4a|aac)$/i) || f.type.startsWith('audio/')
    );

    // Extract root folder name from webkitRelativePath
    const firstRel = (fileList[0] as any).webkitRelativePath as string | undefined;
    const folderName = firstRel ? firstRel.split('/')[0] : 'Device Folder';

    if (files.length > 0) {
      const count = await importTracks(files, folderName);
      setImportSummary(
        `Imported ${count} track${count > 1 ? 's' : ''} from folder "${folderName}" via device fallback scanner!`
      );
      const recent = files.slice(0, 8).map((f, i) => {
        const meta = sanitizeFilename(f.name);
        return {
          id: `imported-${Date.now()}-${i}`,
          title: meta.title,
          artist: meta.artist,
          folder: folderName,
          format: meta.format,
          source: 'id3' as const,
        };
      });
      setImportedItems(recent);
    } else {
      setImportSummary('No valid audio files found in selected folder.');
    }
    setIsScanning(false);
    // Reset input so user can pick the same folder again if modified
    e.target.value = '';
  };

  // Multiple files input handler
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsScanning(true);
    setImportSummary(null);

    const files = Array.from(fileList).filter(
      (f) => f.name.match(/\.(mp3|wav|flac|ogg|m4a|aac)$/i) || f.type.startsWith('audio/')
    );

    if (files.length > 0) {
      const count = await importTracks(files, 'Direct Import');
      setImportSummary(`Successfully imported and sanitized ${count} audio track${count > 1 ? 's' : ''}!`);
      const recent = files.slice(0, 8).map((f, i) => {
        const meta = sanitizeFilename(f.name);
        return {
          id: `imported-${Date.now()}-${i}`,
          title: meta.title,
          artist: meta.artist,
          folder: 'Direct Import',
          format: meta.format,
          source: 'id3' as const,
        };
      });
      setImportedItems(recent);
    }
    setIsScanning(false);
    e.target.value = '';
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
      const count = await importTracks(droppedFiles, 'Drag & Drop');
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
    <div className="space-y-6 max-w-4xl mx-auto pb-32">
      {/* Hidden File Inputs for Directory Picker & Direct File Fallbacks */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory standard non-standard attribute supported across browsers
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderInputChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <FolderDown className="w-6 h-6 text-[#ff3e3e]" />
          <h1 className="text-xl sm:text-2xl font-bold font-brand tracking-wider uppercase text-white">
            DEVICE MUSIC FOLDER SCANNER
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#8c8c9e] font-mono mt-1">
          Browser Directory Picker API • WebKit Directory Fallback • ID3 Tag & Mojibake Sanitizer
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
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition flex flex-col items-center justify-center space-y-5 ${
          isDragOver
            ? 'border-[#ff3e3e] bg-[#ff3e3e]/10 scale-[1.01]'
            : 'border-[#2a2a38] bg-[#141418] hover:border-[#ff3e3e]/60'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-[#1e1e28] border border-[#2a2a38] flex items-center justify-center text-[#ff3e3e] shadow-xl">
          <HardDrive className="w-8 h-8" />
        </div>

        <div className="max-w-lg space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold font-brand text-white">
            Scan Local Device Music Folders
          </h2>
          <p className="text-xs text-[#8c8c9e] leading-relaxed">
            Select a music folder or drop audio files. The engine reads embedded{' '}
            <span className="text-gray-200 font-semibold">ID3v1/ID3v2 tags</span> and sanitizes raw filenames, stripping noise tags like{' '}
            <code className="text-[#ff3e3e] font-mono bg-[#1b1b22] px-1 py-0.5 rounded">01 - Drake - Hotline Bling [Official Audio].mp3</code> into clean library metadata.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
          <button
            onClick={handleDirectoryPicker}
            disabled={isScanning}
            className="flex items-center gap-2 px-6 py-3.5 bg-[#ff3e3e] hover:bg-[#e03030] text-white font-mono text-xs font-bold tracking-wider rounded-xl shadow-lg shadow-[#ff3e3e]/30 transition active:scale-95 disabled:opacity-50"
          >
            <FolderDown className="w-4 h-4" />
            <span>{isScanning ? 'SCANNING FOLDER...' : 'BATCH SCAN FOLDER'}</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-3.5 bg-[#1b1b24] hover:bg-[#252532] border border-[#2e2e3e] hover:border-[#ff3e3e]/60 text-gray-200 hover:text-white font-mono text-xs font-medium rounded-xl transition active:scale-95"
            title="Alternative folder picker using webkitdirectory"
          >
            <FolderOpen className="w-4 h-4 text-[#ff3e3e]" />
            <span>FOLDER (SAFARI / FALLBACK)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-3.5 bg-[#16161c] hover:bg-[#202028] border border-[#262634] text-gray-300 hover:text-white font-mono text-xs font-medium rounded-xl transition active:scale-95"
          >
            <Upload className="w-4 h-4 text-gray-400" />
            <span>SELECT AUDIO FILES</span>
          </button>
        </div>

        {/* Formats Supported */}
        <div className="flex items-center gap-2 pt-2 text-[10px] font-mono text-gray-400 flex-wrap justify-center">
          <span className="text-gray-500">CLIENT-SIDE FORMATS:</span>
          {['MP3 (ID3v1/v2)', 'WAV', 'FLAC', 'AAC', 'OGG', 'M4A'].map((f) => (
            <span key={f} className="px-2 py-0.5 rounded bg-[#1e1e28] text-gray-300 border border-[#2b2b3a]">
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
            className="text-white hover:underline uppercase font-bold shrink-0 ml-3 flex items-center gap-1"
          >
            <span>View in Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Filename & ID3 Sanitizer Interactive Showcase */}
      <div className="bg-[#121216] border border-[#202028] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-[#ff3e3e]" />
            <h3 className="text-sm font-bold font-brand tracking-wider uppercase text-white">
              ID3 Tag & Filename Sanitizer Test Bench
            </h3>
          </div>
          <span className="text-[11px] font-mono text-gray-500">
            Real-time noise tag removal & mojibake filter
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[#8c8c9e] font-mono block">
            Test any messy music filename:
          </label>
          <div className="relative">
            <input
              type="text"
              value={testFilename}
              onChange={(e) => setTestFilename(e.target.value)}
              className="w-full bg-[#181820] border border-[#282836] focus:border-[#ff3e3e] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none"
              placeholder="e.g. 02 - Artist - Song Title [Official Video] [HQ].mp3"
            />
          </div>
        </div>

        {/* Live Transformation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-[#181820] border border-[#242432] rounded-xl p-3">
            <span className="text-[10px] font-mono uppercase text-gray-400 block">Sanitized Title</span>
            <p className="text-sm font-bold text-white mt-1 truncate" title={testSanitized.title}>
              {testSanitized.title}
            </p>
          </div>
          <div className="bg-[#181820] border border-[#242432] rounded-xl p-3">
            <span className="text-[10px] font-mono uppercase text-gray-400 block">Extracted Artist</span>
            <p className="text-sm font-bold text-[#ff3e3e] mt-1 truncate" title={testSanitized.artist}>
              {testSanitized.artist}
            </p>
          </div>
          <div className="bg-[#181820] border border-[#242432] rounded-xl p-3">
            <span className="text-[10px] font-mono uppercase text-gray-400 block">Detected Format</span>
            <p className="text-sm font-mono font-bold text-gray-200 mt-1">
              {testSanitized.format}
            </p>
          </div>
        </div>
      </div>

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
              Instantly generate 4 high-energy offline audio stems rendered with Web Audio oscillators.
            </p>
          </div>
        </div>

        <button
          onClick={handleRecreateDemoStems}
          disabled={isScanning}
          className="px-4 py-2 bg-[#1e1e28] hover:bg-[#282836] border border-[#2e2e3e] text-xs font-mono font-bold text-[#ff3e3e] rounded-xl transition whitespace-nowrap active:scale-95"
        >
          GENERATE STEMS
        </button>
      </div>
    </div>
  );
};
