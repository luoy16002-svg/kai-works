import * as THREE from 'three';

export const MAX_GLB_BYTES = 20 * 1024 * 1024;

/** Check the envelope before handing a local file to the glTF loader. */
export function inspectGlb(data: ArrayBuffer) {
  if (data.byteLength > MAX_GLB_BYTES) throw new Error('Choose a GLB smaller than 20 MB.');
  if (data.byteLength < 20) throw new Error('This file is not a complete GLB.');
  const view = new DataView(data);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    throw new Error('Choose a binary glTF 2.0 file with a .glb extension.');
  }
  if (view.getUint32(8, true) !== data.byteLength) {
    throw new Error('The GLB appears incomplete. Export it again and try the new file.');
  }
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || length > data.byteLength - 20) {
    throw new Error('The GLB has no readable scene description.');
  }
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, length)));
  } catch {
    throw new Error('The scene description is damaged. Export the GLB again.');
  }
  const resources = [...(manifest.buffers ?? []), ...(manifest.images ?? [])];
  if (resources.some((resource) => resource.uri && !String(resource.uri).startsWith('data:'))) {
    throw new Error('Embed textures and buffers in the GLB before opening it here.');
  }
  const compressed = [
    'KHR_draco_mesh_compression',
    'EXT_meshopt_compression',
    'KHR_texture_basisu',
  ];
  if ((manifest.extensionsUsed ?? []).some((name: string) => compressed.includes(name))) {
    throw new Error('Export an uncompressed GLB, with PNG or JPEG textures, for this viewer.');
  }
}

export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const bitmaps = new Set<ImageBitmap>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    }
    const skeleton = (object as THREE.SkinnedMesh).skeleton;
    skeleton?.dispose();
  });
  textures.forEach((texture) => {
    if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) {
      bitmaps.add(texture.image);
    }
    texture.dispose();
  });
  bitmaps.forEach((bitmap) => bitmap.close());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}
