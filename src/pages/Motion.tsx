import { ArrowUpRight } from 'lucide-react';
import MotionReel from '../components/MotionReel';
import { REPO, WorkNav } from '../ui';
import '../home.css';

export default function Motion() {
  return (
    <div className="motion-page">
      <WorkNav name="MOTION" detail="A real-time 3D film" />
      <main id="main-content" tabIndex={-1}>
        <header className="motion-page-heading">
          <h1>Motion film</h1>
          <span>INDEPENDENT STUDY / 24 SECONDS</span>
          <a href={REPO} target="_blank" rel="noreferrer">
            Source code <ArrowUpRight size={14} />
          </a>
        </header>
        <MotionReel />
      </main>
    </div>
  );
}
