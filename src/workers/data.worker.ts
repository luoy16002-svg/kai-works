import {
  orderCollector,
  syntheticCsv,
  queryOrders,
  defaultQuery,
  exportOrders,
  type Order,
  type Query,
} from '../core/csv';
let rows: Order[] = [];
let cachedKey = '';
let cached = queryOrders([], defaultQuery);
let cachedMilliseconds = 0;
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
let loading = false;
self.onmessage = async (event: MessageEvent) => {
  const { type, id } = event.data;
  try {
    if (type === 'generate' || type === 'file') {
      if (loading) throw new Error('An import is already running.');
      loading = true;
      const start = performance.now();
      const collector = orderCollector();
      if (type === 'generate') {
        const count = event.data.count;
        for (const chunk of syntheticCsv(count)) {
          collector.parser.feed(chunk);
          self.postMessage({
            type: 'progress',
            id,
            progress: Math.round((collector.rows.length / count) * 100),
          });
          await pause();
        }
      } else {
        const file: File = event.data.file;
        if (file.size > 25 * 1024 * 1024) throw new Error('Files must be 25 MB or smaller.');
        const reader = file
          .stream()
          .pipeThrough(new TextDecoderStream('utf-8', { fatal: true }))
          .getReader();
        let received = 0;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            collector.parser.feed(value);
            received += new TextEncoder().encode(value).byteLength;
            self.postMessage({
              type: 'progress',
              id,
              progress: Math.min(99, Math.round((received / file.size) * 100)),
            });
            await pause();
          }
        } finally {
          reader.releaseLock();
        }
      }
      rows = collector.finish();
      cachedKey = '';
      self.postMessage({
        type: 'loaded',
        id,
        count: rows.length,
        milliseconds: performance.now() - start,
        regions: [...new Set(rows.map((r) => r.region))].sort(),
        channels: [...new Set(rows.map((r) => r.channel))].sort(),
      });
      loading = false;
    } else if (type === 'query' || type === 'export') {
      if (loading) return;
      const query: Query = event.data.query;
      const start = performance.now();
      const key = JSON.stringify(query);
      if (key !== cachedKey) {
        cached = queryOrders(rows, query);
        cachedKey = key;
        cachedMilliseconds = performance.now() - start;
      }
      if (type === 'export') {
        self.postMessage({ type: 'exported', id, csv: exportOrders(cached.rows) });
        return;
      }
      const offset = Math.max(
        0,
        Math.min(event.data.offset ?? 0, Math.max(0, cached.rows.length - 1)),
      );
      self.postMessage({
        type: 'result',
        id,
        query,
        offset,
        rows: cached.rows.slice(offset, offset + 35),
        count: cached.rows.length,
        cents: cached.cents,
        daily: cached.daily,
        milliseconds: cachedMilliseconds,
      });
    }
  } catch (error) {
    loading = false;
    self.postMessage({
      type: 'error',
      id,
      message: error instanceof Error ? error.message : 'The operation failed.',
    });
  }
};
