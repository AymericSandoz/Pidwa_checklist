import { back, href } from '../router';
import { Icon } from '../components/Icon';
import { Tuft } from './VeldView';
import { INTRO, BRAKES, TIPPING, TIPPING_NOTE, CAUSES, EVERYWHERE, EVERYWHERE_NOTE, PIDWA, PARADOX_INTRO, RINGBARK, ELEPHANT_FACTS, PROTECT, OTHERS_INTRO, OTHERS, STAGES_WHO, OTHERS_NOTE, EFFECTS, CURES, SICKLE, TREES, SCALE, BUSH_SOURCES } from '../learn/bush';

/** Chapter "Bush encroachment": grass against trees, the fire trap, how a savanna tips, the causes, Pidwa, the elephant paradox, cures. */
export function BushView() {
  return (
    <div>
      <div class="subhead">
        <button class="bk" onClick={back} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button>
        <div><h2>Bush encroachment</h2><small>Too many bushes, too few big trees, and the argument over why</small></div>
      </div>

      <div class="card">
        <b>Grass against trees</b>
        <p class="muted" style="margin:6px 0 0;line-height:1.45">{INTRO}</p>
        <BeforeAfter />
      </div>

      <div class="sec">What holds the trees back</div>
      <div class="card tl">{BRAKES.map((b, i) => <div class="tle" style="grid-template-columns:22px 1fr"><b>{i + 1}</b><div><strong>{b.t}</strong><p>{b.d}</p></div></div>)}</div>
      <div class="card">
        <b>The fire trap</b>
        <span class="muted small" style="display:block;margin-top:2px">Same species, three ages. Only the one with its crown above the flames is safe.</span>
        <FireTrap />
      </div>

      <div class="sec">How a savanna tips over</div>
      <div class="card tl">
        {TIPPING.map((t, i) => <div class="tle" style="grid-template-columns:22px 1fr"><b>{i + 1}</b><p style="margin:0;color:var(--text)">{t}</p></div>)}
      </div>
      <a class="card" href={href('learn/veld')} style="display:block">
        <p class="muted" style="margin:0;line-height:1.45">{TIPPING_NOTE}</p>
        <span class="more" style="display:inline-flex;align-items:center;gap:2px">Reading the grass<Icon name="chevron-right" size={13} /></span>
      </a>

      <div class="sec">The argument over the causes</div>
      <div class="card tl">{CAUSES.map((c) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{c.t}</strong><p>{c.d}</p></div></div>)}</div>
      <div class="tiles">{EVERYWHERE.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{EVERYWHERE_NOTE}</p></div>

      <div class="sec">At Pidwa<span class="tag ok">Pidwa</span></div>
      <div class="card tl">{PIDWA.map((p) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{p.t}</strong><p>{p.d}</p></div></div>)}</div>

      <div class="sec">Too much bush, too few big trees</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{PARADOX_INTRO}</p></div>
      <div class="card">
        <b>What ring-barking does</b>
        <p class="muted" style="margin:6px 0 0;line-height:1.45">{RINGBARK}</p>
      </div>
      <div class="tiles">{ELEPHANT_FACTS.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>
      <div class="card tl">
        <div class="row" style="padding:6px 0 2px"><b>Protecting a big tree</b></div>
        {PROTECT.map((p) => <div class="tle" style="grid-template-columns:22px 1fr"><b style={p.ok ? '' : 'color:var(--danger)'}><Icon name={p.ok ? 'check' : 'x'} size={16} stroke={3} /></b><div><strong>{p.t}</strong><p>{p.d}</p></div></div>)}
      </div>

      <div class="sec">Who else but the elephant?</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{OTHERS_INTRO}</p></div>
      <div class="card tl">{OTHERS.map((o) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{o.t}</strong><p>{o.d}</p></div></div>)}</div>
      <div class="card" style="padding:6px 14px">
        <div class="row" style="padding:6px 0 2px"><b>Who acts at which age</b></div>
        {STAGES_WHO.map((s) => <div class="cty" style="grid-template-columns:120px 1fr;align-items:start"><b style="font-size:13px">{s.t}</b><span style="font-size:13px;line-height:1.35">{s.d}</span></div>)}
        <p class="muted small" style="margin:8px 0 6px;line-height:1.4">{OTHERS_NOTE}</p>
      </div>

      <div class="sec">What thick bush changes</div>
      <div class="card tl">{EFFECTS.map((e) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{e.t}</strong><p>{e.d}</p></div></div>)}</div>

      <div class="sec">What can be done</div>
      <div class="card tl">{CURES.map((c, i) => <div class="tle" style="grid-template-columns:22px 1fr"><b>{i + 1}</b><div><strong>{c.t}</strong><p>{c.d}</p></div></div>)}</div>
      <div class="card">
        <b>Why it keeps coming back: sickle bush</b>
        <p class="muted" style="margin:6px 0 0;line-height:1.45">{SICKLE}</p>
      </div>

      <div class="sec">How big</div>
      <div class="tiles">{SCALE.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>

      <div class="sec">Meanwhile, plant trees?</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{TREES}</p></div>

      <div class="card"><b>Where this comes from</b>
        <ul class="srcs">{BUSH_SOURCES.map((s) => <li>{s.url ? <a href={s.url} target="_blank" rel="noopener">{s.t}<Icon name="chevron-right" size={13} /></a> : s.t}</li>)}</ul>
      </div>
    </div>
  );
}

/* ---------- drawings ---------- */

function Tree({ x, G, h, r }: { x: number; G: number; h: number; r: number }) {
  return <g><line x1={x} y1={G} x2={x} y2={G - h} class="trunk" /><ellipse cx={x} cy={G - h} rx={r} ry={r * 0.42} class="crown" /></g>;
}

function Shrub({ x, G, r }: { x: number; G: number; r: number }) {
  return <g class="shrub"><circle cx={x - r * 0.55} cy={G - r * 0.6} r={r * 0.62} /><circle cx={x + r * 0.55} cy={G - r * 0.6} r={r * 0.62} /><circle cx={x} cy={G - r * 1.05} r={r * 0.7} /></g>;
}

/** The same piece of land, open and then encroached. */
function BeforeAfter() {
  const W = 360, G = 96, M = W / 2;
  return (
    <svg class="fence sward bushdraw" viewBox={`0 0 ${W} 124`} role="img" aria-label="Left: open savanna, a carpet of grass and two large trees. Right: the same land as a thicket of shrubs with bare soil and one large tree">
      <line x1={0} x2={W} y1={G} y2={G} class="ground" />
      <line x1={M} x2={M} y1={10} y2={G + 22} class="tick" />
      {[12, 30, 62, 80, 98, 132, 150, 166].map((x, i) => <Tuft x={x} G={G} h={i % 2 ? 17 : 21} kind="soft" cls="gr-d" />)}
      <Tree x={46} G={G} h={62} r={30} />
      <Tree x={116} G={G} h={50} r={24} />
      {[M + 14, M + 38, M + 60, M + 84, M + 126, M + 148, M + 168].map((x, i) => <Shrub x={x} G={G} r={i % 2 ? 11 : 13} />)}
      <Tree x={M + 106} G={G} h={62} r={28} />
      {[M + 26, M + 72, M + 138].map((x) => <circle cx={x} cy={G + 5} r={1.2} class="grit" />)}
      <text x={M / 2} y={G + 20} text-anchor="middle" class="lbl">Open savanna</text>
      <text x={M + M / 2} y={G + 20} text-anchor="middle" class="lbl">Encroached</text>
    </svg>
  );
}

/** Three plants against the height of the flames: burnt back, still trapped, escaped. */
function FireTrap() {
  const W = 360, G = 118, F = 44; // ground line, flame height in px
  return (
    <svg class="fence sward bushdraw" viewBox={`0 0 ${W} 160`} role="img" aria-label="A band of flames above the ground. A resprouting stump and a sapling stay inside it and are burnt back at each fire; a taller tree has its crown above the flames and survives">
      <rect x={0} y={G - F} width={W} height={F} class="flame" />
      <line x1={0} x2={W} y1={G - F} y2={G - F} class="flameline" />
      <text x={4} y={G - F - 5} class="ax">height of the flames</text>
      <line x1={0} x2={W} y1={G} y2={G} class="ground" />
      {/* burnt back: dead stem, new shoots from the base */}
      <line x1={58} y1={G} x2={58} y2={G - 30} class="trunk dead" />
      {[-9, -3, 4, 10].map((dx) => <line x1={60} y1={G} x2={60 + dx} y2={G - 13 - Math.abs(dx) / 3} class="shoot" />)}
      {/* sapling still under the flames */}
      <Tree x={176} G={G} h={30} r={13} />
      {/* escaped */}
      <Tree x={292} G={G} h={86} r={34} />
      <text x={60} y={G + 16} text-anchor="middle" class="lbl">Burnt back</text>
      <text x={60} y={G + 29} text-anchor="middle" class="ax">resprouts from the base</text>
      <text x={176} y={G + 16} text-anchor="middle" class="lbl">Trapped</text>
      <text x={176} y={G + 29} text-anchor="middle" class="ax">next fire takes it down</text>
      <text x={292} y={G + 16} text-anchor="middle" class="lbl">Escaped</text>
      <text x={292} y={G + 29} text-anchor="middle" class="ax">crown above the flames</text>
    </svg>
  );
}
