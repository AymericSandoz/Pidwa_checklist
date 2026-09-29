import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { species, seenCount, name, name2, totals } from '../data';
import { href } from '../router';
import { matches } from '../util';
import { familyEn } from '../taxa';
import { Thumb } from '../components/Thumb';
import { ObsForm } from '../components/ObsForm';
import type { Group } from '../types';

// module-level so the list keeps its state when coming back from a species page
const tab = signal<Group>((localStorage.getItem('tab') as Group) || 'bird');
const q = signal('');
const filter = signal<'all' | 'seen' | 'unseen'>('all');

export function ListView() {
  const [adding, setAdding] = useState<string | null>(null);
  const seen = seenCount.value;
  const list = species.value.filter((s) => s.group === tab.value && matches(s, q.value) && (filter.value === 'all' || (filter.value === 'seen') === seen.has(s.id)));
  const t = totals.value[tab.value];

  return (
    <div>
      <div class="tabs">
        {(['bird', 'mammal'] as Group[]).map((g) => (
          <button class={tab.value === g ? 'on' : ''} onClick={() => { tab.value = g; localStorage.setItem('tab', g); }}>
            {g === 'bird' ? `Birds ${totals.value.bird.seen}/${totals.value.bird.total}` : `Mammals ${totals.value.mammal.seen}/${totals.value.mammal.total}`}
          </button>
        ))}
      </div>
      <input class="search" type="search" placeholder="search (English, French, Latin, family)" value={q.value} onInput={(e) => (q.value = (e.target as HTMLInputElement).value)} />
      <div class="listhead">
        <div class="chips" style="margin-bottom:-6px">
          {(['all', 'seen', 'unseen'] as const).map((f) => (
            <button class={'chip' + (filter.value === f ? ' on' : '')} onClick={() => (filter.value = f)}>{f === 'all' ? 'all' : f === 'seen' ? `seen (${t.seen})` : `to see (${t.total - t.seen})`}</button>
          ))}
        </div>
        <span class="muted count">{list.length}</span>
      </div>
      <div class="list">
        {list.map((s) => {
          const n = seen.get(s.id) || 0;
          return (
            <div class={'sp-row' + (n ? ' seen' : '')} key={s.id}>
              <a href={href('species/' + s.id)} class="row" style="flex:1;min-width:0">
                <Thumb s={s} />
                <div class="names">
                  <div class="fr">{name(s)}</div>
                  <div class="en">{name2(s)}{name2(s) ? ' · ' : ''}<i>{s.sci}</i> · {familyEn(s)}</div>
                </div>
                <span class={'badge' + (n ? '' : ' zero')}>{n || '–'}</span>
              </a>
              <button class="add" aria-label="Log an observation" onClick={() => setAdding(s.id)}>+</button>
            </div>
          );
        })}
        {list.length === 0 && <p class="muted center">No species.</p>}
      </div>
      {adding && <ObsForm speciesId={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}
