import test from 'node:test';
import assert from 'node:assert/strict';
import { readID3Metadata } from './id3Reader';

test('parses ID3v1 tags from 128-byte footer', async () => {
  const buffer = new Uint8Array(256);
  // Fill first 128 with dummy audio bytes
  for (let i = 0; i < 128; i++) buffer[i] = 0xff;

  // Last 128 bytes: TAG
  const footerOffset = 128;
  buffer[footerOffset] = 0x54; // 'T'
  buffer[footerOffset + 1] = 0x41; // 'A'
  buffer[footerOffset + 2] = 0x47; // 'G'

  // Title: "Cyber Neon Track"
  const title = new TextEncoder().encode('Cyber Neon Track');
  buffer.set(title, footerOffset + 3);

  // Artist: "DJ Synthex"
  const artist = new TextEncoder().encode('DJ Synthex');
  buffer.set(artist, footerOffset + 33);

  // Album: "Night City"
  const album = new TextEncoder().encode('Night City');
  buffer.set(album, footerOffset + 63);

  const blob = new Blob([buffer]);
  const meta = await readID3Metadata(blob);

  assert.equal(meta.hasId3, true);
  assert.equal(meta.title, 'Cyber Neon Track');
  assert.equal(meta.artist, 'DJ Synthex');
  assert.equal(meta.album, 'Night City');
});

test('handles files with no ID3 tags gracefully', async () => {
  const dummyBuffer = new Uint8Array(50);
  const blob = new Blob([dummyBuffer]);
  const meta = await readID3Metadata(blob);

  assert.equal(meta.hasId3, false);
  assert.equal(meta.title, undefined);
  assert.equal(meta.artist, undefined);
});
