import {
  ArrowUpRight,
  Code2 as Github,
  Mail,
  Waves,
  Box,
  FileCheck2,
  ArrowRight,
} from 'lucide-react';
import { email, source, type SelectedWork } from '../content/work';
import '../portfolio.css';
import '../portfolio-light.css';
export function PortfolioHeader({ active = 'work' }: { active?: 'work' | 'about' }) {
  return (
    <header className="studio-nav">
      <a href="#/" className="studio-wordmark">
        KAI CHEN<span>Independent developer</span>
      </a>
      <nav aria-label="Portfolio">
        <a href="#/" aria-current={active === 'work' ? 'page' : undefined}>
          Work
        </a>
        <a href="#/profile" aria-current={active === 'about' ? 'page' : undefined}>
          About
        </a>
        <a href={source} target="_blank" rel="noreferrer">
          GitHub
          <Github size={15} />
        </a>
      </nav>
      <a className="studio-contact" href={`mailto:${email}`}>
        <Mail size={15} />
        Get in touch
        <ArrowUpRight size={15} />
      </a>
    </header>
  );
}
export function PortfolioFooter() {
  return (
    <footer className="studio-footer">
      <span>
        KAI CHEN <i>Independent projects · 2026</i>
      </span>
      <a href="#/profile">
        Profile & résumé
        <ArrowRight size={14} />
      </a>
      <a href={`mailto:${email}`}>
        {email}
        <ArrowUpRight size={14} />
      </a>
    </footer>
  );
}
export function WorkIcon({ id, size = 21 }: { id: string; size?: number }) {
  return id === 'current' ? (
    <Waves size={size} />
  ) : id === 'halo' ? (
    <Box size={size} />
  ) : (
    <FileCheck2 size={size} />
  );
}
export function InvoicePreview() {
  return (
    <div className="invoice-preview" aria-label="Invoice Gate command-line workflow">
      <div>
        <span />
        <span />
        <span />
        <small>invoice-gate / Python + SQLite</small>
      </div>
      <pre>
        <b>$ python invoice_gate.py check</b>
        {
          '\n  fixtures/valid.json\n  --vendor demo-supplier\n  --currency USD\n  --number-format en-US\n\n'
        }
        <em>Validate</em>
        {'  required fields & exact totals\n'}
        <em>Import</em>
        {'    commit a SQLite transaction\n'}
        <em>Re-run</em>
        {'    identify the existing record'}
      </pre>
      <span className="terminal-note">Runnable CLI · source and fixtures included</span>
    </div>
  );
}
export function WorkPreview({ work }: { work: SelectedWork }) {
  return work.image ? (
    <img
      src={`${import.meta.env.BASE_URL}work/${work.image}`}
      alt={`${work.name} running in the browser`}
      loading="lazy"
      width={1440}
      height={960}
    />
  ) : (
    <InvoicePreview />
  );
}
export function WorkCard({ work, index }: { work: SelectedWork; index: number }) {
  return (
    <article className={`studio-project project-${work.id}`}>
      <div className="studio-project-title">
        <div className="project-icon">
          <WorkIcon id={work.id} />
        </div>
        <div>
          <h2>
            <a href={work.route}>{work.name}</a>
          </h2>
          <p>{work.type}</p>
        </div>
        <span>0{index + 1}</span>
      </div>
      <a className="studio-preview" href={work.route} aria-label={work.action}>
        <WorkPreview work={work} />
      </a>
      <div className="studio-project-body">
        <p>{work.description}</p>
        <div className="studio-stack">
          {work.stack.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="studio-project-links">
          <a href={work.route}>
            {work.action}
            <ArrowUpRight size={15} />
          </a>
          {work.id !== 'invoice-gate' ? (
            <a href={`#/case/${work.id}`}>
              Case study
              <ArrowRight size={14} />
            </a>
          ) : (
            <a href={work.source} target="_blank" rel="noreferrer">
              Source
              <Github size={14} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
