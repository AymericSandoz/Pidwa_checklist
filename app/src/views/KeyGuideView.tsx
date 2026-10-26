import { signal, type Signal } from '@preact/signals';
import { species, seenCount, name, name2, imgUrl } from '../data';
import { href } from '../router';
import { matches } from '../util';
import { Icon, type IconName } from '../components/Icon';
import { SearchBox } from '../components/SearchBox';
import { SortButton } from '../components/BirdSection';
import { birdSort } from '../learn/birds';
import { abundanceCompare, abundanceText } from '../learn/abundance';
import { snakeInfo, DANGER_LABEL, type Danger } from '../learn/snakes';
import { plantInfo, KIND_LABEL, LEAF_LABEL } from '../learn/plants';
import type { Group, Species } from '../types';
import { GuideSwitch } from './IdGuideView';

// Keys to the snakes and the plants, on the model of the bird guide: every criterion is multi-select ("one of these"),
// each option counts the species left once the other criteria apply, and the chosen sort orders the results.

interface Criterion {
  key: string;
  label: string;
  hint?: string;
  options: [string, preact.ComponentChildren][];
  valueOf: (id: string) => string[];
  more?: boolean;   // under "More criteria"
}

interface KeyState { sel: Signal<Record<string, string[]>>; q: Signal<string>; hideSeen: Signal<boolean> }
const state = (): KeyState => ({ sel: signal({}), q: signal(''), hideSeen: signal(false) });
const snakeState = state();
const plantState = state();

function KeyGuide({ group, st, criteria, icon, noun, badge, credit }: {
  group: Group; st: KeyState; criteria: Criterion[]; icon: IconName; noun: [string, string];
  badge?: (id: string) => preact.ComponentChildren; credit: string;
}) {
  const all = species.value.filter((s) => s.group === group);
  const seen = seenCount.value;
  const s0 = st.sel.value;
  const active = Object.values(s0).some((v) => v.length) || !!st.q.value;
  const byKey = new Map(criteria.map((c) => [c.key, c]));

  const pass = (s: Species, skip?: string) => {
    for (const [k, want] of Object.entries(s0)) {
      if (k === skip || !want.length) continue;
      if (!byKey.get(k)!.valueOf(s.id).some((v) => want.includes(v))) return false;
    }
    if (st.hideSeen.value && seen.has(s.id)) return false;
    return matches(s, st.q.value);
  };
  const cmp = abundanceCompare(birdSort.value);
  const result = all.filter((s) => pass(s));
  if (cmp) result.sort(cmp);
  const countFor = (c: Criterion, v: string) => all.filter((s) => c.valueOf(s.id).includes(v) && pass(s, c.key)).length;
  const toggle = (k: string, v: string) => {
    const cur = s0[k] || [];
    st.sel.value = { ...s0, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
  };

  const row = (c: Criterion) => (
    <div class="fgroup">
      <div class="lab">{c.label}{c.hint && <span class="hint">{c.hint}</span>}</div>
      <div class="chips">
        {c.options.map(([v, label]) => {
          const on = !!s0[c.key]?.includes(v);
          const n = countFor(c, v);
          return <button class={'chip' + (on ? ' on' : '') + (!on && n === 0 ? ' empty' : '')} disabled={!on && n === 0} onClick={() => toggle(c.key, v)}>{label} <span class="n">{n}</span></button>;
        })}
      </div>
    </div>
  );

  return (
    <div class="idg">
      <GuideSwitch />
      <SearchBox value={st.q.value} onInput={(v) => (st.q.value = v)} placeholder="Name (English, French, Latin)" />
      {criteria.filter((c) => !c.more).map(row)}
      {criteria.some((c) => c.more) && (
        <details class="filters">
          <summary>More criteria</summary>
          {criteria.filter((c) => c.more).map(row)}
        </details>
      )}

      <div class="idbar">
        <b>{result.length} {result.length === 1 ? noun[0] : noun[1]}</b>
        <button class={'chip' + (st.hideSeen.value ? ' on' : '')} onClick={() => (st.hideSeen.value = !st.hideSeen.value)}>hide seen</button>
        <SortButton />
        {active && <button class="btn sm secondary" onClick={() => { st.sel.value = {}; st.q.value = ''; }}>clear all</button>}
      </div>

      <div class="grid">
        {result.map((s) => {
          const u = imgUrl(s);
          const rt = cmp && abundanceText(s.id);
          return (
            <a class={'tile' + (seen.has(s.id) ? ' seen' : '')} href={href('species/' + s.id)} key={s.id} title={name2(s)}>
              {u ? <img src={u} loading="lazy" decoding="async" alt="" /> : <div class="noimg"><Icon name={icon} size={26} /></div>}
              {badge?.(s.id)}
              <div class="t">{name(s)}</div>
              {rt && <div class="rr">{rt}</div>}
            </a>
          );
        })}
      </div>
      <p class="credit" style="margin-top:12px">{credit}</p>
    </div>
  );
}

// ---- snakes ----
const sn = (id: string) => snakeInfo.value.get(id);
const LEN: [string, string, number, number][] = [['xs', 'Under 50 cm', 0, 50], ['s', '50 cm – 1 m', 50, 100], ['m', '1–2 m', 100, 200], ['l', 'Over 2 m', 200, 1e9]];
const DANGERS: Danger[] = ['deadly', 'venomous', 'mild', 'harmless'];
const DANGER_SHORT: Record<Danger, string> = { deadly: 'Potentially deadly', venomous: 'Venomous', mild: 'Mildly venomous', harmless: 'Not venomous' };
const sw = (c: string) => <i class="sw" style={{ background: c }} />;

const SNAKE_KEY: Criterion[] = [
  { key: 'col', label: 'Main colour', options: [['green', <>{sw('#4caf50')}Green</>], ['brown', <>{sw('#9a8566')}Brown, grey or olive</>], ['dark', <>{sw('#2b2530')}Black or dark purple</>], ['orange', <>{sw('#d9793b')}Orange, red or pink</>]], valueOf: (id) => sn(id)?.col || [] },
  { key: 'pat', label: 'Pattern', options: [['plain', 'Plain'], ['stripes', 'Stripes along'], ['bands', 'Bands across'], ['blotches', 'Blotches, spots, chevrons']], valueOf: (id) => sn(id)?.pat || [] },
  { key: 'len', label: 'Length', hint: 'adults; guesses run long, tick two if unsure', options: LEN.map(([k, l]) => [k, l]), valueOf: (id) => { const n = sn(id)?.len; return n == null ? [] : LEN.filter(([, , a, b]) => n >= a && n < b).map(([k]) => k); } },
  { key: 'where', label: 'Where', options: [['ground', 'On the ground'], ['trees', 'In a tree or bush'], ['water', 'In or by water'], ['underground', 'Dug up, under a log or out after rain']], valueOf: (id) => sn(id)?.where || [] },
  { key: 'when', label: 'When', options: [['day', 'By day'], ['night', 'At night']], valueOf: (id) => sn(id)?.when || [] },
  { key: 'danger', label: 'Danger', more: true, options: DANGERS.map((d) => [d, DANGER_SHORT[d]]), valueOf: (id) => { const d = sn(id)?.danger; return d ? [d] : []; } },
];
/** A red or amber corner on the tiles of the venomous snakes: whether to step back is the first thing to know. */
const dangerBadge = (id: string) => {
  const d = sn(id)?.danger;
  return d === 'deadly' || d === 'venomous' ? <span class={'dgb ' + d} title={DANGER_LABEL[d]}><Icon name="triangle-alert" size={13} stroke={2.6} /></span> : null;
};

export function SnakeGuideView() {
  return <KeyGuide group="snake" st={snakeState} criteria={SNAKE_KEY} icon="snake" noun={['snake', 'snakes']} badge={dangerBadge}
    credit="Colours and patterns are those of adults; young ones can differ (garter snakes, mambas). Never go close to check: a photo from a few metres is enough." />;
}

// ---- plants ----
const pl = (id: string) => plantInfo.value.get(id);
const thisMonth = new Date().getMonth();
const PLANT_KEY: Criterion[] = [
  { key: 'kind', label: 'What it is', options: (['tree', 'shrub', 'succulent', 'grass', 'herb'] as const).map((k) => [k, KIND_LABEL[k] + (k === 'herb' ? 's' : k === 'grass' ? 'es' : 's')]), valueOf: (id) => { const k = pl(id)?.kind; return k ? [k] : []; } },
  { key: 'leaf', label: 'Leaves', hint: 'not for grasses', options: (['simple', 'pinnate', 'bipinnate', 'trifoliate', 'twin', 'palmate', 'none'] as const).map((k) => [k, LEAF_LABEL[k]]), valueOf: (id) => { const l = pl(id)?.leaf; return l && l !== 'blade' ? [l] : []; } },
  { key: 'spines', label: 'Thorns or spines', options: [['yes', 'Yes'], ['no', 'No']], valueOf: (id) => { const p = pl(id); return p && p.kind !== 'grass' ? [p.spines ? 'yes' : 'no'] : []; } },
  { key: 'fcol', label: 'Flower colour', options: [['white', <>{sw('#f4f1e6')}White or cream</>], ['yellow', <>{sw('#f2c230')}Yellow</>], ['red', <>{sw('#d6402b')}Red or orange</>], ['pink', <>{sw('#b768c4')}Pink or purple</>], ['green', <>{sw('#9bb26a')}Small, greenish</>]], valueOf: (id) => pl(id)?.fcol || [] },
  { key: 'now', label: 'This month', hint: 'months shift with the rains', options: [['flower', 'In flower'], ['fruit', 'In fruit'], ['seed', 'Grass in seed']],
    valueOf: (id) => { const p = pl(id); if (!p) return []; const f = p.flowers[thisMonth] > '0'; return [f && p.kind !== 'grass' && 'flower', p.fruit[thisMonth] > '0' && 'fruit', f && p.kind === 'grass' && 'seed'].filter(Boolean) as string[]; } },
  { key: 'graze', label: 'Grazing value', more: true, hint: 'grasses', options: [['high', 'High'], ['average', 'Average'], ['low', 'Low']], valueOf: (id) => { const g = pl(id)?.graze; return g ? [g] : []; } },
];

export function PlantGuideView() {
  return <KeyGuide group="plant" st={plantState} criteria={PLANT_KEY} icon="tree" noun={['plant', 'plants']}
    credit="Flower colour is the colour seen from a few metres. Figs hide their flowers. Many trees flower on bare branches before the leaves." />;
}
