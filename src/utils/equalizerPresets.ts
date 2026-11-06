import { EQPreset } from '../types/audio';

export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000] as const;

export const EQ_PRESETS: EQPreset[] = [
  {
    name: 'Flat',
    description: 'Reference studio linear response without coloration',
    gains: [0, 0, 0, 0, 0],
  },
  {
    name: 'Bass',
    description: 'Warm low-end enhancement for contemporary genres',
    gains: [6, 4, 0, 0, 0],
  },
  {
    name: 'Heavy Bass',
    description: 'Thunderous 60Hz-230Hz sub-bass boost for EDM & club tracks',
    gains: [10, 7, 1, 0, 0],
  },
  {
    name: 'Rock',
    description: 'V-shaped dynamic curve with driven bass and sparkling top',
    gains: [5, 3, -1, 2, 5],
  },
  {
    name: 'Pop',
    description: 'Punchy low mids and bright forward vocals',
    gains: [1, 3, 4, 2, -1],
  },
  {
    name: 'Classical',
    description: 'Natural orchestral resonance and transparent highs',
    gains: [4, 2, 0, 2, 4],
  },
  {
    name: 'Jazz',
    description: 'Warm acoustic upright bass and smooth brush cymbals',
    gains: [3, 2, -1, 2, 3],
  },
  {
    name: 'Electronic',
    description: 'Synthwave and dancefloor punch with crisp synth leads',
    gains: [6, 4, 0, 3, 5],
  },
  {
    name: 'Hip-Hop',
    description: 'Deep 808 kick presence with crisp snare snap',
    gains: [8, 5, 0, 2, 3],
  },
  {
    name: 'Vocal Boost',
    description: 'Brings lead vocals and lyrics forward in the soundstage',
    gains: [-2, 2, 6, 3, -1],
  },
  {
    name: 'Acoustic',
    description: 'Balanced organic profile for guitar, piano, and folk',
    gains: [4, 3, 1, 3, 4],
  },
  {
    name: 'Treble Boost',
    description: 'Airy high-frequency emphasis for detailed highs',
    gains: [0, 0, 1, 5, 8],
  },
];

export function clampGain(value: number): number {
  if (isNaN(value)) return 0;
  return Math.max(-12, Math.min(12, Math.round(value * 10) / 10));
}

export function getPresetByName(name: string): EQPreset {
  return EQ_PRESETS.find(p => p.name.toLowerCase() === name.toLowerCase()) || EQ_PRESETS[0];
}
