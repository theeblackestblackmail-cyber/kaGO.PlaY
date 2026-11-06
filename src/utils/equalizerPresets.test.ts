import test from 'node:test';
import assert from 'node:assert/strict';
import { EQ_FREQUENCIES, EQ_PRESETS, clampGain, getPresetByName } from './equalizerPresets';

test('has 12 acoustic presets covering 5 bands', () => {
  assert.equal(EQ_PRESETS.length, 12);
  assert.equal(EQ_FREQUENCIES.length, 5);
  for (const preset of EQ_PRESETS) {
    assert.equal(preset.gains.length, 5);
    for (const gain of preset.gains) {
      assert.ok(gain >= -12 && gain <= 12, `Gain ${gain} in preset ${preset.name} out of bounds`);
    }
  }
});

test('clamps gain values strictly within -12dB and +12dB', () => {
  assert.equal(clampGain(15), 12);
  assert.equal(clampGain(-20), -12);
  assert.equal(clampGain(3.456), 3.5);
  assert.equal(clampGain(0), 0);
});

test('retrieves preset by name correctly or falls back to Flat', () => {
  const rock = getPresetByName('Rock');
  assert.equal(rock.name, 'Rock');
  assert.deepEqual(rock.gains, [5, 3, -1, 2, 5]);

  const fallback = getPresetByName('NonExistentPreset');
  assert.equal(fallback.name, 'Flat');
});
