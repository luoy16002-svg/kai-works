import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LORENZ_DT,
  LORENZ_TRACE_SEGMENTS,
  advanceLorenz,
  createLorenzField,
  exportLorenz,
  lorenzStep,
  type LorenzState,
} from '../src/core/lorenz';

test('the origin and closed-form nonzero equilibria remain fixed', () => {
  const parameters = { sigma: 10, rho: 28, beta: 8 / 3 };
  const coordinate = Math.sqrt(parameters.beta * (parameters.rho - 1));
  const equilibria: LorenzState[] = [
    [0, 0, 0],
    [coordinate, coordinate, parameters.rho - 1],
    [-coordinate, -coordinate, parameters.rho - 1],
  ];

  for (const equilibrium of equilibria) {
    let state = equilibrium;
    for (let step = 0; step < 20; step++) state = lorenzStep(state, parameters);
    state.forEach((value, axis) => {
      assert.ok(Math.abs(value - equilibrium[axis]) < 1e-11);
    });
  }
});

test('halving dt improves accuracy against the analytic invariant-axis solution', () => {
  const parameters = { sigma: 10, rho: 28, beta: 8 / 3 };
  const duration = 0.6;
  const expectedZ = 30 * Math.exp(-parameters.beta * duration);
  const errorAt = (dt: number) => {
    let state: LorenzState = [0, 0, 30];
    for (let step = 0; step < Math.round(duration / dt); step++) {
      state = lorenzStep(state, parameters, dt);
    }
    assert.equal(state[0], 0);
    assert.equal(state[1], 0);
    return Math.abs(state[2] - expectedZ);
  };

  const coarseError = errorAt(0.04);
  const fineError = errorAt(0.02);
  assert.ok(coarseError > 1e-10);
  assert.ok(fineError < coarseError / 8);
  assert.ok(fineError < 1e-5);
});

test('reset is repeatable and exported trajectories stay finite and chronological after wrapping', () => {
  const field = createLorenzField(40);
  const initialStates = field.states.map((state) => [...state]);
  const initialSteps = field.steps;
  const selected = 2;
  const observed: number[][] = [[...field.states[selected]]];
  const advanceCount = LORENZ_TRACE_SEGMENTS + 17;

  for (let step = 0; step < advanceCount; step++) {
    advanceLorenz(field);
    observed.push([...field.states[selected]]);
  }

  const reset = createLorenzField(40);
  assert.deepEqual(reset.states, initialStates);
  for (let step = 0; step < advanceCount; step++) advanceLorenz(reset);
  assert.deepEqual(reset.states, field.states);
  assert.ok(field.states.every((state) => state.every(Number.isFinite)));

  const exported = exportLorenz(field, selected);
  const expectedWindow = observed.slice(-(LORENZ_TRACE_SEGMENTS + 1));
  assert.equal(exported.steps, initialSteps + advanceCount);
  assert.equal(exported.simulationTime, exported.steps * LORENZ_DT);
  assert.equal(exported.trace.length, LORENZ_TRACE_SEGMENTS + 1);
  assert.deepEqual(exported.state, field.states[selected]);
  exported.trace.forEach((point, index) => {
    point.forEach((value, axis) => {
      assert.ok(Number.isFinite(value));
      assert.ok(
        Math.abs(value - expectedWindow[index][axis]) < 1e-5,
        `Trace sample ${index}, axis ${axis} must match the observed state within float32 precision`,
      );
    });
  });
});
