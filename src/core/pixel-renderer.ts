import { GROUND_Y, SEGMENT_WIDTH, type PixelWorld, type RouteSegment } from './pixel-world';

/** Original PAPER ROUTE 16 palette. Light comes from the upper left.
 * Art is drawn on a 16px / 32px grid and displayed at integer scale.
 * Nine sprite types, packed into a 512×128 atlas with 1px frame padding.
 */
export const COURIER_PALETTE = {
  ink: '#3d3047',
  plum: '#66566f',
  mauve: '#957f96',
  lilac: '#bba6c7',
  haze: '#d8c9d8',
  paper: '#f4ead8',
  cream: '#fff5df',
  peach: '#e8b59d',
  clay: '#cd8e83',
  coral: '#b86167',
  ochre: '#d6ac70',
  gold: '#efce8d',
  sage: '#9aaa8c',
  pine: '#647d74',
  teal: '#83a6a3',
  mist: '#b5c7bd',
} as const;
const P = COURIER_PALETTE;
type C = CanvasRenderingContext2D;
type Frame = { x: number; y: number; w: number; h: number };
const frame = (index: number, size = 16): Frame => ({
  x: (index % 14) * 34 + 1,
  y: Math.floor(index / 14) * 34 + 1,
  w: size,
  h: size,
});
export const COURIER_ART_METADATA = {
  palette: Object.values(P),
  colorCount: 16,
  atlas: { width: 512, height: 128, padding: 1 },
  grid: 16,
  filtering: 'nearest',
  light: 'upper-left',
  sprites: {
    courier: {
      size: [16, 16],
      origin: [8, 16],
      frames: Array.from({ length: 9 }, (_, i) => frame(i)),
      states: { idle: [0, 1], run: [2, 3, 4, 5], rise: [6], fall: [7], land: [8] },
      runDurationsMs: [100, 67, 100, 67],
    },
    parcel: { frames: [frame(9)], size: [16, 16] },
    postbox: { frames: [frame(10, 32)], size: [32, 32] },
    crate: { frames: [frame(11)], size: [16, 16] },
    flower: { frames: [frame(12)], size: [16, 16] },
    shrub: { frames: [frame(13, 32)], size: [32, 32] },
    bird: { frames: [frame(14), frame(15)], size: [16, 16] },
    lamp: { frames: [frame(16, 32)], size: [32, 32] },
    earth: { frames: [frame(17)], size: [16, 16] },
  },
} as const;

function rect(c: C, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function courier(c: C, pose: number) {
  const bob = pose === 3 || pose === 5 ? -1 : pose === 8 ? 1 : 0;
  // Cap, brim, hair, face and a two-pixel scarf make the silhouette legible at 1×.
  rect(c, P.ink, 5, 1 + bob, 7, 4);
  rect(c, P.coral, 5, 1 + bob, 6, 3);
  rect(c, P.clay, 6, 1 + bob, 4, 1);
  rect(c, P.coral, 4, 3 + bob, 10, 2);
  rect(c, P.ink, 6, 5 + bob, 6, 4);
  rect(c, P.peach, 7, 5 + bob, 5, 3);
  rect(c, P.cream, 8, 5 + bob, 3, 1);
  rect(c, P.ink, 11, 6 + bob, 1, 1);
  rect(c, P.gold, 5, 8 + bob, 7, 2);
  rect(c, P.ochre, 3, 9 + bob, 4, 2);
  rect(c, P.ink, 5, 10 + bob, 7, 4);
  rect(c, P.pine, 6, 10 + bob, 5, 3);
  rect(c, P.teal, 6, 10 + bob, 2, 2);
  // Satchel, with a separate 2px strap and highlighted flap.
  rect(c, P.ink, 2, 8 + bob, 4, 5);
  rect(c, P.clay, 2, 9 + bob, 3, 3);
  rect(c, P.peach, 2, 8 + bob, 3, 1);
  rect(c, P.peach, 11, 11 + bob, 2, 2);
  if (pose === 6 || pose === 7) {
    rect(c, P.ink, 5, 13, 3, 2);
    rect(c, P.ink, 10, 12, 3, 2);
    rect(c, P.cream, 5, 14, 3, 1);
    rect(c, P.cream, 11, 13, 3, 1);
  } else if (pose === 2 || pose === 4) {
    const swing = pose === 2 ? 0 : 1;
    rect(c, P.ink, 4 + swing, 13, 3, 3);
    rect(c, P.ink, 10 - swing, 13, 3, 2);
    rect(c, P.cream, 3 + swing, 15, 4, 1);
    rect(c, P.cream, 10 - swing, 14, 4, 1);
  } else {
    rect(c, P.ink, 6, 13 + Math.min(bob, 0), 3, 3);
    rect(c, P.ink, 10, 13 + Math.min(bob, 0), 2, 3);
    rect(c, P.cream, 6, 15, 3, 1);
    rect(c, P.cream, 10, 15, 3, 1);
  }
  if (pose === 1) rect(c, P.peach, 11, 6 + bob, 1, 1);
}

function atlasAsset(c: C, index: number) {
  if (index < 9) return courier(c, index);
  if (index === 9) {
    rect(c, P.ink, 3, 5, 10, 9);
    rect(c, P.ochre, 4, 6, 8, 7);
    rect(c, P.gold, 4, 6, 8, 2);
    rect(c, P.cream, 7, 6, 2, 7);
    rect(c, P.clay, 10, 9, 2, 3);
    rect(c, P.cream, 5, 2, 2, 1);
  } else if (index === 10) {
    rect(c, P.ink, 14, 17, 3, 15);
    rect(c, P.clay, 15, 18, 1, 13);
    rect(c, P.ink, 6, 6, 19, 14);
    rect(c, P.coral, 7, 7, 17, 11);
    rect(c, P.clay, 8, 7, 14, 3);
    rect(c, P.cream, 10, 11, 10, 2);
    rect(c, P.ink, 11, 11, 8, 1);
    rect(c, P.ochre, 23, 2, 2, 10);
    rect(c, P.gold, 24, 2, 5, 4);
    rect(c, P.cream, 10, 15, 3, 1);
  } else if (index === 11) {
    rect(c, P.ink, 0, 0, 16, 16);
    rect(c, P.ochre, 1, 1, 14, 14);
    rect(c, P.gold, 1, 1, 14, 2);
    rect(c, P.clay, 12, 3, 3, 12);
    rect(c, P.plum, 2, 3, 1, 11);
    rect(c, P.plum, 2, 13, 11, 1);
    for (let i = 0; i < 5; i++) rect(c, P.clay, 3 + i * 2, 3 + i * 2, 2, 2);
    rect(c, P.gold, 2, 8, 12, 2);
  } else if (index === 12) {
    rect(c, P.pine, 7, 7, 2, 9);
    rect(c, P.sage, 4, 11, 4, 2);
    rect(c, P.pine, 9, 10, 3, 2);
    rect(c, P.coral, 5, 4, 6, 2);
    rect(c, P.coral, 4, 6, 8, 2);
    rect(c, P.clay, 5, 8, 6, 2);
    rect(c, P.gold, 7, 6, 2, 2);
  } else if (index === 13) {
    rect(c, P.pine, 2, 23, 28, 9);
    rect(c, P.sage, 4, 17, 10, 13);
    rect(c, P.sage, 12, 13, 10, 17);
    rect(c, P.sage, 21, 20, 8, 10);
    rect(c, P.mist, 6, 18, 6, 3);
    rect(c, P.mist, 14, 14, 6, 3);
    rect(c, P.pine, 15, 26, 9, 5);
    rect(c, P.gold, 6, 25, 2, 2);
  } else if (index === 14 || index === 15) {
    rect(c, P.plum, 5, 8, 7, 3);
    rect(c, P.cream, 6, 8, 5, 1);
    rect(c, P.plum, 11, 6, 3, 3);
    rect(c, P.ochre, 14, 7, 2, 1);
    rect(c, P.plum, 2, index === 14 ? 4 : 10, 5, 2);
    rect(c, P.plum, 4, index === 14 ? 6 : 9, 4, 2);
  } else if (index === 16) {
    rect(c, P.plum, 14, 9, 2, 23);
    rect(c, P.ink, 11, 31, 8, 1);
    rect(c, P.plum, 9, 2, 12, 2);
    rect(c, P.plum, 11, 0, 8, 2);
    rect(c, P.plum, 10, 4, 10, 7);
    rect(c, P.gold, 12, 4, 6, 5);
    rect(c, P.cream, 12, 4, 2, 4);
    rect(c, P.plum, 14, 4, 1, 5);
  } else {
    rect(c, P.plum, 0, 0, 16, 16);
    rect(c, P.mauve, 2, 3, 6, 2);
    rect(c, P.mauve, 10, 11, 4, 2);
    rect(c, P.ink, 1, 13, 3, 1);
    rect(c, P.ink, 11, 5, 2, 1);
  }
}

function makeAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  if (!c) return null;
  c.imageSmoothingEnabled = false;
  for (let i = 0; i < 18; i++) {
    const f = frame(i);
    c.save();
    c.translate(f.x, f.y);
    atlasAsset(c, i);
    c.restore();
  }
  return canvas;
}

const LETTERS: Record<string, string[]> = {
  P: ['110', '101', '110', '100', '100'],
  O: ['010', '101', '101', '101', '010'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['110', '001', '010', '100', '111'],
  '3': ['110', '001', '010', '001', '110'],
  '+': ['000', '010', '111', '010', '000'],
};
function pixelText(c: C, text: string, x: number, y: number, color: string) {
  [...text].forEach((char, i) =>
    LETTERS[char]?.forEach((row, ry) =>
      [...row].forEach((v, rx) => {
        if (v === '1') rect(c, color, x + i * 4 + rx, y + ry, 1, 1);
      }),
    ),
  );
}

function cloud(c: C, x: number, y: number, color: string) {
  rect(c, color, x + 8, y, 19, 5);
  rect(c, color, x + 2, y + 5, 36, 5);
  rect(c, color, x, y + 10, 46, 4);
  rect(c, color, x + 9, y + 14, 29, 2);
}

function townHouse(c: C, x: number, floor: number, variant: number, distant = false) {
  const w = distant ? 44 : 64;
  const h = distant ? 34 + variant * 7 : 51 + variant * 5;
  const y = floor - h;
  const wall = distant ? P.peach : P.peach;
  const roof = distant ? P.mauve : P.plum;
  rect(c, wall, x + 3, y, w - 6, h);
  rect(c, distant ? P.clay : P.clay, x + w - 12, y, 9, h);
  for (let step = 0; step < 5; step++)
    rect(c, roof, x - 2 + step * 4, y - step * 3, w + 4 - step * 8, 3);
  rect(c, distant ? P.clay : P.coral, x + 11, y - 14, w - 22, 2);
  rect(c, roof, x + w - 15, y - 20, 6, 14);
  rect(c, P.clay, x + w - 14, y - 19, 2, 10);
  rect(c, P.cream, x + 7, y + 2, 3, h - 3);
  for (let i = 0; i < (distant ? 2 : 3); i++) {
    const wx = x + 12 + i * 14;
    rect(c, roof, wx, y + 8, 9, 12);
    rect(c, distant ? P.haze : P.gold, wx + 2, y + 10, 5, 8);
    rect(c, P.cream, wx + 4, y + 10, 1, 8);
    rect(c, P.cream, wx + 2, y + 13, 5, 1);
    rect(c, P.clay, wx - 1, y + 20, 11, 2);
  }
  if (distant) {
    rect(c, P.mauve, x + 18, floor - 16, 10, 16);
    return;
  }
  rect(c, P.ink, x + 27, floor - 23, 14, 23);
  rect(c, P.pine, x + 29, floor - 21, 10, 21);
  rect(c, P.teal, x + 30, floor - 20, 4, 11);
  rect(c, P.gold, x + 36, floor - 10, 2, 2);
  rect(c, P.ochre, x + 9, floor - 28, 45, 8);
  rect(c, P.plum, x + 8, floor - 21, 48, 2);
  for (let i = 0; i < 7; i++)
    rect(c, i % 2 ? P.cream : P.coral, x + 10 + i * 6, floor - 28, 6, 7 + (i % 2));
  rect(c, P.cream, x + 25, y - 2, 20, 9);
  pixelText(c, 'POST', x + 27, y, P.plum);
  rect(c, P.mauve, x + 25, floor - 1, 19, 3);
  rect(c, P.paper, x + 24, floor - 1, 20, 1);
  rect(c, P.coral, x + 10, floor - 7, 9, 7);
  rect(c, P.pine, x + 11, floor - 12, 6, 5);
  rect(c, P.sage, x + 9, floor - 14, 5, 5);
  rect(c, P.sage, x + 15, floor - 16, 4, 8);
}

export type CourierRenderer = {
  draw(world: PixelWorld): void;
  resize(width: number, height: number): void;
};

export function createCourierRenderer(canvas: HTMLCanvasElement): CourierRenderer | null {
  let c: C | null;
  try {
    c = canvas.getContext('2d', { alpha: false });
  } catch {
    return null;
  }
  const atlas = makeAtlas();
  if (!c || !atlas) return null;
  const ctx = c;
  let width = 360;
  let height = 180;
  const stamp = (index: number, x: number, y: number, size = 16, flip = false) => {
    const f = frame(index, size);
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(x) + size, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(atlas, f.x, f.y, f.w, f.h, 0, 0, size, size);
      ctx.restore();
    } else ctx.drawImage(atlas, f.x, f.y, f.w, f.h, Math.round(x), Math.round(y), size, size);
  };

  function drawTerrain(segment: RouteSegment, camera: number, yOffset: number, tick: number) {
    const gapX = segment.gap.start - camera;
    const ground = GROUND_Y + yOffset;
    const gapW = segment.gap.end - segment.gap.start;
    rect(ctx, P.teal, gapX, ground + 23, gapW, height - ground);
    rect(ctx, P.mist, gapX, ground + 24, gapW, 2);
    for (let i = 0; i < 3; i++) {
      const waterX = gapX + ((i * 11 + Math.floor(tick / 10)) % Math.max(4, gapW - 7));
      rect(ctx, P.paper, waterX, ground + 29 + i * 6, 5, 1);
    }
    for (const solid of segment.solids) {
      const x = Math.round(solid.x - camera);
      const y = Math.round(solid.y + yOffset);
      if (x > width || x + solid.width < 0) continue;
      if (solid.kind === 'crate') {
        stamp(11, x, y);
        continue;
      }
      rect(ctx, P.plum, x, y, solid.width, height - y);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, solid.width, height - y);
      ctx.clip();
      for (
        let tx = Math.max(0, Math.floor(-x / 16)) * 16;
        tx < solid.width && x + tx < width;
        tx += 16
      ) {
        for (let ty = 6; y + ty < height; ty += 16) stamp(17, x + tx, y + ty);
      }
      ctx.restore();
      rect(ctx, P.mauve, x, y + 5, solid.width, 2);
      rect(ctx, P.ochre, x, y, solid.width, 5);
      rect(ctx, P.paper, x, y, solid.width, 2);
      for (let d = 8; d < solid.width - 5; d += 23) rect(ctx, P.clay, x + d, y + 3, 6, 1);
      // Exposed cliff sides have a broken stone profile and roots.
      if (solid.kind === 'earth') {
        rect(ctx, P.ink, x, y + 7, 3, height - y);
        rect(ctx, P.ink, x + solid.width - 3, y + 7, 3, height - y);
        rect(ctx, P.sage, x + 2, y - 2, 7, 2);
        rect(ctx, P.sage, x + solid.width - 10, y - 2, 8, 2);
        rect(ctx, P.pine, x + solid.width - 7, y + 2, 2, 10);
      }
    }
  }

  function draw(world: PixelWorld) {
    const camera = Math.floor(world.camera);
    const ground = height - Math.max(30, Math.floor(height * 0.21));
    const yOffset = ground - GROUND_Y;
    const time = world.tick;
    ctx.imageSmoothingEnabled = false;
    rect(ctx, P.paper, 0, 0, width, height);
    // An angular sun, cream clouds and two stepped hills stay inside the palette.
    const sunX = width - 58;
    rect(ctx, P.gold, sunX + 4, 18, 16, 24);
    rect(ctx, P.gold, sunX, 22, 24, 16);
    rect(ctx, P.cream, sunX + 4, 18, 12, 2);
    for (let i = -1; i < Math.ceil(width / 115) + 2; i++) {
      const drift = Math.floor(camera * 0.12 + time / 180);
      const x = i * 115 - (drift % 115);
      cloud(ctx, x, 12 + ((i + 12) % 3) * 10, P.cream);
    }
    for (let layer = 0; layer < 2; layer++) {
      const parallax = camera * (layer ? 0.29 : 0.17);
      const color = layer ? P.lilac : P.haze;
      for (let x = -8; x < width + 8; x += 8) {
        const phase = (x + parallax) / (layer ? 47 : 68);
        const hill = Math.round(
          (Math.sin(phase) * 0.6 + Math.sin(phase * 0.43) * 0.4) * (layer ? 14 : 19),
        );
        const y = ground - (layer ? 34 : 53) + hill;
        rect(ctx, color, x, y, 8, height - y);
      }
    }
    const townScroll = Math.floor(camera * 0.55);
    for (
      let i = Math.floor(townScroll / 155) - 1;
      i < Math.ceil((townScroll + width) / 155) + 1;
      i++
    ) {
      const x = i * 155 - townScroll;
      townHouse(ctx, x + 19, ground - 8, ((i % 3) + 3) % 3, true);
      rect(ctx, P.mauve, x + 91, ground - 26, 3, 18);
      rect(ctx, P.mist, x + 80, ground - 42, 23, 13);
      rect(ctx, P.mist, x + 86, ground - 48, 13, 24);
      rect(ctx, P.sage, x + 94, ground - 38, 11, 12);
    }
    // Tiny migrating bird pairs and drifting seed-pixels; time stops with physics.
    const birdX =
      ((((time / 7 + 90 - camera * 0.08) % (width + 50)) + width + 50) % (width + 50)) - 25;
    stamp(14 + (Math.floor(time / 14) % 2), birdX, Math.max(23, ground - 99));
    stamp(14 + (Math.floor(time / 14 + 1) % 2), birdX - 18, Math.max(29, ground - 93));

    for (const segment of world.segments) {
      if (segment.start > camera + width + 70 || segment.start + SEGMENT_WIDTH < camera - 70)
        continue;
      const sx = segment.start - camera;
      // A rope footbridge sits behind the stream; the route itself has a real gap.
      const gapX = segment.gap.start - camera;
      const gapWidth = segment.gap.end - segment.gap.start;
      for (let p = 0; p <= gapWidth; p += 7) rect(ctx, P.mauve, gapX + p, ground + 12, 2, 15);
      rect(ctx, P.clay, gapX - 4, ground + 11, gapWidth + 8, 2);
      stamp(13, sx + 7, ground - 32, 32);
      stamp(12, sx + 32, ground - 16);
      stamp(16, sx + 119, ground - 32, 32);
      // Delivery houses are tied to the world, so the courier reaches a real door.
      townHouse(ctx, sx + 339, ground, segment.variant);
      for (let f = 0; f < 3; f++) stamp(12, sx + 412 + f * 8, ground - 16);
      drawTerrain(segment, camera, yOffset, time);
      for (const parcel of segment.parcels) {
        if (!parcel.collected) {
          const bob = Math.floor(time / 20) % 2;
          stamp(9, parcel.x - camera - 8, parcel.y + yOffset - 9 - bob);
        }
      }
      stamp(10, sx + 309, ground - 32, 32);
      if (segment.delivered) {
        rect(ctx, P.cream, sx + 365, ground - 76, 19, 12);
        rect(ctx, P.cream, sx + 371, ground - 64, 3, 3);
        rect(ctx, P.pine, sx + 369, ground - 70, 3, 2);
        rect(ctx, P.pine, sx + 371, ground - 68, 3, 2);
        rect(ctx, P.pine, sx + 373, ground - 70, 3, 2);
        rect(ctx, P.pine, sx + 375, ground - 72, 3, 2);
      }
    }
    for (const mote of world.motes)
      rect(
        ctx,
        mote.kind === 'dust' ? P.peach : P.gold,
        mote.x - camera,
        mote.y + yOffset,
        mote.life < 10 ? 1 : 2,
        1 + Number(mote.kind === 'parcel'),
      );
    const px = Math.round(world.x - camera);
    const py = Math.round(world.y + yOffset);
    if (world.grounded) rect(ctx, P.mauve, px - 7, py, 14, 2);
    const runPhase = world.tick % 20;
    const runFrame = runPhase < 6 ? 2 : runPhase < 10 ? 3 : runPhase < 16 ? 4 : 5;
    const pose = !world.grounded
      ? world.vy < 0
        ? 6
        : 7
      : world.landing
        ? 8
        : Math.abs(world.vx) > 10
          ? runFrame
          : Math.floor(world.tick / 100) % 2;
    stamp(pose, px - 8, py - 16, 16, world.facing < 0);
    if (world.carried) {
      rect(ctx, P.gold, px - world.facing * 6 - 2, py - 8, 4, 4);
      rect(ctx, P.cream, px - world.facing * 6, py - 8, 1, 4);
    }
    for (let i = 0; i < 5; i++) {
      const seedX =
        (((i * 79 + Math.floor(time / (7 + i)) - camera * 0.4) % (width + 15)) + width + 15) %
        (width + 15);
      const seedY = 33 + ((i * 23 + Math.floor(time / 37)) % Math.max(30, ground - 42));
      rect(ctx, P.cream, seedX, seedY, 2, 1);
    }
    canvas.dataset.tick = String(world.tick);
    canvas.dataset.worldX = world.x.toFixed(2);
    canvas.dataset.worldY = world.y.toFixed(2);
    canvas.dataset.returns = String(world.returns);
  }

  return {
    draw,
    resize(cssWidth, cssHeight) {
      // Crop at most one scale-unit at the edges; every artwork pixel is an integer block.
      const scale = Math.max(2, Math.floor(Math.min(cssWidth / 300, cssHeight / 145)));
      width = Math.max(100, Math.ceil(cssWidth / scale));
      height = Math.max(90, Math.ceil(cssHeight / scale));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width * scale}px`;
      canvas.style.height = `${height * scale}px`;
      ctx.imageSmoothingEnabled = false;
    },
  };
}
