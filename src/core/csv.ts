/** Streaming CSV parser: quoted delimiters/newlines, escaped quotes, BOM and CRLF. */
export class CsvParser {
  private field = '';
  private row: string[] = [];
  private quoted = false;
  private afterQuote = false;
  private skipLF = false;
  private first = true;
  private touched = false;
  private count = 0;
  constructor(
    private emit: (row: string[], rowNumber: number) => void,
    private maxField = 65536,
  ) {}
  private endField() {
    this.row.push(this.field);
    this.field = '';
    this.afterQuote = false;
  }
  private endRow() {
    this.endField();
    this.emit(this.row, ++this.count);
    this.row = [];
    this.touched = false;
  }
  feed(chunk: string) {
    for (const char of chunk) {
      if (this.first) {
        this.first = false;
        if (char === '\uFEFF') continue;
      }
      if (this.skipLF) {
        this.skipLF = false;
        if (char === '\n') continue;
      }
      if (this.quoted) {
        if (char === '"') {
          this.quoted = false;
          this.afterQuote = true;
        } else this.field += char;
      } else if (this.afterQuote && char === '"') {
        this.field += '"';
        this.quoted = true;
        this.afterQuote = false;
      } else if (char === ',') {
        this.endField();
        this.touched = true;
      } else if (char === '\r' || char === '\n') {
        this.endRow();
        this.skipLF = char === '\r';
      } else if (this.afterQuote)
        throw new Error(`Unexpected character after closing quote at row ${this.count + 1}.`);
      else if (char === '"') {
        if (this.field) throw new Error(`Unexpected quote at row ${this.count + 1}.`);
        this.quoted = true;
        this.touched = true;
      } else {
        this.field += char;
        this.touched = true;
      }
      if (this.field.length > this.maxField)
        throw new Error(`Field exceeds ${this.maxField} characters.`);
    }
  }
  finish() {
    if (this.quoted) throw new Error(`Unclosed quote at row ${this.count + 1}.`);
    if (this.touched || this.field || this.row.length || this.afterQuote) this.endRow();
  }
}

export type Order = { id: string; date: string; region: string; channel: string; cents: number };
export const columns = ['id', 'date', 'region', 'channel', 'amount'] as const;
export type ColumnName = (typeof columns)[number];
export type ColumnMapping = Record<ColumnName, number>;
export const defaultMapping: ColumnMapping = { id: 0, date: 1, region: 2, channel: 3, amount: 4 };
export const regions = ['Europe', 'North America', 'Asia Pacific', 'Latin America'];
export const channels = ['Direct', 'Partner', 'Retail'];

export function parseCents(text: string): number {
  if (!/^\d{1,7}\.\d{2}$/.test(text))
    throw new Error(`Amount must be a nonnegative decimal with exactly two places.`);
  return Number(text.replace('.', ''));
}

export function orderCollector(mapping?: ColumnMapping) {
  const rows: Order[] = [];
  const seen = new Set<string>();
  let header = false;
  let width = 5;
  let positions = columns.map((_, index) => index);
  const parser = new CsvParser((fields, line) => {
    if (!header) {
      if (!mapping && fields.join(',') !== columns.join(','))
        throw new Error(`Expected header: ${columns.join(',')}`);
      width = fields.length;
      if (width > 512) throw new Error('The column limit is 512.');
      if (mapping) {
        positions = columns.map((name) => mapping[name]);
        if (positions.some((index) => !Number.isInteger(index) || index < 0 || index >= width))
          throw new Error('Choose an existing source column for each required field.');
        if (new Set(positions).size !== columns.length)
          throw new Error('Each required field needs a different source column.');
      }
      header = true;
      return;
    }
    if (fields.length !== width)
      throw new Error(`Row ${line}: expected ${width} columns, received ${fields.length}.`);
    const [id, date, region, channel, amount] = positions.map((index) => fields[index]);
    if (
      !id ||
      id.length > 128 ||
      !region ||
      region.length > 128 ||
      !channel ||
      channel.length > 128
    )
      throw new Error(`Row ${line}: invalid ID, region or channel.`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      throw new Error(`Row ${line}: invalid calendar date.`);
    if (seen.has(id)) throw new Error(`Row ${line}: duplicate order ID.`);
    seen.add(id);
    let cents: number;
    try {
      cents = parseCents(amount);
    } catch {
      throw new Error(`Row ${line}: amount must be a nonnegative decimal with exactly two places.`);
    }
    rows.push({ id, date, region, channel, cents });
    if (rows.length > 500_000) throw new Error('The local limit is 500,000 rows.');
  });
  return {
    parser,
    rows,
    finish() {
      parser.finish();
      if (!header || !rows.length) throw new Error('The file contains no orders.');
      return rows;
    },
  };
}

export function* syntheticCsv(count: number, seed = 7126): Generator<string> {
  if (!Number.isInteger(count) || count < 1 || count > 500_000)
    throw new Error('Invalid sample size.');
  let state = seed >>> 0;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
  yield columns.join(',') + '\r\n';
  let chunk = '';
  for (let i = 0; i < count; i++) {
    const cents = 1200 + (next() % 97801);
    const date = new Date(Date.UTC(2026, 0, 1 + (next() % 181))).toISOString().slice(0, 10);
    chunk += `ORD-${String(i + 1).padStart(6, '0')},${date},${regions[next() % 4]},${channels[next() % 3]},${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}\r\n`;
    if ((i + 1) % 2000 === 0) {
      yield chunk;
      chunk = '';
    }
  }
  if (chunk) yield chunk;
}

export type Query = {
  search: string;
  region: string;
  channel: string;
  sort: 'id' | 'amount';
  descending: boolean;
};
export const defaultQuery: Query = {
  search: '',
  region: '',
  channel: '',
  sort: 'id',
  descending: false,
};
export function queryOrders(rows: Order[], query: Query) {
  const search = query.search.trim().toLowerCase();
  const filtered = rows.filter(
    (row) =>
      (!query.region || row.region === query.region) &&
      (!query.channel || row.channel === query.channel) &&
      (!search ||
        `${row.id} ${row.date} ${row.region} ${row.channel}`.toLowerCase().includes(search)),
  );
  filtered.sort((a, b) => {
    const compare = query.sort === 'amount' ? a.cents - b.cents : a.id.localeCompare(b.id);
    return (query.descending ? -compare : compare) || a.id.localeCompare(b.id);
  });
  let total = 0;
  const daily = new Map<string, number>();
  for (const row of filtered) {
    total += row.cents;
    if (!Number.isSafeInteger(total)) throw new Error('The total exceeds exact integer precision.');
    daily.set(row.date, (daily.get(row.date) ?? 0) + row.cents);
  }
  return {
    rows: filtered,
    cents: total,
    daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)),
  };
}

/** Prefix spreadsheet formulas on export, then quote every textual value. */
function quote(value: string) {
  return '"' + (/^[\s]*[=+\-@]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
}
export function exportOrders(rows: Order[]): string {
  return (
    columns.join(',') +
    '\r\n' +
    rows
      .map((row) =>
        [
          quote(row.id),
          quote(row.date),
          quote(row.region),
          quote(row.channel),
          `${Math.floor(row.cents / 100)}.${String(row.cents % 100).padStart(2, '0')}`,
        ].join(','),
      )
      .join('\r\n') +
    '\r\n'
  );
}
