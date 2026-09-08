export const fieldPresets = {
  coral: { feed: 0.0545, kill: 0.062 },
  maze: { feed: 0.029, kill: 0.057 },
  cells: { feed: 0.0367, kill: 0.0649 },
} as const;
export type FieldPreset = keyof typeof fieldPresets;
export type FieldParameters = { feed: number; kill: number };
export const FIELD_TOLERANCE = 0.0005;

// Two concentrations per cell; periodic boundary, unit time step, 9-point stencil.
// Du = 1, Dv = 0.5. This is a dimensionless visual model, not a calibrated experiment.
export function seedField(size: number, seed: number): Float32Array {
  if (!Number.isInteger(size) || size < 8 || size > 1024) throw new Error('Invalid grid size.');
  const data = new Float32Array(size * size * 2);
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const spots = Array.from({ length: 52 }, () => ({
    x: random(),
    y: random(),
    r: 0.008 + random() * 0.025,
  }));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x / size,
        py = y / size;
      const waves = Math.abs(py - 0.5 - 0.19 * Math.sin(px * 11)) < 0.021;
      const inside = waves || spots.some((s) => (px - s.x) ** 2 + (py - s.y) ** 2 < s.r ** 2);
      const i = (y * size + x) * 2;
      data[i] = inside ? 0.48 + random() * 0.04 : 1;
      data[i + 1] = inside ? 0.24 + random() * 0.03 : 0;
    }
  }
  return data;
}

export function stepField(
  source: Float32Array,
  size: number,
  parameters: FieldParameters,
): Float32Array {
  if (source.length !== size * size * 2) throw new Error('Grid dimensions do not match.');
  const next = new Float32Array(source.length);
  const weights = [0.05, 0.2, 0.05, 0.2, -1, 0.2, 0.05, 0.2, 0.05];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let lapU = 0,
        lapV = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const j = (((y + dy + size) % size) * size + ((x + dx + size) % size)) * 2;
          const w = weights[(dy + 1) * 3 + dx + 1];
          lapU += source[j] * w;
          lapV += source[j + 1] * w;
        }
      const i = (y * size + x) * 2,
        u = source[i],
        v = source[i + 1];
      const reaction = u * v * v;
      next[i] = Math.max(0, Math.min(1, u + lapU - reaction + parameters.feed * (1 - u)));
      next[i + 1] = Math.max(
        0,
        Math.min(1, v + 0.5 * lapV + reaction - (parameters.feed + parameters.kill) * v),
      );
    }
  return next;
}

export function compareFields(expected: Float32Array, actual: Float32Array) {
  if (expected.length !== actual.length) throw new Error('Field lengths differ.');
  let maxError = 0;
  for (let i = 0; i < actual.length; i++) {
    if (!Number.isFinite(actual[i]))
      return { pass: false, maxError: Infinity, values: actual.length };
    maxError = Math.max(maxError, Math.abs(expected[i] - actual[i]));
  }
  return { pass: maxError <= FIELD_TOLERANCE, maxError, values: actual.length };
}
