import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Box,
  Maximize,
  Minus,
  Plus,
  Upload,
} from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeObject, inspectGlb, MAX_GLB_BYTES } from '../core/glb';
import { download, SourceLink, WorkNav } from '../ui';
import '../model-viewer.css';

const samples = [
  { id: 'arc-lamp', title: 'Arc / table light', note: 'Brass, enamel & opal', shape: 'lamp' },
  { id: 'fold-vessel', title: 'Fold / vessel', note: 'Terracotta & glazed clay', shape: 'vessel' },
];
type Sample = (typeof samples)[number];
type AssetInfo = { meshes: number; materials: number; triangles: number; bounds: string };
type Viewer = {
  load: (data: ArrayBuffer, current: () => boolean) => Promise<AssetInfo | null>;
  fit: () => void;
  turn: (direction: number) => void;
  zoom: (factor: number) => void;
  picture: () => Promise<Blob>;
};
const assetUrl = (id: string) => `${import.meta.env.BASE_URL}models/${id}.glb`;
const bytesLabel = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function ModelViewer() {
  const mount = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const request = useRef(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [active, setActive] = useState('arc-lamp');
  const [asset, setAsset] = useState<{ name: string; bytes: number; info: AssetInfo } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const element = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setFailure('The 3D view needs WebGL. Try another browser or enable hardware acceleration.');
      return;
    }
    let disposed = false;
    const scene = new THREE.Scene();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute(
      'aria-label',
      'Interactive 3D model. Drag to orbit and scroll to zoom, or use the view buttons.',
    );
    renderer.domElement.setAttribute('role', 'img');
    element.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.8;
    scene.add(new THREE.HemisphereLight('#fff7e6', '#938773', 1.2));
    const sun = new THREE.DirectionalLight('#fff4e1', 3);
    sun.position.set(-3, 7, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -5,
      right: 5,
      top: 5,
      bottom: -5,
      near: 0.1,
      far: 20,
    });
    sun.shadow.normalBias = 0.025;
    scene.add(sun);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ color: '#705747', opacity: 0.2 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.008;
    floor.receiveShadow = true;
    scene.add(floor);
    let model: THREE.Group | null = null;
    let radius = 2;
    let height = 3;
    const render = () => {
      if (!disposed) renderer.render(scene, camera);
    };
    controls.addEventListener('change', render);
    const fit = () => {
      const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
      const distance = (radius / Math.sin(Math.min(vertical, horizontal))) * 1.12;
      controls.target.set(0, height / 2, 0);
      camera.position.copy(
        new THREE.Vector3(1.25, 0.7, 1.75)
          .normalize()
          .multiplyScalar(distance)
          .add(controls.target),
      );
      camera.near = distance / 100;
      camera.far = Math.max(100, distance * 20);
      camera.updateProjectionMatrix();
      controls.minDistance = radius * 1.1;
      controls.maxDistance = distance * 3;
      controls.update();
      render();
    };
    const resize = () => {
      const { width, height: viewportHeight } = element.getBoundingClientRect();
      if (!width || !viewportHeight) return;
      renderer.setSize(width, viewportHeight, false);
      camera.aspect = width / viewportHeight;
      fit();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      if (!url.startsWith('blob:') && !url.startsWith('data:')) {
        throw new Error('Embed all textures and buffers in the GLB before opening it here.');
      }
      return url;
    });
    const loader = new GLTFLoader(manager);
    viewer.current = {
      async load(data, current) {
        inspectGlb(data);
        const gltf = await loader.parseAsync(data, '');
        if (disposed || !current()) {
          gltf.scenes.forEach(disposeObject);
          return null;
        }
        const source = gltf.scene;
        source.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(source, true);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const materials = new Set<THREE.Material>();
        let meshes = 0;
        let triangles = 0;
        source.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          meshes += 1;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const count =
            mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position')?.count ?? 0;
          triangles +=
            (count / 3) *
            ((mesh as THREE.InstancedMesh).isInstancedMesh
              ? (mesh as THREE.InstancedMesh).count
              : 1);
          (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) =>
            materials.add(material),
          );
        });
        if (
          !meshes ||
          bounds.isEmpty() ||
          ![...size.toArray(), ...center.toArray()].every(Number.isFinite) ||
          size.length() < 1e-9
        ) {
          gltf.scenes.forEach(disposeObject);
          throw new Error(
            'This GLB has no visible mesh to display. Export a scene containing a mesh.',
          );
        }
        const next = new THREE.Group();
        const scale = 3 / Math.max(size.x, size.y, size.z);
        next.add(source);
        next.scale.setScalar(scale);
        next.position.copy(center).multiplyScalar(-scale);
        next.position.y += (size.y * scale) / 2;
        if (model) {
          scene.remove(model);
          disposeObject(model);
        }
        model = next;
        scene.add(model);
        radius = (size.length() * scale) / 2;
        height = size.y * scale;
        fit();
        return {
          meshes,
          materials: materials.size,
          triangles: Math.round(triangles),
          bounds: size
            .toArray()
            .map((value) => Number(value.toPrecision(3)))
            .join(' × '),
        };
      },
      fit,
      turn(direction) {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), (direction * Math.PI) / 8);
        camera.position.copy(offset.add(controls.target));
        controls.update();
        render();
      },
      zoom(factor) {
        const offset = camera.position.clone().sub(controls.target);
        offset.setLength(
          THREE.MathUtils.clamp(
            offset.length() * factor,
            controls.minDistance,
            controls.maxDistance,
          ),
        );
        camera.position.copy(offset.add(controls.target));
        controls.update();
        render();
      },
      picture() {
        render();
        return new Promise((resolve, reject) =>
          renderer.domElement.toBlob(
            (blob) =>
              blob ? resolve(blob) : reject(new Error('The image could not be saved. Try again.')),
            'image/png',
          ),
        );
      },
    };
    const lost = (event: Event) => {
      event.preventDefault();
      request.current += 1;
      setLoading(false);
      setFailure('The browser paused the 3D view. Reload this page to open it again.');
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    resize();
    setReady(true);
    return () => {
      disposed = true;
      request.current += 1;
      viewer.current = null;
      observer.disconnect();
      controls.dispose();
      disposeObject(scene);
      environment.dispose();
      sun.shadow.map?.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const open = useCallback(async (source: File | Sample) => {
    const ticket = ++request.current;
    const current = () => ticket === request.current;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (source instanceof File && (!/\.glb$/i.test(source.name) || source.size > MAX_GLB_BYTES)) {
        throw new Error('Choose a .glb file smaller than 20 MB.');
      }
      let data: ArrayBuffer;
      if (source instanceof File) data = await source.arrayBuffer();
      else {
        const response = await fetch(assetUrl(source.id));
        if (!response.ok)
          throw new Error('The sample could not load. Try again or open your own GLB.');
        data = await response.arrayBuffer();
      }
      if (!current() || !viewer.current) return;
      const info = await viewer.current.load(data, current);
      if (!info || !current()) return;
      setAsset({
        name: source instanceof File ? source.name : source.title,
        bytes: data.byteLength,
        info,
      });
      setActive(source instanceof File ? '' : source.id);
    } catch (cause) {
      if (current())
        setError(
          cause instanceof Error
            ? cause.message
            : 'This model could not be opened. Try another GLB.',
        );
    } finally {
      if (current()) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (ready) void open(samples[0]);
  }, [ready, open]);

  const unavailable = !asset || loading || !!failure;
  const save = async () => {
    try {
      const blob = await viewer.current?.picture();
      if (blob) {
        download('halo-model-view.png', blob, 'image/png');
        setNotice('Your view has been saved.');
      }
    } catch {
      setError('The image could not be saved. Try resetting the view first.');
    }
  };
  return (
    <div className="model-page">
      <WorkNav name="HALO" detail="Model workspace" />
      <main className="model-main" id="main-content" tabIndex={-1}>
        <header className="model-heading">
          <div>
            <p className="model-eyebrow">HALO / MODEL WORKSPACE</p>
            <h1>
              A place for
              <br />
              <em>your objects.</em>
            </h1>
          </div>
          <div className="model-heading-note">
            <p>
              Bring a model into the light.
              <br />
              Find its angle. Keep the view.
            </p>
            <a href="#/halo">
              <ArrowLeft size={14} /> Pendant configurator
            </a>
          </div>
        </header>
        <div className="model-layout">
          <section
            className="model-stage"
            aria-label="Model preview"
            data-dragging={dragging}
            onDragOver={(event) => {
              event.preventDefault();
              if (ready && !failure) setDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file && ready && !failure) void open(file);
            }}
          >
            <div className="model-stage-top">
              <span>OBJECT STUDIO</span>
              <span>
                {loading ? 'Opening model…' : asset ? bytesLabel(asset.bytes) : 'GLB / 3D'}
              </span>
            </div>
            <div ref={mount} className="model-canvas" aria-busy={loading} />
            {failure && (
              <div className="model-fallback" role="alert">
                <Box size={28} />
                <p>{failure}</p>
                <button onClick={() => location.reload()}>Reload view</button>
              </div>
            )}
            {dragging && <div className="model-drop-overlay">Drop your GLB here</div>}
            <div className="model-stage-bottom">
              <span>{asset?.name ?? 'Preparing the studio…'}</span>
              <span>Drag to orbit · Scroll to zoom</span>
            </div>
          </section>
          <aside className="model-sidebar" aria-label="Choose a model">
            <div className="model-section-label">
              <span>01 / THE COLLECTION</span>
              <span>2 objects</span>
            </div>
            <div className="model-samples">
              {samples.map((sample) => (
                <button
                  key={sample.id}
                  aria-pressed={active === sample.id}
                  disabled={!ready || !!failure}
                  onClick={() => void open(sample)}
                >
                  <span className={`model-swatch model-swatch-${sample.shape}`} aria-hidden="true">
                    <i />
                  </span>
                  <span>
                    <strong>{sample.title}</strong>
                    <small>{sample.note}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            <div className="model-import">
              <p className="model-section-label">02 / YOUR OWN OBJECT</p>
              <h2>Made something?</h2>
              <p>Open a GLB to see it in the studio. The file stays in your browser.</p>
              <input
                ref={input}
                className="sr-only"
                type="file"
                accept=".glb,model/gltf-binary"
                tabIndex={-1}
                aria-label="Choose a GLB file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void open(file);
                  event.target.value = '';
                }}
              />
              <button
                className="model-upload"
                disabled={!ready || !!failure}
                onClick={() => input.current?.click()}
              >
                <Upload size={16} /> Open a GLB file
              </button>
              <p className="model-file-help">
                Up to 20 MB · Embedded textures
                <br />
                Uncompressed GLB · Static view
              </p>
            </div>
            <dl className="model-stats">
              <div>
                <dt>Meshes</dt>
                <dd>{asset?.info.meshes ?? '—'}</dd>
              </div>
              <div>
                <dt>Materials</dt>
                <dd>{asset?.info.materials ?? '—'}</dd>
              </div>
              <div>
                <dt>Triangles</dt>
                <dd>{asset?.info.triangles.toLocaleString() ?? '—'}</dd>
              </div>
              <div>
                <dt>Bounds / file units</dt>
                <dd>{asset?.info.bounds ?? '—'}</dd>
              </div>
            </dl>
            <div className="model-feedback" aria-live="polite" aria-atomic="true">
              <p className={error ? 'model-error' : ''}>
                {error ||
                  notice ||
                  (loading ? 'Opening the model…' : asset ? `${asset.name} is ready.` : '')}
              </p>
            </div>
          </aside>
        </div>
        <div className="model-toolbar" aria-label="View controls">
          <div>
            <button
              disabled={unavailable}
              onClick={() => viewer.current?.turn(-1)}
              aria-label="Rotate model left"
            >
              ←
            </button>
            <button
              disabled={unavailable}
              onClick={() => viewer.current?.turn(1)}
              aria-label="Rotate model right"
            >
              →
            </button>
            <span className="model-tool-divider" />
            <button
              disabled={unavailable}
              onClick={() => viewer.current?.zoom(1.18)}
              aria-label="Zoom out"
            >
              <Minus size={16} />
            </button>
            <button
              disabled={unavailable}
              onClick={() => viewer.current?.zoom(0.85)}
              aria-label="Zoom in"
            >
              <Plus size={16} />
            </button>
            <button
              disabled={unavailable}
              onClick={() => viewer.current?.fit()}
              className="model-fit"
            >
              <Maximize size={15} /> Fit view
            </button>
          </div>
          <button className="model-save" disabled={unavailable} onClick={() => void save()}>
            Save view <ArrowDownToLine size={16} />
          </button>
        </div>
        <footer className="model-footer">
          <p>Original objects by Kai. Explore them, or bring your own.</p>
          <div>
            <a href={assetUrl(active || samples[0].id)} download>
              Get sample GLB <ArrowDownToLine size={14} />
            </a>
            <SourceLink path="/blob/main/src/pages/ModelViewer.tsx">View source</SourceLink>
          </div>
        </footer>
      </main>
    </div>
  );
}
