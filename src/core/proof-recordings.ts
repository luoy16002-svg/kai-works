import { importProof, PROOF_IMPORT_LIMIT, type ProofTrial } from './proof';

export type RecordingMetadata = {
  acceptedActions: number;
  rejectedSubmissions: number;
  notes: string;
};
export type RecordedLoad = {
  state: 'loading' | 'unavailable' | 'ready' | 'error';
  trials: ProofTrial[];
  rejected: string[];
  message: string;
  total: number;
  recording?: RecordingMetadata;
};

export async function boundedText(response: Response) {
  const limit = PROOF_IMPORT_LIMIT * 8;
  if (!response.body) {
    const text = await response.text();
    if (text.length > limit) throw new Error('Recording exceeds the size limit.');
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error('Recording exceeds the size limit.');
    }
    chunks.push(item.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}

export function readRecorded(text: string): RecordedLoad {
  const parsed: unknown = JSON.parse(text);
  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'trials' in parsed
      ? (parsed as { trials: unknown }).trials
      : null;
  if (!Array.isArray(items) || items.length < 1 || items.length > 24)
    throw new Error('Recording must contain 1–24 exported trials.');
  const trials: ProofTrial[] = [],
    rejected: string[] = [];
  items.forEach((value, index) => {
    try {
      trials.push(importProof(typeof value === 'string' ? value : JSON.stringify(value)));
    } catch (error) {
      rejected.push(
        `Trial ${index + 1}: ${error instanceof Error ? error.message : 'Invalid trace.'}`,
      );
    }
  });
  let recording: RecordingMetadata | undefined;
  const metadata =
    parsed && typeof parsed === 'object' && 'recording' in parsed
      ? (parsed as { recording: unknown }).recording
      : null;
  if (
    metadata &&
    typeof metadata === 'object' &&
    'acceptedActions' in metadata &&
    'rejectedSubmissions' in metadata
  ) {
    const values = metadata as {
      acceptedActions: unknown;
      rejectedSubmissions: unknown;
      notes?: unknown;
    };
    if (
      Number.isSafeInteger(values.acceptedActions) &&
      Number(values.acceptedActions) >= 0 &&
      Number(values.acceptedActions) <= 384 &&
      Number.isSafeInteger(values.rejectedSubmissions) &&
      Number(values.rejectedSubmissions) >= 0 &&
      Number(values.rejectedSubmissions) <= 10000
    ) {
      recording = {
        acceptedActions: Number(values.acceptedActions),
        rejectedSubmissions: Number(values.rejectedSubmissions),
        notes: typeof values.notes === 'string' ? values.notes.slice(0, 1000) : '',
      };
    }
  }
  return { state: 'ready', trials, rejected, total: items.length, message: '', recording };
}
