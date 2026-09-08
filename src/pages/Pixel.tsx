import { ArrowUpRight } from 'lucide-react';
import PixelCourier from '../components/PixelCourier';
import { REPO, WorkNav } from '../ui';
import '../pixel.css';

export default function Pixel() {
  return (
    <div className="pixel-page">
      <WorkNav name="PIXEL" detail="Little deliveries" />
      <main id="main-content" tabIndex={-1}>
        <header className="pixel-page-heading">
          <div>
            <h1>Little deliveries</h1>
            <p>A small courier, a hillside town, an open route.</p>
          </div>
          <a href={REPO} target="_blank" rel="noreferrer">
            Source code <ArrowUpRight size={13} />
          </a>
        </header>
        <PixelCourier />
        <p className="pixel-page-note">
          Collect parcels, jump the streams, deliver at the post office. Take control to play, or
          leave the route to the courier.
        </p>
      </main>
    </div>
  );
}
