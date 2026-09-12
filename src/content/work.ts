export const source = 'https://github.com/luoy16002-svg/kai-works';
export const invoiceSource = 'https://github.com/luoy16002-svg/invoice-gate';
export const email = 'fuddleyu@gmail.com';
export const selectedWork = [
  {
    id: 'current',
    name: 'Current',
    type: 'Data workspace',
    description: 'Import order CSVs, explore the totals, and keep a local workspace for next time.',
    route: '#/current',
    action: 'Open Current',
    source: source + '/tree/main/src/core',
    image: 'current.png',
    stack: ['React', 'TypeScript', 'Web Workers'],
    detail: 'Column matching · saved datasets · exact amounts',
  },
  {
    id: 'halo',
    name: 'HALO',
    type: '3D model viewer',
    description:
      'Open your GLB models, inspect the geometry, and export a clean view of the scene.',
    route: '#/halo/models',
    action: 'Open HALO',
    source: source + '/blob/main/src/pages/ModelViewer.tsx',
    image: 'halo.png',
    stack: ['Three.js', 'WebGL', 'TypeScript'],
    detail: 'Local GLB import · camera controls · PNG export',
  },
  {
    id: 'invoice-gate',
    name: 'Invoice Gate',
    type: 'Python validation pipeline',
    description:
      'Check extracted invoice data and import valid records into SQLite without duplicate effects.',
    route: '#/case/invoice-gate',
    action: 'Read implementation',
    source: invoiceSource,
    image: '',
    stack: ['Python', 'SQLite', 'CLI'],
    detail: 'Structured validation · transactions · idempotency',
  },
] as const;
export type SelectedWork = (typeof selectedWork)[number];
