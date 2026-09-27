import { ArrowUpRight, FolderGit2 } from 'lucide-react';
import { hireUrl } from '../content/work';
import '../showcase.css';

// Real results from each project's own self-test or demo run (see the linked repos).
const proof = [
  {
    cmd: 'ZatcaPos.exe selftest',
    result: '13/13 checks passed',
    note: 'VAT, stock, QR, hash chain',
  },
  { cmd: 'XlsxRsaLock.exe selftest', result: '9/9 checks passed', note: 'bit-for-bit restore' },
  {
    cmd: 'WeatherPrototype.exe -- --selftest',
    result: '10/10 checks passed',
    note: 'thunder timing',
  },
  { cmd: 'python harvest.py', result: '190 records, 0 errors', note: 'JS pages + scroll' },
  {
    cmd: 'wp-playground: [price_scale]',
    result: 'renders in WordPress',
    note: 'shortcode + block',
  },
];

const stats = [
  { value: '12', label: 'projects with public source' },
  { value: '5', label: 'languages in shipped code' },
  { value: '32', label: 'automated checks, all green' },
];

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="hero-eyebrow">Kai Chen · independent developer · remote, UTC+8</p>
        <h1 id="hero-title">
          I build small tools
          <br />
          that <em>just work.</em>
        </h1>
        <p className="hero-lead">
          Scrapers, automations, desktop and web apps, browser games. Every project ships with its
          source, a README and a self-test you can run yourself, so you can check the work before
          you pay for it.
        </p>
        <div className="hero-actions">
          <a className="hero-primary" href={hireUrl} target="_blank" rel="noreferrer">
            Hire me on Freelancer
            <ArrowUpRight size={16} />
          </a>
          <a
            className="hero-secondary"
            href="https://github.com/luoy16002-svg"
            target="_blank"
            rel="noreferrer"
          >
            <FolderGit2 size={15} />
            Read the code
          </a>
        </div>
        <dl className="hero-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <figure className="hero-proof" aria-label="Recent self-test results">
        <div className="hero-proof-bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <b>proof.log</b>
        </div>
        <ol>
          {proof.map((p, i) => (
            <li key={p.cmd} style={{ '--line': i } as React.CSSProperties}>
              <code>
                <span className="hero-prompt">$</span> {p.cmd}
              </code>
              <span className="hero-ok">
                <span aria-hidden="true">✓</span> {p.result}
                <small>{p.note}</small>
              </span>
            </li>
          ))}
        </ol>
        <figcaption>
          Each line links back to a repo below: run it and you get the same result.
        </figcaption>
      </figure>
    </section>
  );
}
