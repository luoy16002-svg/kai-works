import { ArrowLeft, ArrowRight, ArrowUpRight, Code2 as Github, CheckCircle2 } from 'lucide-react';
import {
  PortfolioHeader,
  PortfolioFooter,
  WorkPreview,
  WorkIcon,
} from '../components/PortfolioLayout';
import { selectedWork, email } from '../content/work';
import { caseNotes } from '../content/caseNotes';
import { CaseStudy as LegacyCaseStudy } from './Profile';
function scrollToSection(id: string) {
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  document.getElementById(id)?.scrollIntoView({ behavior });
}
export default function ProjectCase({ id }: { id: string }) {
  const work = selectedWork.find((item) => item.id === id);
  const notes = caseNotes[id as keyof typeof caseNotes];
  if (!work || !notes) return <LegacyCaseStudy id={id} />;
  return (
    <div className="studio-page">
      <PortfolioHeader />
      <main id="main-content" tabIndex={-1} className="project-case-main">
        <div className="project-case-top">
          <a className="case-return" href="#/">
            <ArrowLeft size={14} />
            Selected work
          </a>
          <header className="project-case-hero">
            <div>
              <div className="case-product-label">
                <WorkIcon id={id} />
                <span>
                  {work.name} / {work.type}
                </span>
              </div>
              <h1>{notes.title}</h1>
              <p>{notes.summary}</p>
              <div className="case-actions">
                <a href={id === 'invoice-gate' ? work.source : work.route}>
                  {id === 'invoice-gate' ? 'Get the code' : work.action}
                  <ArrowUpRight size={16} />
                </a>
                <a href={work.source} target="_blank" rel="noreferrer">
                  <Github size={16} />
                  View source
                </a>
              </div>
              <span className="case-context">
                Independent project · implementation, interface, tests and documentation
              </span>
            </div>
            <div className={`case-preview case-preview-${id}`}>
              <WorkPreview work={work} />
            </div>
          </header>
        </div>
        <div className="project-case-body">
          <div className="case-body-grid">
            <aside className="case-outline">
              <span>In this case</span>
              <a
                href="#problem"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('problem');
                }}
              >
                The problem
              </a>
              <a
                href="#decisions"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('decisions');
                }}
              >
                Implementation
              </a>
              <a
                href="#verification"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('verification');
                }}
              >
                Verification
              </a>
              <div>
                <strong>Built with</strong>
                {work.stack.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </aside>
            <div className="case-article">
              <section id="problem">
                <h2>The problem</h2>
                <p>{notes.problem}</p>
              </section>
              <section id="decisions">
                <h2>Implementation decisions</h2>
                <div className="case-decisions-list">
                  {notes.decisions.map((item, i) => (
                    <article key={item.title}>
                      <span>0{i + 1}</span>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <section className="case-verification" id="verification">
                <h2>
                  <CheckCircle2 size={22} />
                  Verification
                </h2>
                <p>{notes.checks}</p>
                <nav aria-label="Implementation and test sources">
                  {notes.links.map((item) => (
                    <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                      {item.label}
                      <ArrowUpRight size={15} />
                    </a>
                  ))}
                </nav>
              </section>
              <section>
                <h2>Try the full workflow</h2>
                <ol>
                  {notes.walkthrough.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </section>
              <section className="case-limits">
                <h2>Scope & limits</h2>
                <p>{notes.limits}</p>
              </section>
              <div className="case-close">
                <span>Have a similar tool to build?</span>
                <a href={`mailto:${email}`}>
                  Discuss the project
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <PortfolioFooter />
    </div>
  );
}
