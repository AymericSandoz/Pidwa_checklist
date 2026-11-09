// How common a species is around Pidwa, whatever its group: the SABAP2 atlas rate for birds, our estimated level for snakes,
// plants and the others. Shared by the list's rarity sort and the species page pills. Mammals have none.
import { birdInfo, rarity, rarityCompare, hearText, commonRate, RARITY_LABEL, fmtCommon, type BirdSort, type Rarity } from './birds';
import { snakeInfo } from './snakes';
import { plantInfo } from './plants';
import { otherInfo } from './others';
import { taxCompare } from '../taxa';
import { fmtMass, fmtLen } from '../util';
import type { Species } from '../types';

// a rate inside each level's band of rarity(), so that a sort works the same as for the birds
const LEVEL_RATE: Record<Rarity, number> = { 'very-common': 0.5, 'common': 0.2, 'uncommon': 0.06, 'scarce': 0.02, 'rare': 0.005 };

export function abundance(id: string): { level: Rarity; rate: number; atlas: boolean } | null {
  const b = birdInfo.value.get(id);
  if (b) { const r = rarity(b); return r ? { level: r, rate: b.common!, atlas: true } : { level: 'very-common', rate: commonRate(b), atlas: false }; }
  const lv = snakeInfo.value.get(id)?.level || plantInfo.value.get(id)?.level || otherInfo.value.get(id)?.level;
  return lv ? { level: lv, rate: LEVEL_RATE[lv], atlas: false } : null;
}

/** Size used by the size sort: grams for birds and mammals, centimetres for snakes and the others (the first length
 *  of their size note: body, or wingspan for butterflies and dragonflies). */
export function sizeOf(s: Species): { v: number; unit: 'g' | 'cm' } | null {
  const g = s.avonet?.mass ?? s.mass;
  if (g != null) return { v: g, unit: 'g' };
  const len = snakeInfo.value.get(s.id)?.len ?? lenOf(otherInfo.value.get(s.id)?.size);
  return len != null ? { v: len, unit: 'cm' } : null;
}
const UNIT_CM = { mm: 0.1, cm: 1, m: 100 };
/** "Usually 2.5–4 m, big males to 5 m" -> 400: the top of the first range, in cm. */
function lenOf(t: string | undefined) {
  const m = t?.match(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*(mm|cm|m)\b/);
  return m ? +(m[2] ?? m[1]) * UNIT_CM[m[3] as keyof typeof UNIT_CM] : null;
}

/** Comparator for the current sort; species with no level (or no size) go last. Null for A-Z.
 *  "By family" follows the field-guide sequence, then the scientific name, which keeps each genus together. */
export function abundanceCompare(sort: BirdSort): ((a: Species, b: Species) => number) | null {
  if (sort === 'az') return null;
  if (sort === 'hear') return rarityCompare(sort, birdInfo.value);
  if (sort === 'tax') return taxCompare;
  if (sort === 'heavy' || sort === 'light') {
    const m = (s: Species) => sizeOf(s)?.v ?? (sort === 'light' ? 1e12 : -1);
    return sort === 'light' ? (a, b) => m(a) - m(b) || a.sci.localeCompare(b.sci) : (a, b) => m(b) - m(a) || a.sci.localeCompare(b.sci);
  }
  const c = (id: string) => abundance(id)?.rate ?? (sort === 'rare' ? Infinity : -Infinity);
  return (a, b) => (sort === 'rare' ? c(a.id) - c(b.id) : c(b.id) - c(a.id));
}

/** What a row shows in place of the family for the current sort: the level, the weight or length, how often heard. Null
 *  when the family itself is the point (A-Z, by family). */
export function sortText(s: Species, sort: BirdSort): string | null {
  if (sort === 'az' || sort === 'tax') return null;
  if (sort === 'heavy' || sort === 'light') { const z = sizeOf(s); return z ? (z.unit === 'g' ? fmtMass(z.v) : fmtLen(z.v)) : null; }
  if (sort === 'hear') { const b = birdInfo.value.get(s.id); return b ? hearText(b) : null; }
  return abundanceText(s.id);
}

/** "Rare, 0.4%" for a bird, "Uncommon" for an estimated level: shown in place of the family when sorted by rarity. */
export const abundanceText = (id: string) => {
  const a = abundance(id);
  return a ? RARITY_LABEL[a.level] + (a.atlas ? ', ' + fmtCommon(a.rate) : '') : null;
};
