// The other animals, in one tab: reptiles other than snakes, spiders and scorpions, frogs, and insects by big families. The data
// (others.data.json) is written from the standard references (Branch, Alexander & Marais for the reptiles; Leeming,
// Dippenaar-Schoeman for scorpions and spiders) and has not been checked species by species yet. The list is drawn from the
// iNaturalist research-grade records within 60 km of camp, less the escarpment species; the level is our estimate.
import { signal } from '@preact/signals';
import type { Rarity } from './birds';
import type { Danger } from './snakes';

export type OtherCat = 'reptile' | 'arachnid' | 'frog' | 'insect';
export const CAT_LABEL: Record<OtherCat, string> = { reptile: 'Reptiles', arachnid: 'Spiders & scorpions', frog: 'Frogs', insect: 'Insects' };
export type Where = 'ground' | 'trees' | 'rocks' | 'water' | 'buildings' | 'underground';
export const WHERE_LABEL: Record<Where, string> = { ground: 'On the ground', trees: 'In trees and bushes', rocks: 'On rocks', water: 'In or by water', buildings: 'In buildings', underground: 'Underground, under logs' };

export interface OtherInfo {
  id: string;
  cat: OtherCat;
  level: Rarity;
  /** null when it does not apply (a tick: the risk is the disease it carries) */
  danger: Danger | null;
  venom: string | null;
  size: string;
  where: Where[];
  when: ('day' | 'night')[];
  keys: string[];
  /** frogs: what the call sounds like (no recordings) */
  voice?: string;
  confuse: { sp: string; how: string }[];
  behaviour: string;
  /** what a bite or sting does and what to do; null when there is nothing to say */
  bite: string | null;
  memo: string;
}

export const otherInfo = signal(new Map<string, OtherInfo>());
import('./others.data.json').then((m) => { otherInfo.value = new Map((m.default as OtherInfo[]).map((b) => [b.id, b])); });
