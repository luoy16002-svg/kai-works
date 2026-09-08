# Kai / Selected work

Four working, independent portfolio projects. React, TypeScript, WebGL 2, Web Workers and Three.js. No client commissions, users or revenue are implied.

[Open the portfolio](https://luoy16002-svg.github.io/kai-works/) · [Verify the build](https://github.com/luoy16002-svg/kai-works/actions)

| Project | Try it                                                                      | Engineering focus                                                                                               |
| ------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Field   | Paint into a reaction–diffusion simulation; compare GPU and CPU; export PNG | Floating-point ping-pong render targets, periodic finite differences, deterministic seeding, numerical readback |
| HALO    | Change the pendant, share its URL, export PNG and JSON                      | Procedural geometry, real material updates, bounded serializable state, responsive WebGL                        |
| Current | Import CSV or generate 100,000 rows; filter and export                      | Streaming CSV parser, independent worker, exact integer sums, virtual table, cancellation                       |
| Relay   | Run 1,000 jobs, crash the worker, reload and restart                        | Atomic claims, expiring leases, stale-token rejection, idempotency, transactional local effects                 |

```sh
npm ci
npm test
npm run benchmark
npm run dev
```

Open `http://127.0.0.1:5173/kai-works/`. `npm run build` produces a static `dist/`. Hash routes support direct links on GitHub Pages. Three.js loads only when opening HALO. Node 24 is used in CI.

## Evidence

- 23 tests, including 500 randomized CSV round trips, 900 configuration combinations, and reaction–diffusion equilibrium / boundary / stability checks.
- Field's live GPU check runs 20 steps on a 64 × 64 grid and compares 8,192 concentrations against a CPU implementation. It reports the actual maximum absolute error, with a 0.0005 threshold; the result can be downloaded. This check runs on the visitor's real graphics context, not in the Node harness.
- Recorded browser checks: [Coral](verification/field-gpu-validation.json), [Maze](verification/field-gpu-maze.json), [Cells](verification/field-gpu-cells.json). Each record includes its parameters, observed error, browser and timestamp.
- 100,000 records checked against an independent BigInt reference, with filtered totals and sort order verified.
- Seven competing IndexedDB connections claim jobs concurrently. Tests inject an effect write failure to verify complete transaction rollback.
- A 500-job deterministic chaos run abandons 37 leases, reopens storage, retries failures and validates every final effect. The Node harness uses `fake-indexeddb`; it is a logical transaction test, not a disk or backend benchmark.
- [Actual browser verification](verification/browser-results.json): Edge processed 1,000 jobs; the worker was terminated with 403 complete and 3 leased, the page reloaded, and all 1,000 jobs eventually produced exactly 1,000 unique effects. The before/after exported ledgers are included for independent inspection.
- The browser's CSV export was checked using Python `csv` and `Decimal`: 8,263 Europe / Direct rows, $4,197,257.69. All amounts are synthetic USD samples.

`public/evidence.json` records one local benchmark. CI regenerates the deployed artifact with its own environment and timestamp. Timings are observations of that run, not SLAs. Current measures browser import and query latency separately.

## Boundaries

Field is a dimensionless Gray–Scott visual simulation with unit time step, diffusion coefficients 1 and 0.5, a nine-point Laplacian and periodic boundaries. It is not a calibrated chemical model. The model is described by [MIT's Gray–Scott project](https://groups.csail.mit.edu/mac/projects/amorphous/GrayScott/). The home preview is live, not a video. Animation pauses when hidden or scrolled off screen, and starts paused for reduced-motion preferences. WebGL 2 and floating-point render targets are required. The field uses bilinear display sampling without requiring floating-point linear-filtering extensions. Actual device performance and long-run patterns vary.

Current accepts UTF-8 order CSVs with header `id,date,region,channel,amount` in that order. Amounts must have exactly two decimal places; duplicate IDs, malformed CSV and invalid dates stop the import. Limit: 25 MB / 500,000 rows. Data stays in memory, is never transmitted by the app, and disappears when leaving the project. Text that could become a spreadsheet formula is prefixed on export; this intentionally changes such text for spreadsheet safety.

Relay runs **at-least-once execution**, with one local ledger effect per key through the same IndexedDB transaction as job completion. It does not coordinate external APIs or guarantee exactly-once external effects. Strict durability is requested from the browser; eviction, manual site-data clearing, device failure and browser behavior still matter. Workers need an open page and can be delayed by browser suspension. After returning, restart manually. Queues are capped at 5,000 jobs; replay controls refer to the last batch created in the current page session.

HALO is a visual product concept, not a photometric simulator or a physical item for sale. Kelvin controls adjust the rendered color, not a calibrated light source. Browsers without WebGL receive a reference image and can still export configurations.

## Visual assets and licenses

The HALO editorial image and two initial interface studies in `design/` were generated with image tools. The interface studies are references, not product screenshots. All functional UI, charts and 3D geometry are code. The final interfaces deliberately omit unsupported controls from those studies. Fonts are self-hosted through Fontsource and retain their upstream SIL OFL licenses. Code is MIT licensed; generated images are supplied as portfolio assets without a claim of exclusive copyright.

Contact: Kai · China, UTC+8 · [fuddleyu@gmail.com](mailto:fuddleyu@gmail.com). Collaboration by email or chat.
