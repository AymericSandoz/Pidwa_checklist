import { signal } from '@preact/signals';
import { species, byId, seenCount, name, name2, imgUrl } from '../data';
import { href } from '../router';
import { L, ORDER, lbl, matches } from '../util';
import { BIRD_GROUPS, groupOf, familyEn } from '../taxa';
import { COLOURS, BIRD_COLOURS } from '../colours';
import { Icon } from '../components/Icon';
import { SearchBox } from '../components/SearchBox';
import type { Species } from '../types';

// Every criterion is multi-select: ticking several options means "one of these" (e.g. bill medium OR thin).
// Colours rank the results: birds showing more of the ticked colours come first.
type Key = 'group' | 'colour' | 'size' | 'bill' | 'legs' | 'habitat' | 'lifestyle' | 'niche';
const sel = signal<Partial<Record<Key, string[]>>>({});
const family = signal('');
const q = signal('');
const hideSeen = signal(false);

const TRAITS: [Exclude<Key, 'group' | 'colour'>, string][] = [['size', 'Size'], ['bill', 'Bill'], ['legs', 'Legs']];
const MORE: [Exclude<Key, 'group' | 'colour'>, string][] = [['habitat', 'Habitat'], ['lifestyle', 'Where you see it'], ['niche', 'Food']];

// short tile labels + a typical bird for each group's photo
const GROUP_TILE: Record<string, [string, string]> = {
  raptors: ['Raptors', 'haliaeetus-vocifer'], vultures: ['Vultures', 'gyps-africanus'], owls: ['Owls, nightjars', 'bubo-africanus'],
  herons: ['Herons, storks', 'ardea-goliath'], waterfowl: ['Ducks, geese', 'alopochen-aegyptiaca'], waders: ['Lapwings, plovers', 'vanellus-armatus'],
  gamebirds: ['Francolins, guineafowl', 'numida-meleagris'], doves: ['Pigeons, doves', 'streptopelia-capicola'], cuckoos: ['Cuckoos, turacos', 'gallirex-porphyreolophus'],
  swifts: ['Swifts, swallows', 'hirundo-rustica'], kingfishers: ['Kingfishers, rollers', 'coracias-caudatus'], hornbills: ['Hornbills', 'tockus-leucomelas'],
  woodpeckers: ['Woodpeckers, barbets', 'lybius-torquatus'], shrikes: ['Shrikes, drongos', 'dicrurus-adsimilis'], thrushes: ['Thrushes, robins', 'cossypha-heuglini'],
  warblers: ['Warblers, cisticolas', 'cisticola-chiniana'], starlings: ['Starlings, bulbuls', 'lamprotornis-nitens'], sunbirds: ['Sunbirds', 'chalcomitra-senegalensis'],
  seedeaters: ['Weavers, finches', 'ploceus-velatus'], pipits: ['Pipits, wagtails', 'macronyx-croceus'],
};

const colours = (b: Species) => BIRD_COLOURS[b.id] || [];
const valueOf = (b: Species, k: Key): string[] =>
  k === 'group' ? [groupOf(b) || ''] : k === 'colour' ? colours(b) : [b.idk?.[k] || ''];

function toggle(k: Key, v: string) {
  const cur = sel.value[k] || [];
  sel.value = { ...sel.value, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
  if (k === 'group') family.value = '';
}

export function IdGuideView() {
  const birds = species.value.filter((s) => s.group === 'bird');
  const seen = seenCount.value;
  const s0 = sel.value;
  const nSel = Object.values(s0).reduce((a, v) => a + (v?.length || 0), 0);
  const active = nSel > 0 || !!family.value || !!q.value;

  const pass = (b: Species, skip?: Key | 'family') => {
    for (const k of Object.keys(s0) as Key[]) {
      const want = s0[k];
      if (k === skip || !want?.length) continue;
      if (!valueOf(b, k).some((v) => want.includes(v))) return false;
    }
    if (skip !== 'family' && family.value && b.family !== family.value) return false;
    if (hideSeen.value && seen.has(b.id)) return false;
    return matches(b, q.value);
  };
  const wantCol = s0.colour || [];
  const score = (b: Species) => colours(b).filter((c) => wantCol.includes(c)).length;
  const result = birds.filter((b) => pass(b)).sort((a, b) => score(b) - score(a));
  // count per option with that criterion's own filter removed, so you see where the candidates are
  const countFor = (k: Key, v: string) => birds.filter((b) => valueOf(b, k).includes(v) && pass(b, k)).length;
  const fams = [...new Set(birds.filter((b) => pass(b, 'family')).map((b) => b.family || ''))].filter(Boolean).sort();

  const chip = (k: Key, v: string, label: preact.ComponentChildren) => {
    const on = !!s0[k]?.includes(v);
    const n = countFor(k, v);
    return (
      <button class={'chip' + (on ? ' on' : '') + (!on && n === 0 ? ' empty' : '')} disabled={!on && n === 0} onClick={() => toggle(k, v)}>
        {label} <span class="n">{n}</span>
      </button>
    );
  };
  const chipRow = ([k, label]: [Exclude<Key, 'group' | 'colour'>, string]) => (
    <div class="fgroup">
      <div class="lab">{label}</div>
      <div class="chips">{ORDER[k].map((v) => chip(k, v, lbl(L[k], v)))}</div>
    </div>
  );

  return (
    <div class="idg">
      <SearchBox value={q.value} onInput={(v) => (q.value = v)} placeholder="Name (English, French, Latin)" />

      <div class="fgroup">
        <div class="lab">What kind of bird <span class="hint">tick one or several</span></div>
        <div class="gtiles">
          {BIRD_GROUPS.map(([g, full]) => {
            const [short, rep] = GROUP_TILE[g] || [full, ''];
            const s = byId.value.get(rep);
            const u = s && imgUrl(s);
            const on = !!s0.group?.includes(g);
            const n = countFor('group', g);
            return (
              <button class={'gtile' + (on ? ' on' : '') + (!on && n === 0 ? ' empty' : '')} disabled={!on && n === 0} title={full} onClick={() => toggle('group', g)}>
                {u ? <img src={u} loading="lazy" decoding="async" alt="" /> : <div class="noimg"><Icon name="bird" size={26} /></div>}
                <span class="gl">{short}</span>
                <span class="n">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div class="fgroup">
        <div class="lab">Obvious colour <span class="hint">only for colourful birds</span></div>
        <div class="chips">
          {COLOURS.map(([c, label, sw]) => chip('colour', c, <><i class="sw" style={{ background: sw }} />{label}</>))}
        </div>
      </div>

      {TRAITS.map(chipRow)}

      <details class="filters">
        <summary>More criteria</summary>
        {MORE.map(chipRow)}
        <div class="fgroup row">
          <select class="search" style="flex:1" value={family.value} onChange={(e) => (family.value = (e.target as HTMLSelectElement).value)}>
            <option value="">any family</option>
            {fams.map((f) => <option value={f}>{familyEn({ family: f } as any)} ({f})</option>)}
          </select>
        </div>
      </details>

      <div class="idbar">
        <b>{result.length} bird{result.length !== 1 ? 's' : ''}</b>
        <button class={'chip' + (hideSeen.value ? ' on' : '')} onClick={() => (hideSeen.value = !hideSeen.value)}>hide seen</button>
        {active && <button class="btn sm secondary" onClick={() => { sel.value = {}; family.value = ''; q.value = ''; }}>clear all</button>}
      </div>

      <div class="grid">
        {result.map((b) => {
          const u = imgUrl(b);
          return (
            <a class={'tile' + (seen.has(b.id) ? ' seen' : '')} href={href('species/' + b.id)} key={b.id} title={name2(b)}>
              {u ? <img src={u} loading="lazy" decoding="async" alt="" /> : <div class="noimg"><Icon name="bird" size={26} /></div>}
              <div class="t">{name(b)}</div>
            </a>
          );
        })}
      </div>
      <p class="credit" style="margin-top:12px">Colours are hand-picked, and only for birds where they're obvious (adult, usually the male). Size, bill and legs come from AVONET measurements (Tobias et al. 2022): indicative, not field-guide criteria.</p>
    </div>
  );
}
