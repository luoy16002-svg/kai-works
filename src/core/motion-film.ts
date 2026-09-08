export const FILM_DURATION = 24;
export const FILM_PARTS = 84;
export const FILM_CHAPTERS = [
  { time: 0, name: 'Assembly' },
  { time: 6, name: 'Flow' },
  { time: 12, name: 'Surface' },
  { time: 18, name: 'Orbit' },
] as const;

export type FilmMaterial = 'apricot' | 'porcelain' | 'lilac';
export const FILM_MATERIALS = {
  apricot: { label: 'Apricot', color: '#eeaa82', metalness: 0.62, roughness: 0.27 },
  porcelain: { label: 'Porcelain', color: '#f7f2e8', metalness: 0.16, roughness: 0.32 },
  lilac: { label: 'Lilac', color: '#c6bad9', metalness: 0.52, roughness: 0.28 },
} as const;

export type BladePose = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
};

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const filmEase = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// Every pose is a function of the same absolute playhead. No simulation history is needed.
export function bladePose(index: number, shot: number, playhead: number): BladePose {
  const time = Math.min(playhead, 23);
  const u = index / FILM_PARTS;
  const angle = u * TAU;
  if (shot === 0) {
    return {
      x: Math.cos(angle) * 1.16,
      y: Math.sin(angle) * 1.16,
      z: Math.sin(angle * 3 + time * 0.42) * 0.13,
      rx: 0.12 * Math.sin(angle),
      ry: 0.28 + 0.18 * Math.sin(angle * 2 + time * 0.55),
      rz: angle - Math.PI / 2,
      sx: 0.88,
      sy: 1,
      sz: 1.15,
    };
  }
  if (shot === 1) {
    const phase = angle - (time - 6) * 0.62;
    return {
      x: (u - 0.5) * 5.65,
      y: Math.sin(phase) * 0.66 + Math.sin(angle * 2) * 0.15,
      z: Math.cos(phase) * 0.62,
      rx: angle * 0.65 + (time - 6) * 0.23,
      ry: -Math.cos(phase) * 0.34,
      rz: Math.atan2(Math.cos(phase) * 0.66 * TAU, 5.65),
      sx: 0.72,
      sy: 1.2,
      sz: 1.35,
    };
  }
  if (shot === 2) {
    const column = index % 14;
    const row = Math.floor(index / 14);
    const phase = column * 0.55 + row * 0.46 - (time - 12) * 1.55;
    return {
      x: (column - 6.5) * 0.34,
      y: (row - 2.5) * 0.43,
      z: Math.sin(phase) * 0.52,
      rx: 0.2 + Math.cos(phase) * 0.45,
      ry: Math.sin(phase) * 0.64,
      rz: -0.12 + Math.cos(phase) * 0.13,
      sx: 1.65,
      sy: 0.31,
      sz: 1.35,
    };
  }
  const settle = filmEase((time - 18) / 4.4);
  return {
    x: Math.cos(angle) * 1.28,
    y: Math.sin(angle) * 1.28,
    z: Math.sin(angle * 2) * (0.25 + 0.18 * settle),
    rx: Math.sin(angle) * 0.23,
    ry: angle * 0.5 + 0.2 + (1 - settle) * Math.sin(angle * 2 + time) * 0.18,
    rz: angle - Math.PI / 2,
    sx: 0.91,
    sy: 1,
    sz: 1.3,
  };
}

export function filmTransition(time: number, index = 0) {
  const transitions = [
    { start: 4.2, end: 6, from: 0, to: 1 },
    { start: 10.15, end: 12, from: 1, to: 2 },
    { start: 16.15, end: 18, from: 2, to: 3 },
  ];
  let shot = 0;
  for (const transition of transitions) {
    if (time < transition.start) break;
    if (time >= transition.end) {
      shot = transition.to;
      continue;
    }
    // A short travelling delay gives each handoff a controlled leading edge.
    const stagger = (index / (FILM_PARTS - 1)) * 0.24;
    return {
      from: transition.from,
      to: transition.to,
      mix: filmEase(
        (time - transition.start - stagger) / (transition.end - transition.start - 0.24),
      ),
    };
  }
  return { from: shot, to: shot, mix: 0 };
}

const CAMERA_KEYS = [
  { t: 0, x: 0.9, y: 0.5, z: 5.7 },
  { t: 2.8, x: 1.9, y: 1.15, z: 6.25 },
  { t: 4.2, x: 3.1, y: 1.65, z: 7.3 },
  { t: 6, x: 0.5, y: 2.05, z: 8.4 },
  { t: 9.8, x: -2.7, y: 1.35, z: 7.8 },
  { t: 12, x: 2.45, y: 3.4, z: 7.8 },
  { t: 15.7, x: 3.6, y: 2.65, z: 6.7 },
  { t: 18, x: -1.1, y: 1.1, z: 7.1 },
  { t: 23, x: 2.35, y: 1.2, z: 6.6 },
  { t: 24, x: 2.35, y: 1.2, z: 6.6 },
];

export function filmCamera(time: number) {
  const end = CAMERA_KEYS.findIndex((key) => key.t > time);
  if (end < 1) return CAMERA_KEYS[end === -1 ? CAMERA_KEYS.length - 1 : 0];
  const a = CAMERA_KEYS[end - 1];
  const b = CAMERA_KEYS[end];
  const progress = filmEase((time - a.t) / (b.t - a.t));
  return {
    x: a.x + (b.x - a.x) * progress,
    y: a.y + (b.y - a.y) * progress,
    z: a.z + (b.z - a.z) * progress,
  };
}

export function filmState(playhead: number, material: FilmMaterial, speed: number) {
  const time = Math.max(0, Math.min(FILM_DURATION, playhead));
  return {
    project: 'FORM / 01',
    duration: FILM_DURATION,
    time,
    material,
    speed,
    parts: FILM_PARTS,
    chapter: FILM_CHAPTERS[Math.min(3, Math.floor(time / 6))].name,
    camera: filmCamera(time),
    chapters: FILM_CHAPTERS,
    instances: Array.from({ length: FILM_PARTS }, (_, index) => {
      const transition = filmTransition(time, index);
      return {
        index,
        transition,
        from: bladePose(index, transition.from, time),
        to: bladePose(index, transition.to, time),
      };
    }),
  };
}
