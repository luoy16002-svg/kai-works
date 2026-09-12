import { lazy, Suspense, useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  PanelTop,
  Grid2X2,
  UserRound,
  FileText,
  Mail,
  Code2,
  Maximize2,
  Waves,
  Box,
  FileCheck2,
} from 'lucide-react';
import CurrentPreview from '../components/CurrentPreview';
import PreviewTabs from '../components/PreviewTabs';
import InvoiceWorkspacePreview from '../components/InvoiceWorkspacePreview';
import { selectedWork, email, source } from '../content/work';
import '../work-index.css';
const ObjectPreview = lazy(() => import('../components/ObjectPreview'));
const icons = [Waves, Box, FileCheck2];
export default function Home() {
  const [focus, setFocus] = useState(-1);
  const [mobile, setMobile] = useState(0);
  useEffect(() => {
    const narrow = matchMedia('(max-width:960px)');
    const reset = () => {
      if (narrow.matches) setFocus(-1);
    };
    narrow.addEventListener('change', reset);
    reset();
    return () => narrow.removeEventListener('change', reset);
  }, []);
  return (
    <div className="work-index">
      <aside className="index-nav">
        <a href="#/" className="index-name" aria-label="Kai Chen, selected work">
          <span className="index-k" aria-hidden="true">
            K
          </span>
          <span>KAI CHEN</span>
        </a>
        <nav aria-label="Portfolio">
          <a href="#/" aria-current="page">
            <Grid2X2 size={15} />
            Work
          </a>
          <a href="#/profile">
            <UserRound size={15} />
            About
          </a>
          <a href="#/case/current">
            <FileText size={15} />
            Build notes
          </a>
        </nav>
        <div className="index-nav-bottom">
          <a href={source} target="_blank" rel="noreferrer">
            <Code2 size={15} />
            Source
            <ArrowUpRight size={12} />
          </a>
          <a href={`mailto:${email}`}>
            <Mail size={15} />
            Get in touch
          </a>
          <span>
            Independent developer
            <br />
            China · UTC+8
          </span>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="index-main">
        <header className="index-heading">
          <h1>
            Selected work <span>2026</span>
          </h1>
          <p>Useful software. Considered in every detail.</p>
          <div className="index-view-controls" aria-label="Display mode">
            <button
              aria-pressed={focus === -1}
              onClick={() => setFocus(-1)}
              aria-label="Show all projects"
            >
              <Grid2X2 size={15} />
            </button>
            <button
              aria-pressed={focus !== -1}
              onClick={() => setFocus(focus === -1 ? 0 : -1)}
              aria-label="Focus on one project"
            >
              <PanelTop size={16} />
            </button>
          </div>
        </header>
        <PreviewTabs
          className="index-mobile-tabs"
          label="Choose a project"
          items={selectedWork.map((work) => work.name)}
          selected={mobile}
          onChange={setMobile}
        />
        <section
          className="index-projects"
          aria-label="Interactive project index"
          data-focus={focus}
          data-mobile={mobile}
        >
          {selectedWork.map((work, i) => {
            const Icon = icons[i];
            return (
              <article
                key={work.id}
                className={`index-project index-project-${work.id}`}
                data-active={focus === i}
                data-mobile-active={mobile === i}
                style={{ '--panel-order': i } as React.CSSProperties}
              >
                <header>
                  <span className="index-project-icon">
                    <Icon size={19} />
                  </span>
                  <h2>{work.name}</h2>
                  <span className="index-project-type">
                    {i === 0 ? 'Data' : i === 1 ? '3D' : 'Python'}
                  </span>
                  <button
                    onClick={() => setFocus(focus === i ? -1 : i)}
                    aria-label={focus === i ? `Show all projects` : `Focus ${work.name}`}
                  >
                    <Maximize2 size={14} />
                  </button>
                </header>
                <div className="index-preview" inert={focus !== -1 && focus !== i}>
                  {i === 0 ? (
                    <CurrentPreview />
                  ) : i === 1 ? (
                    <Suspense fallback={<div className="object-loading">Loading model…</div>}>
                      <ObjectPreview />
                    </Suspense>
                  ) : (
                    <InvoiceWorkspacePreview />
                  )}
                </div>
                <div className="index-project-bottom" inert={focus !== -1 && focus !== i}>
                  <p>
                    {i === 0
                      ? 'Your data, kept on your device.'
                      : i === 1
                        ? 'A closer look at your 3D assets.'
                        : 'Consistent data. Reliable imports.'}
                  </p>
                  <div>
                    <a className="index-open" href={i === 2 ? work.source : work.route}>
                      <span>{i === 2 ? 'Get the code' : 'Open workspace'}</span>
                      <ArrowUpRight size={16} />
                    </a>
                    <a
                      href={`#/case/${work.id}`}
                      className="index-case-link"
                      aria-label={`${work.name} engineering notes`}
                    >
                      <FileText size={14} />
                    </a>
                  </div>
                </div>
                <button
                  className="index-collapsed-open"
                  tabIndex={focus !== -1 && focus !== i ? 0 : -1}
                  onClick={() => setFocus(i)}
                  aria-label={`Focus ${work.name}`}
                >
                  <span>{work.name}</span>
                  <ArrowRight size={18} />
                </button>
              </article>
            );
          })}
        </section>
        <footer className="index-footer">
          <span>
            03 independent projects<span className="index-footer-divider">/</span>Source &
            engineering notes included
          </span>
          {focus !== -1 ? (
            <div className="index-focus-navigation">
              <button aria-label="Previous project" onClick={() => setFocus((focus + 2) % 3)}>
                <ArrowLeft size={14} />
              </button>
              <span>0{focus + 1} / 03</span>
              <button aria-label="Next project" onClick={() => setFocus((focus + 1) % 3)}>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <a href="#/profile">
              About the developer
              <ArrowUpRight size={14} />
            </a>
          )}
        </footer>
      </main>
    </div>
  );
}
