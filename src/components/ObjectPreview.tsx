import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeObject, inspectGlb } from '../core/glb';

export default function ObjectPreview() {
  const mount = useRef<HTMLDivElement>(null);
  const loadAsset = useRef<((id: string) => void) | null>(null);
  const [selected, setSelected] = useState('arc-lamp');
  const [stats, setStats] = useState('Loading original GLB…');
  const [error, setError] = useState('');
  useEffect(() => {
    const element = mount.current!;
    let disposed = false,
      frame = 0,
      inView = true,
      ticket = 0;
    let request: AbortController | null = null;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError('Open HALO to check your browser’s 3D support.');
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-label', 'Original 3D model. Drag to rotate.');
    renderer.domElement.setAttribute('role', 'img');
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    camera.position.set(4, 2.5, 6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI * 0.53;
    controls.target.set(0, 1.1, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.035);
    room.dispose();
    pmrem.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.85;
    scene.add(new THREE.HemisphereLight('#fffef5', '#c2c8b4', 1.8));
    const light = new THREE.DirectionalLight('#fff8e7', 4);
    light.position.set(-3, 6, 4);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.normalBias = 0.025;
    scene.add(light);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ color: '#536149', opacity: 0.16 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.008;
    floor.receiveShadow = true;
    scene.add(floor);
    let model: THREE.Group | null = null;
    let tween: { from: THREE.Group | null; to: THREE.Group; started: number } | null = null;
    const materialDefaults = new WeakMap<
      THREE.Material,
      { opacity: number; transparent: boolean; depthWrite: boolean }
    >();
    const fade = (object: THREE.Object3D, opacity: number) => {
      object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (!materialDefaults.has(material))
            materialDefaults.set(material, {
              opacity: material.opacity,
              transparent: material.transparent,
              depthWrite: material.depthWrite,
            });
          const defaults = materialDefaults.get(material)!;
          material.opacity = defaults.opacity * opacity;
          material.transparent = opacity < 1 || defaults.transparent;
          material.depthWrite = opacity < 1 ? false : defaults.depthWrite;
        }
      });
    };
    const settle = () => {
      if (!tween) return;
      if (tween.from) {
        scene.remove(tween.from);
        disposeObject(tween.from);
      }
      tween.to.position.x = 0;
      tween.to.rotation.y = 0;
      tween.to.scale.setScalar(1);
      fade(tween.to, 1);
      model = tween.to;
      tween = null;
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    controls.enableDamping = !reduced.matches;
    const visible = () => inView && !document.hidden;
    const tick = (now: number) => {
      frame = 0;
      if (disposed || !visible()) return;
      const changed = controls.update();
      if (tween) {
        const progress = Math.min(1, (now - tween.started) / 680);
        const eased = 1 - Math.pow(1 - progress, 4);
        tween.to.position.x = (1 - eased) * 0.7;
        tween.to.rotation.y = (1 - eased) * -0.18;
        tween.to.scale.setScalar(0.91 + eased * 0.09);
        fade(tween.to, eased);
        if (tween.from) {
          tween.from.position.x = -eased * 0.4;
          tween.from.scale.setScalar(1 - eased * 0.045);
          fade(tween.from, 1 - eased);
        }
        if (progress === 1) settle();
      }
      renderer.render(scene, camera);
      if (changed || tween) invalidate();
    };
    const invalidate = () => {
      if (!frame && !disposed && visible()) frame = requestAnimationFrame(tick);
    };
    controls.addEventListener('change', invalidate);
    const resize = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      invalidate();
    });
    resize.observe(element);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (visible()) invalidate();
      },
      { threshold: 0.01 },
    );
    intersection.observe(element);
    const visibility = () => {
      if (visible()) invalidate();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    document.addEventListener('visibilitychange', visibility);
    const motion = () => {
      controls.enableDamping = !reduced.matches;
      if (reduced.matches) settle();
      invalidate();
    };
    reduced.addEventListener('change', motion);
    loadAsset.current = (id) => {
      const current = ++ticket;
      request?.abort();
      const abort = new AbortController();
      request = abort;
      setError('');
      setStats('Loading original GLB…');
      void (async () => {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}models/${id}.glb`, {
            signal: abort.signal,
          });
          if (!response.ok) throw new Error('The included model could not load.');
          const bytes = await response.arrayBuffer();
          inspectGlb(bytes);
          const gltf = await new GLTFLoader().parseAsync(bytes, '');
          if (disposed || current !== ticket) {
            disposeObject(gltf.scene);
            return;
          }
          const source = gltf.scene;
          let meshes = 0,
            triangles = 0;
          source.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            meshes++;
            triangles +=
              (mesh.geometry.index?.count ?? mesh.geometry.attributes.position?.count ?? 0) / 3;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          });
          const box = new THREE.Box3().setFromObject(source);
          const size = box.getSize(new THREE.Vector3()),
            center = box.getCenter(new THREE.Vector3());
          const scale = 2.8 / Math.max(size.x, size.y, size.z);
          source.scale.setScalar(scale);
          source.position.copy(center).multiplyScalar(-scale);
          source.position.y += (size.y * scale) / 2;
          const next = new THREE.Group();
          next.add(source);
          settle();
          scene.add(next);
          tween = { from: model, to: next, started: performance.now() };
          if (reduced.matches || !model) settle();
          else fade(next, 0);
          setStats(`${meshes} meshes · ${Math.round(triangles).toLocaleString()} triangles`);
          invalidate();
        } catch (cause) {
          if (!disposed && current === ticket) {
            setError(cause instanceof Error ? cause.message : 'Could not load the model.');
            setStats('Model unavailable');
          }
        }
      })();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      setError('The 3D context was interrupted. Reload the page to restore the preview.');
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      disposed = true;
      request?.abort();
      loadAsset.current = null;
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', motion);
      controls.removeEventListener('change', invalidate);
      controls.dispose();
      settle();
      if (model) disposeObject(model);
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      environment.dispose();
      light.shadow.map?.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    loadAsset.current?.(selected);
  }, [selected]);
  return (
    <div className="index-object">
      <div className="object-status">
        <span>GLB / Original asset</span>
        <span>Drag to rotate</span>
      </div>
      <div className="object-canvas" ref={mount} />
      {error && (
        <p className="object-error" role="status">
          {error}
        </p>
      )}
      <div className="object-selector" role="group" aria-label="Preview a model">
        <button aria-pressed={selected === 'arc-lamp'} onClick={() => setSelected('arc-lamp')}>
          <span className="model-swatch model-swatch-lamp" aria-hidden="true">
            <i />
          </span>
          Arc light
        </button>
        <button
          aria-pressed={selected === 'fold-vessel'}
          onClick={() => setSelected('fold-vessel')}
        >
          <span className="model-swatch model-swatch-vessel" aria-hidden="true">
            <i />
          </span>
          Fold vessel
        </button>
      </div>
      <p className="object-stats" aria-live="polite">
        {stats}
      </p>
    </div>
  );
}
