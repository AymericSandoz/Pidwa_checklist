// The Tree guide: the family tree of the Pidwa mammals (birds next) as one circular drawing, zoomed with two fingers or
// the wheel and moved by dragging, like a map. A tap on a group (a branching point, a family or order band) shows what
// it is and what its members share, in a panel over the bottom of the screen; a tap on a species shows it, with a link
// to its page.
import { signal } from '@preact/signals';
import { useMemo, useRef, useState } from 'preact/hooks';
import { species, seenCount, name } from '../data';
import { href } from '../router';
import { GuideSwitch } from './IdGuideView';
import { Thumb } from '../components/Thumb';
import { Icon } from '../components/Icon';
import { MAMMAL_TREE, MAMMAL_TREE_SOURCES } from '../learn/tree.mammals';
import { layout, pt, arc, band, textArc, branchPath, type PNode } from '../learn/tree';
import type { Species } from '../types';

const RANK_LABEL = { clade: 'Group', order: 'Order', family: 'Family', subfamily: 'Subfamily', tribe: 'Tribe' };
// one hue per order, around the colour wheel; families alternate two shades of it
const HUES = [28, 200, 120, 330, 48, 250, 160, 0, 280, 90, 215, 300, 60, 180];

const selected = signal<number | null>(null);
const view = signal({ k: 1, x: 0, y: 0 });

export function TreeView() {
  const L = useMemo(() => layout(MAMMAL_TREE), []);
  const bySci = useMemo(() => new Map(species.value.map((s) => [s.sci, s])), [species.value]);
  const seen = seenCount.value;
  const S = L.ordR + 30; // half size of the drawing
  const orders = L.nodes.filter((n) => n.node?.rank === 'order');
  const hue = new Map(orders.map((o, i) => [o, HUES[i % HUES.length]]));
  const sel = selected.value != null ? L.nodes[selected.value] : null;
  // the selected group and everything below it stay bright, the rest fades
  const inSel = (n: PNode) => { for (let p: PNode | null = n; p; p = p.parent) if (p === sel) return true; return false; };

  // ---- zoom and pan -------------------------------------------------------------------------------------
  const svg = useRef<SVGSVGElement>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; x: number; y: number; dist: number } | null>(null);
  const toSvg = (cx: number, cy: number) => {
    const b = svg.current!.getBoundingClientRect();
    return { x: ((cx - b.left) / b.width) * 2 * S - S, y: ((cy - b.top) / b.height) * 2 * S - S };
  };
  /** zoom by f around the screen point (cx, cy) */
  const zoomAt = (f: number, cx: number, cy: number) => {
    const v = view.value, k = Math.min(14, Math.max(1, v.k * f)), g = toSvg(cx, cy);
    const r = k / v.k;
    view.value = clamp({ k, x: g.x - (g.x - v.x) * r, y: g.y - (g.y - v.y) * r });
  };
  const clamp = (v: { k: number; x: number; y: number }) => {
    const m = S * (v.k - 0.4); // keep part of the tree on screen
    return { k: v.k, x: Math.max(-m, Math.min(m, v.x)), y: Math.max(-m, Math.min(m, v.y)) };
  };
  const centroid = () => { const p = [...ptrs.current.values()]; return { x: p.reduce((a, q) => a + q.x, 0) / p.length, y: p.reduce((a, q) => a + q.y, 0) / p.length }; };
  const spread = () => { const p = [...ptrs.current.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };

  const onDown = (e: PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const c = centroid();
    gesture.current = { moved: ptrs.current.size > 1 || !!gesture.current?.moved, x: c.x, y: c.y, dist: spread() };
  };
  const onMove = (e: PointerEvent) => {
    if (!ptrs.current.has(e.pointerId) || !gesture.current) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current, c = centroid(), d = spread();
    if (Math.hypot(c.x - g.x, c.y - g.y) > 6 || (d && g.dist && Math.abs(d - g.dist) > 6)) g.moved = true;
    if (!g.moved) return;
    const b = svg.current!.getBoundingClientRect(), u = (2 * S) / b.width;
    const v = view.value;
    view.value = clamp({ k: v.k, x: v.x + (c.x - g.x) * u, y: v.y + (c.y - g.y) * u });
    if (d && g.dist) zoomAt(d / g.dist, c.x, c.y);
    g.x = c.x; g.y = c.y; g.dist = d;
  };
  const onUp = (e: PointerEvent) => {
    const g = gesture.current;
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size) { const c = centroid(); if (g) { g.x = c.x; g.y = c.y; g.dist = spread(); } return; }
    gesture.current = null;
    if (g && !g.moved) {
      // a tap: the group or species under the finger, or nothing (clears the selection)
      const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-n]');
      selected.value = t ? +t.getAttribute('data-n')! : null;
    }
  };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY / 300), e.clientX, e.clientY); };
  const zoomBtn = (f: number) => { const b = svg.current!.getBoundingClientRect(); zoomAt(f, b.left + b.width / 2, b.top + b.height / 2); };

  // ---- drawing --------------------------------------------------------------------------------------------
  const v = view.value;
  const fade = (n: PNode) => (sel && !inSel(n) ? ' fade' : '');
  const deg = (a: number) => (a * 180) / Math.PI;

  return (
    <div class="treeg">
      <GuideSwitch />
      <div class="treehead">
        <b>Mammals</b><span class="muted">· {L.root.leaves.length} species · tap a group</span>
      </div>
      <div class="treebox">
        <svg ref={svg} viewBox={`${-S} ${-S} ${2 * S} ${2 * S}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onWheel={onWheel} role="img" aria-label="Family tree of the mammals">
          <g transform={`translate(${v.x} ${v.y}) scale(${v.k})`}>
            {/* order and family bands */}
            {L.nodes.filter((n) => n.node?.rank === 'order' || n.node?.rank === 'family').map((n) => {
              const o = n.node!.rank === 'order';
              const h = hue.get(n.order!) ?? 0;
              const fi = o ? 0 : L.nodes.filter((m) => m.node?.rank === 'family' && m.order === n.order).indexOf(n);
              const r0 = o ? L.ordR : L.famR, r1 = o ? L.ordR + 20 : L.famR + 14;
              const a0 = n.a0 - L.step * 0.45, a1 = n.a1 + L.step * 0.45;
              const label = n.node!.en;
              const fs = o ? 10.5 : 7.5;
              const fits = label.length * fs * 0.56 < (a1 - a0) * (r0 + r1) / 2 - 4;
              const id = 'tp' + n.i;
              return (
                <g class={'band' + fade(n) + (sel === n ? ' on' : '')} data-n={n.i}>
                  <path d={band(r0, r1, a0, a1)} style={{ fill: `hsl(${h} ${o ? 45 : 40}% ${o ? 42 : fi % 2 ? 72 : 80}%)` }} />
                  {fits && <path id={id} d={textArc((r0 + r1) / 2 - fs * 0.35, a0, a1)} fill="none" stroke="none" />}
                  {fits && <text class={o ? 'ordt' : 'famt'} style={{ fontSize: fs + 'px' }}><textPath href={'#' + id} startOffset="50%" text-anchor="middle">{label}</textPath></text>}
                </g>
              );
            })}
            {/* branches */}
            <path class={'branches' + (sel ? ' fade' : '')} d={L.nodes.filter((n) => !sel || !inSel(n)).map(branchPath).join('')} />
            {sel && <path class="branches on" d={L.nodes.filter(inSel).map(branchPath).join('')} />}
            {/* species: a dot, then the name, turned along its spoke and flipped on the left half to read left to right */}
            {L.nodes.filter((n) => n.sci).map((n) => {
              const s = bySci.get(n.sci!);
              const left = n.a > Math.PI;
              const [x, y] = pt(n.a, n.r + 5);
              return (
                <g class={'leaf' + fade(n) + (s && seen.has(s.id) ? ' seen' : '') + (sel === n ? ' on' : '')} data-n={n.i}>
                  <circle cx={pt(n.a, n.r)[0]} cy={pt(n.a, n.r)[1]} r="2.6" />
                  <text x={x} y={y} transform={`rotate(${deg(n.a) - 90 + (left ? 180 : 0)} ${x} ${y})`} text-anchor={left ? 'end' : 'start'} dominant-baseline="central">{s ? name(s) : n.sci}</text>
                  <path d={band(n.r - 4, n.r + 100, n.a - L.step / 2, n.a + L.step / 2)} class="hit" />
                </g>
              );
            })}
            {/* named groups: a dot to tap, the name beside it */}
            {L.nodes.filter((n) => n.node && n.node.rank !== 'order' && n.node.rank !== 'family').map((n) => {
              const [x, y] = pt(n.a, n.r);
              const big = n.node!.rank === 'clade';
              // labels alternately above and below, so that a group and the next one inside don't overlap
              let depth = 0; for (let p = n.parent; p; p = p.parent) depth++;
              const dy = depth % 2 ? 11 : -7;
              return (
                <g class={'node' + fade(n) + (sel === n ? ' on' : '') + (big ? ' big' : '')} data-n={n.i}>
                  <circle cx={x} cy={y} r={big ? 4.5 : 3.2} />
                  <circle cx={x} cy={y} r="11" class="hit" />
                  {big && <text x={x} y={y + dy} text-anchor="middle">{n.node!.en}</text>}
                </g>
              );
            })}
          </g>
        </svg>
        <div class="treezoom">
          <button aria-label="Zoom in" onClick={() => zoomBtn(1.6)}><Icon name="plus" size={18} /></button>
          <button aria-label="Zoom out" onClick={() => zoomBtn(1 / 1.6)}><span class="minus" /></button>
          <button aria-label="Whole tree" onClick={() => { view.value = { k: 1, x: 0, y: 0 }; }}><Icon name="locate-fixed" size={17} /></button>
        </div>
      </div>
      <p class="credit">
        Who is closest to whom, not how long ago: all species sit on the rim. Shape after Upham et al. 2019; ages from TimeTree, rounded, and they differ by
        several million years between studies. Sources: {MAMMAL_TREE_SOURCES.join(' · ')}.
      </p>
      {sel && <TreePanel n={sel} bySci={bySci} />}
    </div>
  );
}

/** What the tapped group is, its age, what its members share, and its species; or the tapped species. */
function TreePanel({ n, bySci }: { n: PNode; bySci: Map<string, Species> }) {
  const [open, setOpen] = useState(true);
  const path: PNode[] = [];
  for (let p = n.parent; p; p = p.parent) if (p.node) path.unshift(p);
  const close = () => { selected.value = null; };
  if (n.sci) {
    const s = bySci.get(n.sci);
    return (
      <div class="treepanel">
        <button class="x" aria-label="Close" onClick={close}><Icon name="x" size={18} /></button>
        <Crumbs path={path} />
        {s && (
          <a class="row treesp" href={href('species/' + s.id)}>
            <Thumb s={s} />
            <div><b>{name(s)}</b><div class="muted"><i>{s.sci}</i></div></div>
            <Icon name="chevron-right" size={18} />
          </a>
        )}
      </div>
    );
  }
  const t = n.node!;
  // a single-family order keeps its text on the order: show it for the family too
  const text = t.text || (n.parent?.kids.length === 1 ? n.parent.node?.text : '') || '';
  const sp = n.leaves.map((x) => bySci.get(x)).filter(Boolean) as Species[];
  return (
    <div class={'treepanel' + (open ? '' : ' shut')}>
      <button class="x" aria-label="Close" onClick={close}><Icon name="x" size={18} /></button>
      <Crumbs path={path} />
      <h3 onClick={() => setOpen(!open)}>{t.en} <i>{t.name}</i></h3>
      <div class="meta">
        <span class="pill">{RANK_LABEL[t.rank]}</span>
        <span class="pill">{sp.length} species here</span>
        {t.ma != null && <span class="pill" title="When its branches split, rounded (TimeTree)">split ~{t.ma} million years ago</span>}
      </div>
      {text && <p>{text}</p>}
      <div class="treethumbs">
        {sp.map((s) => <a href={href('species/' + s.id)} title={name(s)}><Thumb s={s} /><span>{name(s)}</span></a>)}
      </div>
    </div>
  );
}

function Crumbs({ path }: { path: PNode[] }) {
  if (!path.length) return null;
  return (
    <div class="crumbs">
      {path.map((p, i) => <>{i > 0 && <span>›</span>}<button onClick={() => (selected.value = p.i)}>{p.node!.en}</button></>)}
    </div>
  );
}
