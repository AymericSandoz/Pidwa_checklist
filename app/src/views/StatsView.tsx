import { species, observations, seenCount, firstSeen, totals, byId, name } from '../data';
import { href } from '../router';
import { dayKey, fmtDate } from '../util';
import { familyEn } from '../taxa';

export function StatsView() {
  const t = totals.value;
  const seen = seenCount.value;
  const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

  // bird families, seen / total
  const fam = new Map<string, { seen: number; total: number }>();
  for (const s of species.value.filter((x) => x.group === 'bird')) {
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

  return (
    <div>
      <div class="card row" style="justify-content:space-around;text-align:center">
        <div><div class="big">{t.bird.seen}<span class="muted" style="font-size:16px">/{t.bird.total}</span></div><div class="muted small">birds · {pct(t.bird.seen, t.bird.total)} %</div></div>
        <div><div class="big">{t.mammal.seen}<span class="muted" style="font-size:16px">/{t.mammal.total}</span></div><div class="muted small">mammals · {pct(t.mammal.seen, t.mammal.total)} %</div></div>
        <div><div class="big">{observations.value.length}</div><div class="muted small">observations</div></div>
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
          {lifers.map(([id, ts]) => { const s = byId.value.get(id); return <div class="stat"><a href={href('species/' + id)}>{s ? name(s) : id}</a><span class="muted">{fmtDate(ts)}</span></div>; })}
        </div>
      )}

      <div class="card">
        <b>Bird families</b>
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
