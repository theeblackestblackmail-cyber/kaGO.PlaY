import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLRC, getActiveLyricIndex } from './lrcParser';

test('parses standard timestamped LRC lines', () => {
  const lrc = `
[00:04.50] Welcome to the neon city
[00:08.20] Crimson lights shining bright
[00:15.00] In the sound of kaGO.PIaY
`;
  const result = parseLRC(lrc);
  assert.equal(result.length, 3);
  assert.equal(result[0].time, 4.5);
  assert.equal(result[0].text, 'Welcome to the neon city');
  assert.equal(result[1].time, 8.2);
});

test('handles repeated timestamps correctly', () => {
  const lrc = `[00:10.00][00:20.00] Echo chorus`;
  const result = parseLRC(lrc);
  assert.equal(result.length, 2);
  assert.equal(result[0].time, 10.0);
  assert.equal(result[1].time, 20.0);
  assert.equal(result[0].text, 'Echo chorus');
});

test('calculates active lyric index with calibration offset', () => {
  const lyrics = [
    { time: 5.0, text: 'First line' },
    { time: 10.0, text: 'Second line' },
    { time: 15.0, text: 'Third line' },
  ];

  // At 7s, first line is active
  assert.equal(getActiveLyricIndex(lyrics, 7.0, 0), 0);

  // At 12s, second line is active
  assert.equal(getActiveLyricIndex(lyrics, 12.0, 0), 1);

  // At 9.0s with +1.5s offset (calibrated time = 10.5s), second line is active
  assert.equal(getActiveLyricIndex(lyrics, 9.0, 1.5), 1);
});
