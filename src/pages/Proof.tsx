import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Check,
  AlertTriangle,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import { WorkNav, REPO, download } from '../ui';
import { AgentMap, useProofPlayback } from '../components/AgentTheater';
import { boundedText, readRecorded, type RecordedLoad } from '../core/proof-recordings';
import {
  PROOF_SCENARIOS,
  PROOF_POLICIES,
  PROOF_SEEDS,
  PROOF_ENVIRONMENT,
  PROOF_FIXTURE_VERSION,
  PROOF_IMPORT_LIMIT,
  runProof,
  runProofSuite,
  importProof,
  exportProof,
  type ProofTrial,
  type ProofEvent,
  type ProofScenarioId,
} from '../core/proof';
import '../proof.css';

type TrialView = { trial: ProofTrial; label: string; description: string };
const scenarioLabel = (id: string) =>
  PROOF_SCENARIOS.find((scenario) => scenario.id === id)?.label ?? id;
const policyView = (trial: ProofTrial): TrialView => {
  const policy = PROOF_POLICIES.find((item) => item.id === trial.policyId);
  return {
    trial,
    label: policy?.label ?? trial.provenance.adapter,
    description: policy?.description ?? 'Recorded tool-use path, replayed and graded locally.',
  };
};
const toolLabels: Record<ProofEvent['action']['tool'], string> = {
  read_order: 'Read order',
  catalog: 'Read catalog',
  reserve: 'Reserve',
  lookup_receipt: 'Verify receipt',
  handoff: 'Hand off',
};
const committed = (event: ProofEvent) => event.after.receipts.length > event.before.receipts.length;
const outcomeLabel = (trial: ProofTrial) =>
  trial.grade.outcome === 'handoff'
    ? 'Justified handoff'
    : trial.grade.outcome === 'fulfilled'
      ? 'Fulfilled'
      : 'Failed';
const summarize = (trials: ProofTrial[]) => ({
  fulfilled: trials.filter((trial) => trial.grade.autonomousFulfilment).length,
  handoffs: trials.filter((trial) => trial.grade.justifiedHandoff).length,
  calls: trials.reduce((sum, trial) => sum + trial.events.length, 0),
  duplicates: trials.filter((trial) => trial.grade.duplicateReservation).length,
  constraints: trials.filter((trial) => trial.grade.constraintViolation).length,
});
const comparison = (scenario: ProofScenarioId, seed: number) =>
  PROOF_POLICIES.map((policy) => runProof(scenario, seed, policy.id));
const json = (value: unknown) => JSON.stringify(value, null, 2);

function Outcome({ trial }: { trial: ProofTrial }) {
  return (
    <span className="proof-outcome" data-outcome={trial.grade.outcome}>
      {trial.grade.outcome === 'failed' ? <AlertTriangle size={13} /> : <Check size={13} />}{' '}
      {outcomeLabel(trial)}
    </span>
  );
}
function Metrics({ trials }: { trials: ProofTrial[] }) {
  const counts = summarize(trials);
  return (
    <div className="proof-metrics" aria-label="Final outcomes, independently graded">
      <div>
        <span>Fulfilled runs</span>
        <strong>
          {counts.fulfilled}
          <small> / {trials.length}</small>
        </strong>
        <p>
          {counts.handoffs} justified {counts.handoffs === 1 ? 'handoff' : 'handoffs'} · counted
          separately
        </p>
      </div>
      <div>
        <span>Accepted tool actions</span>
        <strong>{counts.calls}</strong>
        <p>
          Executed actions across {trials.length} {trials.length === 1 ? 'run' : 'runs'}
        </p>
      </div>
      <div data-alert={counts.duplicates > 0}>
        <span>Runs with duplicates</span>
        <strong>{counts.duplicates}</strong>
        <p>
          {counts.constraints} {counts.constraints === 1 ? 'run violates' : 'runs violate'} task
          constraints
        </p>
      </div>
    </div>
  );
}
function TracePlayer({
  views,
  runKey,
  autoplay = false,
  active = true,
  pauseKey = 0,
  onSelect,
}: {
  views: TrialView[];
  runKey: string;
  autoplay?: boolean;
  active?: boolean;
  pauseKey?: number;
  onSelect?: (trial: ProofTrial) => void;
}) {
  const [display, setDisplay] = useState<'map' | 'trace'>('map');
  const [mapRun, setMapRun] = useState(Math.min(2, views.length - 1));
  const [tour, setTour] = useState(views.length > 1);
  const [selected, setSelected] = useState<{ run: number; event: number } | null>(null);
  const mapView = views[mapRun] ?? views[0];
  useEffect(() => {
    onSelect?.(mapView.trial);
  }, [mapView.trial, onSelect]);
  const eventCount =
    display === 'map'
      ? mapView.trial.events.length
      : Math.max(0, ...views.map(({ trial }) => trial.events.length));
  const lastStep = eventCount + 1;
  const player = useProofPlayback({
    eventCount,
    active,
    autoplay,
    onCycle: () => {
      if (tour && display === 'map') {
        const next = (mapRun + 1) % views.length;
        setMapRun(next);
        onSelect?.(views[next].trial);
      }
    },
  });
  const { head, playing } = player;
  const manual = () => {
    setTour(false);
    player.pause();
  };
  const previousRunKey = useRef(runKey);
  useEffect(() => {
    if (previousRunKey.current !== runKey) {
      previousRunKey.current = runKey;
      setSelected(null);
      setMapRun(Math.min(2, views.length - 1));
      setTour(false);
      player.reset(autoplay && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, [runKey]);
  useEffect(() => {
    if (!active) manual();
  }, [active]);
  const previousPause = useRef(pauseKey);
  useEffect(() => {
    if (previousPause.current !== pauseKey) {
      previousPause.current = pauseKey;
      manual();
    }
  }, [pauseKey]);
  const inspect = (run: number, event: number) => {
    manual();
    setMapRun(run);
    player.seek(event + 1, views[run].trial.events.length);
    setSelected({ run, event });
    onSelect?.(views[run].trial);
  };
  const firstError = views
    .flatMap(({ trial }, run) => trial.events.map((event, index) => ({ event, run, index })))
    .find(({ event }) => !event.observation.ok);
  const inspected = selected ? views[selected.run]?.trial.events[selected.event] : null;
  const inspectedRun = selected ? views[selected.run] : null;
  const slots = Math.max(1, Math.min(8, lastStep - 1));
  return (
    <section
      className="proof-stage"
      ref={player.stageRef}
      aria-label="Execution trace comparison"
      data-view={display}
      data-playing={playing}
      data-cycles={player.cycles}
    >
      <div className="proof-stage-heading">
        <span className="proof-eyebrow">ACTUAL TOOL EVENTS</span>
        <p>Step-aligned trace playback · not elapsed execution time</p>
        <div className="proof-map-switch" role="group" aria-label="Execution view">
          {(['map', 'trace'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={display === value}
              onClick={() => {
                manual();
                setSelected(null);
                setDisplay(value);
                const count =
                  value === 'map'
                    ? mapView.trial.events.length
                    : Math.max(...views.map(({ trial }) => trial.events.length));
                player.seek(value === 'trace' ? count : Math.min(head, count), count);
              }}
            >
              {value === 'map' ? 'Map' : 'Trace'}
            </button>
          ))}
        </div>
      </div>
      <div className="proof-final-metrics-label">
        <span>Final outcomes</span>
        <span>
          Independent grades across all {views.length} {views.length === 1 ? 'run' : 'runs'}
        </span>
      </div>
      <Metrics trials={views.map(({ trial }) => trial)} />
      {display === 'map' ? (
        <div className="proof-map-view">
          <div className="proof-map-policies" role="group" aria-label="Policy shown on map">
            <span>{views.length > 1 ? 'COMPARE' : 'SESSION'}</span>
            {views.map((view, run) => (
              <button
                type="button"
                key={run}
                aria-label={`Show ${view.label} on map`}
                aria-pressed={mapRun === run}
                data-outcome={view.trial.grade.outcome}
                onClick={() => {
                  manual();
                  setSelected(null);
                  setMapRun(run);
                  player.reset();
                  onSelect?.(view.trial);
                }}
              >
                <i aria-hidden="true" />
                {view.label}
              </button>
            ))}
            {views.length > 1 && (
              <button
                type="button"
                className="proof-map-tour"
                aria-pressed={tour}
                onClick={() => {
                  if (tour) manual();
                  else {
                    setTour(true);
                    setSelected(null);
                    player.reset(true);
                  }
                }}
              >
                {tour ? 'Tour policies · on' : 'Tour policies · off'}
              </button>
            )}
          </div>
          <AgentMap trial={mapView.trial} head={head} label={mapView.label} />
        </div>
      ) : (
        <div className="proof-lanes">
          {views.map(({ trial, label, description }, run) => (
            <div className="proof-lane" key={`${trial.policyId}-${run}`}>
              <div className="proof-lane-label">
                <span>0{run + 1}</span>
                <h3>{label}</h3>
                <p>{description}</p>
              </div>
              <ol
                className="proof-events"
                style={{ '--proof-slots': slots } as CSSProperties}
                aria-label={`${label} accepted tool actions`}
              >
                {trial.events.map((event, index) => {
                  const shown = head >= index + 1;
                  const isCommitted = committed(event);
                  return (
                    <li
                      key={index}
                      data-shown={shown}
                      data-error={!event.observation.ok}
                      data-commit={isCommitted}
                      data-row-end={(index + 1) % slots === 0 || index === trial.events.length - 1}
                    >
                      <button
                        type="button"
                        disabled={!shown}
                        aria-label={`Inspect ${label}, step ${index + 1}: ${toolLabels[event.action.tool]}, ${event.observation.code}`}
                        aria-pressed={selected?.run === run && selected?.event === index}
                        onClick={() => inspect(run, index)}
                      >
                        <span className="proof-event-face">
                          {!event.observation.ok ? (
                            <AlertTriangle size={16} />
                          ) : isCommitted ? (
                            <Check size={17} />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </span>
                        <span className="proof-event-label">{toolLabels[event.action.tool]}</span>
                        {!event.observation.ok && (
                          <span className="proof-event-code">
                            {isCommitted
                              ? 'Committed · reply lost'
                              : event.observation.code.toLowerCase().replaceAll('_', ' ')}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="proof-lane-outcome" data-shown={head >= trial.events.length}>
                <Outcome trial={trial} />
                <p>
                  {trial.grade.outcome === 'failed' ? trial.grade.reasons[0] : trial.grade.summary}
                </p>
                {trial.claimedStatus !== null && (
                  <small className="proof-reported">Reported: {trial.claimedStatus}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="proof-transport">
        <button
          type="button"
          className="proof-play"
          onClick={() => {
            setSelected(null);
            if (playing) manual();
            else player.play();
          }}
          aria-label={playing ? 'Pause trace playback' : 'Play trace playback'}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => {
            manual();
            setSelected(null);
            player.reset();
          }}
          aria-label="Reset trace to beginning"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            manual();
            setSelected(null);
            player.seek(Math.min(eventCount, Math.floor(head) + 1));
          }}
          aria-label="Advance one trace step"
        >
          <SkipForward size={16} />
        </button>
        <select
          aria-label="Trace playback speed"
          value={player.speed}
          onChange={(event) => {
            manual();
            player.setSpeed(Number(event.target.value));
          }}
        >
          {[0.5, 1, 1.5, 2].map((speed) => (
            <option key={speed} value={speed}>
              {speed}×
            </option>
          ))}
        </select>
        <button
          type="button"
          className="proof-loop"
          aria-pressed={player.loop}
          onClick={() => {
            manual();
            player.setLoop(!player.loop);
          }}
        >
          Loop {player.loop ? 'on' : 'off'}
        </button>
        <input
          type="range"
          min="0"
          max={eventCount}
          step="0.01"
          value={Math.min(head, eventCount)}
          aria-label="Trace step"
          aria-valuetext={`Step ${Math.min(eventCount, Math.ceil(head))} of ${eventCount}`}
          onChange={(event) => {
            manual();
            setSelected(null);
            player.seek(Number(event.target.value));
          }}
        />
        <output>
          STEP {Math.min(eventCount, Math.ceil(head))} / {eventCount}
        </output>
        {display === 'map' && mapView.trial.events.length > 0 && (
          <button
            type="button"
            onClick={() =>
              inspect(
                mapRun,
                Math.min(mapView.trial.events.length - 1, Math.max(0, Math.ceil(head) - 1)),
              )
            }
          >
            Inspect event
          </button>
        )}
        {firstError && (
          <button
            type="button"
            className="proof-inspect-error"
            onClick={() => inspect(firstError.run, firstError.index)}
          >
            <AlertTriangle size={14} />
            Inspect error
          </button>
        )}
      </div>
      {inspected && inspectedRun && (
        <div className="proof-event-inspector">
          <header>
            <div>
              <span className="proof-eyebrow">
                EVENT {selected!.event + 1} / {inspectedRun.label}
              </span>
              <h3>{toolLabels[inspected.action.tool]}</h3>
            </div>
            <Outcome trial={inspectedRun.trial} />
            <button type="button" onClick={() => setSelected(null)}>
              Close
            </button>
          </header>
          <div className="proof-inspector-grid">
            <section>
              <h4>Tool input</h4>
              <pre>{json(inspected.action)}</pre>
            </section>
            <section>
              <h4>
                Tool response{' '}
                <span data-ok={inspected.observation.ok}>{inspected.observation.code}</span>
              </h4>
              <pre>{json(inspected.observation)}</pre>
            </section>
            <section>
              <h4>Committed state change</h4>
              {inspected.changes.length ? (
                <ul>
                  {inspected.changes.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              ) : (
                <p>World snapshot unchanged.</p>
              )}
              <h4>Independent verdict</h4>
              <p>{inspectedRun.trial.grade.summary}</p>
              <div className="proof-assertions">
                {Object.entries(inspectedRun.trial.grade.assertions).map(([name, pass]) => (
                  <span key={name} data-pass={pass}>
                    {pass ? '✓' : '×'} {name}
                  </span>
                ))}
              </div>
            </section>
          </div>
          <details className="proof-worlds">
            <summary>Before / after world snapshots</summary>
            <div>
              <pre>{json(inspected.before)}</pre>
              <pre>{json(inspected.after)}</pre>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
function SuiteResults({ trials }: { trials: ProofTrial[] }) {
  const totals = summarize(trials);
  return (
    <section className="proof-suite" aria-labelledby="proof-suite-title">
      <header>
        <div>
          <span className="proof-eyebrow">PUBLIC FIXTURE SUITE</span>
          <h2 id="proof-suite-title">24 cases. 72 reference runs.</h2>
        </div>
        <p>
          {totals.fulfilled} fulfilled · {totals.handoffs} justified handoffs · {totals.duplicates}{' '}
          duplicate runs · {totals.calls} accepted actions
        </p>
      </header>
      <table>
        <caption>
          Each cell contains six fixed-seed cases. Counts describe these fixtures, not general agent
          performance.
        </caption>
        <thead>
          <tr>
            <th scope="col">Condition</th>
            {PROOF_POLICIES.map((policy) => (
              <th key={policy.id} scope="col">
                {policy.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PROOF_SCENARIOS.map((scenario) => (
            <tr key={scenario.id}>
              <th scope="row">{scenario.label}</th>
              {PROOF_POLICIES.map((policy) => {
                const group = trials.filter(
                    (trial) => trial.scenarioId === scenario.id && trial.policyId === policy.id,
                  ),
                  count = summarize(group);
                return (
                  <td key={policy.id} data-policy={policy.label}>
                    <strong>
                      {count.fulfilled}/{group.length}
                    </strong>{' '}
                    fulfilled
                    <span>
                      {count.handoffs} handoffs · {count.duplicates} duplicates
                    </span>
                    <span>{count.calls} accepted actions</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="proof-fixture-meta">
        {PROOF_ENVIRONMENT} · fixture {PROOF_FIXTURE_VERSION} · seeds {PROOF_SEEDS.join(', ')}
      </p>
    </section>
  );
}
export default function Proof() {
  const [mode, setMode] = useState<'reference' | 'recorded'>('reference');
  const [pauseRevision, setPauseRevision] = useState(0);
  const stopReplay = () => setPauseRevision((value) => value + 1);
  const [scenario, setScenario] = useState<ProofScenarioId>('ack_lost');
  const [seed, setSeed] = useState<number>(PROOF_SEEDS[0]);
  const [trials, setTrials] = useState(() => comparison('ack_lost', PROOF_SEEDS[0]));
  const [runVersion, setRunVersion] = useState(0),
    [suite, setSuite] = useState<ProofTrial[] | null>(null);
  const [referenceExport, setReferenceExport] = useState<ProofTrial | null>(null);
  const [recorded, setRecorded] = useState<RecordedLoad>({
    state: 'loading',
    trials: [],
    rejected: [],
    message: '',
    total: 0,
  });
  const [reload, setReload] = useState(0),
    [selectedRecording, setSelectedRecording] = useState('0');
  const [imported, setImported] = useState<ProofTrial | null>(null),
    [importMessage, setImportMessage] = useState('');
  const [importRevision, setImportRevision] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    setRecorded({ state: 'loading', trials: [], rejected: [], message: '', total: 0 });
    void (async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}proof-agent-trials.json`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (
          response.status === 404 ||
          response.headers.get('content-type')?.includes('text/html')
        ) {
          setRecorded({ state: 'unavailable', trials: [], rejected: [], message: '', total: 0 });
          return;
        }
        if (!response.ok) throw new Error(`Recording could not be loaded (${response.status}).`);
        const result = readRecorded(await boundedText(response));
        if (controller.signal.aborted) return;
        setRecorded(result);
        setSelectedRecording((value) =>
          value === 'imported'
            ? value
            : String(
                Math.max(
                  0,
                  result.trials.findIndex((trial) => trial.scenarioId === 'ack_lost'),
                ),
              ),
        );
      } catch (error) {
        if (!controller.signal.aborted)
          setRecorded({
            state: 'error',
            trials: [],
            rejected: [],
            total: 0,
            message: error instanceof Error ? error.message : 'Recording could not be loaded.',
          });
      }
    })();
    return () => controller.abort();
  }, [reload]);
  const keyboardTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - index;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else return;
    event.preventDefault();
    stopReplay();
    setMode(next === 0 ? 'reference' : 'recorded');
    tabRefs.current[next]?.focus();
  };
  const currentRecording =
    selectedRecording === 'imported'
      ? imported
      : (recorded.trials[Number(selectedRecording)] ?? recorded.trials[0] ?? null);
  const exportTrial = mode === 'reference' ? (referenceExport ?? trials[0]) : currentRecording;
  const shownScenario = PROOF_SCENARIOS.find((item) => item.id === trials[0].scenarioId)!;
  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > PROOF_IMPORT_LIMIT) throw new Error('Trace exceeds the 512 KB limit.');
      const trial = importProof(await file.text());
      setImported(trial);
      setImportRevision((value) => value + 1);
      setSelectedRecording('imported');
      setMode('recorded');
      setImportMessage(`Imported and independently regraded: ${outcomeLabel(trial)}.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Trace could not be imported.');
    }
  };
  return (
    <div className="proof-page">
      <WorkNav name="PROOF" detail="Agent reliability lab" />
      <main id="main-content" className="proof-main" tabIndex={-1}>
        <header className="proof-heading">
          <div>
            <h1>Did the task actually succeed?</h1>
          </div>
          <p>
            Reserve the exact order within its item and price constraints. Hand off only when valid
            stock is unavailable.
          </p>
        </header>
        <div className="proof-mode-tabs" role="tablist" aria-label="Trial source">
          {(['reference', 'recorded'] as const).map((value, index) => (
            <button
              type="button"
              role="tab"
              id={`proof-tab-${value}`}
              aria-controls={`proof-panel-${value}`}
              aria-selected={mode === value}
              tabIndex={mode === value ? 0 : -1}
              key={value}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              onClick={() => {
                stopReplay();
                setMode(value);
              }}
              onKeyDown={(event) => keyboardTab(event, index)}
            >
              {value === 'reference' ? 'Reference policies' : 'Recorded agent'}
              {value === 'recorded' && recorded.trials.length > 0 && (
                <span className="proof-tab-count">{recorded.trials.length}</span>
              )}
            </button>
          ))}
        </div>
        <section
          className="proof-panel"
          id="proof-panel-reference"
          role="tabpanel"
          aria-labelledby="proof-tab-reference"
          hidden={mode !== 'reference'}
        >
          <form
            className="proof-run-controls"
            onSubmit={(event) => {
              event.preventDefault();
              setTrials(comparison(scenario, seed));
              setReferenceExport(null);
              setRunVersion((value) => value + 1);
            }}
          >
            <label>
              Condition
              <select
                value={scenario}
                onChange={(event) => {
                  stopReplay();
                  setScenario(event.target.value as ProofScenarioId);
                }}
              >
                {PROOF_SCENARIOS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fixture seed
              <select
                value={seed}
                onChange={(event) => {
                  stopReplay();
                  setSeed(Number(event.target.value));
                }}
              >
                {PROOF_SEEDS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="proof-run">
              <Play size={14} />
              Run comparison
            </button>
            <button
              type="button"
              className="proof-suite-run"
              onClick={() => {
                stopReplay();
                setSuite(runProofSuite());
              }}
            >
              Run all 24 cases <ArrowUpRight size={14} />
            </button>
          </form>
          <div className="proof-case-caption">
            <p>
              <strong>{shownScenario.label}</strong> {shownScenario.description}
            </p>
            <span>
              SEED {trials[0].seed} · {trials[0].task.order.quantity} UNITS · MAX $
              {(trials[0].task.order.maxUnitPriceCents / 100).toFixed(2)} / UNIT · SYNTHETIC USD
            </span>
          </div>
          <TracePlayer
            views={trials.map(policyView)}
            runKey={`reference-${runVersion}`}
            autoplay
            active={mode === 'reference'}
            pauseKey={pauseRevision}
            onSelect={setReferenceExport}
          />
          <p className="proof-stage-note">
            The world is the source of truth. A lost reply can hide a successful commit; retrying
            with a new key can allocate the order twice.
          </p>
          {suite && <SuiteResults trials={suite} />}
        </section>
        <section
          className="proof-panel"
          id="proof-panel-recorded"
          role="tabpanel"
          aria-labelledby="proof-tab-recorded"
          hidden={mode !== 'recorded'}
        >
          <div className="proof-task-brief">
            <span className="proof-eyebrow">RECORDED AGENT</span>
            <p>
              Tool calls from recorded sessions, replayed in the same environment and graded against
              the resulting world state.
            </p>
            <span className="proof-origin">
              {recorded.trials.length} validated {recorded.trials.length === 1 ? 'trial' : 'trials'}
            </span>
          </div>
          {(recorded.state === 'loading' ||
            recorded.state === 'unavailable' ||
            recorded.state === 'error') && (
            <div className="proof-recording-status" role="status">
              <div>
                <h2>
                  {recorded.state === 'loading'
                    ? 'Loading recorded trials…'
                    : recorded.state === 'unavailable'
                      ? 'No recorded trials in this build yet.'
                      : 'Recorded trials could not be loaded.'}
                </h2>
                <p>
                  {recorded.state === 'error'
                    ? recorded.message
                    : recorded.state === 'unavailable'
                      ? 'The reference policies are ready to run. You can also import a compatible session trace below.'
                      : 'Loading the local recording artifact and checking its actions.'}
                </p>
              </div>
              {recorded.state !== 'loading' && (
                <button type="button" onClick={() => setReload((value) => value + 1)}>
                  Reload recording
                </button>
              )}
            </div>
          )}
          {recorded.state === 'ready' && (
            <div className="proof-recording-register">
              <header>
                <span>{recorded.total} entries in the recording · all outcomes retained</span>
                <button type="button" onClick={() => setReload((value) => value + 1)}>
                  Reload
                </button>
              </header>
              <div className="proof-recording-list">
                {recorded.trials.map((trial, index) => (
                  <button
                    type="button"
                    key={`${trial.scenarioId}-${trial.seed}-${index}`}
                    aria-pressed={selectedRecording === String(index)}
                    onClick={() => {
                      stopReplay();
                      setSelectedRecording(String(index));
                    }}
                  >
                    <span>
                      {scenarioLabel(trial.scenarioId)}
                      <small>
                        Seed {trial.seed} · {trial.events.length} accepted actions
                      </small>
                    </span>
                    <Outcome trial={trial} />
                  </button>
                ))}
              </div>
              {recorded.recording && (
                <div className="proof-recording-meta">
                  <strong>
                    Recording metadata: {recorded.recording.acceptedActions} accepted tool actions ·{' '}
                    {recorded.recording.rejectedSubmissions} submissions rejected before execution
                  </strong>
                  <p>
                    {recorded.recording.notes ||
                      'Rejected protocol submissions had no effect on the simulated world and are separate from outcome grading.'}
                  </p>
                </div>
              )}
              {recorded.rejected.length > 0 && (
                <div className="proof-rejected" role="status">
                  <strong>{recorded.rejected.length} entries rejected during validation</strong>
                  <ul>
                    {recorded.rejected.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {imported && (
            <button
              type="button"
              className="proof-imported-select"
              aria-pressed={selectedRecording === 'imported'}
              onClick={() => {
                stopReplay();
                setSelectedRecording('imported');
              }}
            >
              Imported trace · {scenarioLabel(imported.scenarioId)} · seed {imported.seed}
              <Outcome trial={imported} />
            </button>
          )}
          {currentRecording && (
            <>
              <div className="proof-provenance">
                <div>
                  <span>Source</span>
                  <strong>
                    {selectedRecording === 'imported'
                      ? 'Imported trace'
                      : currentRecording.provenance.kind === 'recorded-agent'
                        ? 'Recorded agent session'
                        : 'Supplied trace'}
                  </strong>
                </div>
                <div>
                  <span>Adapter</span>
                  <strong>{currentRecording.provenance.adapter}</strong>
                </div>
                <div>
                  <span>Model</span>
                  <strong>{currentRecording.provenance.model ?? 'Not reported'}</strong>
                </div>
                <div>
                  <span>Case</span>
                  <strong>
                    {scenarioLabel(currentRecording.scenarioId)} · seed {currentRecording.seed}
                  </strong>
                </div>
              </div>
              <p className="proof-provenance-note">
                Source and model metadata are supplied with the artifact. Provenance is not
                independently verified; tool actions and outcome grades are replayed locally.
              </p>
              <TracePlayer
                views={[policyView(currentRecording)]}
                runKey={`recorded-${selectedRecording}-${reload}-${importRevision}`}
                active={mode === 'recorded'}
                pauseKey={pauseRevision}
              />
            </>
          )}
        </section>
        <details className="proof-method">
          <summary>
            <span>Method & evidence</span>
            <span>
              Fixtures, grading, and portable traces <ArrowUpRight size={14} />
            </span>
          </summary>
          <div className="proof-method-grid">
            <section>
              <span className="proof-eyebrow">WHAT THIS MEASURES</span>
              <h2>Correct world state, not a convincing reply.</h2>
              <p>
                Fulfilment requires the exact committed quantity, allowed items, prices within the
                cap, and no duplicate allocation. An explicit handoff is scored separately and is
                justified only when valid stock cannot fulfil the remainder.
              </p>
              <p>
                The grader does not prescribe a tool sequence. A committed reservation with a lost
                reply can still fulfil the order. Agent-reported status is shown separately when
                available.
              </p>
            </section>
            <section>
              <span className="proof-eyebrow">SCOPE</span>
              <h2>A small, reproducible lab.</h2>
              <p>
                Four synthetic conditions and six fixed seeds make 24 public cases. Running the
                three deterministic reference policies produces 72 runs. These counts describe the
                supplied fixtures; they do not establish general agent performance.
              </p>
              <p>
                Recorded sessions use the same task, tools, and grader. Their observed results are
                individual trials, with every loaded outcome retained.
              </p>
              <p className="proof-fixture-meta">
                {PROOF_ENVIRONMENT} · fixture {PROOF_FIXTURE_VERSION}
                <br />
                Public seeds: {PROOF_SEEDS.join(', ')}
              </p>
            </section>
          </div>
          <div className="proof-evidence-links">
            <a
              href={`${import.meta.env.BASE_URL}proof-agent-trials.json`}
              target="_blank"
              rel="noreferrer"
            >
              Full recording & rejected submissions <ArrowUpRight size={14} />
            </a>
            <a
              href={`${import.meta.env.BASE_URL}proof-evidence.json`}
              target="_blank"
              rel="noreferrer"
            >
              Reference suite artifact <ArrowUpRight size={14} />
            </a>
            <a href={`${REPO}/blob/main/src/core/proof.ts`} target="_blank" rel="noreferrer">
              Simulator, fixtures & grader <ArrowUpRight size={14} />
            </a>
            <a href={`${REPO}/blob/main/tests/proof.test.ts`} target="_blank" rel="noreferrer">
              Outcome & replay tests <ArrowUpRight size={14} />
            </a>
            <a href={`${REPO}/blob/main/scripts/proof-session.ts`} target="_blank" rel="noreferrer">
              Session protocol <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="proof-trace-actions">
            <button
              type="button"
              disabled={!exportTrial}
              onClick={() => {
                if (exportTrial)
                  download(
                    `proof-${exportTrial.scenarioId}-${exportTrial.seed}-${exportTrial.policyId}.json`,
                    exportProof(exportTrial),
                  );
              }}
            >
              <Download size={15} />
              Export selected trace
            </button>
            <label>
              Import trace JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={(event) => {
                  void loadFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>
            <p>
              Selected traces include accepted tool actions and world snapshots. Version 1 · 512 KB
              maximum. Imports replay the fixture and recompute grades.
            </p>
          </div>
          {importMessage && (
            <p className="proof-import-message" role="status">
              {importMessage}
            </p>
          )}
          {exportTrial && (
            <details className="proof-raw-trace">
              <summary>
                Full selected trace · {scenarioLabel(exportTrial.scenarioId)} /{' '}
                {exportTrial.policyId}
              </summary>
              <pre>{exportProof(exportTrial)}</pre>
            </details>
          )}
        </details>
      </main>
    </div>
  );
}
