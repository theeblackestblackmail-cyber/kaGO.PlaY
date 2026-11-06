import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFolderName, getTrackFolder, groupTracksByFolder } from './folderHelper';
import { Track } from '../types/audio';

test('extractFolderName returns top-level folder from webkitRelativePath', () => {
  const file = {
    name: 'track.mp3',
    webkitRelativePath: 'Afrobeats2024/BurnaBoy/CityBoys.mp3',
  };
  assert.equal(extractFolderName(file), 'Afrobeats2024');
});

test('extractFolderName falls back to custom fallbackFolder when no path exists', () => {
  const file = {
    name: 'single_song.mp3',
    webkitRelativePath: '',
  };
  assert.equal(extractFolderName(file, 'My Downloads'), 'My Downloads');
});

test('getTrackFolder respects track.folder if present', () => {
  const track: Partial<Track> = {
    id: 't-1',
    folder: 'Hip Hop Classics',
    format: 'MP3',
  };
  assert.equal(getTrackFolder(track as Track), 'Hip Hop Classics');
});

test('getTrackFolder defaults synth demo tracks to Cyber Stems', () => {
  const track: Partial<Track> = {
    id: 't-synth',
    format: 'SYNTH',
  };
  assert.equal(getTrackFolder(track as Track), 'Cyber Stems');
});

test('groupTracksByFolder aggregates tracks and computes correct count and duration', () => {
  const sampleTracks: Track[] = [
    {
      id: '1',
      title: 'Track A',
      artist: 'Artist 1',
      album: 'Album 1',
      folder: 'Rock',
      duration: 200,
      format: 'MP3',
      addedAt: Date.now(),
      playCount: 0,
      isFavorite: false,
    },
    {
      id: '2',
      title: 'Track B',
      artist: 'Artist 2',
      album: 'Album 1',
      folder: 'Rock',
      duration: 180,
      format: 'MP3',
      addedAt: Date.now(),
      playCount: 0,
      isFavorite: false,
    },
    {
      id: '3',
      title: 'Track C',
      artist: 'Artist 3',
      album: 'Album 2',
      folder: 'Pop',
      duration: 150,
      format: 'MP3',
      addedAt: Date.now(),
      playCount: 0,
      isFavorite: false,
    },
  ];

  const groups = groupTracksByFolder(sampleTracks);
  assert.equal(groups.length, 2);

  const popGroup = groups.find((g) => g.folder === 'Pop');
  assert.ok(popGroup);
  assert.equal(popGroup.count, 1);
  assert.equal(popGroup.totalDuration, 150);

  const rockGroup = groups.find((g) => g.folder === 'Rock');
  assert.ok(rockGroup);
  assert.equal(rockGroup.count, 2);
  assert.equal(rockGroup.totalDuration, 380);
});
