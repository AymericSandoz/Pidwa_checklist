import { useEffect, useRef, useState } from 'preact/hooks';
import { species, byId, seenCount, imgUrl } from '../data';
import { href } from '../router';
import { ObsForm } from '../components/ObsForm';
import { listening } from './ListenLazy';
import { soundIdGrade } from '../util';
import * as sid from '../soundid/engine';
import type { Detection, Sensitivity } from '../soundid/engine';

const STAGE: Record<string, string> = { classes: 'reading the species list', backend: 'starting the graphics engine', model: 'loading the model', warmup: 'warming up', area: 'loading the range model', ready: 'ready' };
const SENS: [Sensitivity, string][] = [['low', 'strict'], ['normal', 'normal'], ['high', 'sensitive']];
const NOW_MS = 4000; // a species heard less than 4 s ago is shown as "singing now"

function Spectrogram() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!; const g = cv.getContext('2d')!;
    const W = (cv.width = cv.clientWidth * 2), H = (cv.height = 160);
    g.fillStyle = '#10180f'; g.fillRect(0, 0, W, H);
    let raf = 0; let bins: Uint8Array<ArrayBuffer> | null = null;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const an = sid.getAnalyser(); if (!an) return;
      if (!bins || bins.length !== an.frequencyBinCount) bins = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(bins);
      // scroll left by 2 px, paint the new column on the right; show 0-12 kHz (birds sit mostly in 1-8 kHz)
      g.drawImage(cv, -2, 0);
      const top = Math.floor(bins.length * (12000 / 24000));
      for (let y = 0; y < H; y++) {
        const v = bins[Math.floor(((H - 1 - y) / H) * top)] / 255;
        const c = Math.pow(v, 1.5);
        g.fillStyle = `rgb(${Math.round(20 + 235 * c)},${Math.round(30 + 190 * Math.sqrt(c))},${Math.round(20 + 60 * (1 - c))})`;
        g.fillRect(W - 2, y, 2, 1);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas class="spectro" ref={ref} />;
}

export function ListenView() {
  const [form, setForm] = useState<Detection | null>(null);
  const [, force] = useState(0);
  const st = sid.status.value;
  const dets = sid.detections.value;
  const seen = seenCount.value;
  const now = Date.now();

  // keep the navigation dot and the "singing now" highlight fresh
  useEffect(() => { listening.value = st === 'listening'; }, [st]);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  // start loading the model as soon as the screen opens, so the first tap on the button is quick
  useEffect(() => { if (sid.status.value === 'idle') sid.load().catch(() => {}); }, []);

  async function toggle() {
    if (st === 'listening') { sid.stop(); return; }
    try { await sid.start(); } catch { /* message is in errorMsg */ }
  }

  // Order of first detection, new species added at the bottom: rows never move under the finger.
  // A species that is not on the checklist must be heard in two windows before it is shown (filters one-off false alarms).
  const sorted = dets.filter((d) => d.pidwaId || d.count >= 2).sort((a, b) => a.first - b.first);
  const birds = species.value.filter((s) => s.group === 'bird');
  const uncovered = birds.filter((s) => !s.bn);
  const weak = birds.filter((s) => s.bn && soundIdGrade(s.bn.ref) === 'weak');
  const secs = st === 'listening' ? Math.floor((now - sid.startedAt.value) / 1000) : 0;

  return (
    <div class="listen">
      <div class="card lcard">
        <button class={'mic' + (st === 'listening' ? ' on' : '')} disabled={st === 'loading'} onClick={toggle} aria-label={st === 'listening' ? 'Stop listening' : 'Start listening'}>
          {st === 'listening' ? '■' : '🎤'}
        </button>
        <div class="lstatus">
          {st === 'loading' && <><b>Preparing sound ID…</b><div class="muted small">{STAGE[sid.progress.value.stage] || sid.progress.value.stage}</div><div class="progress"><i style={`width:${sid.progress.value.pct}%`} /></div></>}
          {st === 'ready' && <><b>Tap to listen</b><div class="muted small">Hold the phone still, microphone towards the bird.</div></>}
          {st === 'idle' && <b>Sound ID</b>}
          {st === 'listening' && <><b>Listening… {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</b><div class="muted small">{sid.lastMs.value ? `analysis ${sid.lastMs.value} ms per 3 s` : 'first result in a few seconds'}</div><div class="level"><i style={`width:${Math.min(100, Math.round(sid.level.value * 300))}%`} /></div></>}
          {st === 'error' && <><b class="err">Sound ID unavailable</b><div class="small">{sid.errorMsg.value}</div><a class="btn sm secondary" style="margin-top:6px" href={href('settings')}>Settings</a> <button class="btn sm secondary" onClick={() => { sid.status.value = 'idle'; sid.load().catch(() => {}); }}>retry</button></>}
          {st !== 'error' && sid.errorMsg.value && <div class="err small">{sid.errorMsg.value}</div>}
        </div>
      </div>

      {st === 'listening' && <Spectrogram />}

      <div class="listhead">
        <div class="chips" style="margin-bottom:-6px">
          {SENS.map(([k, label]) => <button class={'chip' + (sid.sensitivity.value === k ? ' on' : '')} onClick={() => sid.setSensitivity(k)}>{label}</button>)}
        </div>
        {sorted.length > 0 && <button class="btn sm secondary count" onClick={() => sid.clearDetections()}>clear</button>}
      </div>

      <div class="list">
        {sorted.map((d) => {
          const s = d.pidwaId ? byId.value.get(d.pidwaId) : undefined;
          const u = s ? imgUrl(s) : null;
          const live = st === 'listening' && now - d.last < NOW_MS;
          const n = s ? seen.get(s.id) || 0 : 0;
          const body = (
            <>
              {u ? <img class="thumb" src={u} loading="lazy" alt="" /> : <div class="thumb">🐦</div>}
              <div class="names">
                <div class="fr">{d.en}</div>
                <div class="en">{d.fr}{d.fr ? ' · ' : ''}<i>{d.sci}</i></div>
                <div class="conf"><i style={`width:${Math.round(d.best * 100)}%`} /></div>
                <div class="en tags">
                  {Math.round(d.best * 100)} % · heard ×{d.count}
                  {!s && <span class="tag off">not on the Pidwa checklist</span>}
                  {s && s.bn?.lumped && <span class="tag">lumped in BirdNET</span>}
                  {s && n === 0 && !d.logged && <span class="tag new">new for you</span>}
                  {d.logged && <span class="tag ok">logged ✓</span>}
                </div>
              </div>
            </>
          );
          return (
            <div class={'sp-row det' + (live ? ' live' : '') + (s ? '' : ' offlist')} key={d.key}>
              {s ? <a href={href('species/' + s.id)} class="row" style="flex:1;min-width:0">{body}</a> : <div class="row" style="flex:1;min-width:0">{body}</div>}
              <button class="add" aria-label="Log this observation" onClick={() => setForm(d)}>+</button>
            </div>
          );
        })}
        {sorted.length === 0 && st === 'listening' && <p class="muted center" style="min-height:0;padding:24px">Nothing recognised yet. Species appear here as soon as they are heard.</p>}
      </div>

      <details class="card" style="margin-top:12px">
        <summary><b>What sound ID can and cannot do</b></summary>
        <p class="small">It recognises {birds.length - uncovered.length} of the {birds.length} birds of the Pidwa checklist. Species that are not on the checklist but known from this region are shown with a label. Treat every result as a suggestion: compare with the reference sound on the species page before logging.</p>
        <p class="small"><b>Not covered ({uncovered.length}):</b> {uncovered.map((s) => s.en).join(', ')}.</p>
        {weak.length > 0 && <p class="small"><b>Covered but weak ({weak.length}):</b> {weak.map((s) => s.en).join(', ')}. The model did not recognise our own reference recording of these.</p>}
        <p class="credit">BirdNET V2.4, Cornell Lab of Ornithology and Chemnitz University of Technology. Runs on the phone, nothing is uploaded.</p>
      </details>

      {form && (
        <ObsForm
          speciesId={form.pidwaId || undefined}
          extra={form.pidwaId ? undefined : { sci: form.sci, en: form.en, fr: form.fr }}
          note={`Heard (sound ID ${Math.round(form.best * 100)} %)`}
          onSaved={() => sid.markLogged(form.key)}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
