import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openQueue,
  enqueue,
  claim,
  commit,
  fail,
  snapshot,
  clearQueue,
  sampleJobs,
  retryDead,
  type Job,
} from '../src/core/queue';
const database = () => openQueue(`test-${crypto.randomUUID()}`);
test('seven competing connections claim distinct jobs and commit one effect each', async () => {
  const name = `concurrent-${crypto.randomUUID()}`;
  const connections = await Promise.all(Array.from({ length: 7 }, () => openQueue(name)));
  await enqueue(connections[0], sampleJobs('batch', 70, false), 1000);
  await Promise.all(
    connections.map(async (db) => {
      while (true) {
        const job = await claim(db, 1000);
        if (!job) break;
        assert.equal(await commit(db, job.id, job.token, 1100), 'committed');
      }
    }),
  );
  const result = await snapshot(connections[0]);
  assert.equal(result.done, 70);
  assert.equal(result.effects.length, 70);
  assert.equal(result.attempts, 70);
  assert.equal(new Set(result.effects.map((e) => e.id)).size, 70);
  for (const db of connections) db.close();
});
test('replayed keys are idempotent and conflicting mixed batches roll back entirely', async () => {
  const db = await database();
  const first = { id: 'existing', amount: 100, failUntil: 0 };
  await enqueue(db, [first], 1000);
  assert.deepEqual(await enqueue(db, [first, first], 1000), { added: 0, duplicates: 2 });
  await assert.rejects(
    enqueue(
      db,
      [
        { id: 'fresh', amount: 300, failUntil: 0 },
        { ...first, amount: 200 },
      ],
      1000,
    ),
    /conflict/,
  );
  const result = await snapshot(db);
  assert.deepEqual(
    result.jobs.map((j) => j.id),
    ['existing'],
  );
  assert.equal(result.events.length, 1);
  db.close();
});
test('reopening storage recovers an abandoned lease and rejects its old token', async () => {
  const name = `restart-${crypto.randomUUID()}`;
  let db = await openQueue(name);
  await enqueue(db, [{ id: 'one', amount: 7366, failUntil: 0 }], 1000);
  const original = (await claim(db, 1000, 100))!;
  db.close();
  db = await openQueue(name);
  assert.equal(await claim(db, 1099), null);
  assert.equal(await commit(db, 'one', original.token, 1100), 'stale');
  const recovered = (await claim(db, 1100))!;
  assert.equal(recovered.attempts, 2);
  assert.notEqual(recovered.token, original.token);
  assert.equal(await commit(db, 'one', original.token, 1101), 'stale');
  assert.equal(await fail(db, 'one', original.token, 1101), false);
  assert.equal(await commit(db, 'one', recovered.token, 1101), 'committed');
  assert.equal(await commit(db, 'one', recovered.token, 1102), 'already-committed');
  const result = await snapshot(db);
  assert.equal(result.total, 7366);
  assert.equal(result.effects.length, 1);
  db.close();
});
test('effect write failure aborts the accompanying job completion and event', async () => {
  const db = await database();
  await enqueue(db, [{ id: 'conflict', amount: 5, failUntil: 0 }], 1000);
  const job = (await claim(db, 1000))!;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('effects', 'readwrite');
    tx.objectStore('effects').add({ id: 'conflict', amount: 5, committedAt: 1001 });
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  await assert.rejects(commit(db, job.id, job.token, 1001));
  const result = await snapshot(db);
  assert.equal(result.jobs[0].status, 'running');
  assert.equal(result.events.filter((e) => e.kind === 'committed').length, 0);
  db.close();
});
test('backoff defers claims and four failed attempts produce a dead letter', async () => {
  const db = await database();
  await enqueue(db, [{ id: 'bad', amount: 12, failUntil: 9 }], 1000);
  let now = 1000;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const job = (await claim(db, now))!;
    assert.equal(job.attempts, attempt);
    assert.equal(await fail(db, job.id, job.token, now + 1), true);
    assert.equal(await claim(db, now + 2), null);
    now += 2000;
  }
  let result = await snapshot(db);
  assert.equal(result.dead, 1);
  assert.equal(result.effects.length, 0);
  assert.equal(await claim(db, 20000), null);
  assert.equal(await retryDead(db), 1);
  result = await snapshot(db);
  assert.equal(result.queued, 1);
  assert.equal(result.jobs[0].attempts, 0);
  db.close();
});
test('clearing during an abandoned claim prevents a late effect', async () => {
  const db = await database();
  await enqueue(db, sampleJobs('clear', 3, false), 1000);
  const job = (await claim(db, 1000))!;
  await clearQueue(db);
  assert.equal(await commit(db, job.id, job.token, 1001), 'stale');
  const result = await snapshot(db);
  assert.equal(result.jobs.length, 0);
  assert.equal(result.effects.length, 0);
  assert.equal(result.events.length, 0);
  db.close();
});
test('500 jobs converge under crashes, retries and duplicate submissions', async () => {
  const db = await database();
  const inputs = sampleJobs('chaos', 500, true);
  await enqueue(db, inputs, 1000);
  await enqueue(db, inputs, 1000);
  const abandoned: Job[] = [];
  for (let i = 0; i < 37; i++) abandoned.push((await claim(db, 1000, 100))!);
  let now = 5000;
  let iterations = 0;
  while (true) {
    const result = await snapshot(db);
    if (result.done === 500) break;
    assert.ok(++iterations < 2000, 'bounded convergence');
    const batch = await Promise.all(Array.from({ length: 7 }, () => claim(db, now, 10000)));
    await Promise.all(
      batch
        .filter((job): job is Job => !!job)
        .map(async (job) => {
          if (job.attempts <= job.failUntil) await fail(db, job.id, job.token, now + 1);
          else assert.equal(await commit(db, job.id, job.token, now + 1), 'committed');
        }),
    );
    now += 1000;
  }
  const result = await snapshot(db);
  assert.equal(result.effects.length, 500);
  assert.equal(result.dead, 0);
  assert.equal(
    result.total,
    inputs.reduce((n, j) => n + j.amount, 0),
  );
  assert.equal(new Set(result.effects.map((e) => e.id)).size, 500);
  for (const job of abandoned)
    assert.equal(await commit(db, job.id, job.token, now), 'already-committed');
  db.close();
});
test('invalid input late in a batch leaves no partial jobs', async () => {
  const db = await database();
  await assert.rejects(
    enqueue(
      db,
      [
        { id: 'ok', amount: 100, failUntil: 0 },
        { id: 'no', amount: 0.5, failUntil: 0 },
      ],
      1000,
    ),
    /Invalid/,
  );
  assert.equal((await snapshot(db)).jobs.length, 0);
  db.close();
});
