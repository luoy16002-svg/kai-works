import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ArrowDownToLine, RotateCcw, Link, Move, Sun, ArrowUpRight } from 'lucide-react';
import { WorkNav, SourceLink, download } from '../ui';
import {
  decodeHalo,
  encodeHalo,
  finishes,
  initialHalo,
  lightColor,
  type HaloConfig,
} from '../core/halo';

type SceneControl = {
  apply: (config: HaloConfig) => void;
  reset: () => void;
  picture: () => string;
  turn: (direction: number) => void;
};
function Stage({
  config,
  control,
  onReady,
  onFailure,
}: {
  config: HaloConfig;
  control: React.RefObject<SceneControl | null>;
  onReady: (ready: boolean) => void;
  onFailure: (error: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const initial = useRef(config);
  useEffect(() => {
    const host = element.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
    } catch {
      onFailure(
        'This browser could not start WebGL. The reference image is shown; configuration and export still work.',
      );
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      'aria-label',
      'Interactive pendant light. Drag to orbit or use the rotate buttons.',
    );
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#dedcd2');
    scene.fog = new THREE.Fog('#dedcd2', 13, 28);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 60);
    camera.position.set(4.8, 3.3, 6.5);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 1.95, 0);
    orbit.minDistance = 4;
    orbit.maxDistance = 12;
    orbit.maxPolarAngle = Math.PI * 0.64;
    orbit.minPolarAngle = 0.3;
    orbit.enablePan = false;
    orbit.enableDamping = true;
    orbit.update();
    const hemi = new THREE.HemisphereLight('#ffffff', '#9c917b', 2.4);
    scene.add(hemi);
    const key = new THREE.DirectionalLight('#fff8ea', 4.5);
    key.position.set(-3, 7, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.normalBias = 0.03;
    scene.add(key);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: '#bdb7a6', roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    // A continuous annular extrusion, including a separate recessed diffuser.
    const annulus = (outer: number, inner: number, depth: number) => {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.012,
        bevelSegments: 3,
        steps: 1,
        curveSegments: 128,
      });
      geometry.rotateX(-Math.PI / 2);
      geometry.center();
      return geometry;
    };
    const lamp = new THREE.Group();
    lamp.position.y = 2;
    scene.add(lamp);
    const metal = new THREE.MeshStandardMaterial({
      color: '#bba176',
      metalness: 0.82,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(annulus(1.5, 1.33, 0.2), metal);
    body.castShadow = true;
    body.receiveShadow = true;
    lamp.add(body);
    const glow = new THREE.MeshStandardMaterial({
      color: '#fff7d4',
      emissive: '#ffd281',
      emissiveIntensity: 1.5,
      roughness: 0.7,
    });
    const diffuser = new THREE.Mesh(annulus(1.477, 1.352, 0.012), glow);
    diffuser.position.y = -0.112;
    lamp.add(diffuser);
    const wires = new THREE.Group();
    scene.add(wires);
    const wireMat = new THREE.MeshStandardMaterial({
      color: '#55564d',
      metalness: 0.8,
      roughness: 0.4,
    });
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 3.4, 8), wireMat);
      wire.position.set(Math.cos(angle) * 1.415, 3.81, Math.sin(angle) * 1.415);
      wires.add(wire);
    }
    const spot = new THREE.SpotLight('#ffd281', 45, 8, Math.PI / 2.6, 1, 1.5);
    spot.position.set(0, 1.86, 0);
    spot.target.position.set(0, 0, 0);
    scene.add(spot, spot.target);
    const apply = (value: HaloConfig) => {
      const finish = finishes[value.finish];
      metal.color.set(finish.color);
      metal.metalness = finish.metalness;
      metal.roughness = finish.roughness;
      const [r, g, b] = lightColor(value.temperature);
      glow.emissive.setRGB(r, g, b);
      glow.emissiveIntensity = (value.brightness / 100) * 2.7;
      glow.color.setRGB(0.65 + r * 0.35, 0.65 + g * 0.35, 0.65 + b * 0.35);
      spot.color.setRGB(r, g, b);
      spot.intensity = (value.brightness / 100) * 60;
      const scale = value.diameter / 90;
      lamp.scale.set(scale, 1, scale);
      wires.scale.set(scale, 1, scale);
    };
    apply(initial.current);
    control.current = {
      apply,
      reset: () => {
        camera.position.set(4.8, 3.3, 6.5);
        orbit.target.set(0, 1.95, 0);
        orbit.update();
      },
      picture: () => {
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      },
      turn: (direction) => {
        const delta = camera.position.clone().sub(orbit.target);
        delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), (direction * Math.PI) / 8);
        camera.position.copy(orbit.target).add(delta);
        orbit.update();
      },
    };
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (document.visibilityState === 'visible') {
        orbit.update();
        renderer.render(scene, camera);
      }
    };
    draw();
    onReady(true);
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure('The graphics context was interrupted. Reload this page to restore the live view.');
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      orbit.dispose();
      control.current = null;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((m) => m.dispose());
        }
      });
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [control, onReady, onFailure]);
  useEffect(() => {
    control.current?.apply(config);
  }, [config, control]);
  return <div className="halo-canvas" ref={element} />;
}
// Stable callbacks keep the renderer alive while controls change.
export default function Halo() {
  const [config, setConfig] = useState(() => decodeHalo(location.hash.split('?')[1] ?? ''));
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const control = useRef<SceneControl | null>(null);
  const update = (value: Partial<HaloConfig>) => {
    const next = { ...config, ...value };
    setConfig(next);
    history.replaceState(null, '', `#/halo?${encodeHalo(next)}`);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setNotice('Configuration link copied.');
    } catch {
      setNotice('Your configuration is in the address bar. Copy the URL to share it.');
    }
  };
  const capture = () => {
    const url = control.current?.picture();
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'halo-configuration.png';
      a.click();
      setNotice('View saved as PNG.');
    }
  };
  return (
    <div className="halo-page">
      <WorkNav name="01 / HALO" detail="Interactive product study" />
      <main id="main-content" tabIndex={-1}>
        <header className="halo-header">
          <a className="halo-logo" href="#/halo">
            HALO<span>LIGHTING OBJECTS</span>
          </a>
          <span className="small-caps">FORM / MATERIAL / ATMOSPHERE</span>
          <SourceLink />
        </header>
        <div className="halo-layout">
          <section className="halo-stage" aria-label="Product preview">
            {!failure && (
              <Stage config={config} control={control} onReady={setReady} onFailure={setFailure} />
            )}
            {failure && (
              <img
                className="halo-fallback"
                src={`${import.meta.env.BASE_URL}assets/halo-editorial.png`}
                alt="Reference image of the HALO pendant"
              />
            )}
            <div className="stage-heading">
              <span className="eyebrow">THE PENDANT COLLECTION</span>
              <h1>
                A study
                <br />
                in <em>light.</em>
              </h1>
            </div>
            <div className="stage-badge">
              <span className="status-dot" />
              {ready && !failure ? 'LIVE 3D VIEW' : 'REFERENCE VIEW'}
            </div>
            <div className="stage-tools">
              <span>
                <Move size={14} /> Drag to explore
              </span>
              <div>
                <button
                  onClick={() => control.current?.turn(-1)}
                  disabled={!ready || !!failure}
                  aria-label="Rotate left"
                >
                  ←
                </button>
                <button
                  onClick={() => control.current?.turn(1)}
                  disabled={!ready || !!failure}
                  aria-label="Rotate right"
                >
                  →
                </button>
                <button
                  onClick={() => control.current?.reset()}
                  disabled={!ready || !!failure}
                  aria-label="Reset camera"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          </section>
          <aside className="halo-controls">
            <div className="eyebrow">DESIGNED AROUND YOU</div>
            <h2>Make it yours.</h2>
            <p className="halo-intro">
              A quiet circle. A different atmosphere.
              <br />
              Find your balance of form and light.
            </p>
            <fieldset>
              <legend>
                <span>01</span> Material <b>{finishes[config.finish].label}</b>
              </legend>
              <div className="finish-choices">
                {Object.entries(finishes).map(([id, finish]) => (
                  <button
                    key={id}
                    aria-label={finish.label}
                    aria-pressed={config.finish === id}
                    className={config.finish === id ? 'selected' : ''}
                    onClick={() => update({ finish: id as HaloConfig['finish'] })}
                  >
                    <span style={{ background: finish.color }} />
                    <small>{finish.label}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>
                <span>02</span> Diameter <b>{config.diameter} cm</b>
              </legend>
              <div className="size-choices">
                {([60, 90, 120] as const).map((size) => (
                  <button
                    key={size}
                    aria-pressed={config.diameter === size}
                    onClick={() => update({ diameter: size })}
                  >
                    {size}
                    <span> cm</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>
                <span>03</span> Light <b>{config.temperature} K</b>
              </legend>
              <label className="sr-only" htmlFor="temperature">
                Color temperature
              </label>
              <input
                className="temperature-range"
                id="temperature"
                type="range"
                min="2200"
                max="5000"
                step="100"
                value={config.temperature}
                onChange={(e) => update({ temperature: Number(e.target.value) })}
              />
              <div className="range-captions">
                <span>Warm & intimate</span>
                <span>Clear & focused</span>
              </div>
              <label className="brightness-label" htmlFor="brightness">
                <Sun size={15} /> Brightness <b>{config.brightness}%</b>
              </label>
              <input
                id="brightness"
                type="range"
                min="0"
                max="100"
                value={config.brightness}
                onChange={(e) => update({ brightness: Number(e.target.value) })}
              />
            </fieldset>
            <button className="halo-primary" onClick={copy}>
              Share this configuration <Link size={16} />
            </button>
            <div className="halo-secondary">
              <button
                onClick={() =>
                  download(
                    'halo-specification.json',
                    JSON.stringify({ project: 'HALO independent concept', ...config }, null, 2),
                  )
                }
              >
                Save specification <ArrowDownToLine size={14} />
              </button>
              <button onClick={capture} disabled={!ready || !!failure}>
                Save view <ArrowDownToLine size={14} />
              </button>
            </div>
            <p className="notice" role="status">
              {failure || notice || 'Your choices travel with the link.'}
            </p>
            <button
              className="quiet-button"
              onClick={() => {
                update(initialHalo);
                control.current?.reset();
              }}
            >
              Reset configuration
            </button>
          </aside>
        </div>
        <footer className="halo-footer">
          <p>Independent product concept · Procedural geometry · No physical product for sale</p>
          <a href="#/current">
            Next project: Current <ArrowUpRight size={16} />
          </a>
        </footer>
      </main>
    </div>
  );
}
