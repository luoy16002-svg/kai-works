import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { platform, arch, cpus } from 'node:os';
import { orderCollector, syntheticCsv, queryOrders, defaultQuery } from '../src/core/csv';
import {
  openQueue,
  enqueue,
  claim,
  commit,
  fail,
  snapshot,
  sampleJobs,
  type Job,
} from '../src/core/queue';

const csv = [...syntheticCsv(100000)].join('');
const raw = csv
  .trim()
  .split('\r\n')
  .slice(1)
  .map((line) => line.split(','));
const expected = raw.reduce((sum, row) => sum + BigInt(row[4].replace('.', '')), 0n);
let start = performance.now();
const collector = orderCollector();
for (let i = 0; i < csv.length; i += 32749) collector.parser.feed(csv.slice(i, i + 32749));
const rows = collector.finish();
const parseMs = performance.now() - start;
start = performance.now();
const all = queryOrders(rows, defaultQuery);
assert.equal(BigInt(all.cents), expected);
const result = queryOrders(rows, {
  ...defaultQuery,
  region: 'Europe',
  channel: 'Direct',
  sort: 'amount',
  descending: true,
});
const queryMs = performance.now() - start;
const filtered = raw.filter((row) => row[2] === 'Europe' && row[3] === 'Direct');
assert.equal(
  BigInt(result.cents),
  filtered.reduce((sum, row) => sum + BigInt(row[4].replace('.', '')), 0n),
);
const name = `benchmark-${crypto.randomUUID()}`;
let db = await openQueue(name);
const inputs = sampleJobs('chaos-benchmark', 500, true);
start = performance.now();
await enqueue(db, inputs, 1000);
await enqueue(db, inputs, 1000);
const abandoned: Job[] = [];
for (let i = 0; i < 37; i++) abandoned.push((await claim(db, 1000, 100))!);
db.close();
db = await openQueue(name);
let staleRejected = 0;
for (const job of abandoned) {
  assert.equal(await commit(db, job.id, job.token, 5000), 'stale');
  staleRejected++;
}
let now = 5000,
  rounds = 0;
while ((await snapshot(db)).done < 500) {
  assert.ok(++rounds < 2000);
  const jobs = await Promise.all(Array.from({ length: 7 }, () => claim(db, now, 10000)));
  await Promise.all(
    jobs
      .filter((job): job is Job => !!job)
      .map((job) =>
        job.attempts <= job.failUntil
          ? fail(db, job.id, job.token, now + 1)
          : commit(db, job.id, job.token, now + 1),
      ),
  );
  now += 1000;
}
const final = await snapshot(db);
assert.equal(final.effects.length, 500);
assert.equal(new Set(final.effects.map((e) => e.id)).size, 500);
assert.equal(
  final.total,
  inputs.reduce((sum, job) => sum + job.amount, 0),
);
assert.equal(final.dead, 0);
db.close();
const evidence = {
  date: new Date().toISOString(),
  node: process.versions.node,
  platform: `${platform()} ${arch()} / ${cpus()[0]?.model ?? 'unknown CPU'}`,
  csv: {
    rows: rows.length,
    parseMs,
    queryMs,
    totalCents: all.cents,
    filteredRows: result.rows.length,
  },
  queue: {
    jobs: inputs.length,
    uniqueEffects: final.effects.length,
    attempts: final.attempts,
    expiredLeases: abandoned.length,
    staleRejected,
    total: final.total,
    expected: inputs.reduce((sum, job) => sum + job.amount, 0),
    milliseconds: performance.now() - start,
  },
};
await mkdir('public', { recursive: true });
await writeFile('public/evidence.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
