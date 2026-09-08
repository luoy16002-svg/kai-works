import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CsvParser,
  orderCollector,
  parseCents,
  syntheticCsv,
  queryOrders,
  defaultQuery,
  exportOrders,
} from '../src/core/csv';
function parse(input: string, size = 7) {
  const result: string[][] = [];
  const parser = new CsvParser((row) => result.push(row));
  for (let i = 0; i < input.length; i += size) parser.feed(input.slice(i, i + size));
  parser.finish();
  return result;
}
test('every chunk size preserves BOM, escaped quotes, commas, CRLF and quoted newlines', () => {
  const source = '\uFEFFa,b,c\r\n"hello, world","two ""quotes""","line1\r\nline2"\r\n"",last,';
  const expected = [
    ['a', 'b', 'c'],
    ['hello, world', 'two "quotes"', 'line1\r\nline2'],
    ['', 'last', ''],
  ];
  for (let size = 1; size <= source.length; size++)
    assert.deepEqual(parse(source, size), expected, `chunk size ${size}`);
});
test('500 seeded randomized round trips preserve arbitrary CSV text', () => {
  let state = 701;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  const chars = ['a', 'Z', '0', ',', '"', '\r', '\n', ' ', '汉', 'é'];
  for (let trial = 0; trial < 500; trial++) {
    const rows = Array.from({ length: 1 + (random() % 8) }, () =>
      Array.from({ length: 1 + (random() % 7) }, () =>
        Array.from({ length: random() % 35 }, () => chars[random() % chars.length]).join(''),
      ),
    );
    const csv = rows
      .map((row) => row.map((value) => '"' + value.replaceAll('"', '""') + '"').join(','))
      .join('\r\n');
    assert.deepEqual(parse(csv, 1 + (random() % 19)), rows, `trial ${trial}`);
  }
});
test('malformed quotes and excessive fields stop parsing', () => {
  for (const source of ['a"b,c', '"unclosed', '"closed"x,a']) assert.throws(() => parse(source));
  const parser = new CsvParser(() => {}, 3);
  assert.throws(() => parser.feed('abcd'), /exceeds/);
});
test('empty fields and trailing delimiters do not disappear', () => {
  assert.deepEqual(parse(',\r\n,,\nlast,'), [
    ['', ''],
    ['', '', ''],
    ['last', ''],
  ]);
  assert.deepEqual(parse(''), []);
});
test('money uses exact minor units and rejects ambiguity', () => {
  assert.equal(parseCents('0.01'), 1);
  assert.equal(parseCents('9999999.99'), 999999999);
  assert.equal(parseCents('0.00'), 0);
  for (const value of [
    '1',
    '0.001',
    '1.000',
    '1e2',
    '-1.00',
    'NaN',
    '1,200.00',
    ' 1.00',
    '10000000.00',
  ])
    assert.throws(() => parseCents(value));
});
test('strict schema, date, ID uniqueness and precision reject the whole import', () => {
  for (const source of [
    'ID,date,region,channel,amount\na,2026-01-01,A,B,1.00',
    'id,date,region,channel,amount\na,2026-02-30,A,B,1.00',
    'id,date,region,channel,amount\na,2026-01-01,A,B,1.00\na,2026-01-02,A,B,2.00',
    'id,date,region,channel,amount\na,2026-01-01,A,B,1.000',
    'id,date,region,channel,amount\n',
    '',
  ]) {
    const collector = orderCollector();
    assert.throws(() => {
      collector.parser.feed(source);
      collector.finish();
    });
  }
});
test('100,000 rows agree with an independent BigInt reference for sums, filters and sort', () => {
  const text = [...syntheticCsv(100000)].join('');
  const raw = text
    .trim()
    .split('\r\n')
    .slice(1)
    .map((line) => line.split(','));
  const referenceTotal = raw.reduce((total, row) => total + BigInt(row[4].replace('.', '')), 0n);
  const collector = orderCollector();
  for (let i = 0; i < text.length; i += 4093) collector.parser.feed(text.slice(i, i + 4093));
  const rows = collector.finish();
  assert.equal(rows.length, 100000);
  const all = queryOrders(rows, defaultQuery);
  assert.equal(BigInt(all.cents), referenceTotal);
  const target = raw.filter((row) => row[2] === 'Europe' && row[3] === 'Direct');
  const queried = queryOrders(rows, {
    ...defaultQuery,
    region: 'Europe',
    channel: 'Direct',
    sort: 'amount',
    descending: true,
  });
  assert.equal(queried.rows.length, target.length);
  assert.equal(
    BigInt(queried.cents),
    target.reduce((sum, row) => sum + BigInt(row[4].replace('.', '')), 0n),
  );
  assert.equal(
    queried.daily.reduce((sum, [, value]) => sum + value, 0),
    queried.cents,
  );
  for (let i = 1; i < queried.rows.length; i++)
    assert.ok(queried.rows[i - 1].cents >= queried.rows[i].cents);
  assert.equal(rows[0].id, 'ORD-000001', 'query did not mutate input order');
});
test('filter search is literal and exporting neutralizes spreadsheet formula prefixes', () => {
  const rows = [{ id: '=2+2', date: '2026-01-01', region: ' +ABC', channel: '@test', cents: 1099 }];
  assert.equal(queryOrders(rows, { ...defaultQuery, search: '=2+' }).rows.length, 1);
  assert.equal(queryOrders(rows, { ...defaultQuery, search: '.*' }).rows.length, 0);
  const result = parse(exportOrders(rows));
  assert.equal(result[1][0], "'=2+2");
  assert.equal(result[1][2], "' +ABC");
  assert.equal(result[1][3], "'@test");
  assert.equal(result[1][4], '10.99');
});
