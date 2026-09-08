import { lazy, Suspense, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import KineticArtwork from '../components/KineticArtwork';
import { REPO } from '../ui';
import '../home.css';

const MotionReel = lazy(() => import('../components/MotionReel'));
type Screening = 'motion' | 'ribbon';
const screenings: Screening[] = ['motion', 'ribbon'];
const projects = [
  {
    name: 'Motion',
    detail: '24s / WebGL',
    description: 'A real-time 3D film',
    route: 'motion',
    number: '01',
  },
  { name: 'Halo', detail: '3D', description: 'Product configurator', route: 'halo', number: '02' },
  {
    name: 'Field',
    detail: 'GPU',
    description: 'Generative graphics',
    route: 'field',
    number: '03',
  },
  {
    name: 'Current',
    detail: '100K rows',
    description: '100,000-row CSV workbench',
    route: 'current',
    number: '04',
  },
  {
    name: 'Relay',
    detail: 'Recovery',
    description: 'Durable queue and recovery',
    route: 'relay',
    number: '05',
  },
];

function FilmPlaceholder() {
  return (
    <div className="screening-film-placeholder" aria-busy="true">
      <div className="screening-placeholder-art">
        <svg viewBox="0 0 640 400" fill="none" aria-hidden="true">
          <path d="M218 110 368 70 447 248 297 292Z" fill="#c6bad9" />
          <path d="m297 292 150-44-74 47-150 44Z" fill="#8f7e9f" />
          <path d="m218 110 79 182-74 47-78-182Z" fill="#eeaa82" />
          <path d="m245 114 110-29 68 151-111 33Z" stroke="#251c2d" strokeWidth="2" />
          <circle cx="444" cy="116" r="19" fill="#f7f2e8" />
          <path d="M140 365H504" stroke="#65546b" />
        </svg>
      </div>
      <div className="screening-placeholder-caption">
        <span role="status">Preparing the scene…</span>
        <span>24 SECONDS / REAL-TIME 3D</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [screening, setScreening] = useState<Screening>('motion');
  const [ribbonOpened, setRibbonOpened] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (value: Screening) => {
    if (value === 'ribbon') setRibbonOpened(true);
    setScreening(value);
  };
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
        <section className="screening-theater" aria-label="Interactive work screening room">
          <header className="screening-stage-head">
            <div className="screening-now">
              <span>NOW SHOWING</span>
              <h1>{screening === 'motion' ? 'Motion film' : 'Ribbon study'}</h1>
            </div>
            <div className="screening-tabs" role="tablist" aria-label="Choose a study">
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
                  {value === 'motion' ? 'Motion film' : 'Ribbon study'}
                </button>
              ))}
            </div>
          </header>
          <div
            className="screening-panel"
            id="screening-panel-motion"
            role="tabpanel"
            aria-labelledby="screening-tab-motion"
            hidden={screening !== 'motion'}
            tabIndex={0}
          >
            <Suspense fallback={<FilmPlaceholder />}>
              <MotionReel embedded />
            </Suspense>
          </div>
          <div
            className="screening-panel screening-ribbon-panel"
            id="screening-panel-ribbon"
            role="tabpanel"
            aria-labelledby="screening-tab-ribbon"
            hidden={screening !== 'ribbon'}
            tabIndex={0}
          >
            {ribbonOpened && <KineticArtwork />}
          </div>
          <div className="screening-stage-note">
            <span>
              {screening === 'motion'
                ? 'Rendered live. Use the player to explore the sequence.'
                : 'An original procedural form. Move your pointer to shift the view.'}
            </span>
            <span>INDEPENDENT STUDY</span>
          </div>
        </section>

        <aside className="screening-index" aria-labelledby="project-index-title">
          <div className="screening-index-heading">
            <h2 id="project-index-title">Project index</h2>
            <span>05</span>
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
