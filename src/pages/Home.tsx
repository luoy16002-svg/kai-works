import { ArrowUpRight, ArrowDown, ArrowRight } from 'lucide-react';
import { FieldLab } from './Field';
import { REPO } from '../ui';

export default function Home() {
  return (
    <div className="folio">
      <header className="folio-nav">
        <a href="#/" className="folio-brand">
          KAI<span>↗</span>
        </a>
        <span className="folio-location">
          DEVELOPMENT & EXPERIMENTS
          <br />
          CHINA · UTC+8
        </span>
        <nav aria-label="Main navigation">
          <a href="#/evidence">
            Test records <ArrowUpRight size={13} />
          </a>
          <a href="mailto:fuddleyu@gmail.com">
            Email me <ArrowUpRight size={13} />
          </a>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="folio-intro">
          <div className="folio-kicker">
            <span>INDEPENDENT DEVELOPER</span>
            <span>SELECTED WORK — 2026</span>
          </div>
          <h1>
            Tools, systems
            <br />
            <span>& experiments.</span>
          </h1>
          <div className="folio-intro-bottom">
            <p>
              I'm Kai. I write interfaces, graphics and the systems behind them. These are things
              I've built. Open one and try it.
            </p>
            <a href="#/field">
              Explore the field <ArrowDown size={17} />
            </a>
          </div>
        </section>
        <section className="folio-feature" aria-label="Featured interactive experiment">
          <FieldLab embedded />
          <div className="folio-feature-caption">
            <div>
              <span className="folio-index">01</span>
              <h2>Field</h2>
              <span className="folio-caption-type">GPU / GENERATIVE SYSTEMS</span>
            </div>
            <a href="#/field">
              Open experiment <ArrowUpRight size={19} />
            </a>
          </div>
          <p className="folio-project-note">
            A reaction–diffusion simulation you can paint into. Two concentrations, 65,536 cells,
            patterns that emerge from the equations.
          </p>
        </section>
        <section className="folio-selected" aria-label="More working projects">
          <div className="folio-section-line">
            <h2>More work</h2>
            <span>02—04</span>
          </div>
          <a className="folio-project-row" href="#/current">
            <span className="folio-index">02</span>
            <div>
              <h3>Current</h3>
              <p>100,000 rows. One browser tab.</p>
              <span>STREAMING CSV / WORKERS / VIRTUALIZATION</span>
            </div>
            <div className="folio-data-preview" aria-hidden="true">
              <span>
                ORD-099998<span>684.32</span>
              </span>
              <span>
                ORD-099999<span>127.08</span>
              </span>
              <span>
                ORD-100000<span>842.98</span>
              </span>
              <small>UI PREVIEW · SYNTHETIC DATA</small>
            </div>
            <ArrowUpRight className="folio-row-arrow" />
          </a>
          <a className="folio-project-row" href="#/relay">
            <span className="folio-index">03</span>
            <div>
              <h3>Relay</h3>
              <p>Kill the worker. Keep the work.</p>
              <span>TRANSACTIONS / LEASES / RECOVERY</span>
            </div>
            <div className="folio-queue-preview" aria-hidden="true">
              <span>CLAIMED</span>
              <i />
              <span className="queue-interrupt">INTERRUPTED</span>
              <i />
              <span>RECOVERED</span>
            </div>
            <ArrowUpRight className="folio-row-arrow" />
          </a>
          <a className="folio-project-row" href="#/halo">
            <span className="folio-index">04</span>
            <div>
              <h3>Halo</h3>
              <p>A product, built from geometry.</p>
              <span>THREE.JS / MATERIALS / SERIALIZABLE STATE</span>
            </div>
            <div className="folio-ring-preview" aria-hidden="true">
              <span />
            </div>
            <ArrowUpRight className="folio-row-arrow" />
          </a>
        </section>
        <section className="folio-colophon">
          <span className="folio-index">BUILD NOTES</span>
          <div>
            <h2>The code is open.</h2>
            <p>
              GPU output checked against a CPU reference. CSV totals checked independently with
              integer arithmetic. Queue recovery tested with abandoned leases and interrupted
              writes.
            </p>
            <a href="#/evidence">
              Read the test records <ArrowRight size={17} />
            </a>
          </div>
          <a href={REPO} target="_blank" rel="noreferrer">
            GitHub <ArrowUpRight size={18} />
          </a>
        </section>
        <section className="folio-contact">
          <span>HAVE A PROJECT IN MIND?</span>
          <a href="mailto:fuddleyu@gmail.com">
            Send the brief.
            <ArrowUpRight />
          </a>
          <p>Interfaces · Data tools · Interactive graphics</p>
        </section>
      </main>
      <footer className="folio-footer">
        <span>KAI / 2026</span>
        <span>INDEPENDENT PROJECTS</span>
        <a href="mailto:fuddleyu@gmail.com">
          fuddleyu@gmail.com <ArrowUpRight size={12} />
        </a>
      </footer>
    </div>
  );
}
