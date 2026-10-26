// Plants of Pidwa, trees first: how to recognise them, when they flower and fruit, who eats them. The data (plants.data.json) is written
// from the standard tree guides of the lowveld (Van Wyk & Van Wyk, Schmidt et al.) and has not been checked species by
// species against them yet. The level is our estimate of how common it is around camp; the iNaturalist records within
// 25 km (data/scripts/18_inat_counts.mjs) are too few to rank trees on their own. Months are for the lowveld and shift
// with the rains. sanum is the number of the South African national list of indigenous trees, the one on the plates.
import { signal } from '@preact/signals';
import type { Rarity } from './birds';

export type PlantKind = 'tree' | 'shrub' | 'succulent' | 'grass' | 'herb';
export const KIND_LABEL: Record<PlantKind, string> = { tree: 'Tree', shrub: 'Shrub', succulent: 'Succulent', grass: 'Grass', herb: 'Wildflower' };

export type Leaf = 'blade' | 'simple' | 'pinnate' | 'bipinnate' | 'trifoliate' | 'twin' | 'palmate' | 'none';

export interface PlantInfo {
  id: string;
  kind: PlantKind;
  level: Rarity;
  /** colour of the flowers, for the identification key; none for grasses and figs */
  fcol?: ('white' | 'yellow' | 'red' | 'pink' | 'green')[];
  sanum: number | null;
  leaf: Leaf;
  spines: boolean;
  size: string;
  keys: string[];
  /** January to December, one digit a month: 0 none, 1 some, 2 peak; empty when the flowers are hidden (figs) */
  flowers: string;
  fruit: string;
  /** grasses: value for grazing, and how the grass reacts to grazing (the veld condition classes of the South African
   *  rangeland guides): decreasers thin out when overgrazed, increaser I grow where there is too little grazing or fire,
   *  increaser II spread where there is too much */
  graze?: 'high' | 'average' | 'low';
  veld?: 'decreaser' | 'increaser-1' | 'increaser-2' | null;
  animals: string;
  uses: string;
  confuse: { sp: string; how: string }[];
  memo: string;
}

export const LEAF_LABEL: Record<Leaf, string> = {
  blade: 'Grass blades',
  simple: 'Simple leaves',
  pinnate: 'Compound leaves (leaflets in a row)',
  bipinnate: 'Twice-compound, feathery leaves',
  trifoliate: 'Leaves of three leaflets',
  twin: 'Leaves of two leaflets',
  palmate: 'Hand-shaped leaves',
  none: 'No real leaves (succulent)',
};

export const GRAZE_LABEL = { high: 'High grazing value', average: 'Average grazing value', low: 'Low grazing value' };
export const VELD_LABEL = {
  'decreaser': 'Decreaser: thins out when overgrazed, a sign of veld in good condition',
  'increaser-1': 'Increaser I: spreads where grazing and fire are too few',
  'increaser-2': 'Increaser II: spreads where the veld is overgrazed or trampled',
};

export const plantInfo = signal(new Map<string, PlantInfo>());
import('./plants.data.json').then((m) => { plantInfo.value = new Map((m.default as PlantInfo[]).map((b) => [b.id, b])); });
