// How common a species is around Pidwa, whatever its group: the SABAP2 atlas rate for birds, our estimated level for snakes,
// plants and the others. Shared by the list's rarity sort and the species page pills. Mammals have none.
import { birdInfo, rarity, rarityCompare, RARITY_LABEL, fmtCommon, type BirdSort, type Rarity } from './birds';
import { snakeInfo } from './snakes';
import { plantInfo } from './plants';
import { otherInfo } from './others';

// a rate inside each level's band of rarity(), so that a sort works the same as for the birds
const LEVEL_RATE: Record<Rarity, number> = { 'very-common': 0.5, 'common': 0.2, 'uncommon': 0.06, 'scarce': 0.02, 'rare': 0.005 };

export function abundance(id: string): { level: Rarity; rate: number; atlas: boolean } | null {
  const b = birdInfo.value.get(id);
  if (b) { const r = rarity(b); return r ? { level: r, rate: b.common!, atlas: true } : null; }
  const lv = snakeInfo.value.get(id)?.level || plantInfo.value.get(id)?.level || otherInfo.value.get(id)?.level;
  return lv ? { level: lv, rate: LEVEL_RATE[lv], atlas: false } : null;
}

/** Comparator for the current sort; species with no level go last. Null for A-Z. */
export function abundanceCompare(sort: BirdSort) {
  if (sort === 'az') return null;
  if (sort === 'hear') return rarityCompare(sort, birdInfo.value);
  const c = (id: string) => abundance(id)?.rate ?? (sort === 'rare' ? Infinity : -Infinity);
  return (a: { id: string }, b: { id: string }) => (sort === 'rare' ? c(a.id) - c(b.id) : c(b.id) - c(a.id));
}

/** "Rare, 0.4%" for a bird, "Uncommon" for an estimated level: shown in place of the family when sorted by rarity. */
export const abundanceText = (id: string) => {
  const a = abundance(id);
  return a ? RARITY_LABEL[a.level] + (a.atlas ? ', ' + fmtCommon(a.rate) : '') : null;
};
