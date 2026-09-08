import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Check,
  Download,
  Layers3,
  Play,
  RotateCw,
  Square,
  Trash2,
  Zap,
  ShieldCheck,
  Clock3,
  RefreshCw,
} from 'lucide-react';
import {
  openQueue,
  enqueue,
  snapshot,
  clearQueue,
  retryDead,
  sampleJobs,
  type QueueSnapshot,
} from '../core/queue';
import { WorkNav, SourceLink, download } from '../ui';
const empty: QueueSnapshot = {
  jobs: [],
  effects: [],
  events: [],
  queued: 0,
  running: 0,
  done: 0,
  dead: 0,
  attempts: 0,
  total: 0,
};
const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
export default function Relay() {
  const db = useRef<IDBDatabase | null>(null);
  const worker = useRef<Worker | null>(null);
  const alive = useRef(true);
  const polling = useRef(false);
  const [data, setData] = useState<QueueSnapshot>(empty);
  const [status, setStatus] = useState<'stopped' | 'running' | 'crashed'>('stopped');
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('The lab is ready when you are.');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(true);
  const [lastBatch, setLastBatch] = useState<ReturnType<typeof sampleJobs>>([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [crashes, setCrashes] = useState(0);
  const refresh = async () => {
    if (!db.current || polling.current) return;
    polling.current = true;
    try {
      const value = await snapshot(db.current);
      if (alive.current) setData(value);
    } catch (error) {
      if (alive.current) setError(String(error));
    } finally {
      polling.current = false;
    }
  };
  useEffect(() => {
    alive.current = true;
    let connection: IDBDatabase | null = null;
    let cancelled = false;
    openQueue()
      .then((value) => {
        if (cancelled) {
          value.close();
          return;
        }
        connection = value;
        db.current = value;
        setReady(true);
        void refresh();
      })
      .catch(() =>
        setError(
          'Persistent storage is unavailable in this browser. Try a normal browsing window.',
        ),
      );
    const timer = setInterval(() => void refresh(), 450);
    return () => {
      alive.current = false;
      cancelled = true;
      clearInterval(timer);
      worker.current?.terminate();
      worker.current = null;
      connection?.close();
      db.current = null;
    };
  }, []);
  const start = () => {
    if (worker.current) return;
    const current = new Worker(new URL('../workers/queue.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.current = current;
    current.onmessage = (event) => {
      if (event.data.type === 'error') {
        setError(event.data.message);
        current.terminate();
        worker.current = null;
        setStatus('stopped');
      }
    };
    current.onerror = () => {
      setError('The worker stopped unexpectedly. Restart it to recover expired leases.');
      current.terminate();
      worker.current = null;
      setStatus('crashed');
    };
    current.postMessage({ type: 'start' });
    setStatus('running');
    setNotice('Three claim loops are processing the local queue.');
  };
  const stop = (crash = false) => {
    worker.current?.terminate();
    worker.current = null;
    setStatus(crash ? 'crashed' : 'stopped');
    if (crash) setCrashes((value) => value + 1);
    setNotice(
      crash
        ? 'Worker terminated immediately. In-flight leases expire after 2.5 seconds. Restart to recover.'
        : 'Worker stopped. Queued and leased jobs remain in IndexedDB.',
    );
    void refresh();
  };
  const perform = async (action: () => Promise<void>) => {
    if (!db.current) return;
    setBusy(true);
    setError('');
    try {
      await action();
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The operation failed.');
    } finally {
      setBusy(false);
    }
  };
  const run = () =>
    void perform(async () => {
      const batch = sampleJobs(crypto.randomUUID().slice(0, 8), 1000, failures);
      const result = await enqueue(db.current!, batch);
      setLastBatch(batch);
      setNotice(
        `${result.added.toLocaleString()} jobs persisted. Each effect is a local ledger entry.`,
      );
      start();
    });
  const replay = () =>
    void perform(async () => {
      const result = await enqueue(db.current!, lastBatch);
      setNotice(
        `Replay: ${result.duplicates.toLocaleString()} duplicates ignored, ${result.added} new jobs. No duplicate effects.`,
      );
    });
  const reset = () =>
    void perform(async () => {
      stop();
      await clearQueue(db.current!);
      setLastBatch([]);
      setCrashes(0);
      setNotice('Local lab cleared. Ready for a fresh run.');
    });
  const expected = data.jobs.reduce((sum, job) => sum + job.amount, 0);
  const progress = data.jobs.length ? (data.done / data.jobs.length) * 100 : 0;
  const consistent =
    data.done === data.effects.length &&
    new Set(data.effects.map((effect) => effect.id)).size === data.effects.length &&
    data.effects.every((effect) =>
      data.jobs.some(
        (job) => job.id === effect.id && job.status === 'done' && job.amount === effect.amount,
      ),
    );
  const events = data.events.filter((event) => eventFilter === 'all' || event.kind === eventFilter);
  return (
    <div className="relay-page">
      <WorkNav name="03 / RELAY" detail="Durable local queue" />
      <main id="main-content" tabIndex={-1} className="relay-main">
        <header className="relay-header">
          <div>
            <div className="relay-brand">
              <span />
              RELAY
            </div>
            <p>Work that survives a restart.</p>
          </div>
          <div>
            <span className="local-badge">
              <span className="status-dot" /> LOCAL LAB
            </span>
            <SourceLink />
          </div>
        </header>
        <div className="relay-layout">
          <div className="relay-left">
            <section className="pipeline-panel">
              <div className="panel-heading">
                <span>
                  <Activity size={16} /> Processing pipeline
                </span>
                <span className="mono">AT-LEAST-ONCE EXECUTION</span>
              </div>
              <div className={`pipeline ${status === 'running' ? 'is-running' : ''}`}>
                <div className="pipeline-node">
                  <span>Queued</span>
                  <strong>{data.queued.toLocaleString()}</strong>
                  <div>
                    <Layers3 size={29} />
                  </div>
                  <small>Waiting for a claim</small>
                </div>
                <div className="pipeline-connector">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="pipeline-node working">
                  <span>Working</span>
                  <strong>{data.running}</strong>
                  <div>
                    <Activity size={29} />
                  </div>
                  <small>Leased, not yet committed</small>
                </div>
                <div className="pipeline-connector">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="pipeline-node committed">
                  <span>Committed</span>
                  <strong>{data.done.toLocaleString()}</strong>
                  <div>
                    <Check size={32} />
                  </div>
                  <small>One ledger entry per job</small>
                </div>
              </div>
              <div className="pipeline-cta">
                <button
                  className="relay-primary"
                  onClick={run}
                  disabled={!ready || busy || data.jobs.length >= 5000}
                >
                  <Play size={16} fill="currentColor" /> Run 1,000 jobs
                </button>
                <label className="failure-toggle">
                  <input
                    type="checkbox"
                    checked={failures}
                    onChange={(e) => setFailures(e.target.checked)}
                    disabled={busy}
                  />{' '}
                  Inject transient failures
                </label>
              </div>
              <div
                className="queue-progress"
                aria-label={`${progress.toFixed(0)} percent committed`}
              >
                <div style={{ width: `${progress}%` }} />
              </div>
            </section>
            <section className="event-panel">
              <div className="panel-heading">
                <span>
                  <Clock3 size={16} /> Recent events
                </span>
                <label>
                  <span className="sr-only">Event filter</span>
                  <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                    <option value="all">All outcomes</option>
                    <option value="committed">Committed</option>
                    <option value="retry">Retry</option>
                    <option value="recovered">Recovered</option>
                    <option value="dead">Dead letter</option>
                  </select>
                </label>
              </div>
              <div className="event-table">
                <div className="event-head">
                  <span>Time (local)</span>
                  <span>Job ID</span>
                  <span>Attempt</span>
                  <span>Outcome</span>
                </div>
                <div className="event-body">
                  {events.length ? (
                    events.map((event) => (
                      <div className="event-row" key={event.seq}>
                        <span>
                          {new Date(event.time).toLocaleTimeString('en-GB', { hour12: false })}
                        </span>
                        <span>{event.id}</span>
                        <span>{event.attempt || '—'}</span>
                        <span className={`event-kind ${event.kind}`}>
                          {event.kind === 'committed' ? (
                            <Check size={13} />
                          ) : event.kind === 'recovered' || event.kind === 'retry' ? (
                            <RotateCw size={13} />
                          ) : (
                            <span className="event-dot" />
                          )}
                          {event.kind}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="event-empty">
                      <Layers3 size={26} />
                      <strong>
                        {data.jobs.length
                          ? 'No matching recent events.'
                          : 'Every job leaves a trail.'}
                      </strong>
                      <p>
                        {data.jobs.length
                          ? 'The panel shows the latest 45 events. Export the ledger for all job states.'
                          : 'Start a batch to inspect claims, retries and commits.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="event-footer">
                <span>Latest 45 events · Auto-refresh 450 ms</span>
                <button
                  onClick={() =>
                    download(
                      'relay-ledger.json',
                      JSON.stringify(
                        {
                          exportedAt: new Date().toISOString(),
                          scope: 'browser-local demonstration; no external side effects',
                          ...data,
                        },
                        null,
                        2,
                      ),
                    )
                  }
                  disabled={!ready}
                >
                  <Download size={13} /> Export ledger
                </button>
              </div>
            </section>
          </div>
          <aside className="relay-controls">
            <section className="relay-control-panel">
              <div className="panel-heading">
                <span>
                  <Zap size={16} /> Failure controls
                </span>
              </div>
              <button onClick={() => stop(true)} disabled={status !== 'running' || busy}>
                <Square size={19} />
                <span>
                  Crash worker<small>Terminate immediately, even mid-job</small>
                </span>
              </button>
              <button onClick={start} disabled={status === 'running' || !ready || busy}>
                <RotateCw size={19} />
                <span>
                  Restart worker<small>Recover expired leases and resume</small>
                </span>
              </button>
              <button onClick={replay} disabled={!lastBatch.length || busy}>
                <RefreshCw size={19} />
                <span>
                  Replay last batch<small>Send the same idempotency keys again</small>
                </span>
              </button>
              <button
                onClick={() =>
                  void perform(async () => {
                    const count = await retryDead(db.current!);
                    setNotice(`${count} dead-letter jobs requeued.`);
                    start();
                  })
                }
                disabled={!data.dead || busy}
              >
                <Layers3 size={19} />
                <span>
                  Retry dead letters<small>Reset the four-attempt retry budget</small>
                </span>
              </button>
            </section>
            <section className="worker-panel">
              <div className="panel-heading">
                <span>Worker</span>
                <span className={`worker-state ${status}`}>
                  <i />
                  {status}
                </span>
              </div>
              <dl>
                <div>
                  <dt>Execution</dt>
                  <dd>Web Worker</dd>
                </div>
                <div>
                  <dt>Concurrent lanes</dt>
                  <dd>3</dd>
                </div>
                <div>
                  <dt>Lease / retry limit</dt>
                  <dd>2.5 s / 4</dd>
                </div>
                <div>
                  <dt>Storage</dt>
                  <dd>IndexedDB</dd>
                </div>
                <div>
                  <dt>Crashes this session</dt>
                  <dd>{crashes}</dd>
                </div>
              </dl>
            </section>
            <section className="invariant-panel">
              <ShieldCheck size={22} />
              <h3>{consistent ? 'Ledger is consistent.' : 'Invariant mismatch.'}</h3>
              <p>
                {data.effects.length.toLocaleString()} unique effects / {data.done.toLocaleString()}{' '}
                committed jobs.
              </p>
              <div>
                <span>Committed value</span>
                <strong>{money(data.total)}</strong>
              </div>
              <div>
                <span>Full batch value</span>
                <span>{money(expected)}</span>
              </div>
              <p className="relay-footnote">
                Synthetic amounts. Effects and job completion share one transaction. External
                payments or APIs would require their own idempotency protocol.
              </p>
            </section>
          </aside>
        </div>
        <div className="relay-notice" role="status">
          {error ? <span className="relay-error">{error}</span> : notice}
        </div>
        <div className="relay-stats">
          <div>
            <Layers3 />
            <span>
              Pending<strong>{data.queued}</strong>
            </span>
          </div>
          <div>
            <Activity />
            <span>
              Running<strong>{data.running}</strong>
            </span>
          </div>
          <div>
            <Check />
            <span>
              Committed<strong>{data.done.toLocaleString()}</strong>
            </span>
          </div>
          <div>
            <Square />
            <span>
              Dead letter<strong>{data.dead}</strong>
            </span>
          </div>
          <div>
            <RotateCw />
            <span>
              Total attempts<strong>{data.attempts.toLocaleString()}</strong>
            </span>
          </div>
        </div>
        <footer className="relay-footer">
          <p>
            Local persistence survives reloads. Clearing site data removes the lab.
            <br />
            Workers run while this project is open; restart manually after returning.
          </p>
          <button onClick={reset} disabled={!ready || busy || !data.jobs.length}>
            <Trash2 size={14} /> Clear local lab
          </button>
          <a href="#/evidence">
            Inspect the evidence <ArrowUpRight size={15} />
          </a>
        </footer>
      </main>
    </div>
  );
}
