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
const ModelViewer = lazy(() => import('./pages/ModelViewer'));
const Current = lazy(() => import('./pages/Current'));
const Gather = lazy(() => import('./pages/Gather'));
const Relay = lazy(() => import('./pages/Relay'));
const Evidence = lazy(() => import('./pages/Evidence'));
const Home = lazy(() => import('./pages/Home'));
const Field = lazy(() => import('./pages/Field'));
const Motion = lazy(() => import('./pages/Motion'));
const Infinite = lazy(() => import('./pages/Infinite'));
const Proof = lazy(() => import('./pages/Proof'));
const Pixel = lazy(() => import('./pages/Pixel'));
const Profile = lazy(() => import('./pages/Profile'));
const CaseStudy = lazy(() =>
  import('./pages/Profile').then((module) => ({ default: module.CaseStudy })),
);
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
          '#/motion': 'Kai — Type into system',
          '#/infinite': 'Kai — Infinite field',
          '#/proof': 'Proof — Agent reliability lab',
          '#/pixel': 'Pixel — Little deliveries',
          '#/halo': 'HALO — Product configurator',
          '#/halo/models': 'HALO — Model workspace',
          '#/field': 'FIELD — Reaction diffusion studio',
          '#/current': 'Current — Local data workbench',
          '#/gather': 'Gather — Studio booking experience',
          '#/relay': 'Relay — Durable queue lab',
          '#/evidence': 'Engineering evidence — Kai',
          '#/profile': 'Kai — Frontend developer | Profile & resume',
          '#/profile/frontend': 'Kai — Frontend developer | Profile & resume',
          '#/profile/creative': 'Kai — Creative developer | Profile & resume',
          '#/profile/writing': 'Kai — Developer & technical writer | Profile & resume',
          '#/case/current': 'Current — CSV workspace case study | Kai',
          '#/case/gather': 'Gather — Booking experience case study | Kai',
          '#/case/relay': 'Relay — Queue recovery case study | Kai',
          '#/case/halo': 'HALO — Product configurator case study | Kai',
          '#/case/field': 'Field — GPU simulation case study | Kai',
          '#/case/invoice-gate': 'Invoice Gate — Python writing sample | Kai',
          '#/case/proof': 'PROOF — Agent evaluation case study | Kai',
        } as Record<string, string>
      )[route] ??
      (route.startsWith('#/profile')
        ? 'Kai — Profile & selected work'
        : route.startsWith('#/case/')
          ? 'Kai — Project decisions & evidence'
          : 'Kai — Selected work');
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
        {route === '#/profile' || route.startsWith('#/profile/') ? (
          <Profile focus={route.split('/')[2]} />
        ) : route.startsWith('#/case/') ? (
          <CaseStudy id={route.split('/')[2]} />
        ) : route === '#/pixel' ? (
          <Pixel />
        ) : route === '#/proof' ? (
          <Proof />
        ) : route === '#/infinite' ? (
          <Infinite />
        ) : route === '#/motion' ? (
          <Motion />
        ) : route === '#/field' ? (
          <Field />
        ) : route === '#/halo/models' ? (
          <ModelViewer />
        ) : route === '#/halo' ? (
          <Halo />
        ) : route === '#/gather' ? (
          <Gather />
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
