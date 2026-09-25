import {
  ArrowUpRight,
  Mail,
  Play,
  ScanText,
  Workflow,
  AppWindow,
  Gamepad2,
  MessageSquareText,
  Eye,
  PackageCheck,
} from 'lucide-react';
import { email, hireUrl } from '../content/work';
import '../hire.css';

const games = [
  {
    id: 'egg-heist',
    name: 'Egg Heist',
    line: 'Steal eggs from bot rivals, hatch mutant creatures, run home before you get caught.',
    tags: ['Canvas 2D', 'Bot AI', 'Economy sim'],
  },
  {
    id: 'juicy-blocks',
    name: 'Juicy Blocks',
    line: '8×8 block puzzle with a fair dealer, combo scoring and a 40-level gem mode.',
    tags: ['Canvas 2D', 'Portrait + landscape', 'Save/resume'],
  },
  {
    id: 'trust-issues',
    name: 'Trust Issues',
    line: 'A troll platformer: 25 single-screen levels where the level lies to you.',
    tags: ['Physics', 'Level scripting', 'Scripted playtests'],
  },
];

const services = [
  {
    icon: ScanText,
    title: 'Data extraction',
    body: 'Scrapers and PDF, scan or spreadsheet cleanup. Messy sources in, clean CSV, Sheets or database rows out.',
  },
  {
    icon: Workflow,
    title: 'Automation & APIs',
    body: 'Connect the tools you already use (Sheets, Airtable, Notion, CRMs, webhooks, n8n) so repetitive steps run themselves.',
  },
  {
    icon: AppWindow,
    title: 'Small web apps',
    body: 'Dashboards, internal tools and calculators. React and TypeScript on the front, Python or Node behind it.',
  },
  {
    icon: Gamepad2,
    title: 'Browser games',
    body: 'Lightweight HTML5 games that load in a second, ready for portals like CrazyGames and Poki.',
  },
];

const steps = [
  {
    icon: MessageSquareText,
    title: 'Scope in writing',
    body: 'You describe the task; I reply with a short plan: what you get, the price and the date. No surprises later.',
  },
  {
    icon: Eye,
    title: 'Early demo',
    body: 'On small jobs you see something working early, with screenshots or a short screen recording.',
  },
  {
    icon: PackageCheck,
    title: 'Clean handover',
    body: 'Tested code, a README, and help getting it running on your side. Written, async communication throughout.',
  },
];

export default function HireSections() {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="hire">
      <section className="hire-block" aria-labelledby="games-title">
        <div className="hire-heading">
          <h2 id="games-title">
            Games <span>playable in the browser</span>
          </h2>
        </div>
        <div className="hire-games">
          {games.map((g) => (
            <a
              key={g.id}
              className="hire-game"
              href={`${base}play/${g.id}/index.html`}
              target="_blank"
              rel="noreferrer"
            >
              <div className="hire-game-art">
                <img
                  src={`${base}work/games/${g.id}.webp`}
                  alt={`${g.name} cover art`}
                  loading="lazy"
                  width={960}
                  height={540}
                />
                <span className="hire-play">
                  <Play size={14} fill="currentColor" />
                  Play
                </span>
              </div>
              <div className="hire-game-body">
                <h3>{g.name}</h3>
                <p>{g.line}</p>
                <div className="hire-tags">
                  {g.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="hire-block" aria-labelledby="services-title">
        <div className="hire-heading">
          <h2 id="services-title">
            What I can help with <span>small, clearly defined jobs welcome</span>
          </h2>
        </div>
        <div className="hire-services">
          {services.map(({ icon: Icon, title, body }) => (
            <div key={title} className="hire-service">
              <span className="hire-icon">
                <Icon size={18} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="hire-block hire-cta" aria-labelledby="work-title">
        <div className="hire-steps">
          <h2 id="work-title">How I work</h2>
          <ol>
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title}>
                <span className="hire-step-n">0{i + 1}</span>
                <div>
                  <h3>
                    <Icon size={15} />
                    {title}
                  </h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="hire-contact">
          <p>
            Have a task in mind? Send the details and I'll tell you honestly whether I'm the right
            fit.
          </p>
          <a className="hire-primary" href={hireUrl} target="_blank" rel="noreferrer">
            Hire me on Freelancer
            <ArrowUpRight size={16} />
          </a>
          <a className="hire-secondary" href={`mailto:${email}`}>
            <Mail size={15} />
            {email}
          </a>
        </div>
      </section>
    </div>
  );
}
