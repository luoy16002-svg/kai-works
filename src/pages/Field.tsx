import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Download, Pause, Play, RotateCcw, Plus, Check } from 'lucide-react';
import { fieldPresets, seedField, type FieldPreset } from '../core/field';
import { FieldGPU, validateGPU } from '../core/field-gpu';
import { download, REPO, WorkNav } from '../ui';

export function FieldLab({
  embedded = false,
  initialPalette = 0,
}: {
  embedded?: boolean;
  initialPalette?: 0 | 1;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<FieldGPU | null>(null);
  const brush = useRef([-1, -1, 0]);
  const [preset, setPreset] = useState<FieldPreset>('coral');
  const [size, setSize] = useState(256);
  const [running, setRunning] = useState(
    () => !matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [palette, setPalette] = useState(initialPalette);
  const [seed, setSeed] = useState(7126);
  const [contextVersion, setContextVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ steps: 0, fps: 0 });
  const [validation, setValidation] = useState<ReturnType<typeof validateGPU> | null>(null);
  const [message, setMessage] = useState('Drag across the surface to introduce a new pattern.');
  const settings = useRef({ running, preset, palette });
  settings.current = { running, preset, palette };
  useEffect(() => {
    const element = canvas.current!;
    brush.current = [-1, -1, 0];
    let gpu: FieldGPU;
    try {
      gpu = new FieldGPU(element, size, seedField(size, seed));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The GPU experiment could not start.');
      setReady(false);
      return;
    }
    renderer.current = gpu;
    setError('');
    setReady(true);
    gpu.step(360, fieldPresets[settings.current.preset]);
    let frame = 0,
      lastSample = performance.now(),
      frames = 0,
      visible = true;
    const resize = new ResizeObserver(([entry]) => {
      element.width = Math.max(
        1,
        Math.round(entry.contentRect.width * Math.min(devicePixelRatio, 1.5)),
      );
      element.height = Math.max(
        1,
        Math.round(entry.contentRect.height * Math.min(devicePixelRatio, 1.5)),
      );
      gpu.draw(settings.current.palette);
    });
    resize.observe(element);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersection.observe(element);
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      setReady(false);
      setError('The graphics context was interrupted. Restart the field to continue.');
    };
    element.addEventListener('webglcontextlost', lost);
    const tick = (now: number) => {
      const active = visible && !document.hidden;
      if (active) {
        if (settings.current.running || brush.current[2] > 0)
          gpu.step(
            settings.current.running ? 12 : 1,
            fieldPresets[settings.current.preset],
            brush.current,
          );
        gpu.draw(settings.current.palette);
        frames++;
      }
      if (now - lastSample > 600) {
        setStats({
          steps: gpu.steps,
          fps:
            active && settings.current.running
              ? Math.round((frames * 1000) / (now - lastSample))
              : 0,
        });
        lastSample = now;
        frames = 0;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      element.removeEventListener('webglcontextlost', lost);
      renderer.current = null;
      gpu.dispose();
    };
  }, [size, seed, contextVersion]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    brush.current = [
      (e.clientX - rect.left) / rect.width,
      1 - (e.clientY - rect.top) / rect.height,
      0.025,
    ];
  };
  const switchPreset = (value: FieldPreset) => {
    setPreset(value);
    settings.current.preset = value;
    renderer.current?.reset(seedField(size, seed));
    renderer.current?.step(360, fieldPresets[value]);
    setValidation(null);
    setMessage(
      `${value[0].toUpperCase() + value.slice(1)} parameters loaded. The field is evolving from seed ${seed}.`,
    );
  };
  const check = () => {
    try {
      const result = validateGPU(fieldPresets[preset]);
      setValidation(result);
      setMessage(
        result.pass
          ? `GPU check passed: ${result.values.toLocaleString()} concentrations, maximum absolute error ${result.maxError.toExponential(2)}.`
          : `GPU check failed. Maximum absolute error ${result.maxError}.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'GPU validation failed.');
    }
  };
  return (
    <div className={`field-lab ${embedded ? 'field-embedded' : ''}`} data-palette={palette}>
      <div className="field-surface">
        <canvas
          key={contextVersion}
          ref={canvas}
          aria-label="Reaction diffusion field. Drag to paint; use Seed center for keyboard input."
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            point(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) point(e);
          }}
          onPointerUp={() => {
            brush.current = [-1, -1, 0];
          }}
          onPointerCancel={() => {
            brush.current = [-1, -1, 0];
          }}
        />
        <div className="field-overlay">
          <span>01 / REACTION DIFFUSION</span>
          <span>{ready ? 'LIVE / WEBGL 2' : 'INITIALIZING'}</span>
        </div>
        <div className="field-coordinate">
          <span>U + 2V → 3V</span>
          <span>
            SEED {seed} / STEP {stats.steps.toLocaleString()}
          </span>
        </div>
        {error && (
          <div className="field-error">
            <p>{error}</p>
            <button onClick={() => setContextVersion((v) => v + 1)}>Restart field</button>
          </div>
        )}
      </div>
      <div className="field-toolbar">
        <div className="field-presets" role="group" aria-label="Pattern preset">
          {Object.keys(fieldPresets).map((name) => (
            <button
              key={name}
              disabled={!ready}
              aria-pressed={preset === name}
              onClick={() => switchPreset(name as FieldPreset)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="field-actions">
          <button
            disabled={!ready}
            onClick={() => setRunning((v) => !v)}
            aria-label={running ? 'Pause field' : 'Resume field'}
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            disabled={!ready}
            aria-label="Regenerate field"
            onClick={() => setSeed((s) => s + 1)}
          >
            <RotateCcw size={15} />
          </button>
          <button
            disabled={!ready}
            aria-label={
              palette === 0
                ? 'Switch to paper and plum palette'
                : 'Switch to plum and apricot palette'
            }
            onClick={() => setPalette((v) => (v === 0 ? 1 : 0))}
          >
            <span className="palette-swatch" />
          </button>
          {embedded ? (
            <a href="#/field" aria-label="Open full field controls">
              <ArrowUpRight size={18} />
            </a>
          ) : (
            <button
              disabled={!ready}
              aria-label="Download field PNG"
              onClick={() => {
                renderer.current?.draw(palette);
                const a = document.createElement('a');
                a.download = `field-${preset}-${seed}-${renderer.current?.steps}.png`;
                a.href = canvas.current!.toDataURL('image/png');
                a.click();
                setMessage('Exported the current GPU frame.');
              }}
            >
              <Download size={15} />
            </button>
          )}
        </div>
      </div>
      {!embedded && (
        <div className="field-settings">
          <div className="field-setting-row">
            <label>
              Simulation grid{' '}
              <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                <option value={256}>256 × 256</option>
                <option value={512}>512 × 512</option>
              </select>
            </label>
            <div className="field-meter">
              <span>Concentrations</span>
              <b>{(size * size * 2).toLocaleString()}</b>
            </div>
            <div className="field-meter">
              <span>Feed / kill</span>
              <b>
                {fieldPresets[preset].feed} / {fieldPresets[preset].kill}
              </b>
            </div>
            <div className="field-meter">
              <span>Observed frame rate</span>
              <b>{stats.fps > 0 ? `${stats.fps} fps` : 'Paused'}</b>
            </div>
          </div>
          <div className="field-test-row">
            <button
              disabled={!ready}
              onClick={() => {
                renderer.current?.step(1, fieldPresets[preset], [0.5, 0.5, 0.05]);
                renderer.current?.draw(palette);
                setMessage('Added a seed at the center.');
              }}
            >
              <Plus size={14} /> Seed center
            </button>
            <button
              disabled={!ready}
              onClick={() => {
                setRunning(false);
                settings.current.running = false;
                renderer.current?.step(1, fieldPresets[preset]);
                renderer.current?.draw(palette);
                setStats((s) => ({ ...s, steps: renderer.current?.steps ?? s.steps, fps: 0 }));
              }}
            >
              <Play size={13} /> Single step
            </button>
            <button disabled={!ready} onClick={check}>
              <Check size={14} /> Check GPU against CPU
            </button>
            {validation && (
              <button
                onClick={() =>
                  download(
                    'field-gpu-validation.json',
                    JSON.stringify(
                      { ...validation, browser: navigator.userAgent, tolerance: 0.0005 },
                      null,
                      2,
                    ),
                  )
                }
              >
                Export check <Download size={13} />
              </button>
            )}
          </div>
          <p role="status" className={validation && !validation.pass ? 'field-failed' : ''}>
            {message}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Field() {
  return (
    <div className="field-page">
      <WorkNav name="FIELD" detail="Reaction–diffusion studio" />
      <main id="main-content" tabIndex={-1}>
        <header className="field-page-heading">
          <div>
            <span className="mono">EXPERIMENT 01 / GPU COMPUTING</span>
            <h1>
              FIELD<span>↘</span>
            </h1>
          </div>
          <p>
            Draw a disturbance.
            <br />
            See what grows.
          </p>
        </header>
        <FieldLab />
        <div className="field-about">
          <p>
            Two chemical concentrations compete and spread across a grid. Each frame advances the
            Gray–Scott equations in floating-point textures. Changing the feed and kill rates
            creates different structures.
          </p>
          <div>
            <p>
              The built-in check compares 20 GPU steps with a CPU reference across 8,192 values.
              This is a dimensionless visual simulation. Frame rate depends on your device; it is
              not a performance guarantee.
            </p>
            <a
              href="https://groups.csail.mit.edu/mac/projects/amorphous/GrayScott/"
              target="_blank"
              rel="noreferrer"
            >
              Model reference <ArrowUpRight size={14} />
            </a>
            <a href={`${REPO}/blob/main/src/core/field-gpu.ts`} target="_blank" rel="noreferrer">
              Read the shader <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
