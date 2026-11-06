import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidYouTubeId, extractYouTubeId, buildRecoveryQuery } from './youtubeHelper';

test('validates authentic 11-char video IDs and rejects mix/playlist IDs', () => {
  assert.equal(isValidYouTubeId('dQw4w9WgXcQ'), true);
  assert.equal(isValidYouTubeId('kJQP7kiw5Fk'), true);

  // Rejects playlist/mix IDs
  assert.equal(isValidYouTubeId('RDEMdQw4w9WgXcQ1234567890'), false);
  assert.equal(isValidYouTubeId('PL12345678901234567890123456'), false);
  assert.equal(isValidYouTubeId('tooShort'), false);
  assert.equal(isValidYouTubeId('thisIsWayTooLongForAnId123'), false);
});

test('extracts video ID from multiple URL formats', () => {
  assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=10'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('invalid-string'), null);
});

test('builds auto-recovery queries for Error 150/101 embed-blocked tracks', () => {
  const query1 = buildRecoveryQuery('Blinding Lights [Official Video]', 'The Weeknd', 1);
  assert.equal(query1, 'The Weeknd Blinding Lights audio');

  const query2 = buildRecoveryQuery('Blinding Lights', 'The Weeknd', 2);
  assert.equal(query2, 'The Weeknd Blinding Lights lyrics');
});
