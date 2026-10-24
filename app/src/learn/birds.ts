// Migration and identification notes of the Pidwa birds. The data (birds.data.json) is researched species by species on the
// web (oiseaux.net, Birds of the World, Wikipedia, Kruger guides…), with the sources kept per species; the months come from
// the SABAP2 atlas reporting rates around Pidwa (data/scripts/17_bird_months.mjs). The status is the one at Pidwa, not the
// global one: AVONET's migration code says "sedentary" for many of our summer visitors.
// The data is ~0.5 MB, so it is its own chunk, loaded after start: badges and sections appear once it is in.
import { signal } from '@preact/signals';

export type Status =
  | 'resident'           // here all year
  | 'summer-palearctic'  // breeds in Europe or Asia, spends the austral summer here
  | 'summer-africa'      // intra-African migrant that breeds here in summer
  | 'winter'             // here in the dry season
  | 'nomad'              // follows the rains or the food, comes and goes
  | 'partial';           // some birds stay, more arrive in summer

export interface BirdInfo {
  id: string;
  status: Status;
  /** presence at Pidwa, January to December: 0 absent, 1 few (arriving, leaving, scarce), 2 present */
  months: number[];
  migration: string;
  size: string;
  keys: string[];
  /** look-alikes: English name (resolved against the checklist) and how to tell them apart */
  confuse: { sp: string; how: string }[];
  voice?: string;
  behaviour: string;
  memo: string;
  sources: string[];
  /** true when the months are the SABAP2 reporting rates, false when they are estimated from the texts */
  atlas?: boolean;
  /** how common around Pidwa: SABAP2 reporting rate of its 3 best months, 0..1; missing when the atlas has no usable data */
  common?: number;
  /** lives in or right by the water (ducks, herons, storks, Hamerkop, water kingfishers…), not just coming to drink;
   *  hand-picked from AVONET's wetland birds, for the "Water birds" filter of the ID guide */
  water?: boolean;
}

export type Rarity = 'very-common' | 'common' | 'uncommon' | 'scarce' | 'rare';
export const RARITY_LABEL: Record<Rarity, string> = { 'very-common': 'Very common', 'common': 'Common', 'uncommon': 'Uncommon', 'scarce': 'Scarce', 'rare': 'Rare' };
/** Level from the share of the atlas cards that list the bird in its best months. */
export const rarity = (b: BirdInfo): Rarity | null => b.common == null ? null
  : b.common >= 0.3 ? 'very-common' : b.common >= 0.1 ? 'common' : b.common >= 0.03 ? 'uncommon' : b.common >= 0.01 ? 'scarce' : 'rare';
export const fmtCommon = (c: number) => (c < 0.01 ? (c * 100).toFixed(1) : Math.round(c * 100)) + '%';

/** Bird order of the list and the ID guide, shared and remembered: as they come (A-Z), rarest or commonest first. */
export type BirdSort = 'az' | 'rare' | 'common';
export const SORT_LABEL: Record<BirdSort, string> = { az: 'A–Z', rare: 'Rarest', common: 'Commonest' };
export const NEXT_SORT: Record<BirdSort, BirdSort> = { az: 'rare', rare: 'common', common: 'az' };
export const birdSort = signal<BirdSort>((localStorage.getItem('sort') as BirdSort) || 'az');
/** Comparator by rarity for the current sort; birds without an atlas rate go last. Null for A-Z. */
export function rarityCompare(sort: BirdSort, info: Map<string, BirdInfo>) {
  if (sort === 'az') return null;
  const c = (id: string) => info.get(id)?.common ?? (sort === 'rare' ? Infinity : -Infinity);
  return (a: { id: string }, b: { id: string }) => (sort === 'rare' ? c(a.id) - c(b.id) : c(b.id) - c(a.id));
}

export const birdInfo = signal(new Map<string, BirdInfo>());
import('./birds.data.json').then((m) => { birdInfo.value = new Map((m.default as BirdInfo[]).map((b) => [b.id, b])); });

export const STATUS_LABEL: Record<Status, string> = {
  'resident': 'Resident',
  'summer-palearctic': 'Summer visitor from Eurasia',
  'summer-africa': 'Summer visitor from tropical Africa',
  'winter': 'Winter visitor',
  'nomad': 'Nomad',
  'partial': 'Partly migrant',
};

/** Badge of the list rows: "M" for the birds that all leave for part of the year, an outlined "M" when only part of the
 *  population leaves, nothing for residents and nomads. */
export const migKind = (b: BirdInfo): 'full' | 'partial' | null =>
  b.status === 'resident' || b.status === 'nomad' ? null : b.status === 'partial' ? 'partial' : 'full';

/** Whether the bird is around this month (any presence counts). */
export const hereNow = (b: BirdInfo, d = new Date()) => b.months[d.getMonth()] > 0;
