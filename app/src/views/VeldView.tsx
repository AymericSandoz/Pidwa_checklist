import { useState } from 'preact/hooks';
import { byId, thumbUrl } from '../data';
import { back, href } from '../router';
import { Icon } from '../components/Icon';
import { INTRO, STAGES, CHOICE, GROUPS, TWO_STORIES, TWO_STORIES_END, FIELD_TIP, READING, READING_NOTE, DIETS, DIETS_NOTE, MOSAIC, HUMAN, TROLLOPE_WHO, TROLLOPE_HOW, TROLLOPE_THREE, SHEET, TROLLOPE_FIX, TROLLOPE_NOTE, KEY_GRASSES, KEY_NOTE, SWEET_SOUR, LIMITS, VELD_SOURCES, type Grp } from '../learn/veld';

const SHORT: Record<Grp, string> = { d: 'Decreaser', i1: 'Increaser I', i2: 'Increaser II', i3: 'Increaser III' };

/** Chapter "Reading the grass": succession, the four labels, Increaser I against III, who eats what, the mosaic, Trollope's Kruger method. */
export function VeldView() {
  const [keys, setKeys] = useState(false);
  return (
    <div>
      <div class="subhead">
        <button class="bk" onClick={back} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button>
        <div><h2>Reading the grass</h2><small>Decreasers, Increasers and what they say about a patch of veld</small></div>
      </div>

      <div class="card">
        <b>Labels on species, not on places</b>
        <p class="muted" style="margin:6px 0 0;line-height:1.45">{INTRO}</p>
      </div>

      <div class="sec">Bare soil never stays bare</div>
      <div class="card">
        <StagesDrawing />
      </div>
      <div class="card tl">{STAGES.map((s, i) => <div class="tle" style="grid-template-columns:22px 1fr"><b>{i + 1}</b><div><strong>{s.t}</strong><p>{s.d}</p></div></div>)}</div>

      <div class="sec">Animals choose</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{CHOICE}</p></div>

      <div class="sec">The four labels</div>
      <div class="card">
        <span class="muted small" style="display:block">What a patch looks like when each one leads. The name says what the species does when the veld is misused.</span>
        <SwardDrawing />
      </div>
      {GROUPS.map((g) => (
        <div class={'card grp gr-' + g.g}>
          <b>{g.name}</b><em>{g.when}</em>
          <p class="muted" style="margin:6px 0 0;line-height:1.45">{g.d}</p>
          <p class="look"><Icon name="eye" size={14} stroke={2.4} />{g.look}</p>
        </div>
      ))}

      <div class="sec">Increaser I or III: one patch, two stories</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">They look alike, tall hard tufts, so they are easy to mix up. Start from the same patch: mostly good grass, a few hard tufts.</p></div>
      {TWO_STORIES.map((s) => (
        <div class={'card grp gr-' + s.g}>
          <b>{s.t}</b>
          <p class="muted" style="margin:6px 0 0;line-height:1.45">{s.d}</p>
          <p class="why">{s.why} <span class="gtag">{SHORT[s.g]}</span></p>
        </div>
      ))}
      <div class="card">
        <p class="muted" style="margin:0;line-height:1.45">{TWO_STORIES_END}</p>
        <p class="look"><Icon name="eye" size={14} stroke={2.4} />{FIELD_TIP}</p>
      </div>

      <div class="sec">Reading a patch</div>
      <div class="card" style="padding:6px 14px">
        {READING.map((r) => <div class="cty" style="grid-template-columns:14px 1fr;align-items:start"><i class={'gdot gr-' + r.g} /><span><b style="font-size:13.5px">{r.t}</b><small style="font-size:12.5px;line-height:1.35">{r.d}</small></span></div>)}
        <p class="muted small" style="margin:8px 0 6px;line-height:1.4">{READING_NOTE}</p>
      </div>

      <div class="sec">Who eats what at Pidwa</div>
      <div class="card" style="padding:4px 14px">
        {DIETS.map((d) => (
          <div class="diet">
            <b>{d.t}</b>
            <div class="who">{d.ids.map((id) => { const s = byId.value.get(id); if (!s) return null; const u = thumbUrl(s); return <a href={href('species/' + id)}>{u ? <i style={`background-image:url(${u})`} /> : <i />}<span>{s.en.replace(/^(African|Common|Plains|Blue|Greater|Southern) /, '')}</span></a>; })}</div>
            <p>{d.d}</p>
          </div>
        ))}
        <p class="muted small" style="margin:8px 0 6px;line-height:1.4">{DIETS_NOTE}</p>
      </div>

      <div class="sec">Is "good grass" a human idea?</div>
      <div class="card tl">{HUMAN.slice(0, 2).map((h) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{h.t}</strong><p>{h.d}</p></div></div>)}</div>
      <div class="card" style="padding:6px 14px">
        {MOSAIC.map((m) => <div class="cty" style="grid-template-columns:14px 1fr;align-items:start"><i class={'gdot gr-' + m.g} /><span><b style="font-size:13.5px">{m.t}</b><small style="font-size:12.5px;line-height:1.35">{m.who}</small></span></div>)}
      </div>
      <div class="card tl">{HUMAN.slice(2).map((h, i) => <div class="tle" style="grid-template-columns:22px 1fr"><b style={i ? 'color:var(--danger)' : ''}><Icon name={i ? 'triangle-alert' : 'check'} size={16} stroke={i ? 2.4 : 3} /></b><div><strong>{h.t}</strong><p>{h.d}</p></div></div>)}</div>

      <div class="sec">Trollope and the 18 grasses of Kruger</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{TROLLOPE_WHO}</p></div>
      <div class="card tl">{TROLLOPE_HOW.map((s, i) => <div class="tle" style="grid-template-columns:22px 1fr"><b>{i + 1}</b><div><strong>{s.t}</strong><p>{s.d}</p></div></div>)}</div>
      <div class="tiles">{TROLLOPE_THREE.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>

      <div class="card">
        <b>A real score sheet</b>
        <span class="muted small" style="display:block;margin-top:2px">{SHEET.site}. Share of the 100 points.</span>
        <div class="gbar" role="img" aria-label={SHEET.parts.map((p) => `${SHORT[p.g]} ${p.n} %`).join(', ') + `, other grasses ${SHEET.other} %`}>
          {SHEET.parts.map((p) => <i class={'gr-' + p.g} style={`width:${p.n}%`} />)}
          <i class="oth" style={`width:${SHEET.other}%`} />
        </div>
        <div class="lulegend" style="margin-top:6px">
          {SHEET.parts.map((p) => <span class="lul"><i class={'gr-' + p.g} /><span>{SHORT[p.g]} <b>{p.n} %</b></span></span>)}
          <span class="lul"><i class="oth" /><span>other grasses <b>{SHEET.other} %</b></span></span>
        </div>
        <div class="tiles in" style="margin-top:10px">
          <div class="tile"><b>{SHEET.forage}</b><span>food score</span><small>low</small></div>
          <div class="tile"><b>{SHEET.fuel}</b><span>fuel score</span><small>low: a fire would not spread</small></div>
        </div>
        <p class="why">{SHEET.verdict}</p>
      </div>

      <div class="card tl">
        <div class="row" style="padding:6px 0 2px"><b>What a ranger does about it</b></div>
        {TROLLOPE_FIX.map((f) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{f.t}</strong><p>{f.d}</p></div></div>)}
        <p class="muted small" style="margin:6px 0;line-height:1.4">{TROLLOPE_NOTE}</p>
      </div>

      <div class="card" onClick={() => setKeys(!keys)} style="cursor:pointer">
        <div class="row" style="justify-content:space-between"><b>The 18 key grasses</b><span class="more">{keys ? 'Hide' : 'Show'}</span></div>
        {keys && (
          <div style="margin-top:6px">
            {KEY_GRASSES.map((k) => <div class="cty" style="grid-template-columns:14px 1fr auto"><i class={'gdot gr-' + k.g} /><span><b style="font-size:13px">{k.en}</b><small style="font-style:italic">{k.sci}</small></span><span class="gtag">{SHORT[k.g]}</span></div>)}
            <p class="muted small" style="margin:8px 0 2px;line-height:1.4">{KEY_NOTE}</p>
          </div>
        )}
      </div>

      <div class="sec">Sweet or sour</div>
      <div class="card tl">{SWEET_SOUR.map((s) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{s.t}</strong><p>{s.d}</p></div></div>)}</div>

      <div class="sec">Where the idea runs out</div>
      <div class="card"><ul class="fixes" style="margin:0">{LIMITS.map((l) => <li><Icon name="x" size={14} stroke={3} />{l}</li>)}</ul></div>

      <div class="card"><b>Where this comes from</b>
        <ul class="srcs">{VELD_SOURCES.map((s) => <li>{s.url ? <a href={s.url} target="_blank" rel="noopener">{s.t}<Icon name="chevron-right" size={13} /></a> : s.t}</li>)}</ul>
      </div>
    </div>
  );
}

/* ---------- drawings ---------- */

/** One grass tuft rooted at (x, G). Soft tufts arch outwards, hard ones stand stiff with a seed head. */
export function Tuft({ x, G, h, kind, cls }: { x: number; G: number; h: number; kind: 'soft' | 'hard' | 'low'; cls: string }) {
  const n = kind === 'low' ? 2 : 3;
  const spread = kind === 'hard' ? h * 0.1 : kind === 'low' ? h * 0.7 : h * 0.34;
  const blades = [];
  for (let i = -n; i <= n; i++) {
    const dx = (i / n) * spread, top = G - h * (1 - Math.abs(i / n) * (kind === 'hard' ? 0.12 : 0.3));
    blades.push(kind === 'hard'
      ? <line x1={x + dx * 0.3} y1={G} x2={x + dx} y2={top} />
      : <path d={`M${x + dx * 0.2} ${G} Q${x + dx * 0.4} ${G - h * 0.6} ${x + dx * 1.25} ${top}`} />);
  }
  return <g class={'tuft ' + kind + ' ' + cls}>{blades}{kind === 'hard' && <line class="head" x1={x} y1={G - h} x2={x + 2.5} y2={G - h - 7} />}</g>;
}

/** Pioneers, subclimax, climax: the same strip of ground at three moments. */
function StagesDrawing() {
  const W = 360, G = 92;
  return (
    <svg class="fence sward" viewBox={`0 0 ${W} 120`} role="img" aria-label="Three stages: sparse small pioneers on bare soil, then medium perennial tufts, then large climax tufts covering the ground">
      <line x1={0} x2={W} y1={G} y2={G} class="ground" />
      {[18, 44, 62, 92].map((x, i) => <Tuft x={x} G={G} h={i % 2 ? 9 : 13} kind="low" cls="gr-i2" />)}
      {[30, 76, 104].map((x) => <circle cx={x} cy={G + 5} r={1.2} class="grit" />)}
      {[146, 166, 188, 210, 230].map((x, i) => <Tuft x={x} G={G} h={i % 2 ? 26 : 32} kind="soft" cls="gr-i2" />)}
      {[276, 300, 324, 346].map((x, i) => <Tuft x={x} G={G} h={i % 2 ? 54 : 62} kind="soft" cls="gr-d" />)}
      {[120, 250].map((x) => <path d={`M${x - 6} 74 h10 m-4 -4 l4 4 l-4 4`} class="arrow" />)}
      <text x={55} y={G + 20} text-anchor="middle" class="lbl">1 Pioneers</text>
      <text x={188} y={G + 20} text-anchor="middle" class="lbl">2 Subclimax</text>
      <text x={311} y={G + 20} text-anchor="middle" class="lbl">3 Climax</text>
    </svg>
  );
}

/** Four patches side by side, one per label, as they look in the field. */
function SwardDrawing() {
  const W = 360, G = 96, P = W / 4;
  const mid = (i: number) => P * i + P / 2;
  return (
    <svg class="fence sward" viewBox={`0 0 ${W} 138`} role="img" aria-label="Four patches: tall soft Decreaser grass; short Increaser II grass with bare soil; tall hard Increaser I tufts among tall grass; tall hard Increaser III tufts with the grass between them grazed short">
      <line x1={0} x2={W} y1={G} y2={G} class="ground" />
      {[1, 2, 3].map((i) => <line x1={P * i} x2={P * i} y1={14} y2={G + 34} class="tick" />)}
      {/* Decreasers: tall, leafy, even */}
      {[14, 34, 54, 74].map((x, i) => <Tuft x={x} G={G} h={i % 2 ? 46 : 52} kind="soft" cls="gr-d" />)}
      {/* Increaser II: short, gaps, bare soil */}
      {[P + 12, P + 38, P + 54, P + 78].map((x, i) => <Tuft x={x} G={G} h={i % 2 ? 9 : 12} kind="low" cls="gr-i2" />)}
      {[P + 24, P + 46, P + 66].map((x) => <circle cx={x} cy={G + 5} r={1.2} class="grit" />)}
      {/* Increaser I: stiff tufts, everything tall and untouched */}
      {[2 * P + 12, 2 * P + 44, 2 * P + 76].map((x) => <Tuft x={x} G={G} h={48} kind="soft" cls="gr-d dim" />)}
      {[2 * P + 28, 2 * P + 60].map((x) => <Tuft x={x} G={G} h={72} kind="hard" cls="gr-i1" />)}
      {/* Increaser III: stiff tufts, grass between them eaten down */}
      {[3 * P + 12, 3 * P + 44, 3 * P + 76].map((x) => <Tuft x={x} G={G} h={10} kind="low" cls="gr-d dim" />)}
      {[3 * P + 28, 3 * P + 60].map((x) => <Tuft x={x} G={G} h={66} kind="hard" cls="gr-i3" />)}
      {(['d', 'i2', 'i1', 'i3'] as Grp[]).map((g, i) => <text x={mid(i)} y={G + 18} text-anchor="middle" class="lbl">{SHORT[g]}</text>)}
      {['used well', 'overgrazed', 'hardly grazed', 'picked over'].map((t, i) => <text x={mid(i)} y={G + 31} text-anchor="middle" class="ax">{t}</text>)}
    </svg>
  );
}
