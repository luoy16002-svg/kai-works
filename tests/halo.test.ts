import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeHalo,
  encodeHalo,
  initialHalo,
  finishes,
  lightColor,
  type HaloConfig,
} from '../src/core/halo';
test('900 configuration combinations round trip, including zero brightness', () => {
  let count = 0;
  for (const finish of Object.keys(finishes) as HaloConfig['finish'][])
    for (const diameter of [60, 90, 120] as const)
      for (let temperature = 2200; temperature <= 4900; temperature += 300)
        for (const brightness of [0, 1, 10, 30, 50, 70, 80, 90, 99, 100]) {
          const config = { finish, diameter, temperature, brightness };
          assert.deepEqual(decodeHalo(encodeHalo(config)), config);
          count++;
        }
  assert.equal(count, 900);
});
test('untrusted configuration values never enter the scene unchecked', () => {
  for (const query of [
    'finish=__proto__&diameter=NaN&temperature=Infinity&brightness=-1',
    'finish=constructor&diameter=1e99&temperature=2199&brightness=101',
    'finish=x&diameter=0&temperature=2700.5&brightness=50.5',
  ])
    assert.deepEqual(decodeHalo(query), initialHalo);
});
test('white point remains finite, bounded and monotonic across the supported range', () => {
  let blue = 0;
  for (let t = 2200; t <= 5000; t++) {
    const value = lightColor(t);
    assert.ok(value.every((n) => Number.isFinite(n) && n >= 0 && n <= 1));
    assert.ok(value[2] >= blue);
    blue = value[2];
  }
});
