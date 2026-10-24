import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { species, seenCount, name, name2, totals } from '../data';
import { href } from '../router';
import { matches } from '../util';
import { familyEn } from '../taxa';
import { Thumb } from '../components/Thumb';
import { Icon } from '../components/Icon';
import { SearchBox } from '../components/SearchBox';
import { ObsForm } from '../components/ObsForm';
import { MigBadge } from '../components/BirdSection';
import { birdInfo, rarity, RARITY_LABEL, fmtCommon } from '../learn/birds';
import type { Group } from '../types';

type Sort = 'az' | 'rare' | 'common';
const SORT_LABEL: Record<Sort, string> = { az: 'A–Z', rare: 'Rarest', common: 'Commonest' };
const NEXT_SORT: Record<Sort, Sort> = { az: 'rare', rare: 'common', common: 'az' };

// module-level so the list keeps its state when coming back from a species page
const tab = signal<Group>((localStorage.getItem('tab') as Group) || 'bird');
const q = signal('');
const filter = signal<'all' | 'seen' | 'unseen'>('all');
const sort = signal<Sort>((localStorage.getItem('sort') as Sort) || 'az');

export function ListView() {
  const [adding, setAdding] = useState<string | null>(null);
  const seen = seenCount.value;
  const info = birdInfo.value;
  // birds only: mammals have no atlas rate. Birds without one go last either way.
  const bySort = tab.value === 'bird' && sort.value !== 'az' ? sort.value : null;
  let list = species.value.filter((s) => s.group === tab.value && matches(s, q.value) && (filter.value === 'all' || (filter.value === 'seen') === seen.has(s.id)));
  if (bySort) {
    const c = (id: string) => info.get(id)?.common ?? (bySort === 'rare' ? Infinity : -Infinity);
    list = [...list].sort((a, b) => (bySort === 'rare' ? c(a.id) - c(b.id) : c(b.id) - c(a.id)));
  }
  const t = totals.value[tab.value];

  return (
    <div>
      <div class="duo">
        {(['bird', 'mammal'] as Group[]).map((g) => {
          const tg = totals.value[g];
          return (
            <button class={tab.value === g ? 'on' : ''} onClick={() => { tab.value = g; localStorage.setItem('tab', g); }}>
              <span class="l"><Icon name={g === 'bird' ? 'bird' : 'paw-print'} size={16} />{g === 'bird' ? 'Birds' : 'Mammals'}</span>
              <span class="v">{tg.seen}<small>/{tg.total}</small></span>
              <span class="bar"><i style={`width:${tg.total ? (100 * tg.seen) / tg.total : 0}%`} /></span>
            </button>
          );
        })}
      </div>
      <SearchBox value={q.value} onInput={(v) => (q.value = v)} placeholder="Name or family (English, French, Latin)" />
      <div class="listhead">
        <div class="chips" style="margin-bottom:-7px">
          {(['all', 'seen', 'unseen'] as const).map((f) => (
            <button class={'chip' + (filter.value === f ? ' on' : '')} onClick={() => (filter.value = f)}>{f === 'all' ? 'All' : f === 'seen' ? `Seen · ${t.seen}` : `To see · ${t.total - t.seen}`}</button>
          ))}
        </div>
        {q.value && <span class="muted count">{list.length}</span>}
        {tab.value === 'bird' && (
          <button class={'chip sortbtn' + (bySort ? ' on' : '')} onClick={() => { sort.value = NEXT_SORT[sort.value]; localStorage.setItem('sort', sort.value); }}
            aria-label={'Sort: ' + SORT_LABEL[sort.value]}><Icon name="arrow-down-up" size={14} stroke={2.4} />{SORT_LABEL[sort.value]}</button>
        )}
      </div>
      <div class="list">
        {list.map((s) => {
          const n = seen.get(s.id) || 0;
          const b = bySort ? info.get(s.id) : undefined;
          const r = b && rarity(b);
          return (
            <div class={'sp-row' + (n ? ' seen' : '')} key={s.id}>
              <a href={href('species/' + s.id)} class="row" style="flex:1;min-width:0">
                <span class={'ph' + (n ? ' seen' : '')}><Thumb s={s} />{s.group === 'bird' && <MigBadge id={s.id} />}</span>
                <div class="names">
                  <div class="fr">{name(s)}</div>
                  <div class="en">{name2(s)}{name2(s) ? ' · ' : ''}{r ? `${RARITY_LABEL[r]}, ${fmtCommon(b!.common!)}` : familyEn(s)}</div>
                </div>
                {n > 0 && <span class="cnt">×{n}</span>}
              </a>
              <button class="add" aria-label="Log an observation" onClick={() => setAdding(s.id)}><Icon name="plus" /></button>
            </div>
          );
        })}
        {list.length === 0 && <div class="empty"><div class="ring"><Icon name="search" size={26} /></div>No species matches.</div>}
      </div>
      {adding && <ObsForm speciesId={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}
