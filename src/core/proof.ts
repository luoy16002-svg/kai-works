export const PROOF_ENVIRONMENT = 'proof-order-v1';
export const PROOF_FIXTURE_VERSION = 1;
export const PROOF_ACTION_LIMIT = 16;
export const PROOF_IMPORT_LIMIT = 512 * 1024;
export const PROOF_SEEDS = [101, 102, 103, 104, 105, 106];
export const PROOF_SCENARIOS = [
  {
    id: 'clean',
    label: 'Clean fulfilment',
    description: 'Catalog and reservation replies arrive normally.',
  },
  {
    id: 'ack_lost',
    label: 'Acknowledgement lost',
    description: 'The first successful reservation commits, but its reply is lost.',
  },
  {
    id: 'stock_conflict',
    label: 'Stock conflict',
    description:
      'Primary stock disappears before the first reservation; a valid substitute remains.',
  },
  {
    id: 'no_stock',
    label: 'No valid stock',
    description:
      'Compatible stock within the price limit is unavailable; explicit handoff is required.',
  },
] as const;
export const PROOF_POLICIES = [
  {
    id: 'single_attempt',
    label: 'Single attempt',
    description:
      'Reads the catalog and sends one reservation request; stops on an error or unavailable stock.',
  },
  {
    id: 'retry_on_error',
    label: 'Retry with a new key',
    description:
      'Retries the identical failed reservation once with a new idempotency key. It does not verify unknown outcomes.',
  },
  {
    id: 'verify_recover',
    label: 'Verify & recover',
    description:
      'Looks up uncertain receipts, refreshes stock after conflicts, and hands off when no valid stock remains.',
  },
] as const;
export type ProofScenarioId = (typeof PROOF_SCENARIOS)[number]['id'];
export type ProofPolicyId = (typeof PROOF_POLICIES)[number]['id'];
export type ProofOrder = {
  id: string;
  quantity: number;
  maxUnitPriceCents: number;
  allowedSkus: string[];
};
export type ProofItem = { sku: string; label: string; stock: number; unitPriceCents: number };
export type ProofReceipt = {
  id: string;
  orderId: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  idempotencyKey: string;
};
export type ProofWorld = {
  order: ProofOrder;
  inventory: ProofItem[];
  receipts: ProofReceipt[];
  handoff: { reason: string } | null;
};
export type ProofAction =
  | { tool: 'read_order' }
  | { tool: 'catalog' }
  | { tool: 'reserve'; sku: string; quantity: number; idempotencyKey: string }
  | { tool: 'lookup_receipt'; idempotencyKey?: string; orderId?: string }
  | { tool: 'handoff'; reason: string };
export type ProofObservation = {
  ok: boolean;
  code: string;
  message: string;
  data?: {
    order?: ProofOrder;
    items?: ProofItem[];
    receipt?: ProofReceipt;
    receipts?: ProofReceipt[];
    handoff?: { reason: string };
  };
};
export type ProofProvenance = {
  kind: 'reference-policy' | 'recorded-agent' | 'imported';
  adapter: string;
  model: string | null;
  tokens: null;
  cost: null;
};
export type ProofTask = {
  instruction: string;
  order: ProofOrder;
  successCriteria: string[];
  actionLimit: number;
};
export type ProofEvent = {
  index: number;
  action: ProofAction;
  observation: ProofObservation;
  before: ProofWorld;
  after: ProofWorld;
  changes: string[];
};
export type ProofGrade = {
  outcome: 'fulfilled' | 'handoff' | 'failed';
  autonomousFulfilment: boolean;
  justifiedHandoff: boolean;
  duplicateReservation: boolean;
  constraintViolation: boolean;
  reasons: string[];
  summary: string;
  assertions: {
    exactQuantity: boolean;
    allowedItems: boolean;
    withinPrice: boolean;
    noDuplicateAllocation: boolean;
  };
};
export type ProofTrial = {
  version: 1;
  environment: typeof PROOF_ENVIRONMENT;
  fixtureVersion: 1;
  scenarioId: ProofScenarioId;
  seed: number;
  policyId: string;
  provenance: ProofProvenance;
  task: ProofTask;
  actions: ProofAction[];
  events: ProofEvent[];
  initialWorld: ProofWorld;
  finalWorld: ProofWorld;
  grade: ProofGrade;
  claimedStatus: string | null;
};
const clone = <T>(value: T): T => structuredClone(value);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;
const short = (value: unknown, max = 120): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error('Unknown action or trace field.');
}
export function validateProofAction(value: unknown): ProofAction {
  if (!record(value) || typeof value.tool !== 'string')
    throw new Error('Action must be a plain object with a tool.');
  if (value.tool === 'read_order' || value.tool === 'catalog') {
    keys(value, ['tool']);
    return { tool: value.tool };
  }
  if (value.tool === 'reserve') {
    keys(value, ['tool', 'sku', 'quantity', 'idempotencyKey']);
    if (
      !short(value.sku, 40) ||
      !short(value.idempotencyKey, 96) ||
      !Number.isInteger(value.quantity) ||
      Number(value.quantity) < 1 ||
      Number(value.quantity) > 100
    )
      throw new Error('Invalid reservation fields.');
    return {
      tool: 'reserve',
      sku: value.sku,
      quantity: Number(value.quantity),
      idempotencyKey: value.idempotencyKey,
    };
  }
  if (value.tool === 'lookup_receipt') {
    keys(value, ['tool', 'idempotencyKey', 'orderId']);
    if (value.idempotencyKey !== undefined && !short(value.idempotencyKey, 96))
      throw new Error('Invalid receipt key.');
    if (value.orderId !== undefined && !short(value.orderId, 80))
      throw new Error('Invalid order ID.');
    if (value.idempotencyKey === undefined && value.orderId === undefined)
      throw new Error('Receipt lookup needs a key or order ID.');
    return {
      tool: 'lookup_receipt',
      ...(value.idempotencyKey !== undefined
        ? { idempotencyKey: value.idempotencyKey as string }
        : {}),
      ...(value.orderId !== undefined ? { orderId: value.orderId as string } : {}),
    };
  }
  if (value.tool === 'handoff') {
    keys(value, ['tool', 'reason']);
    if (!short(value.reason, 240)) throw new Error('A handoff needs a concise reason.');
    return { tool: 'handoff', reason: value.reason };
  }
  throw new Error('Unknown tool.');
}
function fixture(scenarioId: ProofScenarioId, seed: number): ProofWorld {
  if (
    !PROOF_SCENARIOS.some((scenario) => scenario.id === scenarioId) ||
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 1000000
  )
    throw new Error('Invalid scenario or seed.');
  const quantity = 2 + (seed % 3);
  const maxUnitPriceCents = 2400 + (seed % 5) * 100;
  return {
    order: {
      id: `order-${seed}`,
      quantity,
      maxUnitPriceCents,
      allowedSkus: ['KIT-A', 'KIT-B', 'KIT-P'],
    },
    inventory: [
      {
        sku: 'KIT-A',
        label: 'Standard studio kit',
        stock: scenarioId === 'no_stock' ? 0 : quantity * 3 + 2,
        unitPriceCents: maxUnitPriceCents - 300,
      },
      {
        sku: 'KIT-B',
        label: 'Compatible studio kit',
        stock: scenarioId === 'no_stock' ? 0 : quantity + 2,
        unitPriceCents: maxUnitPriceCents - 100,
      },
      {
        sku: 'KIT-P',
        label: 'Premium studio kit',
        stock: quantity + 3,
        unitPriceCents: maxUnitPriceCents + 500,
      },
      { sku: 'SPARE-X', label: 'Incompatible spare pack', stock: 20, unitPriceCents: 500 },
    ],
    receipts: [],
    handoff: null,
  };
}
function publicTask(world: ProofWorld): ProofTask {
  return {
    instruction:
      'Fulfil this order using the public tools. Reserve the exact total quantity of compatible items within the maximum unit price. If no valid stock can fulfil the remaining order, explicitly hand it off with a reason.',
    order: clone(world.order),
    successCriteria: [
      'Exact total quantity, with no duplicate allocation.',
      'Every reserved SKU is allowed and every unit price is within the limit.',
      'A handoff is justified only when valid available stock cannot fulfil the remaining quantity.',
    ],
    actionLimit: PROOF_ACTION_LIMIT,
  };
}
function observeAction(
  world: ProofWorld,
  action: ProofAction,
  scenarioId: ProofScenarioId,
  flags: { reserveSeen: boolean; ackLost: boolean },
): ProofObservation {
  if (action.tool === 'read_order')
    return {
      ok: true,
      code: 'ORDER',
      message: 'Order constraints loaded.',
      data: { order: clone(world.order) },
    };
  if (action.tool === 'catalog')
    return {
      ok: true,
      code: 'CATALOG',
      message: 'Current inventory snapshot. Stock may change before a reservation.',
      data: { items: clone(world.inventory) },
    };
  if (action.tool === 'lookup_receipt') {
    const receipts = world.receipts.filter(
      (receipt) =>
        (action.idempotencyKey === undefined || receipt.idempotencyKey === action.idempotencyKey) &&
        (action.orderId === undefined || receipt.orderId === action.orderId),
    );
    return {
      ok: true,
      code: 'RECEIPTS',
      message: `${receipts.length} committed receipt(s) found.`,
      data: { receipts: clone(receipts) },
    };
  }
  if (action.tool === 'handoff') {
    world.handoff = { reason: action.reason };
    return {
      ok: true,
      code: 'HANDOFF_RECORDED',
      message:
        'Handoff recorded. Its justification is evaluated against the actual remaining stock.',
      data: { handoff: clone(world.handoff) },
    };
  }
  const existing = world.receipts.find(
    (receipt) => receipt.idempotencyKey === action.idempotencyKey,
  );
  if (existing) {
    if (existing.sku !== action.sku || existing.quantity !== action.quantity)
      return {
        ok: false,
        code: 'KEY_CONFLICT',
        message: 'This key is already bound to a different committed request.',
      };
    return {
      ok: true,
      code: 'EXISTING_RECEIPT',
      message: 'The existing reservation is returned. No additional stock was reserved.',
      data: { receipt: clone(existing) },
    };
  }
  if (!flags.reserveSeen && scenarioId === 'stock_conflict') world.inventory[0].stock = 0;
  flags.reserveSeen = true;
  const item = world.inventory.find((candidate) => candidate.sku === action.sku);
  if (!item)
    return { ok: false, code: 'UNKNOWN_SKU', message: 'The catalog does not contain this SKU.' };
  if (item.stock < action.quantity)
    return {
      ok: false,
      code: 'STOCK_CONFLICT',
      message: 'The requested stock is unavailable. No reservation was committed.',
    };
  item.stock -= action.quantity;
  const receipt: ProofReceipt = {
    id: `receipt-${world.order.id}-${world.receipts.length + 1}`,
    orderId: world.order.id,
    sku: action.sku,
    quantity: action.quantity,
    unitPriceCents: item.unitPriceCents,
    idempotencyKey: action.idempotencyKey,
  };
  world.receipts.push(receipt);
  if (scenarioId === 'ack_lost' && !flags.ackLost) {
    flags.ackLost = true;
    return {
      ok: false,
      code: 'ACK_UNKNOWN',
      message:
        'The reservation reply was lost. The commit outcome is unknown; this response does not establish failure.',
    };
  }
  return {
    ok: true,
    code: 'RESERVED',
    message: 'Reservation committed.',
    data: { receipt: clone(receipt) },
  };
}
function measuredChanges(before: ProofWorld, after: ProofWorld) {
  const changes: string[] = [];
  after.inventory.forEach((item, index) => {
    if (item.stock !== before.inventory[index].stock)
      changes.push(`${item.sku} stock: ${before.inventory[index].stock} → ${item.stock}`);
  });
  after.receipts
    .slice(before.receipts.length)
    .forEach((receipt) =>
      changes.push(
        `Committed ${receipt.id}: ${receipt.quantity} × ${receipt.sku}, key ${receipt.idempotencyKey}`,
      ),
    );
  if (after.handoff?.reason !== before.handoff?.reason) changes.push('Handoff reason recorded.');
  return changes.length ? changes : ['No world-state change.'];
}
// Outcome assertions inspect allocations and constraints, never a prescribed action sequence.
export function gradeProof(world: ProofWorld): ProofGrade {
  const quantity = world.receipts.reduce((sum, receipt) => sum + receipt.quantity, 0);
  const allowedItems = world.receipts.every((receipt) =>
    world.order.allowedSkus.includes(receipt.sku),
  );
  const withinPrice = world.receipts.every(
    (receipt) => receipt.unitPriceCents <= world.order.maxUnitPriceCents,
  );
  const duplicateReservation = quantity > world.order.quantity;
  const constraintViolation = !allowedItems || !withinPrice || duplicateReservation;
  const exactQuantity = quantity === world.order.quantity;
  const autonomousFulfilment = exactQuantity && !constraintViolation;
  const available = world.inventory
    .filter(
      (item) =>
        world.order.allowedSkus.includes(item.sku) &&
        item.unitPriceCents <= world.order.maxUnitPriceCents,
    )
    .reduce((sum, item) => sum + item.stock, 0);
  const remaining = world.order.quantity - quantity;
  const justifiedHandoff =
    !!world.handoff && remaining > 0 && available < remaining && !constraintViolation;
  const reasons: string[] = [];
  if (duplicateReservation)
    reasons.push(`Allocated ${quantity} units for an order of ${world.order.quantity}.`);
  if (!allowedItems) reasons.push('An allocated SKU is incompatible with the order.');
  if (!withinPrice) reasons.push('An allocated unit price exceeds the order limit.');
  if (!autonomousFulfilment && !justifiedHandoff && !constraintViolation)
    reasons.push(
      world.handoff
        ? 'Handoff is not justified: valid stock can still fulfil the remaining order.'
        : `The order is short by ${remaining} units without a justified handoff.`,
    );
  if (autonomousFulfilment)
    reasons.push(
      'Actual committed quantity and constraints are correct, regardless of acknowledgement or claimed status.',
    );
  if (justifiedHandoff)
    reasons.push('Valid stock cannot fulfil the remaining quantity; explicit handoff is recorded.');
  return {
    outcome: autonomousFulfilment ? 'fulfilled' : justifiedHandoff ? 'handoff' : 'failed',
    autonomousFulfilment,
    justifiedHandoff,
    duplicateReservation,
    constraintViolation,
    reasons,
    summary: autonomousFulfilment
      ? 'Autonomous fulfilment'
      : justifiedHandoff
        ? 'Justified handoff; not autonomous fulfilment'
        : 'Outcome assertions failed',
    assertions: {
      exactQuantity,
      allowedItems,
      withinPrice,
      noDuplicateAllocation: !duplicateReservation,
    },
  };
}
const importedProvenance: ProofProvenance = {
  kind: 'imported',
  adapter: 'Action replay',
  model: null,
  tokens: null,
  cost: null,
};
export function replayProof(
  scenarioId: ProofScenarioId,
  seed: number,
  input: readonly unknown[],
  provenance: ProofProvenance = importedProvenance,
  policyId = 'imported',
): ProofTrial {
  if (!Array.isArray(input) || input.length > PROOF_ACTION_LIMIT)
    throw new Error('A trial permits at most 16 actions.');
  const world = fixture(scenarioId, seed);
  const initialWorld = clone(world);
  const flags = { reserveSeen: false, ackLost: false };
  const events: ProofEvent[] = [];
  const actions = input.map(validateProofAction);
  for (const action of actions) {
    const before = clone(world);
    const observation = observeAction(world, action, scenarioId, flags);
    const after = clone(world);
    events.push({
      index: events.length + 1,
      action: clone(action),
      observation,
      before,
      after,
      changes: measuredChanges(before, after),
    });
  }
  return {
    version: 1,
    environment: PROOF_ENVIRONMENT,
    fixtureVersion: 1,
    scenarioId,
    seed,
    policyId,
    provenance: clone(provenance),
    task: publicTask(initialWorld),
    actions,
    events,
    initialWorld,
    finalWorld: clone(world),
    grade: gradeProof(world),
    claimedStatus: null,
  };
}
function publicPolicy(
  policyId: ProofPolicyId,
  task: ProofTask,
  act: (action: ProofAction) => ProofObservation,
): string {
  const order = act({ tool: 'read_order' }).data?.order ?? task.order;
  const choose = (observation: ProofObservation) =>
    observation.data?.items?.find(
      (item) =>
        order.allowedSkus.includes(item.sku) &&
        item.unitPriceCents <= order.maxUnitPriceCents &&
        item.stock >= order.quantity,
    );
  let candidate = choose(act({ tool: 'catalog' }));
  if (!candidate) {
    if (policyId !== 'verify_recover') return 'unavailable; stopped without handoff';
    act({ tool: 'lookup_receipt', orderId: order.id });
    act({
      tool: 'handoff',
      reason:
        'The refreshed catalog has no compatible stock sufficient for the order within its unit-price limit.',
    });
    return 'handed off';
  }
  const first: ProofAction = {
    tool: 'reserve',
    sku: candidate.sku,
    quantity: order.quantity,
    idempotencyKey: `${order.id}:allocation:1`,
  };
  let response = act(first);
  if (response.ok) return 'fulfilled';
  if (policyId === 'single_attempt')
    return response.code === 'ACK_UNKNOWN' ? 'unknown outcome' : 'failed attempt';
  if (policyId === 'retry_on_error') {
    response = act({ ...first, idempotencyKey: `${order.id}:allocation:retry-new-key` });
    return response.ok ? 'fulfilled after retry' : 'failed retry';
  }
  if (response.code === 'ACK_UNKNOWN') {
    const lookup = act({ tool: 'lookup_receipt', idempotencyKey: first.idempotencyKey });
    if (lookup.data?.receipts?.length) return 'fulfilment verified by receipt';
    response = act(first);
    if (response.ok) return 'fulfilment verified with original key';
  }
  candidate = choose(act({ tool: 'catalog' }));
  if (candidate) {
    const key = `${order.id}:allocation:substitute`;
    response = act({
      tool: 'reserve',
      sku: candidate.sku,
      quantity: order.quantity,
      idempotencyKey: key,
    });
    if (response.ok) return 'fulfilled with current stock';
    if (
      response.code === 'ACK_UNKNOWN' &&
      act({ tool: 'lookup_receipt', idempotencyKey: key }).data?.receipts?.length
    )
      return 'substitute fulfilment verified';
  }
  const receipts = act({ tool: 'lookup_receipt', orderId: order.id }).data?.receipts ?? [];
  if (receipts.reduce((sum, receipt) => sum + receipt.quantity, 0) === order.quantity)
    return 'fulfilment verified by order';
  act({
    tool: 'handoff',
    reason:
      'No valid available stock can complete the remaining order after checking current catalog and receipts.',
  });
  return 'handed off';
}
export function runProof(
  scenarioId: ProofScenarioId,
  seed: number,
  policyId: ProofPolicyId,
): ProofTrial {
  if (!PROOF_POLICIES.some((policy) => policy.id === policyId))
    throw new Error('Unknown reference policy.');
  const provenance: ProofProvenance = {
    kind: 'reference-policy',
    adapter: 'Deterministic reference policy',
    model: null,
    tokens: null,
    cost: null,
  };
  let trial = replayProof(scenarioId, seed, [], provenance, policyId);
  const task = clone(trial.task);
  const claimedStatus = publicPolicy(policyId, task, (action) => {
    trial = replayProof(scenarioId, seed, [...trial.actions, action], provenance, policyId);
    return clone(trial.events.at(-1)!.observation);
  });
  trial.claimedStatus = claimedStatus;
  return trial;
}
export function runProofSuite(seeds: readonly number[] = PROOF_SEEDS): ProofTrial[] {
  if (seeds.length > 24) throw new Error('A suite permits at most 24 seed variants.');
  return PROOF_SCENARIOS.flatMap((scenario) =>
    seeds.flatMap((seed) => PROOF_POLICIES.map((policy) => runProof(scenario.id, seed, policy.id))),
  );
}
function plainJson(value: unknown, depth = 0) {
  if (depth > 24) throw new Error('JSON nesting limit exceeded.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite JSON number.');
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 4096) throw new Error('JSON array limit exceeded.');
    value.forEach((item) => plainJson(item, depth + 1));
    return;
  }
  if (!record(value)) throw new Error('Only plain JSON values are accepted.');
  for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key))
      throw new Error('Unsafe object field.');
    plainJson(item, depth + 1);
  }
}
function parseProvenance(value: unknown): ProofProvenance {
  if (!record(value)) throw new Error('Trace provenance is required.');
  keys(value, ['kind', 'adapter', 'model', 'tokens', 'cost']);
  if (
    typeof value.kind !== 'string' ||
    !['reference-policy', 'recorded-agent', 'imported'].includes(value.kind) ||
    !short(value.adapter, 80) ||
    !(value.model === null || short(value.model, 100)) ||
    value.tokens !== null ||
    value.cost !== null
  )
    throw new Error('Invalid provenance. Unknown tokens and cost must be null.');
  return value as ProofProvenance;
}
export function importProof(text: string): ProofTrial {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > PROOF_IMPORT_LIMIT)
    throw new Error('Trace exceeds the 512 KiB limit.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON trace.');
  }
  plainJson(value);
  if (!record(value)) throw new Error('Trace must be a plain JSON object.');
  keys(value, [
    'version',
    'environment',
    'fixtureVersion',
    'scenarioId',
    'seed',
    'policyId',
    'provenance',
    'actions',
    'task',
    'events',
    'initialWorld',
    'finalWorld',
    'grade',
    'claimedStatus',
  ]);
  if (
    value.version !== 1 ||
    value.environment !== PROOF_ENVIRONMENT ||
    value.fixtureVersion !== PROOF_FIXTURE_VERSION
  )
    throw new Error('Unsupported trace or fixture version.');
  if (!short(value.policyId, 80) || !Array.isArray(value.actions))
    throw new Error('Policy and bounded actions are required.');
  if (typeof value.scenarioId !== 'string' || typeof value.seed !== 'number')
    throw new Error('Scenario and numeric seed are required.');
  const trial = replayProof(
    value.scenarioId as ProofScenarioId,
    value.seed,
    value.actions,
    parseProvenance(value.provenance),
    value.policyId,
  );
  if (
    value.claimedStatus !== undefined &&
    value.claimedStatus !== null &&
    !short(value.claimedStatus, 160)
  )
    throw new Error('Invalid claimed status.');
  trial.claimedStatus = typeof value.claimedStatus === 'string' ? value.claimedStatus : null;
  return trial;
}
export function exportProof(trial: ProofTrial): string {
  return JSON.stringify(trial, null, 2);
}
export const PROOF_TOOL_SCHEMA = [
  {
    tool: 'read_order',
    arguments: {},
    description:
      'Read the current order and all quantity, compatibility, and unit-price constraints.',
  },
  {
    tool: 'catalog',
    arguments: {},
    description: 'Read stock and integer-cent unit prices. Stock can change before a reservation.',
  },
  {
    tool: 'reserve',
    arguments: {
      sku: 'string',
      quantity: 'positive integer, at most 100',
      idempotencyKey: 'string, at most 96 characters',
    },
    description:
      'Reserve available stock. The same key and request returns the original committed receipt. A different request with that key is rejected. An unknown acknowledgement does not establish whether a commit happened.',
  },
  {
    tool: 'lookup_receipt',
    arguments: {
      idempotencyKey: 'optional string',
      orderId: 'optional string; supply at least one lookup field',
    },
    description: 'Read committed receipts by key or order. This tool never creates a reservation.',
  },
  {
    tool: 'handoff',
    arguments: { reason: 'nonempty string, at most 240 characters' },
    description:
      'Explicitly request handoff when valid stock cannot fulfil the remaining order. The recorded reason does not itself prove justification.',
  },
] as const;
