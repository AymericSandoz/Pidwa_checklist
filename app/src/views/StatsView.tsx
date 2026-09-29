import { signal } from '@preact/signals';
import { species, observations, seenCount, firstSeen, totals, byId, name, obsInfo } from '../data';
import { href } from '../router';
import { dayKey, fmtDate } from '../util';
import { familyEn, BIG5 } from '../taxa';

const famGroup = signal<'bird' | 'mammal'>('bird');

export function StatsView() {
  const t = totals.value;
  const seen = seenCount.value;
  const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

  // families of the selected group, seen / total
  const fam = new Map<string, { seen: number; total: number }>();
  for (const s of species.value.filter((x) => x.group === famGroup.value)) {
    const k = familyEn(s) || '?';
    const f = fam.get(k) || { seen: 0, total: 0 };
    f.total++; if (seen.has(s.id)) f.seen++;
    fam.set(k, f);
  }
  const fams = [...fam.entries()].sort((a, b) => b[1].seen - a[1].seen || b[1].total - a[1].total);

  // days
  const days = new Map<string, Set<string>>();
  for (const o of observations.value) { const k = dayKey(o.ts); if (!days.has(k)) days.set(k, new Set()); days.get(k)!.add(o.speciesId); }
  const dayList = [...days.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  // lifers, most recent first
  const lifers = [...firstSeen.value.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  // species logged that are not on the Pidwa checklist (from sound ID)
  const extras = new Map<string, string>();
  for (const o of observations.value) if (!byId.value.has(o.speciesId)) extras.set(o.speciesId, obsInfo(o).en);

  return (
    <div>
      <div class="card row" style="justify-content:space-around;text-align:center">
        <div><div class="big">{t.bird.seen}<span class="muted" style="font-size:16px">/{t.bird.total}</span></div><div class="muted small">birds · {pct(t.bird.seen, t.bird.total)} %</div></div>
        <div><div class="big">{t.mammal.seen}<span class="muted" style="font-size:16px">/{t.mammal.total}</span></div><div class="muted small">mammals · {pct(t.mammal.seen, t.mammal.total)} %</div></div>
        <div><div class="big">{observations.value.length}</div><div class="muted small">observations</div></div>
      </div>

      <div class="card">
        <b>Big Five</b>
        <div class="big5">
          {BIG5.map(([label, ids]) => { const got = ids.some((i) => seen.has(i)); return <a class={'b5' + (got ? ' got' : '')} href={href('species/' + ids[0])}><span>{got ? '✓' : '·'}</span>{label}</a>; })}
        </div>
      </div>

      {dayList.length > 0 && (
        <div class="card">
          <b>By day</b>
          {dayList.map(([k, set]) => (
            <div class="stat"><span>{fmtDate(new Date(k + 'T12:00:00').getTime())}</span><span>{set.size} species</span></div>
          ))}
        </div>
      )}

      {lifers.length > 0 && (
        <div class="card">
          <b>Latest new species</b>
          {lifers.map(([id, ts]) => { const s = byId.value.get(id); return <div class="stat">{s ? <a href={href('species/' + id)}>{name(s)}</a> : <span>{extras.get(id) || id} <span class="tag off">not on checklist</span></span>}<span class="muted">{fmtDate(ts)}</span></div>; })}
        </div>
      )}

      {extras.size > 0 && (
        <div class="card">
          <b>Not on the Pidwa checklist ({extras.size})</b>
          <p class="muted small" style="margin:4px 0">Logged from sound ID. They do not count in the score.</p>
          {[...extras.values()].sort().map((n) => <div class="stat"><span>{n}</span></div>)}
        </div>
      )}

      <div class="card">
        <div class="row" style="justify-content:space-between"><b>Families</b>
          <div class="tabs" style="margin:0">
            <button class={famGroup.value === 'bird' ? 'on' : ''} onClick={() => (famGroup.value = 'bird')}>Birds</button>
            <button class={famGroup.value === 'mammal' ? 'on' : ''} onClick={() => (famGroup.value = 'mammal')}>Mammals</button>
          </div>
        </div>
        {fams.map(([k, f]) => (
          <div class="stat" style="display:block">
            <div class="row"><span style="flex:1">{k}</span><span class="muted">{f.seen}/{f.total}</span></div>
            <div class="bar"><i style={`width:${pct(f.seen, f.total)}%`} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
