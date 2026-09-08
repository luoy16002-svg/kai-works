import type { ProofAction, ProofTrial } from './proof';

export const PROOF_EVENT_SECONDS = 2.2;
export const PROOF_RESULT_SECONDS = 1.3;
export const PROOF_COMMIT_PHASE = 0.54;

export const proofToolLabel: Record<ProofAction['tool'], string> = {
  read_order: 'Read order',
  catalog: 'Read catalog',
  reserve: 'Reserve stock',
  lookup_receipt: 'Verify receipt',
  handoff: 'Hand off',
};

/** Integer positions are the completed event, including when inspecting backwards. */
export function proofVisualFrame(trial: ProofTrial, position: number) {
  const count = trial.events.length;
  const head = Math.max(0, Math.min(count + 1, Number.isFinite(position) ? position : 0));
  const index = Math.max(0, Math.min(count - 1, Math.ceil(head) - 1));
  const event = trial.events[index] ?? null;
  const phase = Math.min(1, Math.max(0, head - index));
  const applied = !!event && phase >= PROOF_COMMIT_PHASE;
  const world = event ? (applied ? event.after : event.before) : trial.initialWorld;
  const allocation = world.receipts.reduce((total, receipt) => total + receipt.quantity, 0);
  return {
    head,
    index,
    event,
    phase,
    applied,
    world,
    allocation,
    complete: head >= count,
    resultProgress: Math.max(0, head - count),
    committed: !!event && event.after.receipts.length > event.before.receipts.length,
    replied: phase >= 0.96,
  };
}

/** Advance through uniform event beats and a separate 1.3 second result hold. */
export function advanceProofHead(head: number, events: number, seconds: number, speed = 1) {
  const bounded = Math.max(0, Math.min(events + 1, head));
  const elapsed =
    Math.min(bounded, events) * PROOF_EVENT_SECONDS +
    Math.max(0, bounded - events) * PROOF_RESULT_SECONDS;
  const next = elapsed + Math.max(0, seconds) * speed;
  const eventTime = events * PROOF_EVENT_SECONDS;
  return Math.min(
    events + 1,
    next < eventTime
      ? next / PROOF_EVENT_SECONDS
      : events + (next - eventTime) / PROOF_RESULT_SECONDS,
  );
}

export function proofActionSummary(action: ProofAction) {
  switch (action.tool) {
    case 'reserve':
      return `Reserve ${action.quantity} × ${action.sku}`;
    case 'lookup_receipt':
      return action.idempotencyKey ? 'Look up the reservation key' : 'Look up the order receipts';
    case 'read_order':
      return 'Read quantity, allowed items, and price limit';
    case 'catalog':
      return 'Read available stock and item prices';
    case 'handoff':
      return 'Pass the unfulfilled order to a person';
  }
}
