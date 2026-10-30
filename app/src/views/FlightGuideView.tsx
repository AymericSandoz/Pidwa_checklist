import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { byId, dataUrl, imgUrl, seenCount } from '../data';
import { href } from '../router';
import { Icon } from '../components/Icon';
import { birdInfo } from '../learn/birds';
import { CRITERIA, GROUP_HINT, GROUP_LABEL, flightInfo, loadFlight, type FlightGroup, type FlightInfo, type FlightKey } from '../learn/flight';
import { GuideSwitch } from './IdGuideView';

// Which raptor is that overhead? Tick what you saw; as in the other keys, several options in a criterion mean "one of these".
// A bird with nothing documented for a criterion stays in the results.
const sel = signal<Partial<Record<FlightKey | 'group', string[]>>>({});
const GROUPS = Object.keys(GROUP_LABEL) as FlightGroup[];

/** The photo in flight, its credit, and the marks: on the guide and on the species page. */
export function FlightCard({ f, link }: { f: FlightInfo; link?: boolean }) {
  const s = byId.value.get(f.id);
  const [fail, setFail] = useState(false);
  const p = f.photo;
  const fallback = s && imgUrl(s);
  return (
    <div class={'card flightc' + (s && seenCount.value.has(s.id) ? ' seen' : '')}>
      {p && !fail
        ? <div class="fph"><img src={dataUrl(p.file)} loading="lazy" decoding="async" alt="" style={`aspect-ratio:${p.w}/${p.h}`} onError={() => setFail(true)} /><a class="cred" href={p.source} target="_blank" rel="noopener">{p.author} · {p.license}</a></div>
        : link && fallback ? <div class="fph"><img src={fallback} loading="lazy" alt="" /><span class="cred">Perched: no good photo in flight found</span></div> : null}
      {link && s && <a class="fname" href={href('species/' + s.id)}><b>{s.en}</b>{s.fr && <span>{s.fr}</span>}<Icon name="chevron-right" size={18} /></a>}
      <ul class="traits">{f.marks.map((m) => <li>{m}</li>)}</ul>
      {f.doubt && <p class="fdoubt">{f.doubt}</p>}
    </div>
  );
}

export function FlightGuideView() {
  useEffect(loadFlight, []);
  const all = [...flightInfo.value.values()];
  const s0 = sel.value;
  const active = Object.values(s0).some((v) => v?.length);
  const pass = (f: FlightInfo, skip?: string) => {
    if (skip !== 'group' && s0.group?.length && !s0.group.includes(f.group)) return false;
    for (const [k] of CRITERIA) {
      const want = s0[k];
      if (k === skip || !want?.length) continue;
      const has = f[k];
      if (has?.length && !has.some((v) => want.includes(v))) return false;
    }
    return true;
  };
  const toggle = (k: FlightKey | 'group', v: string) => {
    const cur = s0[k] || [];
    sel.value = { ...s0, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
  };
  const common = (f: FlightInfo) => birdInfo.value.get(f.id)?.common ?? 0;
  // birds matching what is ticked come before those that only stay because nothing is documented
  const fit = (f: FlightInfo) => CRITERIA.filter(([k]) => f[k]?.some((v) => s0[k]?.includes(v))).length;
  const result = all.filter((f) => pass(f)).sort((a, b) => fit(b) - fit(a) || common(b) - common(a));
  // a bird stays in the list when a ticked criterion is undocumented for it: that is not a match, so it goes apart
  const ticked = CRITERIA.filter(([k]) => s0[k]?.length).length;
  const matches = result.filter((f) => fit(f) === ticked);
  const unknown = result.filter((f) => fit(f) < ticked);
  const count = (k: FlightKey, v: string) => all.filter((f) => pass(f, k) && f[k]?.includes(v)).length;

  return (
    <div class="idg">
      <GuideSwitch />
      <div class="card">
        <b>Raptor overhead?</b>
        <p class="muted small" style="margin:4px 0 0">Look in this order: size and width of the wings, the tail, the pattern under the wings, then how it flies. Light and angle change the colours, so trust the shape first.</p>
      </div>

      <div class="fgroup">
        <div class="lab">Which shape</div>
        <div class="fshapes">
          {GROUPS.map((g) => (
            <button class={'fshape' + (s0.group?.includes(g) ? ' on' : '')} onClick={() => toggle('group', g)}>
              <b>{GROUP_LABEL[g]}</b><span>{GROUP_HINT[g]}</span>
            </button>
          ))}
        </div>
      </div>

      {CRITERIA.map(([k, label, options]) => (
        <div class="fgroup">
          <div class="lab">{label}</div>
          <div class="chips">
            {options.map(([v, text]) => {
              const on = !!s0[k]?.includes(v);
              const n = count(k, v);
              return <button class={'chip' + (on ? ' on' : '') + (!on && n === 0 ? ' empty' : '')} disabled={!on && n === 0} onClick={() => toggle(k, v)}>{text} <span class="n">{n}</span></button>;
            })}
          </div>
        </div>
      ))}

      <div class="row" style="justify-content:space-between;margin:12px 0 8px">
        <b>{matches.length} raptor{matches.length !== 1 ? 's' : ''}{active ? ' match' + (matches.length === 1 ? 'es' : '') : ''}</b>
        {active && <button class="btn sm secondary" onClick={() => { sel.value = {}; }}>clear all</button>}
      </div>
      {matches.map((f) => <FlightCard f={f} link key={f.id} />)}
      {unknown.length > 0 && <>
        <div class="sec">Can't be ruled out ({unknown.length})</div>
        <p class="muted small" style="margin:0 0 8px">No source found for at least one thing you ticked. Best match first.</p>
        {unknown.map((f) => <FlightCard f={f} link key={f.id} />)}
      </>}
      <p class="credit" style="margin-top:12px">Marks are for adults, unless said otherwise, and come from the sources on each species page and in the app's data. A bird with nothing documented for a criterion is not ruled out. Photos: Wikimedia Commons and iNaturalist, under their authors' licences. Offline, they need the “Raptors in flight” pack in Settings.</p>
    </div>
  );
}

/** "In flight" on the page of a raptor. */
export function FlightSection({ id }: { id: string }) {
  useEffect(loadFlight, []);
  const f = flightInfo.value.get(id);
  if (!f) return null;
  return (
    <>
      <div class="sec">In flight</div>
      <FlightCard f={f} />
    </>
  );
}
