import { lazy, Suspense, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import KineticArtwork from '../components/KineticArtwork';
import { REPO } from '../ui';
import '../home.css';

const MotionReel = lazy(() => import('../components/MotionReel'));
const InfiniteField = lazy(() => import('../components/InfiniteField'));
type Screening = 'motion' | 'infinite' | 'ribbon';
const screenings: Screening[] = ['motion', 'infinite', 'ribbon'];
const projects = [
  {
    name: 'Type',
    detail: '11s / Canvas2D',
    description: 'Flat letter and logo motion, an independent identity study',
    route: 'motion',
    number: '01',
  },
  {
    name: 'Infinite',
    detail: 'Lorenz traces',
    description: 'Seven evolving Lorenz trajectories',
    route: 'infinite',
    number: '02',
  },
  { name: 'Halo', detail: '3D', description: 'Product configurator', route: 'halo', number: '03' },
  {
    name: 'Field',
    detail: 'GPU study',
    description: 'Generative graphics',
    route: 'field',
    number: '04',
  },
  {
    name: 'Current',
    detail: 'CSV data',
    description: '100,000-row CSV workbench',
    route: 'current',
    number: '05',
  },
  {
    name: 'Relay',
    detail: 'Queue recovery',
    description: 'Durable queue and recovery',
    route: 'relay',
    number: '06',
  },
];

function FilmPlaceholder() {
  return (
    <div className="screening-film-placeholder" aria-busy="true">
      <div className="screening-placeholder-art">
        <svg viewBox="0 0 640 400" fill="none" aria-hidden="true">
          <path d="M160 124V276M247 124 167 201l85 75" stroke="#eeaa82" strokeWidth="26" />
          <path d="m283 276 55-152 55 152m-91-49h72" stroke="#f7f2e8" strokeWidth="26" />
          <path d="M447 124V276" stroke="#c6bad9" strokeWidth="26" />
          <path d="M147 320H465" stroke="#65546b" />
        </svg>
      </div>
      <div className="screening-placeholder-caption">
        <span role="status">Preparing the identity study…</span>
        <span>11 SECONDS / TYPE INTO SYSTEM</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [screening, setScreening] = useState<Screening>('motion');
  const [infiniteOpened, setInfiniteOpened] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const theaterRef = useRef<HTMLElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Record<Screening, HTMLDivElement | null>>({
    motion: null,
    infinite: null,
    ribbon: null,
  });
  const screeningRef = useRef(screening);
  const syncFrameRef = useRef<(() => void) | null>(null);
  screeningRef.current = screening;
  const select = (value: Screening) => {
    if (value === 'infinite') setInfiniteOpened(true);
    if (panelRefs.current[screening]?.contains(document.activeElement)) {
      tabs.current[screenings.indexOf(value)]?.focus({ preventScroll: true });
    }
    setScreening(value);
  };

  useLayoutEffect(() => {
    const theater = theaterRef.current!,
      panels = panelsRef.current!;
    const surfaces = [
      { panel: panelRefs.current.motion!, prefix: 'motion-reel' },
      { panel: panelRefs.current.infinite!, prefix: 'infinite-field' },
    ];
    const watched = new Set<Element>();
    const arrivals: MutationObserver[] = [];
    const measure = () => {
      let height = 0;
      for (const { panel, prefix } of surfaces) {
        const controls = panel.querySelector<HTMLElement>(`.${prefix}-controls`);
        const summary = panel.querySelector<HTMLElement>(`.${prefix}-inspect > summary`);
        if (controls)
          height = Math.max(height, controls.offsetHeight + (summary?.offsetHeight ?? 0) + 2);
      }
      if (height > 0) theater.style.setProperty('--screening-controls-height', `${height}px`);
      const panel = panelRefs.current[screeningRef.current];
      if (panel) panels.style.height = `${panel.offsetHeight}px`;
    };
    const resize = new ResizeObserver(measure);
    for (const panel of Object.values(panelRefs.current)) if (panel) resize.observe(panel);
    for (const { panel, prefix } of surfaces) {
      const connect = () => {
        const parts = panel.querySelectorAll(
          `.${prefix}-controls, .${prefix}-screen, .${prefix}-inspect > summary`,
        );
        if (parts.length < 3) return;
        for (const part of parts)
          if (!watched.has(part)) {
            watched.add(part);
            resize.observe(part);
          }
        arrival.disconnect();
        measure();
      };
      const arrival = new MutationObserver(connect);
      arrivals.push(arrival);
      arrival.observe(panel, { childList: true, subtree: true });
      connect();
    }
    syncFrameRef.current = measure;
    measure();
    return () => {
      syncFrameRef.current = null;
      resize.disconnect();
      for (const arrival of arrivals) arrival.disconnect();
    };
  }, []);
  useLayoutEffect(() => {
    syncFrameRef.current?.();
  }, [screening]);
  const switchWithKeys = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % screenings.length;
    else if (event.key === 'ArrowLeft') next = (index + screenings.length - 1) % screenings.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = screenings.length - 1;
    else return;
    event.preventDefault();
    select(screenings[next]);
    tabs.current[next]?.focus();
  };

  return (
    <div className="screening-home">
      <header className="screening-nav">
        <a className="screening-brand" href="#/" aria-label="Kai, selected work">
          KAI<span>↗</span>
        </a>
        <p className="screening-role">Independent creative developer</p>
        <span className="screening-location">CHINA / UTC+8</span>
        <a className="screening-contact" href="mailto:fuddleyu@gmail.com">
          Let’s talk <ArrowUpRight size={15} />
        </a>
      </header>
      <main id="main-content" tabIndex={-1} className="screening-workspace">
        <section
          className="screening-theater"
          ref={theaterRef}
          aria-label="Interactive work screening room"
        >
          <header className="screening-stage-head">
            <div className="screening-now">
              <span>NOW SHOWING</span>
              <h1>
                {screening === 'motion'
                  ? 'Type into system'
                  : screening === 'infinite'
                    ? 'Infinite field'
                    : 'Ribbon study'}
              </h1>
            </div>
            <div
              className="screening-tabs"
              data-screening={screening}
              role="tablist"
              aria-label="Choose a study"
            >
              {screenings.map((value, index) => (
                <button
                  key={value}
                  id={`screening-tab-${value}`}
                  role="tab"
                  type="button"
                  aria-selected={screening === value}
                  aria-controls={`screening-panel-${value}`}
                  tabIndex={screening === value ? 0 : -1}
                  ref={(element) => {
                    tabs.current[index] = element;
                  }}
                  onClick={() => select(value)}
                  onKeyDown={(event) => switchWithKeys(event, index)}
                >
                  {value === 'motion' ? 'Type' : value === 'infinite' ? 'Infinite' : 'Ribbon'}
                </button>
              ))}
            </div>
          </header>
          <div className="screening-panels" ref={panelsRef}>
            <div
              className="screening-panel"
              id="screening-panel-motion"
              role="tabpanel"
              aria-labelledby="screening-tab-motion"
              aria-hidden={screening !== 'motion'}
              inert={screening !== 'motion'}
              data-active={screening === 'motion'}
              ref={(element) => {
                panelRefs.current.motion = element;
              }}
              tabIndex={screening === 'motion' ? 0 : -1}
            >
              <Suspense fallback={<FilmPlaceholder />}>
                <MotionReel embedded active={screening === 'motion'} />
              </Suspense>
            </div>
            <div
              className="screening-panel"
              id="screening-panel-infinite"
              role="tabpanel"
              aria-labelledby="screening-tab-infinite"
              aria-hidden={screening !== 'infinite'}
              inert={screening !== 'infinite'}
              data-active={screening === 'infinite'}
              ref={(element) => {
                panelRefs.current.infinite = element;
              }}
              tabIndex={screening === 'infinite' ? 0 : -1}
            >
              {infiniteOpened && (
                <Suspense
                  fallback={
                    <div className="screening-lab-placeholder" role="status">
                      Opening Infinite field…
                    </div>
                  }
                >
                  <InfiniteField embedded active={screening === 'infinite'} />
                </Suspense>
              )}
            </div>
            <div
              className="screening-panel screening-ribbon-panel"
              id="screening-panel-ribbon"
              role="tabpanel"
              aria-labelledby="screening-tab-ribbon"
              aria-hidden={screening !== 'ribbon'}
              inert={screening !== 'ribbon'}
              data-active={screening === 'ribbon'}
              ref={(element) => {
                panelRefs.current.ribbon = element;
              }}
              tabIndex={screening === 'ribbon' ? 0 : -1}
            >
              <KineticArtwork active={screening === 'ribbon'} />
            </div>
          </div>
          <div className="screening-stage-note">
            <span>
              {screening === 'motion'
                ? 'Letters become boundaries. The boundaries open real work.'
                : screening === 'infinite'
                  ? 'Seven evolving Lorenz trajectories. Explore the controls.'
                  : 'An original procedural form. Move your pointer to shift the view.'}
            </span>
            <span>
              {screening === 'motion' ? 'INDEPENDENT IDENTITY STUDY' : 'INDEPENDENT FORM STUDY'}
            </span>
          </div>
        </section>

        <aside className="screening-index" aria-labelledby="project-index-title">
          <div className="screening-index-heading">
            <h2 id="project-index-title">Project index</h2>
            <span>06</span>
          </div>
          <nav aria-label="Working projects">
            {projects.map((project) => (
              <a
                key={project.route}
                href={`#/${project.route}`}
                aria-label={`Open ${project.name}: ${project.description}`}
                className={project.route === 'motion' ? 'screening-featured-project' : undefined}
              >
                <span className="screening-project-number">{project.number}</span>
                <span className="screening-project-name">{project.name}</span>
                <span className="screening-project-meta">{project.detail}</span>
                <ArrowUpRight size={16} />
              </a>
            ))}
          </nav>
          <div className="screening-source-links">
            <a href={REPO} target="_blank" rel="noreferrer">
              Source code <ArrowUpRight size={14} />
            </a>
            <a href="#/evidence">
              Test records <ArrowUpRight size={14} />
            </a>
          </div>
          <p className="screening-disclosure">
            Independent projects, built to explore. Each link opens the working demo.
          </p>
        </aside>
      </main>
      <footer className="screening-footer">
        <span>KAI / 2026</span>
        <span>Frontend · Interactive graphics · Browser tools</span>
        <a href="mailto:fuddleyu@gmail.com">
          fuddleyu@gmail.com <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
