import { signal } from '@preact/signals';
import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { species, seenCount, name, name2, totals } from '../data';
import { href } from '../router';
import { matches } from '../util';
import { familyEn, groupOf, GROUPS, GROUP_LABEL, GROUP_ICON, OTHER_GROUPS } from '../taxa';
import { Thumb } from '../components/Thumb';
import { Icon } from '../components/Icon';
import { SearchBox } from '../components/SearchBox';
import { ObsForm } from '../components/ObsForm';
import { MigBadge, SortButton } from '../components/BirdSection';
import { birdSort } from '../learn/birds';
import { abundanceCompare, abundanceText } from '../learn/abundance';
import { plantInfo, type PlantKind } from '../learn/plants';
import { otherInfo, CAT_LABEL, type OtherCat } from '../learn/others';
import type { Group, Species } from '../types';

// module-level so the list keeps its state when coming back from a species page
const saved = localStorage.getItem('tab') as Group;
const tab = signal<Group>(GROUPS.includes(saved) ? saved : 'bird');
const q = signal('');
const filter = signal<'all' | 'seen' | 'unseen'>('all');
// plants only: trees (with shrubs and succulents), grasses, wildflowers
const PLANT_KINDS: [string, string, PlantKind[]][] = [['all', 'All', []], ['trees', 'Trees & shrubs', ['tree', 'shrub', 'succulent']], ['grass', 'Grasses', ['grass']], ['herb', 'Wildflowers', ['herb']]];
const plantKind = signal('all');
// others: reptiles, spiders and scorpions, frogs, insects (only the categories that have species)
const otherCat = signal<OtherCat | 'all'>('all');

export function ListView() {
  const [adding, setAdding] = useState<string | null>(null);
  const seen = seenCount.value;
  // mammals have no level: no sort
  const cmp = tab.value !== 'mammal' ? abundanceCompare(birdSort.value) : null;
  let list = species.value.filter((s) => s.group === tab.value && matches(s, q.value) && (filter.value === 'all' || (filter.value === 'seen') === seen.has(s.id)));
  const kinds = tab.value === 'plant' ? PLANT_KINDS.find(([k]) => k === plantKind.value)![2] : [];
  if (kinds.length) list = list.filter((s) => kinds.includes(plantInfo.value.get(s.id)?.kind as PlantKind));
  if (tab.value === 'other' && otherCat.value !== 'all') list = list.filter((s) => otherInfo.value.get(s.id)?.cat === otherCat.value);
  if (cmp) list = [...list].sort(cmp);
  // one category of the Others tab in A-Z order comes by plain-language group (skinks, geckos…; beetles, termites…),
  // each under its own header
  const subGroups = tab.value === 'other' && otherCat.value !== 'all' && !cmp ? OTHER_GROUPS[otherCat.value] : null;
  const sg = (s: Species) => groupOf(s) || '';
  if (subGroups) {
    const rank = (s: Species) => { const i = subGroups.findIndex(([g]) => g === sg(s)); return i < 0 ? 99 : i; };
    list = [...list].sort((a, b) => rank(a) - rank(b));
  }
  const t = totals.value[tab.value];

  return (
    <div>
      <div class="duo quad">
        {GROUPS.map((g) => {
          const tg = totals.value[g];
          return (
            <button class={tab.value === g ? 'on' : ''} onClick={() => { tab.value = g; localStorage.setItem('tab', g); }}>
              <span class="l"><Icon name={GROUP_ICON[g]} size={15} />{GROUP_LABEL[g]}</span>
              <span class="v">{tg.seen}<small>/{tg.total}</small></span>
              <span class="bar"><i style={`width:${tg.total ? (100 * tg.seen) / tg.total : 0}%`} /></span>
            </button>
          );
        })}
      </div>
      {tab.value === 'plant' && (
        <div class="chips" style="margin-bottom:8px">
          {PLANT_KINDS.map(([k, label]) => <button class={'chip' + (plantKind.value === k ? ' on' : '')} onClick={() => (plantKind.value = k)}>{label}</button>)}
        </div>
      )}
      {tab.value === 'other' && (
        <div class="chips" style="margin-bottom:8px">
          <button class={'chip' + (otherCat.value === 'all' ? ' on' : '')} onClick={() => (otherCat.value = 'all')}>All</button>
          {(Object.keys(CAT_LABEL) as OtherCat[]).filter((c) => [...otherInfo.value.values()].some((o) => o.cat === c)).map((c) => <button class={'chip' + (otherCat.value === c ? ' on' : '')} onClick={() => (otherCat.value = c)}>{CAT_LABEL[c]}</button>)}
        </div>
      )}
      <SearchBox value={q.value} onInput={(v) => (q.value = v)} placeholder="Name or family (English, French, Latin)" />
      <div class="listhead">
        <div class="chips" style="margin-bottom:-7px">
          {(['all', 'seen', 'unseen'] as const).map((f) => (
            <button class={'chip' + (filter.value === f ? ' on' : '')} onClick={() => (filter.value = f)}>{f === 'all' ? 'All' : f === 'seen' ? `Seen · ${t.seen}` : `To see · ${t.total - t.seen}`}</button>
          ))}
        </div>
        {q.value && <span class="muted count">{list.length}</span>}
        {tab.value !== 'mammal' && <SortButton />}
      </div>
      <div class="list">
        {list.map((s, i) => {
          const head = subGroups && (i === 0 || sg(list[i - 1]) !== sg(s)) ? subGroups.find(([g]) => g === sg(s))?.[1] : null;
          const n = seen.get(s.id) || 0;
          const rt = cmp && abundanceText(s.id);
          return (
            <Fragment key={s.id}>
            {head && <div class="sec listsec">{head}</div>}
            <div class={'sp-row' + (n ? ' seen' : '')}>
              <a href={href('species/' + s.id)} class="row" style="flex:1;min-width:0">
                <span class={'ph' + (n ? ' seen' : '')}><Thumb s={s} />{s.group === 'bird' && <MigBadge id={s.id} />}</span>
                <div class="names">
                  <div class="fr">{name(s)}</div>
                  <div class="en">{name2(s)}{name2(s) ? ' · ' : ''}{rt || familyEn(s)}</div>
                </div>
                {n > 0 && <span class="cnt">×{n}</span>}
              </a>
              <button class="add" aria-label="Log an observation" onClick={() => setAdding(s.id)}><Icon name="plus" /></button>
            </div>
            </Fragment>
          );
        })}
        {list.length === 0 && <div class="empty"><div class="ring"><Icon name="search" size={26} /></div>No species matches.</div>}
      </div>
      {adding && <ObsForm speciesId={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}
