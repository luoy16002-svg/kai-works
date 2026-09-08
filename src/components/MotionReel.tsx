import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Play, Pause, RotateCcw, ArrowDownToLine, ArrowUpRight } from 'lucide-react';
import { download } from '../ui';
import {
  FILM_DURATION,
  FILM_CHAPTERS,
  FILM_PALETTES,
  FILM_PROJECTS,
  drawFilm,
  filmEase,
  filmState,
  filmChapter,
  filmEntryProgress,
  type FilmPalette,
  type FilmProject,
} from '../core/motion-film';
import '../motion-reel.css';

type Engine = {
  play: () => void;
  pause: () => void;
  seek: (time: number, animate?: boolean) => void;
  palette: (value: FilmPalette) => void;
  highlight: (value: FilmProject | null) => void;
  sync: () => void;
  picture: () => string;
};
type Bridge =
  | { kind: 'chapter'; from: number; to: number; elapsed: number; duration: number }
  | { kind: 'palette'; image: HTMLCanvasElement; elapsed: number; duration: number };
const stamp = (value: number) => `00:${String(Math.floor(value)).padStart(2, '0')}`;

export default function MotionReel({
  embedded = false,
  active = true,
}: {
  embedded?: boolean;
  active?: boolean;
}) {
  const initialReduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [time, setTime] = useState(initialReduced.current ? FILM_DURATION : 0);
  const [playing, setPlaying] = useState(!initialReduced.current);
  const [palette, setPalette] = useState<FilmPalette>('apricot');
  const [speed, setSpeed] = useState(1);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const [entering, setEntering] = useState<FilmProject | null>(null);
  const [buffer, setBuffer] = useState({ width: 0, height: 0, dpr: 1 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const clock = useRef(time),
    intent = useRef(playing),
    paletteRef = useRef(palette),
    speedRef = useRef(speed);
  const activeRef = useRef(active),
    routeTimer = useRef<number | undefined>(undefined);
  const drag = useRef<{ x: number; y: number; time: number; armed: boolean } | null>(null);
  speedRef.current = speed;
  activeRef.current = active;
  useEffect(() => {
    const canvas = canvasRef.current!;
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext('2d', { alpha: false });
    } catch {
      /* The finished entry composition remains available. */
    }
    if (!context) {
      setFailure('Canvas is unavailable. The project entries remain available.');
      setPlaying(false);
      intent.current = false;
      clock.current = FILM_DURATION;
      setTime(FILM_DURATION);
      const fallbackSize = () => {
        const r = canvas.getBoundingClientRect();
        setBuffer({ width: r.width, height: r.height, dpr: 1 });
      };
      const fallbackResize = new ResizeObserver(fallbackSize);
      fallbackResize.observe(canvas);
      fallbackSize();
      return () => fallbackResize.disconnect();
    }
    const ctx = context;
    let width = 1,
      height = 1,
      dpr = 1,
      frame = 0,
      previous = 0,
      lastUi = 0;
    let visible = false,
      disposed = false,
      highlighted: FilmProject | null = null;
    let bridge: Bridge | null = null;
    const available = () => !disposed && activeRef.current && visible && !document.hidden;
    const paint = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFilm(ctx, width, height, clock.current, paletteRef.current, highlighted);
      if (bridge?.kind === 'palette') {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 - filmEase(bridge.elapsed / bridge.duration);
        ctx.drawImage(bridge.image, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    };
    const request = () => {
      if (!frame && available()) frame = requestAnimationFrame(tick);
    };
    const tick = (now: number) => {
      frame = 0;
      if (!available()) return;
      const delta = previous ? Math.min(64, now - previous) : 0;
      previous = now;
      if (bridge) {
        bridge.elapsed += delta;
        if (bridge.kind === 'chapter')
          clock.current =
            bridge.from + (bridge.to - bridge.from) * filmEase(bridge.elapsed / bridge.duration);
        if (bridge.elapsed >= bridge.duration) bridge = null;
      } else if (intent.current)
        clock.current = Math.min(FILM_DURATION, clock.current + (delta / 1000) * speedRef.current);
      paint();
      if (now - lastUi > 65 || clock.current >= FILM_DURATION) {
        setTime(clock.current);
        lastUi = now;
      }
      if (clock.current >= FILM_DURATION) {
        intent.current = false;
        setPlaying(false);
      }
      if (intent.current || bridge) request();
    };
    const sync = () => {
      previous = 0;
      cancelAnimationFrame(frame);
      frame = 0;
      request();
    };
    const pause = () => {
      bridge = null;
      intent.current = false;
      setPlaying(false);
      setTime(clock.current);
      sync();
    };
    engine.current = {
      play: () => {
        if (clock.current >= FILM_DURATION) clock.current = 0;
        bridge = null;
        intent.current = true;
        setPlaying(true);
        sync();
      },
      pause,
      seek: (value, animate = false) => {
        const target = Math.max(0, Math.min(FILM_DURATION, value));
        if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
          bridge = { kind: 'chapter', from: clock.current, to: target, elapsed: 0, duration: 380 };
        else {
          bridge = null;
          clock.current = target;
          intent.current = false;
          setPlaying(false);
        }
        setTime(clock.current);
        sync();
      },
      palette: (value) => {
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const image = document.createElement('canvas');
          image.width = canvas.width;
          image.height = canvas.height;
          image.getContext('2d')?.drawImage(canvas, 0, 0);
          bridge = { kind: 'palette', image, elapsed: 0, duration: 280 };
        } else bridge = null;
        paletteRef.current = value;
        sync();
      },
      highlight: (value) => {
        highlighted = value;
        request();
      },
      sync,
      picture: () => {
        paint();
        return canvas.toDataURL('image/png');
      },
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        visible = false;
        sync();
        return;
      }
      width = bounds.width;
      height = bounds.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      setBuffer({ width: canvas.width, height: canvas.height, dpr });
      visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      paint();
      sync();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0;
      sync();
    });
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedChange = () => {
      if (preference.matches) {
        bridge = null;
        clock.current = FILM_DURATION;
        paint();
        pause();
      }
    };
    preference.addEventListener('change', reducedChange);
    resize();
    setReady(true);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', reducedChange);
      bridge = null;
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    engine.current?.sync();
    if (!active) {
      window.clearTimeout(routeTimer.current);
      setEntering(null);
      drag.current = null;
    }
  }, [active]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.clearTimeout(routeTimer.current);
        setEntering(null);
      }
    };
    window.addEventListener('keydown', cancel);
    return () => {
      window.clearTimeout(routeTimer.current);
      window.removeEventListener('keydown', cancel);
    };
  }, []);
  const openProject = (event: MouseEvent<HTMLAnchorElement>, id: FilmProject) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    event.preventDefault();
    window.clearTimeout(routeTimer.current);
    engine.current?.pause();
    setEntering(id);
    routeTimer.current = window.setTimeout(() => {
      if (activeRef.current) window.location.hash = `#/${id}`;
    }, 240);
  };
  const dragMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x,
      dy = event.clientY - start.y;
    if (!start.armed) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      start.armed = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    engine.current?.seek(start.time + (dx / event.currentTarget.clientWidth) * FILM_DURATION);
  };
  const chapter = filmChapter(time),
    entryProgress = failure ? 1 : filmEntryProgress(time);
  const entriesAvailable = !!failure || entryProgress > 0.5;
  const stacked = buffer.width < buffer.height * 1.3;
  return (
    <section
      className={`motion-reel${embedded ? ' motion-reel-embedded' : ''}`}
      aria-label="KAI, type into system"
    >
      <div className="motion-reel-screen" data-layout={stacked ? 'stacked' : 'columns'}>
        <div
          className="motion-reel-poster"
          data-final={!!failure || time >= 7.75}
          aria-hidden="true"
        >
          <svg className="motion-reel-poster-letters" viewBox="0 0 640 400" fill="none">
            <path d="M160 124V276M247 124 167 201l85 75" stroke="#eeaa82" strokeWidth="26" />
            <path d="m283 276 55-152 55 152m-91-49h72" stroke="#f7f2e8" strokeWidth="26" />
            <path d="M447 124V276" stroke="#c6bad9" strokeWidth="26" />
          </svg>
          <div className="motion-reel-fallback-boundaries">
            <i />
            <i />
          </div>
        </div>
        <canvas
          className={`motion-reel-canvas${ready && !failure ? ' is-ready' : ''}`}
          ref={canvasRef}
          role="img"
          aria-label="Seven recognizable KAI strokes stretch with layered echoes, then continuously become the boundaries of three working project entries."
          onPointerDown={(event) => {
            if (event.button === 0)
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                time: clock.current,
                armed: false,
              };
          }}
          onPointerMove={dragMove}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        />
        <div className="motion-reel-screen-top">
          <span>KAI / TYPE INTO SYSTEM</span>
          <span>{FILM_CHAPTERS[chapter].name.toUpperCase()}</span>
        </div>
        <div
          className="motion-reel-entry-zones"
          style={{ opacity: entryProgress }}
          aria-hidden={!entriesAvailable}
          inert={!entriesAvailable}
        >
          {FILM_PROJECTS.map((project, index) => (
            <a
              key={project.id}
              href={`#/${project.id}`}
              aria-label={project.label}
              onClick={(event) => openProject(event, project.id)}
              onPointerEnter={() => engine.current?.highlight(project.id)}
              onPointerLeave={() => engine.current?.highlight(null)}
              onFocus={() => engine.current?.highlight(project.id)}
              onBlur={() => engine.current?.highlight(null)}
            >
              <span className="motion-reel-entry-number">0{index + 1}</span>
              <strong>{project.name}</strong>
              <span>{project.detail}</span>
              <ArrowUpRight size={20} />
            </a>
          ))}
        </div>
        <div className="motion-reel-screen-note">
          <span>
            {time < 8
              ? 'Drag sideways to explore the transformation.'
              : 'The letters are now doors. Choose a project.'}
          </span>
          <span>11s / PLAYS ONCE</span>
        </div>
        <div
          className="motion-reel-route-transition"
          data-entering={!!entering}
          aria-hidden={!entering}
        >
          <span>
            {FILM_PROJECTS.find((project) => project.id === entering)?.name}
            <ArrowUpRight size={30} />
          </span>
        </div>
      </div>
      <div className="motion-reel-controls">
        <div className="motion-reel-transport">
          <button
            className="motion-reel-play"
            disabled={!ready || !!failure}
            onClick={() => (playing ? engine.current?.pause() : engine.current?.play())}
            aria-label={
              playing ? 'Pause film' : time >= FILM_DURATION ? 'Replay film' : 'Play film'
            }
          >
            {playing ? (
              <Pause size={17} />
            ) : time >= FILM_DURATION ? (
              <RotateCcw size={17} />
            ) : (
              <Play size={17} />
            )}
            <span>{playing ? 'Pause' : time >= FILM_DURATION ? 'Replay' : 'Play'}</span>
          </button>
          <input
            type="range"
            min="0"
            max={FILM_DURATION}
            step="0.01"
            value={time}
            aria-label="Film playhead"
            aria-valuetext={`${time.toFixed(1)} seconds of ${FILM_DURATION}`}
            disabled={!ready || !!failure}
            onChange={(event) => engine.current?.seek(Number(event.target.value))}
            style={{ '--film-progress': `${(time / FILM_DURATION) * 100}%` } as React.CSSProperties}
          />
          <output className="motion-reel-time">
            {stamp(time)} <span>/ 00:11</span>
          </output>
        </div>
        <nav className="motion-reel-project-nav" aria-label="Open a working project now">
          {FILM_PROJECTS.map((project) => (
            <a
              key={project.id}
              href={`#/${project.id}`}
              aria-label={project.label}
              onClick={(event) => openProject(event, project.id)}
            >
              {project.name}
              <ArrowUpRight size={14} />
            </a>
          ))}
        </nav>
      </div>
      <details className="motion-reel-inspect">
        <summary>
          Inspect & adjust<span>+</span>
        </summary>
        <div className="motion-reel-inspect-content">
          <p>
            Seven original KAI strokes. The same shapes stretch into interface boundaries and lead
            to working projects. The opening plays once; scrubbing is reversible.
          </p>
          <div className="motion-reel-options">
            <div className="motion-reel-chapters" role="group" aria-label="Film chapters">
              {FILM_CHAPTERS.map((shot, index) => (
                <button
                  key={shot.name}
                  aria-pressed={chapter === index}
                  disabled={!ready || !!failure}
                  onClick={() => engine.current?.seek(shot.time, true)}
                >
                  <span>0{index + 1}</span>
                  {shot.name}
                </button>
              ))}
            </div>
            <label className="motion-reel-speed">
              Speed
              <select
                aria-label="Playback speed"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              >
                <option value="0.5">0.5×</option>
                <option value="1">1×</option>
                <option value="1.5">1.5×</option>
              </select>
            </label>
            <div className="motion-reel-palettes" role="group" aria-label="Shape accent palette">
              {Object.entries(FILM_PALETTES).map(([id, entry]) => (
                <button
                  key={id}
                  aria-pressed={palette === id}
                  onClick={() => {
                    setPalette(id as FilmPalette);
                    engine.current?.palette(id as FilmPalette);
                  }}
                >
                  <i style={{ background: entry.color }} />
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
          <dl>
            <div>
              <dt>Conserved strokes</dt>
              <dd>7 → 7</dd>
            </div>
            <div>
              <dt>Playhead</dt>
              <dd>{time.toFixed(2)} s</dd>
            </div>
            <div>
              <dt>Canvas buffer</dt>
              <dd>
                {buffer.width} × {buffer.height}
              </dd>
            </div>
            <div>
              <dt>Pixel ratio</dt>
              <dd>{buffer.dpr}</dd>
            </div>
          </dl>
          <div className="motion-reel-exports">
            <button
              disabled={!ready || !!failure}
              onClick={() => {
                const url = engine.current?.picture();
                if (url) {
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'kai-type-into-system.png';
                  link.click();
                  setNotice('Frame saved as PNG.');
                }
              }}
            >
              Save frame
              <ArrowDownToLine size={14} />
            </button>
            <button
              onClick={() =>
                download(
                  'kai-type-into-system.json',
                  JSON.stringify(
                    filmState(clock.current, paletteRef.current, speedRef.current),
                    null,
                    2,
                  ),
                )
              }
            >
              Save timeline
              <ArrowDownToLine size={14} />
            </button>
            <a
              href="https://github.com/luoy16002-svg/kai-works/blob/main/src/core/motion-film.ts"
              target="_blank"
              rel="noreferrer"
            >
              View source
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </details>
      {(failure || notice) && (
        <p className="motion-reel-notice" role="status">
          {failure || notice}
        </p>
      )}
    </section>
  );
}
