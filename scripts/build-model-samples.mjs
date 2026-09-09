import { mkdir, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Original, reproducible objects for the HALO model workspace. No external assets.
globalThis.FileReader = class {
  result = null;
  onloadend = null;
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};
const output = new URL('../public/models/', import.meta.url);
await mkdir(output, { recursive: true });
const brass = new THREE.MeshStandardMaterial({
  name: 'Satin brass',
  color: '#b49965',
  metalness: 0.82,
  roughness: 0.3,
});
const enamel = new THREE.MeshStandardMaterial({
  name: 'Forest enamel',
  color: '#2b443b',
  metalness: 0.2,
  roughness: 0.27,
  side: THREE.DoubleSide,
});
const opal = new THREE.MeshStandardMaterial({
  name: 'Opal diffuser',
  color: '#fff1cd',
  roughness: 0.5,
  emissive: '#fff0c6',
  emissiveIntensity: 0.25,
});
const clay = new THREE.MeshStandardMaterial({
  name: 'Terracotta glaze',
  color: '#b76840',
  roughness: 0.38,
  metalness: 0.03,
});
const footClay = new THREE.MeshStandardMaterial({
  name: 'Unglazed clay',
  color: '#805038',
  roughness: 0.92,
});
function mesh(group, name, geometry, material, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.name = name;
  object.position.set(...position);
  group.add(object);
  return object;
}
const lamp = new THREE.Group();
lamp.name = 'Arc — original table light by Kai';
mesh(
  lamp,
  'Weighted brass base',
  new THREE.CylinderGeometry(0.38, 0.42, 0.065, 64),
  brass,
  [0, 0.0325, 0],
);
mesh(lamp, 'Stem', new THREE.CylinderGeometry(0.026, 0.026, 1.5, 24), brass, [0, 0.815, 0]);
mesh(lamp, 'Base collar', new THREE.CylinderGeometry(0.09, 0.12, 0.055, 48), brass, [0, 0.0925, 0]);
const shadeProfile = [
  [0.75, 1.5],
  [0.75, 1.53],
  [0.735, 1.62],
  [0.69, 1.72],
  [0.6, 1.83],
  [0.46, 1.92],
  [0.29, 1.98],
  [0.11, 2.01],
  [0, 2.015],
].map(([x, y]) => new THREE.Vector2(x, y));
mesh(lamp, 'Spun enamel shade', new THREE.LatheGeometry(shadeProfile, 96), enamel);
mesh(lamp, 'Opal disc', new THREE.CylinderGeometry(0.719, 0.719, 0.025, 96), opal, [0, 1.495, 0]);
mesh(
  lamp,
  'Brass rim',
  new THREE.TorusGeometry(0.744, 0.009, 8, 96),
  brass,
  [0, 1.508, 0],
).rotation.x = Math.PI / 2;
mesh(lamp, 'Crown', new THREE.SphereGeometry(0.038, 24, 16), brass, [0, 2.022, 0]);
mesh(
  lamp,
  'Switch',
  new THREE.CylinderGeometry(0.033, 0.033, 0.025, 24),
  brass,
  [0.2, 0.077, 0.13],
);

const vessel = new THREE.Group();
vessel.name = 'Fold — original fluted vessel by Kai';
const vesselProfile = [
  [0, 0.06],
  [0.29, 0.06],
  [0.35, 0.09],
  [0.38, 0.18],
  [0.42, 0.38],
  [0.46, 0.63],
  [0.465, 0.8],
  [0.44, 0.98],
  [0.39, 1.13],
  [0.39, 1.2],
  [0.405, 1.24],
  [0.405, 1.26],
  [0.36, 1.26],
  [0.35, 1.21],
  [0.35, 1.14],
  [0.395, 0.98],
  [0.42, 0.8],
  [0.41, 0.63],
  [0.37, 0.39],
  [0.335, 0.2],
  [0.29, 0.13],
  [0, 0.13],
].map(([x, y]) => new THREE.Vector2(x, y));
const folded = new THREE.LatheGeometry(vesselProfile, 144);
const positions = folded.getAttribute('position');
for (let i = 0; i < positions.count; i += 1) {
  const x = positions.getX(i),
    y = positions.getY(i),
    z = positions.getZ(i);
  const amount =
    1 + Math.cos(Math.atan2(z, x) * 16) * 0.037 * Math.sin(Math.PI * Math.min(1, y / 1.26));
  positions.setXYZ(i, x * amount, y, z * amount);
}
folded.computeVertexNormals();
mesh(vessel, 'Folded vessel', folded, clay);
mesh(
  vessel,
  'Clay foot',
  new THREE.CylinderGeometry(0.29, 0.3, 0.065, 64),
  footClay,
  [0, 0.0325, 0],
);
const exporter = new GLTFExporter();
for (const [name, object] of [
  ['arc-lamp', lamp],
  ['fold-vessel', vessel],
]) {
  const data = await exporter.parseAsync(object, { binary: true, onlyVisible: true });
  await writeFile(new URL(`${name}.glb`, output), new Uint8Array(data));
  console.log(`${name}.glb: ${data.byteLength} bytes`);
}
