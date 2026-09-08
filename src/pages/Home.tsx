import { useRef, type MouseEvent } from 'react';
import { ArrowUpRight, ArrowDown, ArrowRight, Check } from 'lucide-react';
import { FieldLab } from './Field';
import KineticArtwork from '../components/KineticArtwork';
import { REPO } from '../ui';
import '../home.css';

const chart = [31, 44, 36, 54, 47, 69, 53, 73, 61, 81, 70, 92, 82, 100, 90];

function CurrentPreview() {
  return (
    <div className="folio-current-preview" aria-hidden="true">
      <div className="folio-preview-top">
        <span>CURRENT / DATA WORKBENCH</span>
        <ArrowUpRight size={20} />
      </div>
      <div className="folio-current-number">
        100,000<span>ROWS. ONE BROWSER TAB.</span>
      </div>
      <svg className="folio-current-chart" viewBox="0 0 600 115" preserveAspectRatio="none">
        {chart.map((height, index) => (
          <rect
            key={index}
            x={index * 40}
            y={110 - height}
            width="26"
            height={height}
            fill={index > 10 ? '#c6bad9' : '#eeaa82'}
          />
        ))}
      </svg>
      <div className="folio-current-table">
        <span>ORDER</span>
        <span>REGION</span>
        <span>TOTAL</span>
        <span>ORD-099998</span>
        <span>APAC</span>
        <span>684.32</span>
        <span>ORD-099999</span>
        <span>EU</span>
        <span>127.08</span>
        <span>ORD-100000</span>
        <span>AMER</span>
        <span>842.98</span>
      </div>
      <small>UI PREVIEW / SYNTHETIC DATA</small>
    </div>
  );
}

function RelayPreview() {
  return (
    <div className="folio-relay-preview" aria-hidden="true">
      <div className="folio-preview-top">
        <span>RELAY / DURABLE QUEUE</span>
        <ArrowUpRight size={20} />
      </div>
      <svg className="folio-relay-diagram" viewBox="0 0 440 340" fill="none">
        <path
          className="relay-flow-line"
          d="M102 85H289C340 85 360 119 360 163V220C360 253 337 279 303 279H163"
          stroke="#251c2d"
          strokeWidth="2"
        />
        <path d="m181 263-18 16 18 16" stroke="#251c2d" strokeWidth="2" />
        <circle cx="102" cy="85" r="52" fill="#f7f2e8" />
        <path d="m82 85 13 13 28-29" stroke="#251c2d" strokeWidth="3" />
        <rect x="271" y="150" width="145" height="53" fill="#c6bad9" stroke="#251c2d" />
        <path d="M290 168v17m8-17v17" stroke="#251c2d" strokeWidth="2" />
        <text x="310" y="181" fill="#251c2d">
          INTERRUPTED
        </text>
        <rect x="20" y="245" width="169" height="68" fill="#251c2d" />
        <path d="m41 278 7 7 14-16" stroke="#f7f2e8" strokeWidth="2" />
        <text x="74" y="283" fill="#f7f2e8">
          RECOVERED
        </text>
        <text x="67" y="162" fill="#251c2d">
          01 / CLAIMED
        </text>
        <text x="195" y="65" fill="#625966">
          LEASE EXPIRES
        </text>
      </svg>
      <small>RECOVERY FLOW / ILLUSTRATION</small>
    </div>
  );
}

export default function Home() {
  const workRef = useRef<HTMLElement>(null);
  const showWork = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const section = workRef.current;
    if (!section) return;
    section.focus({ preventScroll: true });
    section.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="folio">
      <header className="folio-nav">
        <a href="#/" className="folio-brand" aria-label="Kai, selected work">
          KAI<span>↗</span>
        </a>
        <span className="folio-location">
          INDEPENDENT DEVELOPER
          <br />
          CHINA · UTC+8
        </span>
        <nav aria-label="Main navigation">
          <a href="#selected-work" onClick={showWork}>
            Selected work <ArrowDown size={13} />
          </a>
          <a className="folio-nav-contact" href="mailto:fuddleyu@gmail.com">
            Let’s talk <ArrowUpRight size={15} />
          </a>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="folio-hero" aria-labelledby="folio-title">
          <div className="folio-kicker">
            <span>CREATIVE DEVELOPMENT</span>
            <span>SELECTED WORK / 2026</span>
          </div>
          <div className="folio-hero-grid">
            <div className="folio-hero-copy">
              <h1 id="folio-title">
                <span className="folio-title-line">Expressive</span>
                <span className="folio-title-line">on screen.</span>
                <span className="folio-title-solid">
                  <em>Solid</em> underneath.
                </span>
              </h1>
              <p>
                I’m Kai. I build expressive websites, interactive graphics and data tools that stay
                fast under real use.
              </p>
              <a className="folio-primary-link" href="#selected-work" onClick={showWork}>
                View selected work <ArrowDown size={18} />
              </a>
            </div>
            <KineticArtwork />
          </div>
          <div className="folio-hero-bottom">
            <span>DESIGN SENSIBILITY. ENGINEERING DEPTH.</span>
            <span>
              SCROLL TO EXPLORE <ArrowDown size={12} />
            </span>
          </div>
        </section>

        <section
          className="folio-selected"
          id="selected-work"
          tabIndex={-1}
          ref={workRef}
          aria-labelledby="work-title"
        >
          <div className="folio-work-heading folio-reveal">
            <h2 id="work-title">
              Selected work<sup>(04)</sup>
            </h2>
            <p>
              Independent projects.
              <br />
              Real interfaces. Open to explore.
            </p>
          </div>

          <article className="folio-field-project folio-reveal" aria-labelledby="field-title">
            <header className="folio-project-header">
              <div className="folio-project-identity">
                <span className="folio-index">01 / INTERACTIVE GRAPHICS</span>
                <h3 id="field-title">Field</h3>
              </div>
              <p>
                Make a brand feel alive.
                <span>Generative graphics for distinctive digital experiences.</span>
              </p>
              <a className="folio-demo-link" href="#/field">
                Open Field <ArrowUpRight size={20} />
              </a>
            </header>
            <div className="folio-field-view">
              <FieldLab embedded initialPalette={1} />
            </div>
            <div className="folio-project-caption">
              <span>PAINT INTO A LIVING PATTERN. TRY THE CONTROLS.</span>
              <span>GPU SIMULATION / INDEPENDENT EXPERIMENT</span>
            </div>
          </article>

          <article className="folio-halo-project folio-reveal" aria-labelledby="halo-title">
            <figure className="folio-halo-figure">
              <a
                href="#/halo"
                className="folio-visual-link"
                aria-label="Explore Halo, an interactive product configurator"
              >
                <img
                  src={`${import.meta.env.BASE_URL}assets/halo-live.png`}
                  width="1498"
                  height="503"
                  loading="lazy"
                  decoding="async"
                  alt="The graphite Halo pendant on a warm studio background, rendered by the working product configurator."
                />
                <span className="folio-image-open">
                  Explore in 3D <ArrowUpRight size={21} />
                </span>
              </a>
              <figcaption>ACTUAL CONFIGURATOR RENDER / INDEPENDENT PROJECT</figcaption>
            </figure>
            <div className="folio-halo-copy">
              <span className="folio-index">02 / PRODUCT EXPERIENCES</span>
              <h3 id="halo-title">Halo</h3>
              <p className="folio-project-promise">
                Let people explore
                <br />
                before they buy.
              </p>
              <p className="folio-project-description">
                A configurable product scene. Change materials, proportions and light, then share
                the exact setup.
              </p>
              <div className="folio-halo-materials" aria-hidden="true">
                <span />
                <span />
                <span />
                <small>MATERIALS / LIGHT / FORM</small>
              </div>
              <a className="folio-demo-link" href="#/halo">
                Open configurator <ArrowUpRight size={20} />
              </a>
              <span className="folio-project-tech">THREE.JS / REAL-TIME 3D / SHAREABLE STATE</span>
            </div>
          </article>

          <div className="folio-systems-spread">
            <article className="folio-current-project folio-reveal" aria-labelledby="current-title">
              <a
                className="folio-visual-link"
                href="#/current"
                aria-label="Open Current, the 100,000-row data workbench"
              >
                <CurrentPreview />
              </a>
              <div className="folio-project-copy">
                <div className="folio-small-project-title">
                  <span className="folio-index">03</span>
                  <h3 id="current-title">Current</h3>
                  <a href="#/current" aria-label="Open Current workbench">
                    <ArrowUpRight size={26} />
                  </a>
                </div>
                <p className="folio-project-promise">Make heavy data feel light.</p>
                <p className="folio-project-description">
                  Search, filter and export a 100,000-row CSV in the browser. A practical foundation
                  for internal tools.
                </p>
                <span className="folio-project-tech">STREAMING CSV / WORKERS / VIRTUALIZATION</span>
                <a className="folio-text-link" href="#/current">
                  Open workbench <ArrowRight size={16} />
                </a>
              </div>
            </article>
            <article className="folio-relay-project folio-reveal" aria-labelledby="relay-title">
              <a
                className="folio-visual-link"
                href="#/relay"
                aria-label="Open Relay, the durable queue and recovery lab"
              >
                <RelayPreview />
              </a>
              <div className="folio-project-copy">
                <div className="folio-small-project-title">
                  <span className="folio-index">04</span>
                  <h3 id="relay-title">Relay</h3>
                  <a href="#/relay" aria-label="Open Relay recovery lab">
                    <ArrowUpRight size={26} />
                  </a>
                </div>
                <p className="folio-project-promise">Keep important work moving.</p>
                <p className="folio-project-description">
                  A durable queue lab for jobs that need to survive interruptions. Stop the worker
                  and watch recovery.
                </p>
                <span className="folio-project-tech">TRANSACTIONS / LEASES / RECOVERY</span>
                <a className="folio-text-link" href="#/relay">
                  Open recovery lab <ArrowRight size={16} />
                </a>
              </div>
            </article>
          </div>

          <section className="folio-colophon folio-reveal" aria-labelledby="proof-title">
            <div>
              <span className="folio-index">BEHIND THE FINISH</span>
              <h2 id="proof-title">
                Built to look good.
                <br />
                And hold up.
              </h2>
              <a className="folio-text-link" href={REPO} target="_blank" rel="noreferrer">
                Explore the source <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="folio-proof-details">
              <p>The engineering is open, with checks you can inspect and run.</p>
              <ul>
                <li>
                  <Check size={15} />
                  <span>GPU output compared with a CPU reference.</span>
                </li>
                <li>
                  <Check size={15} />
                  <span>CSV totals checked independently with integer arithmetic.</span>
                </li>
                <li>
                  <Check size={15} />
                  <span>Queue recovery tested across abandoned leases and interrupted writes.</span>
                </li>
              </ul>
              <a className="folio-text-link" href="#/evidence">
                Read the test records <ArrowRight size={17} />
              </a>
            </div>
          </section>
        </section>

        <section className="folio-contact" aria-label="Contact Kai">
          <div className="folio-contact-top">
            <span>HAVE A PROJECT IN MIND?</span>
            <span>LET’S MAKE SOMETHING THAT MATTERS.</span>
          </div>
          <a className="folio-contact-cta" href="mailto:fuddleyu@gmail.com">
            Send the brief.
            <ArrowUpRight />
          </a>
          <div className="folio-contact-bottom">
            <p>Websites · Interactive graphics · Data tools</p>
            <a href="mailto:fuddleyu@gmail.com">
              fuddleyu@gmail.com <ArrowUpRight size={16} />
            </a>
          </div>
        </section>
      </main>
      <footer className="folio-footer">
        <span>KAI / 2026</span>
        <span>INDEPENDENT PROJECTS · CHINA / UTC+8</span>
        <a href={REPO} target="_blank" rel="noreferrer">
          Source on GitHub <ArrowUpRight size={12} />
        </a>
      </footer>
    </div>
  );
}
