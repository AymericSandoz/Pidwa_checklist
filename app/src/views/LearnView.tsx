import { useState } from 'preact/hooks';
import { byId, thumbUrl } from '../data';
import { back, href, route } from '../router';
import { Icon } from '../components/Icon';
import { POPS, popById, fmtN, type Pop } from '../learn/populations';
import { LandView } from './LandView';
import { FencesView } from './FencesView';
import { QuizView } from './QuizView';
import { SpoorQuizView } from './SpoorQuizView';
import { VeldView } from './VeldView';
import { BushView } from './BushView';
import { ClimateView } from './ClimateView';

/* ---------- charts: linear, from the c.1800 estimate down to today ---------- */

const X0 = 1800, X1 = 2026;

/** One species, from 1800 to now. The amber point is our estimate with its range, dotted until the first real count, green afterwards. */
export function DropChart({ p, h = 200, mini = false }: { p: Pop; h?: number; mini?: boolean }) {
  const W = mini ? 180 : 360, L = mini ? 8 : 44, R = mini ? 8 : 14, T = mini ? 24 : 18, B = mini ? 16 : 24;
  const top = p.est1800 ? p.est1800.hi : Math.max(...p.timeline.map((q) => q.n));
  const YM = top * 1.06;
  const x = (y: number) => L + ((y - X0) / (X1 - X0)) * (W - L - R);
  const ly = (v: number) => T + (1 - v / YM) * (h - T - B);
  const tl = p.timeline;
  const last = tl[tl.length - 1];
  const ticks = mini ? [] : niceTicks(YM);
  return (
    <svg class="dropchart" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={`${p.name}: ${p.est1800 ? 'about ' + fmtN(p.est1800.mid) + ' around 1800, ' : ''}${fmtN(p.today.n)} today`}>
      {ticks.map((v) => <g><line x1={L} x2={W - R} y1={ly(v)} y2={ly(v)} class="grid" /><text x={L - 5} y={ly(v) + 3.5} text-anchor="end" class="ax">{v ? fmtN(v, true) : '0'}</text></g>)}
      {mini && <line x1={L} x2={W - R} y1={ly(0)} y2={ly(0)} class="grid" />}
      {p.est1800 && (
        <g>
          <line x1={x(1800)} x2={x(1800)} y1={ly(p.est1800.hi)} y2={ly(p.est1800.lo)} class="estrange" />
          <circle cx={x(1800)} cy={ly(p.est1800.mid)} r={mini ? 3.5 : 5} class="estpt" />
          <text x={x(1800) + (mini ? 9 : 12)} y={ly(p.est1800.mid) + (mini ? 4 : -6)} class="esttxt">{mini ? fmtN(p.est1800.mid) : `≈ ${fmtN(p.est1800.mid)} around 1800`}</text>
          {!mini && <text x={x(1800) + 12} y={ly(p.est1800.mid) + 8} class="ax">our estimate, {fmtN(p.est1800.lo)} to {fmtN(p.est1800.hi)}</text>}
          <path d={`M${x(1800)} ${ly(p.est1800.mid)} L${x(tl[0].y)} ${ly(tl[0].n)}`} class="estline" />
        </g>
      )}
      <path d={tl.map((q, i) => (i ? 'L' : 'M') + x(q.y) + ' ' + ly(q.n)).join(' ')} class="line" />
      {!mini && tl.map((q) => <circle cx={x(q.y)} cy={ly(q.n)} r={3.5} class="pt" />)}
      {mini && <circle cx={x(last.y)} cy={ly(last.n)} r={3} class="pt" />}
      {!mini && x(last.y) - x(tl[0].y) > 70 && <text x={x(tl[0].y)} y={ly(tl[0].n) - 9} text-anchor="middle" class="lbl">{fmtN(tl[0].n)}</text>}
      {!mini && <text x={x(last.y)} y={ly(last.n) - 10} text-anchor="end" class="lbl">{fmtN(last.n)} today</text>}
      {mini && <text x={W - R} y={ly(0) - 7} text-anchor="end" class="lbl now">{fmtN(p.today.n)}</text>}
      {mini && <text x={L + 2} y={16} class="title">{p.short}</text>}
      {(mini ? [1800, 1900] : [1800, 1850, 1900, 1950]).map((v) => <text x={x(v)} y={h - 6} text-anchor={v === 1800 && mini ? 'start' : 'middle'} class="ax">{v}</text>)}
      <text x={x(2024)} y={h - 6} text-anchor="end" class="ax">now</text>
    </svg>
  );
}

function niceTicks(max: number): number[] {
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const s = [1, 2, 2.5, 5, 10].map((m) => m * step).find((v) => max / v <= 5) || step;
  const out: number[] = [];
  for (let v = 0; v <= max; v += s) out.push(v);
  return out;
}

/* ---------- screens ---------- */

const CHAPTERS = [
  { id: 'left', title: 'How many are left?', blurb: "Nine of Pidwa's big animals counted across Africa, by country, and what the continent held in 1800.", tag: '9 species · 2024-2025 data', ready: true },
  { id: 'land', title: 'Land in South Africa', blurb: 'Farms, game ranches, parks and communal land: who uses what, who protects what, and how it got this way.', tag: '122 M ha · 2014-2024 data', ready: true },
  { id: 'fences', title: 'Fences', blurb: 'Why the bush is full of wire, what it costs, how the shock works, and who dies on it.', tag: 'short read', ready: true },
  { id: 'veld', title: 'Reading the grass', blurb: 'Decreasers, Increasers I, II and III: what the grasses under your feet say about how the veld has been used.', tag: '18 key grasses · Kruger method', ready: true },
  { id: 'bush', title: 'Bush encroachment', blurb: 'Too many trees or not enough? Why the bush thickens, and the argument over what to do about it.', tag: 'fire, elephants, CO2 · with Pidwa', ready: true },
  { id: 'climate', title: 'Climate change', blurb: 'Heat, drought and rain in the Lowveld: what is already changing and what it does to the bush.', tag: 'Kruger drought 2015-16 in detail', ready: true },
  { id: 'tracks', title: 'Tracks and signs', blurb: 'Spoor, dung, feeding signs and what they tell you about who passed and when.', ready: false },
  { id: 'firstaid', title: 'First aid: bites and stings', blurb: 'Snakes, spiders and scorpions: which ones matter, and what to do and not do.', ready: false },
  { id: 'vehicles', title: 'Safari vehicles', blurb: 'Land Rover, Toyota and the rest: what a game viewer is built from and why.', ready: false },
  { id: 'money', title: 'Who pays for the wild?', blurb: 'Park budgets, tourism revenue, donors and what a rhino costs to protect.', ready: false },
  { id: 'hunting', title: 'Trophy hunting', blurb: 'What is hunted, where the money goes, and what the science says.', ready: false },
];

export function LearnView() {
  const parts = route.value.parts;
  if (parts[1] === 'left' && parts[2]) return <LearnSpecies id={parts[2]} />;
  if (parts[1] === 'left') return <LearnChapter />;
  if (parts[1] === 'land') return <LandView />;
  if (parts[1] === 'fences') return <FencesView />;
  if (parts[1] === 'veld') return <VeldView />;
  if (parts[1] === 'bush') return <BushView />;
  if (parts[1] === 'climate') return <ClimateView />;
  if (parts[1] === 'quiz') return <QuizView />;
  if (parts[1] === 'spoorquiz') return <SpoorQuizView />;
  return (
    <div>
      <div class="learn-hero"><b>Learn</b><p>Short, sourced chapters on what you see at Pidwa and the bigger picture behind it. Every number links to where it comes from.</p></div>
      <a class="chap quiz" href={href('learn/quiz')}>
        <div class="ill"><Icon name="eye" size={26} /></div>
        <div class="tx"><b>Quiz: name that species</b><span>A photo, sometimes the call, and you type the name. Starts with what you have already seen.</span><span class="tag ok">practice</span></div>
        <Icon name="chevron-right" size={20} />
      </a>
      <a class="chap quiz" href={href('learn/spoorquiz')}>
        <div class="ill"><Icon name="paw-print" size={26} /></div>
        <div class="tx"><b>Quiz: whose track?</b><span>A field photo of a print or of dung, four names, and hints that teach you what to look at.</span><span class="tag ok">practice</span></div>
        <Icon name="chevron-right" size={20} />
      </a>
      {CHAPTERS.map((c) => (
        <a class={'chap' + (c.ready ? '' : ' soon')} href={c.ready ? href('learn/' + c.id) : undefined}>
          <div class="ill">{c.id === 'climate' ? <Icon name="sun" size={28} /> : c.id === 'bush' ? <svg class="minbush" viewBox="0 0 46 38"><circle cx="9" cy="29" r="7" /><circle cx="22" cy="30" r="6" /><circle cx="15" cy="23" r="6" /><line x1="35" y1="36" x2="35" y2="14" /><ellipse cx="35" cy="11" rx="11" ry="6" fill="currentColor" /></svg> : c.id === 'veld' ? <span class="mingrass"><i /><i /><i /><i /><i /><i /></span> : c.id === 'fences' ? <span class="minfence"><i /><i /><i /><i class="l" /><i /><i class="t" /></span> : c.id === 'land' ? <span class="minwaffle">{['game','game','graze','graze','graze','graze','graze','communal','communal','parks','parks','urban','crops','crops','water','timber'].map((k) => <i class={'lu-' + k} />)}</span> : c.ready ? POPS.slice(0, 4).map((p) => { const s = byId.value.get(p.id); const u = s && thumbUrl(s); return u ? <i style={`background-image:url(${u})`} /> : <i />; }) : <Icon name="book-open" size={26} />}</div>
          <div class="tx"><b>{c.title}</b><span>{c.blurb}</span><span class="tag">{c.ready ? c.tag : 'coming'}</span></div>
          {c.ready && <Icon name="chevron-right" size={20} />}
        </a>
      ))}
    </div>
  );
}

function SubHead({ title, sub, thumb }: { title: string; sub: string; thumb?: string | null }) {
  return (
    <div class="subhead">
      <button class="bk" onClick={back} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button>
      {thumb && <i class="th" style={`background-image:url(${thumb})`} />}
      <div><h2>{title}</h2><small>{sub}</small></div>
    </div>
  );
}

function LearnChapter() {
  const [mode, setMode] = useState<'curves' | 'table'>('curves');
  const sorted = [...POPS].sort((a, b) => b.today.n - a.today.n);
  const withEst = POPS.filter((p) => p.est1800);
  return (
    <div>
      <SubHead title="How many are left?" sub="Africa-wide · tap a species for countries and sources" />
      <div class="tabs"><button class={mode === 'curves' ? 'on' : ''} onClick={() => setMode('curves')}>Curves</button><button class={mode === 'table' ? 'on' : ''} onClick={() => setMode('table')}>Table</button></div>

      {mode === 'curves' ? (
        <div class="card" style="padding:8px">
          <div class="multiples">{withEst.map((p) => <a href={href('learn/left/' + p.id)}><DropChart p={p} h={112} mini /></a>)}</div>
          <p class="muted small" style="margin:8px 6px 2px;line-height:1.35">The amber point is our 1800 estimate with its range; dotted until the first real count. Each chart has its own scale. Leopard has no usable history, see the table.</p>
        </div>
      ) : (
        <div class="card" style="padding:4px 12px">
          <table class="poptable">
            <thead><tr><th>Species</th><th>1800*</th><th>~1975</th><th>~2000</th><th>Now</th></tr></thead>
            <tbody>
              {sorted.map((p) => {
                const near = (y: number) => { const c = p.timeline.filter((q) => Math.abs(q.y - y) <= 15).sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0]; return c ? fmtN(c.n, true) : '–'; };
                return <tr><td><a href={href('learn/left/' + p.id)}>{p.short}</a></td><td>{p.est1800 ? fmtN(p.est1800.mid) : '?'}</td><td>{near(1975)}</td><td>{near(2000)}</td><td><b>{fmtN(p.today.n, true)}</b></td></tr>;
              })}
            </tbody>
          </table>
          <p class="muted" style="font-size:11px;margin:6px 0 8px">* our estimate, central value of a wide range.</p>
        </div>
      )}

      <div class="sec">Species</div>
      <div class="card" style="padding:4px 14px">
        {sorted.map((p) => {
          const s = byId.value.get(p.id); const u = s && thumbUrl(s);
          const pct = p.est1800 ? (100 * p.today.n) / p.est1800.mid : null;
          return (
            <a class="sp-pop" href={href('learn/left/' + p.id)}>
              {u ? <i class="th" style={`background-image:url(${u})`} /> : <i class="th" />}
              <div>
                <div class="nm">{p.name}<small>{p.est1800 ? `${fmtN(p.est1800.lo)} to ${fmtN(p.est1800.hi)} around 1800` : 'no historical estimate'}</small></div>
                <div class="rem">{pct != null ? <><span class="tr"><i style={`width:${Math.max(0.8, pct)}%`} /></span><em>{pct < 1 ? '< 1 %' : '≈ ' + Math.round(pct) + ' %'}</em></> : <><span class="tr unk" /><em class="unk">?</em></>}</div>
              </div>
              <div class="nums"><b>{fmtN(p.today.n, true)}</b><span>{p.today.year}</span></div>
            </a>
          );
        })}
      </div>
      <div class="card"><b>How to read this</b><p class="muted" style="margin:4px 0 0;line-height:1.4">Today's figures are the latest IUCN or national counts. The 1800 figures are our own order-of-magnitude estimate, historic range × density, with the assumptions shown on each species. Treat the bar as a story, not a measurement.</p></div>
    </div>
  );
}

function LearnSpecies({ id }: { id: string }) {
  const p = popById.get(id);
  if (!p) return <div class="empty">Unknown species.</div>;
  const s = byId.value.get(p.id);
  const total = p.countries ? p.countries.reduce((a, c) => a + c.n, 0) : 0;
  const max = p.countries ? Math.max(...p.countries.map((c) => c.n)) : 1;
  return (
    <div>
      <SubHead title={p.name} sub={`${p.sci} · Africa-wide`} thumb={s && thumbUrl(s)} />
      <div class="card">
        <div class="bignum"><b>{fmtN(p.today.n)}</b><span>{p.today.year}, {p.today.by}</span></div>
        <div class="pills" style="margin:8px 0 2px">{p.tags.map((t) => <span class={'pill' + (t.tone === 'bad' ? ' bad' : t.tone === 'ok' ? ' ok' : '')}>{t.t}</span>)}</div>
        <DropChart p={p} />
        <div class="row" style="justify-content:space-between;margin-top:2px">{p.est1800 ? <span class="tag new">1800 · our estimate</span> : <span />}<span class="muted small">continental, measured points in green</span></div>
      </div>

      {p.countries && (
        <>
          <div class="sec">By country, {p.countryYear || p.today.year}</div>
          <div class="card" style="padding:6px 14px">
            {p.countries.map((c) => (
              <div class="cty">
                <span>{c.name}{c.note && <small>{c.note}</small>}</span>
                <b>{fmtN(c.n)}{total > 0 && c.n / total >= 0.05 && <em>{Math.round((100 * c.n) / total)} %</em>}</b>
                <span class="b"><i style={`width:${(100 * c.n) / max}%`} /></span>
              </div>
            ))}
            {p.countryNote && <p class="muted small" style="margin:8px 0 6px;line-height:1.35">{p.countryNote}</p>}
          </div>
        </>
      )}

      {p.est1800 && (
        <div class="card"><b>Around 1800</b><p class="muted" style="margin:4px 0 0;line-height:1.4">{p.est1800.how}</p></div>
      )}

      <div class="card"><b>Where the numbers come from</b>
        <ul class="srcs">{p.sources.map((src) => <li>{src.url ? <a href={src.url} target="_blank" rel="noopener">{src.t}<Icon name="chevron-right" size={13} /></a> : src.t}</li>)}</ul>
      </div>
      {s && <a class="card row" href={href('species/' + s.id)} style="justify-content:space-between"><b>{s.en} at Pidwa</b><Icon name="chevron-right" size={18} /></a>}
    </div>
  );
}
