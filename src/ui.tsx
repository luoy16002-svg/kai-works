import type React from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
export const REPO = 'https://github.com/luoy16002-svg/kai-works';
export function SourceLink({
  path = '',
  children = 'Source & tests',
}: {
  path?: string;
  children?: React.ReactNode;
}) {
  return (
    <a href={REPO + path} target="_blank" rel="noreferrer" className="source-link">
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
export function WorkNav({ name, detail }: { name: string; detail: string }) {
  return (
    <nav className="work-nav" aria-label="Project navigation">
      <a href="#/" className="back-link">
        <ArrowLeft size={15} /> Kai / Selected work
      </a>
      <span>
        {name} <i>/</i> {detail}
      </span>
      <a href="#/evidence">
        View evidence <ArrowUpRight size={14} />
      </a>
    </nav>
  );
}
export function download(name: string, content: BlobPart, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
