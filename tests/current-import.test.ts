import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { orderCollector, defaultMapping, defaultQuery, type ColumnMapping } from '../src/core/csv';
import { previewCsv } from '../src/core/csvImport';
import { createDatasetLibrary } from '../src/core/datasets';

const source =
  'memo,total,market,when,ref,sales\r\n"a, note",0.10,EU,2026-09-01,001,Direct\r\n"two\nlines",0.20,US,2026-09-02,002,Retail\r\n';
const mapping: ColumnMapping = { id: 4, date: 3, region: 2, channel: 5, amount: 1 };
const fixture = (id: string) => ({
  id,
  name: id + '.csv',
  file: new Blob([source]),
  rows: 2,
  mapping,
  query: { ...defaultQuery, region: 'EU' },
});

test('mapped columns accept renamed, reordered fields and ignore extra columns without changing exact amounts', () => {
  const collector = orderCollector(mapping);
  for (const char of source) collector.parser.feed(char);
  assert.deepEqual(
    collector.finish().map(({ id, cents, region }) => ({ id, cents, region })),
    [
      { id: '001', cents: 10, region: 'EU' },
      { id: '002', cents: 20, region: 'US' },
    ],
  );
});

test('mapping rejects duplicate, missing, fractional and out-of-range selections', () => {
  for (const position of [0, -1, 1.5, 9, NaN]) {
    const collector = orderCollector({ ...defaultMapping, amount: position });
    assert.throws(() => collector.parser.feed('id,date,region,channel,amount\n'), /source column/);
  }
});

test('mapped imports keep row shape, duplicate ID and invalid amount checks', () => {
  for (const extra of [
    'note,1.00,EU,2026-09-02,001,Direct\n',
    'note,1.001,EU,2026-09-02,003,Direct\n',
    'note,1.00,EU\n',
  ]) {
    const collector = orderCollector(mapping);
    assert.throws(() => {
      collector.parser.feed(source + extra);
      collector.finish();
    }, /Row 4/);
  }
});

test('preview preserves multiline records and identifies canonical names', async () => {
  const preview = await previewCsv(new Blob([source]));
  assert.equal(preview.rows[1][0], 'two\nlines');
  assert.equal(preview.mapping.id, -1);
  const canonical = await previewCsv(
    new Blob(['\uFEFF amount ,id,Date,region,channel\n1.00,a,2026-09-01,EU,Retail']),
  );
  assert.deepEqual(canonical.mapping, { id: 1, date: 2, region: 3, channel: 4, amount: 0 });
  await assert.rejects(
    previewCsv(new Blob(['id,date,region,channel,amount'])),
    /at least one order/,
  );
});

test('library reopens original bytes, mapping and saved filters through a new connection', async () => {
  const factory = new IDBFactory();
  const first = createDatasetLibrary('reopen', factory);
  await first.save(fixture('one'));
  const second = createDatasetLibrary('reopen', factory);
  const saved = await second.get('one');
  assert.equal(await saved?.file.text(), source);
  assert.deepEqual(saved?.mapping, mapping);
  assert.equal(saved?.query.region, 'EU');
  const collector = orderCollector(saved!.mapping);
  collector.parser.feed(await saved!.file.text());
  assert.equal(collector.finish().length, saved?.rows);
  await second.remove('one');
  assert.equal(await first.get('one'), undefined);
  assert.deepEqual(await first.list(), []);
});

test('concurrent saves enforce the capacity atomically, and updates do not use another slot', async () => {
  const factory = new IDBFactory();
  const a = createDatasetLibrary('capacity', factory);
  const b = createDatasetLibrary('capacity', factory);
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, (_, i) => (i % 2 ? a : b).save(fixture(String(i)))),
  );
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 10);
  assert.equal((await a.list()).length, 10);
  const prior = (await a.list())[0];
  await a.save({ ...fixture(prior.id), name: 'renamed.csv' });
  assert.equal((await a.get(prior.id))?.name, 'renamed.csv');
  assert.equal((await a.list()).length, 10);
});

test('invalid overwrite leaves both previous metadata and source bytes intact', async () => {
  const library = createDatasetLibrary('rollback', new IDBFactory());
  await library.save(fixture('one'));
  await assert.rejects(library.save({ ...fixture('one'), name: 'broken.csv', rows: 0 }), /limits/);
  assert.equal((await library.get('one'))?.name, 'one.csv');
  assert.equal(await (await library.get('one'))?.file.text(), source);
});
