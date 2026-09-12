import { CsvParser, columns, type ColumnMapping } from './csv';

export type CsvPreview = { header: string[]; rows: string[][]; mapping: ColumnMapping };

/** Read a bounded preview through the same streaming parser used for the full import. */
export async function previewCsv(file: Blob): Promise<CsvPreview> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Files must be 25 MB or smaller.');
  const rows: string[][] = [];
  const enough = Symbol('preview complete');
  const parser = new CsvParser((row) => {
    if (row.length > 512) throw new Error('The column limit is 512.');
    rows.push(row);
    if (rows.length === 4) throw enough;
  });
  const reader = file
    .stream()
    .pipeThrough(new TextDecoderStream('utf-8', { fatal: true }))
    .getReader();
  let characters = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        parser.finish();
        break;
      }
      characters += value.length;
      if (characters > 512 * 1024)
        throw new Error('The preview is too wide. Keep the first four records under 512 KB.');
      parser.feed(value);
    }
  } catch (error) {
    if (error !== enough) throw error;
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  if (rows.length < 2) throw new Error('Add a header and at least one order.');
  const header = rows.shift()!;
  const mapping = Object.fromEntries(
    columns.map((name) => [name, header.findIndex((value) => value.trim().toLowerCase() === name)]),
  ) as ColumnMapping;
  return { header, rows, mapping };
}
