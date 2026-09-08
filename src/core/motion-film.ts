import {
  KAI_STROKES,
  KAI_WIDTH,
  KAI_HEIGHT,
  type IdentityPoint,
  type IdentityStroke,
} from './kai-identity';

export const FILM_DURATION = 11;
export const FILM_CHAPTERS = [
  { time: 0, name: 'Letters' },
  { time: 2.4, name: 'Register' },
  { time: 5.2, name: 'Structure' },
  { time: 8.8, name: 'Enter work' },
] as const;
export const FILM_PALETTES = {
  apricot: { label: 'Apricot', color: '#eeaa82', companion: '#c6bad9' },
  paper: { label: 'Paper', color: '#f7f2e8', companion: '#eeaa82' },
  lilac: { label: 'Lilac', color: '#c6bad9', companion: '#f7f2e8' },
} as const;
export type FilmPalette = keyof typeof FILM_PALETTES;
export const FILM_PROJECTS = [
  {
    id: 'current',
    name: 'Current',
    detail: 'CSV workspace',
    label: 'Open Current, the 100,000-row CSV workspace',
  },
  {
    id: 'field',
    name: 'Field',
    detail: 'GPU study',
    label: 'Open Field, the interactive GPU simulation',
  },
  {
    id: 'relay',
    name: 'Relay',
    detail: 'Queue recovery',
    label: 'Open Relay, the durable queue and recovery lab',
  },
] as const;
export type FilmProject = (typeof FILM_PROJECTS)[number]['id'];
const INK = '#251c2d',
  PAPER = '#f7f2e8';
export const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const filmEase = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const filmChapter = (time: number) =>
  Math.max(
    0,
    FILM_CHAPTERS.findLastIndex((chapter) => time >= chapter.time),
  );
export const filmEntryProgress = (time: number) => filmEase((time - 7.75) / 1.1);
type Point = IdentityPoint;
type Quad = IdentityStroke;
const PULL: readonly Point[] = [
  [-20, 0],
  [14, -16],
  [20, 16],
  [-15, 9],
  [15, 9],
  [0, 22],
  [28, 0],
];
const rect = (x: number, y: number, width: number, height: number): Quad => [
  [x, y],
  [x + width, y],
  [x + width, y + height],
  [x, y + height],
];
function finalBoundaries(width: number, height: number): Quad[] {
  const x = width * 0.065,
    y = height * 0.18,
    w = width * 0.87,
    h = height * 0.64;
  const vertical = width < height * 1.3,
    rule = 1.6;
  return [
    rect(x, y, rule, h),
    rect(x, y, w, rule),
    rect(x, y + h - rule, w, rule),
    vertical ? rect(x, y + h / 3, w, rule) : rect(x + w / 3, y, rule, h),
    vertical ? rect(x, y + (h * 2) / 3, w, rule) : rect(x + (w * 2) / 3, y, rule, h),
    rect(x, y + h + 16, w * 0.16, 2),
    rect(x + w - rule, y, rule, h),
  ];
}
function outline(context: CanvasRenderingContext2D, points: readonly Point[]) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) context.lineTo(points[i][0], points[i][1]);
  context.closePath();
}
// Absolute-time geometry makes backward scrubbing and interrupted chapter changes deterministic.
export function drawFilm(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  playhead: number,
  palette: FilmPalette,
  highlighted: FilmProject | null = null,
) {
  const time = Math.max(0, Math.min(FILM_DURATION, playhead));
  const accent = FILM_PALETTES[palette].color,
    companion = FILM_PALETTES[palette].companion;
  context.fillStyle = INK;
  context.fillRect(0, 0, width, height);
  // Uniform scale keeps the same readable letter geometry from the header to every screen.
  const scale = Math.min((width * 0.79) / KAI_WIDTH, (height * 0.6) / KAI_HEIGHT);
  const x = (width - KAI_WIDTH * scale) / 2,
    y = (height - KAI_HEIGHT * scale) / 2;
  const registration = filmEase((time - 2.4) / 1.05);
  const settle = filmEase((time - 4.65) / 3.5);
  const targets = finalBoundaries(width, height);
  const colors = [accent, accent, accent, PAPER, PAPER, PAPER, companion];
  const shapes = KAI_STROKES.map((stroke, index) => {
    const start = 4.65 + index * 0.095;
    const progress = filmEase((time - start) / (8.15 - start));
    // A small inward preparation precedes the outward registration of each cut.
    const anticipation = Math.sin(Math.PI * clamp((time - 1.75 - index * 0.035) / 0.7)) * -0.15;
    const offset = (registration + anticipation) * (1 - progress);
    return stroke.map(([px, py], corner): Point => {
      const pull = PULL[index];
      const a = x + (px + pull[0] * offset) * scale;
      const b = y + (py + pull[1] * offset) * scale;
      return [
        a + (targets[index][corner][0] - a) * progress,
        b + (targets[index][corner][1] - b) * progress,
      ];
    });
  });
  // Quiet printing guides establish a baseline; there are no dimensional echoes or shadows.
  const guides = filmEase((time - 0.55) / 0.8) * (1 - settle);
  context.globalAlpha = guides * 0.32;
  context.strokeStyle = companion;
  context.lineWidth = 1;
  const reach = ((KAI_WIDTH * scale + 42) * filmEase((time - 0.55) / 1.2)) / 2;
  for (const baseline of [y - 19, y + KAI_HEIGHT * scale + 19]) {
    context.beginPath();
    context.moveTo(width / 2 - reach, baseline);
    context.lineTo(width / 2 + reach, baseline);
    context.stroke();
  }
  context.globalAlpha = 1;
  shapes.forEach((points, index) => {
    outline(context, points);
    context.fillStyle = colors[index];
    context.fill();
  });
  if (highlighted && time > 7.75) {
    const index = FILM_PROJECTS.findIndex((project) => project.id === highlighted);
    const vertical = width < height * 1.3;
    const left = width * 0.065,
      top = height * 0.18,
      w = width * 0.87,
      h = height * 0.64;
    context.strokeStyle = accent;
    context.lineWidth = 2.4;
    context.globalAlpha = filmEntryProgress(time) * 0.8;
    context.strokeRect(
      left + (vertical ? 0 : (w * index) / 3) + 1,
      top + (vertical ? (h * index) / 3 : 0) + 1,
      (vertical ? w : w / 3) - 2,
      (vertical ? h / 3 : h) - 2,
    );
    context.globalAlpha = 1;
  }
}
export function filmState(time: number, palette: FilmPalette, speed: number) {
  const playhead = Math.max(0, Math.min(FILM_DURATION, time));
  return {
    project: 'KAI / Type into system',
    duration: FILM_DURATION,
    time: playhead,
    palette,
    speed,
    chapter: FILM_CHAPTERS[filmChapter(playhead)].name,
    chapters: FILM_CHAPTERS,
    rendering: 'Canvas 2D',
    background: INK,
    conservedStrokes: KAI_STROKES.length,
    transformation: 'Flat KAI strokes → registration → interface boundaries → real project links',
    projects: FILM_PROJECTS.map(({ id, name }) => ({ name, route: `#/${id}` })),
    artwork: 'Original geometric KAI letterforms; no fabricated product preview',
  };
}
