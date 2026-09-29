import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..');
export const RAW_DIR = path.join(DATA_DIR, 'raw');
export const OUT_DIR = path.join(DATA_DIR, 'out');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minimal CSV parser (handles quoted fields with commas). */
export function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = splitCsvLine(l);
    const o = {};
    header.forEach((h, i) => (o[h] = (cells[i] ?? '').trim()));
    return o;
  });
}
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export function readSpeciesList() {
  const csv = fs.readFileSync(path.join(DATA_DIR, 'species_list.csv'), 'utf8');
  return parseCsv(csv).map((s) => ({ ...s, id: slug(s.scientific) }));
}

export function slug(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function fetchWithBackoff(url, opts = {}, retries = 6) {
  for (let attempt = 1; ; attempt++) {
    let r;
    try {
      r = await fetch(url, { ...opts, signal: AbortSignal.timeout(opts.timeoutMs || 120000) });
    } catch (e) {
      if (attempt >= retries) throw e;
      await sleep(2000 * attempt);
      continue;
    }
    if (r.ok) return r;
    if (r.status === 429 || r.status >= 500) {
      if (attempt >= retries) throw new Error(`HTTP ${r.status} after ${retries} tries for ${url}`);
      const ra = Number(r.headers.get('retry-after'));
      const wait = ra > 0 ? ra * 1000 : Math.min(60000, 3000 * 2 ** (attempt - 1));
      process.stdout.write(`[${r.status} wait ${Math.round(wait / 1000)}s] `);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${r.status} for ${url}`);
  }
}
export async function fetchJson(url, opts = {}, retries = 6) {
  return (await fetchWithBackoff(url, opts, retries)).json();
}
export async function fetchBuffer(url, opts = {}, retries = 6) {
  return Buffer.from(await (await fetchWithBackoff(url, opts, retries)).arrayBuffer());
}

export function readJson(p, fallback = null) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;
}
export function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}
