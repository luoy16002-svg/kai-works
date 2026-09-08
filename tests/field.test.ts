import test from 'node:test';
import assert from 'node:assert/strict';
import { seedField, stepField, compareFields, fieldPresets } from '../src/core/field';

test('uniform feed equilibrium remains invariant under the solver', () => {
  const state = new Float32Array(8 * 8 * 2);
  for (let i = 0; i < state.length; i += 2) state[i] = 1;
  assert.deepEqual(stepField(state, 8, fieldPresets.coral), state);
});

test('a corner perturbation diffuses across the periodic boundary with the expected weights', () => {
  const state = new Float32Array(8 * 8 * 2);
  state[0] = 1;
  const next = stepField(state, 8, { feed: 0, kill: 0 });
  assert.equal(next[0], 0);
  assert.ok(Math.abs(next[7 * 2] - 0.2) < 1e-7);
  assert.ok(Math.abs(next[(7 * 8 + 7) * 2] - 0.05) < 1e-7);
  assert.ok(Math.abs(next.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) - 1) < 1e-7);
});

test('seeded simulations are repeatable, finite and bounded across all presets', () => {
  assert.deepEqual(seedField(32, 7126), seedField(32, 7126));
  assert.notDeepEqual(seedField(32, 7126), seedField(32, 7127));
  for (const parameters of Object.values(fieldPresets)) {
    let state = seedField(32, 7126);
    for (let i = 0; i < 180; i++) state = stepField(state, 32, parameters);
    assert.ok(state.every((v) => Number.isFinite(v) && v >= 0 && v <= 1));
    assert.notDeepEqual(state, seedField(32, 7126));
  }
});

test('validation rejects nonfinite and out-of-tolerance output', () => {
  const expected = new Float32Array([0.5, 0.25]);
  assert.equal(compareFields(expected, expected).pass, true);
  assert.equal(compareFields(expected, new Float32Array([0.51, 0.25])).pass, false);
  assert.equal(compareFields(expected, new Float32Array([NaN, 0.25])).pass, false);
  assert.throws(() => seedField(0, 1));
  assert.throws(() => stepField(expected, 8, fieldPresets.coral));
});
