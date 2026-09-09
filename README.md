# Kai / Selected work

Nine working, independent portfolio projects. React, TypeScript, Canvas 2D, WebGL 2, Web Workers and Three.js. No client commissions, users or revenue are implied.

[Open the portfolio](https://luoy16002-svg.github.io/kai-works/) · [Verify the build](https://github.com/luoy16002-svg/kai-works/actions)

[Profile & resume](https://luoy16002-svg.github.io/kai-works/#/profile) provides three shareable selections: [frontend](https://luoy16002-svg.github.io/kai-works/#/profile/frontend), [interactive & 3D](https://luoy16002-svg.github.io/kai-works/#/profile/creative), and [technical writing](https://luoy16002-svg.github.io/kai-works/#/profile/writing). Seven case notes connect the brief, implementation decisions, a short walkthrough and the source. One-page English profiles and a Chinese frontend profile are available as PDF and plain text.

Site copy and English profile content share `src/content/profile.json`. Regenerate the committed downloads with `python scripts/build-profile.py` (requires ReportLab). The Chinese PDF embeds a supplied TrueType font; pass `--chinese-font /path/to/font.ttf` outside the local Windows setup. The generator rejects a profile that exceeds one page. PDF layout should still be rendered and reviewed after content changes. These are profiles of independent projects; no employment history, client commissions, education or years of experience are inferred.

| Project  | Try it                                                                                | Engineering focus                                                                                               |
| -------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Pixel    | Watch Little deliveries or take control to run and jump                               | A playable Canvas 2D courier scene with keyboard and touch controls                                             |
| PROOF    | Compare fulfilment strategies, inspect failures and replay recorded agent trials      | Seeded task environments, final-state grading, bounded action protocols and trace verification                  |
| Type     | Transform KAI letterforms into working project entries; scrub and export the sequence | Shared geometric identity, flat vertex transforms, deterministic choreography, visibility-aware Canvas 2D       |
| Infinite | Explore Lorenz trajectories; change rho, pause, step and export a trace               | Fixed-step RK4, bounded history, inspectable numerical state, responsive 3D rendering                           |
| Field    | Paint into a reaction–diffusion simulation; compare GPU and CPU; export PNG           | Floating-point ping-pong render targets, periodic finite differences, deterministic seeding, numerical readback |
| HALO     | Change the pendant, share its URL, export PNG and JSON                                | Procedural geometry, real material updates, bounded serializable state, responsive WebGL                        |
| Current  | Import CSV or generate 100,000 rows; filter and export                                | Streaming CSV parser, independent worker, exact integer sums, virtual table, cancellation                       |
| Relay    | Run 1,000 jobs, crash the worker, reload and restart                                  | Atomic claims, expiring leases, stale-token rejection, idempotency, transactional local effects                 |
| Gather   | Choose a session, review a booking, then edit or cancel it                            | Responsive forms, draft recovery, local capacity checks, booking revisions and calendar export                  |

```sh
npm ci
npm test
npm run benchmark
npm run bench:proof
npm run dev
```

Open `http://127.0.0.1:5173/kai-works/`. `npm run build` produces a static `dist/`. Hash routes support direct links on GitHub Pages. The home screening room has Type, Pixel, Agents, Infinite and Ribbon tabs. Pixel, the recorded agent replay and Infinite load when first opened; Three.js is shared by Infinite and HALO. Node 24 is used in CI.

## Evidence

- Tests include 500 randomized CSV round trips, 900 configuration combinations, reaction–diffusion equilibrium / boundary / stability checks, and Lorenz equilibrium, analytic convergence and trace-history checks.
- Field's live GPU check runs 20 steps on a 64 × 64 grid and compares 8,192 concentrations against a CPU implementation. It reports the actual maximum absolute error, with a 0.0005 threshold; the result can be downloaded. This check runs on the visitor's real graphics context, not in the Node harness.
- Recorded browser checks: [Coral](verification/field-gpu-validation.json), [Maze](verification/field-gpu-maze.json), [Cells](verification/field-gpu-cells.json). Each record includes its parameters, observed error, browser and timestamp.
- 100,000 records checked against an independent BigInt reference, with filtered totals and sort order verified.
- Seven competing IndexedDB connections claim jobs concurrently. Tests inject an effect write failure to verify complete transaction rollback.
- A 500-job deterministic chaos run abandons 37 leases, reopens storage, retries failures and validates every final effect. The Node harness uses `fake-indexeddb`; it is a logical transaction test, not a disk or backend benchmark.
- [Actual browser verification](verification/browser-results.json): Edge processed 1,000 jobs; the worker was terminated with 403 complete and 3 leased, the page reloaded, and all 1,000 jobs eventually produced exactly 1,000 unique effects. The before/after exported ledgers are included for independent inspection.
- The browser's CSV export was checked using Python `csv` and `Decimal`: 8,263 Europe / Direct rows, $4,197,257.69. All amounts are synthetic USD samples.

`public/evidence.json` records one local benchmark. CI regenerates the deployed artifact with its own environment and timestamp. Timings are observations of that run, not SLAs. Current measures browser import and query latency separately.

## Running PROOF with an agent

`npm run bench:proof` evaluates the reference policies on the 24 public cases and writes `public/proof-evidence.json`. The CLI below exposes the same environment to any agent that can call a local command. A session permits at most 16 accepted world actions; rejected CLI submissions are outside that simulation budget. Pass each action as a flat JSON object; the command returns the task, tool definitions, action-format examples and observed response.

```sh
npx tsx scripts/proof-session.ts init --session trial.json --scenario ack_lost --seed 701
npx tsx scripts/proof-session.ts observe --session trial.json
npx tsx scripts/proof-session.ts act --session trial.json --action-file action.json
npx tsx scripts/proof-session.ts export --session trial.json --out recorded-trial.json
```

For example, `action.json` can contain `{"tool":"catalog"}`. Parameters for other tools belong beside `tool`, without an `args` or `arguments` wrapper. The agent selects subsequent actions from the returned observations. Optional `--adapter` and `--model` values identify the caller; these are supplied metadata, not verified identities. Import the exported trace in PROOF to replay and regrade it.

[The recorded agent artifact](public/proof-agent-trials.json) retains all four attempted sessions: three fulfilled orders and one justified handoff, with 11 accepted world actions. It also preserves five rejected submissions caused by unsupported parameter wrappers. The CLI's flat-action examples were added after this recording; no trial was restarted for a better result. Unreported model usage or cost remains unknown. This is a recorded demonstration, not a hidden evaluation set.

## Boundaries

PROOF is a small, synthetic agent evaluation environment for order fulfilment. Four conditions cover normal execution, a lost acknowledgement after a successful reservation, an inventory conflict, and an order that requires a human handoff. Six seed variants per condition make 24 public cases; these are parameter variations of four scenarios, not 24 independent business tasks. The grader checks the resulting orders and constraints, accepts valid alternative action paths, and reports handoffs separately from autonomous fulfilment. A committed order still counts when its acknowledgement is lost.

The browser runs explicitly labelled reference policies. Recorded agent examples and imported action traces are presented separately. Imports are replayed against the versioned environment and graded again; supplied scores are not trusted. Replaying actions verifies their consequences in this simulator, not the identity of the model that originally chose them. This prototype does not establish a general model ranking, production reliability, customer demand, or measured financial savings. Its evaluation design draws on [Anthropic's agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) and [Sierra's state-based agent evaluation work](https://sierra.ai/blog/bench-advancing-agent-benchmarking-to-knowledge-and-voice).

Type is an original, silent KAI identity study. The header mark and film share seven flat letter strokes, which register and transform into interface boundaries and real project links. The Canvas 2D sequence uses one absolute playhead and plays once. Manual adjustments and hiding the film pause playback until Play; reduced-motion preferences begin on a finished still. PNG exports contain the rendered canvas; timeline JSON records the current composition and palette.

Pixel is an original small courier game, Little deliveries. Demo shows the delivery route; Take control lets visitors run and jump. The home Agents tab presents a recorded replay of the published PROOF trials. It does not call a live AI model.

Infinite is a numerical illustration of the [Lorenz system](https://journals.ametsoc.org/view/journals/atsc/20/2/1520-0469_1963_020_0130_dnf_2_0_co_2.xml), with sigma 10, beta 8/3 and adjustable rho from 18 to 40. Seven known initial states advance using CPU RK4 at a fixed 0.005 simulation time step. Each trace retains 1,600 segments; the initial field includes 4,000 warmup steps and 1,600 recorded steps. Exported JSON identifies this preparation, the selected state, parameters, simulation time and Float32 visualization samples. It is a mathematical visualization, not a weather model or a claim of long-range prediction accuracy.

Field is a dimensionless Gray–Scott visual simulation with unit time step, diffusion coefficients 1 and 0.5, a nine-point Laplacian and periodic boundaries. It is not a calibrated chemical model. The model is described by [MIT's Gray–Scott project](https://groups.csail.mit.edu/mac/projects/amorphous/GrayScott/). Animation pauses when hidden or scrolled off screen, and starts paused for reduced-motion preferences. WebGL 2 and floating-point render targets are required. The field uses bilinear display sampling without requiring floating-point linear-filtering extensions. Actual device performance and long-run patterns vary.

Current accepts UTF-8 order CSVs with header `id,date,region,channel,amount` in that order. Amounts must have exactly two decimal places; duplicate IDs, malformed CSV and invalid dates stop the import. Limit: 25 MB / 500,000 rows. Data stays in memory, is never transmitted by the app, and disappears when leaving the project. Text that could become a spreadsheet formula is prefixed on export; this intentionally changes such text for spreadsheet safety.

Relay runs **at-least-once execution**, with one local ledger effect per key through the same IndexedDB transaction as job completion. It does not coordinate external APIs or guarantee exactly-once external effects. Strict durability is requested from the browser; eviction, manual site-data clearing, device failure and browser behavior still matter. Workers need an open page and can be delayed by browser suspension. After returning, restart manually. Queues are capped at 5,000 jobs; replay controls refer to the last batch created in the current page session.

HALO is a visual product concept, not a photometric simulator or a physical item for sale. Kelvin controls adjust the rendered color, not a calibrated light source. Browsers without WebGL receive a reference image and can still export configurations. The [model workspace](https://luoy16002-svg.github.io/kai-works/#/halo/models) accepts self-contained, uncompressed GLBs up to 20 MB and includes two original downloadable models.

[Gather](https://luoy16002-svg.github.io/kai-works/#/gather) uses fictional workshops and a rolling sample schedule. Records and capacity are local to the browser, with drafts in session storage and saved bookings in IndexedDB. Saving and editing use a transaction for both capacity checks and record updates. Edits retain their record ID and revision across reloads; stale edits are rejected. Cancellation releases local places. JSON exports include a demo marker, and calendar files use a demo title and tentative status. No payment, message or real reservation is created. A live booking service would need shared server inventory and an agreed integration. See the [development plan](DEVELOPMENT_PLAN.md) for the next useful additions.

## Visual assets and licenses

The HALO editorial image and two initial interface studies in `design/` were generated with image tools. The interface studies are references, not product screenshots. All functional UI, charts and 3D geometry are code. The final interfaces deliberately omit unsupported controls from those studies. Fonts are self-hosted through Fontsource and retain their upstream SIL OFL licenses. Code is MIT licensed; generated images are supplied as portfolio assets without a claim of exclusive copyright.

Contact: Kai · China, UTC+8 · [fuddleyu@gmail.com](mailto:fuddleyu@gmail.com). Collaboration by email or chat.
