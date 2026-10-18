import type { Spoor, Foot, Shape } from '../learn/tracks';

/* Footprint drawings. Everything is drawn in centimetres, toes pointing up, centred on the print, then scaled.
   The templates are deliberately schematic: a clean outline you can compare with the real thing, not a photo. */

const f1 = (n: number) => +n.toFixed(2);
const P = (...pts: (number | string)[]) => pts.map((p) => (typeof p === 'number' ? f1(p) : p)).join(' ');

/** Right half of a cloven hoof; the left half is its mirror. */
function hoofHalf(l: number, w: number, cleft: number, blunt: number): string {
  const g = cleft / 2, hw = (w - cleft) / 2, x1 = g + hw, b = blunt;
  const tipX = g + hw * (0.12 + 0.38 * b), tipY = -l / 2;   // tip near the cleft when pointed, mid-half when blunt
  return [
    P('M', g, l * 0.3),
    P('C', g, l * 0.5, g + hw * 0.45, l * 0.52, g + hw * 0.65, l * 0.5),                       // heel
    P('C', x1, l * 0.47, x1, l * 0.3, x1, l * 0.08),                                            // outer heel corner
    P('C', x1, -l * (0.2 + 0.12 * b), tipX + hw * 0.45 + (x1 - hw * 0.05 - tipX - hw * 0.45) * b, tipY + l * (0.12 - 0.03 * b), tipX, tipY), // outer edge: diagonal into a sharp tip, or round when blunt
    P('C', tipX - hw * (0.06 + 0.1 * b), tipY + l * 0.004, g, tipY + l * (0.05 + 0.15 * b), g, tipY + l * (0.1 + 0.2 * b)), // tip down onto the straight inner edge
    'Z',
  ].join(' ');
}

/** Main pad of a paw. cx,cy centre; pw,ph size; rear = 2 (dog, hyena) or 3 lobes (cat). */
function pad(cy: number, pw: number, ph: number, rear: 2 | 3, flatFront: boolean): string {
  const t = cy - ph / 2, b = cy + ph / 2, r = pw / 2;
  const front = flatFront
    ? P('M', -r * 0.55, t + ph * 0.06) + P('C', -r * 0.3, t - ph * 0.02, -r * 0.1, t, 0, t) + P('C', r * 0.1, t, r * 0.3, t - ph * 0.02, r * 0.55, t + ph * 0.06) + P('C', r * 0.85, t + ph * 0.14, r, t + ph * 0.4, r, cy + ph * 0.05)
    : P('M', 0, t) + P('C', r * 0.5, t, r, cy - ph * 0.2, r, cy + ph * 0.05);
  const lobes = rear === 2
    ? P('C', r, b - ph * 0.12, r * 0.75, b, r * 0.4, b) + P('Q', 0, b - ph * 0.14, -r * 0.4, b) + P('C', -r * 0.75, b, -r, b - ph * 0.12, -r, cy + ph * 0.05)
    : P('C', r, b - ph * 0.1, r * 0.85, b, r * 0.58, b) + P('Q', r * 0.34, b - ph * 0.1, r * 0.2, b) + P('Q', 0, b + ph * 0.02, -r * 0.2, b) + P('Q', -r * 0.34, b - ph * 0.1, -r * 0.58, b) + P('C', -r * 0.85, b, -r, b - ph * 0.1, -r, cy + ph * 0.05);
  const back = flatFront
    ? P('C', -r, t + ph * 0.4, -r * 0.85, t + ph * 0.14, -r * 0.55, t + ph * 0.06)
    : P('C', -r, cy - ph * 0.2, -r * 0.5, t, 0, t);
  return front + lobes + back + 'Z';
}

type Toe = { x: number; y: number; w: number; h: number; tilt: number };

function toes(shape: Exclude<Shape, 'cloven'>, l: number, w: number): Toe[] {
  // middle pair ahead of the outer pair; cats rounder and more spread, hyenas bunched forward
  const k = shape === 'cat' ? { tw: 0.24, th: 0.25, xo: 0.36, xi: 0.13, yo: -0.16, yi: -0.3, tilt: 22 }
    : shape === 'hyena' ? { tw: 0.22, th: 0.3, xo: 0.34, xi: 0.13, yo: -0.1, yi: -0.3, tilt: 14 }
    : { tw: 0.21, th: 0.3, xo: 0.35, xi: 0.13, yo: -0.07, yi: -0.3, tilt: 16 };
  return [
    { x: -w * k.xo, y: l * k.yo, w: w * k.tw, h: l * k.th, tilt: -k.tilt },
    { x: -w * k.xi, y: l * k.yi, w: w * k.tw, h: l * k.th, tilt: -k.tilt / 3 },
    { x: w * k.xi, y: l * k.yi, w: w * k.tw, h: l * k.th, tilt: k.tilt / 3 },
    { x: w * k.xo, y: l * k.yo, w: w * k.tw, h: l * k.th, tilt: k.tilt },
  ];
}

/** A print traced from the field-guide drawing (data/out/spoor/paths.json): two potrace paths in crop pixels, the dark
    layer and the light layer (shallow parts of the sole), the crop box of the ink, and the printed length in mm. */
export interface BookFoot { d: string; l?: string; k?: 'holes'; x: number; y: number; w: number; h: number; mm: number; mirror?: boolean }
export interface BookSpoor { front?: BookFoot; hind?: BookFoot }

/** Real size of a traced print in cm: the printed length, and the width from the drawing's proportions. */
export const bookDims = (b: BookFoot): Foot => ({ l: b.mm / 10, w: +((b.mm / 10) * (b.w / b.h)).toFixed(1) });

/** A traced print as an SVG group in cm units, toes up, centred on 0,0. Right feet are mirrored to show a left foot. */
function BookShape({ b }: { b: BookFoot }) {
  const s = b.mm / 10 / b.h;   // cm per crop pixel
  const p = (n: number) => +n.toPrecision(4);   // s is ~0.01: two decimals would round it by up to 50 %
  const t = `scale(${p(b.mirror ? -s : s)} ${p(s)}) translate(${f1(-b.x - b.w / 2)} ${f1(-b.y - b.h / 2)})`;
  return (
    <g class="foot book" transform={t}>
      <path d={b.d} fill-rule="evenodd" />
      {b.l && <path class={b.k === 'holes' ? 'hole' : 'lt'} d={b.l} fill-rule="evenodd" />}
    </g>
  );
}

/** One footprint as an SVG group in cm units, toes up, centred on 0,0. The traced drawing when we have it, else the template. */
export function FootShape({ e, foot, book }: { e: Spoor; foot: Foot; book?: BookFoot }) {
  if (book) return <BookShape b={book} />;
  const { l, w } = foot;
  if (e.shape === 'cloven') {
    const d = hoofHalf(l, w, e.cleft ?? 0.6, e.blunt ?? 0.4);
    return <g class="foot"><path d={d} /><path d={d} transform="scale(-1 1)" /></g>;
  }
  const ts = toes(e.shape, l, w);
  const padSpec = e.shape === 'cat' ? { cy: l * 0.2, pw: w * 0.76, ph: l * 0.52, rear: 3 as const, flat: true }
    : e.shape === 'hyena' ? { cy: l * 0.23, pw: w * 0.7, ph: l * 0.47, rear: 2 as const, flat: false }
    : { cy: l * 0.24, pw: w * 0.58, ph: l * 0.42, rear: 2 as const, flat: false };
  return (
    <g class="foot">
      <path d={pad(padSpec.cy, padSpec.pw, padSpec.ph, padSpec.rear, padSpec.flat)} />
      {ts.map((t) => (
        <g transform={`translate(${f1(t.x)} ${f1(t.y)}) rotate(${t.tilt})`}>
          <ellipse rx={f1(t.w / 2)} ry={f1(t.h / 2)} />
          {e.claws && <path class="claw" d={P('M', -t.w * 0.12, -t.h / 2 - l * 0.015, 'L', 0, -t.h / 2 - l * (e.shape === 'hyena' ? 0.07 : 0.1), 'L', t.w * 0.12, -t.h / 2 - l * 0.015, 'Z')} />}
        </g>
      ))}
    </g>
  );
}

/** Front and hind print side by side, with sizes and a 10 cm bar. The scale adapts to the species so the drawing fills the card. */
export function SpoorCard({ e, book }: { e: Spoor; book?: BookSpoor }) {
  const W = 340;
  // the traced drawing sets the size when we have it; a species with only one foot drawn (pangolin) shows that foot alone
  const feet: [string, Foot, BookFoot | undefined][] = ([['Front', 'front'], ['Hind', 'hind']] as const)
    .filter(([, k]) => !book || book[k] || !(book.front || book.hind))
    .map(([label, k]) => [label, book?.[k] ? bookDims(book[k]!) : e[k], book?.[k]]);
  const maxL = Math.max(...feet.map((f) => f[1].l));
  const sumW = feet.reduce((a, f) => a + f[1].w, 0), gap = 28, side = 20;
  // px per cm: fill the card, but never let an elephant's two feet overlap, nor a genet's vanish
  const S = Math.max(2.2, Math.min(22, 130 / maxL, (W - 2 * side - gap * (feet.length - 1)) / sumW));
  const top = 14, H = top + maxL * S + 72;
  const start = (W - sumW * S - gap * (feet.length - 1)) / 2;
  const cx = feet.map((_, i) => start + feet.slice(0, i).reduce((a, f) => a + f[1].w * S + gap, 0) + feet[i][1].w * S / 2);
  const bar = 10 * S;
  return (
    <svg class="spoor" viewBox={`0 0 ${W} ${f1(H)}`} role="img" aria-label={feet.map(([label, ft]) => `${label} ${ft.l} by ${ft.w} cm`).join(', ')}>
      {feet.map(([label, ft, b], i) => (
        <g>
          <g transform={`translate(${cx[i]} ${f1(top + (maxL * S) / 2)}) scale(${f1(S)})`}><FootShape e={e} foot={ft} book={b} /></g>
          <text x={cx[i]} y={top + maxL * S + 22} text-anchor="middle" class="lbl">{label}</text>
          <text x={cx[i]} y={top + maxL * S + 37} text-anchor="middle" class="dim">{ft.l} × {ft.w} cm</text>
        </g>
      ))}
      <g transform={`translate(${W / 2 - bar / 2} ${f1(H - 7)})`}>
        <line x1={0} x2={f1(bar)} y1={0} y2={0} class="bar" />
        <line x1={0} x2={0} y1={-4} y2={4} class="bar" />
        <line x1={f1(bar)} x2={f1(bar)} y1={-4} y2={4} class="bar" />
        <text x={f1(bar / 2)} y={-5} text-anchor="middle" class="dim">10 cm</text>
      </g>
    </svg>
  );
}

/** A single front print at a scale shared with its neighbours (comparison strip). */
export function SpoorMini({ e, S, h, book }: { e: Spoor; S: number; h: number; book?: BookFoot }) {
  const ft = book ? bookDims(book) : e.front;
  const w = Math.max(ft.w * S + 8, 40);
  return (
    <svg class="spoor mini" viewBox={`0 0 ${f1(w)} ${h}`} width={f1(w)} height={h} role="img" aria-label={`front print ${ft.l} by ${ft.w} cm`}>
      <g transform={`translate(${f1(w / 2)} ${h / 2}) scale(${f1(S)})`}><FootShape e={e} foot={ft} book={book} /></g>
    </svg>
  );
}

/** The front print when the book has one, else the hind (pangolin shows only the hind foot). */
export const bookFront = (b?: BookSpoor): BookFoot | undefined => b?.front || b?.hind;
