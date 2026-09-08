import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { PROOF_SCENARIOS, type ProofAction, type ProofTrial } from '../core/proof';
import { boundedText, readRecorded, type RecordedLoad } from '../core/proof-recordings';
import {
  advanceProofHead,
  proofActionSummary,
  proofToolLabel,
  proofVisualFrame,
} from '../core/proof-visual';
import '../proof.css';

type PlaybackState = {
  head: number;
  playing: boolean;
  speed: number;
  loop: boolean;
  cycles: number;
};

/** One clock owns packets, snapshots, and playback. Inactive surfaces schedule no frames. */
export function useProofPlayback({
  eventCount,
  active = true,
  autoplay = false,
  onCycle,
}: {
  eventCount: number;
  active?: boolean;
  autoplay?: boolean;
  onCycle?: () => void;
}) {
  const stageRef = useRef<HTMLElement>(null);
  const initial = useRef<PlaybackState>({
    head:
      autoplay && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : eventCount,
    playing: autoplay && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    speed: 1,
    loop: true,
    cycles: 0,
  });
  const [state, setState] = useState(initial.current);
  const clock = useRef(initial.current);
  const context = useRef({ eventCount, active, onCycle });
  context.current = { eventCount, active, onCycle };
  const syncRef = useRef<(() => void) | null>(null);
  const update = (changes: Partial<PlaybackState>) => {
    clock.current = { ...clock.current, ...changes };
    setState({ ...clock.current });
    syncRef.current?.();
  };
  useEffect(() => {
    const stage = stageRef.current!;
    let frame = 0,
      previous = 0,
      sampled = 0;
    const rect = stage.getBoundingClientRect();
    let visible = rect.bottom > 0 && rect.top < window.innerHeight;
    const available = () =>
      clock.current.playing && context.current.active && visible && !document.hidden;
    const tick = (now: number) => {
      frame = 0;
      if (!available()) return;
      const seconds = previous ? Math.min(80, now - previous) / 1000 : 0;
      previous = now;
      const current = clock.current;
      current.head = advanceProofHead(
        current.head,
        context.current.eventCount,
        seconds,
        current.speed,
      );
      if (current.head >= context.current.eventCount + 1) {
        if (current.loop) {
          current.head = 0;
          current.cycles += 1;
          context.current.onCycle?.();
        } else current.playing = false;
        sampled = 0;
      }
      if (now - sampled >= 24 || !current.playing) {
        setState({ ...current });
        sampled = now;
      }
      if (available()) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (available()) frame = requestAnimationFrame(tick);
    };
    syncRef.current = sync;
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    intersection.observe(stage);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => {
      if (preference.matches) {
        clock.current.playing = false;
        setState({ ...clock.current });
        sync();
      }
    };
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener('change', reduce);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', reduce);
      syncRef.current = null;
    };
  }, []);
  useEffect(() => {
    syncRef.current?.();
  }, [active, eventCount]);
  return {
    ...state,
    stageRef,
    pause: () => update({ playing: false }),
    play: () =>
      update({ playing: true, head: clock.current.head >= eventCount ? 0 : clock.current.head }),
    seek: (head: number, count = eventCount) =>
      update({ playing: false, head: Math.max(0, Math.min(count + 1, head)) }),
    reset: (play = false) => update({ head: 0, playing: play }),
    setSpeed: (speed: number) => update({ playing: false, speed }),
    setLoop: (loop: boolean) => update({ playing: false, loop }),
  };
}

type Point = { x: number; y: number };
const toolIds: ProofAction['tool'][] = [
  'read_order',
  'catalog',
  'reserve',
  'lookup_receipt',
  'handoff',
];
const stationNames = ['ORDER', 'CATALOG', 'RESERVE', 'RECEIPTS', 'HANDOFF'];
const ease = (value: number) => value * value * (3 - 2 * value);
const clamp = (value: number) => Math.max(0, Math.min(1, value));
function route(from: Point, to: Point) {
  const bend = to.y < from.y ? -22 : 22;
  const a = { x: from.x + (to.x - from.x) * 0.35, y: from.y + bend };
  const b = { x: to.x, y: to.y - bend };
  return {
    d: `M${from.x},${from.y} C${a.x},${a.y} ${b.x},${b.y} ${to.x},${to.y}`,
    point: (t: number) => {
      const q = 1 - t;
      return {
        x: q ** 3 * from.x + 3 * q * q * t * a.x + 3 * q * t * t * b.x + t ** 3 * to.x,
        y: q ** 3 * from.y + 3 * q * q * t * a.y + 3 * q * t * t * b.y + t ** 3 * to.y,
      };
    },
  };
}

export function AgentMap({
  trial,
  head,
  label,
}: {
  trial: ProofTrial;
  head: number;
  label?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const titleId = useId();
  useEffect(() => {
    const element = mapRef.current!;
    const measure = () => setNarrow(element.getBoundingClientRect().width < 550);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const frame = proofVisualFrame(trial, head);
  const { event, world, phase, index, allocation } = frame;
  const center = narrow ? { x: 210, y: 146 } : { x: 454, y: 130 };
  const points: Point[] = narrow
    ? [
        { x: 63, y: 65 },
        { x: 347, y: 65 },
        { x: 343, y: 237 },
        { x: 210, y: 294 },
        { x: 65, y: 237 },
      ]
    : [
        { x: 143, y: 74 },
        { x: 752, y: 66 },
        { x: 831, y: 222 },
        { x: 486, y: 250 },
        { x: 141, y: 230 },
      ];
  const activeTool = event ? toolIds.indexOf(event.action.tool) : -1;
  const activeRoute = activeTool >= 0 ? route(center, points[activeTool]) : null;
  const sending = phase > 0 && phase < 0.45;
  const returning = phase >= 0.59 && phase < 0.96;
  const lost = event?.observation.code === 'ACK_UNKNOWN';
  const outbound = ease(clamp(phase / 0.45));
  const inbound = ease(clamp((phase - 0.59) / 0.37));
  const packet = activeRoute?.point(sending ? outbound : 1 - inbound * (lost ? 0.55 : 1));
  const stock = world.inventory
    .filter(
      (item) =>
        world.order.allowedSkus.includes(item.sku) &&
        item.unitPriceCents <= world.order.maxUnitPriceCents,
    )
    .reduce((total, item) => total + item.stock, 0);
  const duplicate = allocation > world.order.quantity;
  const isAgent = trial.provenance.kind === 'recorded-agent';
  const sourceLabel = isAgent
    ? 'Recorded agent'
    : trial.provenance.kind === 'reference-policy'
      ? 'Reference policy'
      : 'Imported trace';
  const input = event ? proofActionSummary(event.action) : 'No accepted tool actions';
  const responseTitle = !event
    ? 'Initial world'
    : !frame.applied
      ? 'Request travelling'
      : !frame.replied
        ? frame.committed
          ? 'Committed · reply in transit'
          : 'Tool has responded'
        : lost
          ? 'Committed · reply lost'
          : event.observation.code === 'EXISTING_RECEIPT'
            ? 'Same receipt returned'
            : !event.observation.ok
              ? 'Tool returned an error'
              : event.action.tool === 'handoff'
                ? 'Handoff recorded'
                : 'Reply received';
  const responseText = !event
    ? 'The imported trace contains no executed actions.'
    : !frame.applied
      ? 'The world still matches the snapshot before this tool call.'
      : !frame.replied
        ? 'The world snapshot is visible independently of the reply.'
        : lost
          ? 'The reservation exists. Its acknowledgement never arrived.'
          : event.observation.message;
  return (
    <div
      className="agent-map"
      ref={mapRef}
      data-policy={trial.policyId}
      data-event-index={event ? index : -1}
      data-event-step={event ? index + 1 : 0}
      data-world={frame.applied ? 'after' : 'before'}
      data-receipt-count={world.receipts.length}
      data-allocated={allocation}
      data-phase={phase.toFixed(3)}
      data-head={head.toFixed(3)}
    >
      <svg
        className="agent-map-graphic"
        viewBox={narrow ? '0 0 420 356' : '0 0 1000 334'}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>
          {label ?? sourceLabel}.{' '}
          {event ? `Step ${index + 1}: ${proofToolLabel[event.action.tool]}.` : 'Initial state.'}{' '}
          {responseTitle}. {allocation} of {world.order.quantity} units committed in{' '}
          {world.receipts.length} receipts.
        </title>
        <g className="agent-map-grid" aria-hidden="true">
          {(narrow ? [105, 210, 315] : [125, 250, 375, 500, 625, 750, 875]).map((x) => (
            <path key={x} d={`M${x} 12v6M${x} ${narrow ? 345 : 300}v-6`} />
          ))}
          <path d={narrow ? 'M15 176h7M405 176h-7' : 'M24 155h8M976 155h-8'} />
          {!narrow && (
            <>
              <text x="27" y="25">
                01 — TOOL SPACE
              </text>
              <text x="832" y="297">
                WORLD / SNAPSHOT
              </text>
            </>
          )}
        </g>
        <g fill="none" aria-hidden="true">
          {points.map((point, station) => (
            <path
              key={station}
              d={route(center, point).d}
              className="agent-map-route"
              data-active={station === activeTool}
            />
          ))}
          {activeRoute && (
            <path
              d={activeRoute.d}
              className="agent-map-route-active"
              opacity={0.36 + Math.sin(phase * Math.PI) * 0.32}
            />
          )}
        </g>
        {toolIds.map((tool, station) => {
          const point = points[station];
          const lit = station === activeTool;
          return (
            <g
              key={tool}
              transform={`translate(${point.x} ${point.y})`}
              className="agent-station"
              data-station={tool}
              data-lit={lit}
            >
              <path className="agent-station-ground" d="M-52 25 0 39 52 25 0 10Z" />
              {lit && (
                <path
                  className="agent-station-focus"
                  d="M-43-35h-9v12M43-35h9v12M-43 34h-9v-9M43 34h9v-9"
                  opacity={0.5 + Math.sin(phase * Math.PI) * 0.5}
                />
              )}
              {tool === 'read_order' && (
                <g>
                  <path className="agent-glyph-shadow" d="M-23-23h48v58h-48z" />
                  <path className="agent-glyph-paper" d="M-30-32h43l15 15v45h-58z" />
                  <path className="agent-glyph-ink" d="M13-32v16h15M-19-8H12M-19 0H2" />
                  <text className="agent-glyph-number" x="-19" y="19">
                    {world.order.quantity}×
                  </text>
                </g>
              )}
              {tool === 'catalog' && (
                <g>
                  <path className="agent-glyph-shadow" d="M-40-22h80v49h-80z" />
                  <path
                    className="agent-glyph-outline"
                    d="M-43-25v54h86v-54M-46-25h92M-43 3h86M-43 29h86"
                  />
                  {world.inventory.slice(0, 3).map((item, itemIndex) => (
                    <g key={item.sku} transform={`translate(${-28 + itemIndex * 28} 0)`}>
                      <rect
                        className="agent-stock-box"
                        x="-9"
                        y={-18 + (item.stock ? 0 : 13)}
                        width="18"
                        height={item.stock ? 18 : 5}
                        opacity={item.stock ? 1 : 0.28}
                      />
                      <path className="agent-stock-seam" d="M0-18v7" opacity={item.stock ? 1 : 0} />
                      <text className="agent-stock-count" x="0" y="21">
                        {item.stock}
                      </text>
                    </g>
                  ))}
                </g>
              )}
              {tool === 'reserve' && (
                <g>
                  <path
                    className="agent-glyph-outline"
                    d="M-45 17H43M-37 24H35M-31 17v10M30 17v10"
                  />
                  {[0, 1, 2].map((box) => (
                    <g
                      key={box}
                      transform={`translate(${-29 + box * 29} 0)`}
                      opacity={allocation > box ? 1 : 0.22}
                    >
                      <path
                        className={duplicate ? 'agent-box-error' : 'agent-box-allocated'}
                        d="M-12-17 0-23 12-17v25L0 15-12 8Z"
                      />
                      <path className="agent-stock-seam" d="M-12-17 0-10 12-17M0-10v25" />
                    </g>
                  ))}
                  <text className="agent-reservation-count" x="0" y="-31">
                    {allocation}/{world.order.quantity} UNITS
                  </text>
                </g>
              )}
              {tool === 'lookup_receipt' && (
                <g>
                  {world.receipts.length > 1 && (
                    <path
                      className="agent-receipt-extra"
                      d="M-18-27h45v58l-8-4-8 4-8-4-8 4-13-5z"
                    />
                  )}
                  <path
                    className="agent-receipt"
                    data-present={world.receipts.length > 0}
                    d="M-28-33h45v58l-8-4-8 4-8-4-8 4-13-5z"
                  />
                  <path
                    className="agent-glyph-ink"
                    d="M-18-19H7M-18-12H0M-18 11h24"
                    opacity={world.receipts.length ? 1 : 0.4}
                  />
                  {world.receipts.length > 0 && (
                    <path className="agent-receipt-check" d="m-14-1 5 5 10-10" />
                  )}
                  <circle
                    className={duplicate ? 'agent-count-error' : 'agent-count-badge'}
                    cx="26"
                    cy="-22"
                    r="13"
                  />
                  <text className="agent-count-text" x="26" y="-18">
                    {world.receipts.length}
                  </text>
                </g>
              )}
              {tool === 'handoff' && (
                <g opacity={world.handoff ? 1 : 0.54}>
                  <circle className="agent-glyph-paper" cx="-2" cy="-24" r="10" />
                  <path className="agent-handoff-body" d="M-24 3q0-19 22-19T20 3" />
                  <path className="agent-glyph-outline" d="M-37 6h73M-28 7v21M28 7v21" />
                  <path className="agent-glyph-paper" d="m8-7 24-4 4 17H12Z" />
                  {world.handoff && <path className="agent-handoff-check" d="m-37-25 5 5 9-10" />}
                </g>
              )}
              <text className="agent-station-label" x="0" y="51">
                {stationNames[station]}
              </text>
              {(!narrow || tool === 'catalog') && (
                <text className="agent-station-detail" x="0" y="66">
                  {tool === 'read_order'
                    ? `MAX $${(world.order.maxUnitPriceCents / 100).toFixed(2)} / UNIT`
                    : tool === 'catalog'
                      ? `${stock} ELIGIBLE UNITS`
                      : tool === 'reserve'
                        ? duplicate
                          ? 'EXCESS ALLOCATION'
                          : 'COMMITTED WORLD'
                        : tool === 'lookup_receipt'
                          ? 'DURABLE RECORD'
                          : world.handoff
                            ? 'PERSON REQUESTED'
                            : 'ON REQUEST'}
                </text>
              )}
            </g>
          );
        })}
        {packet && (sending || returning) && (
          <g
            className="agent-packet"
            transform={`translate(${packet.x} ${packet.y})`}
            data-direction={sending ? 'request' : 'response'}
            data-error={returning && !event?.observation.ok}
          >
            <circle r="13" className="agent-packet-halo" />
            <rect x="-5" y="-5" width="10" height="10" rx="1" transform="rotate(45)" />
            {returning && !event?.observation.ok && <path d="m-3-3 6 6m0-6-6 6" />}
          </g>
        )}
        {lost &&
          frame.replied &&
          activeRoute &&
          (() => {
            const location = activeRoute.point(0.46);
            return (
              <g className="agent-lost-reply" transform={`translate(${location.x} ${location.y})`}>
                <path d="m-5-5 10 10m0-10L-5 5" />
                {!narrow && (
                  <text x="0" y="23">
                    REPLY LOST
                  </text>
                )}
              </g>
            );
          })()}
        <g transform={`translate(${center.x} ${center.y})`} className="agent-core">
          <path className="agent-core-underlay" d="m-50-16 50-29 50 29v49L0 62-50 33Z" />
          <path className="agent-core-layer" d="m-50-27 50-29 50 29v48L0 50-50 21Z" />
          <path className="agent-core-face" d="m-50-39 50-29 50 29v48L0 38-50 9Z" />
          <path className="agent-core-seams" d="M-50-39 0-9 50-39M0-9v47" />
          <g transform={`translate(0 ${-29 + Math.sin(phase * Math.PI) * -3})`}>
            <path className="agent-core-mark" d="m-20-8 20-12 20 12L0 4Z" />
            <path className="agent-core-mark-inner" d="m-10-8 10-6 10 6L0-2Z" />
          </g>
          <text className="agent-core-step" x="-23" y="1" transform="rotate(30 -23 1)">
            {String(event ? index + 1 : 0).padStart(2, '0')}
          </text>
          <path
            className="agent-core-signal"
            d="M20-1v16M28-6V9M36-11V3"
            opacity={0.4 + phase * 0.6}
          />
          <text className="agent-core-label" x="0" y="83">
            {isAgent ? 'AGENT' : trial.provenance.kind === 'reference-policy' ? 'POLICY' : 'TRACE'}
          </text>
        </g>
      </svg>
      <div className="agent-world-caption">
        <div className="agent-current-call">
          <span>TOOL INPUT · {event ? String(index + 1).padStart(2, '0') : '00'}</span>
          <strong>{input}</strong>
          <small>
            {event?.action.tool === 'reserve'
              ? `Key: ${event.action.idempotencyKey}`
              : event?.action.tool === 'lookup_receipt'
                ? (event.action.idempotencyKey ?? event.action.orderId ?? 'All matching receipts')
                : event?.action.tool === 'handoff'
                  ? event.action.reason
                  : 'Accepted event from this trace'}
          </small>
        </div>
        <div
          className="agent-current-response"
          data-error={frame.replied && !event?.observation.ok}
        >
          <span>{responseTitle}</span>
          <strong>
            {frame.replied && event
              ? event.observation.code.replaceAll('_', ' ')
              : frame.applied
                ? 'After snapshot'
                : 'Before snapshot'}
          </strong>
          <small>{responseText}</small>
        </div>
        <output
          className="agent-world-total"
          aria-label="Committed allocation"
          data-excess={duplicate}
        >
          <strong>
            {allocation}
            <small> / {world.order.quantity}</small>
          </strong>
          <span>UNITS COMMITTED</span>
          <small>
            {world.receipts.length} {world.receipts.length === 1 ? 'receipt' : 'receipts'}
            {world.handoff ? ' · handoff' : ''}
          </small>
        </output>
      </div>
    </div>
  );
}

function RecordedTheater({
  recordings,
  embedded,
  active,
}: {
  recordings: RecordedLoad;
  embedded: boolean;
  active: boolean;
}) {
  const [run, setRun] = useState(
    Math.max(
      0,
      recordings.trials.findIndex((trial) => trial.scenarioId === 'ack_lost'),
    ),
  );
  const [tour, setTour] = useState(true);
  const trial = recordings.trials[run];
  const player = useProofPlayback({
    eventCount: trial.events.length,
    active,
    autoplay: true,
    onCycle: () => {
      if (tour) setRun((value) => (value + 1) % recordings.trials.length);
    },
  });
  const frame = proofVisualFrame(trial, player.head);
  const manual = () => {
    setTour(false);
    player.pause();
  };
  const changeRun = (value: number) => {
    manual();
    setRun(value);
    player.reset();
  };
  const scenario = PROOF_SCENARIOS.find((item) => item.id === trial.scenarioId)!;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!active) player.pause();
  }, [active]);
  return (
    <section
      className="agent-theater"
      data-embedded={embedded}
      data-playing={player.playing}
      data-cycles={player.cycles}
      data-scenario={trial.scenarioId}
      ref={player.stageRef}
      aria-label="Recorded agent execution map"
    >
      <div className="agent-theater-screen">
        <header className="agent-theater-heading">
          <div>
            <span>RECORDED AGENT · LOCAL REPLAY</span>
            <h2>{scenario.label}</h2>
          </div>
          <span className="agent-theater-mode">
            {player.playing ? (tour ? 'AUTO TOUR' : 'PLAYING') : 'PAUSED'}
            <i aria-hidden="true" />
          </span>
        </header>
        <AgentMap trial={trial} head={player.head} label="Recorded agent · local replay" />
      </div>
      <div className="agent-theater-controls">
        <div className="agent-transport">
          <button
            type="button"
            className="agent-play"
            aria-label={player.playing ? 'Pause agent replay' : 'Play agent replay'}
            onClick={() => {
              if (player.playing) manual();
              else player.play();
            }}
          >
            {player.playing ? <Pause size={15} /> : <Play size={15} />}
            {player.playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            aria-label="Reset agent replay"
            onClick={() => {
              manual();
              player.reset();
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            aria-label="Next agent event"
            onClick={() => {
              manual();
              player.seek(Math.min(trial.events.length, Math.floor(player.head) + 1));
            }}
          >
            <SkipForward size={16} />
          </button>
          <label className="agent-speed">
            <span className="sr-only">Replay speed</span>
            <select
              aria-label="Agent replay speed"
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
          </label>
          <input
            type="range"
            aria-label="Agent replay step"
            min="0"
            max={trial.events.length}
            step="0.01"
            value={Math.min(player.head, trial.events.length)}
            aria-valuetext={`Event ${frame.event ? frame.index + 1 : 0} of ${trial.events.length}`}
            onChange={(event) => {
              manual();
              player.seek(Number(event.target.value));
            }}
          />
          <output>
            STEP {frame.event ? frame.index + 1 : 0} / {trial.events.length}
          </output>
        </div>
        <div className="agent-theater-selection">
          <label>
            <span className="sr-only">Recorded session</span>
            <select
              aria-label="Recorded session"
              value={run}
              onChange={(event) => changeRun(Number(event.target.value))}
            >
              {recordings.trials.map((item, index) => (
                <option key={index} value={index}>
                  {PROOF_SCENARIOS.find((condition) => condition.id === item.scenarioId)?.label ??
                    item.scenarioId}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="agent-tour"
            aria-pressed={tour}
            onClick={() => {
              if (tour) manual();
              else {
                setTour(true);
                player.reset(true);
              }
            }}
          >
            Tour {tour ? 'on' : 'off'}
          </button>
          <button
            type="button"
            className="agent-inspect-event"
            onClick={() => {
              manual();
              if (detailsRef.current) detailsRef.current.open = true;
            }}
          >
            Inspect event
          </button>
          <a href="#/proof">
            Open full lab <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <details
        className="agent-theater-inspect"
        ref={detailsRef}
        onToggle={(event) => {
          if (event.currentTarget.open) manual();
        }}
      >
        <summary>
          Recording notes <span>{recordings.trials.length} sessions · synthetic stock fixture</span>
        </summary>
        <div className="agent-recording-notes">
          <p>
            {trial.provenance.adapter} · Model {trial.provenance.model ?? 'not reported'}. Source
            metadata is supplied with the artifact; actions and grades are replayed locally.
          </p>
          <p>
            {recordings.trials.length} of {recordings.total} sessions validated.{' '}
            {recordings.rejected.length
              ? `${recordings.rejected.length} rejected during validation; those entries are excluded from playback.`
              : 'Every recorded outcome is retained.'}
          </p>
          {recordings.rejected.length > 0 && (
            <ul>
              {recordings.rejected.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          {recordings.recording && (
            <p>
              {recordings.recording.acceptedActions} accepted actions ·{' '}
              {recordings.recording.rejectedSubmissions} submissions rejected before execution.
            </p>
          )}
          <p>Animation is step based. Packet travel does not represent measured execution time.</p>
          <a
            href={`${import.meta.env.BASE_URL}proof-agent-trials.json`}
            target="_blank"
            rel="noreferrer"
          >
            View complete recording <ArrowUpRight size={14} />
          </a>
          {frame.event && (
            <div className="agent-recorded-event">
              <section>
                <h3>Tool input</h3>
                <pre>{JSON.stringify(frame.event.action, null, 2)}</pre>
              </section>
              <section>
                <h3>Tool response</h3>
                <pre>{JSON.stringify(frame.event.observation, null, 2)}</pre>
              </section>
              <section>
                <h3>Before / after world</h3>
                <pre>
                  {JSON.stringify(
                    { before: frame.event.before, after: frame.event.after },
                    null,
                    2,
                  )}
                </pre>
              </section>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}

export default function AgentTheater({
  embedded = false,
  active = true,
}: {
  embedded?: boolean;
  active?: boolean;
}) {
  const [recordings, setRecordings] = useState<RecordedLoad>({
    state: 'loading',
    trials: [],
    rejected: [],
    message: '',
    total: 0,
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRecordings({ state: 'loading', trials: [], rejected: [], message: '', total: 0 });
    void (async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}proof-agent-trials.json`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok || response.headers.get('content-type')?.includes('text/html'))
          throw new Error('The recorded sessions are unavailable in this build.');
        const loaded = readRecorded(await boundedText(response));
        if (!loaded.trials.length)
          throw new Error('No recorded sessions passed local trace validation.');
        if (!controller.signal.aborted) setRecordings(loaded);
      } catch (error) {
        if (!controller.signal.aborted)
          setRecordings({
            state: 'error',
            trials: [],
            rejected: [],
            total: 0,
            message: error instanceof Error ? error.message : 'The recording could not be loaded.',
          });
      }
    })();
    return () => controller.abort();
  }, [revision]);
  if (recordings.state === 'ready' && recordings.trials.length)
    return <RecordedTheater recordings={recordings} embedded={embedded} active={active} />;
  return (
    <section className="agent-theater" data-embedded={embedded}>
      <div className="agent-theater-screen agent-theater-loading" role="status">
        <span>RECORDED AGENT · LOCAL REPLAY</span>
        <h2>
          {recordings.state === 'loading'
            ? 'Opening the recorded tool space…'
            : 'Recording unavailable'}
        </h2>
        <p>
          {recordings.state === 'loading'
            ? 'Validating the local event records and world snapshots.'
            : recordings.message}
        </p>
      </div>
      <div className="agent-theater-controls agent-theater-loading-controls">
        {recordings.state === 'error' && (
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Reload recording
          </button>
        )}
        <a href="#/proof">
          Open full lab <ArrowUpRight size={14} />
        </a>
      </div>
      <details className="agent-theater-inspect">
        <summary>Recording notes</summary>
        <p>The visual uses validated local session records.</p>
      </details>
    </section>
  );
}
