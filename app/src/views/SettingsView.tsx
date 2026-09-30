import { useEffect, useState } from 'preact/hooks';
import { dataUrl, observations, obsInfo, reloadObservations } from '../data';
import { db } from '../db';
import { fmtBytes } from '../util';
import { theme, setTheme, type Theme } from '../theme';
import { Icon } from '../components/Icon';
import type { Packs, Observation } from '../types';

const PACK_LABEL: Record<string, string> = { sounds: 'Bird sounds (xeno-canto)', sat: 'Reserve map (satellite, Sentinel-2)', birdnet: 'Sound ID model (BirdNET)' };
const cacheName = (p: string) => 'pack-' + p;
const THEMES: [Theme, string][] = [['auto', 'Automatic'], ['light', 'Day'], ['dark', 'Night']];
const tick = <Icon name="check" size={13} stroke={3} class="inl" />;

interface PackState { total: number; cached: number; bytes: number; busy: boolean; error?: string }

export function SettingsView() {
  const [packs, setPacks] = useState<Packs | null>(null);
  const [st, setSt] = useState<Record<string, PackState>>({});
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');
  const aborts: Record<string, AbortController> = {};

  async function refresh(p: Packs) {
    const next: Record<string, PackState> = {};
    for (const [k, v] of Object.entries(p)) {
      let cached = 0;
      try { cached = (await (await caches.open(cacheName(k))).keys()).length; } catch {}
      next[k] = { total: v.files.length, cached, bytes: v.bytes, busy: false };
    }
    setSt(next);
    try { const e = await navigator.storage.estimate(); setQuota({ usage: e.usage || 0, quota: e.quota || 0 }); } catch {}
    try { setPersisted(await navigator.storage.persisted()); } catch {}
  }
  useEffect(() => {
    fetch(dataUrl('packs.json')).then((r) => r.json()).then((p: Packs) => { setPacks(p); refresh(p); }).catch(() => setMsg('packs.json not found'));
  }, []);

  async function download(k: string) {
    if (!packs) return;
    const files = packs[k].files;
    const cache = await caches.open(cacheName(k));
    const ctrl = new AbortController(); aborts[k] = ctrl;
    setSt((s) => ({ ...s, [k]: { ...s[k], busy: true, error: undefined } }));
    let done = (await cache.keys()).length;
    const todo: string[] = [];
    for (const f of files) { const u = location.origin + dataUrl(f.path); if (!(await cache.match(u))) todo.push(u); }
    let i = 0, failed = 0;
    const worker = async () => {
      while (i < todo.length && !ctrl.signal.aborted) {
        const u = todo[i++];
        try {
          const r = await fetch(u, { signal: ctrl.signal, cache: 'no-store' });
          if (r.ok) { await cache.put(u, r); done++; } else failed++;
        } catch (e: any) { if (ctrl.signal.aborted) return; failed++; }
        if (done % 20 === 0) setSt((s) => ({ ...s, [k]: { ...s[k], cached: done } }));
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    setSt((s) => ({ ...s, [k]: { ...s[k], cached: done, busy: false, error: failed ? `${failed} file(s) failed, run again to complete` : undefined } }));
  }
  async function remove(k: string) {
    if (!confirm('Remove this pack from the phone?')) return;
    await caches.delete(cacheName(k));
    if (packs) refresh(packs);
  }
  async function persist() { try { setPersisted(await navigator.storage.persist()); } catch {} }

  // ---- export / import ---------------------------------------------------------
  function dl(nameFile: string, content: string, type: string) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = nameFile; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  function exportJson() {
    const rows = observations.value.map(({ photo, ...o }) => o);
    dl(`pidwa-observations-${stamp()}.json`, JSON.stringify(rows, null, 1), 'application/json');
  }
  function exportCsv() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['date', 'time', 'species_en', 'species_fr', 'scientific', 'group', 'count', 'lat', 'lon', 'accuracy_m', 'note', 'on_checklist'];
    const lines = observations.value.map((o) => { const s = obsInfo(o); const d = new Date(o.ts); return [d.toLocaleDateString('en-GB'), d.toLocaleTimeString('en-GB'), s.en, s.fr, s.sci, s.group, o.count, o.lat, o.lon, o.acc, o.note, s.onList ? 'yes' : 'no'].map(esc).join(','); });
    dl(`pidwa-observations-${stamp()}.csv`, '﻿' + head.join(',') + '\n' + lines.join('\n'), 'text/csv');
  }
  function exportGpx() {
    const esc = (v: string) => v.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));
    const wpts = observations.value.filter((o) => o.lat != null && o.lon != null).map((o) => { const s = obsInfo(o); return `<wpt lat="${o.lat}" lon="${o.lon}"><time>${new Date(o.ts).toISOString()}</time><name>${esc(s.en)}</name><desc>${esc(s.sci + (o.note ? ' - ' + o.note : ''))}</desc></wpt>`; });
    dl(`pidwa-observations-${stamp()}.gpx`, `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Askari" xmlns="http://www.topografix.com/GPX/1/1">\n${wpts.join('\n')}\n</gpx>`, 'application/gpx+xml');
  }
  async function importJson(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    try {
      const rows = JSON.parse(await f.text()) as Observation[];
      const existing = await db.observations.toArray();
      const key = (o: Observation) => `${o.speciesId}|${o.ts}`;
      const have = new Set(existing.map(key));
      const add = rows.filter((o) => o.speciesId && o.ts && !have.has(key(o))).map(({ id, ...o }) => ({ ...o, count: o.count || 1, note: o.note || '', lat: o.lat ?? null, lon: o.lon ?? null, acc: o.acc ?? null }));
      await db.observations.bulkAdd(add);
      await reloadObservations();
      setMsg(`${add.length} observation(s) imported, ${rows.length - add.length} already present.`);
    } catch (err: any) { setMsg('Import failed: ' + err.message); }
  }

  return (
    <div>
      <div class="card">
        <b>Appearance</b>
        <p class="muted small" style="margin:4px 0 8px">Automatic follows the phone's dark mode. Night is easier on the eyes before sunrise and on night drives.</p>
        <div class="seg">{THEMES.map(([t, label]) => <button class={theme.value === t ? 'on' : ''} onClick={() => setTheme(t)}>{label}</button>)}</div>
      </div>

      <div class="card">
        <b>Offline packs</b>
        <p class="muted small" style="margin:4px 0 6px">Species pages and photos are already in the app. Download the rest once, with network, before going into the field.</p>
        {packs && Object.keys(packs).map((k) => {
          const s = st[k]; if (!s) return null;
          const complete = s.cached >= s.total && s.total > 0;
          return (
            <div class="pack" key={k}>
              <div class="info">
                <b>{PACK_LABEL[k] || k}</b>
                <span class="muted small">{fmtBytes(s.bytes)} · {s.cached}/{s.total} files {complete && tick}</span>
                {(s.busy || (s.cached > 0 && !complete)) && <div class="progress"><i style={`width:${Math.round((100 * s.cached) / Math.max(1, s.total))}%`} /></div>}
                {s.error && <div class="err small">{s.error}</div>}
              </div>
              {s.busy ? <button class="btn sm secondary" onClick={() => aborts[k]?.abort()}>stop</button>
                : complete ? <button class="btn sm danger" onClick={() => remove(k)}>remove</button>
                : <button class="btn sm" onClick={() => download(k)}>{s.cached ? 'complete' : 'download'}</button>}
            </div>
          );
        })}
        {!packs && <p class="muted small">{msg || 'loading…'}</p>}
      </div>

      <div class="card">
        <b>Storage</b>
        <div class="stat"><span>Used</span><span>{quota ? `${fmtBytes(quota.usage)} / ${fmtBytes(quota.quota)}` : '?'}</span></div>
        <div class="stat"><span>Protected from eviction</span><span>{persisted == null ? '?' : persisted ? <>yes {tick}</> : <button class="btn sm secondary" onClick={persist}>request</button>}</span></div>
      </div>

      <div class="card">
        <b>Backup of observations</b>
        <p class="muted small" style="margin:4px 0 8px">{observations.value.length} observation(s). Photos stay on the phone, the export does not include them.</p>
        <div class="actions">
          <button class="btn secondary" onClick={exportJson}>JSON</button>
          <button class="btn secondary" onClick={exportCsv}>CSV</button>
          <button class="btn secondary" onClick={exportGpx}>GPX</button>
        </div>
        <label class="btn secondary block" style="margin-top:8px">Import a JSON<input type="file" accept="application/json,.json" style="display:none" onChange={importJson} /></label>
        {msg && <p class="small">{msg}</p>}
      </div>

      <div class="card credit">
        <div class="about"><div class="logo" /><span>Field checklist for Pidwa Wilderness Reserve</span></div>
        <b>Sources</b><br />
        Species list: Pidwa Wilderness Reserve paper checklist. French bird names: IOC World Bird List. Names, families, summaries: Wikidata and Wikipedia. Photos: iNaturalist (Creative Commons) and Wikimedia Commons, credited on each page. Measurements: AVONET, Tobias et al. 2022, CC BY 4.0. Sounds: xeno-canto, CC licences. Sound identification: BirdNET V2.4 by the K. Lisa Yang Center for Conservation Bioacoustics (Cornell Lab of Ornithology) and Chemnitz University of Technology, licence CC BY-NC-SA 4.0, unmodified, run on the phone with code from BirdNET Live (MIT licence). Map: Sentinel-2 cloudless 2023 satellite imagery by EOX, CC BY-NC-SA 4.0; reserve outline from OpenStreetMap contributors. Logo: Askari Wilderness Conservation Programme, used with its agreement. Typeface: Urbanist, SIL Open Font Licence. Icons: Lucide, ISC licence.
      </div>
    </div>
  );
}
