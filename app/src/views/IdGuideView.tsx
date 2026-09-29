import { signal } from '@preact/signals';
import { species, seenCount, name, name2, imgUrl } from '../data';
import { href } from '../router';
import { L, ORDER, lbl, matches } from '../util';
import { BIRD_GROUPS, groupOf, familyEn } from '../taxa';

type Key = 'size' | 'bill' | 'legs' | 'habitat' | 'lifestyle' | 'niche';
const group = signal<string>('');
const family = signal<string>('');
const sel = signal<Partial<Record<Key, string>>>({});
const q = signal('');
const hideSeen = signal(false);

const GROUPS: [Key, string][] = [['size', 'Size (by weight)'], ['bill', 'Bill'], ['legs', 'Legs'], ['habitat', 'Habitat'], ['lifestyle', 'Where you see it'], ['niche', 'Food']];

export function IdGuideView() {
  const birds = species.value.filter((s) => s.group === 'bird');
  const seen = seenCount.value;
  const s0 = sel.value;
  const active = !!group.value || !!family.value || Object.values(s0).some(Boolean);

  const pass = (b: (typeof birds)[0], skip?: Key | 'group' | 'family') => {
    if (skip !== 'group' && group.value && groupOf(b) !== group.value) return false;
    if (skip !== 'family' && family.value && b.family !== family.value) return false;
    for (const k of Object.keys(s0) as Key[]) if (k !== skip && s0[k] && b.idk?.[k] !== s0[k]) return false;
    if (hideSeen.value && seen.has(b.id)) return false;
    return matches(b, q.value);
  };
  const result = birds.filter((b) => pass(b));
  // count per option, computed with that criterion's own filter removed, so the user sees where the candidates are
  const countFor = (k: Key, v: string) => birds.filter((b) => b.idk?.[k] === v && pass(b, k)).length;
  const countGroup = (g: string) => birds.filter((b) => groupOf(b) === g && pass(b, 'group')).length;
  // families available inside the current group (or all)
  const fams = [...new Set(birds.filter((b) => pass(b, 'family')).map((b) => b.family || ''))].filter(Boolean).sort();

  return (
    <div>
      <input class="search" type="search" placeholder="name (English, French, Latin)" value={q.value} onInput={(e) => (q.value = (e.target as HTMLInputElement).value)} />
      <details class="filters" open>
        <summary>Filters · {result.length} bird{result.length !== 1 ? 's' : ''} {active ? <button class="btn sm secondary" style="margin-left:8px" onClick={(e) => { e.preventDefault(); sel.value = {}; group.value = ''; family.value = ''; }}>clear</button> : null}</summary>

        <div class="fgroup">
          <div class="lab">What kind of bird</div>
          <div class="chips">
            {BIRD_GROUPS.map(([g, label]) => {
              const n = countGroup(g);
              const on = group.value === g;
              return <button class={'chip' + (on ? ' on' : '')} disabled={!on && n === 0} style={!on && n === 0 ? 'opacity:.35' : ''} onClick={() => { group.value = on ? '' : g; family.value = ''; }}>{label} <span class="small" style="margin-left:4px;opacity:.7">{n}</span></button>;
            })}
          </div>
        </div>
        <div class="fgroup row">
          <select class="search" style="flex:1" value={family.value} onChange={(e) => (family.value = (e.target as HTMLSelectElement).value)}>
            <option value="">any family{group.value ? ' in this group' : ''}</option>
            {fams.map((f) => <option value={f}>{familyEn({ family: f } as any)} ({f})</option>)}
          </select>
          <button class={'chip' + (hideSeen.value ? ' on' : '')} style="margin:0" onClick={() => (hideSeen.value = !hideSeen.value)}>hide seen</button>
        </div>

        {GROUPS.map(([k, label]) => (
          <div class="fgroup">
            <div class="lab">{label}</div>
            <div class="chips">
              {ORDER[k].map((v) => {
                const n = countFor(k, v);
                const on = s0[k] === v;
                return <button class={'chip' + (on ? ' on' : '')} disabled={!on && n === 0} style={!on && n === 0 ? 'opacity:.35' : ''} onClick={() => (sel.value = { ...s0, [k]: on ? undefined : v })}>{lbl(L[k], v)} <span class="small" style="margin-left:4px;opacity:.7">{n}</span></button>;
              })}
            </div>
          </div>
        ))}
      </details>
      <div class="grid" style="margin-top:8px">
        {result.map((b) => {
          const u = imgUrl(b);
          return (
            <a class={'tile' + (seen.has(b.id) ? ' seen' : '')} href={href('species/' + b.id)} key={b.id} title={name2(b)}>
              {u ? <img src={u} loading="lazy" decoding="async" alt="" /> : <div class="noimg">🐦</div>}
              <div class="t">{name(b)}</div>
            </a>
          );
        })}
      </div>
      <p class="credit" style="margin-top:12px">Size, bill and legs are derived from AVONET measurements (Tobias et al. 2022): indicative, not field-guide criteria. Groups are field groupings by family, not strict taxonomy.</p>
    </div>
  );
}
