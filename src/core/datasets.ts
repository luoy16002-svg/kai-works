import type { ColumnMapping, Query } from './csv';

export type DatasetMeta = {
  id: string;
  name: string;
  size: number;
  rows: number;
  savedAt: number;
  mapping: ColumnMapping;
  query: Query;
};
export type Dataset = DatasetMeta & { file: Blob };
export type SaveDataset = Omit<Dataset, 'id' | 'size' | 'savedAt'> & { id?: string };
const MAX_FILES = 10;
const MAX_BYTES = 100 * 1024 * 1024;

/** Metadata and source bytes commit together. Capacity checks run in the same write transaction. */
export function createDatasetLibrary(
  name = 'kai-current-datasets',
  factory = globalThis.indexedDB,
) {
  async function open() {
    if (!factory)
      throw new Error(
        'Local storage is unavailable in this browser. You can still import and export.',
      );
    return new Promise<IDBDatabase>((resolve, reject) => {
      let blocked = false;
      const request = factory.open(name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('metadata', { keyPath: 'id' });
        request.result.createObjectStore('files');
      };
      request.onsuccess = () => {
        if (blocked) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
      request.onblocked = () => {
        blocked = true;
        reject(new Error('Close other Current tabs and try again.'));
      };
    });
  }
  async function transaction<T>(
    mode: IDBTransactionMode,
    perform: (
      tx: IDBTransaction,
      result: (value: T) => void,
      abort: (error: Error) => void,
    ) => void,
  ): Promise<T> {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(['metadata', 'files'], mode);
      let result: T;
      let failure: Error | undefined;
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onabort = () => {
        db.close();
        reject(failure ?? tx.error ?? new Error('The storage operation was cancelled.'));
      };
      try {
        perform(
          tx,
          (value) => {
            result = value;
          },
          (error) => {
            failure = error;
            tx.abort();
          },
        );
      } catch (error) {
        failure = error instanceof Error ? error : new Error('Could not save this dataset.');
        tx.abort();
      }
    });
  }
  return {
    list: () =>
      transaction<DatasetMeta[]>('readonly', (tx, result) => {
        const request = tx.objectStore('metadata').getAll();
        request.onsuccess = () =>
          result((request.result as DatasetMeta[]).sort((a, b) => b.savedAt - a.savedAt));
      }),
    get: (id: string) =>
      transaction<Dataset | undefined>('readonly', (tx, result) => {
        const metadata = tx.objectStore('metadata').get(id);
        const bytes = tx.objectStore('files').get(id);
        let meta: DatasetMeta | undefined;
        let file: Blob | undefined;
        const ready = () => result(meta && file ? { ...meta, file } : undefined);
        metadata.onsuccess = () => {
          meta = metadata.result;
          ready();
        };
        bytes.onsuccess = () => {
          file = bytes.result;
          ready();
        };
      }),
    save: (input: SaveDataset) =>
      transaction<DatasetMeta>('readwrite', (tx, result, abort) => {
        if (
          !input.name.trim() ||
          input.name.length > 255 ||
          input.file.size > 25 * 1024 * 1024 ||
          !Number.isInteger(input.rows) ||
          input.rows < 1 ||
          input.rows > 500_000
        ) {
          abort(new Error('The dataset is outside the supported file or row limits.'));
          return;
        }
        const { file, ...fields } = input;
        const meta: DatasetMeta = {
          ...fields,
          id: input.id ?? crypto.randomUUID(),
          size: file.size,
          savedAt: Date.now(),
        };
        const store = tx.objectStore('metadata');
        const request = store.getAll();
        request.onsuccess = () => {
          const others = (request.result as DatasetMeta[]).filter((item) => item.id !== meta.id);
          if (
            others.length >= MAX_FILES ||
            others.reduce((sum, item) => sum + item.size, meta.size) > MAX_BYTES
          ) {
            abort(
              new Error(
                'Local library limit reached: 10 files or 100 MB. Export a file before removing it.',
              ),
            );
            return;
          }
          try {
            store.put(meta);
            tx.objectStore('files').put(file, meta.id);
            result(meta);
          } catch (error) {
            abort(error instanceof Error ? error : new Error('Could not write the dataset.'));
          }
        };
      }),
    remove: (id: string) =>
      transaction<void>('readwrite', (tx, result) => {
        tx.objectStore('metadata').delete(id);
        tx.objectStore('files').delete(id);
        result(undefined);
      }),
  };
}
