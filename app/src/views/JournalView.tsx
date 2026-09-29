import { useState } from 'preact/hooks';
import { observations, byId, name, name2 } from '../data';
import { href } from '../router';
import { dayKey, fmtDate, fmtTime } from '../util';
import { ObsForm } from '../components/ObsForm';
import { PhotoImg } from '../components/PhotoImg';
import type { Observation } from '../types';

export function JournalView() {
  const [form, setForm] = useState<{ obs?: Observation } | null>(null);
  const obs = observations.value;
  const days = new Map<string, Observation[]>();
  for (const o of obs) { const k = dayKey(o.ts); if (!days.has(k)) days.set(k, []); days.get(k)!.push(o); }

  return (
    <div class="has-fab">
      {obs.length === 0 && <div class="center"><p class="muted">No observations yet.<br />Log the first one with the button below, or from a species page.</p></div>}
      {[...days.entries()].map(([k, list]) => {
        const distinct = new Set(list.map((o) => o.speciesId)).size;
        return (
          <div key={k}>
            <div class="day">{fmtDate(list[0].ts)} <span class="muted small" style="font-weight:400">· {list.length} obs · {distinct} species</span></div>
            {list.map((o) => {
              const s = byId.value.get(o.speciesId);
              return (
                <div class="obs" key={o.id} onClick={() => setForm({ obs: o })}>
                  <div class="time">{fmtTime(o.ts)}</div>
                  <div class="body">
                    <div class="name">{s ? name(s) : o.speciesId}{o.count > 1 ? ` ×${o.count}` : ''} <a class="muted small" href={href('species/' + o.speciesId)} onClick={(e) => e.stopPropagation()}>page ›</a></div>
                    <div class="meta">{s ? name2(s) : ''}{o.lat != null && o.lon != null ? ` · ${o.lat.toFixed(4)}, ${o.lon.toFixed(4)}${o.acc ? ` ±${o.acc} m` : ''}` : ' · no position'}</div>
                    {o.note && <div class="note">{o.note}</div>}
                  </div>
                  {o.photo && <PhotoImg blob={o.photo} />}
                </div>
              );
            })}
          </div>
        );
      })}
      <button class="fab" onClick={() => setForm({})}>+ Observation</button>
      {form && <ObsForm obs={form.obs} onClose={() => setForm(null)} />}
    </div>
  );
}
