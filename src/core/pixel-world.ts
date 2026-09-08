/** Little deliveries. Deterministic 60 Hz platform physics, in logical pixels.
 * The route retains five segments and 24 recent events; there is no level reset.
 */
export const PIXEL_STEP = 1 / 60;
export const SEGMENT_WIDTH = 448;
export const GROUND_Y = 188;
export const COURIER_SPEED = 76;
export const COURIER_HALF_WIDTH = 5;
export const COURIER_HEIGHT = 15;
const GRAVITY = 580;
const JUMP_SPEED = 210;

export type CourierInput = { left: boolean; right: boolean; jump: boolean };
export type CourierMode = 'demo' | 'manual';
export type WorldSolid = {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'earth' | 'step' | 'crate';
};
export type RouteSegment = {
  index: number;
  variant: number;
  start: number;
  gap: { start: number; end: number };
  solids: WorldSolid[];
  parcels: { x: number; y: number; collected: boolean }[];
  deliveryX: number;
  delivered: boolean;
};
export type CourierEvent = {
  tick: number;
  type: 'pickup' | 'delivery' | 'return';
  x: number;
  count: number;
};
export type PixelWorld = {
  tick: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  grounded: boolean;
  coyote: number;
  jumpHeld: boolean;
  landing: number;
  carried: number;
  pickups: number;
  deliveredParcels: number;
  deliveries: number;
  returns: number;
  checkpoint: number;
  camera: number;
  distance: number;
  segments: RouteSegment[];
  events: CourierEvent[];
  motes: { x: number; y: number; life: number; kind: 'dust' | 'parcel' }[];
};

export const EMPTY_COURIER_INPUT: CourierInput = { left: false, right: false, jump: false };

function makeSegment(index: number): RouteSegment {
  const start = index * SEGMENT_WIDTH;
  const variant = index % 3;
  const gapStart = [160, 196, 176][variant];
  const gapEnd = [188, 226, 208][variant];
  const crateX = [90, 104, 84][variant];
  const stepX = [264, 286, 274][variant];
  const stepWidth = [36, 28, 40][variant];
  const stepHeight = [16, 24, 12][variant];
  return {
    index,
    variant,
    start,
    gap: { start: start + gapStart, end: start + gapEnd },
    solids: [
      { x: start, y: GROUND_Y, width: gapStart, height: 100, kind: 'earth' },
      { x: start + gapEnd, y: GROUND_Y, width: SEGMENT_WIDTH - gapEnd, height: 100, kind: 'earth' },
      { x: start + crateX, y: GROUND_Y - 16, width: 16, height: 16, kind: 'crate' },
      {
        x: start + stepX,
        y: GROUND_Y - stepHeight,
        width: stepWidth,
        height: stepHeight,
        kind: 'step',
      },
    ],
    parcels: [
      { x: start + 52, y: GROUND_Y - 10, collected: false },
      { x: start + gapEnd + 27, y: GROUND_Y - 10, collected: false },
    ],
    deliveryX: start + 378,
    delivered: false,
  };
}

export function createPixelWorld(): PixelWorld {
  return {
    tick: 0,
    x: 24,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    coyote: 5,
    jumpHeld: false,
    landing: 0,
    carried: 0,
    pickups: 0,
    deliveredParcels: 0,
    deliveries: 0,
    returns: 0,
    checkpoint: 24,
    camera: 0,
    distance: 0,
    segments: Array.from({ length: 5 }, (_, index) => makeSegment(index)),
    events: [],
    motes: [],
  };
}

function record(world: PixelWorld, type: CourierEvent['type'], count: number) {
  world.events.push({ tick: world.tick, type, x: world.x, count });
  if (world.events.length > 24) world.events.shift();
}

/** The demo reads the same collision geometry as manual play; it does not teleport. */
export function demoCourierInput(world: PixelWorld): CourierInput {
  let jump = false;
  if (world.grounded) {
    const nose = world.x + COURIER_HALF_WIDTH;
    for (const segment of world.segments) {
      if (segment.gap.start - nose > 0 && segment.gap.start - nose < 19 && world.y >= GROUND_Y - 1)
        jump = true;
      for (const solid of segment.solids) {
        if (
          solid.kind !== 'earth' &&
          solid.x - nose > -1 &&
          solid.x - nose < 18 &&
          solid.y < world.y
        )
          jump = true;
      }
    }
  }
  return { left: false, right: true, jump };
}

function overlapsHorizontally(x: number, solid: WorldSolid) {
  return x + COURIER_HALF_WIDTH > solid.x && x - COURIER_HALF_WIDTH < solid.x + solid.width;
}

/** Mutates one fixed step. Callers choose when to step; pause never mutates state. */
export function stepPixelWorld(
  world: PixelWorld,
  mode: CourierMode = 'demo',
  manual: CourierInput = EMPTY_COURIER_INPUT,
) {
  const input = mode === 'demo' ? demoCourierInput(world) : manual;
  world.tick++;
  world.landing = Math.max(0, world.landing - 1);
  const direction = Number(input.right) - Number(input.left);
  const targetSpeed = direction * COURIER_SPEED;
  const acceleration = world.grounded ? 18 : 9;
  world.vx += Math.max(-acceleration, Math.min(acceleration, targetSpeed - world.vx));
  if (direction) world.facing = direction < 0 ? -1 : 1;
  if (world.grounded) world.coyote = 5;
  else world.coyote = Math.max(0, world.coyote - 1);
  if (input.jump && !world.jumpHeld && world.coyote > 0) {
    world.vy = -JUMP_SPEED;
    world.grounded = false;
    world.coyote = 0;
  }
  world.jumpHeld = input.jump;

  const solids = world.segments.flatMap((segment) => segment.solids);
  let nextX = world.x + world.vx * PIXEL_STEP;
  for (const solid of solids) {
    if (
      world.y > solid.y + 0.01 &&
      world.y - COURIER_HEIGHT < solid.y + solid.height &&
      overlapsHorizontally(nextX, solid)
    ) {
      if (world.vx > 0) nextX = solid.x - COURIER_HALF_WIDTH;
      else if (world.vx < 0) nextX = solid.x + solid.width + COURIER_HALF_WIDTH;
      world.vx = 0;
    }
  }
  // The camera has passed this area; the retained route is the left boundary.
  const leftBoundary = Math.max(6, world.segments[0].start + 6);
  world.x = Math.max(leftBoundary, nextX);
  world.vy = Math.min(320, world.vy + GRAVITY * PIXEL_STEP);
  const previousY = world.y;
  let nextY = world.y + world.vy * PIXEL_STEP;
  const wasGrounded = world.grounded;
  world.grounded = false;
  for (const solid of solids) {
    if (!overlapsHorizontally(world.x, solid)) continue;
    if (world.vy >= 0 && previousY <= solid.y + 0.01 && nextY >= solid.y) {
      nextY = solid.y;
      world.vy = 0;
      world.grounded = true;
    } else if (
      world.vy < 0 &&
      previousY - COURIER_HEIGHT >= solid.y + solid.height &&
      nextY - COURIER_HEIGHT < solid.y + solid.height
    ) {
      nextY = solid.y + solid.height + COURIER_HEIGHT;
      world.vy = 0;
    }
  }
  world.y = nextY;
  if (!wasGrounded && world.grounded) world.landing = 6;

  for (const segment of world.segments) {
    for (const parcel of segment.parcels) {
      if (
        !parcel.collected &&
        Math.abs(world.x - parcel.x) < 10 &&
        world.y >= parcel.y - 3 &&
        world.y - COURIER_HEIGHT <= parcel.y + 4
      ) {
        parcel.collected = true;
        world.carried++;
        world.pickups++;
        record(world, 'pickup', 1);
        for (let i = 0; i < 4; i++)
          world.motes.push({
            x: parcel.x - 5 + i * 3,
            y: parcel.y - (i % 2) * 3,
            life: 28,
            kind: 'parcel',
          });
      }
    }
    if (
      !segment.delivered &&
      Math.abs(world.x - segment.deliveryX) < 13 &&
      world.grounded &&
      world.carried > 0
    ) {
      segment.delivered = true;
      world.deliveries++;
      world.deliveredParcels += world.carried;
      record(world, 'delivery', world.carried);
      world.carried = 0;
      world.checkpoint = segment.deliveryX + 22;
      for (let i = 0; i < 8; i++)
        world.motes.push({
          x: world.x - 9 + i * 3,
          y: world.y - 22 - (i % 3) * 3,
          life: 38,
          kind: 'parcel',
        });
    }
  }
  if (world.grounded && Math.abs(world.vx) > 20 && world.tick % 9 === 0)
    world.motes.push({ x: world.x - world.facing * 5, y: world.y - 1, life: 16, kind: 'dust' });
  for (const mote of world.motes) {
    mote.life--;
    if (mote.kind === 'parcel') mote.y -= 0.22;
  }
  world.motes = world.motes.filter((mote) => mote.life > 0).slice(-40);

  if (world.y > GROUND_Y + 90) {
    world.x = Math.max(world.segments[0].start + 24, world.checkpoint);
    world.camera = Math.max(world.segments[0].start, world.x - 80);
    world.y = GROUND_Y;
    world.vx = 0;
    world.vy = 0;
    world.grounded = true;
    world.returns++;
    record(world, 'return', 0);
  }
  world.distance = Math.max(world.distance, world.x - 24);
  // The demo advances continuously; manual play can backtrack through retained terrain.
  world.camera =
    mode === 'demo'
      ? Math.max(world.camera, world.x - 80)
      : Math.max(world.segments[0].start, world.x - 80);
  const firstNeeded = Math.max(0, Math.floor(world.camera / SEGMENT_WIDTH) - 1);
  while (world.segments[0].index < firstNeeded) world.segments.shift();
  while (world.segments.length < 5)
    world.segments.push(makeSegment(world.segments.at(-1)!.index + 1));
}
