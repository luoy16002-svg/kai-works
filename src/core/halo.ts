export const finishes = {
  champagne: { label: 'Champagne', color: '#bba176', metalness: 0.82, roughness: 0.3 },
  graphite: { label: 'Graphite', color: '#363a3c', metalness: 0.68, roughness: 0.4 },
  porcelain: { label: 'Porcelain', color: '#ede9df', metalness: 0.08, roughness: 0.28 },
} as const;
export type HaloConfig = {
  finish: keyof typeof finishes;
  temperature: number;
  brightness: number;
  diameter: 60 | 90 | 120;
};
export const initialHalo: HaloConfig = {
  finish: 'champagne',
  temperature: 2700,
  brightness: 70,
  diameter: 90,
};
export function decodeHalo(query: string): HaloConfig {
  const params = new URLSearchParams(query);
  const finish = params.get('finish');
  const diameter = Number(params.get('diameter'));
  const temperature = Number(params.get('temperature'));
  const brightness = Number(params.get('brightness'));
  return {
    finish:
      finish && Object.hasOwn(finishes, finish)
        ? (finish as HaloConfig['finish'])
        : initialHalo.finish,
    diameter:
      diameter === 60 || diameter === 90 || diameter === 120 ? diameter : initialHalo.diameter,
    temperature:
      params.has('temperature') &&
      Number.isInteger(temperature) &&
      temperature >= 2200 &&
      temperature <= 5000
        ? temperature
        : initialHalo.temperature,
    brightness:
      params.has('brightness') &&
      Number.isInteger(brightness) &&
      brightness >= 0 &&
      brightness <= 100
        ? brightness
        : initialHalo.brightness,
  };
}
export function encodeHalo(config: HaloConfig) {
  return new URLSearchParams(Object.entries(config).map(([k, v]) => [k, String(v)])).toString();
}
export function lightColor(kelvin: number): [number, number, number] {
  const ratio = Math.min(1, Math.max(0, (kelvin - 2200) / 2800));
  return [1, 0.6 + 0.32 * ratio, 0.27 + 0.58 * ratio];
}
