// Compares decision rules on the raw scores recorded by soundid-faint.mjs, without running the model again.
// For each rule: how often the right bird is shown at each signal-to-noise ratio, how many wrong species
// are shown per recording, and how many species appear in 100 s of pure noise.
// Also replays the data at slower paces (one analysis every 2 s or 3 s) to mimic a slow phone.
// Usage: node scripts/soundid-rules.mjs [--all] [file.json]   (default file: soundid_faint.json)
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv.slice(2).find((a) => a.endsWith('.json')) || 'soundid_faint.json';
const data = JSON.parse(fs.readFileSync(path.resolve('..', 'data', 'raw', file), 'utf8'));
console.log('data:', file);
const classes = JSON.parse(fs.readFileSync(path.resolve('..', 'data', 'out', 'birdnet', 'classes.json'), 'utf8'));
const geo = data.geo;
const isSpecies = (i) => classes[i] && classes[i][0].includes(' ') && classes[i][0] !== classes[i][1];
const onList = (i) => !!classes[i][3];
const GEO_MIN = 0.03;
const plausible = (i) => onList(i) || (geo ? geo[i] >= GEO_MIN : false);

/**
 * Generic rule. A window "votes" for a species when its score is at least `mid` (plus `off` for species outside
 * the checklist). The species is shown when one window reaches `high`, or when it collects `votes` votes within
 * `span` seconds, votes being at least `gap` seconds apart.
 *   junk:  drop a vote when an impossible species scores higher on the same window
 *   top1:  a vote only counts when the species is the best plausible one of its window
 *   offHigh: species outside the checklist never pass on a single window when false
 */
function makeRule({ high, mid, votes = 2, span = 12, gap = 1.4, off = 0.15, junk = true, top1 = false }) {
  return (seq, hop) => {
    const st = new Map(), shown = new Map();
    seq.forEach((win, k) => {
      const t = k * hop;
      const sp = win.filter(([i]) => isSpecies(i));
      let junkMax = 0, bestPl = -1, bestPlConf = 0;
      for (const [i, c] of sp) { if (!plausible(i)) { if (c > junkMax) junkMax = c; } else if (c > bestPlConf) { bestPlConf = c; bestPl = i; } }
      for (const [i, c] of sp) {
        if (!plausible(i) || shown.has(i)) continue;
        const h = onList(i) ? high : Math.min(0.95, high + off), m = onList(i) ? mid : Math.min(0.9, mid + off);
        if (c < m) continue;
        if (junk && c < h && c < junkMax) continue;
        if (top1 && c < h && i !== bestPl) continue;
        const v = (st.get(i) || []).filter((x) => t - x <= span);
        if (!v.length || t - v[v.length - 1] >= gap) v.push(t);
        st.set(i, v);
        if ((onList(i) && c >= h) || v.length >= votes) shown.set(i, t);
      }
    });
    return shown;
  };
}

/** BirdNET Live as published: log-mean-exp over the last 5 analyses, threshold 0.15, range filter 0.05. */
function liveRule({ thr = 0.15, pool = 5, geoMin = 0.05 } = {}) {
  const logit = (p) => { const c = Math.min(1 - 1e-8, Math.max(1e-8, p)); return Math.log(c / (1 - c)); };
  return (seq, hop) => {
    const shown = new Map();
    seq.forEach((win, k) => {
      const recent = seq.slice(Math.max(0, k - pool + 1), k + 1);
      const ids = new Set(); for (const w of recent) for (const [i] of w) if (isSpecies(i)) ids.add(i);
      for (const i of ids) {
        if (shown.has(i) || !(geo ? geo[i] >= geoMin : true)) continue;
        const ls = recent.map((w) => { const e = w.find(([j]) => j === i); return logit(e ? e[1] : 0.01); });
        const mx = Math.max(...ls), lme = mx + Math.log(ls.reduce((a, l) => a + Math.exp(l - mx), 0) / ls.length);
        if (1 / (1 + Math.exp(-lme)) >= thr) shown.set(i, k * hop);
      }
    });
    return shown;
  };
}

/** The rule as implemented in src/soundid/engine.ts (LEVELS: show / possible). Returns the species in the main list. */
function engineRule({ show, possible }, { withPossible = false } = {}) {
  const SURE = 0.5, OFF = 0.15, SPAN = 20, GAP = 1.4;
  return (seq, hop) => {
    const st = new Map(), shown = new Map(), maybe = new Map();
    seq.forEach((win, k) => {
      const t = k * hop;
      const sp = win.filter(([i]) => isSpecies(i));
      let junk = 0, best = -1, bestC = 0;
      for (const [i, c] of sp) { if (!plausible(i)) { if (c > junk) junk = c; } else if (c > bestC) { bestC = c; best = i; } }
      for (const [i, c] of sp) {
        if (!plausible(i) || shown.has(i)) continue;
        const sh = onList(i) ? show : Math.min(0.95, show + OFF), po = onList(i) ? possible : sh;
        if (c < po) continue;
        if (c < SURE && c < junk) continue;
        if (c < sh && i !== best) continue;
        const v = (st.get(i) || []).filter((x) => t - x <= SPAN);
        if (!v.length || t - v[v.length - 1] >= GAP) v.push(t);
        st.set(i, v);
        if ((onList(i) && c >= sh) || v.length >= 2) shown.set(i, t); else if (onList(i)) maybe.set(i, t);
      }
    });
    if (withPossible) for (const [i, t] of maybe) if (!shown.has(i)) shown.set(i, t);
    return shown;
  };
}

const pace = (seq, step) => seq.filter((_, k) => k % step === 0);

function evaluate(rule, step) {
  const hop = data.hopSec * step;
  const res = { det: {}, wrongList: 0, wrongOff: 0, clips: 0, noise: {}, delay: [] };
  for (const snr of data.snrs) res.det[snr] = 0;
  for (const s of data.species) {
    // species that are loud in the clean recording may really be there: not counted as wrong
    const legit = new Set([s.index]);
    for (const w of s.res.clean) for (const [i, c] of w) if (c >= 0.5) legit.add(i);
    for (const snr of data.snrs) {
      const shown = rule(pace(s.res[snr], step), hop);
      if (shown.has(s.index)) { res.det[snr]++; if (snr !== 'clean') res.delay.push(shown.get(s.index)); }
      if (snr !== 'clean') { res.clips++; for (const i of shown.keys()) if (!legit.has(i)) { if (onList(i)) res.wrongList++; else res.wrongOff++; } }
    }
  }
  for (const [kind, seq] of Object.entries(data.noise)) res.noise[kind] = [...rule(pace(seq, step), hop).keys()].map((i) => classes[i][1]);
  return res;
}

const RULES = [
  ['NEW strict 50/30', engineRule({ show: 0.5, possible: 0.3 })],
  ['NEW normal 30/12', engineRule({ show: 0.3, possible: 0.12 })],
  ['NEW normal + possible list', engineRule({ show: 0.3, possible: 0.12 }, { withPossible: true })],
  ['NEW sensitive 15/07', engineRule({ show: 0.15, possible: 0.07 })],
  ['NEW sensitive + possible list', engineRule({ show: 0.15, possible: 0.07 }, { withPossible: true })],
  ['old strict 75/45', makeRule({ high: 0.75, mid: 0.45 })],
  ['old normal 60/30', makeRule({ high: 0.6, mid: 0.3 })],
  ['old sensitive 45/20', makeRule({ high: 0.45, mid: 0.2 })],
  ['BirdNET Live (pool 5, 15 %)', liveRule()],
  ['50/20, 2 votes/12 s', makeRule({ high: 0.5, mid: 0.2 })],
  ['50/15, 2 votes/20 s', makeRule({ high: 0.5, mid: 0.15, span: 20 })],
  ['50/15, 2 votes/20 s, no junk rule', makeRule({ high: 0.5, mid: 0.15, span: 20, junk: false })],
  ['40/15, 2 votes/20 s', makeRule({ high: 0.4, mid: 0.15, span: 20 })],
  ['40/10, 2 votes/20 s', makeRule({ high: 0.4, mid: 0.1, span: 20 })],
  ['40/10, 2 votes/20 s, top-1 votes', makeRule({ high: 0.4, mid: 0.1, span: 20, top1: true })],
  ['40/10, 3 votes/30 s', makeRule({ high: 0.4, mid: 0.1, votes: 3, span: 30 })],
  ['35/10, 2 votes/20 s, top-1 votes', makeRule({ high: 0.35, mid: 0.1, span: 20, top1: true })],
  ['30/10, 2 votes/20 s, top-1 votes', makeRule({ high: 0.3, mid: 0.1, span: 20, top1: true })],
  ['30/08, 2 votes/30 s, top-1 votes', makeRule({ high: 0.3, mid: 0.08, span: 30, top1: true })],
  ['25/08, 2 votes/30 s, top-1 votes', makeRule({ high: 0.25, mid: 0.08, span: 30, top1: true })],
];

const n = data.species.length;
const pct = (v) => String(Math.round((100 * v) / n)).padStart(3) + '%';
for (const step of process.argv.includes('--all') ? [1, 2, 3] : [1, 3]) {
  console.log(`\n=== one analysis every ${data.hopSec * step} s · ${n} species · wrong = species shown that are not in the recording, per noisy clip ===`);
  console.log('rule'.padEnd(36) + data.snrs.map((s) => (s === 'clean' ? 'clean' : (s > 0 ? '+' : '') + s + 'dB').padStart(6)).join('') + '  wrong(list/off)  noise-only species (ambient|wind|insects)  median delay');
  for (const [name, rule] of RULES) {
    const r = evaluate(rule, step);
    const d = r.delay.sort((a, b) => a - b); const med = d.length ? d[Math.floor(d.length / 2)] : NaN;
    console.log(name.padEnd(36) + data.snrs.map((s) => pct(r.det[s]).padStart(6)).join('') + `  ${(r.wrongList / r.clips).toFixed(2)} / ${(r.wrongOff / r.clips).toFixed(2)}`.padEnd(18) + `  ${Object.values(r.noise).map((a) => a.length).join(' | ')}`.padEnd(40) + `${med} s`);
  }
}
// which species does noise trigger, for the most permissive rule
const loose = evaluate(RULES[RULES.length - 1][1], 1);
console.log('\nnoise-only species under the loosest rule:', JSON.stringify(loose.noise));
