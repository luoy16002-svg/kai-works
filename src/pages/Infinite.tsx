import InfiniteField from '../components/InfiniteField';
import { SourceLink, WorkNav } from '../ui';
import '../infinite-field.css';

export default function Infinite() {
  return (
    <div className="infinite-page">
      <WorkNav name="INFINITE" detail="Lorenz flow study" />
      <main id="main-content" className="infinite-page-main" tabIndex={-1}>
        <header className="infinite-page-heading">
          <div>
            <h1>Infinite field</h1>
            <p>Follow the flow. Change a parameter and watch a new path emerge.</p>
          </div>
          <SourceLink path="/blob/main/src/core/lorenz.ts">Read the model</SourceLink>
        </header>
        <InfiniteField />
      </main>
    </div>
  );
}
