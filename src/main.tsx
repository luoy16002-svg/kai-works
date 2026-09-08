import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight,
  ArrowRight,
  Code2 as Github,
  Mail,
  Waves,
  Check,
  Box,
  Activity,
  Layers3,
  ArrowLeft,
} from 'lucide-react';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './styles.css';
const Halo = lazy(() => import('./pages/Halo'));
const Current = lazy(() => import('./pages/Current'));
const Relay = lazy(() => import('./pages/Relay'));
const Evidence = lazy(() => import('./pages/Evidence'));
import { REPO } from './ui';
function Home() {
  return (
    <div className="home">
      <header className="home-nav">
        <a href="#/" className="kai-logo">
          kai
        </a>
        <span className="nav-intro">
          Independent developer
          <br />
          <b>China · UTC+8</b>
        </span>
        <nav aria-label="Main navigation">
          <a href="#/evidence">Engineering notes</a>
          <a href="mailto:fuddleyu@gmail.com">
            Get in touch <ArrowUpRight size={16} />
          </a>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="home-hero">
          <div className="eyebrow">
            <span className="status-dot" /> Open to focused project work
          </div>
          <h1>
            Considered interfaces.
            <br />
            <em>Dependable code.</em>
          </h1>
          <div className="hero-bottom">
            <p>
              I’m Kai. I build interactive products and tools that make complicated work feel
              straightforward.
            </p>
            <span className="mono">
              SELECTED WORK / 2026
              <br />
              03 WORKING EXPLORATIONS
            </span>
          </div>
        </section>
        <section className="work-grid" aria-label="Selected projects">
          <a className="project-card halo-card" href="#/halo">
            <div className="card-media">
              <img
                src={`${import.meta.env.BASE_URL}assets/halo-editorial.png`}
                alt="Champagne ring pendant in a limestone interior"
              />
              <span className="project-number">01 / INTERACTIVE 3D</span>
              <span className="card-open">
                <ArrowUpRight />
              </span>
              <div className="halo-wordmark">
                HALO<span>A study in light.</span>
              </div>
            </div>
            <div className="card-description">
              <div>
                <h2>Light, made personal.</h2>
                <p>A real-time product configurator.</p>
              </div>
              <span>WebGL / Three.js</span>
            </div>
          </a>
          <a className="project-card current-card" href="#/current">
            <div className="card-media">
              <span className="project-number">02 / DATA TOOLING</span>
              <span className="card-open">
                <ArrowUpRight />
              </span>
              <div className="current-mini">
                <Waves size={31} />
                <strong>Current</strong>
                <span>Data, within reach.</span>
                <div className="mini-chart">
                  <svg viewBox="0 0 340 96" aria-hidden="true">
                    <path d="M0 77L12 69L21 74L32 58L45 62L55 40L65 43L79 38L92 49L102 35L114 43L129 28L144 34L157 21L169 39L182 19L193 24L206 9L219 27L229 20L241 34L252 13L264 26L278 20L290 31L306 10L322 22L340 6" />
                  </svg>
                  <div>
                    <span>01 Jan</span>
                    <span>30 Jun</span>
                  </div>
                </div>
                <div className="mini-table">
                  LOCAL CSV WORKSPACE <span>↗</span>
                </div>
              </div>
            </div>
            <div className="card-description">
              <div>
                <h2>A little clarity.</h2>
                <p>Explore 100,000 rows in your browser.</p>
              </div>
              <span>Workers / TypeScript</span>
            </div>
          </a>
          <a className="project-card relay-card" href="#/relay">
            <div className="card-media">
              <span className="project-number">03 / SYSTEMS ENGINEERING</span>
              <span className="card-open">
                <ArrowUpRight />
              </span>
              <div className="relay-mini">
                <div className="relay-brand">
                  <span />
                  RELAY
                </div>
                <p>
                  Work that survives
                  <br />a restart.
                </p>
                <div className="mini-pipeline">
                  <span>
                    <Layers3 />
                  </span>
                  <i />
                  <span>
                    <Activity />
                  </span>
                  <i />
                  <span>
                    <Check />
                  </span>
                </div>
                <div className="mono">PERSIST. RECOVER. COMMIT.</div>
              </div>
            </div>
            <div className="card-description">
              <div>
                <h2>Resilience, on display.</h2>
                <p>Interrupt the worker. Inspect the recovery.</p>
              </div>
              <span>IndexedDB / Concurrency</span>
            </div>
          </a>
        </section>
        <section className="home-proof">
          <div>
            <span className="eyebrow">THE WORK BEHIND THE WORK</span>
            <h2>
              Go ahead.
              <br />
              <em>Try to break it.</em>
            </h2>
          </div>
          <div>
            <p>
              Malformed CSV, a stale worker, an interrupted write. The interesting part starts where
              the happy path ends.
            </p>
            <a className="text-cta" href="#/evidence">
              Inspect the tests <ArrowRight size={18} />
            </a>
            <div className="proof-tags">
              <span>
                <Box size={14} /> Open source
              </span>
              <span>
                <Check size={14} /> Reproducible tests
              </span>
            </div>
          </div>
        </section>
        <section className="contact-row">
          <p>Something worth building?</p>
          <a href="mailto:fuddleyu@gmail.com">
            Let’s talk <ArrowUpRight />
          </a>
        </section>
      </main>
      <footer className="home-footer">
        <span>© 2026 Kai · Independent portfolio projects</span>
        <div>
          <a href={REPO} target="_blank" rel="noreferrer">
            <Github size={15} /> GitHub
          </a>
          <a href="mailto:fuddleyu@gmail.com">
            <Mail size={15} /> Email
          </a>
          <span>Async collaboration, by email or chat.</span>
        </div>
      </footer>
    </div>
  );
}
class WorkspaceBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="loading-screen">
        <h1>This workspace couldn’t open.</h1>
        <p>Reload the page to start a fresh session.</p>
        <button onClick={() => location.reload()}>Reload workspace</button>
        <a href={import.meta.env.BASE_URL}>Back to selected work</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const [route, setRoute] = useState(location.hash.split('?')[0] || '#/');
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.split('?')[0] || '#/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.title =
      (
        {
          '#/': 'Kai — Selected work',
          '#/halo': 'HALO — A study in light',
          '#/current': 'Current — Local data workbench',
          '#/relay': 'Relay — Durable queue lab',
          '#/evidence': 'Engineering evidence — Kai',
        } as Record<string, string>
      )[route] ?? 'Kai — Selected work';
  }, [route]);
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.querySelector<HTMLElement>('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <Suspense
        fallback={
          <div className="loading-screen">
            <span className="kai-logo">kai</span>
            <p>Opening workspace…</p>
          </div>
        }
      >
        {route === '#/halo' ? (
          <Halo />
        ) : route === '#/current' ? (
          <Current />
        ) : route === '#/relay' ? (
          <Relay />
        ) : route === '#/evidence' ? (
          <Evidence />
        ) : (
          <Home />
        )}
      </Suspense>
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WorkspaceBoundary>
      <App />
    </WorkspaceBoundary>
  </React.StrictMode>,
);
