// Snakes of Pidwa: identification, danger and what to do after a bite. The data (snakes.data.json) is written from the
// standard references (Marais, "A Complete Guide to Snakes of Southern Africa", 2022; the African Snakebite Institute) and
// has not been checked species by species against them yet. The list is the iNaturalist research-grade records within 60 km
// of camp (data/scripts/18_inat_counts.mjs), less the escarpment and grassland species. The level is our estimate of how
// often you meet it here, starting from those counts.
// Loaded after start, like the bird data: the sections appear once it is in.
import { signal } from '@preact/signals';
import type { Rarity } from './birds';

/** deadly: can kill an adult; venomous: painful, needs hospital, not known to kill; mild: back-fanged, harmless to people */
export type Danger = 'deadly' | 'venomous' | 'mild' | 'harmless';

export interface SnakeInfo {
  id: string;
  level: Rarity;
  danger: Danger;
  venom: string | null;
  /** identification key (views/KeyGuideView.tsx): colour, pattern, typical adult length in cm, where and when it is met */
  col: ('green' | 'brown' | 'dark' | 'orange')[];
  pat: ('plain' | 'stripes' | 'bands' | 'blotches')[];
  len: number;
  where: ('ground' | 'trees' | 'water' | 'underground')[];
  when: ('day' | 'night')[];
  size: string;
  active: string;
  lives: string;
  keys: string[];
  confuse: { sp: string; how: string }[];
  behaviour: string;
  bite: string;
  memo: string;
}

export const DANGER_LABEL: Record<Danger, string> = {
  deadly: 'Potentially deadly',
  venomous: 'Venomous, not deadly',
  mild: 'Mildly venomous, harmless to people',
  harmless: 'Not venomous',
};
export const DANGER_TONE: Record<Danger, string> = { deadly: ' bad', venomous: ' warn', mild: '', harmless: ' ok' };

export const snakeInfo = signal(new Map<string, SnakeInfo>());
import('./snakes.data.json').then((m) => { snakeInfo.value = new Map((m.default as SnakeInfo[]).map((b) => [b.id, b])); });
