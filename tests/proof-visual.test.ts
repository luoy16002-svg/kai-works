import test from 'node:test';
import assert from 'node:assert/strict';
import { PROOF_POLICIES, PROOF_SCENARIOS, replayProof, runProof } from '../src/core/proof';
import {
  advanceProofHead,
  PROOF_EVENT_SECONDS,
  PROOF_RESULT_SECONDS,
  proofVisualFrame,
} from '../src/core/proof-visual';
import { readRecorded } from '../src/core/proof-recordings';

test('each spatial event uses its recorded snapshots, including exact and backward seeks', () => {
  for (const scenario of PROOF_SCENARIOS)
    for (const policy of PROOF_POLICIES) {
      const trial = runProof(scenario.id, 101, policy.id);
      assert.deepEqual(proofVisualFrame(trial, 0).world, trial.initialWorld);
      for (let index = trial.events.length - 1; index >= 0; index--) {
        const event = trial.events[index];
        assert.deepEqual(proofVisualFrame(trial, index + 0.2).world, event.before);
        assert.deepEqual(proofVisualFrame(trial, index + 0.7).world, event.after);
        const exact = proofVisualFrame(trial, index + 1);
        assert.equal(exact.index, index);
        assert.deepEqual(exact.world, event.after);
      }
      assert.deepEqual(proofVisualFrame(trial, trial.events.length + 0.9).world, trial.finalWorld);
    }
});

test('lost replies retain committed receipts and a new-key retry exposes duplicate allocation', () => {
  const trial = runProof('ack_lost', 101, 'retry_on_error');
  const lostIndex = trial.events.findIndex((event) => event.observation.code === 'ACK_UNKNOWN');
  const lost = proofVisualFrame(trial, lostIndex + 0.7);
  assert.equal(lost.committed, true);
  assert.equal(lost.replied, false);
  assert.equal(lost.world.receipts.length, 1);
  assert.equal(lost.allocation, trial.task.order.quantity);
  const repeated = proofVisualFrame(trial, trial.events.length);
  assert.equal(repeated.world.receipts.length, 2);
  assert.equal(repeated.allocation, trial.task.order.quantity * 2);
  assert.equal(proofVisualFrame(trial, lostIndex + 0.2).world.receipts.length, 0);
});

test('handoff appears only when the recorded handoff action applies; an empty trace stays readable', () => {
  const trial = runProof('no_stock', 101, 'verify_recover');
  const index = trial.events.findIndex((event) => event.action.tool === 'handoff');
  assert.equal(proofVisualFrame(trial, index + 0.2).world.handoff, null);
  assert.deepEqual(proofVisualFrame(trial, index + 1).world.handoff, trial.finalWorld.handoff);
  const empty = replayProof('clean', 101, []);
  assert.equal(proofVisualFrame(empty, 0).event, null);
  assert.deepEqual(proofVisualFrame(empty, 4).world, empty.initialWorld);
});

test('the playback clock preserves a separate result hold at every supported speed', () => {
  for (const speed of [0.5, 1, 1.5, 2]) {
    assert.ok(
      Math.abs(advanceProofHead(0, 3, (3 * PROOF_EVENT_SECONDS) / speed, speed) - 3) < 1e-10,
    );
    assert.ok(
      Math.abs(advanceProofHead(3, 3, (PROOF_RESULT_SECONDS * 0.5) / speed, speed) - 3.5) < 1e-10,
    );
    assert.equal(advanceProofHead(3, 3, PROOF_RESULT_SECONDS / speed, speed), 4);
  }
  assert.equal(advanceProofHead(1.5, 3, 0), 1.5);
});

test('recording validation retains the rejected-entry count beside accepted sessions', () => {
  const trial = runProof('clean', 101, 'single_attempt');
  const loaded = readRecorded(JSON.stringify({ trials: [trial, { invalid: true }] }));
  assert.equal(loaded.total, 2);
  assert.equal(loaded.trials.length, 1);
  assert.equal(loaded.rejected.length, 1);
  assert.deepEqual(loaded.trials[0].finalWorld, trial.finalWorld);
});
