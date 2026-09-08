import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPixelWorld,
  stepPixelWorld,
  GROUND_Y,
  COURIER_SPEED,
  SEGMENT_WIDTH,
} from '../src/core/pixel-world';

test('the courier continuously collects and delivers across varied terrain without a reset', () => {
  const world = createPixelWorld();
  let previousDeliveries = 0;
  let previousPickups = 0;
  let jumpCount = 0;
  for (let tick = 0; tick < 60 * 120; tick++) {
    const grounded = world.grounded;
    stepPixelWorld(world);
    if (grounded && !world.grounded) jumpCount++;
    if (world.deliveries > previousDeliveries) {
      assert.ok(world.pickups > previousPickups, 'a new collection must precede each delivery');
      assert.equal(world.carried, 0);
      previousPickups = world.pickups;
      previousDeliveries = world.deliveries;
    }
    assert.ok(world.segments.length <= 5);
    assert.ok(world.events.length <= 24);
    assert.ok(world.motes.length <= 40);
    assert.ok(Number.isFinite(world.x) && Number.isFinite(world.y));
  }
  assert.ok(world.deliveries >= 15, `${world.deliveries} deliveries`);
  assert.equal(world.returns, 0, 'demo must clear real obstacles without rescue');
  assert.ok(world.distance > SEGMENT_WIDTH * 15);
  assert.ok(jumpCount > world.deliveries * 2);
  assert.equal(world.pickups, world.deliveredParcels + world.carried);
});

test('falling later in the route returns visibly to a safe retained checkpoint', () => {
  const world = createPixelWorld();
  const replay = createPixelWorld();
  // Reach flat ground after the crate in the fourth segment, before the gap jump.
  while (world.x < SEGMENT_WIDTH * 3 + 128) {
    stepPixelWorld(world);
    stepPixelWorld(replay);
    assert.ok(world.tick < 2000);
  }
  assert.deepEqual(
    world,
    replay,
    'the same fixed-step input deterministically reproduces the route',
  );
  assert.equal(world.deliveries, 3);
  assert.ok(world.grounded);
  const checkpoint = world.checkpoint;
  const previousCamera = world.camera;
  // Manual walking deliberately misses the gap jump.
  for (let i = 0; i < 150 && world.returns === 0; i++) {
    stepPixelWorld(world, 'manual', { left: false, right: true, jump: false });
  }
  assert.equal(world.returns, 1);
  assert.equal(world.x, checkpoint);
  assert.equal(world.y, GROUND_Y);
  assert.ok(world.camera < previousCamera, 'the view returns with the courier');
  assert.ok(world.x - world.camera >= 5 && world.x - world.camera < 120);
  for (let i = 0; i < 180; i++) stepPixelWorld(world, 'manual');
  assert.equal(world.returns, 1, 'standing at the checkpoint must not cause a rescue loop');
  assert.equal(world.x, checkpoint);
  assert.equal(world.y, GROUND_Y);
  assert.ok(world.grounded);
});

test('manual mode stops the demo, collides with crates, and requires a fresh jump press', () => {
  const world = createPixelWorld();
  for (let i = 0; i < 20; i++) stepPixelWorld(world, 'manual');
  assert.equal(world.x, 24);
  assert.equal(world.pickups, 0);
  const right = { left: false, right: true, jump: false };
  for (let i = 0; i < 100; i++) stepPixelWorld(world, 'manual', right);
  assert.equal(world.x, 85, 'the crate physically blocks walking');
  assert.equal(world.y, GROUND_Y);
  const jumping = { ...right, jump: true };
  stepPixelWorld(world, 'manual', jumping);
  assert.ok(world.vy < 0 && !world.grounded);
  const startTick = world.tick;
  let lowestY = world.y;
  for (let i = 0; i < 48; i++) {
    stepPixelWorld(world, 'manual', { ...jumping, right: false });
    lowestY = Math.min(lowestY, world.y);
    assert.ok(Math.abs(world.vx) <= COURIER_SPEED);
  }
  assert.ok(lowestY < GROUND_Y - 25 && lowestY > GROUND_Y - 45);
  assert.ok(world.grounded);
  assert.equal(world.vy, 0, 'holding jump does not automatically jump again');
  assert.equal(world.tick, startTick + 48);
  assert.equal(world.deliveries, 0);
});
