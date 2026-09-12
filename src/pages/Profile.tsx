import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import KaiLogo from '../components/KaiLogo';
import profile from '../content/profile.json';
import '../profile.css';

type Project = (typeof profile.cases)[number];
const publicFile = (name: string) => `${import.meta.env.BASE_URL}downloads/${name}`;
const projectLink = (project: Project) =>
  project.route ? `#/${project.route}` : project.article || project.source;

function ProfileHeader() {
  return (
    <header className="profile-nav">
      <a href="#/" aria-label="Kai, selected work">
        <KaiLogo />
      </a>
      <a className="profile-back" href="#/">
        <ArrowLeft size={15} /> Selected work
      </a>
      <span>{profile.location}</span>
      <a href={`mailto:${profile.email}`}>
        Email Kai <ArrowUpRight size={15} />
      </a>
    </header>
  );
}

function ProfileFooter() {
  return (
    <footer className="profile-footer">
      <span>KAI / INDEPENDENT WORK / 2026</span>
      <a href={profile.github} target="_blank" rel="noreferrer">
        Source on GitHub <ArrowUpRight size={14} />
      </a>
      <a href="#/evidence">
        Test records <ArrowRight size={14} />
      </a>
    </footer>
  );
}

export default function Profile({ focus = 'frontend' }: { focus?: string }) {
  const role = profile.roles.find((item) => item.id === focus) ?? profile.roles[0];
  return (
    <div className="profile-page" data-focus={role.id}>
      <ProfileHeader />
      <main className="profile-main" id="main-content" tabIndex={-1}>
        <section className="profile-intro" aria-labelledby="profile-title">
          <div>
            <p className="profile-eyebrow">KAI / {role.title.toUpperCase()}</p>
            <h1 id="profile-title">
              {role.headline.split('\n').map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p className="profile-lead">{role.summary}</p>
          </div>
          <aside className="profile-brief" aria-label="Working arrangement and resume">
            <span className="profile-eyebrow">LET’S BUILD SOMETHING USEFUL</span>
            <p>{role.fit}</p>
            <span className="profile-brief-note">
              China, UTC+8. Written briefs, email and chat.
            </span>
            <a
              className="profile-button"
              href={`mailto:${profile.email}?subject=${encodeURIComponent(role.subject)}`}
            >
              Discuss a project <ArrowUpRight size={16} />
            </a>
            <a
              className="profile-download"
              href={publicFile(`${role.file}.pdf`)}
              download
              aria-label={`Download ${role.title} resume (PDF)`}
            >
              One-page resume{' '}
              <span>
                PDF <ArrowDownToLine size={15} />
              </span>
            </a>
            <div className="profile-download-options">
              <a href={publicFile(`${role.file}.txt`)} download>
                Plain text
              </a>
              <a href={publicFile('kai-frontend-developer-zh.pdf')} download lang="zh-CN">
                中文前端简历
              </a>
            </div>
          </aside>
        </section>

        <nav className="profile-paths" aria-label="Choose a work focus">
          <span>EXPLORE BY BRIEF</span>
          {profile.roles.map((item) => (
            <a
              key={item.id}
              href={`#/profile/${item.id}`}
              aria-current={item.id === role.id ? 'page' : undefined}
            >
              {item.label}
              <ArrowRight size={16} />
            </a>
          ))}
        </nav>

        <section className="profile-selected" aria-labelledby="selected-title">
          <div className="profile-section-heading">
            <h2 id="selected-title">Selected work</h2>
            <p>Independent projects · Working demos · Inspectable evidence</p>
          </div>
          {role.cases.map((id, index) => {
            const project = profile.cases.find((item) => item.id === id)!;
            return (
              <article key={id} className="profile-project">
                <div className="profile-project-identity">
                  <span className="profile-eyebrow">
                    0{index + 1} / {project.category}
                  </span>
                  <h3>{project.name}</h3>
                  <div className="profile-observation">
                    <strong>{project.metric}</strong>
                    <span>{project.unit}</span>
                  </div>
                </div>
                <div className="profile-project-description">
                  <h4>{project.title}</h4>
                  <p>{project.summary}</p>
                  <span className="profile-stack">{project.stack}</span>
                  <div className="profile-project-actions">
                    <a className="profile-demo" href={projectLink(project)}>
                      {project.route ? 'Try the demo' : 'Read the article'}
                      <ArrowUpRight size={16} />
                    </a>
                    <a href={`#/case/${project.id}`}>
                      Decisions & evidence
                      <ArrowRight size={16} />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="profile-more" aria-labelledby="more-title">
          <h2 id="more-title">Also worth a look</h2>
          <div>
            {role.related.map((item) => (
              <a key={item.route} href={`#/${item.route}`}>
                {item.name}
                <ArrowUpRight size={16} />
              </a>
            ))}
          </div>
        </section>
        <section className="profile-handoff" aria-labelledby="handoff-title">
          <div>
            <span className="profile-eyebrow">FROM BRIEF TO HANDOVER</span>
            <h2 id="handoff-title">
              A clear scope.
              <br />
              Something you can review.
            </h2>
          </div>
          <ol>
            <li>
              <b>01</b>
              <div>
                <h3>Define the slice</h3>
                <p>
                  Share the goal, reference, constraints and target date. Agree a bounded first
                  delivery.
                </p>
              </div>
            </li>
            <li>
              <b>02</b>
              <div>
                <h3>Review working progress</h3>
                <p>
                  A runnable preview, source changes and written updates make decisions concrete.
                </p>
              </div>
            </li>
            <li>
              <b>03</b>
              <div>
                <h3>Make the handover useful</h3>
                <p>
                  Source, setup notes, relevant checks and known limitations travel with the work.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <div className="profile-contact-line">
          <p>Have a brief in mind?</p>
          <a href={`mailto:${profile.email}`}>
            {profile.email}
            <ArrowUpRight size={22} />
          </a>
        </div>
      </main>
      <ProfileFooter />
    </div>
  );
}

export function CaseStudy({ id }: { id: string }) {
  const project = profile.cases.find((item) => item.id === id);
  if (!project)
    return (
      <div className="profile-page">
        <ProfileHeader />
        <main className="profile-main profile-missing" id="main-content" tabIndex={-1}>
          <h1>That case study isn’t here.</h1>
          <a href="#/profile">
            Browse selected work <ArrowRight size={18} />
          </a>
        </main>
        <ProfileFooter />
      </div>
    );
  return (
    <div className="profile-page case-page">
      <ProfileHeader />
      <main className="profile-main" id="main-content" tabIndex={-1}>
        <a className="case-back" href="#/profile">
          <ArrowLeft size={16} /> Profile & selected work
        </a>
        <header className="case-intro">
          <p className="profile-eyebrow">
            {project.name.toUpperCase()} / {project.category} / INDEPENDENT PROJECT
          </p>
          <h1>{project.title}</h1>
          <p className="profile-lead">{project.summary}</p>
          <div className="profile-project-actions">
            <a className="profile-button" href={projectLink(project)}>
              {project.route ? 'Open working demo' : 'Read writing sample'}
              <ArrowUpRight size={17} />
            </a>
            <a href={project.source} target="_blank" rel="noreferrer">
              Inspect the source
              <ArrowUpRight size={16} />
            </a>
          </div>
        </header>
        <div className="case-facts">
          <div>
            <span>MY ROLE</span>
            <p>Implementation, interface, checks and documentation</p>
          </div>
          <div>
            <span>TOOLS</span>
            <p>{project.stack}</p>
          </div>
          <div>
            <span>CONTEXT</span>
            <p>Self-directed portfolio work / 2026</p>
          </div>
        </div>
        <section className="case-section">
          <h2>The problem</h2>
          <p>{project.problem}</p>
        </section>
        <section className="case-section">
          <h2>Implementation decisions</h2>
          <div className="case-decisions">
            {project.decisions.map((decision, index) => (
              <article key={decision.title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{decision.title}</h3>
                  <p>{decision.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="case-check" aria-labelledby="case-check-title">
          <div>
            <span className="profile-eyebrow">A CHECK YOU CAN INSPECT</span>
            <strong>{project.metric}</strong>
            <p>{project.unit}</p>
            <span className="case-check-note">
              A scoped project check. See its source and conditions.
            </span>
          </div>
          <div>
            <h2 id="case-check-title">Try it yourself</h2>
            <ol>
              {project.try.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <nav aria-label="Supporting evidence">
              {project.evidence.map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                  {item.label}
                  <ArrowUpRight size={16} />
                </a>
              ))}
            </nav>
          </div>
        </section>
        <section className="case-section case-boundary">
          <h2>Scope & limits</h2>
          <p>{project.boundary}</p>
        </section>
        <div className="profile-contact-line">
          <p>Have a similar problem to solve?</p>
          <a href={`mailto:${profile.email}`}>
            Discuss a project
            <ArrowUpRight size={22} />
          </a>
        </div>
      </main>
      <ProfileFooter />
    </div>
  );
}
