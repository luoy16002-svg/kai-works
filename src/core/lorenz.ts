export type LorenzState = readonly [number, number, number];
export type LorenzParameters = { sigma: number; rho: number; beta: number };
export const LORENZ_DT = 0.005;
export const LORENZ_TRACE_COUNT = 7;
export const LORENZ_TRACE_SEGMENTS = 1600;
export const LORENZ_WARMUP_STEPS = 4000;
export const LORENZ_DEFAULT_RHO = 28;
export const LORENZ_RHO_MIN = 18;
export const LORENZ_RHO_MAX = 40;
// Mirrored x/y pairs follow Lorenz symmetry and populate both wings from known states.
// Distinct z levels avoid an ensemble clustered around one unstable equilibrium.
export const LORENZ_SEEDS: readonly LorenzState[] = [
  [1, 1, 1],
  [-1, -1, 1],
  [8, 9, 26],
  [-8, -9, 26],
  [12, 5, 18],
  [-12, -5, 18],
  [0.1, 7, 35],
];

export function lorenzParameters(rho = LORENZ_DEFAULT_RHO): LorenzParameters {
  return {
    sigma: 10,
    rho: Number.isFinite(rho)
      ? Math.min(LORENZ_RHO_MAX, Math.max(LORENZ_RHO_MIN, rho))
      : LORENZ_DEFAULT_RHO,
    beta: 8 / 3,
  };
}
export function lorenzDerivative(
  [x, y, z]: LorenzState,
  { sigma, rho, beta }: LorenzParameters,
): LorenzState {
  return [sigma * (y - x), x * (rho - z) - y, x * y - beta * z];
}
// RK4 is applied at a fixed simulation interval, independently of display refresh rate.
export function lorenzStep(
  state: LorenzState,
  parameters: LorenzParameters,
  dt = LORENZ_DT,
): LorenzState {
  const [x, y, z] = state;
  const a = lorenzDerivative(state, parameters);
  const b = lorenzDerivative(
    [x + (a[0] * dt) / 2, y + (a[1] * dt) / 2, z + (a[2] * dt) / 2],
    parameters,
  );
  const c = lorenzDerivative(
    [x + (b[0] * dt) / 2, y + (b[1] * dt) / 2, z + (b[2] * dt) / 2],
    parameters,
  );
  const d = lorenzDerivative([x + c[0] * dt, y + c[1] * dt, z + c[2] * dt], parameters);
  return [
    x + (dt * (a[0] + 2 * b[0] + 2 * c[0] + d[0])) / 6,
    y + (dt * (a[1] + 2 * b[1] + 2 * c[1] + d[1])) / 6,
    z + (dt * (a[2] + 2 * b[2] + 2 * c[2] + d[2])) / 6,
  ];
}
export type LorenzField = {
  parameters: LorenzParameters;
  states: LorenzState[];
  segments: Float32Array[];
  cursor: number;
  steps: number;
  recordedSegments: number;
};
export function advanceLorenz(field: LorenzField, record = true) {
  field.states = field.states.map((state, index) => {
    const next = lorenzStep(state, field.parameters);
    if (record) {
      const buffer = field.segments[index];
      const offset = field.cursor * 6;
      buffer.set(state, offset);
      buffer.set(next, offset + 3);
    }
    return next;
  });
  if (record) {
    field.cursor = (field.cursor + 1) % LORENZ_TRACE_SEGMENTS;
    field.recordedSegments = Math.min(LORENZ_TRACE_SEGMENTS, field.recordedSegments + 1);
  }
  field.steps++;
}
export function createLorenzField(rho = LORENZ_DEFAULT_RHO): LorenzField {
  const field: LorenzField = {
    parameters: lorenzParameters(rho),
    states: LORENZ_SEEDS.map((seed) => [...seed] as [number, number, number]),
    segments: Array.from(
      { length: LORENZ_TRACE_COUNT },
      () => new Float32Array(LORENZ_TRACE_SEGMENTS * 6),
    ),
    cursor: 0,
    steps: 0,
    recordedSegments: 0,
  };
  for (let step = 0; step < LORENZ_WARMUP_STEPS; step++) advanceLorenz(field, false);
  for (let step = 0; step < LORENZ_TRACE_SEGMENTS; step++) advanceLorenz(field);
  return field;
}
export function exportLorenz(field: LorenzField, selected = 0) {
  const trace = field.segments[selected];
  const ordered: number[][] = [];
  for (let i = 0; i < field.recordedSegments; i++) {
    const segment = (field.cursor + i) % LORENZ_TRACE_SEGMENTS;
    const offset = segment * 6;
    if (i === 0) ordered.push(Array.from(trace.subarray(offset, offset + 3)));
    ordered.push(Array.from(trace.subarray(offset + 3, offset + 6)));
  }
  return {
    project: 'Infinite Field',
    system: 'Lorenz',
    integrator: 'CPU RK4',
    dt: LORENZ_DT,
    parameters: field.parameters,
    seeds: LORENZ_SEEDS,
    selectedTrajectory: selected,
    state: field.states[selected],
    steps: field.steps,
    simulationTime: field.steps * LORENZ_DT,
    preparation: {
      warmupSteps: LORENZ_WARMUP_STEPS,
      recordedSteps: LORENZ_TRACE_SEGMENTS,
      totalTime: (LORENZ_WARMUP_STEPS + LORENZ_TRACE_SEGMENTS) * LORENZ_DT,
    },
    traceWindow: {
      segments: field.recordedSegments,
      seconds: field.recordedSegments * LORENZ_DT,
      precision: 'float32 visualization samples',
    },
    trace: ordered,
  };
}
