import { familyEn, orderEn, orderName } from '../taxa';
import type { Species } from '../types';

/** Headers of a list sorted by family: the order (English name, Latin) when it changes, then the family, each with its
 *  number of species in the list. The Latin name is left out when there is no English one. */
export function TaxHeads({ list, i }: { list: Species[]; i: number }) {
  const s = list[i], p = list[i - 1];
  const newOrder = !p || p.order !== s.order;
  const newFam = newOrder || p.family !== s.family;
  if (!newFam) return null;
  const n = (k: 'order' | 'family') => list.filter((x) => x[k] === s[k]).length;
  const oEn = orderEn(s.order), fEn = familyEn(s);
  return (
    <>
      {newOrder && s.order && <div class="sec listsec taxo">{oEn || orderName(s.order)}{oEn && <i>{orderName(s.order)}</i>}<span class="n">{n('order')}</span></div>}
      <div class="taxf">{fEn || 'Family unknown'}{fEn && fEn !== s.family && <i>{s.family}</i>}<span>{n('family')}</span></div>
    </>
  );
}
