import { ArrowUpRight, ArrowDownToLine, Mail, Code2 as Github, ArrowRight } from 'lucide-react';
import { PortfolioHeader, PortfolioFooter, WorkIcon } from '../components/PortfolioLayout';
import { selectedWork, source, email } from '../content/work';
const downloadFile = (extension: string) =>
  `${import.meta.env.BASE_URL}downloads/KAI-CHEN-Frontend-Developer.${extension}`;
const focusCopy: Record<string, string> = {
  frontend: 'Frontend development',
  creative: 'Interactive & 3D development',
  writing: 'Development & technical writing',
};
export default function About({ focus = 'frontend' }: { focus?: string }) {
  return (
    <div className="studio-page">
      <PortfolioHeader active="about" />
      <main className="studio-main about-main" id="main-content" tabIndex={-1}>
        <header className="about-heading">
          <div className="about-monogram" aria-hidden="true">
            KC
          </div>
          <div>
            <h1>Kai Chen</h1>
            <p>Independent developer · China / UTC+8</p>
          </div>
          <a href={downloadFile('pdf')} download>
            <ArrowDownToLine size={16} />
            Download résumé<span>PDF</span>
          </a>
        </header>
        <div className="about-columns">
          <aside className="about-sidebar">
            <h2>At a glance</h2>
            <dl>
              <div>
                <dt>Focus</dt>
                <dd>{focusCopy[focus] ?? focusCopy.frontend}</dd>
              </div>
              <div>
                <dt>Tools</dt>
                <dd>
                  React · TypeScript · Python
                  <br />
                  Three.js · SQLite · Git
                </dd>
              </div>
              <div>
                <dt>Collaboration</dt>
                <dd>
                  Remote · written briefs
                  <br />
                  Email and chat
                </dd>
              </div>
            </dl>
            <a href={`mailto:${email}`}>
              <Mail size={15} />
              {email}
            </a>
            <a href={source} target="_blank" rel="noreferrer">
              <Github size={15} />
              GitHub
              <ArrowUpRight size={14} />
            </a>
            <a href={downloadFile('txt')} download>
              <ArrowDownToLine size={15} />
              Plain-text résumé
            </a>
          </aside>
          <div className="about-content">
            <section>
              <span className="studio-kicker">About my work</span>
              <h2>I like turning a practical problem into a usable tool.</h2>
              <p>
                I build interfaces for working with data, inspecting 3D assets and handling
                repeatable tasks. My work covers the UI, the processing underneath it, the failure
                states and the documentation that makes a project easier to maintain.
              </p>
              <p>
                The projects here are independent work. You can use the browser tools with your own
                files and inspect the source, fixtures and tests. Each case study explains the
                choices behind the implementation.
              </p>
            </section>
            <section className="about-work">
              <h2>Selected projects</h2>
              {selectedWork.map((work) => (
                <a key={work.id} href={`#/case/${work.id}`}>
                  <WorkIcon id={work.id} />
                  <span>
                    <strong>{work.name}</strong>
                    <small>{work.detail}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </a>
              ))}
            </section>
            <section className="about-capabilities">
              <h2>Where I can help</h2>
              <div>
                <article>
                  <h3>Product interfaces</h3>
                  <p>
                    React and TypeScript implementation, data tables, forms, responsive layouts and
                    useful error states.
                  </p>
                </article>
                <article>
                  <h3>Data & automation</h3>
                  <p>
                    CSV pipelines, local browser storage, Python validation and small SQLite-backed
                    tools.
                  </p>
                </article>
                <article>
                  <h3>Interactive tools</h3>
                  <p>
                    Three.js viewers, camera controls, geometry inspection and browser graphics.
                  </p>
                </article>
                <article>
                  <h3>Documentation</h3>
                  <p>
                    Runnable examples, setup instructions and written walkthroughs of implementation
                    choices.
                  </p>
                </article>
              </div>
            </section>
            <section className="about-contact">
              <h2>Start with the problem and a clear scope.</h2>
              <p>
                Send a short brief, your existing stack and the outcome you need. I’m open to remote
                project work and a scoped paid trial, with delivery and payment terms agreed before
                work starts.
              </p>
              <a href={`mailto:${email}`}>
                Email me
                <ArrowRight size={17} />
              </a>
            </section>
          </div>
        </div>
      </main>
      <PortfolioFooter />
    </div>
  );
}
