import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './styles.css';
import './folio.css';
import './route-motion.css';
// A resolved route renders synchronously inside the view-transition snapshot.
function routeView<P extends object = Record<string, never>>(
  loader: () => Promise<{ default: React.ComponentType<P> }>,
) {
  let resolved: React.ComponentType<P> | undefined;
  let pending: Promise<{ default: React.ComponentType<P> }> | undefined;
  const preload = () =>
    (pending ??= loader().then((module) => {
      resolved = module.default;
      return module;
    }));
  const Deferred = lazy(preload);
  function View(props: P) {
    const Component = resolved ?? Deferred;
    return React.createElement(Component, props);
  }
  return Object.assign(View, { preload });
}
const Halo = routeView(() => import('./pages/Halo'));
const ModelViewer = routeView(() => import('./pages/ModelViewer'));
const Current = routeView(() => import('./pages/Current'));
const Gather = routeView(() => import('./pages/Gather'));
const Relay = routeView(() => import('./pages/Relay'));
const Evidence = routeView(() => import('./pages/Evidence'));
const Home = routeView(() => import('./pages/Home'));
const Field = routeView(() => import('./pages/Field'));
const Motion = routeView(() => import('./pages/Motion'));
const Infinite = routeView(() => import('./pages/Infinite'));
const Proof = routeView(() => import('./pages/Proof'));
const Pixel = routeView(() => import('./pages/Pixel'));
const Profile = routeView(() => import('./pages/About'));
const CaseStudy = routeView(() => import('./pages/ProjectCase'));
const routes = {
  '#/': Home,
  '#/halo': Halo,
  '#/halo/models': ModelViewer,
  '#/current': Current,
  '#/gather': Gather,
  '#/relay': Relay,
  '#/evidence': Evidence,
  '#/field': Field,
  '#/motion': Motion,
  '#/infinite': Infinite,
  '#/proof': Proof,
  '#/pixel': Pixel,
};
function preloadRoute(route: string) {
  return (
    route.startsWith('#/profile')
      ? Profile
      : route.startsWith('#/case/')
        ? CaseStudy
        : (routes[route as keyof typeof routes] ?? Home)
  ).preload();
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
    let sequence = 0;
    let transition: ViewTransition | undefined;
    const change = async () => {
      const ticket = ++sequence;
      const next = location.hash.split('?')[0] || '#/';
      transition?.skipTransition();
      try {
        await preloadRoute(next);
      } catch {
        /* The route boundary displays load failures. */
      }
      if (ticket !== sequence) return;
      const update = () => {
        if (ticket !== sequence) return;
        flushSync(() => setRoute(next));
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
      };
      if (
        document.startViewTransition &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches &&
        !document.hidden
      ) {
        transition = document.startViewTransition(update);
        void transition.finished.catch(() => {});
      } else update();
    };
    const prepare = (event: Event) => {
      const link = (event.target as Element)?.closest?.('a[href^="#/"]');
      const target = link?.getAttribute('href')?.split('?')[0];
      if (target) void preloadRoute(target).catch(() => {});
    };
    window.addEventListener('hashchange', change);
    document.addEventListener('pointerover', prepare, { passive: true });
    document.addEventListener('focusin', prepare);
    return () => {
      sequence++;
      transition?.skipTransition();
      window.removeEventListener('hashchange', change);
      document.removeEventListener('pointerover', prepare);
      document.removeEventListener('focusin', prepare);
    };
  }, []);
  useEffect(() => {
    document.title =
      (
        {
          '#/': 'Kai Chen — Independent software projects',
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
          '#/case/halo': 'HALO — GLB model viewer case study | Kai Chen',
          '#/case/field': 'Field — GPU simulation case study | Kai',
          '#/case/invoice-gate': 'Invoice Gate — Python validation pipeline | Kai Chen',
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
