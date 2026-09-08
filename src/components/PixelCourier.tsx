import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from 'lucide-react';
import {
  createPixelWorld,
  EMPTY_COURIER_INPUT,
  PIXEL_STEP,
  stepPixelWorld,
  type CourierInput,
  type CourierMode,
} from '../core/pixel-world';
import { createCourierRenderer, type CourierRenderer } from '../core/pixel-renderer';
import '../pixel.css';

function reducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
function readScore(world: ReturnType<typeof createPixelWorld>) {
  return {
    carried: world.carried,
    deliveries: world.deliveries,
    returns: world.returns,
    pickups: world.pickups,
  };
}

export default function PixelCourier({
  embedded = false,
  active = true,
}: {
  embedded?: boolean;
  active?: boolean;
}) {
  const world = useRef(createPixelWorld());
  const canvas = useRef<HTMLCanvasElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const renderer = useRef<CourierRenderer | null>(null);
  const keyboard = useRef<CourierInput>({ ...EMPTY_COURIER_INPUT });
  const touch = useRef<CourierInput>({ ...EMPTY_COURIER_INPUT });
  const modeRef = useRef<CourierMode>('demo');
  const [mode, setMode] = useState<CourierMode>('demo');
  const [running, setRunning] = useState(() => !reducedMotion());
  const [isReduced, setReduced] = useState(reducedMotion);
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );
  const [available, setAvailable] = useState<boolean | null>(null);
  const [score, setScore] = useState(() => readScore(world.current));
  const [announcement, setAnnouncement] = useState('');
  const instructionsId = useId();
  const playing = running && active && inView && documentVisible && available === true;

  const clearInput = () => {
    keyboard.current = { ...EMPTY_COURIER_INPUT };
    touch.current = { ...EMPTY_COURIER_INPUT };
    world.current.jumpHeld = false;
  };

  useEffect(() => {
    const surface = screen.current;
    const element = canvas.current;
    if (!surface || !element) return;
    let nextRenderer: CourierRenderer | null = null;
    try {
      nextRenderer = createCourierRenderer(element);
    } catch {
      nextRenderer = null;
    }
    renderer.current = nextRenderer;
    setAvailable(Boolean(nextRenderer));
    const resize = () => {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      nextRenderer?.resize(bounds.width, bounds.height);
      nextRenderer?.draw(world.current);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    return () => {
      observer.disconnect();
      renderer.current = null;
    };
  }, []);

  useEffect(() => {
    const surface = screen.current;
    if (!surface) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(surface);
    const visibility = () => {
      const visible = document.visibilityState !== 'hidden';
      setDocumentVisible(visible);
      if (!visible) clearInput();
    };
    const blur = () => clearInput();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', blur);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => {
      setReduced(media.matches);
      if (media.matches) {
        setRunning(false);
        clearInput();
      }
    };
    media.addEventListener('change', preference);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', blur);
      media.removeEventListener('change', preference);
      clearInput();
    };
  }, []);

  useEffect(() => {
    if (!playing) {
      clearInput();
      renderer.current?.draw(world.current);
      return;
    }
    let frame = 0;
    let previousTime = 0;
    let accumulator = 0;
    let disposed = false;
    const render = (now: number) => {
      if (disposed) return;
      if (previousTime) accumulator += Math.min((now - previousTime) / 1000, PIXEL_STEP * 6);
      previousTime = now;
      const before = readScore(world.current);
      while (accumulator >= PIXEL_STEP) {
        const input: CourierInput = {
          left: keyboard.current.left || touch.current.left,
          right: keyboard.current.right || touch.current.right,
          jump: keyboard.current.jump || touch.current.jump,
        };
        stepPixelWorld(world.current, modeRef.current, input);
        accumulator -= PIXEL_STEP;
      }
      const next = readScore(world.current);
      if (
        before.carried !== next.carried ||
        before.deliveries !== next.deliveries ||
        before.returns !== next.returns ||
        before.pickups !== next.pickups
      ) {
        setScore(next);
        if (next.deliveries > before.deliveries)
          setAnnouncement(`Delivery ${next.deliveries} complete. On to the next post office.`);
        if (next.returns > before.returns)
          setAnnouncement('Back on the path at the last delivery. Your parcels are safe.');
      }
      renderer.current?.draw(world.current);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [playing]);

  function chooseMode(next: CourierMode, focus = false) {
    clearInput();
    modeRef.current = next;
    setMode(next);
    setRunning(true);
    if (focus) canvas.current?.focus({ preventScroll: true });
  }

  function handleKey(event: KeyboardEvent<HTMLCanvasElement>, pressed: boolean) {
    if (modeRef.current !== 'manual' || !running || !active) return;
    const key = event.key.toLowerCase();
    const action =
      key === 'arrowleft' || key === 'a'
        ? 'left'
        : key === 'arrowright' || key === 'd'
          ? 'right'
          : key === ' ' || key === 'arrowup' || key === 'w'
            ? 'jump'
            : null;
    if (!action) return;
    event.preventDefault();
    keyboard.current[action] = pressed;
  }

  function pressTouch(event: PointerEvent<HTMLButtonElement>, action: keyof CourierInput) {
    if (available === false) return;
    event.preventDefault();
    if (modeRef.current !== 'manual') chooseMode('manual');
    setRunning(true);
    touch.current[action] = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function releaseTouch(action: keyof CourierInput) {
    touch.current[action] = false;
  }

  function reset() {
    clearInput();
    world.current = createPixelWorld();
    setScore(readScore(world.current));
    setAnnouncement('Route reset. Back at the first parcel.');
    renderer.current?.draw(world.current);
    // Preserve mode and play intent: a paused game stays paused after Reset.
  }

  const status =
    available === false
      ? 'Canvas unavailable'
      : !running
        ? 'Paused'
        : !active || !inView || !documentVisible
          ? 'Resting offscreen'
          : mode === 'demo'
            ? 'Demo running'
            : 'You’re driving';
  return (
    <section
      className={`pixel-courier${embedded ? ' pixel-courier-embedded' : ''}`}
      aria-label="Little deliveries game"
      data-mode={mode}
      data-running={playing}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) clearInput();
      }}
    >
      <div className="pixel-courier-screen" ref={screen}>
        <canvas
          ref={canvas}
          className="pixel-courier-canvas"
          tabIndex={available === false ? -1 : 0}
          role="img"
          aria-label="A courier carrying parcels through a small hillside town. Take control to play."
          aria-describedby={instructionsId}
          onKeyDown={(event) => handleKey(event, true)}
          onKeyUp={(event) => handleKey(event, false)}
          onBlur={() => {
            keyboard.current = { ...EMPTY_COURIER_INPUT };
          }}
        />
        <div className="pixel-courier-hud" aria-label="Route progress">
          <span>
            <i className="pixel-parcel-icon" aria-hidden="true" />
            <b data-pixel-parcels>{score.carried}</b>
            <span>carried</span>
          </span>
          <span>
            <i className="pixel-check-icon" aria-hidden="true">
              ✓
            </i>
            <b data-pixel-deliveries>{score.deliveries}</b>
            <span>deliveries</span>
          </span>
        </div>
        <span className="pixel-courier-location">
          HILLSIDE POST <span>·</span> OPEN ROUTE
        </span>
        {available === false && (
          <div className="pixel-courier-fallback">
            <p>Little deliveries</p>
            <span>This browser cannot draw the game canvas. The route is paused.</span>
            <a href="#/">Back to the work index →</a>
          </div>
        )}
        {!running && available !== false && (
          <button className="pixel-courier-start" onClick={() => setRunning(true)}>
            <Play size={14} />
            {isReduced && world.current.tick === 0 ? 'Play the route' : 'Continue route'}
          </button>
        )}
      </div>
      <div className="pixel-courier-controls">
        <div className="pixel-courier-description">
          <div>
            <strong>Little deliveries</strong>
            <span className="pixel-courier-status" role="status">
              <i aria-hidden="true" data-running={playing} />
              {status}
            </span>
          </div>
          <p id={instructionsId}>
            {mode === 'demo'
              ? 'A parcel, a little jump, another doorstep. Take over whenever you like.'
              : 'Focus the scene. ← → or A / D to move · Space / ↑ to jump.'}
          </p>
        </div>
        <div className="pixel-courier-actions" aria-label="Game controls">
          <button
            onClick={() => chooseMode('demo')}
            aria-pressed={mode === 'demo'}
            disabled={available === false}
          >
            Demo
          </button>
          <button
            onClick={() => chooseMode('manual', true)}
            aria-pressed={mode === 'manual'}
            disabled={available === false}
          >
            Take control <ArrowUp size={12} />
          </button>
          <button
            onClick={() => {
              clearInput();
              setRunning((value) => !value);
            }}
            disabled={available === false}
            aria-label={running ? 'Pause game' : 'Play game'}
          >
            {running ? <Pause size={13} /> : <Play size={13} />}
            {running ? 'Pause' : 'Play'}
          </button>
          <button onClick={reset} aria-label="Reset route">
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
        <div className="pixel-courier-touch" aria-label="Touch controls">
          {(['left', 'right', 'jump'] as const).map((action) => (
            <button
              key={action}
              aria-label={action === 'jump' ? 'Jump' : `Move ${action}`}
              disabled={available === false}
              onPointerDown={(event) => pressTouch(event, action)}
              onPointerUp={() => releaseTouch(action)}
              onPointerCancel={() => releaseTouch(action)}
              onLostPointerCapture={() => releaseTouch(action)}
              onKeyDown={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault();
                  if (modeRef.current !== 'manual') chooseMode('manual');
                  setRunning(true);
                  touch.current[action] = true;
                }
              }}
              onKeyUp={() => releaseTouch(action)}
              onBlur={() => releaseTouch(action)}
            >
              {action === 'left' ? (
                <ArrowLeft size={18} />
              ) : action === 'right' ? (
                <ArrowRight size={18} />
              ) : (
                <>
                  <ArrowUp size={16} />
                  <span>Jump</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
      <span className="pixel-courier-announcement" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </section>
  );
}
