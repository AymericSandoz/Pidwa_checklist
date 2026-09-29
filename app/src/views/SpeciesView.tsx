import { useState } from 'preact/hooks';
import { byId, imgUrl, name, name2, observations, dataUrl } from '../data';
import { back, href } from '../router';
import { fmtDate, fmtTime, L, lbl, soundIdGrade } from '../util';
import { familyEn, groupOf, groupLabel } from '../taxa';
import { ObsForm } from '../components/ObsForm';
import { PhotoImg } from '../components/PhotoImg';
import type { Observation } from '../types';

export function SpeciesView({ id }: { id: string }) {
  const s = byId.value.get(id);
  const [form, setForm] = useState<{ obs?: Observation } | null>(null);
  const [more, setMore] = useState(false);
  if (!s) return <div class="center"><p>Unknown species.</p><a class="btn" href={href('list')}>Back to the list</a></div>;
  const img = imgUrl(s);
  const mine = observations.value.filter((o) => o.speciesId === s.id);
  const iucn = s.iucn ? lbl(L.iucn, s.iucn.toLowerCase()) : null;
  const a = s.avonet;
  const grp = s.group === 'bird' ? groupOf(s) : null;

  return (
    <div class="has-fab">
      <div class="hero">
        {img ? <img src={img} alt={name(s)} /> : <div class="noimg">no photo</div>}
        <button class="backbtn" onClick={back} aria-label="Back">‹</button>
      </div>
      <div class="sp-title">{name(s)}</div>
      <div class="sp-sub">{name2(s)}{name2(s) ? ' · ' : ''}<i>{s.sci}</i></div>
      <div class="sp-sub">{familyEn(s)} <span class="muted">({s.family})</span>{grp ? ` · ${groupLabel(grp)}` : ''} {iucn && <span class={'iucn ' + iucn}>{iucn}</span>}</div>

      {s.idk && (
        <div class="facts">
          {s.idk.size && <span class="fact">size <b>{lbl(L.size, s.idk.size)}</b></span>}
          {a?.mass != null && <span class="fact"><b>{a.mass >= 1000 ? (a.mass / 1000).toFixed(1) + ' kg' : Math.round(a.mass) + ' g'}</b></span>}
          {s.idk.bill && <span class="fact">bill <b>{lbl(L.bill, s.idk.bill)}</b></span>}
          {s.idk.legs && <span class="fact">legs <b>{lbl(L.legs, s.idk.legs)}</b></span>}
          {s.idk.habitat && <span class="fact">{lbl(L.habitat, s.idk.habitat)}</span>}
          {s.idk.lifestyle && <span class="fact">{lbl(L.lifestyle, s.idk.lifestyle)}</span>}
          {s.idk.niche && <span class="fact">{lbl(L.niche, s.idk.niche)}</span>}
          {a?.migration === 3 && <span class="fact">migrant</span>}
          {s.group === 'bird' && (s.bn ? <span class={'fact' + (soundIdGrade(s.bn.ref) === 'weak' ? ' off' : '')}>🎤 sound ID <b>{soundIdGrade(s.bn.ref)}{s.bn.lumped ? ', as ' + s.bn.label.split('_')[1] : ''}</b></span> : <span class="fact off">🎤 sound ID <b>not covered</b></span>)}
        </div>
      )}
      {s.traits && s.traits.length > 0 && <ul class="summary">{s.traits.map((t) => <li>{t}</li>)}</ul>}

      {(s.summary.en || s.summary.fr) && (
        <div class="card" onClick={() => setMore(!more)}>
          <p class={'summary' + (more ? '' : ' clamp')} style="margin:0">{s.summary.en || s.summary.fr}</p>
          <span class="muted small">{more ? 'show less' : 'read more'} · Wikipedia{s.summary.en ? '' : ' (French)'}</span>
        </div>
      )}

      {s.sounds.length > 0 && (
        <div class="card sounds">
          <b>Sounds</b>
          {s.sounds.map((sn) => (
            <div>
              <span class="small muted">{sn.type} · quality {sn.q} · {sn.len} · {sn.by}</span>
              <audio controls preload="none" src={dataUrl(sn.file)} />
            </div>
          ))}
          <span class="credit">xeno-canto · <a href={href('settings')}>sound pack not downloaded? → Settings</a></span>
        </div>
      )}

      <div class="card">
        <div class="row"><b style="flex:1">My observations ({mine.length})</b></div>
        {mine.map((o) => (
          <div class="obs" style="box-shadow:none;padding:6px 0;border-bottom:1px solid var(--line);border-radius:0" onClick={() => setForm({ obs: o })}>
            <div class="body">
              <div class="name">{fmtDate(o.ts)} · {fmtTime(o.ts)}{o.count > 1 ? ` · ×${o.count}` : ''}</div>
              <div class="meta">{o.lat != null && o.lon != null ? `${o.lat.toFixed(4)}, ${o.lon.toFixed(4)}${o.acc ? ` ±${o.acc} m` : ''}` : 'no position'}</div>
              {o.note && <div class="note">{o.note}</div>}
            </div>
            {o.photo && <PhotoImg blob={o.photo} />}
          </div>
        ))}
        {mine.length === 0 && <p class="muted small">Not seen yet.</p>}
      </div>

      {s.image && <p class="credit">Photo: {s.image.author || 'unknown author'} · {s.image.license || ''} · {s.image.from || 'Wikimedia Commons'}{s.wiki.en && <> · <a href={s.wiki.en} target="_blank" rel="noopener">Wikipedia</a></>}{s.wiki.fr && <> · <a href={s.wiki.fr} target="_blank" rel="noopener">Wikipédia FR</a></>}</p>}
      {s.notes && <p class="credit">Checklist note: {s.notes}</p>}

      <button class="fab" onClick={() => setForm({})}>+ Observe</button>
      {form && <ObsForm speciesId={s.id} obs={form.obs} onClose={() => setForm(null)} />}
    </div>
  );
}
