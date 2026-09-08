import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Move,
  ArrowDownToLine,
  ArrowUpRight,
} from 'lucide-react';
import { download } from '../ui';
import {
  LORENZ_DT,
  LORENZ_DEFAULT_RHO,
  LORENZ_RHO_MIN,
  LORENZ_RHO_MAX,
  LORENZ_TRACE_COUNT,
  LORENZ_TRACE_SEGMENTS,
  LORENZ_WARMUP_STEPS,
  createLorenzField,
  advanceLorenz,
  exportLorenz,
  type LorenzState,
} from '../core/lorenz';
import '../infinite-field.css';

type Snapshot = { steps: number; state: LorenzState };
type Engine = {
  play: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
  view: () => void;
  rho: (value: number) => void;
  select: (value: number) => void;
  sync: () => void;
  export: () => void;
};
const COLORS = ['#f7f2e8', '#eeaa82', '#c6bad9', '#eeaa82', '#f7f2e8', '#c6bad9', '#eeaa82'];
const SIMULATION_RATE = 0.45;

export default function InfiniteField({
  embedded = false,
  active = true,
}: {
  embedded?: boolean;
  active?: boolean;
}) {
  const [rho, setRho] = useState(LORENZ_DEFAULT_RHO);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const intent = useRef(playing);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const host = hostRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFailure('This browser could not start WebGL. The field needs a live graphics context.');
      setPlaying(false);
      intent.current = false;
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor('#251c2d');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute(
      'aria-label',
      'Seven evolving Lorenz trajectories in three dimensions. Drag horizontally to orbit.',
    );
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#251c2d');
    const fog = new THREE.Fog('#251c2d', 64, 153);
    scene.fog = fog;
    const group = new THREE.Group();
    group.rotation.x = -Math.PI / 2;
    group.position.y = -(LORENZ_DEFAULT_RHO - 1);
    scene.add(group);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 350);
    const defaultDirection = new THREE.Vector3(62, 8, 62).normalize();
    let fitDistance = 88;
    camera.position.copy(defaultDirection).multiplyScalar(fitDistance);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enablePan = false;
    orbit.enableZoom = false;
    orbit.enableDamping = false;
    orbit.rotateSpeed = 0.65;
    orbit.minPolarAngle = Math.PI * 0.18;
    orbit.maxPolarAngle = Math.PI * 0.79;
    renderer.domElement.style.touchAction = 'pan-y';
    orbit.update();
    let field = createLorenzField();
    let selectedIndex = 0;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.LineBasicMaterial[] = [];
    for (let i = 0; i < LORENZ_TRACE_COUNT; i++) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(field.segments[i], 3).setUsage(THREE.DynamicDrawUsage),
      );
      const material = new THREE.LineBasicMaterial({
        color: COLORS[i],
        transparent: true,
        opacity: i === 0 ? 0.86 : 0.4,
        depthWrite: false,
      });
      const line = new THREE.LineSegments(geometry, material);
      line.frustumCulled = false;
      group.add(line);
      geometries.push(geometry);
      materials.push(material);
    }
    const headPositions = new Float32Array(LORENZ_TRACE_COUNT * 3);
    const headColors = new Float32Array(LORENZ_TRACE_COUNT * 3);
    const headGeometry = new THREE.BufferGeometry();
    headGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(headPositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    headGeometry.setAttribute('color', new THREE.BufferAttribute(headColors, 3));
    const headMaterial = new THREE.PointsMaterial({
      size: 4,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const heads = new THREE.Points(headGeometry, headMaterial);
    heads.frustumCulled = false;
    group.add(heads);
    let frame = 0,
      previous = 0,
      accumulator = 0,
      lastUi = 0;
    let visible = false,
      disposed = false,
      lost = false;
    const available = () => !disposed && !lost && activeRef.current && visible && !document.hidden;
    const publish = () => setSnapshot({ steps: field.steps, state: field.states[selectedIndex] });
    const refresh = () => {
      for (let i = 0; i < LORENZ_TRACE_COUNT; i++) {
        geometries[i].getAttribute('position').needsUpdate = true;
        headPositions.set(field.states[i], i * 3);
        new THREE.Color(i === selectedIndex ? '#f7f2e8' : COLORS[i]).toArray(headColors, i * 3);
        materials[i].opacity = i === selectedIndex ? 0.86 : 0.37;
      }
      headGeometry.getAttribute('position').needsUpdate = true;
      headGeometry.getAttribute('color').needsUpdate = true;
    };
    const paint = () => renderer.render(scene, camera);
    const request = () => {
      if (!frame && available()) frame = requestAnimationFrame(tick);
    };
    const tick = (now: number) => {
      frame = 0;
      if (!available()) return;
      if (intent.current) {
        accumulator += (previous ? Math.min((now - previous) / 1000, 0.05) : 0) * SIMULATION_RATE;
        while (accumulator >= LORENZ_DT) {
          advanceLorenz(field);
          accumulator -= LORENZ_DT;
        }
        refresh();
      }
      previous = now;
      paint();
      if (now - lastUi > 120) {
        publish();
        lastUi = now;
      }
      if (intent.current) request();
    };
    const sync = () => {
      previous = 0;
      accumulator = 0;
      cancelAnimationFrame(frame);
      frame = 0;
      request();
    };
    const pause = () => {
      intent.current = false;
      setPlaying(false);
      publish();
      sync();
    };
    const fit = () => {
      const bounds = host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        visible = false;
        sync();
        return;
      }
      camera.aspect = bounds.width / bounds.height;
      fitDistance =
        88 * Math.max(1, 1.28 / camera.aspect) * Math.max(1, Math.sqrt(field.parameters.rho / 28));
      fog.near = fitDistance - 24;
      fog.far = fitDistance + 65;
      camera.position.sub(orbit.target).normalize().multiplyScalar(fitDistance).add(orbit.target);
      camera.updateProjectionMatrix();
      orbit.update();
      renderer.setSize(bounds.width, bounds.height);
      visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      sync();
    };
    const rebuild = (value: number) => {
      field = createLorenzField(value);
      group.position.y = -(field.parameters.rho - 1);
      for (let i = 0; i < LORENZ_TRACE_COUNT; i++)
        geometries[i].setAttribute(
          'position',
          new THREE.BufferAttribute(field.segments[i], 3).setUsage(THREE.DynamicDrawUsage),
        );
      refresh();
      publish();
      fit();
    };
    engine.current = {
      play: () => {
        intent.current = true;
        setPlaying(true);
        sync();
      },
      pause,
      step: () => {
        pause();
        advanceLorenz(field);
        refresh();
        publish();
        request();
        setNotice('Advanced one fixed step: 0.005 seconds.');
      },
      reset: () => {
        rebuild(field.parameters.rho);
        setNotice('Known seeds restored with the prepared trail.');
      },
      view: () => {
        camera.position.copy(defaultDirection).multiplyScalar(fitDistance);
        orbit.target.set(0, 0, 0);
        orbit.update();
        request();
      },
      rho: rebuild,
      select: (value) => {
        selectedIndex = value;
        refresh();
        publish();
        request();
      },
      sync,
      export: () => {
        download(
          'infinite-field-trace.json',
          JSON.stringify(exportLorenz(field, selectedIndex), null, 2),
        );
        setNotice('Selected trajectory saved as JSON.');
      },
    };
    orbit.addEventListener('change', request);
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0;
      sync();
    });
    intersection.observe(host);
    document.addEventListener('visibilitychange', sync);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => {
      if (preference.matches) pause();
    };
    preference.addEventListener('change', onPreference);
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      pause();
      setReady(false);
      setFailure('The graphics context was interrupted. Reload to restore the field.');
    };
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    refresh();
    publish();
    fit();
    setReady(true);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', onPreference);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      orbit.removeEventListener('change', request);
      orbit.dispose();
      engine.current = null;
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      headGeometry.dispose();
      headMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    engine.current?.sync();
  }, [active]);
  return (
    <section
      className={`infinite-field${embedded ? ' infinite-field-embedded' : ''}`}
      aria-label="Interactive Lorenz field"
    >
      <div className="infinite-field-screen">
        <div className="infinite-field-canvas" ref={hostRef} />
        <div className="infinite-field-formula" aria-label="Lorenz equations">
          <span>ẋ = 10(y − x)</span>
          <span>ẏ = x({rho.toFixed(1)} − z) − y</span>
          <span>ż = xy − (8/3)z</span>
        </div>
        <div className="infinite-field-screen-label">
          <span>INFINITE / FIELD</span>
          <span>{failure ? 'VIEW UNAVAILABLE' : playing ? 'FLOWING' : 'PAUSED'}</span>
        </div>
        {failure && (
          <div className="infinite-field-fallback">
            <p>{failure}</p>
            <button onClick={() => location.reload()}>
              Reload field <RotateCcw size={15} />
            </button>
          </div>
        )}
      </div>
      <div className="infinite-field-controls">
        <div className="infinite-field-transport">
          <div className="infinite-field-buttons">
            <button
              className="infinite-field-play"
              disabled={!ready || !!failure}
              onClick={() => (playing ? engine.current?.pause() : engine.current?.play())}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <button disabled={!ready || !!failure} onClick={() => engine.current?.step()}>
              <StepForward size={15} />
              Step
            </button>
            <button disabled={!ready || !!failure} onClick={() => engine.current?.reset()}>
              <RotateCcw size={14} />
              Reset
            </button>
            <button disabled={!ready || !!failure} onClick={() => engine.current?.view()}>
              Reset view
            </button>
          </div>
          <label className="infinite-field-rho">
            <span>ρ</span>
            <input
              aria-label="Rho parameter"
              type="range"
              min={LORENZ_RHO_MIN}
              max={LORENZ_RHO_MAX}
              step="0.5"
              value={rho}
              disabled={!ready || !!failure}
              onChange={(event) => {
                const value = Number(event.target.value);
                setRho(value);
                engine.current?.rho(value);
              }}
            />
            <output>{rho.toFixed(1)}</output>
          </label>
        </div>
        <div className="infinite-field-caption">
          <span>
            <Move size={13} />
            Drag horizontally to orbit
          </span>
          <span>Seven trajectories · fixed-step RK4</span>
        </div>
      </div>
      <details className="infinite-field-inspect">
        <summary>
          Inspect the field <span>+</span>
        </summary>
        <div className="infinite-field-inspect-content">
          <div className="infinite-field-equations" aria-label="Lorenz equations">
            <span>ẋ = 10(y − x)</span>
            <span>ẏ = x(ρ − z) − y</span>
            <span>ż = xy − (8/3)z</span>
          </div>
          <div className="infinite-field-inspect-title">
            <label>
              Selected trajectory{' '}
              <select
                value={selected}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSelected(value);
                  engine.current?.select(value);
                }}
              >
                {Array.from({ length: LORENZ_TRACE_COUNT }, (_, i) => (
                  <option value={i} key={i}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </label>
            <span>CPU simulation</span>
          </div>
          <dl>
            <div>
              <dt>Current x / y / z</dt>
              <dd>
                {snapshot
                  ? snapshot.state.map((value) => value.toFixed(3)).join(' / ')
                  : 'Preparing…'}
              </dd>
            </div>
            <div>
              <dt>Simulation time</dt>
              <dd>{snapshot ? (snapshot.steps * LORENZ_DT).toFixed(3) : '0.000'} s</dd>
            </div>
            <div>
              <dt>Fixed steps</dt>
              <dd>{snapshot?.steps.toLocaleString() ?? '0'}</dd>
            </div>
            <div>
              <dt>dt / trace segments</dt>
              <dd>
                {LORENZ_DT} / {LORENZ_TRACE_SEGMENTS.toLocaleString()} × {LORENZ_TRACE_COUNT}
              </dd>
            </div>
          </dl>
          <p>
            Starts from known seeds after {LORENZ_WARMUP_STEPS} warmup steps and{' '}
            {LORENZ_TRACE_SEGMENTS.toLocaleString()} recorded steps (
            {((LORENZ_WARMUP_STEPS + LORENZ_TRACE_SEGMENTS) * LORENZ_DT).toFixed(2)} simulation
            seconds). Changing ρ rebuilds the prepared trail. Step advances exactly one dt.
          </p>
          <div className="infinite-field-exports">
            <button disabled={!ready || !!failure} onClick={() => engine.current?.export()}>
              Export selected trace <ArrowDownToLine size={14} />
            </button>
            <a
              href="https://github.com/luoy16002-svg/kai-works/blob/main/src/core/lorenz.ts"
              target="_blank"
              rel="noreferrer"
            >
              View source <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </details>
      {notice && (
        <p className="infinite-field-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
