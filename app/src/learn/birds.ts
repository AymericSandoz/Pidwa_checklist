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
