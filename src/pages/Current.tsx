import { useEffect, useRef, useState } from 'react';
import {
  Waves,
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  X,
  ArrowDownUp,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  Database,
  CircleHelp,
  Save,
  FolderOpen,
  Trash2,
  ClipboardPaste,
} from 'lucide-react';
import { WorkNav, SourceLink, download } from '../ui';
import {
  defaultQuery,
  defaultMapping,
  type ColumnMapping,
  type Order,
  type Query,
} from '../core/csv';
import { createDatasetLibrary, type DatasetMeta } from '../core/datasets';
import CsvImportDialog from '../components/CsvImportDialog';
import '../current.css';

const library = createDatasetLibrary();

type Result = {
  rows: Order[];
  offset: number;
  count: number;
  cents: number;
  daily: [string, number][];
  milliseconds: number;
};
const emptyResult: Result = { rows: [], offset: 0, count: 0, cents: 0, daily: [], milliseconds: 0 };
const currency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const number = (value: number) => new Intl.NumberFormat('en-US').format(value);
function RevenueChart({ daily }: { daily: [string, number][] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map(([, value]) => value));
  const min = 0;
  const point = (index: number, value: number) =>
    `${((index / Math.max(1, daily.length - 1)) * 900).toFixed(2)},${(150 - ((value - min) / (max - min)) * 135).toFixed(2)}`;
  const points = daily.map(([, value], index) => point(index, value)).join(' ');
  const selected = hover === null ? null : daily[Math.min(hover, daily.length - 1)];
  return (
    <div className="revenue-chart">
      <div className="chart-heading">
        <span>Revenue over time</span>
        <span className="mono">
          {selected ? `${selected[0]} / ${currency(selected[1])}` : 'DAILY TOTAL · USD'}
        </span>
      </div>
      <div className="plot">
        <div className="plot-labels">
          <span>{daily.length ? currency(max) : '—'}</span>
          <span>{daily.length ? currency(max / 2) : '—'}</span>
          <span>$0</span>
        </div>
        <svg
          role="img"
          aria-label={`Daily revenue across ${daily.length} dates. Exact filtered values are available through Export.`}
          viewBox="0 0 900 166"
          preserveAspectRatio="none"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHover(Math.round(((e.clientX - rect.left) / rect.width) * (daily.length - 1)));
          }}
          onPointerLeave={() => setHover(null)}
        >
          <path className="grid-lines" d="M0 15H900M0 82.5H900M0 150H900" />
          {daily.length > 0 && (
            <>
              <polygon className="chart-fill" points={`0,150 ${points} 900,150`} />
              <polyline points={points} />
              {selected && hover !== null && (
                <line
                  className="chart-cursor"
                  x1={(hover / Math.max(1, daily.length - 1)) * 900}
                  x2={(hover / Math.max(1, daily.length - 1)) * 900}
                  y1="0"
                  y2="155"
                />
              )}
            </>
          )}
        </svg>
      </div>
      <div className="chart-dates">
        <span>{daily[0]?.[0] ?? '—'}</span>
        <span>{daily[Math.floor(daily.length / 2)]?.[0] ?? '—'}</span>
        <span>{daily.at(-1)?.[0] ?? '—'}</span>
      </div>
    </div>
  );
}
export default function Current() {
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const latestQuery = useRef(0);
  const loadId = useRef(0);
  const queryRef = useRef(defaultQuery);
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState<Query>(defaultQuery);
  const [result, setResult] = useState<Result>(emptyResult);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('regional-orders.csv');
  const [total, setTotal] = useState(0);
  const [sampleSize, setSampleSize] = useState(100000);
  const [sample, setSample] = useState(true);
  const [regions, setRegions] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [importTime, setImportTime] = useState(0);
  const [queryTime, setQueryTime] = useState(0);
  const [lag, setLag] = useState(0);
  const [lagSamples, setLagSamples] = useState(0);
  const [showSchema, setShowSchema] = useState(false);
  const sourceFile = useRef<{ file: File; mapping: ColumnMapping; id?: string } | null>(null);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [libraryError, setLibraryError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const refreshLibrary = () =>
    library
      .list()
      .then(setDatasets)
      .catch((error) => setLibraryError(error.message));
  async function saveDataset() {
    const source = sourceFile.current;
    if (!source || loading || !total) return;
    setSaving(true);
    setLibraryError('');
    setNotice('');
    try {
      const saved = await library.save({ ...source, name: source.file.name, rows: total, query });
      if (sourceFile.current === source) source.id = saved.id;
      setNotice(`${saved.name} saved on this device, including the current filters.`);
      await refreshLibrary();
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Could not save the dataset.');
    } finally {
      setSaving(false);
    }
  }
  async function reopenDataset(item: DatasetMeta) {
    setLibraryError('');
    setNotice('');
    try {
      const saved = await library.get(item.id);
      if (!saved) {
        await refreshLibrary();
        throw new Error('This dataset was removed in another tab.');
      }
      load(
        new File([saved.file], saved.name, { type: 'text/csv' }),
        sampleSize,
        saved.mapping,
        saved,
      );
      setNotice(`Reopened ${saved.name} with its saved filters.`);
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Could not open the dataset.');
    }
  }
  async function removeDataset(item: DatasetMeta) {
    try {
      await library.remove(item.id);
      if (sourceFile.current?.id === item.id) sourceFile.current.id = undefined;
      setNotice(`${item.name} removed from the local library.`);
      await refreshLibrary();
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Could not remove the dataset.');
    }
  }
  const runQuery = (offset = 0) => {
    const id = ++sequence.current;
    latestQuery.current = id;
    worker.current?.postMessage({ type: 'query', id, query: queryRef.current, offset });
  };
  const create = () => {
    worker.current?.terminate();
    const current = new Worker(new URL('../workers/data.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.current = current;
    current.onerror = () => {
      setError('The data worker stopped. Reload a sample or choose the file again.');
      setLoading(false);
    };
    current.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'progress' && data.id === loadId.current) setProgress(data.progress);
      if (data.type === 'loaded' && data.id === loadId.current) {
        setLoading(false);
        setProgress(100);
        setTotal(data.count);
        setImportTime(data.milliseconds);
        setRegions(data.regions);
        setChannels(data.channels);
      }
      if (data.type === 'result' && data.id === latestQuery.current) {
        setResult(data);
        if (data.offset === 0) setQueryTime(data.milliseconds);
      }
      if (data.type === 'exported')
        download('current-filtered-orders.csv', data.csv, 'text/csv;charset=utf-8');
      if (data.type === 'error') {
        setError(data.message);
        setLoading(false);
      }
    };
    return current;
  };
  const load = (file?: File, count = sampleSize, mapping = defaultMapping, saved?: DatasetMeta) => {
    const current = create();
    const id = ++sequence.current;
    loadId.current = id;
    latestQuery.current = 0;
    setLoading(true);
    setProgress(0);
    setError('');
    setNotice('');
    sourceFile.current = file ? { file, mapping, id: saved?.id } : null;
    setTotal(0);
    setResult(emptyResult);
    setImportTime(0);
    setQueryTime(0);
    setLag(0);
    setLagSamples(0);
    setRegions([]);
    setChannels([]);
    queryRef.current = saved?.query ?? defaultQuery;
    setQuery(queryRef.current);
    if (scroll.current) scroll.current.scrollTop = 0;
    setFilename(file ? file.name : 'regional-orders.csv');
    setSample(!file);
    current.postMessage(
      file ? { type: 'file', id, file, mapping } : { type: 'generate', id, count },
    );
  };
  useEffect(() => {
    load(undefined, 100000);
    void refreshLibrary();
    return () => {
      worker.current?.terminate();
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);
  useEffect(() => {
    queryRef.current = query;
    if (scroll.current) scroll.current.scrollTop = 0;
    if (total) runQuery();
  }, [query, total]);
  useEffect(() => {
    if (!loading) return;
    let expected = performance.now() + 50;
    const timer = setInterval(() => {
      const now = performance.now();
      setLagSamples((value) => value + 1);
      setLag((value) => Math.max(value, Math.max(0, now - expected)));
      expected = now + 50;
    }, 50);
    return () => clearInterval(timer);
  }, [loading]);
  const cancel = () => {
    worker.current?.terminate();
    worker.current = null;
    setLoading(false);
    setProgress(0);
    setError('Import cancelled. No data was saved.');
  };
  const onScroll = () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      runQuery(Math.max(0, Math.floor((scroll.current?.scrollTop ?? 0) / 42) - 3));
    }, 35);
  };
  const change = (patch: Partial<Query>) => setQuery({ ...query, ...patch });
  return (
    <div className="current-page">
      <WorkNav name="CURRENT" detail="Local data workbench" />
      <div className="current-shell">
        <aside className="current-rail">
          <a href="#/" aria-label="Back to portfolio">
            <Waves size={28} />
          </a>
          <span className="rail-selected">
            <Database size={20} />
          </span>
          <span className="rail-bottom">LOCAL</span>
        </aside>
        <main id="main-content" tabIndex={-1} className="current-main">
          <header className="current-header">
            <div>
              <h1>Current</h1>
              <p>Explore your order data, on your device.</p>
            </div>
            <div className="header-actions">
              <input
                ref={input}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose a CSV file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportFile(file);
                    setShowImport(true);
                  }
                  e.target.value = '';
                }}
              />
              <button onClick={() => input.current?.click()}>
                <Upload size={16} /> Open CSV
              </button>
              <button
                onClick={() => {
                  setImportFile(null);
                  setShowImport(true);
                }}
              >
                <ClipboardPaste size={16} /> Paste CSV
              </button>
              <button onClick={saveDataset} disabled={saving || loading || sample || !total}>
                <Save size={16} /> {saving ? 'Saving…' : 'Save dataset'}
              </button>
              <button
                onClick={() =>
                  worker.current?.postMessage({ type: 'export', id: ++sequence.current, query })
                }
                disabled={loading || !result.count}
              >
                <Download size={16} /> Export
              </button>
            </div>
          </header>
          <div className="file-strip">
            <div>
              <FileSpreadsheet size={17} />
              <strong>{filename}</strong>
              <span>/</span>
              <span>{loading ? 'Reading…' : `${number(total)} rows`}</span>
              <span className="data-label">{sample ? 'SYNTHETIC SAMPLE' : 'YOUR LOCAL FILE'}</span>
            </div>
            <span className="mono">CSV · UTF-8 · USD</span>
          </div>
          {notice && (
            <div className="current-notice" role="status">
              <ShieldCheck size={16} />
              {notice}
              <button onClick={() => setNotice('')} aria-label="Dismiss message">
                <X size={16} />
              </button>
            </div>
          )}
          {libraryError && (
            <div className="error-box" role="alert">
              {libraryError}
            </div>
          )}
          <div className="current-workspace">
            <section className="data-area" aria-label="Data explorer">
              <div className="data-toolbar">
                <label className="data-search">
                  <Search size={15} />
                  <input
                    aria-label="Search orders"
                    placeholder="Search orders…"
                    value={query.search}
                    onChange={(e) => change({ search: e.target.value })}
                    disabled={loading}
                  />
                </label>
                <label>
                  <span className="sr-only">Region</span>
                  <select
                    aria-label="Region"
                    value={query.region}
                    onChange={(e) => change({ region: e.target.value })}
                    disabled={loading}
                  >
                    <option value="">All regions</option>
                    {regions.map((region) => (
                      <option key={region}>{region}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Channel</span>
                  <select
                    aria-label="Channel"
                    value={query.channel}
                    onChange={(e) => change({ channel: e.target.value })}
                    disabled={loading}
                  >
                    <option value="">All channels</option>
                    {channels.map((channel) => (
                      <option key={channel}>{channel}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="icon-button"
                  aria-label="Clear filters"
                  onClick={() => setQuery(defaultQuery)}
                >
                  <X size={16} />
                </button>
              </div>
              {loading && (
                <div className="load-progress" role="status">
                  <div style={{ width: `${progress}%` }} />
                  <span>Processing on this device · {progress}%</span>
                  <button onClick={cancel}>Cancel</button>
                </div>
              )}
              {error && (
                <div className="error-box" role="alert">
                  {error}
                </div>
              )}
              <RevenueChart daily={result.daily} />
              <div className="result-summary">
                <span>
                  <i /> Filtered revenue <strong>{currency(result.cents)}</strong>
                </span>
                <span>{number(result.count)} matching orders</span>
              </div>
              <div className="table-top">
                <span>
                  <Database size={15} /> Orders
                </span>
                <button
                  onClick={() =>
                    change({
                      sort: 'amount',
                      descending: query.sort === 'amount' ? !query.descending : true,
                    })
                  }
                  disabled={loading || !total}
                >
                  <ArrowDownUp size={14} />
                  {query.sort === 'amount'
                    ? `Amount ${query.descending ? '↓' : '↑'}`
                    : 'Sort by amount'}
                </button>
                <span className="mono">{number(result.count)} ROWS</span>
              </div>
              <div
                className="data-table"
                role="table"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    event.currentTarget.scrollBy({
                      left: event.key === 'ArrowRight' ? 120 : -120,
                      behavior: 'instant',
                    });
                  }
                }}
                aria-label="Filtered orders"
                aria-rowcount={result.count + 1}
                aria-colcount={5}
                aria-busy={loading}
              >
                <div role="row" className="table-header">
                  <span role="columnheader">Order ID</span>
                  <span role="columnheader">Date</span>
                  <span role="columnheader">Region</span>
                  <span role="columnheader">Channel</span>
                  <span role="columnheader">
                    Amount <small>USD</small>
                  </span>
                </div>
                <div
                  className="table-scroll"
                  ref={scroll}
                  onScroll={onScroll}
                  tabIndex={0}
                  aria-label="Scroll order rows"
                >
                  <div
                    className="virtual-space"
                    style={{ height: Math.max(result.count * 42, 260) }}
                  >
                    {!loading && result.count === 0 ? (
                      <div className="table-empty">
                        {error
                          ? 'Load a sample or open a valid CSV to continue.'
                          : 'No orders match these filters.'}
                      </div>
                    ) : (
                      <div
                        className="virtual-rows"
                        style={{ transform: `translateY(${result.offset * 42}px)` }}
                      >
                        {result.rows.map((row, index) => (
                          <div
                            role="row"
                            aria-rowindex={result.offset + index + 2}
                            className="table-row"
                            key={row.id}
                          >
                            <span role="cell" title={row.id}>
                              {row.id}
                            </span>
                            <span role="cell">{row.date}</span>
                            <span role="cell" title={row.region}>
                              {row.region}
                            </span>
                            <span role="cell">
                              <i
                                className={`channel-dot channel-${row.channel.toLowerCase().replaceAll(' ', '')}`}
                              />
                              {row.channel}
                            </span>
                            <span role="cell">{currency(row.cents)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="table-foot">
                <span>Only visible rows are rendered.</span>
                <span>Use Save dataset to keep your file on this device.</span>
              </div>
            </section>
            <aside className="data-inspector">
              <div className="inspector-tabs">
                <button aria-pressed={!showSchema} onClick={() => setShowSchema(false)}>
                  Workspace
                </button>
                <button aria-pressed={showSchema} onClick={() => setShowSchema(true)}>
                  Schema
                </button>
              </div>
              {showSchema ? (
                <div className="schema-panel">
                  <span className="eyebrow">EXPECTED COLUMNS</span>
                  {[
                    ['id', 'unique text'],
                    ['date', 'YYYY-MM-DD'],
                    ['region', 'text'],
                    ['channel', 'text'],
                    ['amount', 'USD · 2 decimal places'],
                  ].map(([name, type]) => (
                    <div key={name}>
                      <code>{name}</code>
                      <span>{type}</span>
                    </div>
                  ))}
                  <p>
                    Match your own column names during import. Duplicate IDs, invalid dates and
                    malformed amounts stop the import.
                  </p>
                  <p>
                    UTF-8, quoted commas and line breaks are supported. Limit: 25 MB / 500,000 rows.
                  </p>
                </div>
              ) : (
                <>
                  <div className="inspector-section">
                    <div className="section-label">
                      Saved on this device
                      <FolderOpen size={15} />
                    </div>
                    <div className="dataset-list">
                      {datasets.length ? (
                        datasets.map((item) => (
                          <div className="dataset-row" key={item.id}>
                            <button
                              disabled={loading || saving}
                              onClick={() => void reopenDataset(item)}
                            >
                              <FileSpreadsheet size={16} />
                              <span>
                                <strong>{item.name}</strong>
                                <small>
                                  {number(item.rows)} rows ·{' '}
                                  {item.size < 1024
                                    ? `${item.size} B`
                                    : `${(item.size / 1024).toFixed(0)} KB`}
                                </small>
                              </span>
                            </button>
                            <button
                              disabled={saving}
                              aria-label={`Remove ${item.name} from library`}
                              onClick={() => void removeDataset(item)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p>Import your CSV, then save it here to reopen later.</p>
                      )}
                    </div>
                    <p className="inspector-note">
                      Up to 10 files / 100 MB. Browser storage can be cleared or evicted; keep an
                      exported copy.
                    </p>
                  </div>
                  <div className="inspector-section">
                    <div className="section-label">
                      Measured here <ActivityMark />
                    </div>
                    <dl>
                      <div>
                        <dt>Import + validation</dt>
                        <dd>{importTime ? `${importTime.toFixed(0)} ms` : '—'}</dd>
                      </div>
                      <div>
                        <dt>Filter + aggregate</dt>
                        <dd>{total ? `${queryTime.toFixed(1)} ms` : '—'}</dd>
                      </div>
                      <div>
                        <dt>Peak UI timer delay</dt>
                        <dd>{importTime && lagSamples ? `${lag.toFixed(1)} ms` : '—'}</dd>
                      </div>
                      <div>
                        <dt>Matching rows</dt>
                        <dd>{number(result.count)}</dd>
                      </div>
                    </dl>
                    <p className="inspector-note">
                      Current session timings; a 50 ms UI probe. Sample import includes generation.
                      Device load and background tabs affect results.
                    </p>
                  </div>
                  <div className="inspector-section sample-controls">
                    <span className="eyebrow">SAMPLE DATA</span>
                    <h3>Explore a sample</h3>
                    <p>Generated orders to try the filters and export.</p>
                    <label>
                      <span className="sr-only">Sample rows</span>
                      <select
                        aria-label="Sample rows"
                        value={sampleSize}
                        disabled={loading}
                        onChange={(e) => setSampleSize(Number(e.target.value))}
                      >
                        <option value="25000">25,000 rows</option>
                        <option value="100000">100,000 rows</option>
                        <option value="250000">250,000 rows</option>
                      </select>
                    </label>
                    <button className="current-primary" onClick={() => load()} disabled={loading}>
                      <RefreshCw size={15} /> Load sample
                    </button>
                  </div>
                </>
              )}
              <div className="local-note">
                <ShieldCheck size={22} />
                <div>
                  <strong>On your device.</strong>
                  <p>
                    No account. No uploads.
                    <br />
                    No third-party analytics.
                  </p>
                </div>
              </div>
              <SourceLink path="/tree/main/tests">Inspect the tests</SourceLink>
            </aside>
          </div>
          <footer className="current-footer">
            <span>
              <span className="status-dot" /> Browser-local processing
            </span>
            <a href="#/case/current">
              How Current works <ArrowUpRight size={14} />
            </a>
          </footer>
        </main>
      </div>
      {showImport && (
        <CsvImportDialog
          initialFile={importFile}
          onClose={() => setShowImport(false)}
          onImport={(file, mapping) => {
            setShowImport(false);
            load(file, sampleSize, mapping);
          }}
        />
      )}
    </div>
  );
}
function ActivityMark() {
  return <CircleHelp size={14} aria-label="Measured on your current device" />;
}
