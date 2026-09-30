import { useState } from 'preact/hooks';
import { byId, imgUrl, name, name2, observations, dataUrl } from '../data';
import { back, href } from '../router';
import { fmtDay, fmtTime, L, lbl, soundIdGrade } from '../util';
import { familyEn, groupOf, groupLabel } from '../taxa';
import { ObsForm } from '../components/ObsForm';
import { PhotoImg } from '../components/PhotoImg';
import { Icon } from '../components/Icon';
import { SoundPlayer } from '../components/SoundPlayer';
import type { Observation } from '../types';

const IUCN_TONE: Record<string, string> = { NT: ' warn', VU: ' warn', EN: ' bad', CR: ' bad' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function SpeciesView({ id }: { id: string }) {
  const s = byId.value.get(id);
  const [form, setForm] = useState<{ obs?: Observation } | null>(null);
  const [more, setMore] = useState(false);
  if (!s) return <div class="center"><div><p>Unknown species.</p><a class="btn" href={href('list')}>Back to the list</a></div></div>;
  const img = imgUrl(s);
  const mine = observations.value.filter((o) => o.speciesId === s.id);
  const iucn = s.iucn ? lbl(L.iucn, s.iucn.toLowerCase()) : null;
  const a = s.avonet;
  const k = s.idk;
  const grp = s.group === 'bird' ? groupOf(s) : null;
  const grade = s.bn ? soundIdGrade(s.bn.ref) : null;

  // [label, value, full width]
  const specs = ([
    ['Size', k?.size ? lbl(L.size, k.size) : null, true],
    ['Weight', a?.mass != null ? (a.mass >= 1000 ? (a.mass / 1000).toFixed(1) + ' kg' : Math.round(a.mass) + ' g') : null],
    ['Bill', k?.bill ? lbl(L.bill, k.bill) : null],
    ['Legs', k?.legs ? lbl(L.legs, k.legs) : null],
    ['Habitat', k?.habitat ? lbl(L.habitat, k.habitat) : null],
    ['Usually', k?.lifestyle ? lbl(L.lifestyle, k.lifestyle) : null],
    ['Food', k?.niche ? lbl(L.niche, k.niche) : null],
    ['Presence', a?.migration === 3 ? 'migrant' : null],
    ['Group', grp ? groupLabel(grp) : null, true],
  ] as [string, string | null, boolean?][]).filter((x) => x[1]);
  // an odd number of half-width cells would leave a hole: the last one takes the full row
  const halves = specs.filter((x) => !x[2]);
  if (halves.length % 2) halves[halves.length - 1][2] = true;

  return (
    <div class="has-fab">
      <div class="hero" style={s.image ? `aspect-ratio:${s.image.w}/${s.image.h}` : ''}>
        {img ? <img src={img} alt={name(s)} /> : <div class="noimg">no photo</div>}
        <button class="backbtn" onClick={back} aria-label="Back"><Icon name="chevron-left" size={22} stroke={2.4} /></button>
        {s.image && <span class="cred">{s.image.author || 'unknown author'}{s.image.license ? ' · ' + s.image.license : ''}</span>}
      </div>
      <div class="sheet">
        <div class="eyebrow">{familyEn(s)}{s.family && familyEn(s) !== s.family ? ' · ' + s.family : ''}</div>
        <h1 class="sp-title">{name(s)}</h1>
        {name2(s) && <div class="sp-sub">{name2(s)}</div>}
        <div class="sp-sci">{s.sci}</div>

        <div class="pills">
          {mine.length > 0 ? <span class="pill ok"><Icon name="check" size={13} stroke={3} />Seen ×{mine.length}</span> : <span class="pill">Not seen yet</span>}
          {iucn && <span class={'pill' + (IUCN_TONE[iucn] || '')}>{iucn} · {s.iucn}</span>}
          {s.group === 'bird' && <span class="pill"><Icon name="mic" size={13} stroke={2.4} />{grade ? `sound ID ${grade}${s.bn!.lumped ? ', as ' + s.bn!.label.split('_')[1] : ''}` : 'no sound ID'}</span>}
        </div>

        {specs.length > 0 && <div class="specs">{specs.map(([label, value, wide]) => <div class={wide ? 'wide' : ''}><span>{label}</span><b>{value}</b></div>)}</div>}
        {s.traits && s.traits.length > 0 && <div class="card"><ul class="traits">{s.traits.map((t) => <li>{t}</li>)}</ul></div>}

        {(s.summary.en || s.summary.fr) && (
          <div class="card" onClick={() => setMore(!more)}>
            <p class={'summary' + (more ? '' : ' clamp')} style="margin:0">{s.summary.en || s.summary.fr}</p>
            <span class="more">{more ? 'Show less' : 'Read more'}</span> <span class="muted small">· Wikipedia{s.summary.en ? '' : ' (French)'}</span>
          </div>
        )}

        {s.sounds.length > 0 && (
          <>
            <div class="sec">Sounds</div>
            {s.sounds.map((sn) => <SoundPlayer key={sn.file} src={dataUrl(sn.file)} title={cap(sn.type || 'recording')} len={sn.len} sub={`quality ${sn.q} · ${sn.by} · xeno-canto`} />)}
          </>
        )}

        <div class="sec">My observations {mine.length > 0 && <span class="n">{mine.length}</span>}</div>
        {mine.map((o) => (
          <div class="obs" onClick={() => setForm({ obs: o })}>
            <div class="when"><b>{fmtDay(o.ts)}</b><span>{fmtTime(o.ts)}</span></div>
            <div class="body">
              {o.note ? <div class="name">{o.note}</div> : <div class="name">{o.count > 1 ? `${o.count} individuals` : 'Observed'}</div>}
              <div class="meta">{o.note && o.count > 1 ? `×${o.count} · ` : ''}{o.lat != null && o.lon != null ? <><Icon name="map-pin" size={12} stroke={2.2} />{o.lat.toFixed(4)}, {o.lon.toFixed(4)}{o.acc ? ` · ±${o.acc} m` : ''}</> : 'no position'}</div>
            </div>
            {o.photo && <PhotoImg blob={o.photo} />}
          </div>
        ))}
        {mine.length === 0 && <p class="muted">Nothing logged for this species yet.</p>}

        {s.image && <p class="credit" style="margin-top:18px">Photo: {s.image.author || 'unknown author'} · {s.image.license || ''} · {s.image.from || 'Wikimedia Commons'}{s.wiki.en && <> · <a href={s.wiki.en} target="_blank" rel="noopener">Wikipedia</a></>}{s.wiki.fr && <> · <a href={s.wiki.fr} target="_blank" rel="noopener">Wikipédia FR</a></>}</p>}
        {s.notes && <p class="credit">Checklist note: {s.notes}</p>}
      </div>

      <button class="fab" onClick={() => setForm({})}><Icon name="plus" stroke={2.6} />Observe</button>
      {form && <ObsForm speciesId={s.id} obs={form.obs} onClose={() => setForm(null)} />}
    </div>
  );
}
