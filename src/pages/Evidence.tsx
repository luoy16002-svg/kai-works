import { useEffect, useState } from 'react';
import { ArrowUpRight, Code2 as Github, Terminal } from 'lucide-react';
import { REPO, WorkNav } from '../ui';
type Evidence = {
  date: string;
  node: string;
  platform: string;
  csv: { rows: number; parseMs: number; queryMs: number; totalCents: number; filteredRows: number };
  queue: {
    jobs: number;
    uniqueEffects: number;
    attempts: number;
    expiredLeases: number;
    staleRejected: number;
    total: number;
    expected: number;
    milliseconds: number;
  };
};
export default function Evidence() {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}evidence.json`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then(setEvidence)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <div className="evidence-page">
      <WorkNav name="ENGINEERING EVIDENCE" detail="Reproduce, then inspect" />
      <main id="main-content" className="evidence-main" tabIndex={-1}>
        <section className="evidence-intro">
          <span className="eyebrow">TEST RECORDS / SOURCE / LIMITS</span>
          <h1>
            Checks & <em>observations.</em>
          </h1>
          <p>
            These are independent portfolio projects. The source includes failure injection,
            reference calculations and repeatable checks. No client outcomes or production usage are
            implied.
          </p>
          <div className="evidence-links">
            <a href={`${REPO}/actions`} target="_blank" rel="noreferrer">
              <Github size={16} /> CI runs <ArrowUpRight size={13} />
            </a>
            <a href={`${REPO}/tree/main/tests`} target="_blank" rel="noreferrer">
              <Terminal size={16} /> Test source <ArrowUpRight size={13} />
            </a>
          </div>
        </section>
        <div className="evidence-grid">
          <article className="evidence-card">
            <span className="eyebrow">PIXEL / LITTLE DELIVERIES</span>
            <h2>Continuous play, bounded state.</h2>
            <ul>
              <li>Fixed simulation steps keep movement and collisions repeatable.</li>
              <li>
                Checks cover pickup before delivery, parcel accounting, obstacle clearance and
                bounded retained scene data.
              </li>
              <li>Keyboard and touch controls take over the demo; pause stops the simulation.</li>
            </ul>
            <a href="#/pixel">
              Play Little deliveries <ArrowUpRight size={13} />
            </a>
            <a href={`${REPO}/blob/main/tests/pixel.test.ts`} target="_blank" rel="noreferrer">
              Inspect the game checks <ArrowUpRight size={13} />
            </a>
          </article>
          <article className="evidence-card">
            <span className="eyebrow">PROOF / PROTOTYPE</span>
            <h2>Agent failure recovery.</h2>
            <ul>
              <li>
                Four public conditions × six seeded variants: clean runs, lost acknowledgements,
                inventory conflicts and no valid stock.
              </li>
              <li>
                Replayable actions are graded against final world state. Correct handoff is reported
                separately from autonomous fulfilment.
              </li>
              <li>
                Reference code policies and recorded agent traces have separate provenance labels.
                These synthetic cases do not establish an AI model ranking.
              </li>
            </ul>
            <a href="#/proof">
              Open reliability lab <ArrowUpRight size={13} />
            </a>
          </article>
          <article className="evidence-card">
            <span className="eyebrow">01 / FIELD</span>
            <h2>GPU versus CPU.</h2>
            <ul>
              <li>Gray–Scott reaction–diffusion evolves in two floating-point render targets.</li>
              <li>
                The live browser check compares 20 GPU steps against a CPU reference over 8,192
                concentrations, with a maximum absolute error threshold of 0.0005.
              </li>
              <li>
                Tests check equilibrium, periodic boundaries, seeded reproducibility and numerical
                stability. Drawing and PNG export use the current field.
              </li>
            </ul>
            <a href="#/field">
              Run the GPU check <ArrowUpRight size={13} />
            </a>
            <a
              href={`${REPO}/blob/main/verification/field-gpu-validation.json`}
              target="_blank"
              rel="noreferrer"
            >
              Recorded browser result <ArrowUpRight size={13} />
            </a>
          </article>
          <article className="evidence-card">
            <span className="eyebrow">04 / HALO</span>
            <h2>Configuration round trips.</h2>
            <ul>
              <li>Configuration survives URL serialization, including zero brightness.</li>
              <li>
                Unknown finishes, non-finite values and out-of-range settings fall back safely.
              </li>
              <li>
                The interactive view uses procedural geometry, material updates and an orbit camera.
                PNG and JSON exports come from the current configuration.
              </li>
            </ul>
            <a href="#/halo">
              Open configurator <ArrowUpRight size={13} />
            </a>
          </article>
          <article className="evidence-card">
            <span className="eyebrow">02 / CURRENT</span>
            <h2>CSV parsing and totals.</h2>
            <ul>
              <li>
                Randomized CSV round trips cross arbitrary chunk boundaries, including quoted
                newlines.
              </li>
              <li>
                A separate integer reference verifies 100,000 generated records and filtered
                aggregates.
              </li>
              <li>
                Malformed quotes, duplicate IDs, invalid calendar dates and fractional precision
                errors reject the import.
              </li>
            </ul>
            <a href="#/current">
              Open data workbench <ArrowUpRight size={13} />
            </a>
          </article>
          <article className="evidence-card">
            <span className="eyebrow">03 / RELAY</span>
            <h2>Concurrent writes and recovery.</h2>
            <ul>
              <li>Concurrent claims cannot share a lease. Expired tokens cannot commit.</li>
              <li>
                Job completion and its ledger effect commit atomically. Conflicting batches roll
                back in full.
              </li>
              <li>
                The chaos harness abandons claims, closes and reopens storage, retries failures and
                checks every final effect.
              </li>
            </ul>
            <a href="#/relay">
              Open queue lab <ArrowUpRight size={13} />
            </a>
          </article>
        </div>
        <section className="benchmark-panel">
          <h2>One recorded run. Fully reproducible.</h2>
          <p>
            Run <code>npm ci && npm test && npm run benchmark</code>. The figures below come from
            the benchmark artifact for this build. Browser timings are measured separately inside
            Current.
          </p>
          {evidence ? (
            <>
              <div className="benchmark-values">
                <div>
                  <span>CSV records parsed & validated</span>
                  <strong>{evidence.csv.rows.toLocaleString()}</strong>
                  <small>{evidence.csv.parseMs.toFixed(1)} ms · Node core benchmark</small>
                </div>
                <div>
                  <span>Chaos run / unique effects</span>
                  <strong>
                    {evidence.queue.uniqueEffects} / {evidence.queue.jobs}
                  </strong>
                  <small>{evidence.queue.expiredLeases} abandoned leases recovered</small>
                </div>
                <div>
                  <span>Stale commits rejected</span>
                  <strong>{evidence.queue.staleRejected}</strong>
                  <small>{evidence.queue.attempts} attempts · exact expected total</small>
                </div>
              </div>
              <p>
                {evidence.date} · Node {evidence.node} · {evidence.platform}. This queue benchmark
                uses fake-indexeddb to test transaction behavior; it does not measure disk
                durability or a backend service.
              </p>
              <a
                className="source-link"
                href={`${import.meta.env.BASE_URL}evidence.json`}
                target="_blank"
                rel="noreferrer"
              >
                Raw result <ArrowUpRight size={13} />
              </a>
            </>
          ) : (
            <p>The recorded benchmark is not available. The source and CI remain the references.</p>
          )}
        </section>
        <section className="evidence-boundary">
          <p>
            <strong>Scope matters.</strong> Relay guarantees one local ledger effect per completed
            key through a shared IndexedDB transaction. It does not claim exactly-once execution or
            coordinate external APIs. Storage may be evicted or cleared, and suspended browsers can
            delay workers.
          </p>
          <p>
            <strong>Visual provenance.</strong> The HALO editorial photograph and initial interface
            studies were generated with image tools. The configurator geometry, charts, table, queue
            controls and live results are implemented in code. All sample data is synthetic.
          </p>
          <p>
            <strong>Collaboration.</strong> Kai · China, UTC+8 ·{' '}
            <a href="mailto:fuddleyu@gmail.com">fuddleyu@gmail.com</a>. Project communication by
            email or chat.
          </p>
        </section>
      </main>
    </div>
  );
}
