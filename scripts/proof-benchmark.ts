import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  PROOF_ACTION_LIMIT,
  PROOF_ENVIRONMENT,
  PROOF_FIXTURE_VERSION,
  PROOF_POLICIES,
  PROOF_SCENARIOS,
  PROOF_SEEDS,
  runProofSuite,
} from '../src/core/proof';

const trials = runProofSuite();
const evidence = {
  version: 1,
  kind: 'deterministic-reference-suite',
  environment: PROOF_ENVIRONMENT,
  fixtureVersion: PROOF_FIXTURE_VERSION,
  provenance: {
    kind: 'reference-policy',
    adapter: 'Deterministic reference policies',
    model: null,
    tokens: null,
    cost: null,
  },
  dataset: {
    visibility: 'public',
    conditionCount: PROOF_SCENARIOS.length,
    seedVariantsPerCondition: PROOF_SEEDS.length,
    caseCount: PROOF_SCENARIOS.length * PROOF_SEEDS.length,
    referenceRunCount: trials.length,
    seeds: PROOF_SEEDS,
    conditions: PROOF_SCENARIOS,
  },
  limits: {
    toolActionsPerRun: PROOF_ACTION_LIMIT,
    prices: 'integer cents in a synthetic world',
    timing: 'No latency or execution-time score is reported.',
  },
  policySummaries: PROOF_POLICIES.map((policy) => {
    const runs = trials.filter((trial) => trial.policyId === policy.id);
    const toolActions = runs.reduce((sum, trial) => sum + trial.actions.length, 0);
    return {
      policyId: policy.id,
      label: policy.label,
      description: policy.description,
      cases: runs.length,
      autonomousFulfilment: runs.filter((trial) => trial.grade.autonomousFulfilment).length,
      justifiedHandoff: runs.filter((trial) => trial.grade.justifiedHandoff).length,
      failed: runs.filter((trial) => trial.grade.outcome === 'failed').length,
      duplicateReservation: runs.filter((trial) => trial.grade.duplicateReservation).length,
      constraintViolation: runs.filter((trial) => trial.grade.constraintViolation).length,
      toolActions,
      meanToolActions: toolActions / runs.length,
    };
  }),
  cases: PROOF_SCENARIOS.flatMap((scenario) =>
    PROOF_SEEDS.map((seed) => ({
      scenarioId: scenario.id,
      seed,
      results: trials
        .filter((trial) => trial.scenarioId === scenario.id && trial.seed === seed)
        .map((trial) => ({
          policyId: trial.policyId,
          grade: trial.grade,
          toolActions: trial.actions.length,
          claimedStatus: trial.claimedStatus,
        })),
    })),
  ),
  notes: [
    'These are deterministic reference policies, not model scores or a model leaderboard.',
    'The 24 public cases contain four conditions with six numeric seed variants each; they are not 24 independent failure categories.',
    'A committed reservation fulfils the order even when its acknowledgement is lost.',
    'A justified handoff is counted separately from autonomous fulfilment.',
    'Imported or recorded actions must be replayed and regraded from the fixture; supplied scores are not trusted.',
  ],
};
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--stdout') {
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} else {
  if (args.length && !(args.length === 2 && args[0] === '--out'))
    throw new Error('Use --stdout or --out PATH.');
  const output = resolve(args[1] ?? 'public/proof-evidence.json');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(evidence, null, 2), 'utf8');
  process.stdout.write(`Wrote ${output}: 24 public cases, 72 deterministic reference runs.\n`);
}
