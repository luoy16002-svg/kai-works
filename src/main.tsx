import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './styles.css';
import './folio.css';
const Halo = lazy(() => import('./pages/Halo'));
const Current = lazy(() => import('./pages/Current'));
const Relay = lazy(() => import('./pages/Relay'));
const Evidence = lazy(() => import('./pages/Evidence'));
const Home = lazy(() => import('./pages/Home'));
const Field = lazy(() => import('./pages/Field'));
const Motion = lazy(() => import('./pages/Motion'));
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
          '#/': 'Kai — Work screening room',
          '#/motion': 'Motion — A real-time 3D film',
          '#/halo': 'HALO — Product configurator',
          '#/field': 'FIELD — Reaction diffusion studio',
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
        {route === '#/motion' ? (
          <Motion />
        ) : route === '#/field' ? (
          <Field />
        ) : route === '#/halo' ? (
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
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <React.StrictMode>
    <WorkspaceBoundary>
      <App />
    </WorkspaceBoundary>
  </React.StrictMode>,
);
