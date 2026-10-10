import { back } from '../router';
import { Icon } from '../components/Icon';
import { useState } from 'preact/hooks';
import { WHY, COSTS, SPEC, HOW, GLOSSARY, VICTIMS, WHY_THEY_DIE, FIXES, MONEY, DOWN, DEBATE, COUNTRIES, SCALE, FENCE_SOURCES } from '../learn/fences';

/** Chapter "Fences": short. A cross-section drawing, then why, what it costs wildlife, how it works, who dies, money, fences coming down. */
export function FencesView() {
  const [gloss, setGloss] = useState(false);
  return (
    <div>
      <div class="subhead">
        <button class="bk" onClick={back} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button>
        <div><h2>Fences</h2><small>Why the bush is full of wire, and who it hurts</small></div>
      </div>

      <div class="card">
        <b>A dangerous-game fence, seen from the side</b>
        <span class="muted small" style="display:block;margin-top:2px">An animal that touches a live wire and an earth wire, or the fence itself, closes the circuit and gets the pulse. The plain fence alone carries no current.</span>
        <FenceDrawing />
        <div class="lulegend" style="margin-top:4px">
          <span class="lul"><i style="background:var(--muted)" /><span>plain strands</span></span>
          <span class="lul"><i style="background:var(--amber)" /><span>live wires, 6 000 to 9 000 V</span></span>
          <span class="lul"><i style="background:var(--text);opacity:.6" /><span>earth wire, 10 cm from each live wire</span></span>
          <span class="lul"><i style="background:var(--danger)" /><span>trip wire at 10 to 20 cm</span></span>
        </div>
      </div>

      <div class="sec">Why fence at all</div>
      <div class="card tl">{WHY.map((w) => <div class="tle"><b><Icon name="check" size={16} stroke={3} /></b><div><strong>{w.t}</strong><p>{w.d}</p></div></div>)}</div>

      <div class="sec">What the wire costs wildlife</div>
      <div class="card tl">{COSTS.map((w) => <div class="tle"><b style="color:var(--danger)"><Icon name="x" size={16} stroke={3} /></b><div><strong>{w.t}</strong><p>{w.d}</p></div></div>)}</div>

      <div class="sec">How the shock works</div>
      <div class="card">
        <LoopDrawing />
        <div class="lulegend" style="margin-top:4px"><span class="lul"><i style="background:var(--amber)" /><span>loop closed: the pulse goes through</span></span><span class="lul"><i style="background:var(--muted)" /><span>no loop: nothing happens</span></span></div>
      </div>
      <div class="card tl">{HOW.map((h) => <div class="tle"><b><Icon name="zap" size={16} stroke={2.6} /></b><div><strong>{h.t}</strong><p>{h.d}</p></div></div>)}</div>

      <div class="sec">How it is built</div>
      <div class="card" style="padding:6px 14px">{SPEC.map((s) => <div class="cty" style="grid-template-columns:78px 1fr;align-items:start"><b style="font-size:12.5px;padding-top:1px">{s.k}</b><span style="font-size:13px;line-height:1.35">{s.v}</span></div>)}</div>
      <div class="card" onClick={() => setGloss(!gloss)} style="cursor:pointer">
        <div class="row" style="justify-content:space-between"><b>The kit, word by word</b><span class="more">{gloss ? 'Hide' : 'Show'}</span></div>
        {gloss && <div style="margin-top:6px">{GLOSSARY.map(([k, v]) => <div class="cty" style="grid-template-columns:1fr;gap:1px"><b style="font-size:13px">{k}</b><span class="muted" style="font-size:12.5px;line-height:1.35">{v}</span></div>)}</div>}
      </div>

      <div class="sec">Who dies on the wire</div>
      <div class="tiles">{VICTIMS.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>
      <div class="card">
        <b>Not built to kill, and yet</b>
        <p class="muted" style="margin:6px 0 0;line-height:1.45">{WHY_THEY_DIE}</p>
        <b style="display:block;margin-top:12px">What a careful reserve does</b>
        <ul class="fixes">{FIXES.map((f) => <li><Icon name="check" size={14} stroke={3} />{f}</li>)}</ul>
      </div>

      <div class="sec">Fence or no fence: the argument</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{DEBATE.intro}</p></div>
      <div class="card tl"><div class="row" style="padding:6px 0 2px"><b>For</b></div>{DEBATE.pro.map((d) => <div class="tle" style="grid-template-columns:22px 1fr"><b><Icon name="check" size={15} stroke={3} /></b><p style="margin:0;color:var(--text)">{d}</p></div>)}</div>
      <div class="card tl"><div class="row" style="padding:6px 0 2px"><b>Against</b></div>{DEBATE.con.map((d) => <div class="tle" style="grid-template-columns:22px 1fr"><b style="color:var(--danger)"><Icon name="x" size={15} stroke={3} /></b><p style="margin:0;color:var(--text)">{d}</p></div>)}</div>

      <div class="sec">South Africa and the others</div>
      <div class="card" style="padding:4px 14px">
        {COUNTRIES.map((c) => <div class="cty" style="grid-template-columns:1fr;gap:2px;padding:9px 0"><div class="row" style="justify-content:space-between"><b style="font-size:14px">{c.c}{c.pidwa && <span class="tag ok" style="margin-left:6px">Pidwa</span>}</b><span class="pill" style="padding:2px 8px">{c.v}</span></div><span class="muted" style="font-size:12.5px;line-height:1.4">{c.d}</span></div>)}
      </div>

      <div class="sec">How much wire</div>
      <div class="tiles">{SCALE.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>

      <div class="sec">What it costs in money</div>
      <div class="tiles">{MONEY.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>

      <div class="sec">Fences coming down</div>
      <div class="card tl">{DOWN.map((e) => <div class="tle"><b>{e.y}</b><div><p style="margin:0;color:var(--text)">{e.d}</p></div></div>)}</div>

      <div class="card"><b>Where the numbers come from</b>
        <ul class="srcs">{FENCE_SOURCES.map((s) => <li><a href={s.url} target="_blank" rel="noopener">{s.t}<Icon name="chevron-right" size={13} /></a></li>)}</ul>
      </div>
    </div>
  );
}

/** Cross-section of a 2.4 m electrified game fence. Heights to scale: 1 m = 60 px. */
function FenceDrawing() {
  const W = 360, G = 196, S = 60; // ground line, px per metre
  const y = (m: number) => G - m * S;
  const strands = [0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1.0, 1.2, 1.45, 1.7, 1.95, 2.2, 2.4];
  const posts = [{ x: 40, kind: 'strain' }, { x: 150, kind: 'pole' }, { x: 260, kind: 'y' }];
  const droppers = [95, 205];
  return (
    <svg class="fence" viewBox={`0 0 ${W} 216`} role="img" aria-label="Cross-section of a 2.4 m game fence with three live wires and a trip wire near the ground">
      <line x1={0} x2={W} y1={G} y2={G} class="ground" />
      {/* height marks */}
      {[0.5, 1, 1.5, 2].map((m) => <g><line x1={W - 46} x2={W - 40} y1={y(m)} y2={y(m)} class="tick" /><text x={W - 36} y={y(m) + 3.5} class="ax">{m} m</text></g>)}
      <text x={W - 36} y={y(2.4) + 3.5} class="ax b">2.4 m</text>
      <text x={W - 36} y={y(1.8) + 3.5} class="ax">1.8 m</text>
      <line x1={W - 46} x2={W - 40} y1={y(1.8)} y2={y(1.8)} class="tick" />
      {/* strands */}
      {strands.map((m) => <line x1={20} x2={W - 56} y1={y(m)} y2={y(m)} class="strand" />)}
      {/* posts */}
      {posts.map((p) => p.kind === 'strain' ? <g><rect x={p.x - 5} y={y(2.5)} width={10} height={2.5 * S + 14} rx={2} class="steel" /><line x1={p.x + 5} x2={p.x + 48} y1={y(2.2)} y2={G + 10} class="steel-line" /></g>
        : p.kind === 'pole' ? <rect x={p.x - 4} y={y(2.5)} width={8} height={2.5 * S + 14} rx={3} class="wood" />
        : <g><line x1={p.x} x2={p.x} y1={y(2.5)} y2={G + 12} class="ystd" /><line x1={p.x - 3} x2={p.x + 3} y1={y(2.5)} y2={y(2.5)} class="ystd" /></g>)}
      {droppers.map((x) => <line x1={x} x2={x} y1={y(2.4)} y2={y(0.1)} class="dropper" />)}
      {/* live wires on offset brackets */}
      {[2.45, 1.3].map((m) => <g><line x1={20} x2={W - 56} y1={y(m)} y2={y(m)} class="live" /><line x1={20} x2={W - 56} y1={y(m) + 7} y2={y(m) + 7} class="earth" />{posts.map((p) => <line x1={p.x} x2={p.x} y1={y(m) + 12} y2={y(m)} class="bracket" />)}</g>)}
      {/* trip wire: live, with its earth wire just above it on the same bracket */}
      <line x1={20} x2={W - 56} y1={y(0.17)} y2={y(0.17)} class="trip" />
      <line x1={20} x2={W - 56} y1={y(0.17) - 7} y2={y(0.17) - 7} class="earth" />
      {posts.map((p) => <line x1={p.x} x2={p.x + 14} y1={y(0.17) - 3} y2={y(0.17) - 3} class="bracket" />)}
      {/* labels */}
      <text x={W - 60} y={y(2.45) - 6} text-anchor="end" class="lbl live-t">live wire on brackets</text>
      <text x={W - 60} y={y(1.3) - 6} text-anchor="end" class="lbl live-t">live wire, 1.0 to 1.5 m</text>
      <text x={W - 60} y={y(0.17) - 12} text-anchor="end" class="lbl trip-t">trip wire</text>
      <text x={40} y={G + 13} text-anchor="middle" class="ax">strainer</text>
      <text x={150} y={G + 13} text-anchor="middle" class="ax">pole</text>
      <text x={260} y={G + 13} text-anchor="middle" class="ax">Y-standard</text>
      <text x={95} y={G + 13} text-anchor="middle" class="ax">dropper</text>
      <text x={205} y={G + 13} text-anchor="middle" class="ax">dropper</text>
    </svg>
  );
}

/** Three animals at the same fence: the antelope and the climbing monkey close the loop, the bird does not. */
function LoopDrawing() {
  const W = 360, H = 180, G = 126;
  return (
    <svg class="fence" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Current flows only when an animal links the live wire to the earth">
      <line x1={0} x2={W} y1={G} y2={G} class="ground" />
      {/* energiser and earth spike */}
      <rect x={8} y={G - 34} width={30} height={22} rx={4} class="steel" />
      <text x={23} y={G - 19} text-anchor="middle" class="ax" style="fill:var(--card);font-weight:800">8 kV</text>
      <line x1={16} x2={16} y1={G - 12} y2={G + 14} class="ystd" />
      <text x={22} y={G - 40} text-anchor="middle" class="ax">energiser</text><text x={40} y={G + 10} class="ax">earth spikes</text>
      {/* live wire from the energiser across the top */}
      <path d={`M30 ${G - 34} V40 H${W - 10}`} class="live" />
      <text x={W - 12} y={34} text-anchor="end" class="lbl live-t">live wire</text>
      {/* plain fence posts */}
      {[120, 230, 330].map((x) => <line x1={x} x2={x} y1={46} y2={G + 6} class="ystd" style="opacity:.35" />)}
      {/* antelope: touches wire and ground -> loop */}
      <ellipse cx={95} cy={92} rx={22} ry={11} class="steel" style="opacity:.25" />
      <line x1={110} x2={118} y1={86} y2={44} class="steel-line" />
      <line x1={84} x2={84} y1={102} y2={G} class="steel-line" /><line x1={104} x2={104} y1={102} y2={G} class="steel-line" />
      <path d={`M118 44 Q118 70 95 92 Q84 110 84 ${G}`} class="flow" />
      <text x={110} y={G + 26} text-anchor="middle" class="lbl live-t">antelope: nose on wire</text>
      <text x={110} y={G + 38} text-anchor="middle" class="ax">loop closed: shock</text>
      {/* bird: wire only -> no loop */}
      <ellipse cx={200} cy={32} rx={9} ry={6} class="steel" style="opacity:.25" />
      <line x1={197} x2={197} y1={37} y2={40} class="steel-line" /><line x1={203} x2={203} y1={37} y2={40} class="steel-line" />
      <text x={212} y={G + 26} text-anchor="middle" class="lbl">bird on the wire</text>
      <text x={212} y={G + 38} text-anchor="middle" class="ax">no loop: nothing</text>
      {/* monkey on the fence touching the wire -> loop through post */}
      <ellipse cx={318} cy={70} rx={9} ry={12} class="steel" style="opacity:.25" />
      <line x1={318} x2={326} y1={58} y2={42} class="steel-line" />
      <line x1={320} x2={330} y1={80} y2={100} class="steel-line" />
      <path d={`M326 42 Q320 60 318 70 Q330 90 330 100 L330 ${G}`} class="flow" />
      <text x={305} y={G + 26} text-anchor="middle" class="lbl live-t">monkey on the fence</text>
      <text x={300} y={G + 38} text-anchor="middle" class="ax">loop closed: shock</text>
    </svg>
  );
}
