import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Play, Pause, RotateCcw, ArrowDownToLine, ArrowUpRight } from 'lucide-react';
import { download } from '../ui';
import {
  FILM_DURATION,
  FILM_PARTS,
  FILM_CHAPTERS,
  FILM_MATERIALS,
  bladePose,
  filmTransition,
  filmCamera,
  filmState,
  type FilmMaterial,
} from '../core/motion-film';
import '../motion-reel.css';

type FilmEngine = {
  play: () => void;
  pause: () => void;
  seek: (time: number, pause?: boolean) => void;
  material: (value: FilmMaterial) => void;
  picture: () => string;
};
type RenderStats = { calls: number; triangles: number; width: number; height: number; dpr: number };
const formatTime = (time: number) => `00:${String(Math.floor(time)).padStart(2, '0')}`;

export default function MotionReel({ embedded = false }: { embedded?: boolean }) {
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [time, setTime] = useState(reduced.current ? FILM_DURATION : 0);
  const [playing, setPlaying] = useState(!reduced.current);
  const [material, setMaterial] = useState<FilmMaterial>('apricot');
  const [speed, setSpeed] = useState(1);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const [stats, setStats] = useState<RenderStats | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const engine = useRef<FilmEngine | null>(null);
  const playhead = useRef(time);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const materialRef = useRef(material);
  const inspectRef = useRef(false);
  speedRef.current = speed;
  materialRef.current = material;

  useEffect(() => {
    const host = hostRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      setFailure('Live rendering is unavailable in this browser. A static composition is shown.');
      setPlaying(false);
      playingRef.current = false;
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor('#251c2d');
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute(
      'aria-label',
      'FORM 01. Satin metal ribs assemble, flow, ripple, and reform into an orbital sculpture.',
    );
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#251c2d');
    scene.fog = new THREE.Fog('#251c2d', 11, 26);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.045);
    scene.environment = environment.texture;
    room.dispose();
    scene.add(new THREE.HemisphereLight('#fff2e3', '#49324f', 1.6));
    const key = new THREE.DirectionalLight('#fff0dc', 3.1);
    key.position.set(-3.5, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.normalBias = 0.035;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#c6bad9', 1.4);
    fill.position.set(4, 2, -3);
    scene.add(fill);
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: '#302535', roughness: 1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.16;
    ground.receiveShadow = true;
    scene.add(ground);
    const geometry = new RoundedBoxGeometry(0.105, 1.2, 0.48, 3, 0.047);
    const satin = new THREE.MeshStandardMaterial({
      color: '#eeaa82',
      metalness: 0.62,
      roughness: 0.27,
    });
    const sculpture = new THREE.InstancedMesh(geometry, satin, FILM_PARTS);
    sculpture.frustumCulled = false;
    sculpture.castShadow = true;
    sculpture.receiveShadow = true;
    sculpture.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(sculpture);
    const dummy = new THREE.Object3D();
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const drawingSize = new THREE.Vector2();
    let frame = 0;
    let previous = 0;
    let lastUi = 0;
    let lastStats = 0;
    let disposed = false;
    let visible = false;
    let aspect = 1;
    const available = () => !disposed && visible && !document.hidden;
    const paint = () => {
      const t = playhead.current;
      for (let index = 0; index < FILM_PARTS; index++) {
        const transition = filmTransition(t, index);
        const a = bladePose(index, transition.from, t);
        const b = bladePose(index, transition.to, t);
        const mix = transition.mix;
        dummy.position.set(
          a.x + (b.x - a.x) * mix,
          a.y + (b.y - a.y) * mix,
          a.z + (b.z - a.z) * mix,
        );
        qa.setFromEuler(euler.set(a.rx, a.ry, a.rz));
        qb.setFromEuler(euler.set(b.rx, b.ry, b.rz));
        dummy.quaternion.copy(qa).slerp(qb, mix);
        dummy.scale.set(
          a.sx + (b.sx - a.sx) * mix,
          a.sy + (b.sy - a.sy) * mix,
          a.sz + (b.sz - a.sz) * mix,
        );
        dummy.updateMatrix();
        sculpture.setMatrixAt(index, dummy.matrix);
      }
      sculpture.instanceMatrix.needsUpdate = true;
      const heldTime = Math.min(t, 23);
      sculpture.rotation.set(
        0.24 + Math.sin(heldTime * 0.22) * 0.08,
        -0.16 + Math.sin(heldTime * 0.17) * 0.12,
        -0.2 + heldTime * 0.008,
      );
      const view = filmCamera(t);
      const fit = Math.max(1, 1.12 / aspect);
      camera.position.set(view.x * fit, view.y * fit, view.z * fit);
      camera.lookAt(0, -0.03, 0);
      renderer.render(scene, camera);
      const now = performance.now();
      if (inspectRef.current && now - lastStats > 450) {
        renderer.getDrawingBufferSize(drawingSize);
        setStats({
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          width: drawingSize.x,
          height: drawingSize.y,
          dpr: renderer.getPixelRatio(),
        });
        lastStats = now;
      }
    };
    const request = () => {
      if (!frame && available()) frame = requestAnimationFrame(tick);
    };
    const tick = (now: number) => {
      frame = 0;
      if (!available()) return;
      if (playingRef.current) {
        const delta = previous ? Math.min(0.06, (now - previous) / 1000) : 0;
        playhead.current = Math.min(FILM_DURATION, playhead.current + delta * speedRef.current);
      }
      previous = now;
      paint();
      if (now - lastUi > 65 || playhead.current >= FILM_DURATION) {
        setTime(playhead.current);
        lastUi = now;
      }
      if (playhead.current >= FILM_DURATION) {
        playingRef.current = false;
        setPlaying(false);
      }
      if (playingRef.current) request();
    };
    const pause = () => {
      playingRef.current = false;
      setPlaying(false);
      setTime(playhead.current);
      previous = 0;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const sync = () => {
      previous = 0;
      cancelAnimationFrame(frame);
      frame = 0;
      request();
    };
    engine.current = {
      play: () => {
        if (playhead.current >= FILM_DURATION) playhead.current = 0;
        playingRef.current = true;
        setPlaying(true);
        sync();
      },
      pause,
      seek: (value, shouldPause = true) => {
        if (shouldPause) pause();
        playhead.current = Math.max(0, Math.min(FILM_DURATION, value));
        setTime(playhead.current);
        sync();
      },
      material: (value) => {
        const finish = FILM_MATERIALS[value];
        satin.color.set(finish.color);
        satin.metalness = finish.metalness;
        satin.roughness = finish.roughness;
        request();
      },
      picture: () => {
        paint();
        return renderer.domElement.toDataURL('image/png');
      },
    };
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        visible = false;
        sync();
        return;
      }
      aspect = bounds.width / bounds.height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(bounds.width, bounds.height);
      visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      sync();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0;
      sync();
    });
    intersection.observe(host);
    document.addEventListener('visibilitychange', sync);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preferenceChange = () => {
      if (preference.matches) pause();
    };
    preference.addEventListener('change', preferenceChange);
    const lost = (event: Event) => {
      event.preventDefault();
      pause();
      setReady(false);
      setFailure('The graphics context was interrupted. Reload to restore the live film.');
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    resize();
    setReady(true);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', preferenceChange);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      engine.current = null;
      geometry.dispose();
      satin.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      key.shadow.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const chapter = Math.min(3, Math.floor(time / 6));
  return (
    <section
      className={`motion-reel${embedded ? ' motion-reel-embedded' : ''}`}
      aria-label="FORM 01 motion film"
    >
      <div className="motion-reel-screen">
        <div className="motion-reel-poster" aria-hidden="true">
          <svg viewBox="0 0 600 440" role="presentation">
            <ellipse cx="300" cy="370" rx="146" ry="19" fill="#17101e" opacity=".6" />
            <g transform="translate(300 215) rotate(-20) scale(1 .9)">
              {Array.from({ length: FILM_PARTS }, (_, i) => (
                <rect
                  key={i}
                  x="-4"
                  y="-160"
                  width="8"
                  height="100"
                  rx="4"
                  fill={FILM_MATERIALS[material].color}
                  opacity={0.5 + 0.5 * ((Math.sin(i * 0.18) + 1) / 2)}
                  transform={`rotate(${(i / FILM_PARTS) * 360})`}
                />
              ))}
            </g>
          </svg>
        </div>
        <div
          className={`motion-reel-canvas${ready && !failure ? ' is-ready' : ''}`}
          ref={hostRef}
        />
        <div className="motion-reel-screen-top">
          <span>FORM / 01</span>
          <span>
            {failure
              ? 'STATIC COMPOSITION'
              : `${String(chapter + 1).padStart(2, '0')} / ${FILM_CHAPTERS[chapter].name.toUpperCase()}`}
          </span>
        </div>
        <div className="motion-reel-screen-bottom">
          <span>A material in motion.</span>
          <span>24″</span>
        </div>
      </div>
      <div className="motion-reel-controls">
        <div className="motion-reel-transport">
          <button
            className="motion-reel-play"
            disabled={!ready || !!failure}
            onClick={() => (playing ? engine.current?.pause() : engine.current?.play())}
            aria-label={
              playing ? 'Pause film' : time >= FILM_DURATION ? 'Replay film' : 'Play film'
            }
          >
            {playing ? (
              <Pause size={17} />
            ) : time >= FILM_DURATION ? (
              <RotateCcw size={17} />
            ) : (
              <Play size={17} />
            )}
            <span>{playing ? 'Pause' : time >= FILM_DURATION ? 'Replay' : 'Play'}</span>
          </button>
          <input
            type="range"
            min="0"
            max={FILM_DURATION}
            step="0.01"
            value={time}
            aria-label="Film playhead"
            aria-valuetext={`${time.toFixed(1)} seconds of 24`}
            disabled={!ready || !!failure}
            onChange={(event) => engine.current?.seek(Number(event.target.value))}
            style={{ '--film-progress': `${(time / FILM_DURATION) * 100}%` } as React.CSSProperties}
          />
          <output className="motion-reel-time">
            {formatTime(time)} <span>/ 00:24</span>
          </output>
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="1.5">1.5×</option>
          </select>
        </div>
        <div className="motion-reel-options">
          <div className="motion-reel-chapters" role="group" aria-label="Film chapters">
            {FILM_CHAPTERS.map((shot, i) => (
              <button
                key={shot.name}
                aria-pressed={chapter === i}
                disabled={!ready || !!failure}
                onClick={() => engine.current?.seek(shot.time, false)}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                {shot.name}
              </button>
            ))}
          </div>
          <div className="motion-reel-materials" role="group" aria-label="Sculpture material">
            {Object.entries(FILM_MATERIALS).map(([id, finish]) => (
              <button
                key={id}
                aria-pressed={material === id}
                onClick={() => {
                  setMaterial(id as FilmMaterial);
                  engine.current?.material(id as FilmMaterial);
                }}
              >
                <i style={{ background: finish.color }} />
                {finish.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <details
        className="motion-reel-inspect"
        onToggle={(event) => {
          inspectRef.current = event.currentTarget.open;
          if (event.currentTarget.open) engine.current?.seek(playhead.current, false);
        }}
      >
        <summary>
          Inspect motion <span>+</span>
        </summary>
        <div className="motion-reel-inspect-content">
          <p>
            84 satin ribs. Four compositions. One deterministic playhead, rendered live in your
            browser.
          </p>
          <dl>
            <div>
              <dt>Draw calls / frame</dt>
              <dd>{stats?.calls ?? '—'}</dd>
            </div>
            <div>
              <dt>Triangles / frame</dt>
              <dd>{stats?.triangles.toLocaleString() ?? '—'}</dd>
            </div>
            <div>
              <dt>Drawing buffer</dt>
              <dd>{stats ? `${stats.width} × ${stats.height}` : '—'}</dd>
            </div>
            <div>
              <dt>Pixel ratio</dt>
              <dd>{stats?.dpr ?? '—'}</dd>
            </div>
          </dl>
          <div className="motion-reel-exports">
            <button
              disabled={!ready || !!failure}
              onClick={() => {
                const picture = engine.current?.picture();
                if (picture) {
                  const a = document.createElement('a');
                  a.href = picture;
                  a.download = 'form-01-frame.png';
                  a.click();
                  setNotice('Frame saved as PNG.');
                }
              }}
            >
              Save frame <ArrowDownToLine size={14} />
            </button>
            <button
              onClick={() =>
                download(
                  'form-01-state.json',
                  JSON.stringify(
                    filmState(playhead.current, materialRef.current, speedRef.current),
                    null,
                    2,
                  ),
                )
              }
            >
              Save timeline <ArrowDownToLine size={14} />
            </button>
            <a
              href="https://github.com/luoy16002-svg/kai-works/blob/main/src/components/MotionReel.tsx"
              target="_blank"
              rel="noreferrer"
            >
              View source <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </details>
      {(failure || notice) && (
        <p className="motion-reel-notice" role="status">
          {failure || notice}
        </p>
      )}
    </section>
  );
}
