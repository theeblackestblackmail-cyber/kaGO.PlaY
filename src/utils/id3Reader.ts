/**
 * Pure client-side ID3v1 and ID3v2 tag parser.
 * Reads the first 64KB (ID3v2) and the last 128 bytes (ID3v1) of an audio File/Blob
 * without reading the entire file into memory.
 */

export interface ParsedID3Metadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  trackNumber?: number;
  hasId3: boolean;
}

/**
 * Decode null-terminated or text-encoded byte buffer.
 */
function decodeText(bytes: Uint8Array, encodingByte: number = 0): string {
  try {
    if (encodingByte === 1 || encodingByte === 2) {
      // UTF-16 (LE or BE)
      return new TextDecoder('utf-16').decode(bytes).replace(/\0+$/, '').trim();
    } else if (encodingByte === 3) {
      // UTF-8
      return new TextDecoder('utf-8').decode(bytes).replace(/\0+$/, '').trim();
    } else {
      // ISO-8859-1 / ASCII
      return new TextDecoder('iso-8859-1').decode(bytes).replace(/\0+$/, '').trim();
    }
  } catch {
    return '';
  }
}

/**
 * Read synchsafe integer (7 bits per byte)
 */
function readSynchsafeInt(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

/**
 * Read regular 32-bit big endian integer
 */
function readInt32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  );
}

/**
 * Parse ID3v2 header and text frames (TIT2, TPE1, TALB, TRCK, TYER/TDRC)
 */
function parseID3v2(buffer: ArrayBuffer): Partial<ParsedID3Metadata> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10) return {};

  // Check ID3 magic 'ID3'
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return {};
  }

  const majorVersion = bytes[3]; // 3 for ID3v2.3, 4 for ID3v2.4
  const tagSize = readSynchsafeInt(bytes, 6);
  const end = Math.min(bytes.length, 10 + tagSize);
  let pos = 10;

  const result: Partial<ParsedID3Metadata> = { hasId3: true };

  while (pos + 10 < end) {
    // Read 4-character frame ID
    const frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);

    // Check padding (zeros)
    if (bytes[pos] === 0) break;

    const frameSize =
      majorVersion === 4 ? readSynchsafeInt(bytes, pos + 4) : readInt32BE(bytes, pos + 4);

    if (frameSize <= 0 || pos + 10 + frameSize > end) {
      break;
    }

    const frameData = bytes.slice(pos + 10, pos + 10 + frameSize);
    pos += 10 + frameSize;

    if (frameData.length <= 1) continue;

    const encoding = frameData[0];
    const textBytes = frameData.slice(1);
    const value = decodeText(textBytes, encoding);

    if (!value) continue;

    if (frameId === 'TIT2') {
      result.title = value;
    } else if (frameId === 'TPE1') {
      result.artist = value;
    } else if (frameId === 'TALB') {
      result.album = value;
    } else if (frameId === 'TYER' || frameId === 'TDRC') {
      result.year = value;
    } else if (frameId === 'TRCK') {
      const num = parseInt(value.split('/')[0], 10);
      if (!isNaN(num)) result.trackNumber = num;
    }
  }

  return result;
}

/**
 * Parse ID3v1 (last 128 bytes)
 */
function parseID3v1(buffer: ArrayBuffer): Partial<ParsedID3Metadata> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 128) return {};

  // Check "TAG"
  if (bytes[0] !== 0x54 || bytes[1] !== 0x41 || bytes[2] !== 0x47) {
    return {};
  }

  const decoder = new TextDecoder('iso-8859-1');
  const title = decoder.decode(bytes.slice(3, 33)).replace(/\0+$/, '').trim();
  const artist = decoder.decode(bytes.slice(33, 63)).replace(/\0+$/, '').trim();
  const album = decoder.decode(bytes.slice(63, 93)).replace(/\0+$/, '').trim();
  const year = decoder.decode(bytes.slice(93, 97)).replace(/\0+$/, '').trim();

  let trackNumber: number | undefined;
  if (bytes[125] === 0 && bytes[126] !== 0) {
    // ID3v1.1 track number
    trackNumber = bytes[126];
  }

  return {
    title: title || undefined,
    artist: artist || undefined,
    album: album || undefined,
    year: year || undefined,
    trackNumber,
    hasId3: true,
  };
}

/**
 * Reads and parses ID3 tags from a File or Blob.
 * Only reads the first 64KB and last 128 bytes for optimal performance.
 */
export async function readID3Metadata(file: File | Blob): Promise<ParsedID3Metadata> {
  try {
    // 1. Try reading ID3v2 from start of file (first 64KB)
    const headerSlice = file.slice(0, Math.min(file.size, 65536));
    const headerBuffer = await headerSlice.arrayBuffer();
    const v2Data = parseID3v2(headerBuffer);

    if (v2Data.hasId3 && (v2Data.title || v2Data.artist)) {
      return {
        title: v2Data.title,
        artist: v2Data.artist,
        album: v2Data.album,
        year: v2Data.year,
        trackNumber: v2Data.trackNumber,
        hasId3: true,
      };
    }

    // 2. Try reading ID3v1 from end of file (last 128 bytes) if file is large enough
    if (file.size >= 128) {
      const footerSlice = file.slice(file.size - 128, file.size);
      const footerBuffer = await footerSlice.arrayBuffer();
      const v1Data = parseID3v1(footerBuffer);

      if (v1Data.hasId3 && (v1Data.title || v1Data.artist)) {
        return {
          title: v1Data.title,
          artist: v1Data.artist,
          album: v1Data.album,
          year: v1Data.year,
          trackNumber: v1Data.trackNumber,
          hasId3: true,
        };
      }
    }
  } catch (err) {
    console.debug('ID3 parse skipped or unreadable:', err);
  }

  return { hasId3: false };
}
