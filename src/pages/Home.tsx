import {
  Fragment,
  lazy,
  Suspense,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ArrowUpRight } from 'lucide-react';
import KineticArtwork from '../components/KineticArtwork';
import KaiLogo from '../components/KaiLogo';
import { REPO } from '../ui';
import '../home.css';

const MotionReel = lazy(() => import('../components/MotionReel'));
const InfiniteField = lazy(() => import('../components/InfiniteField'));
const PixelCourier = lazy(() => import('../components/PixelCourier'));
const AgentTheater = lazy(() => import('../components/AgentTheater'));
type Screening = 'motion' | 'pixel' | 'agents' | 'infinite' | 'ribbon';
const screenings: Screening[] = ['motion', 'pixel', 'agents', 'infinite', 'ribbon'];
const screeningCopy: Record<
  Screening,
  { label: string; title: string; note: string; kind: string }
> = {
  motion: {
    label: 'Type',
    title: 'Type into system',
    note: 'Seven flat strokes become boundaries. The boundaries open real work.',
    kind: 'INDEPENDENT IDENTITY STUDY',
  },
  pixel: {
    label: 'Pixel',
    title: 'Little deliveries',
    note: 'Watch the courier’s route, or take control to run and jump.',
    kind: 'PLAYABLE PIXEL STUDY',
  },
  agents: {
    label: 'Agents',
    title: 'An agent at work',
    note: 'Recorded agent actions replay through the order environment.',
    kind: 'RECORDED REPLAY',
  },
  infinite: {
    label: 'Infinite',
    title: 'Infinite field',
    note: 'Seven evolving Lorenz trajectories. Explore the controls.',
    kind: 'INDEPENDENT FORM STUDY',
  },
  ribbon: {
    label: 'Ribbon',
    title: 'Ribbon study',
    note: 'An original procedural form. Move your pointer to shift the view.',
    kind: 'INDEPENDENT FORM STUDY',
  },
};
const projects = [
  {
    name: 'Pixel',
    detail: 'Little deliveries',
    description: 'A small pixel courier game',
    route: 'pixel',
    number: '01',
  },
  {
    name: 'Proof',
    detail: 'Agent trials',
    description: 'Agent tool-use reliability trials',
    route: 'proof',
    number: '02',
  },
  {
    name: 'Type',
    detail: '11s / Canvas2D',
    description: 'Flat letter and logo motion, an independent identity study',
    route: 'motion',
    number: '03',
  },
  {
    name: 'Infinite',
    detail: 'Lorenz traces',
    description: 'Seven evolving Lorenz trajectories',
    route: 'infinite',
    number: '04',
  },
  { name: 'Halo', detail: '3D', description: 'Product configurator', route: 'halo', number: '05' },
  {
    name: 'Field',
    detail: 'GPU study',
    description: 'Generative graphics',
    route: 'field',
    number: '06',
  },
  {
    name: 'Current',
    detail: 'CSV data',
    description: '100,000-row CSV workbench',
    route: 'current',
    number: '07',
  },
  {
    name: 'Relay',
    detail: 'Queue recovery',
    description: 'Durable queue and recovery',
    route: 'relay',
    number: '08',
  },
];
const projectGroups = [
  { label: 'Product interfaces', routes: ['current', 'halo'] },
  { label: 'Interactive graphics', routes: ['motion', 'field', 'infinite'] },
  { label: 'Systems & play', routes: ['relay', 'proof', 'pixel'] },
];

function FilmPlaceholder() {
  return (
    <div className="screening-film-placeholder" aria-busy="true">
      <div className="screening-placeholder-art">
        <KaiLogo className="screening-placeholder-wordmark" colored />
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
  const [opened, setOpened] = useState<Set<Screening>>(() => new Set<Screening>(['motion']));
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const theaterRef = useRef<HTMLElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Record<Screening, HTMLDivElement | null>>({
    motion: null,
    pixel: null,
    agents: null,
    infinite: null,
    ribbon: null,
  });
  const screeningRef = useRef(screening);
  const syncFrameRef = useRef<(() => void) | null>(null);
  screeningRef.current = screening;
  const select = (value: Screening) => {
    setOpened((previous) => (previous.has(value) ? previous : new Set([...previous, value])));
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
      { panel: panelRefs.current.pixel!, prefix: 'pixel-courier' },
      { panel: panelRefs.current.agents!, prefix: 'agent-theater' },
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
        for (const part of parts)
          if (!watched.has(part)) {
            watched.add(part);
            resize.observe(part);
          }
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
          <KaiLogo animated />
        </a>
        <p className="screening-role">Independent creative developer</p>
        <span className="screening-location">CHINA / UTC+8</span>
        <a className="screening-contact" href="#/profile">
          Profile & resume <ArrowUpRight size={15} />
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
              <h1>{screeningCopy[screening].title}</h1>
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
                  {screeningCopy[value].label}
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
            {(['pixel', 'agents'] as const).map((value) => (
              <div
                key={value}
                className="screening-panel"
                id={`screening-panel-${value}`}
                role="tabpanel"
                aria-labelledby={`screening-tab-${value}`}
                aria-hidden={screening !== value}
                inert={screening !== value}
                data-active={screening === value}
                ref={(element) => {
                  panelRefs.current[value] = element;
                }}
                tabIndex={screening === value ? 0 : -1}
              >
                {opened.has(value) && (
                  <Suspense
                    fallback={
                      <div
                        className={`screening-lab-placeholder screening-${value}-placeholder`}
                        role="status"
                      >
                        {value === 'pixel'
                          ? 'Opening Little deliveries…'
                          : 'Preparing the recorded agent replay…'}
                      </div>
                    }
                  >
                    {value === 'pixel' ? (
                      <PixelCourier embedded active={screening === value} />
                    ) : (
                      <AgentTheater embedded active={screening === value} />
                    )}
                  </Suspense>
                )}
              </div>
            ))}
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
              {opened.has('infinite') && (
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
            <span>{screeningCopy[screening].note}</span>
            <span>{screeningCopy[screening].kind}</span>
          </div>
        </section>

        <aside className="screening-index" aria-labelledby="project-index-title">
          <div className="screening-index-heading">
            <h2 id="project-index-title">Project index</h2>
            <span>08</span>
          </div>
          <nav aria-label="Working projects">
            {projectGroups.map((group) => (
              <Fragment key={group.label}>
                <p className="screening-project-group">{group.label}</p>
                {group.routes
                  .map((route) => projects.find((project) => project.route === route)!)
                  .map((project) => (
                    <a
                      key={project.route}
                      href={`#/${project.route}`}
                      aria-label={`Open ${project.name}: ${project.description}`}
                    >
                      <span className="screening-project-number">{project.number}</span>
                      <span className="screening-project-name">{project.name}</span>
                      <span className="screening-project-meta">{project.detail}</span>
                      <ArrowUpRight size={16} />
                    </a>
                  ))}
              </Fragment>
            ))}
          </nav>
          <a className="screening-model-link" href="#/halo/models">
            New in HALO: open your own 3D model <ArrowUpRight size={14} />
          </a>
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
          <a className="screening-profile-card" href="#/profile">
            <span>HAVE A PROJECT IN MIND?</span>
            <strong>
              Find the relevant work <ArrowUpRight size={16} />
            </strong>
            <p>
              Product interfaces, interactive graphics and browser tools. Selected work & one-page
              resumes.
            </p>
          </a>
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
