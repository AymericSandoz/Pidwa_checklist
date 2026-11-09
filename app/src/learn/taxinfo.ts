// What each order, family and group is, for the "By family" headers of the lists: taken from the family trees of the
// Tree guide (mammals so far). A family whose order has only that family keeps the text on the order header.
import { MAMMAL_TREE } from './tree.mammals';
import type { TaxNode } from './tree';

export interface TaxInfo { en: string; text: string; ma: number | null; rank: TaxNode['rank'] }

const INFO = new Map<string, TaxInfo>();
const walk = (n: TaxNode) => {
  if (n.text) INFO.set(n.name, { en: n.en, text: n.text, ma: n.ma, rank: n.rank });
  for (const k of n.kids) if (typeof k !== 'string') walk(k);
};
walk(MAMMAL_TREE);

export const taxInfo = (name: string | null) => (name ? INFO.get(name) ?? null : null);
