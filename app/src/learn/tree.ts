// Layout of the circular family trees of the Tree guide (tree.mammals.ts for the data). Species sit on a circle, evenly
// spaced, with a little extra room between orders; each branching point sits closer to the centre the more levels it has
// below it (on a compressed scale), so all the species line up on the rim (a cladogram: branch lengths are not times). Outside the names, two
// rings: the families, then the orders.

export interface TaxNode {
  name: string;
  en: string;
  rank: 'clade' | 'order' | 'family' | 'subfamily' | 'tribe';
  /** age of the split at this node, millions of years, rounded; null when not shown */
  ma: number | null;
  text: string;
  /** child groups, or scientific names of the checklist species */
  kids: (TaxNode | string)[];
}

export interface PNode {
  i: number;
  node: TaxNode | null;        // null for a species
  sci: string | null;
  parent: PNode | null;
  kids: PNode[];
  /** angle (radians, 0 = up, clockwise) and radius */
  a: number;
  r: number;
  /** first and last species angle below it */
  a0: number;
  a1: number;
  leaves: string[];
  order: PNode | null;         // the order it belongs to (itself for an order)
}

export interface Layout { nodes: PNode[]; root: PNode; leafR: number; famR: number; ordR: number; step: number }

export const LEAF_R = 300;   // radius of the species tips
export const LABEL_W = 104;  // room left for the species names
const GAP_ORDER = 1.6;       // extra space between orders, in species widths
const OPEN = 0.07;           // the circle is left open at the top by this share, for the start and end to read apart

export function layout(tree: TaxNode): Layout {
  const nodes: PNode[] = [];
  const mk = (node: TaxNode | null, sci: string | null, parent: PNode | null): PNode => {
    const p: PNode = { i: nodes.length, node, sci, parent, kids: [], a: 0, r: 0, a0: 0, a1: 0, leaves: [], order: null };
    nodes.push(p);
    p.order = node?.rank === 'order' ? p : parent?.order ?? null;
    if (node) p.kids = node.kids.map((k) => (typeof k === 'string' ? mk(null, k, p) : mk(k, null, p)));
    return p;
  };
  const root = mk(tree, null, null);

  // slots along the rim: one per species, plus gaps when the order changes
  const leaves = nodes.filter((n) => n.sci);
  let slots = 0;
  const slot = new Map<PNode, number>();
  leaves.forEach((l, k) => { if (k > 0 && l.order !== leaves[k - 1].order) slots += GAP_ORDER; slot.set(l, slots); slots += 1; });
  const span = (2 * Math.PI) * (1 - OPEN);
  const step = span / slots;
  const start = Math.PI * OPEN + step / 2;

  const height = (n: PNode): number => (n.kids.length ? 1 + Math.max(...n.kids.map(height)) : 0);
  const H = height(root);
  const place = (n: PNode) => {
    n.kids.forEach(place);
    if (n.sci) { n.a = n.a0 = n.a1 = start + slot.get(n)! * step; n.r = LEAF_R; n.leaves = [n.sci]; return; }
    n.a0 = n.kids[0].a0; n.a1 = n.kids[n.kids.length - 1].a1;
    n.a = (n.kids[0].a + n.kids[n.kids.length - 1].a) / 2;
    // a power under 1 spreads the deep levels, crowded near the centre, and packs the last ones by the rim
    n.r = LEAF_R * 0.97 * Math.pow(1 - height(n) / H, 0.6);
    n.leaves = n.kids.flatMap((k) => k.leaves);
  };
  place(root);
  const famR = LEAF_R + LABEL_W;
  return { nodes, root, leafR: LEAF_R, famR, ordR: famR + 17, step };
}

/** Point at angle a (0 = up, clockwise) and radius r. */
export const pt = (a: number, r: number): [number, number] => [r * Math.sin(a), -r * Math.cos(a)];

/** SVG arc from a0 to a1 at radius r, clockwise. */
export function arc(r: number, a0: number, a1: number, move = true) {
  const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
  return `${move ? 'M' : 'L'}${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** A ring segment (for the family and order bands). */
export function band(r0: number, r1: number, a0: number, a1: number) {
  const [x, y] = pt(a1, r0);
  return arc(r1, a0, a1) + `L${x.toFixed(1)} ${y.toFixed(1)}` + `A${r0} ${r0} 0 ${a1 - a0 > Math.PI ? 1 : 0} 0 ${pt(a0, r0).map((v) => v.toFixed(1)).join(' ')}Z`;
}

/** Path for text along a ring, readable from outside: clockwise on the top half, anticlockwise on the bottom half. */
export function textArc(r: number, a0: number, a1: number) {
  const mid = (a0 + a1) / 2;
  const bottom = mid > Math.PI / 2 && mid < Math.PI * 1.5;
  if (!bottom) return arc(r, a0, a1);
  const [x1, y1] = pt(a1, r), [x0, y0] = pt(a0, r);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 0 ${x0.toFixed(1)} ${y0.toFixed(1)}`;
}

/** The branches: for each group an arc across its children at its radius, then a spoke out to each child. */
export function branchPath(n: PNode) {
  if (!n.kids.length) return '';
  let d = n.kids.length > 1 ? arc(n.r, n.kids[0].a, n.kids[n.kids.length - 1].a) : '';
  for (const k of n.kids) {
    const [x0, y0] = pt(k.a, n.r), [x1, y1] = pt(k.a, k.r);
    d += `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}
