import { ArrowUpRight, CircleCheck, Download, FolderGit2, MonitorPlay } from 'lucide-react';
import '../showcase.css';

const gh = 'https://github.com/luoy16002-svg/';

type Link = { label: string; href: string; kind: 'source' | 'download' | 'demo' };
const builds: {
  id: string;
  name: string;
  kind: string;
  line: string;
  proof: string;
  tags: string[];
  links: Link[];
}[] = [
  {
    id: 'explainer-videos',
    name: 'Animated explainers',
    kind: 'Video production',
    line: 'Scripted explainer videos built in code: illustrated scenes, log-scale camera moves, narration, captions and sound design, mixed to -14 LUFS.',
    proof: 'Two finished 70-second videos · AI voice and AI illustrations, disclosed',
    tags: ['Remotion', 'Motion graphics', 'Voice-over'],
    links: [
      {
        label: 'Atom to universe',
        href: import.meta.env.BASE_URL + 'video/atom-to-universe.mp4',
        kind: 'demo',
      },
      {
        label: 'Snail to light',
        href: import.meta.env.BASE_URL + 'video/snail-to-light.mp4',
        kind: 'demo',
      },
    ],
  },
  {
    id: 'zatca-pos',
    name: 'Qahwa POS',
    kind: 'Windows point of sale',
    line: 'Touch-screen POS that runs fully offline and prints Saudi ZATCA invoices with QR codes, plus inventory, reports and loyalty.',
    proof: '13/13 self-test checks, incl. tamper detection',
    tags: ['C# / .NET 9', 'SQLite', 'ZATCA QR'],
    links: [
      { label: 'Source', href: gh + 'zatca-pos', kind: 'source' },
      { label: 'Download', href: gh + 'zatca-pos/releases', kind: 'download' },
    ],
  },
  {
    id: 'xlsx-rsa-lock',
    name: 'XlsxRsaLock',
    kind: 'Encryption utility',
    line: 'Locks any spreadsheet with an RSA public key and restores it bit-for-bit with the private key, verified by SHA-256.',
    proof: '9/9 checks · a 5 MB file unlocks in 1–4 s',
    tags: ['C#', 'RSA-OAEP', 'AES-GCM'],
    links: [
      { label: 'Source', href: gh + 'xlsx-rsa-lock', kind: 'source' },
      { label: 'Download', href: gh + 'xlsx-rsa-lock/releases', kind: 'download' },
    ],
  },
  {
    id: 'godot-weather',
    name: 'Weather systems',
    kind: 'Godot 4 prototype',
    line: 'Rain, gusting wind, lightning and thunder that arrives after distance ÷ 343 m/s, with layered audio synthesised in code.',
    proof: '10/10 checks · standalone Windows build',
    tags: ['GDScript', 'Shaders', 'Audio synthesis'],
    links: [
      { label: 'Source', href: gh + 'godot-weather-prototype', kind: 'source' },
      { label: 'Download', href: gh + 'godot-weather-prototype/releases', kind: 'download' },
    ],
  },
  {
    id: 'pw-harvest',
    name: 'pw-harvest',
    kind: 'Web scraper',
    line: 'Config-driven Playwright scraper for JavaScript-heavy sites: retries, robots.txt, throttling and image downloads.',
    proof: '190 records, 60 images, 0 errors on the demo run',
    tags: ['Python', 'Playwright', 'asyncio'],
    links: [{ label: 'Source', href: gh + 'pw-harvest', kind: 'source' }],
  },
  {
    id: 'jira-weekly-report',
    name: 'Jira weekly report',
    kind: 'Reporting automation',
    line: 'Turns a Jira board into a weekly PDF: sprint progress, burndown, work completed per developer and hours logged.',
    proof: 'Sample PDF included in the repo',
    tags: ['Python', 'Jira API', 'matplotlib'],
    links: [
      { label: 'Source', href: gh + 'jira-weekly-report', kind: 'source' },
      {
        label: 'Sample PDF',
        href: gh + 'jira-weekly-report/blob/main/sample/jira-weekly-2026-09-21.pdf',
        kind: 'demo',
      },
    ],
  },
  {
    id: 'price-scale-slider',
    name: 'Price Scale Slider',
    kind: 'WordPress plugin',
    line: 'Sliding-scale pricing with two plans, volume tiers and a currency selector, edited from the WordPress admin.',
    proof: 'Tested inside a running WordPress install',
    tags: ['PHP', 'WordPress', 'Vanilla JS'],
    links: [
      {
        label: 'Live demo',
        href: 'https://luoy16002-svg.github.io/price-scale-slider/',
        kind: 'demo',
      },
      { label: 'Source', href: gh + 'price-scale-slider', kind: 'source' },
    ],
  },
];

const linkIcon = { source: FolderGit2, download: Download, demo: MonitorPlay };

export default function RecentBuilds() {
  const base = import.meta.env.BASE_URL;
  return (
    <section className="builds" aria-labelledby="builds-title">
      <div className="builds-heading">
        <h2 id="builds-title">Recent builds</h2>
        <p>Each one ships with the code and a way to check it works.</p>
      </div>
      <div className="builds-grid">
        {builds.map((b, i) => (
          <article key={b.id} className="build" style={{ '--card': i } as React.CSSProperties}>
            <a
              className="build-shot"
              href={b.links[0].href}
              target="_blank"
              rel="noreferrer"
              tabIndex={-1}
            >
              <img
                src={`${base}work/builds/${b.id}.webp`}
                alt={`${b.name} screenshot`}
                loading="lazy"
                width={1200}
                height={750}
              />
            </a>
            <div className="build-body">
              <p className="build-kind">{b.kind}</p>
              <h3>{b.name}</h3>
              <p className="build-line">{b.line}</p>
              <p className="build-proof">
                <CircleCheck size={14} />
                {b.proof}
              </p>
              <ul className="build-tags" aria-label="Stack">
                {b.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <div className="build-links">
                {b.links.map((l) => {
                  const Icon = linkIcon[l.kind];
                  return (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                      <Icon size={14} />
                      {l.label}
                      <ArrowUpRight size={12} className="build-arrow" />
                    </a>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
