export const FILM_DURATION = 11;
export const FILM_CHAPTERS = [
  { time: 0, name: 'Letters' },
  { time: 2.4, name: 'Tension' },
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
type Point = readonly [number, number];
type Quad = readonly [Point, Point, Point, Point];
// These seven letter strokes remain the same seven shapes through the entire film.
const STROKES: readonly Quad[] = [
  [
    [0, 0],
    [47, 0],
    [47, 240],
    [0, 240],
  ],
  [
    [38, 120],
    [125, 0],
    [185, 0],
    [98, 125],
  ],
  [
    [39, 117],
    [94, 105],
    [196, 240],
    [136, 240],
  ],
  [
    [224, 240],
    [299, 0],
    [345, 0],
    [279, 240],
  ],
  [
    [304, 0],
    [350, 0],
    [429, 240],
    [373, 240],
  ],
  [
    [269, 151],
    [378, 151],
    [391, 193],
    [256, 193],
  ],
  [
    [465, 0],
    [513, 0],
    [513, 240],
    [465, 240],
  ],
];
const PULL: readonly Point[] = [
  [-13, 0],
  [29, -21],
  [35, 20],
  [-15, 12],
  [18, 12],
  [0, 17],
  [30, -8],
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
function outline(context: CanvasRenderingContext2D, points: readonly Point[], bend = 0) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < 4; i++) {
    const a = points[i],
      b = points[(i + 1) % 4];
    const length = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
    const bow = bend * (i % 2 ? -0.28 : 1);
    context.quadraticCurveTo(
      (a[0] + b[0]) / 2 - ((b[1] - a[1]) / length) * bow,
      (a[1] + b[1]) / 2 + ((b[0] - a[0]) / length) * bow,
      b[0],
      b[1],
    );
  }
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
  const sx = Math.min((width * 0.8) / 513, ((height * 0.7) / 240) * 1.05);
  const sy = Math.min((height * 0.7) / 240, sx * 1.7);
  const x = (width - 513 * sx) / 2,
    y = (height - 240 * sy) / 2;
  const tension = filmEase((time - 1.1) / 1.5) * (1 - filmEase((time - 4.7) / 3.2));
  const settle = filmEase((time - 4.55) / 3.6);
  const targets = finalBoundaries(width, height);
  const colors = [PAPER, accent, accent, companion, PAPER, accent, PAPER];
  const shapes = STROKES.map((stroke, index) => {
    const progress = filmEase((time - 4.55 - index * 0.055) / (3.6 - index * 0.055));
    return stroke.map(([px, py], corner): Point => {
      const pull = PULL[index];
      const hinge = index === 1 || index === 2 ? Math.abs(py - 120) / 120 : 0.75;
      const a = x + (px + pull[0] * tension * (0.4 + hinge)) * sx;
      const b = y + (py + pull[1] * tension * (0.4 + hinge)) * sy;
      return [
        a + (targets[index][corner][0] - a) * progress,
        b + (targets[index][corner][1] - b) * progress,
      ];
    });
  });
  // Broad color echoes make the first frame complete; fine echoes open under tension.
  for (let layer = 4; layer >= 1; layer--) {
    shapes.forEach((points, index) => {
      const direction = index < 3 ? -1 : 1;
      const distance = (3.1 + tension * 6.5) * layer * (1 - settle);
      const shifted = points.map(([px, py]): Point => [
        px + distance * direction,
        py - distance * 0.44,
      ]);
      outline(context, shifted, tension * sy * 10 * (1 - settle));
      context.globalAlpha = (0.12 + layer * 0.035) * (1 - settle);
      context.fillStyle = layer % 2 ? companion : accent;
      if (layer === 2 || layer === 4) context.fill();
      context.globalAlpha = (0.23 + layer * 0.055) * (1 - settle);
      context.strokeStyle = layer % 2 ? PAPER : companion;
      context.lineWidth = 0.9;
      context.stroke();
    });
  }
  context.globalAlpha = 1;
  shapes.forEach((points, index) => {
    outline(context, points, tension * sy * 9 * (1 - settle));
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
    conservedStrokes: STROKES.length,
    transformation: 'KAI strokes → tension and echoes → interface boundaries → real project links',
    projects: FILM_PROJECTS.map(({ id, name }) => ({ name, route: `#/${id}` })),
    artwork: 'Original geometric KAI letterforms; no fabricated product preview',
  };
}
