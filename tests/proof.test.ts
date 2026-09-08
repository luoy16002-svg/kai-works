import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROOF_ACTION_LIMIT,
  PROOF_IMPORT_LIMIT,
  PROOF_SCENARIOS,
  PROOF_SEEDS,
  exportProof,
  importProof,
  replayProof,
  runProof,
  runProofSuite,
  type ProofAction,
} from '../src/core/proof';

test('clean fulfilment conserves stock and meets the actual order constraints', () => {
  const trial = runProof('clean', 101, 'single_attempt');
  assert.equal(trial.grade.autonomousFulfilment, true);
  assert.equal(trial.grade.justifiedHandoff, false);
  assert.equal(
    trial.finalWorld.receipts.reduce((sum, receipt) => sum + receipt.quantity, 0),
    trial.task.order.quantity,
  );
  for (const item of trial.finalWorld.inventory) {
    const consumed = trial.finalWorld.receipts
      .filter((receipt) => receipt.sku === item.sku)
      .reduce((sum, receipt) => sum + receipt.quantity, 0);
    assert.equal(
      item.stock,
      trial.initialWorld.inventory.find((initial) => initial.sku === item.sku)!.stock - consumed,
    );
  }
  assert.ok(Object.values(trial.grade.assertions).every(Boolean));
});

test('a lost acknowledgement still fulfils the order; key reuse prevents extra allocation', () => {
  const single = runProof('ack_lost', 102, 'single_attempt');
  assert.equal(single.events.at(-1)!.observation.code, 'ACK_UNKNOWN');
  assert.equal(single.claimedStatus, 'unknown outcome');
  assert.equal(single.grade.autonomousFulfilment, true);
  assert.equal(single.finalWorld.receipts.length, 1);
  const reserve = single.actions.find((action) => action.tool === 'reserve')!;
  const reused = replayProof('ack_lost', 102, [...single.actions, reserve]);
  assert.equal(reused.events.at(-1)!.observation.code, 'EXISTING_RECEIPT');
  assert.deepEqual(reused.finalWorld, single.finalWorld);
  const freshKey = replayProof('ack_lost', 102, [
    ...single.actions,
    { ...reserve, idempotencyKey: 'second-key' },
  ]);
  assert.equal(freshKey.grade.duplicateReservation, true);
  assert.equal(freshKey.grade.autonomousFulfilment, false);
});

test('stock-race recovery succeeds with a valid substitute', () => {
  const trial = runProof('stock_conflict', 103, 'verify_recover');
  assert.equal(trial.grade.autonomousFulfilment, true);
  assert.equal(trial.finalWorld.receipts[0].sku, 'KIT-B');
  assert.ok(trial.events.some((event) => event.observation.code === 'STOCK_CONFLICT'));
  assert.equal(trial.finalWorld.inventory.find((item) => item.sku === 'KIT-A')!.stock, 0);
  assert.equal(runProof('stock_conflict', 103, 'single_attempt').grade.autonomousFulfilment, false);
});

test('justified handoff is separate from fulfilment and a false handoff fails', () => {
  const handoff = runProof('no_stock', 104, 'verify_recover');
  assert.equal(handoff.grade.outcome, 'handoff');
  assert.equal(handoff.grade.justifiedHandoff, true);
  assert.equal(handoff.grade.autonomousFulfilment, false);
  assert.equal(handoff.finalWorld.receipts.length, 0);
  assert.equal(runProof('no_stock', 104, 'single_attempt').grade.outcome, 'failed');
  const falseHandoff = replayProof('clean', 104, [{ tool: 'handoff', reason: 'Cannot proceed.' }]);
  assert.equal(falseHandoff.grade.justifiedHandoff, false);
  assert.equal(falseHandoff.grade.outcome, 'failed');
});

test('price and compatibility constraints are graded independently of successful tool replies', () => {
  const empty = replayProof('clean', 105, []);
  for (const sku of ['KIT-P', 'SPARE-X']) {
    const trial = replayProof('clean', 105, [
      { tool: 'reserve', sku, quantity: empty.task.order.quantity, idempotencyKey: `bad-${sku}` },
    ]);
    assert.equal(trial.events[0].observation.ok, true);
    assert.equal(trial.grade.constraintViolation, true);
    assert.equal(trial.grade.autonomousFulfilment, false);
  }
});

test('valid partial allocations and a substitute-first path pass without prescribed steps', () => {
  const order = replayProof('clean', 106, []).task.order;
  const split: ProofAction[] = [
    { tool: 'reserve', sku: 'KIT-A', quantity: 1, idempotencyKey: 'part-a' },
    { tool: 'reserve', sku: 'KIT-B', quantity: order.quantity - 1, idempotencyKey: 'part-b' },
  ];
  const trial = replayProof('clean', 106, split);
  assert.equal(trial.finalWorld.receipts.length, 2);
  assert.equal(trial.grade.autonomousFulfilment, true);
  assert.equal(trial.grade.duplicateReservation, false);
  const alternate = replayProof('stock_conflict', 106, [
    {
      tool: 'reserve',
      sku: 'KIT-B',
      quantity: order.quantity,
      idempotencyKey: 'direct-substitute',
    },
  ]);
  assert.equal(alternate.grade.autonomousFulfilment, true);
});

test('imports reject invalid data and regrade actions instead of trusting supplied states or scores', () => {
  const trial = runProof('clean', 101, 'single_attempt');
  const trace = JSON.parse(exportProof(trial));
  trace.grade = { outcome: 'failed', autonomousFulfilment: false };
  trace.finalWorld = { receipts: [] };
  trace.events = [];
  assert.deepEqual(importProof(JSON.stringify(trace)).grade, trial.grade);
  const invalid = [
    { ...trace, version: 2 },
    { ...trace, fixtureVersion: 2 },
    { ...trace, environment: 'remote-v1' },
    { ...trace, actions: [{ tool: 'fetch', url: 'https://example.com' }] },
    { ...trace, actions: [{ tool: 'catalog', extra: true }] },
    {
      ...trace,
      actions: Array.from({ length: PROOF_ACTION_LIMIT + 1 }, () => ({ tool: 'catalog' })),
    },
    { ...trace, provenance: { ...trace.provenance, kind: ['recorded-agent'] } },
    { ...trace, provenance: { ...trace.provenance, tokens: 0 } },
  ];
  invalid.forEach((value) => assert.throws(() => importProof(JSON.stringify(value))));
  assert.throws(() => importProof('{invalid'));
  assert.throws(() => importProof(' '.repeat(PROOF_IMPORT_LIMIT + 1)));
  assert.throws(() =>
    importProof(exportProof(trial).replace('"version": 1', '"__proto__": {}, "version": 1')),
  );
});

test('the public suite is 24 reproducible cases across four conditions, with honest separate outcomes', () => {
  const suite = runProofSuite();
  assert.equal(suite.length, 72);
  assert.equal(new Set(suite.map((trial) => `${trial.scenarioId}/${trial.seed}`)).size, 24);
  assert.equal(PROOF_SCENARIOS.length, 4);
  assert.equal(PROOF_SEEDS.length, 6);
  for (const trial of suite) {
    assert.ok(trial.actions.length <= PROOF_ACTION_LIMIT);
    assert.deepEqual(importProof(exportProof(trial)), trial);
  }
  const verified = suite.filter((trial) => trial.policyId === 'verify_recover');
  assert.equal(verified.filter((trial) => trial.grade.autonomousFulfilment).length, 18);
  assert.equal(verified.filter((trial) => trial.grade.justifiedHandoff).length, 6);
  assert.deepEqual(
    runProof('ack_lost', 101, 'verify_recover'),
    runProof('ack_lost', 101, 'verify_recover'),
  );
});
