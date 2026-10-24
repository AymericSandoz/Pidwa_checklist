// Step 17: the "Through the year" months of the birds, from the SABAP2 reporting rates of step 16.
// Each month is scored against the bird's best month: >= 35 % of it = present (2), >= 8 % = few (1), less = away (0).
// Residents stay "present" all year unless the atlas really shows them gone (detection drops when they stop singing,
// they don't leave). Birds too rarely reported (best month under MIN of the cards) keep the months estimated from the
// research texts. Also writes "common", the rate of the bird's best months, which drives the rarity level in the app.
// Rewrites app/src/learn/birds.data.json in place and lists the statuses the atlas contradicts.

import path from 'node:path';
import { readJson, writeJson, OUT_DIR, DATA_DIR, RAW_DIR } from './lib.mjs';

const BIRDS = path.join(DATA_DIR, '..', 'app', 'src', 'learn', 'birds.data.json');
const MIN = 0.03;
const score = (r, peak) => (r >= 0.35 * peak ? 2 : r >= 0.08 * peak ? 1 : 0);

const atlas = readJson(path.join(OUT_DIR, 'sabap2_months.json'), {});
// a code set back to null means the atlas has no usable data for that bird (Dark-capped Bulbul: its code 11491 is
// barely used in South Africa), even if an old entry is still in sabap2_months.json
const codes = readJson(path.join(RAW_DIR, 'sabap2', 'codes.json'), {});
for (const [id, c] of Object.entries(codes)) if (c === null) delete atlas[id];
const birds = readJson(BIRDS);
const pct = (a) => a.map((r) => String(Math.round(r * 100)).padStart(3)).join('');
let used = 0;
for (const b of birds) {
  const a = atlas[b.id];
  // how common: mean reporting rate of the 3 best months, so that summer visitors are not called rare for being away in winter
  if (a) b.common = +(a.rate.slice().sort((x, y) => y - x).slice(0, 3).reduce((s, r) => s + r, 0) / 3).toFixed(3);
  else delete b.common;
  const peak = a ? Math.max(...a.rate) : 0;
  if (!a || peak < MIN) { b.atlas = false; continue; }
  const m = a.rate.map((r) => score(r, peak));
  const low = Math.min(...a.rate) / peak;
  if (b.status === 'resident' && low < 0.08) console.log(`resident but gone some months: ${b.id.padEnd(30)}${pct(a.rate)}`);
  if (b.status !== 'resident' && b.status !== 'nomad' && b.status !== 'partial' && low > 0.35) console.log(`${b.status} but here all year: ${b.id.padEnd(30)}${pct(a.rate)}`);
  b.months = b.status === 'resident' && low >= 0.08 ? Array(12).fill(2) : m;
  b.atlas = true;
  used++;
}
writeJson(BIRDS, birds);
console.log(`months from the atlas for ${used} of ${birds.length} birds`);
