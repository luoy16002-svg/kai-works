import { source, invoiceSource } from './work';
export const caseNotes = {
  current: {
    title: 'A reusable CSV workspace.',
    summary:
      'An order-data tool for importing, filtering and exporting CSVs without sending the file to an application server.',
    problem:
      'A spreadsheet export often has the right data under different column names. Exploring it should start with a quick preview, produce reliable totals, and let you return to the same file and filters later.',
    decisions: [
      {
        title: 'Map the source, then validate every record',
        body: 'A bounded preview uses the same streaming CSV parser as the full import. Users map five required fields by column position, so reordered headers and extra columns work. Invalid dates, duplicate IDs and ambiguous amounts stop the import with a record number.',
      },
      {
        title: 'Keep the main thread available',
        body: 'A dedicated worker owns the parsed records, sorting and aggregation. The interface requests a 35-row window while scrolling, instead of mounting every record. A new import terminates the previous worker, and query IDs keep stale responses out of the view.',
      },
      {
        title: 'Preserve exact amounts',
        body: 'Two-decimal amounts become integer cents. Totals are checked for safe integer precision. Export quotes text fields and prefixes formula-like values so they are not interpreted as formulas by spreadsheet software.',
      },
      {
        title: 'Make saving explicit and atomic',
        body: 'Save dataset stores the original file, column mapping and current filters. IndexedDB commits metadata and bytes in one transaction. Capacity checks happen in that write transaction, including when multiple tabs save at the same time. A failed write leaves the previous saved copy intact.',
      },
    ],
    walkthrough: [
      'Open Current and use Paste CSV or Open CSV with your own order data.',
      'Match ID, date, region, channel and amount to the source columns. Review the preview, then import.',
      'Filter a region or channel, save the dataset and reopen the page. Open the saved file to restore those filters.',
      'Export the matching records and compare the row count and totals with your source.',
    ],
    checks:
      'Automated checks cover quoted CSV and chunk boundaries, exact totals against a BigInt reference, mapped imports, original-file persistence, concurrent capacity enforcement and failed overwrites. Browser session timings are shown in the tool and vary by device.',
    links: [
      { label: 'CSV parser & queries', url: source + '/blob/main/src/core/csv.ts' },
      { label: 'Local storage transactions', url: source + '/blob/main/src/core/datasets.ts' },
      {
        label: 'Import & persistence tests',
        url: source + '/blob/main/tests/current-import.test.ts',
      },
      { label: 'CSV correctness tests', url: source + '/blob/main/tests/csv.test.ts' },
    ],
    limits:
      'Order CSVs in UTF-8, up to 25 MB and 500,000 rows. Five mapped fields are required. Amounts are nonnegative USD values with exactly two decimal places; dates use YYYY-MM-DD. The local library holds up to 10 files or 100 MB. Browser storage can be cleared or evicted, so an exported copy is still needed. This tool does not provide multi-user sync or a hosted database.',
  },
  halo: {
    title: 'GLB inspection, in the browser.',
    summary:
      'A browser-based model viewer with local import, geometry statistics, camera controls, lighting adjustments and PNG export.',
    problem:
      'Checking a 3D asset often needs only a clear view, a few camera controls and enough information to understand the model. HALO brings those operations into a small browser workspace.',
    decisions: [
      {
        title: 'Inspect before loading',
        body: 'A GLB preflight checks the container, embedded resources and supported content before handing the asset to the loader. The viewer is scoped to self-contained GLB files, with a file-size limit and explicit errors for unsupported inputs.',
      },
      {
        title: 'Frame the asset automatically',
        body: 'The viewer computes object bounds, recenters the model and chooses a camera distance from its size. Orbit controls and explicit turn, zoom and fit buttons make the scene usable with different input methods.',
      },
      {
        title: 'Treat GPU resources as owned resources',
        body: 'Replacing a model disposes its geometry, materials and textures. Request IDs prevent an older load from replacing the latest selection. Teardown releases the renderer, controls and observers.',
      },
      {
        title: 'Export the current view',
        body: 'PNG export captures the actual rendered canvas. The included lamp and vessel are original GLB assets that can also be downloaded and inspected independently.',
      },
    ],
    walkthrough: [
      'Open HALO and inspect the included Arc light or Fold vessel.',
      'Adjust the view and lighting, then use Fit to return to a useful framing.',
      'Open a supported, self-contained GLB from your device. Review the mesh, material and triangle counts.',
      'Export a PNG of the current scene or download an included model.',
    ],
    checks:
      'The repository includes GLB validation tests and the actual assets. The viewer reports the loaded file size, mesh count, material count, triangle count and bounds. Renderer or import failures produce a visible recovery message.',
    links: [
      { label: 'Viewer implementation', url: source + '/blob/main/src/pages/ModelViewer.tsx' },
      { label: 'GLB checks & cleanup', url: source + '/blob/main/src/core/glb.ts' },
      { label: 'Original model assets', url: source + '/tree/main/public/models' },
      { label: 'Model tests', url: source + '/blob/main/tests/glb.test.ts' },
    ],
    limits:
      'A focused GLB viewer, rather than a modeling editor. The current loader accepts self-contained supported GLB files and rejects external resources and unsupported compression. Rendering depends on the device’s WebGL support and GPU memory. Included assets are independent work; model counts do not imply client use.',
  },
  'invoice-gate': {
    title: 'Reliable invoice imports.',
    summary:
      'A runnable Python CLI that checks extracted invoice JSON and imports consistent records into SQLite with idempotent retries.',
    problem:
      'A valid JSON document can still contain inconsistent invoice data. Repeating an import can also duplicate a record unless identity checks and the database write are part of the same controlled process.',
    decisions: [
      {
        title: 'Make expectations explicit',
        body: 'The caller provides a stable vendor ID, expected currency and number format from trusted configuration. The validator checks the supported fields and arithmetic, and sends inconsistent or unsupported input to review.',
      },
      {
        title: 'Keep monetary arithmetic exact',
        body: 'Decimal parsing produces minor-unit values for arithmetic checks. Ambiguous formats and unsupported precision are rejected instead of silently rounded into an apparently valid invoice.',
      },
      {
        title: 'Separate retries from changed records',
        body: 'The transactional importer identifies an already imported invoice and returns duplicate for an identical retry. A conflicting version is treated as a review case. A different scan reference does not create a second invoice.',
      },
      {
        title: 'Test the database behavior',
        body: 'The test suite exercises concurrent imports and rollback, as well as parsing and invoice consistency. The command-line demo leaves a single invoice in the ledger after an identical retry.',
      },
    ],
    walkthrough: [
      'Clone the Invoice Gate repository and use Python 3.12 or newer. No external packages are required.',
      'Run python -m unittest -v and python demo.py.',
      'Check fixtures/valid.json with the vendor, currency and number-format flags shown in the README.',
      'Import the same fixture twice into a disposable SQLite database. The second result is duplicate.',
    ],
    checks:
      'Twenty Python tests cover validation, concurrency and rollback. The included demo uses synthetic invoices and reports the correct invoice, two review cases, an identical retry and a conflicting batch. The resulting ledger holds one invoice for 7,366 minor units.',
    links: [
      { label: 'Repository & run instructions', url: invoiceSource },
      { label: 'Validator & importer', url: invoiceSource + '/blob/main/invoice_gate.py' },
      { label: 'Python tests', url: invoiceSource + '/blob/main/test_invoice_gate.py' },
      { label: 'Written walkthrough', url: invoiceSource + '/blob/main/writing-sample.md' },
    ],
    limits:
      'This pipeline starts with extracted JSON; it does not include OCR. Supported data is limited to whole-number quantities, positive invoices and two-decimal USD, EUR, GBP or CNY amounts, without shipping or discounts. Arithmetic consistency does not establish authenticity, tax compliance, approval or payability. There is no payment connection or customer deployment.',
  },
};
