// Builds the activity dashboard SVG from the public contribution calendar.
//   GITHUB_TOKEN=... node scripts/stats.mjs <out-dir> [login]
// Runs in .github/workflows/profile.yml and publishes to the `output` branch.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { C, DISPLAY, MONO, chrome, esc, fonts, neonFilter, panel } from './lib/neon.mjs';

const outDir = process.argv[2] ?? 'dist';
const login = process.argv[3] ?? process.env.GITHUB_REPOSITORY_OWNER ?? 'ahmadnajmdev';
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required');

const CALENDAR = `query($login: String!, $from: DateTime, $to: DateTime) {
  user(login: $login) {
    createdAt
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function calendar(from, to) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': `${login}-profile-stats`,
    },
    body: JSON.stringify({ query: CALENDAR, variables: { login, from, to } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data.user;
}

// --- data -----------------------------------------------------------------------

const recent = await calendar();
const weeks = recent.contributionsCollection.contributionCalendar.weeks;
const lastYear = recent.contributionsCollection.contributionCalendar.totalContributions;
const firstYear = new Date(recent.createdAt).getUTCFullYear();
const thisYear = new Date().getUTCFullYear();

// The API caps each window at one year, so walk every calendar year.
const byDate = new Map();
for (let y = firstYear; y <= thisYear; y++) {
  const u = await calendar(`${y}-01-01T00:00:00Z`, `${y}-12-31T23:59:59Z`);
  for (const w of u.contributionsCollection.contributionCalendar.weeks) {
    for (const d of w.contributionDays) byDate.set(d.date, d.contributionCount);
  }
}
for (const w of weeks) for (const d of w.contributionDays) byDate.set(d.date, d.contributionCount);

const days = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
const today = weeks.at(-1).contributionDays.at(-1).date;
const upToToday = days.filter(([d]) => d <= today);
const sum = (xs) => xs.reduce((s, [, n]) => s + n, 0);
const total = sum(upToToday);
const ytd = sum(upToToday.filter(([d]) => d.startsWith(`${thisYear}-`)));

let longest = 0;
let run = 0;
for (const [, n] of upToToday) {
  run = n > 0 ? run + 1 : 0;
  longest = Math.max(longest, run);
}

const activeDays = weeks.flatMap((w) => w.contributionDays).filter((d) => d.contributionCount > 0).length;
const series = weeks.map((w) => w.contributionDays.reduce((s, d) => s + d.contributionCount, 0));
const peak = Math.max(1, ...series);

// --- svg ------------------------------------------------------------------------

const W = 1200;
const H = 380;
const fmt = (n) => n.toLocaleString('en-US');

function tile(x, y, label, sub, value, color) {
  return `<g transform="translate(${x} ${y})">
    <rect width="250" height="128" rx="14" fill="${C.panel}" fill-opacity=".85" stroke="${color}" stroke-opacity=".35"/>
    <rect y="18" width="3" height="22" fill="${color}"/>
    <text x="20" y="35" font-family="${DISPLAY}" font-weight="600" font-size="13" letter-spacing="2" fill="${color}">${esc(label)}</text>
    <text x="20" y="90" font-family="${DISPLAY}" font-weight="900" font-size="44" fill="#F4FEFF" filter="url(#n-${color.slice(1)})">${esc(value)}</text>
    <text x="20" y="114" font-family="${MONO}" font-size="13" fill="${C.muted}">${esc(sub)}</text>
  </g>`;
}

const cx0 = 600;
const cx1 = 1160;
const cy0 = 104;
const cy1 = 300;
const px = (i) => cx0 + (i * (cx1 - cx0)) / (series.length - 1);
const py = (v) => cy1 - (v / peak) * (cy1 - cy0);
const pts = series.map((v, i) => [px(i), py(v)]);

// Catmull-Rom to cubic Bézier, with control points kept above the baseline.
function smooth(points) {
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [points[i - 1] ?? points[i], points[i], points[i + 1], points[i + 2] ?? points[i + 1]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(cy1, p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(cy1, p2[1] - (p3[1] - p1[1]) / 6)];
    d += `C${c1.map((v) => v.toFixed(1)).join(' ')} ${c2.map((v) => v.toFixed(1)).join(' ')} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const line = smooth(pts);
const area = `${line}L${cx1} ${cy1}L${cx0} ${cy1}Z`;
const peakIdx = series.indexOf(peak);
const MONTHS = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ');
const months = weeks
  .map((w, i) => {
    const first = w.contributionDays.find((x) => x.date.endsWith('-01'));
    return first && i > 0 && i < weeks.length - 2
      ? `<text x="${px(i).toFixed(1)}" y="${cy1 + 22}" text-anchor="middle">${MONTHS[Number(first.date.slice(5, 7)) - 1]}</text>`
      : '';
  })
  .join('');
const grid = [0.25, 0.5, 0.75, 1]
  .map((f) => `<path d="M${cx0} ${py(peak * f).toFixed(1)}H${cx1}" stroke="${C.dim}" stroke-opacity=".5" stroke-dasharray="3 6"/>`)
  .join('');

const synced = new Date().toISOString().slice(0, 16).replace('T', ' ');
const colors = [C.cyan, C.magenta, C.lime, C.amber];

const style = `${fonts('orbitron-900', 'orbitron-600', 'jetbrains-mono-400', 'jetbrains-mono-700')}
  .line{stroke-dasharray:1;animation:draw 2.4s ease-out .2s both}
  @keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
  .area{animation:fade 1.2s ease-out 1s both}
  @keyframes fade{from{opacity:0}}
  .ping{animation:ping 1.8s ease-out infinite;transform-origin:${pts[peakIdx][0].toFixed(1)}px ${pts[peakIdx][1].toFixed(1)}px}
  @keyframes ping{from{transform:scale(1);opacity:.9}to{transform:scale(3.2);opacity:0}}`;

const defs = `${colors.map((c) => neonFilter(`n-${c.slice(1)}`, c, 0.6)).join('')}
  ${neonFilter('glow', C.cyan, 0.5)}
  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.cyan}" stop-opacity=".38"/>
    <stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.magenta}"/>
    <stop offset="1" stop-color="${C.cyan}"/>
  </linearGradient>`;

const body = `
  ${chrome(W, `git log --author=${login} | stats`)}
  ${tile(40, 72, 'CONTRIBUTIONS', 'last 12 months', fmt(lastYear), C.cyan)}
  ${tile(310, 72, 'ALL-TIME', `since ${firstYear}`, fmt(total), C.magenta)}
  ${tile(40, 218, 'ACTIVE DAYS', 'last 12 months', fmt(activeDays), C.lime)}
  ${tile(310, 218, 'LONGEST STREAK', longest === 1 ? 'day' : 'days in a row', fmt(longest), C.amber)}

  <text x="${cx0}" y="88" font-family="${DISPLAY}" font-weight="600" font-size="13" letter-spacing="2" fill="${C.cyan}">WEEKLY CONTRIBUTIONS</text>
  <text x="${cx1}" y="88" text-anchor="end" font-family="${MONO}" font-size="13" fill="${C.muted}">best week ${fmt(peak)} · ${fmt(ytd)} in ${thisYear}</text>
  ${grid}
  <path d="M${cx0} ${cy1}H${cx1}" stroke="${C.line}" stroke-width="1.5"/>
  <path class="area" d="${area}" fill="url(#fill)"/>
  <path class="line" d="${line}" pathLength="1" fill="none" stroke="url(#stroke)" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>
  <circle class="ping" cx="${pts[peakIdx][0].toFixed(1)}" cy="${pts[peakIdx][1].toFixed(1)}" r="5" fill="none" stroke="${C.cyan}" stroke-width="2"/>
  <circle cx="${pts[peakIdx][0].toFixed(1)}" cy="${pts[peakIdx][1].toFixed(1)}" r="5" fill="${C.cyan}" filter="url(#glow)"/>
  <g font-family="${MONO}" font-size="12" fill="${C.dim}">${months}</g>
  <text x="${cx1}" y="${H - 14}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.dim}">synced ${synced} UTC · refreshed every 6h by GitHub Actions</text>`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'activity.svg'), panel({ w: W, h: H, title: `${login} activity`, style, defs, body }));
console.log({ lastYear, total, ytd, activeDays, longest, peak });
