import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const TAU = Math.PI * 2;
const SLICES = 176;
const STRANDS = 32;
const PAPER = [247, 242, 232];
const APRICOT = [238, 170, 130];
const LILAC = [198, 186, 217];
const INK = [37, 28, 45];
type Point = { x: number; y: number; z: number };
type Edge = { left: Point; right: Point; depth: number };
type Band = { a: Edge; b: Edge; depth: number; color: string; fill: string };

const mix = (a: number[], b: number[], amount: number) =>
  a.map((value, index) => Math.round(value + (b[index] - value) * amount));
const rgb = (color: number[]) => `rgb(${color.join(',')})`;

// A ruled ribbon follows a trefoil, with a half twist across its closed path.
// Each section has two edges; the fine parallel strands interpolate between them.
function sculpture(time: number, pointerX = 0, pointerY = 0): Band[] {
  const edges: Edge[] = [];
  const rx = 0.76 + Math.sin(time * 0.19) * 0.13 + pointerY * 0.13;
  const ry = -0.2 + Math.sin(time * 0.16) * 0.3 + pointerX * 0.18;
  const rz = -0.43 + Math.sin(time * 0.12) * 0.18;
  const cx = Math.cos(rx),
    sx = Math.sin(rx);
  const cy = Math.cos(ry),
    sy = Math.sin(ry);
  const cz = Math.cos(rz),
    sz = Math.sin(rz);
  const project = (x: number, y: number, z: number): Point => {
    const y1 = y * cx - z * sx;
    const z1 = y * sx + z * cx;
    const x2 = x * cy + z1 * sy;
    const z2 = -x * sy + z1 * cy;
    const x3 = x2 * cz - y1 * sz;
    const y3 = x2 * sz + y1 * cz;
    const perspective = 8.5 / (8.5 - z2);
    return { x: 310 + x3 * 91 * perspective, y: 302 + y3 * 91 * perspective, z: z2 };
  };
  for (let index = 0; index <= SLICES; index++) {
    const t = (index / SLICES) * TAU;
    const c2 = Math.cos(t * 2),
      s2 = Math.sin(t * 2);
    const c3 = Math.cos(t * 3),
      s3 = Math.sin(t * 3);
    const radius = 1.62 + 0.61 * c3;
    const x = radius * c2;
    const y = radius * s2;
    const z = 0.78 * s3;
    let tx = -1.83 * s3 * c2 - radius * 2 * s2;
    let ty = -1.83 * s3 * s2 + radius * 2 * c2;
    let tz = 2.34 * c3;
    const tangentLength = Math.hypot(tx, ty, tz);
    tx /= tangentLength;
    ty /= tangentLength;
    tz /= tangentLength;
    const dot = c2 * tx + s2 * ty;
    let nx = c2 - dot * tx,
      ny = s2 - dot * ty,
      nz = -dot * tz;
    const normalLength = Math.hypot(nx, ny, nz);
    nx /= normalLength;
    ny /= normalLength;
    nz /= normalLength;
    const bx = ty * nz - tz * ny;
    const by = tz * nx - tx * nz;
    const bz = tx * ny - ty * nx;
    const twist = t * 0.5 + 0.3 * Math.sin(t * 2 + time * 0.22) + 0.42;
    const width = 0.68 + 0.07 * Math.sin(t * 3 - time * 0.26);
    const u = Math.cos(twist) * width,
      v = Math.sin(twist) * width;
    const dx = nx * u + bx * v,
      dy = ny * u + by * v,
      dz = nz * u + bz * v;
    const left = project(x - dx, y - dy, z - dz);
    const right = project(x + dx, y + dy, z + dz);
    edges.push({ left, right, depth: (left.z + right.z) / 2 });
  }
  return edges
    .slice(0, -1)
    .map((a, index) => {
      const b = edges[index + 1];
      const depth = (a.depth + b.depth) / 2;
      const light = Math.max(0, Math.min(1, (depth + 2.5) / 5));
      const hue =
        light > 0.63
          ? mix(APRICOT, PAPER, (light - 0.63) * 1.6)
          : mix(LILAC, APRICOT, Math.min(1, light * 2.4));
      return {
        a,
        b,
        depth,
        color: rgb(mix(INK, hue, 0.36 + light * 0.64)),
        fill: rgb(mix(INK, hue, 0.065 + light * 0.115)),
      };
    })
    .sort((a, b) => a.depth - b.depth);
}

function bandOutline({ a, b }: Band) {
  return `M${a.left.x.toFixed(2)},${a.left.y.toFixed(2)}L${b.left.x.toFixed(2)},${b.left.y.toFixed(2)}L${b.right.x.toFixed(2)},${b.right.y.toFixed(2)}L${a.right.x.toFixed(2)},${a.right.y.toFixed(2)}Z`;
}

function bandStrands({ a, b }: Band) {
  let path = '';
  for (let strand = 0; strand <= STRANDS; strand++) {
    const s = strand / STRANDS;
    path += `M${(a.left.x + (a.right.x - a.left.x) * s).toFixed(2)},${(a.left.y + (a.right.y - a.left.y) * s).toFixed(2)}L${(b.left.x + (b.right.x - b.left.x) * s).toFixed(2)},${(b.left.y + (b.right.y - b.left.y) * s).toFixed(2)}`;
  }
  return path;
}

const still = sculpture(0).map((band) => ({
  ...band,
  outline: bandOutline(band),
  strands: bandStrands(band),
}));

export default function KineticArtwork({ active = true }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<(() => void) | null>(null);
  const [paused, setPaused] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [ready, setReady] = useState(false);
  const pausedRef = useRef(paused);
  const activeRef = useRef(active);
  pausedRef.current = paused;
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const frameElement = frameRef.current!;
    let context: CanvasRenderingContext2D | null;
    try {
      context = canvas.getContext('2d', { alpha: false });
    } catch {
      return;
    }
    if (!context) return;
    const ctx = context;
    let frame = 0,
      previous = 0,
      lastPaint = 0,
      elapsed = 0;
    let width = 1,
      height = 1,
      dpr = 1;
    let pointerX = 0,
      pointerY = 0,
      targetX = 0,
      targetY = 0;
    let failed = false;
    const bounds = frameElement.getBoundingClientRect();
    let visible = bounds.bottom > 0 && bounds.top < window.innerHeight;

    const draw = () => {
      if (failed) return;
      try {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#251c2d';
        ctx.fillRect(0, 0, width, height);
        const scale = Math.min(width / 620, height / 600);
        ctx.translate((width - 620 * scale) / 2, (height - 600 * scale) / 2);
        ctx.scale(scale, scale);
        ctx.lineWidth = 1.05;
        ctx.lineCap = 'round';
        for (const band of sculpture(elapsed, pointerX, pointerY)) {
          const { a, b } = band;
          ctx.beginPath();
          ctx.moveTo(a.left.x, a.left.y);
          ctx.lineTo(b.left.x, b.left.y);
          ctx.lineTo(b.right.x, b.right.y);
          ctx.lineTo(a.right.x, a.right.y);
          ctx.closePath();
          ctx.fillStyle = band.fill;
          ctx.fill();
          ctx.beginPath();
          for (let strand = 0; strand <= STRANDS; strand++) {
            const s = strand / STRANDS;
            ctx.moveTo(
              a.left.x + (a.right.x - a.left.x) * s,
              a.left.y + (a.right.y - a.left.y) * s,
            );
            ctx.lineTo(
              b.left.x + (b.right.x - b.left.x) * s,
              b.left.y + (b.right.y - b.left.y) * s,
            );
          }
          ctx.strokeStyle = band.color;
          ctx.stroke();
        }
      } catch {
        failed = true;
        cancelAnimationFrame(frame);
        setReady(false);
      }
    };
    const canAnimate = () =>
      activeRef.current && !pausedRef.current && visible && !document.hidden && !failed;
    const tick = (now: number) => {
      frame = 0;
      if (!canAnimate()) return;
      // The form changes slowly; 30 fps avoids unnecessary work on high-refresh screens.
      if (now - lastPaint >= 32) {
        elapsed += previous ? Math.min(0.06, (now - previous) / 1000) : 0;
        previous = now;
        lastPaint = now;
        pointerX += (targetX - pointerX) * 0.075;
        pointerY += (targetY - pointerY) * 0.075;
        draw();
      }
      if (canAnimate()) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (canAnimate()) {
        if (!frame) {
          previous = 0;
          frame = requestAnimationFrame(tick);
        }
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      }
    };
    syncRef.current = sync;
    const resize = () => {
      const rect = frameElement.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw();
    };
    resize();
    if (!failed) setReady(true);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frameElement);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    intersection.observe(frameElement);
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || pausedRef.current) return;
      const rect = frameElement.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const leave = () => {
      targetX = 0;
      targetY = 0;
    };
    const lost = (event: Event) => {
      event.preventDefault();
      failed = true;
      setReady(false);
      sync();
    };
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preferenceChanged = () => {
      if (preference.matches) {
        pausedRef.current = true;
        setPaused(true);
        sync();
      }
    };
    preference.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', sync);
    frameElement.addEventListener('pointermove', move, { passive: true });
    frameElement.addEventListener('pointerleave', leave);
    canvas.addEventListener('contextlost', lost);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      syncRef.current = null;
      resizeObserver.disconnect();
      intersection.disconnect();
      preference.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', sync);
      frameElement.removeEventListener('pointermove', move);
      frameElement.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('contextlost', lost);
    };
  }, []);

  useEffect(() => {
    syncRef.current?.();
  }, [paused, active]);

  return (
    <figure className="kinetic-artwork">
      <div
        className="kinetic-art-frame"
        ref={frameRef}
        data-canvas-ready={ready}
        role="img"
        aria-label="An original apricot ribbon folds through itself in three dimensions, its fine curved strands slowly shifting with the pointer."
      >
        <svg className="kinetic-still" viewBox="0 0 620 600" fill="none" aria-hidden="true">
          {still.map((band, index) => (
            <g key={index}>
              <path d={band.outline} fill={band.fill} />
              <path d={band.strands} stroke={band.color} strokeWidth="1.05" strokeLinecap="round" />
            </g>
          ))}
        </svg>
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      <figcaption>
        <span>
          FORM STUDY 001 <i>/</i> ALWAYS BECOMING
        </span>
        {ready ? (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            aria-label={paused ? 'Play artwork motion' : 'Pause artwork motion'}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? 'Play artwork' : 'Pause artwork'}
          </button>
        ) : (
          <span className="kinetic-static-label">STATIC STUDY</span>
        )}
      </figcaption>
    </figure>
  );
}
