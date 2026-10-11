// Builds the static profile SVGs into assets/. Run locally after editing copy:
//   node scripts/build-assets.mjs
// Tech icons are fetched from skillicons.dev (MIT) and embedded, so the
// published SVGs have no runtime dependencies.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { C, DISPLAY, MONO, ROOT, chip, chrome, esc, fonts, monoWidth, neonFilter, panel } from './lib/neon.mjs';

const OUT = join(ROOT, 'assets');

function save(name, svg) {
  const file = join(OUT, name);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, svg);
  console.log(`${name.padEnd(28)} ${(svg.length / 1024).toFixed(1)} KB`);
}

// --- header ---------------------------------------------------------------

const PHRASES = [
  'Full-Stack Developer · Laravel + Flutter',
  'I build SaaS platforms and mobile apps',
  'Shipping Veyra, Shopp.KRD and GoPOS',
  '4+ years turning ideas into products',
];

// Discrete SMIL timeline that types and deletes each phrase in turn.
function typing(phrases, { type = 0.065, hold = 2.2, del = 0.028, gap = 0.45 } = {}) {
  const steps = [];
  const spans = [];
  let t = 0;
  for (const p of phrases) {
    const start = t;
    for (let c = 0; c <= p.length; c++) steps.push([t + c * type, c]);
    t += p.length * type + hold;
    for (let c = p.length - 1; c >= 0; c--) {
      steps.push([t, c]);
      t += del;
    }
    t += gap;
    spans.push([start, t]);
  }
  return { steps, spans, total: t };
}

const kt = (t, total) => (t / total).toFixed(5);

// Opacity keyframes that show one phrase only during its [start, end) slot.
function visibility(start, end, total) {
  const frames = [];
  if (start > 0) frames.push([0, 0]);
  frames.push([start, 1]);
  if (end < total - 1e-6) frames.push([end, 0]);
  return {
    values: frames.map(([, v]) => v).join(';'),
    keyTimes: frames.map(([t]) => kt(t, total)).join(';'),
  };
}

function header() {
  const W = 1200;
  const H = 420;
  const size = 26;
  const cw = size * 0.6;
  const x0 = 60 + monoWidth('> ', size);
  const ty = 272;
  const { steps, spans, total } = typing(PHRASES);
  const dur = `${total.toFixed(3)}s`;
  const keyTimes = steps.map(([t]) => kt(t, total)).join(';');
  const widths = steps.map(([, c]) => (c * cw).toFixed(1)).join(';');
  const cursorX = steps.map(([, c]) => (x0 + c * cw + 2).toFixed(1)).join(';');
  const anim = `dur="${dur}" repeatCount="indefinite" calcMode="discrete" keyTimes="${keyTimes}"`;

  const phrases = PHRASES.map((p, i) => {
    const vis = visibility(spans[i][0], spans[i][1], total);
    return `<text x="${x0}" y="${ty}" opacity="${i === 0 ? 1 : 0}">${esc(p)}
      <animate attributeName="opacity" dur="${dur}" repeatCount="indefinite" calcMode="discrete" values="${vis.values}" keyTimes="${vis.keyTimes}"/>
    </text>`;
  }).join('\n');

  // HUD on the right.
  const cx = 1010;
  const cy = 206;
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = (i * 5 * Math.PI) / 180;
    const r1 = 116;
    const r2 = i % 6 === 0 ? 106 : 111;
    const p = (r) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    return `M${p(r1)}L${p(r2)}`;
  }).join('');
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i + 30) * Math.PI) / 180;
    return `${(cx + 70 * Math.cos(a)).toFixed(1)},${(cy + 70 * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const spin = (d, rev = false) =>
    `<animateTransform attributeName="transform" type="rotate" from="${rev ? 360 : 0} ${cx} ${cy}" to="${rev ? 0 : 360} ${cx} ${cy}" dur="${d}s" repeatCount="indefinite"/>`;
  const sweepEnd = (deg) => {
    const a = (deg * Math.PI) / 180;
    return `${(cx + 96 * Math.cos(a)).toFixed(1)} ${(cy + 96 * Math.sin(a)).toFixed(1)}`;
  };

  // Powerline status bar.
  const bar = (() => {
    const y = 378;
    const h = 42;
    const fs = 15;
    const left = [
      { t: 'FULL-STACK DEV', bg: C.cyan, fg: C.bg },
      { t: 'laravel + flutter', bg: C.panel2, fg: C.cyan },
      { t: '4+ yrs', bg: C.line, fg: C.text },
    ];
    const right = [
      { t: 'erbil, kurdistan', bg: C.panel2, fg: C.muted },
      { t: '@ GO SOFTWARE', bg: C.magenta, fg: C.bg },
    ];
    let out = `<rect y="${y}" width="${W}" height="${h}" fill="${C.panel}"/>`;
    let x = 0;
    left.forEach((s, i) => {
      const w = monoWidth(s.t, fs) + 40;
      const next = left[i + 1]?.bg ?? C.panel;
      out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${s.bg}"/>
      <text x="${x + 20}" y="${y + 27}" font-family="${MONO}" font-weight="700" font-size="${fs}" fill="${s.fg}">${esc(s.t)}</text>
      <path d="M${x + w} ${y}H${x + w}V${y + h}Z" fill="${next}"/>
      <path d="M${x + w} ${y}L${x + w + 14} ${y + h / 2}L${x + w} ${y + h}Z" fill="${s.bg}"/>`;
      x += w + 14;
    });
    x = W;
    right.slice().reverse().forEach((s) => {
      const w = monoWidth(s.t, fs) + 40;
      x -= w;
      out += `<path d="M${x} ${y}L${x - 14} ${y + h / 2}L${x} ${y + h}Z" fill="${s.bg}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${s.bg}"/>
      <text x="${x + 20}" y="${y + 27}" font-family="${MONO}" font-weight="700" font-size="${fs}" fill="${s.fg}">${esc(s.t)}</text>`;
      x -= 14;
    });
    return out;
  })();

  const style = `${fonts('orbitron-900', 'orbitron-600', 'jetbrains-mono-400', 'jetbrains-mono-700')}
    .name{animation:flicker 7s infinite}
    .gl1,.gl2{opacity:0;animation:glitch 5s infinite}
    .gl2{animation-delay:.08s}
    @keyframes flicker{0%,18%,22%,62%,64%,100%{opacity:1}19%,21%{opacity:.55}63%{opacity:.8}}
    @keyframes glitch{0%,86%,94%,100%{opacity:0;transform:none}
      87%{opacity:.9;transform:translate(-7px,1px)}89%{opacity:.7;transform:translate(6px,-2px)}
      91%{opacity:.9;transform:translate(-3px,2px)}93%{opacity:.5;transform:translate(4px,0)}}
    .blink{animation:blink 1s steps(1) infinite}
    @keyframes blink{50%{opacity:0}}`;

  const defs = `${neonFilter('neon', C.cyan)}${neonFilter('neonM', C.magenta, 0.7)}
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${C.cyan}" stop-opacity=".07"/>
      <stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/>
      <stop offset="1" stop-color="${C.cyan}" stop-opacity=".35"/>
    </linearGradient>
    <clipPath id="typed"><rect x="${x0}" y="${ty - 30}" height="42" width="${(PHRASES[0].length * cw).toFixed(1)}">
      <animate attributeName="width" ${anim} values="${widths}"/>
    </rect></clipPath>`;

  const body = `
  <rect y="-140" width="${W}" height="140" fill="url(#beam)">
    <animate attributeName="y" from="-140" to="${H}" dur="7s" repeatCount="indefinite"/>
  </rect>
  ${chrome(W, 'ahmad@erbil: ~/profile — zsh')}
  <g font-family="${MONO}" font-size="12" font-weight="700">
    <circle cx="${W - 92}" cy="22" r="4" fill="${C.lime}" class="blink"/>
    <text x="${W - 82}" y="26" fill="${C.lime}" letter-spacing="2">ONLINE</text>
  </g>

  <text x="60" y="112" font-family="${MONO}" font-size="20">
    <tspan fill="${C.lime}">ahmad@erbil</tspan><tspan fill="${C.muted}">:~$ </tspan><tspan fill="${C.text}">whoami</tspan>
  </text>

  <g font-family="${DISPLAY}" font-weight="900" font-size="80" letter-spacing="6">
    <text class="gl1" x="60" y="206" fill="${C.magenta}">AHMAD NAJM</text>
    <text class="gl2" x="60" y="206" fill="${C.cyan}">AHMAD NAJM</text>
    <text class="name" x="60" y="206" fill="#F4FEFF" filter="url(#neon)">AHMAD NAJM</text>
  </g>

  <g font-family="${MONO}" font-size="${size}" font-weight="700">
    <text x="60" y="${ty}" fill="${C.magenta}">&gt;</text>
    <g clip-path="url(#typed)" fill="${C.cyan}">${phrases}</g>
    <rect y="${ty - 23}" width="13" height="29" fill="${C.cyan}" x="${(x0 + PHRASES[0].length * cw + 2).toFixed(1)}" class="blink">
      <animate attributeName="x" ${anim} values="${cursorX}"/>
    </rect>
  </g>
  <text x="60" y="324" font-family="${MONO}" font-size="18" fill="${C.muted}">I design, build and ship web + mobile products — end to end.</text>

  <g>
    <circle cx="${cx}" cy="${cy}" r="140" fill="none" stroke="${C.cyan}" stroke-opacity=".12"/>
    <circle cx="${cx}" cy="${cy}" r="130" fill="none" stroke="${C.cyan}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="2 9">${spin(40)}</circle>
    <path d="${ticks}" stroke="${C.cyan}" stroke-opacity=".5" stroke-width="1.5">${spin(90, true)}</path>
    <circle cx="${cx}" cy="${cy}" r="96" fill="none" stroke="${C.magenta}" stroke-width="4" stroke-linecap="round"
      stroke-dasharray="110 40 60 40 190 163" filter="url(#neonM)">${spin(14)}</circle>
    <path d="M${cx} ${cy}L${sweepEnd(0)}A96 96 0 0 1 ${sweepEnd(50)}Z" fill="url(#sweep)">${spin(5)}</path>
    <polygon points="${hex}" fill="${C.panel}" fill-opacity=".9" stroke="${C.cyan}" stroke-width="2" filter="url(#neon)"/>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-family="${DISPLAY}" font-weight="900" font-size="50" fill="#F4FEFF" filter="url(#neon)">AN</text>
    <text x="${cx}" y="364" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.muted}" letter-spacing="1">ERBIL · 36.19°N 44.01°E</text>
  </g>
  ${bar}`;

  return panel({
    w: W,
    h: H,
    title: 'Ahmad Najm — Full-Stack Developer (Laravel + Flutter), Erbil',
    style,
    defs,
    body,
  });
}

// --- about (tmux split) -----------------------------------------------------

function about() {
  const W = 1200;
  const H = 500;
  const fs = 17;
  const lh = 27;
  const split = 700;
  const k = (s) => `<tspan fill="${C.cyan}">"${s}"</tspan><tspan fill="${C.muted}">:</tspan>`;
  const str = (s) => `<tspan fill="${C.amber}">"${esc(s)}"</tspan>`;
  const arr = (xs) =>
    `<tspan fill="${C.magenta}">[</tspan>${xs.map(str).join(`<tspan fill="${C.muted}">, </tspan>`)}<tspan fill="${C.magenta}">]</tspan>`;
  const comma = `<tspan fill="${C.muted}">,</tspan>`;
  const pad = (key) => ' '.repeat(10 - key.length - 3);
  const row = (key, val, last = false) => `  ${k(key)}${pad(key)} ${val}${last ? '' : comma}`;
  const prompt = (cmd) =>
    `<tspan fill="${C.lime}">ahmad@erbil</tspan><tspan fill="${C.muted}">:~$ </tspan><tspan fill="${C.text}">${esc(cmd)}</tspan>`;

  const left = [
    prompt('cat profile.json'),
    `<tspan fill="${C.magenta}">{</tspan>`,
    row('name', str('Ahmad Najm')),
    row('role', str('Full-Stack Developer')),
    row('stack', arr(['Laravel', 'Flutter', 'Filament'])),
    row('years', str('4+')),
    row('based', str('Erbil, Kurdistan')),
    row('now', str('GO Software')),
    row('builds', arr(['SaaS', 'mobile apps', 'APIs'])),
    row('craft', arr(['clean architecture', 'RTL UX'])),
    row('open_to', str('client projects via GO Software'), true),
    `<tspan fill="${C.magenta}">}</tspan>`,
    `${prompt('')}<tspan class="blink" fill="${C.cyan}">█</tspan>`,
  ];

  const dir = (name, text, color) =>
    `<tspan fill="${color}" font-weight="700">${name}</tspan>${' '.repeat(11 - name.length)}<tspan fill="${C.text}">${esc(text)}</tspan>`;
  const right = [
    prompt('ls ~/focus'),
    dir('backend/', 'APIs, admin panels, SaaS', C.cyan),
    dir('mobile/', 'Flutter, iOS + Android', C.magenta),
    dir('product/', 'RTL & multilingual UX', C.violet),
    dir('shipping/', 'App Store, Google Play', C.lime),
    '',
    prompt('uptime'),
    `<tspan fill="${C.muted}">up 4+ years · still shipping</tspan>`,
    '',
    prompt('cat motto.txt'),
    `<tspan fill="${C.amber}">First, solve the problem.</tspan>`,
    `<tspan fill="${C.amber}">Then, write the code.</tspan>`,
  ];

  const lines = (xs, x, y0, delay0) =>
    xs
      .map((l, i) => `<text class="ln" style="animation-delay:${(delay0 + i * 0.11).toFixed(2)}s" x="${x}" y="${y0 + i * lh}" xml:space="preserve">${l}</text>`)
      .join('\n');

  const sb = H - 36;
  const style = `${fonts('jetbrains-mono-400', 'jetbrains-mono-700')}
    .ln{animation:in .35s ease-out both}
    @keyframes in{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
    .blink{animation:blink 1s steps(1) infinite}
    @keyframes blink{50%{opacity:0}}`;

  const body = `
  ${chrome(W, 'tmux · ahmad@erbil: ~')}
  <path d="M${split} 44V${sb}" stroke="${C.line}" stroke-width="2"/>
  <g font-family="${MONO}" font-size="${fs}">
    ${lines(left, 40, 92, 0.1)}
    ${lines(right, split + 36, 92, 0.6)}
  </g>
  <rect y="${sb}" width="${W}" height="36" fill="${C.panel}"/>
  <path d="M0 ${sb}H${W}" stroke="${C.line}"/>
  <g font-family="${MONO}" font-size="14" font-weight="700">
    <rect y="${sb}" width="104" height="36" fill="${C.cyan}"/>
    <text x="18" y="${sb + 23}" fill="${C.bg}">[profile]</text>
    <text x="124" y="${sb + 23}" fill="${C.cyan}">0:zsh*</text>
    <text x="196" y="${sb + 23}" fill="${C.muted}">1:laravel  2:flutter  3:filament</text>
    <text x="${W - 20}" y="${sb + 23}" text-anchor="end" fill="${C.muted}">erbil · utc+3</text>
  </g>`;

  return panel({ w: W, h: H, title: 'About Ahmad Najm', style, body });
}

// --- section titles -----------------------------------------------------------

function title(n, label, accent = C.cyan) {
  const W = 1200;
  const H = 76;
  const fs = 28;
  const lx = 112;
  const style = `${fonts('orbitron-900', 'jetbrains-mono-700')}
    .pulse{animation:run 4.5s linear infinite}
    @keyframes run{from{transform:translateX(0)}to{transform:translateX(${W}px)}}`;
  const body = `
  <rect width="${W}" height="${H}" fill="${C.panel}" opacity=".6"/>
  <text x="34" y="${H / 2 + 7}" font-family="${MONO}" font-weight="700" font-size="20" fill="${C.magenta}">//${n}</text>
  <text x="${lx}" y="${H / 2 + 10}" font-family="${DISPLAY}" font-weight="900" font-size="${fs}" letter-spacing="5" fill="#F4FEFF" filter="url(#neon)">${esc(label)}</text>
  <rect x="-140" y="${H - 3}" width="140" height="3" fill="url(#pulse)" class="pulse"/>
  <path d="M0 ${H - 1.5}H${W}" stroke="${accent}" stroke-opacity=".25"/>`;
  const defs = `${neonFilter('neon', accent, 0.8)}
    <linearGradient id="pulse"><stop offset="0" stop-color="${accent}" stop-opacity="0"/><stop offset="1" stop-color="${accent}"/></linearGradient>`;
  return panel({ w: W, h: H, title: label, style, defs, body, accent, glow: false })
    .replace('rx="18"', 'rx="12"')
    .replace('rx="17.5"', 'rx="11.5"');
}

// --- product cards --------------------------------------------------------------

const veyraPng = readFileSync(join(OUT, 'logos', 'veyra.png')).toString('base64');
const shoppSvg = readFileSync(join(OUT, 'logos', 'shopp.svg'), 'utf8');

const LOGOS = {
  veyra: (s) => `<clipPath id="lg"><rect width="${s}" height="${s}" rx="${s * 0.23}"/></clipPath>
    <image href="data:image/png;base64,${veyraPng}" width="${s}" height="${s}" clip-path="url(#lg)"/>`,
  // Shopp.KRD favicon, nested at the tile size.
  shopp: (s) => shoppSvg.replace('width="1024" height="1024"', `width="${s}" height="${s}"`),
  // GoPOS has no mark yet: a neon card terminal with a printing receipt.
  gopos: (s) => `<g transform="scale(${s / 140})">
    <rect width="140" height="140" rx="32" fill="${C.panel2}" stroke="${C.violet}" stroke-width="2"/>
    <g fill="none" stroke="${C.violet}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" filter="url(#neonL)">
      <path d="M50 44V24H90V44"/>
      <path d="M58 32H82M58 38H74"/>
      <rect x="36" y="44" width="68" height="74" rx="10"/>
      <rect x="47" y="55" width="46" height="20" rx="4"/>
    </g>
    <g fill="${C.violet}">
      ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<circle cx="${54 + c * 16}" cy="${88 + r * 10}" r="3.2"/>`).join('')).join('')}
    </g>
  </g>`,
};

const PROJECTS = [
  {
    id: 'veyra',
    n: '01',
    name: 'Veyra',
    accent: C.cyan,
    status: 'LIVE · iOS + ANDROID',
    url: 'useveyra.co',
    tagline: 'Kurdish Sorani subtitles for English YouTube videos.',
    features: ['Flutter app in English + Sorani with full RTL support', 'Live on the App Store and Google Play'],
    stack: ['Flutter', 'Riverpod', 'Drift', 'Laravel 13', 'Filament'],
  },
  {
    id: 'shopp',
    n: '02',
    name: 'Shopp.KRD',
    accent: C.orange,
    status: 'LIVE',
    url: 'shopp.krd',
    tagline: 'Online store builder for merchants in Kurdistan & Iraq.',
    features: ['Products & variants, orders, coupons, city delivery rates', 'Custom domains · local payments: FIB, FastPay, Zain Cash'],
    stack: ['Laravel 12', 'Livewire 4', 'Tailwind 4'],
  },
  {
    id: 'gopos',
    n: '03',
    name: 'GoPOS',
    accent: C.violet,
    status: 'IN DEVELOPMENT',
    url: 'gosoftware.krd',
    tagline: 'Retail POS + shop management SaaS for Kurdistan & Iraq.',
    features: ['IQD-first, with real multi-currency payments at checkout', 'Built to keep selling through short internet outages'],
    stack: ['Laravel 13', 'Filament 5', 'Pest', 'MariaDB'],
  },
];

function card(p) {
  const W = 1200;
  const H = 260;
  const tx = 228;
  const logo = 140;
  const pill = chip(0, 0, p.status, p.accent, 13, true);
  let cx = tx;
  const chips = p.stack
    .map((s) => {
      const c = chip(cx, 204, s, p.accent, 13);
      cx += c.w + 10;
      return c.svg;
    })
    .join('');
  const feats = p.features
    .map((f, i) => `<rect x="${tx}" y="${153 + i * 27}" width="7" height="7" fill="${p.accent}" transform="rotate(45 ${tx + 3.5} ${157 + i * 27})"/>
      <text x="${tx + 20}" y="${162 + i * 27}" font-family="${MONO}" font-size="16" fill="${C.muted}">${esc(f)}</text>`)
    .join('');
  const urlW = monoWidth(p.url, 16);

  const style = `${fonts('orbitron-900', 'jetbrains-mono-400', 'jetbrains-mono-700')}
    .halo{animation:halo 3.2s ease-in-out infinite}
    @keyframes halo{50%{opacity:.35}}`;
  const defs = `${neonFilter('neon', p.accent, 0.8)}${neonFilter('neonL', p.accent, 0.5)}
    <radialGradient id="halo"><stop offset="0" stop-color="${p.accent}" stop-opacity=".55"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>`;
  const body = `
  <rect width="5" height="${H}" fill="${p.accent}" filter="url(#neon)"/>
  <text x="${W - 36}" y="226" text-anchor="end" font-family="${DISPLAY}" font-weight="900" font-size="170" fill="${p.accent}" opacity=".06">${p.n}</text>
  <circle class="halo" cx="${48 + logo / 2}" cy="${60 + logo / 2}" r="${logo * 0.85}" fill="url(#halo)" opacity=".7"/>
  <g transform="translate(48 60)">${LOGOS[p.id](logo)}</g>
  <text x="${tx}" y="88" font-family="${DISPLAY}" font-weight="900" font-size="40" letter-spacing="2" fill="#F4FEFF" filter="url(#neon)">${esc(p.name)}</text>
  <text x="${tx}" y="128" font-family="${MONO}" font-size="20" fill="${C.text}">${esc(p.tagline)}</text>
  ${feats}
  ${chips}
  <g transform="translate(${W - 40 - pill.w} 40)">${pill.svg}</g>
  <g font-family="${MONO}" font-weight="700" font-size="16" fill="${p.accent}">
    <text x="${W - 70}" y="228" text-anchor="end">${esc(p.url)}</text>
    <path d="M${W - 60} 222H${W - 42}M${W - 49} 215L${W - 42} 222L${W - 49} 229" fill="none" stroke="${p.accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${W - 70 - urlW} 236H${W - 42}" stroke="${p.accent}" stroke-opacity=".35"/>
  </g>`;
  return panel({ w: W, h: H, title: `${p.name} — ${p.tagline}`, style, defs, body, accent: p.accent });
}

// --- client work at GO Software ---------------------------------------------------

const CLIENT_LOGOS = join(OUT, 'logos', 'clients');
const MIME = { png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml' };

function dataUri(file) {
  const b64 = readFileSync(join(CLIENT_LOGOS, file)).toString('base64');
  return `data:${MIME[file.split('.').pop()]};base64,${b64}`;
}

// Logos keep their own colours on a light plate, so dark marks stay visible.
function plate(x, y, w, h, file, accent, pad) {
  return `<g transform="translate(${x} ${y})">
    <rect width="${w}" height="${h}" rx="14" fill="${accent}" opacity=".3" filter="url(#plateGlow)"/>
    <rect width="${w}" height="${h}" rx="14" fill="#F4F7FB"/>
    <image href="${dataUri(file)}" x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" preserveAspectRatio="xMidYMid meet"/>
    <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="13" fill="none" stroke="${accent}" stroke-opacity=".7" stroke-width="2"/>
  </g>`;
}

const plateGlow = `<filter id="plateGlow" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>`;

const TYPES = {
  app: ['MOBILE APP', C.cyan],
  web: ['WEBSITE', C.lime],
  system: ['MANAGEMENT SYSTEM', C.violet],
};

// Facts come from gosoftware.krd/projects and each repo's composer.json.
const CLIENT_WORK = [
  {
    id: 'asaari',
    name: 'Asaari',
    type: 'app',
    logo: 'asaari.png',
    live: true,
    link: 'App Store',
    lines: ['Gold prices & calculator, alerts, news and a community,', 'in English, Arabic and Kurdish with full RTL.'],
    stack: ['Flutter', 'GetX', 'Laravel 12', 'Filament 4'],
  },
  {
    id: 'climax',
    name: 'Climax',
    type: 'web',
    logo: 'climax.png',
    live: true,
    link: 'climax.krd',
    lines: ['Brand website and a 40+ product catalogue with specs', 'for a home appliances company in Erbil.'],
    stack: ['Laravel 12', 'Filament 4', 'Livewire 3'],
  },
  {
    id: 'power-orbits',
    name: 'Power Orbits',
    type: 'web',
    logo: 'power-orbits.png',
    live: true,
    link: 'powerorbits.com',
    lines: ['Website for a solar energy and storage company in', 'Erbil: services, products, projects and quotes.'],
    stack: ['Laravel 12', 'Filament 3', 'Livewire 3'],
  },
  {
    id: 'fire-agency',
    name: 'Fire Agency CRM',
    type: 'system',
    logo: 'fire-agency.png',
    live: false,
    link: 'case study',
    lines: ['The CRM behind Fire Production, a cinematic', 'production and talent agency.'],
    stack: ['Laravel 12', 'Filament 3'],
  },
  {
    id: 'fantasy-town',
    name: 'Fantasy Town',
    type: 'system',
    logo: 'fantasy-town.png',
    live: false,
    link: 'case study',
    lines: ['Property management system with a secure admin', 'panel for Fantasy Town in Shaqlawa.'],
    stack: ['Laravel 11', 'Filament 3'],
  },
  {
    id: 'folivya',
    name: 'Folivya Academy',
    type: 'system',
    logo: 'folivya.png',
    live: false,
    link: 'case study',
    lines: ["Management system the academy's team works in,", 'behind a secure login.'],
    stack: ['Laravel 12', 'Filament 4'],
  },
];

function clientCard(p) {
  const W = 590;
  const H = 244;
  const [type, accent] = TYPES[p.type];
  const tx = 182;
  const pill = chip(tx, 80, type, accent, 12, true);
  const sx = tx + pill.w + 14;
  const [label, color] = p.live ? ['LIVE', C.lime] : ['INTERNAL', C.muted];
  let cx = 28;
  const chips = p.stack
    .map((s) => {
      const c = chip(cx, 202, s, accent, 12);
      cx += c.w + 8;
      return c.svg;
    })
    .join('');
  const lines = p.lines
    .map((l, i) => `<text x="28" y="${160 + i * 22}" font-family="${MONO}" font-size="15" fill="${C.text}">${esc(l)}</text>`)
    .join('');

  const style = `${fonts('orbitron-900', 'jetbrains-mono-400', 'jetbrains-mono-700')}
    .blink{animation:blink 1.4s steps(1) infinite}
    @keyframes blink{50%{opacity:.25}}`;
  const defs = `${neonFilter('neon', accent, 0.7)}${plateGlow}`;
  const body = `
  <rect width="${W}" height="4" fill="${accent}" filter="url(#neon)"/>
  ${plate(28, 28, 132, 96, p.logo, accent, 12)}
  <text x="${tx}" y="64" font-family="${DISPLAY}" font-weight="900" font-size="25" letter-spacing="1" fill="#F4FEFF" filter="url(#neon)">${esc(p.name)}</text>
  ${pill.svg}
  <circle cx="${sx + 4}" cy="93" r="4" fill="${color}"${p.live ? ' class="blink"' : ''}/>
  <text x="${sx + 14}" y="97.5" font-family="${MONO}" font-weight="700" font-size="12" letter-spacing="1" fill="${color}">${label}</text>
  ${lines}
  ${chips}
  <g font-family="${MONO}" font-weight="700" font-size="14" fill="${accent}">
    <text x="${W - 54}" y="220" text-anchor="end">${esc(p.link)}</text>
    <path d="M${W - 46} 215H${W - 30}M${W - 36} 209L${W - 30} 215L${W - 36} 221" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
  return panel({ w: W, h: H, title: `${p.name} — ${type.toLowerCase()} by GO Software`, style, defs, body, accent });
}

const CLIENTS = [
  ['Folivya Academy', 'folivya.png'],
  ['Fire Production', 'fire-agency.png'],
  ['Power Orbits', 'power-orbits.png'],
  ['Climax', 'climax.png'],
  ['Zuu Delivery', 'zuu.svg'],
  ['Asaari', 'asaari.png'],
  ['Suli Shopping', 'suli-shopping.jpg'],
  ['Fantasy Town', 'fantasy-town.png'],
  ['Didam Store', 'didam.jpg'],
];

function clients() {
  const W = 1200;
  const H = 412;
  const tw = 196;
  const th = 96;
  const gap = 26;
  const accents = [C.cyan, C.magenta, C.violet, C.lime, C.orange, C.amber];
  const rows = [CLIENTS.slice(0, 5), CLIENTS.slice(5)];
  let i = 0;
  const tiles = rows
    .map((row, r) => {
      const x0 = (W - (row.length * tw + (row.length - 1) * gap)) / 2;
      const y = 106 + r * 150;
      return row
        .map(([name, file], k) => {
          const x = x0 + k * (tw + gap);
          const accent = accents[i++ % accents.length];
          return `${plate(x, y, tw, th, file, accent, 14)}
          <text x="${x + tw / 2}" y="${y + th + 26}" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.muted}">${esc(name)}</text>`;
        })
        .join('\n');
    })
    .join('\n');

  const style = fonts('orbitron-600', 'jetbrains-mono-400');
  const defs = `${plateGlow}
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${C.cyan}" stop-opacity=".08"/>
      <stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
    </linearGradient>`;
  const body = `
  <rect x="-200" width="200" height="${H}" fill="url(#beam)">
    <animate attributeName="x" from="-200" to="${W}" dur="6s" repeatCount="indefinite"/>
  </rect>
  <text x="${W / 2}" y="50" text-anchor="middle" font-family="${DISPLAY}" font-weight="600" font-size="16" letter-spacing="4" fill="${C.cyan}">TRUSTED BY BUSINESSES ACROSS KURDISTAN &amp; IRAQ</text>
  <text x="${W / 2}" y="76" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.muted}">${CLIENTS.length} clients · websites, mobile apps and management systems</text>
  ${tiles}`;
  return panel({ w: W, h: H, title: 'Clients of GO Software', style, defs, body });
}

// --- tech stack -----------------------------------------------------------------

async function icon(name, prefix) {
  const res = await fetch(`https://skillicons.dev/icons?i=${name}&theme=dark`);
  if (!res.ok) throw new Error(`skillicons ${name}: ${res.status}`);
  const svg = await res.text();
  if ((svg.match(/<svg/g) || []).length < 2) throw new Error(`skillicons ${name}: unknown icon`);
  return svg
    .replace(/id="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}-$1"`);
}

const STACK = [
  { label: 'BACKEND', accent: C.cyan, icons: ['php', 'laravel'], chips: ['Filament', 'Livewire', 'Sanctum', 'Pest'] },
  { label: 'MOBILE', accent: C.magenta, icons: ['dart', 'flutter', 'firebase', 'androidstudio'], chips: ['Riverpod', 'Drift'] },
  { label: 'FRONTEND', accent: C.violet, icons: ['js', 'ts', 'html', 'css', 'tailwind', 'alpinejs'], chips: [] },
  { label: 'DATA', accent: C.orange, icons: ['mysql', 'postgres', 'redis', 'sqlite', 'mongodb'], chips: [] },
  { label: 'DEVOPS', accent: C.lime, icons: ['docker', 'nginx', 'linux', 'git', 'githubactions', 'cloudflare'], chips: [] },
  { label: 'TOOLS', accent: C.amber, icons: ['phpstorm', 'vscode', 'figma', 'postman'], chips: [] },
];

async function stack() {
  const W = 1200;
  const H = 470;
  const bw = 555;
  const bh = 126;
  const size = 52;
  let n = 0;
  const boxes = [];
  for (const [i, g] of STACK.entries()) {
    const x = 30 + (i % 2) * 585;
    const y = 30 + Math.floor(i / 2) * 140;
    let ix = x + 22;
    const iy = y + 52;
    const icons = [];
    for (const name of g.icons) {
      const svg = await icon(name, `i${n++}`);
      icons.push(svg.replace(/<svg width="48" height="48"/, `<svg x="${ix}" y="${iy}" width="${size}" height="${size}"`));
      ix += size + 12;
    }
    const chips = g.chips
      .map((c) => {
        const ch = chip(ix, iy + 12, c, g.accent, 13);
        ix += ch.w + 8;
        return ch.svg;
      })
      .join('');
    boxes.push(`<g>
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="14" fill="${C.panel}" fill-opacity=".85" stroke="${g.accent}" stroke-opacity=".35"/>
      <rect x="${x}" y="${y + 18}" width="3" height="22" fill="${g.accent}"/>
      <text x="${x + 22}" y="${y + 35}" font-family="${DISPLAY}" font-weight="600" font-size="15" letter-spacing="3" fill="${g.accent}">${g.label}</text>
      <text x="${x + bw - 20}" y="${y + 35}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.dim}">0x0${i + 1}</text>
      ${icons.join('\n')}
      ${chips}
    </g>`);
  }
  const style = fonts('orbitron-600', 'jetbrains-mono-400', 'jetbrains-mono-700');
  return panel({ w: W, h: H, title: 'Tech stack', style, body: boxes.join('\n') });
}

// --- buttons --------------------------------------------------------------------

const ICONS = {
  web: (c) => `<g fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12H22M12 2C15 5 16 8.5 16 12S15 19 12 22C9 19 8 15.5 8 12S9 5 12 2Z"/></g>`,
  linkedin: (c) => `<rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="${c}" stroke-width="2"/>
    <g fill="${c}"><rect x="6" y="10" width="2.6" height="8"/><circle cx="7.3" cy="6.9" r="1.6"/>
    <path d="M11 10H13.5V11.2C14 10.4 15 9.8 16.2 9.8C18.2 9.8 18.6 11.2 18.6 13V18H16V13.6C16 12.6 15.8 11.9 14.9 11.9S13.6 12.6 13.6 13.6V18H11Z"/></g>`,
  mail: (c) => `<g fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M3 6L12 13L21 6"/></g>`,
  instagram: (c) => `<g fill="none" stroke="${c}" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="6"/><circle cx="12" cy="12" r="4.5"/></g><circle cx="17.5" cy="6.5" r="1.3" fill="${c}"/>`,
  arrow: (c) => `<path d="M3 12H20M14 6L20 12L14 18" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function chamfer(w, h, k = 12) {
  return `M${k} 0H${w}V${h - k}L${w - k} ${h}H0V${k}Z`;
}

function button(label, iconName, accent, w = 230) {
  const h = 54;
  const fs = 15;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <title>${esc(label)}</title>
  <defs><style>${fonts('orbitron-600')}</style>${neonFilter('neon', accent, 0.45)}
    <linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity=".18"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="${chamfer(w - 2, h - 2)}" transform="translate(1 1)" fill="${C.bg}"/>
  <path d="${chamfer(w - 2, h - 2)}" transform="translate(1 1)" fill="url(#f)" stroke="${accent}" stroke-width="1.6"/>
  <g transform="translate(22 ${(h - 24) / 2})" filter="url(#neon)">${ICONS[iconName](accent)}</g>
  <text x="62" y="${h / 2 + 5.5}" font-family="${DISPLAY}" font-weight="600" font-size="${fs}" letter-spacing="2.5" fill="${accent}">${esc(label)}</text>
</svg>
`;
}

// Store icons are Simple Icons paths (CC0) on a 24px grid.
const iconPath = (name) => readFileSync(join(OUT, 'logos', 'icons', `${name}.svg`), 'utf8').match(/ d="([^"]+)"/)[1];

function storeBadge(kicker, label, accent, glyph, w = 236) {
  const h = 58;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <title>${esc(`${kicker} ${label}`)}</title>
  <defs><style>${fonts('orbitron-600', 'jetbrains-mono-700')}</style>${neonFilter('neon', accent, 0.45)}
    <linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity=".18"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="${chamfer(w - 2, h - 2)}" transform="translate(1 1)" fill="${C.bg}"/>
  <path d="${chamfer(w - 2, h - 2)}" transform="translate(1 1)" fill="url(#f)" stroke="${accent}" stroke-width="1.6"/>
  <g transform="translate(20 ${(h - 26) / 2}) scale(${26 / 24})" filter="url(#neon)">${glyph}</g>
  <text x="62" y="24" font-family="${MONO}" font-weight="700" font-size="10" letter-spacing="1.5" fill="${C.muted}">${esc(kicker)}</text>
  <text x="62" y="44" font-family="${DISPLAY}" font-weight="600" font-size="18" fill="${accent}">${esc(label)}</text>
</svg>
`;
}

function cta() {
  const w = 560;
  const h = 96;
  const style = `${fonts('orbitron-900', 'jetbrains-mono-400')}
    .glow{animation:glow 2.6s ease-in-out infinite}
    @keyframes glow{50%{opacity:.45}}
    .nudge{animation:nudge 1.6s ease-in-out infinite}
    @keyframes nudge{50%{transform:translateX(6px)}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <title>Start a project with GO Software</title>
  <defs><style>${style}</style>${neonFilter('neon', C.cyan, 0.7)}
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>
    <linearGradient id="fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".16"/><stop offset="1" stop-color="${C.magenta}" stop-opacity=".1"/></linearGradient>
  </defs>
  <path class="glow" d="${chamfer(w - 8, h - 8, 18)}" transform="translate(4 4)" fill="none" stroke="url(#edge)" stroke-width="6" opacity=".9" filter="url(#neon)"/>
  <path d="${chamfer(w - 8, h - 8, 18)}" transform="translate(4 4)" fill="${C.bg}"/>
  <path d="${chamfer(w - 8, h - 8, 18)}" transform="translate(4 4)" fill="url(#fill)" stroke="url(#edge)" stroke-width="2"/>
  <text x="44" y="47" font-family="${DISPLAY}" font-weight="900" font-size="24" letter-spacing="3" fill="#F4FEFF" filter="url(#neon)">START A PROJECT</text>
  <text x="44" y="72" font-family="${MONO}" font-size="15" fill="${C.cyanSoft}">gosoftware.krd · web + mobile, end to end</text>
  <g transform="translate(${w - 78} ${h / 2 - 16}) scale(1.35)"><g class="nudge">${ICONS.arrow(C.magenta)}</g></g>
</svg>
`;
}

// --- footer ---------------------------------------------------------------------

function footer() {
  const W = 1200;
  const H = 112;
  const style = `${fonts('orbitron-600', 'jetbrains-mono-400')}
    .dot{animation:run 3.6s linear infinite}
    @keyframes run{from{transform:translateX(-60px)}to{transform:translateX(${W + 60}px)}}`;
  const defs = `<linearGradient id="trail"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient>`;
  const body = `
  <path d="M0 ${H - 22}H${W}" stroke="${C.cyan}" stroke-opacity=".18"/>
  <g class="dot"><rect x="-80" y="${H - 23.5}" width="80" height="3" fill="url(#trail)"/><circle cy="${H - 22}" r="3.5" fill="${C.cyan}"/></g>
  <text x="${W / 2}" y="42" text-anchor="middle" font-family="${DISPLAY}" font-weight="600" font-size="15" letter-spacing="6" fill="${C.cyan}">// END OF TRANSMISSION</text>
  <text x="${W / 2}" y="70" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.muted}">thanks for stopping by — let's build something great</text>`;
  return panel({ w: W, h: H, title: 'End of transmission', style, defs, body, glow: false });
}

// --- build ----------------------------------------------------------------------

save('header.svg', header());
save('about.svg', about());
[
  ['01', 'WHOAMI', C.cyan, 'whoami'],
  ['02', 'PRODUCTS I BUILT', C.magenta, 'products'],
  ['03', 'CLIENT WORK @ GO SOFTWARE', C.amber, 'client-work'],
  ['04', 'TECH STACK', C.violet, 'tech-stack'],
  ['05', 'ACTIVITY', C.lime, 'activity'],
  ['06', "LET'S BUILD", C.orange, 'lets-build'],
].forEach(([n, label, accent, slug]) => save(`titles/${slug}.svg`, title(n, label, accent)));
for (const p of PROJECTS) save(`projects/${p.id}.svg`, card(p));
for (const p of CLIENT_WORK) save(`work/${p.id}.svg`, clientCard(p));
save('clients.svg', clients());
save('stack.svg', await stack());
save('buttons/app-store.svg', storeBadge('DOWNLOAD ON THE', 'App Store', C.cyan, `<path fill="${C.cyan}" d="${iconPath('apple')}"/>`));
save('buttons/google-play.svg', storeBadge('GET IT ON', 'Google Play', C.lime, `<path fill="${C.lime}" d="${iconPath('googleplay')}"/>`));
save('buttons/useveyra.svg', storeBadge('VISIT', 'useveyra.co', C.violet, ICONS.web(C.violet)));
save('buttons/website.svg', button('WEBSITE', 'web', C.cyan));
save('buttons/linkedin.svg', button('LINKEDIN', 'linkedin', '#3FA9FF'));
save('buttons/email.svg', button('EMAIL', 'mail', C.magenta));
save('buttons/instagram.svg', button('INSTAGRAM', 'instagram', C.orange));
save('buttons/start-project.svg', cta());
save('footer.svg', footer());
