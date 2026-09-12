import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { disposeObject, inspectGlb } from '../src/core/glb';

async function includedModel(name: string) {
  const bytes = await readFile(new URL(`../public/models/${name}.glb`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

test('both downloadable original assets pass the same preflight as local imports', async () => {
  for (const name of ['arc-lamp', 'fold-vessel']) {
    const bytes = await includedModel(name);
    assert.doesNotThrow(() => inspectGlb(bytes));
    const view = new DataView(bytes);
    const manifest = JSON.parse(
      new TextDecoder().decode(new Uint8Array(bytes, 20, view.getUint32(12, true))),
    );
    assert.ok(manifest.meshes.length > 0);
    assert.ok(manifest.materials.length > 0);
    assert.ok(manifest.buffers.every((buffer: { uri?: string }) => !buffer.uri));
  }
});

test('incomplete files and unsupported container versions produce actionable errors', async () => {
  const bytes = await includedModel('arc-lamp');
  assert.throws(() => inspectGlb(bytes.slice(0, 19)), /complete GLB/);
  assert.throws(() => inspectGlb(bytes.slice(0, bytes.byteLength - 4)), /incomplete/);
  new DataView(bytes).setUint32(4, 1, true);
  assert.throws(() => inspectGlb(bytes), /glTF 2.0/);
});

test('releasing a model disposes shared geometry, material and texture exactly once', () => {
  const geometry = new THREE.BoxGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture, roughnessMap: texture });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  const disposed = { geometry: 0, material: 0, texture: 0 };
  geometry.addEventListener('dispose', () => disposed.geometry++);
  material.addEventListener('dispose', () => disposed.material++);
  texture.addEventListener('dispose', () => disposed.texture++);
  disposeObject(group);
  assert.deepEqual(disposed, { geometry: 1, material: 1, texture: 1 });
});
