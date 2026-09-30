import { useState } from 'preact/hooks';
import { observations, obsInfo, byId } from '../data';
import { href } from '../router';
import { dayKey, fmtDate, fmtTime } from '../util';
import { ObsForm } from '../components/ObsForm';
import { PhotoImg } from '../components/PhotoImg';
import { Thumb } from '../components/Thumb';
import { Icon } from '../components/Icon';
import type { Observation } from '../types';

export function JournalView() {
  const [form, setForm] = useState<{ obs?: Observation } | null>(null);
  const obs = observations.value;
  const days = new Map<string, Observation[]>();
  for (const o of obs) { const k = dayKey(o.ts); if (!days.has(k)) days.set(k, []); days.get(k)!.push(o); }

  return (
    <div class="has-fab">
      {obs.length === 0 && <div class="empty"><div class="ring"><Icon name="notebook-pen" size={28} /></div><b>No observations yet</b><br />Log the first one with the button below, or from a species page.</div>}
      {[...days.entries()].map(([k, list]) => {
        const distinct = new Set(list.map((o) => o.speciesId)).size;
        return (
          <div key={k}>
            <div class="day">{fmtDate(list[0].ts)}<span class="muted small">{list.length} obs · {distinct} species</span></div>
            {list.map((o) => {
              const s = obsInfo(o);
              const sp = byId.value.get(o.speciesId);
              return (
                <div class="obs" key={o.id} onClick={() => setForm({ obs: o })}>
                  <div class="time">{fmtTime(o.ts)}</div>
                  {sp ? <a href={href('species/' + o.speciesId)} onClick={(e) => e.stopPropagation()} aria-label="Species page"><Thumb s={sp} /></a> : <div class="thumb"><Icon name="bird" size={20} /></div>}
                  <div class="body">
                    <div class="name">{s.en}{o.count > 1 ? ` ×${o.count}` : ''} {!s.onList && <span class="tag off">not on checklist</span>}</div>
                    <div class="meta">{s.fr}</div>
                    {o.note && <div class="note">{o.note}</div>}
                    <div class="meta">{o.lat != null && o.lon != null ? <><Icon name="map-pin" size={12} stroke={2.2} />{o.lat.toFixed(4)}, {o.lon.toFixed(4)}{o.acc ? ` · ±${o.acc} m` : ''}</> : 'no position'}</div>
                  </div>
                  {o.photo && <PhotoImg blob={o.photo} />}
                </div>
              );
            })}
          </div>
        );
      })}
      <button class="fab" onClick={() => setForm({})}><Icon name="plus" stroke={2.6} />Observation</button>
      {form && <ObsForm obs={form.obs} onClose={() => setForm(null)} />}
    </div>
  );
}
