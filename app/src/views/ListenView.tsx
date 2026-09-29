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
const KIND: Record<string, string> = { list: 'checklist', region: 'region', impossible: 'not from here', other: '' };
const onOff = (v: boolean | null) => (v == null ? '?' : v ? 'ON' : 'off');

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
  const [inPack, setInPack] = useState<number | null>(null);
  const st = sid.status.value;
  const dets = sid.detections.value;
  const seen = seenCount.value;
  const now = Date.now();
  const m = sid.mic.value;
  const lv = sid.LEVELS[sid.sensitivity.value];

  // keep the navigation dot and the "singing now" highlight fresh
  useEffect(() => { listening.value = st === 'listening'; }, [st]);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  // start loading the model as soon as the screen opens, so the first tap on the button is quick
  useEffect(() => { if (sid.status.value === 'idle') sid.load().catch(() => {}); }, []);
  useEffect(() => { sid.packFiles().then(setInPack); }, [st]);

  async function toggle() {
    if (st === 'listening') { sid.stop(); return; }
    try { await sid.start(); } catch { /* message is in errorMsg */ }
  }

  // Confirmed species only, in order of confirmation, new ones at the bottom: rows never move under the finger.
  const sorted = dets.filter((d) => d.shown).sort((a, b) => a.first - b.first);
  const birds = species.value.filter((s) => s.group === 'bird');
  const uncovered = birds.filter((s) => !s.bn);
  const weak = birds.filter((s) => s.bn && soundIdGrade(s.bn.ref) === 'weak');
  const secs = st === 'listening' ? Math.floor((now - sid.startedAt.value) / 1000) : 0;
  const processed = m && (m.echoCancellation || m.noiseSuppression || m.autoGainControl);

  return (
    <div class="listen">
      <div class="card lcard">
        <button class={'mic' + (st === 'listening' ? ' on' : '')} disabled={st === 'loading'} onClick={toggle} aria-label={st === 'listening' ? 'Stop listening' : 'Start listening'}>
          {st === 'listening' ? '■' : '🎤'}
        </button>
        <div class="lstatus">
          {st === 'loading' && inPack !== null && inPack < 18 && <div class="small" style="margin-bottom:4px">The model is being fetched from the network (60 MB), this can take minutes. <a href={href('settings')}><b>Download the Sound ID pack in Settings</b></a> once and it starts in seconds, even offline.</div>}
          {st === 'loading' && <><b>Preparing sound ID…</b><div class="muted small">{STAGE[sid.progress.value.stage] || sid.progress.value.stage}</div><div class="progress"><i style={`width:${sid.progress.value.pct}%`} /></div></>}
          {st === 'ready' && <><b>Tap to listen</b><div class="muted small">Hold the phone still, microphone towards the bird.</div>{!sid.hasRangeModel() && <div class="small err">Range model missing: species outside the checklist are shown only above 80 %.</div>}</>}
          {st === 'idle' && <b>Sound ID</b>}
          {st === 'listening' && <><b>Listening… {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</b><div class="muted small">{sid.windows.value ? `${sid.windows.value} analyses · ${sid.lastMs.value} ms each` : 'first result in a few seconds'}</div><div class="level"><i style={`width:${Math.min(100, Math.round(sid.level.value * 300))}%`} /></div></>}
          {st === 'error' && <><b class="err">Sound ID unavailable</b><div class="small">{sid.errorMsg.value}</div><a class="btn sm secondary" style="margin-top:6px" href={href('settings')}>Settings</a> <button class="btn sm secondary" onClick={() => { sid.status.value = 'idle'; sid.load().catch(() => {}); }}>retry</button></>}
          {st !== 'error' && sid.errorMsg.value && <div class="err small">{sid.errorMsg.value}</div>}
        </div>
      </div>

      {st === 'listening' && sid.paused.value && <div class="lnote warn">Paused: the app is in the background and Android has cut the microphone. Play test sounds from another device, not from this phone.</div>}
      {st === 'listening' && !sid.paused.value && secs > 4 && sid.windows.value === 0 && <div class="lnote warn">No sound is reaching the app. Stop and start again; if it persists, open the diagnostics below and tell me what it says.</div>}
      {st === 'listening' && sid.noise.value === 'noisy' && <div class="lnote">Mostly noise right now (rain, wind, engine). Faint birds will be missed and results are less reliable.</div>}
      {st === 'listening' && sid.noise.value === 'quiet' && <div class="lnote">Very quiet: nothing to identify at the moment.</div>}

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
        {sorted.length === 0 && st === 'listening' && <p class="muted center" style="min-height:0;padding:24px">Nothing confirmed yet. A species appears once it is heard clearly, or twice more faintly.</p>}
      </div>

      <details class="card diag" style="margin-top:12px">
        <summary><b>Diagnostics</b> <span class="muted small">what the model hears right now</span></summary>
        <div class="actions" style="margin:8px 0">
          <button class="btn sm secondary" disabled={sid.selfTest.value?.state === 'running'} onClick={() => sid.runSelfTest()}>Test the model</button>
          <button class="btn sm secondary" disabled={st !== 'listening'} onClick={() => sid.replayLast()}>Replay last 3 s</button>
        </div>
        {sid.selfTest.value && (
          <div class={'lnote' + (sid.selfTest.value.state === 'failed' || /FAILS/.test(sid.selfTest.value.message) ? ' warn' : '')}>
            <b>{sid.selfTest.value.message}</b>
            {sid.selfTest.value.windows.map((w, i) => <div class="small">window {i + 1}: target {Math.round(w.target * 100)} % · best guess {w.top} {Math.round(w.topConf * 100)} %</div>)}
          </div>
        )}
        {sid.engineInfo.value && <p class="small muted">TensorFlow.js {sid.engineInfo.value.tf} · WebGL {String(sid.engineInfo.value.webgl)} · float32 textures {String(sid.engineInfo.value.float32)} / in use {String(sid.engineInfo.value.float32Enabled)}</p>}
        {st !== 'listening' && <p class="small muted">Start listening to see live values.</p>}
        {st === 'listening' && (
          <>
            <p class="small"><b>Last analysis, raw scores</b> (before any rule)</p>
            {sid.lastTop.value.length === 0 && <p class="small muted">nothing above 3 %</p>}
            {sid.lastTop.value.map((t) => (
              <div class="stat small"><span>{t.name} <span class="muted">{KIND[t.kind]}</span></span><span>{Math.round(t.conf * 100)} %</span></div>
            ))}
            <p class="small" style="margin-top:8px">Rule in <b>{SENS.find(([k]) => k === sid.sensitivity.value)?.[1]}</b> mode: shown at once from {Math.round(lv.high * 100)} %, or after two hits from {Math.round(lv.mid * 100)} % within 12 s.</p>
            {m && (
              <p class="small">
                Microphone: {m.label || 'default'}<br />
                audio engine {m.contextRate} Hz, {m.contextState}{m.trackRate ? ` · microphone ${m.trackRate} Hz` : ''}<br />
                echo cancellation {onOff(m.echoCancellation)} · noise suppression {onOff(m.noiseSuppression)} · automatic gain {onOff(m.autoGainControl)}
                {processed && <><br /><span class="err">The phone is filtering the sound for voice calls: bird sounds may be removed.</span></>}
              </p>
            )}
            {sid.lastStats.value && <p class="small">Sound level: {sid.lastStats.value.rmsDb} dB · peak {Math.round(sid.lastStats.value.peak * 100)} %{sid.lastStats.value.clipped > 0.001 ? <span class="err"> · saturated {(sid.lastStats.value.clipped * 100).toFixed(1)} %: too loud or too close</span> : ''}</p>}
            <p class="small muted">{sid.windows.value} analyses, {sid.lastMs.value} ms each, range model {sid.hasRangeModel() ? 'loaded' : 'missing'}, noise state: {sid.noise.value}.</p>
          </>
        )}
      </details>

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
