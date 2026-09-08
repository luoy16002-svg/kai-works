export type Job = {
  id: string;
  amount: number;
  failUntil: number;
  status: 'queued' | 'running' | 'done' | 'dead';
  attempts: number;
  availableAt: number;
  leaseUntil: number;
  token: string;
};
export type Effect = { id: string; amount: number; committedAt: number };
export type QueueEvent = {
  seq?: number;
  time: number;
  id: string;
  attempt: number;
  kind: 'enqueued' | 'claimed' | 'recovered' | 'committed' | 'retry' | 'dead' | 'manual-retry';
};
export type QueueSnapshot = {
  jobs: Job[];
  effects: Effect[];
  events: QueueEvent[];
  queued: number;
  running: number;
  done: number;
  dead: number;
  attempts: number;
  total: number;
};
export const LEASE_MS = 2500;
export const MAX_ATTEMPTS = 4;

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
}
export function openQueue(name = 'kai-relay-v1'): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const value = indexedDB.open(name, 1);
    value.onupgradeneeded = () => {
      const db = value.result;
      db.createObjectStore('jobs', { keyPath: 'id' });
      db.createObjectStore('effects', { keyPath: 'id' });
      db.createObjectStore('events', { keyPath: 'seq', autoIncrement: true });
    };
    value.onerror = () => reject(value.error);
    value.onsuccess = () => {
      value.result.onversionchange = () => value.result.close();
      resolve(value.result);
    };
  });
}
async function transaction<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const tx = db.transaction(
    stores,
    mode,
    mode === 'readwrite' ? { durability: 'strict' } : undefined,
  );
  const completed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted.'));
    tx.onerror = () => {};
  });
  // Attach a rejection handler immediately, including when body fails before the abort event.
  completed.catch(() => {});
  try {
    const result = await body(tx);
    await completed;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {}
    await completed.catch(() => {});
    throw error;
  }
}
function event(tx: IDBTransaction, job: Job, kind: QueueEvent['kind'], now: number) {
  tx.objectStore('events').add({ time: now, id: job.id, attempt: job.attempts, kind });
}
export async function enqueue(
  db: IDBDatabase,
  inputs: { id: string; amount: number; failUntil: number }[],
  now = Date.now(),
) {
  if (inputs.length > 1000) throw new Error('A batch can contain at most 1,000 jobs.');
  return transaction(db, ['jobs', 'events'], 'readwrite', async (tx) => {
    const jobs = tx.objectStore('jobs');
    let added = 0,
      duplicates = 0;
    const count = await request(jobs.count());
    for (const input of inputs) {
      if (
        !input.id ||
        input.id.length > 128 ||
        !Number.isSafeInteger(input.amount) ||
        input.amount < 0 ||
        input.amount > 1_000_000 ||
        !Number.isInteger(input.failUntil) ||
        input.failUntil < 0 ||
        input.failUntil > 9
      )
        throw new Error('Invalid job payload.');
      const existing: Job | undefined = await request(jobs.get(input.id));
      if (existing) {
        if (existing.amount !== input.amount || existing.failUntil !== input.failUntil)
          throw new Error('Idempotency conflict: the same key has different input.');
        duplicates++;
        continue;
      }
      if (count + ++added > 5000)
        throw new Error('Local queue limit: 5,000 jobs. Clear the lab to start again.');
      const job: Job = {
        ...input,
        status: 'queued',
        attempts: 0,
        availableAt: now,
        leaseUntil: 0,
        token: '',
      };
      jobs.add(job);
      event(tx, job, 'enqueued', now);
    }
    return { added, duplicates };
  });
}
export async function claim(
  db: IDBDatabase,
  now = Date.now(),
  lease = LEASE_MS,
): Promise<Job | null> {
  return transaction(db, ['jobs', 'events'], 'readwrite', async (tx) => {
    const store = tx.objectStore('jobs');
    const jobs: Job[] = await request(store.getAll());
    for (const job of jobs) {
      const expired = job.status === 'running' && job.leaseUntil <= now;
      if (!(job.status === 'queued' && job.availableAt <= now) && !expired) continue;
      if (job.attempts >= MAX_ATTEMPTS) {
        job.status = 'dead';
        store.put(job);
        event(tx, job, 'dead', now);
        continue;
      }
      job.status = 'running';
      job.attempts++;
      job.token = crypto.randomUUID();
      job.leaseUntil = now + lease;
      store.put(job);
      event(tx, job, expired ? 'recovered' : 'claimed', now);
      return job;
    }
    return null;
  });
}
export async function commit(
  db: IDBDatabase,
  id: string,
  token: string,
  now = Date.now(),
): Promise<'committed' | 'already-committed' | 'stale'> {
  return transaction(db, ['jobs', 'effects', 'events'], 'readwrite', async (tx) => {
    const store = tx.objectStore('jobs');
    const job: Job | undefined = await request(store.get(id));
    if (!job) return 'stale';
    if (job.status === 'done') return 'already-committed';
    if (job.status !== 'running' || job.token !== token || job.leaseUntil <= now) return 'stale';
    tx.objectStore('effects').add({ id, amount: job.amount, committedAt: now } satisfies Effect);
    job.status = 'done';
    job.leaseUntil = 0;
    store.put(job);
    event(tx, job, 'committed', now);
    return 'committed';
  });
}
export async function fail(db: IDBDatabase, id: string, token: string, now = Date.now()) {
  return transaction(db, ['jobs', 'events'], 'readwrite', async (tx) => {
    const store = tx.objectStore('jobs');
    const job: Job | undefined = await request(store.get(id));
    if (!job || job.status !== 'running' || job.token !== token || job.leaseUntil <= now)
      return false;
    job.status = job.attempts >= MAX_ATTEMPTS ? 'dead' : 'queued';
    job.availableAt = now + Math.min(2000, 150 * 2 ** (job.attempts - 1));
    job.leaseUntil = 0;
    store.put(job);
    event(tx, job, job.status === 'dead' ? 'dead' : 'retry', now);
    return true;
  });
}
export async function retryDead(db: IDBDatabase) {
  return transaction(db, ['jobs', 'events'], 'readwrite', async (tx) => {
    const store = tx.objectStore('jobs');
    const jobs: Job[] = await request(store.getAll());
    let count = 0;
    for (const job of jobs)
      if (job.status === 'dead') {
        job.status = 'queued';
        job.attempts = 0;
        job.availableAt = Date.now();
        job.token = '';
        job.leaseUntil = 0;
        store.put(job);
        event(tx, job, 'manual-retry', Date.now());
        count++;
      }
    return count;
  });
}
export async function snapshot(db: IDBDatabase): Promise<QueueSnapshot> {
  return transaction(db, ['jobs', 'effects', 'events'], 'readonly', async (tx) => {
    const [jobs, effects, events] = await Promise.all([
      request<Job[]>(tx.objectStore('jobs').getAll()),
      request<Effect[]>(tx.objectStore('effects').getAll()),
      new Promise<QueueEvent[]>((resolve, reject) => {
        const result: QueueEvent[] = [];
        const cursor = tx.objectStore('events').openCursor(null, 'prev');
        cursor.onerror = () => reject(cursor.error);
        cursor.onsuccess = () => {
          const row = cursor.result;
          if (!row || result.length >= 45) {
            resolve(result);
            return;
          }
          result.push(row.value);
          row.continue();
        };
      }),
    ]);
    return {
      jobs,
      effects,
      events,
      queued: jobs.filter((j) => j.status === 'queued').length,
      running: jobs.filter((j) => j.status === 'running').length,
      done: jobs.filter((j) => j.status === 'done').length,
      dead: jobs.filter((j) => j.status === 'dead').length,
      attempts: jobs.reduce((n, j) => n + j.attempts, 0),
      total: effects.reduce((n, e) => n + e.amount, 0),
    };
  });
}
export function clearQueue(db: IDBDatabase) {
  return transaction(db, ['jobs', 'effects', 'events'], 'readwrite', async (tx) => {
    for (const name of ['jobs', 'effects', 'events']) tx.objectStore(name).clear();
  });
}
export function sampleJobs(batch: string, count: number, failures = true) {
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Invalid batch size.');
  return Array.from({ length: count }, (_, i) => ({
    id: `${batch}/${String(i + 1).padStart(4, '0')}`,
    amount: 100 + ((i * 7919) % 99901),
    failUntil: failures ? (i % 17 === 0 ? 2 : i % 7 === 0 ? 1 : 0) : 0,
  }));
}
