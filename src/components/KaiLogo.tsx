import { useEffect, useRef } from 'react';
import { KAI_PATHS } from '../core/kai-identity';
import '../kai-logo.css';

export default function KaiLogo({
  animated = false,
  colored = false,
  className = '',
}: {
  animated?: boolean;
  colored?: boolean;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!animated) return;
    const svg = svgRef.current!;
    const target = svg.closest('a') ?? svg;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animations: Animation[] = [];
    const stop = () => {
      animations.forEach((animation) => animation.cancel());
      animations = [];
    };
    const assemble = (initial = false) => {
      if (document.hidden || preference.matches) return;
      stop();
      const offsets = [
        [0, 18],
        [-14, 12],
        [-14, -12],
        [0, 18],
        [0, -18],
        [-18, 0],
        [0, 18],
      ];
      animations = Array.from(svg.querySelectorAll('path')).map((path, index) => {
        const [x, y] = offsets[index];
        const distance = initial ? 1 : 0.45;
        return path.animate(
          [
            {
              transform: `translate(${x * distance}px, ${y * distance}px)`,
              opacity: initial ? 0 : 0.55,
            },
            { transform: 'translate(0, 0)', opacity: 1 },
          ],
          {
            duration: initial ? 700 : 440,
            delay: index * (initial ? 55 : 30),
            easing: 'cubic-bezier(.18,.76,.25,1)',
            fill: 'backwards',
          },
        );
      });
    };
    const replay = () => assemble();
    const visibility = () => {
      if (document.hidden) stop();
    };
    const reduced = () => {
      if (preference.matches) stop();
    };
    assemble(true);
    target.addEventListener('pointerenter', replay);
    target.addEventListener('focus', replay);
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', reduced);
    return () => {
      stop();
      target.removeEventListener('pointerenter', replay);
      target.removeEventListener('focus', replay);
      document.removeEventListener('visibilitychange', visibility);
      preference.removeEventListener('change', reduced);
    };
  }, [animated]);
  return (
    <svg
      ref={svgRef}
      className={`kai-wordmark ${className}`}
      data-colored={colored}
      viewBox="0 0 510 240"
      aria-hidden="true"
      focusable="false"
    >
      {KAI_PATHS.map((path, index) => (
        <path key={path} d={path} data-letter={index < 3 ? 'k' : index < 6 ? 'a' : 'i'} />
      ))}
    </svg>
  );
}
