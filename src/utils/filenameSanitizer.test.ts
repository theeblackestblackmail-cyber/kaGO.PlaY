import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilename } from './filenameSanitizer';

test('sanitizes YouTube video noise tags and extracts artist & title', () => {
  const result = sanitizeFilename('01 - Drake - Hotline Bling [Official Audio].mp3');
  assert.equal(result.artist, 'Drake');
  assert.equal(result.title, 'Hotline Bling');
  assert.equal(result.format, 'MP3');
});

test('handles title by artist pattern and cleans visualizer tags', () => {
  const result = sanitizeFilename('Starboy by The Weeknd (Official Visualizer).flac');
  assert.equal(result.artist, 'The Weeknd');
  assert.equal(result.title, 'Starboy');
  assert.equal(result.format, 'FLAC');
});

test('handles underscores and track number prefixes', () => {
  const result = sanitizeFilename('04._Daft_Punk_-_Get_Lucky_[4K].wav');
  assert.equal(result.artist, 'Daft Punk');
  assert.equal(result.title, 'Get Lucky');
  assert.equal(result.format, 'WAV');
});
