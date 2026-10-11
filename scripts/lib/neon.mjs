// Shared look for every profile SVG: palette, embedded fonts, filters, frame.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const C = {
  bg: '#05070D',
  panel: '#0A0F1C',
  panel2: '#0F1729',
  line: '#1A2742',
  cyan: '#00F0FF',
  cyanSoft: '#8AF8FF',
  magenta: '#FF2BD6',
  violet: '#A66BFF',
  orange: '#FF8A2B',
  lime: '#3CFF9E',
  amber: '#FFD166',
  text: '#E8FBFF',
  muted: '#8A9BB5',
  dim: '#46567A',
};

export const MONO = "'JBM', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
export const DISPLAY = "'ORB', 'JBM', ui-sans-serif, sans-serif";

// JetBrains Mono advance width is 600/1000 em.
export const monoWidth = (text, size) => text.length * size * 0.6;

const FACES = {
  'orbitron-900': ['ORB', 900],
  'orbitron-600': ['ORB', 600],
  'jetbrains-mono-400': ['JBM', 400],
  'jetbrains-mono-700': ['JBM', 700],
};

// Fonts are embedded because an <img> SVG cannot load external resources.
export function fonts(...names) {
  return names
    .map((name) => {
      const [family, weight] = FACES[name];
      const file = join(ROOT, 'assets', 'fonts', `${name}.woff2`);
      const b64 = readFileSync(file).toString('base64');
      const src = `url(data:font/woff2;base64,${b64}) format('woff2')`;
      return `@font-face{font-family:'${family}';font-weight:${weight};src:${src}}`;
    })
    .join('\n');
}

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Neon tube glow in the given colour, layered under the source graphic.
export const neonFilter = (id, color, spread = 1) => `
  <filter id="${id}" x="-20%" y="-60%" width="140%" height="220%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="${3 * spread}" result="b1"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="${11 * spread}" result="b2"/>
    <feFlood flood-color="${color}"/>
    <feComposite in2="b1" operator="in" result="g1"/>
    <feFlood flood-color="${color}" flood-opacity=".55"/>
    <feComposite in2="b2" operator="in" result="g2"/>
    <feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

export const patterns = () => `
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40 0H0V40" fill="none" stroke="${C.cyan}" stroke-opacity=".07"/>
  </pattern>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
    <rect width="4" height="1" fill="#fff" opacity=".035"/>
  </pattern>`;

// Dark rounded panel with a soft cyan/magenta edge; content goes in `body`.
export function panel({ w, h, body, defs = '', style = '', title, accent = C.cyan, glow = true }) {
  const label = title ? `<title>${esc(title)}</title>` : '';
  const glows = glow
    ? `<circle cx="${w * 0.08}" cy="0" r="${h * 1.1}" fill="url(#gA)"/>
    <circle cx="${w * 0.95}" cy="${h}" r="${h * 1.1}" fill="url(#gB)"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  ${label}
  <defs>
    <style>${style}
      @media (prefers-reduced-motion: reduce){*{animation:none!important}}
    </style>
    <radialGradient id="gA"><stop offset="0" stop-color="${accent}" stop-opacity=".16"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="gB"><stop offset="0" stop-color="${C.magenta}" stop-opacity=".12"/><stop offset="1" stop-color="${C.magenta}" stop-opacity="0"/></radialGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}" stop-opacity=".7"/>
      <stop offset=".5" stop-color="${C.line}" stop-opacity=".9"/>
      <stop offset="1" stop-color="${C.magenta}" stop-opacity=".6"/>
    </linearGradient>
    <clipPath id="frame"><rect width="${w}" height="${h}" rx="18"/></clipPath>
    ${patterns()}
    ${defs}
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${w}" height="${h}" fill="${C.bg}"/>
    <rect width="${w}" height="${h}" fill="url(#grid)"/>
    ${glows}
    ${body}
    <rect width="${w}" height="${h}" fill="url(#scan)"/>
  </g>
  <rect x=".75" y=".75" width="${w - 1.5}" height="${h - 1.5}" rx="17.5" fill="none" stroke="url(#edge)" stroke-width="1.5"/>
</svg>
`;
}

// Window chrome: three neon dots and a centred title, `h` px tall.
export function chrome(w, title, h = 44) {
  const dots = [C.magenta, C.amber, C.lime]
    .map((c, i) => `<circle cx="${28 + i * 22}" cy="${h / 2}" r="6" fill="${c}" opacity=".9"/>`)
    .join('');
  return `<rect width="${w}" height="${h}" fill="${C.panel}" opacity=".9"/>
  <path d="M0 ${h}H${w}" stroke="${C.line}"/>
  ${dots}
  <text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.muted}">${esc(title)}</text>`;
}

// Outlined pill sized to its mono text.
export function chip(x, y, text, color, size = 14, filled = false) {
  const w = monoWidth(text, size) + 22;
  const h = size + 14;
  const fo = filled ? '.16' : '.06';
  return {
    w,
    svg: `<g transform="translate(${x} ${y})">
    <rect width="${w}" height="${h}" rx="${h / 2}" fill="${color}" fill-opacity="${fo}" stroke="${color}" stroke-opacity=".75"/>
    <text x="${w / 2}" y="${h / 2 + size * 0.36}" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="${size}" fill="${color}">${esc(text)}</text>
  </g>`,
  };
}
