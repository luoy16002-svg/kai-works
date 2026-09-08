import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  PROOF_ACTION_LIMIT,
  PROOF_ENVIRONMENT,
  PROOF_FIXTURE_VERSION,
  PROOF_TOOL_SCHEMA,
  exportProof,
  importProof,
  replayProof,
  validateProofAction,
  type ProofTrial,
  type ProofScenarioId,
} from '../src/core/proof';

const [command, ...arguments_] = process.argv.slice(2);
function options() {
  const result = new Map<string, string>();
  const allowed = [
    '--session',
    '--scenario',
    '--seed',
    '--model',
    '--adapter',
    '--action-file',
    '--action',
    '--out',
  ];
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index],
      value = arguments_[index + 1];
    if (!allowed.includes(key) || value === undefined || result.has(key))
      throw new Error(
        'Expected named options with separate values; use --session PATH and --action-file PATH.',
      );
    result.set(key, value);
  }
  return result;
}
function store(trial: ProofTrial) {
  return {
    version: trial.version,
    environment: trial.environment,
    fixtureVersion: trial.fixtureVersion,
    scenarioId: trial.scenarioId,
    seed: trial.seed,
    policyId: trial.policyId,
    provenance: trial.provenance,
    actions: trial.actions,
    claimedStatus: trial.claimedStatus,
  };
}
function publicView(trial: ProofTrial, exportedPath?: string) {
  return {
    task: trial.task,
    tools: PROOF_TOOL_SCHEMA,
    actionFormat: {
      instruction:
        'Action JSON is one flat object. Put tool arguments alongside tool; do not wrap in arguments or args.',
      examples: [
        { tool: 'catalog' },
        { tool: 'reserve', sku: 'KIT-A', quantity: 1, idempotencyKey: 'example-key' },
      ],
    },
    budgetScope:
      'Accepted world tool actions only; rejected CLI or schema submissions are excluded.',
    actionsUsed: trial.actions.length,
    actionsRemaining: PROOF_ACTION_LIMIT - trial.actions.length,
    observation: trial.events.at(-1)?.observation ?? null,
    ...(exportedPath ? { exportedPath } : {}),
  };
}
try {
  const args = options();
  const sessionArg = args.get('--session');
  if (!sessionArg || !['init', 'observe', 'act', 'export'].includes(command))
    throw new Error(
      'Usage: proof-session.ts init|observe|act|export --session PATH. Init requires --scenario ID --seed NUMBER; act requires --action-file PATH (or --action JSON).',
    );
  const session = resolve(sessionArg);
  let trial: ProofTrial;
  if (command === 'init') {
    if (existsSync(session))
      throw new Error('Session already exists; choose a fresh path for a new trial.');
    const scenarioId = args.get('--scenario');
    const seedText = args.get('--seed');
    if (!scenarioId || !seedText || !/^\d+$/.test(seedText))
      throw new Error('Init requires --scenario ID and --seed NUMBER.');
    const model = args.get('--model') ?? null;
    trial = importProof(
      JSON.stringify({
        version: 1,
        environment: PROOF_ENVIRONMENT,
        fixtureVersion: PROOF_FIXTURE_VERSION,
        scenarioId,
        seed: Number(seedText),
        policyId: 'recorded_agent',
        provenance: {
          kind: 'recorded-agent',
          adapter: args.get('--adapter') ?? 'Local tool session',
          model,
          tokens: null,
          cost: null,
        },
        actions: [],
      }),
    );
    mkdirSync(dirname(session), { recursive: true });
    writeFileSync(session, JSON.stringify(store(trial), null, 2), 'utf8');
  } else {
    // A saved session is data, never trusted state. Revalidate and replay every command.
    trial = importProof(readFileSync(session, 'utf8'));
  }
  if (command === 'act') {
    const actionPath = args.get('--action-file');
    const actionLiteral = args.get('--action');
    if ((!actionPath && !actionLiteral) || (actionPath && actionLiteral))
      throw new Error('Supply exactly one of --action-file PATH or --action JSON.');
    const text = actionPath ? readFileSync(resolve(actionPath), 'utf8') : actionLiteral!;
    if (Buffer.byteLength(text, 'utf8') > 4096) throw new Error('Action JSON exceeds 4 KiB.');
    const action = validateProofAction(JSON.parse(text.replace(/^\uFEFF/, '')));
    trial = replayProof(
      trial.scenarioId as ProofScenarioId,
      trial.seed,
      [...trial.actions, action],
      trial.provenance,
      trial.policyId,
    );
    writeFileSync(session, JSON.stringify(store(trial), null, 2), 'utf8');
  }
  let exportedPath: string | undefined;
  if (command === 'export') {
    exportedPath = resolve(args.get('--out') ?? `${session}.trace.json`);
    if (exportedPath === session)
      throw new Error('Export must use a different path from the active session.');
    mkdirSync(dirname(exportedPath), { recursive: true });
    writeFileSync(exportedPath, exportProof(trial), 'utf8');
  }
  // Acting agents never receive fixture IDs, hidden transitions, final state, or grades here.
  process.stdout.write(`${JSON.stringify(publicView(trial, exportedPath), null, 2)}\n`);
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({ error: error instanceof Error ? error.message : 'Protocol failed.' })}\n`,
  );
  process.exitCode = 1;
}
