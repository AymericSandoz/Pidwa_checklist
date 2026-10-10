import { useState } from 'preact/hooks';
import { back } from '../router';
import { Icon } from '../components/Icon';
import { LAND_USE, PROTECTED, RANCHING, TIMELINE, PROVINCES, LAND_SOURCES } from '../learn/land';

/** Chapter "Land in South Africa". Each block is a card; colours come from --lu-* variables (light and dark sets in style.css). */
export function LandView() {
  const [pick, setPick] = useState<string | null>(null);
  const sorted = [...LAND_USE].sort((a, b) => b.pct - a.pct);

  return (
    <div>
      <div class="subhead">
        <button class="bk" onClick={back} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button>
        <div><h2>Land in South Africa</h2><small>122 million hectares · who uses them, who protects them</small></div>
      </div>

      <div class="card">
        <b>What the land is used for</b>
        <span class="muted small" style="display:block;margin-top:2px">Share of the 122 million hectares. Tap a line for details.</span>
        {sorted.map((u) => (
          <div class={'lbar lu' + (pick === u.key ? ' on' : '')} onClick={() => setPick(pick === u.key ? null : u.key)}>
            <div class="row" style="justify-content:space-between"><span><i class={'sw lu-' + u.key + (u.hatched ? ' hatched' : '')} />{u.label}</span><b>{u.pct} %</b></div>
            <span class="tr"><i class={'lu-' + u.key + (u.hatched ? ' hatched' : '')} style={`width:${(100 * u.pct) / 50}%`} /></span>
            {pick === u.key && <small>{u.note}</small>}
          </div>
        ))}
        <p class="muted small" style="margin:10px 0 0;line-height:1.4">Private game ranches cover more land than all the parks and reserves put together. Land cover 2020, ranching 2014, protection 2020.</p>
      </div>

      <div class="sec">Who protects what</div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><b>Formally protected</b><b class="pct">{PROTECTED.total} %</b></div>
        {PROTECTED.rows.map((r) => <Bar label={r.label} pct={r.pct} max={PROTECTED.target.pct} note={r.note} />)}
        <div style="margin-top:14px"><b>On top of those 9.2 %: counted, but not protected</b><span class="muted small" style="display:block">Not included above. The state adds the first line to reach a "conservation estate" of 16 %. The two lines partly overlap each other.</span></div>
        {PROTECTED.extra.map((r) => <Bar label={r.label} pct={r.pct} max={PROTECTED.target.pct} note={r.note} dashed />)}
        <div class="target"><b>Target {PROTECTED.target.pct} %</b><span class="muted small">{PROTECTED.target.label}</span></div>
        <Growth />
      </div>

      <div class="sec">The game ranches</div>
      <div class="tiles">{RANCHING.tiles.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><b>What they earned, {RANCHING.revenue.year}</b><span class="muted small">{RANCHING.revenue.total}</span></div>
        {RANCHING.revenue.rows.map((r) => <Bar label={r.label} pct={r.pct} max={60} note={r.note} unit="%" />)}
        <p class="muted small" style="margin:8px 0 0;line-height:1.4">{RANCHING.revenue.note}</p>
      </div>
      <div class="card">
        <b>Hunting, in numbers</b>
        <div class="tiles in" style="margin-top:10px">{RANCHING.hunting.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>
        <p class="muted small" style="margin:8px 0 0;line-height:1.4">Trophy hunting pays little of the national economy but a lot per hectare on dry land where nothing else does. Whether it helps or harms wildlife is argued over; a separate chapter will lay out both sides.</p>
      </div>

      <div class="sec">By province</div>
      <div class="card">
        <div class="provmap">
          {PROVINCES.map((p) => (
            <div class={'prov' + (p.pidwa ? ' pidwa' : '')} style={`grid-column:${p.col};grid-row:${p.row}`}>
              <b>{p.name}</b>
              <span><i class="lu-game" />{p.game != null ? p.game + ' %' : '–'}</span>
              <span><i class="lu-parks" />{p.prot != null ? p.prot + ' %' : '?'}</span>
              {p.pidwa && <small>Pidwa</small>}
            </div>
          ))}
        </div>
        <div class="lulegend" style="margin-top:8px"><span class="lul"><i class="lu-game" /><span>fenced game ranches, 2014</span></span><span class="lul"><i class="lu-parks" /><span>protected, 2020</span></span></div>
        <p class="muted small" style="margin:8px 0 0;line-height:1.4">Half of all game ranches are in Limpopo: 3 400 fenced farms, 5.5 M ha, about 44 % of the province. The protected share is only published for three provinces.</p>
      </div>

      <div class="sec">How it got this way</div>
      <div class="card tl">
        {TIMELINE.map((e) => <div class="tle"><b>{e.y}</b><div><strong>{e.t}</strong><p>{e.d}</p></div></div>)}
      </div>

      <div class="card"><b>Where the numbers come from</b>
        <ul class="srcs">{LAND_SOURCES.map((s) => <li><a href={s.url} target="_blank" rel="noopener">{s.t}<Icon name="chevron-right" size={13} /></a></li>)}</ul>
      </div>
    </div>
  );
}

function Bar({ label, pct, max, note, dashed, unit = '%' }: { label: string; pct: number; max: number; note?: string; dashed?: boolean; unit?: string }) {
  return (
    <div class="lbar">
      <div class="row" style="justify-content:space-between"><span>{label}</span><b>{pct} {unit}</b></div>
      <span class={'tr' + (dashed ? ' dashed' : '')}><i style={`width:${(100 * pct) / max}%`} /></span>
      {note && <small>{note}</small>}
    </div>
  );
}

/** Protected share over time, with the 2030 target. Linear, small. */
function Growth() {
  const g = PROTECTED.growth, W = 360, H = 120, L = 30, R = 10, T = 14, B = 22, X0 = 1975, X1 = 2032, YM = 32;
  const x = (y: number) => L + ((y - X0) / (X1 - X0)) * (W - L - R);
  const ly = (v: number) => T + (1 - v / YM) * (H - T - B);
  return (
    <svg class="dropchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Protected share of the land since 1980 and the 2030 target">
      {[0, 10, 20, 30].map((v) => <g><line x1={L} x2={W - R} y1={ly(v)} y2={ly(v)} class="grid" /><text x={L - 5} y={ly(v) + 3.5} text-anchor="end" class="ax">{v} %</text></g>)}
      <path d={g.map((p, i) => (i ? 'L' : 'M') + x(p.y) + ' ' + ly(p.pct)).join(' ')} class="line" />
      {g.map((p) => <circle cx={x(p.y)} cy={ly(p.pct)} r={3.5} class="pt" />)}
      <path d={`M${x(2023)} ${ly(9.8)} L${x(2030)} ${ly(30)}`} class="estline" />
      <circle cx={x(2030)} cy={ly(30)} r={5} class="estpt" />
      <text x={x(2030) - 8} y={ly(30) + 4} text-anchor="end" class="esttxt">target</text>
      <text x={x(2023)} y={ly(9.8) - 9} text-anchor="middle" class="lbl">9.8 %</text>
      {[1980, 2000, 2020].map((v) => <text x={x(v)} y={H - 6} text-anchor="middle" class="ax">{v}</text>)}
      <text x={x(2030)} y={H - 6} text-anchor="middle" class="ax">2030</text>
    </svg>
  );
}
