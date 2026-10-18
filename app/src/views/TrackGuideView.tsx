import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { byId, thumbUrl, seenCount } from '../data';
import { href } from '../router';
import { Icon } from '../components/Icon';
import { SpoorMini, bookDims, bookFront } from '../components/Spoor';
import type { BookSpoor, BookFoot } from '../components/Spoor';
import { loadBook } from '../components/TracksSection';
import { SPOOR, LOOKS, looksOf } from '../learn/tracks';
import type { Spoor, Foot } from '../learn/tracks';
import { GuideSwitch } from './IdGuideView';

// Key to a footprint: what it looks like, how many toes, claws or not, how long. Same logic as the bird guide: every
// criterion is multi-select ("one of these"), and each option counts the prints left once the other criteria apply.
// Tap two prints to set them side by side with what tells them apart (the `why` of the species sheets).
type Key = 'look' | 'toes' | 'claws';
const sel = signal<Partial<Record<Key, string[]>>>({});
const len = signal<number | null>(null);   // print length in cm, front or hind
const pick = signal<string[]>([]);         // up to two species ids for the duel

const TOES: [string, string][] = [['1', '1'], ['2', '2 (hoof halves)'], ['3', '3'], ['4', '4'], ['5', '5']];
const CLAWS: [string, string][] = [['yes', 'Claw marks'], ['no', 'No claw marks']];
// "sometimes" and "usually hidden" pass both ways: the book warns they depend on the ground and the gait
function clawsOf(e: Spoor): string[] {
  const n = e.clawsNote || '';
  if (/sometimes|usually hidden/.test(n)) return ['yes', 'no'];
  return [e.claws ? 'yes' : 'no'];
}
const valueOf = (e: Spoor, k: Key): string[] => (k === 'look' ? looksOf(e) : k === 'toes' ? [String(e.toes)] : clawsOf(e));

// length slider on a log scale, 1.5 to 50 cm, so a genet and an elephant both get room
const LMIN = 1.5, LMAX = 50;
const toCm = (t: number) => +(LMIN * Math.pow(LMAX / LMIN, t / 100)).toFixed(1);
const toT = (cm: number) => (100 * Math.log(cm / LMIN)) / Math.log(LMAX / LMIN);
const TOL = 1.2;   // ±20 %: soft ground, speed and the animal's age all stretch a print
const off = (e: Spoor, L: number) => Math.min(...[e.front.l, e.hind.l].map((l) => Math.abs(Math.log(l / L))));
const lenOk = (e: Spoor, L: number) => off(e, L) <= Math.log(TOL);

function toggle(k: Key, v: string) {
  const cur = sel.value[k] || [];
  sel.value = { ...sel.value, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
}
function togglePick(id: string) {
  const p = pick.value;
  pick.value = p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2);
}

const short = (id: string) => byId.value.get(id)?.en.replace(/^(African|Common|Plains|Southern|Spotted|Black-backed|Chacma|Cape|Scrub|Ground|Rock|Honey|Sharpe's) /, '') || id;
const frontOf = (e: Spoor, b?: BookSpoor): Foot => { const f = bookFront(b); return f ? bookDims(f) : e.front; };

/** One print fitted into a w×h box (tiles whose sizes differ too much to share a scale). */
function Fit({ e, book, w, h }: { e: Spoor; book?: BookFoot; w: number; h: number }) {
  const ft = book ? bookDims(book) : e.front;
  return <SpoorMini e={e} book={book} h={h} S={Math.min((h - 8) / ft.l, (w - 8) / ft.w)} />;
}

export function TrackGuideView() {
  const [book, setBook] = useState<Record<string, BookSpoor>>({});
  useEffect(() => { loadBook().then(setBook); }, []);
  const seen = seenCount.value;
  const all = SPOOR.filter((e) => byId.value.has(e.id));
  const s0 = sel.value, L = len.value;
  const active = Object.values(s0).some((v) => v?.length) || L != null;

  const pass = (e: Spoor, skip?: Key) => {
    for (const k of Object.keys(s0) as Key[]) {
      const want = s0[k];
      if (k === skip || !want?.length) continue;
      if (!valueOf(e, k).some((v) => want.includes(v))) return false;
    }
    return L == null || lenOk(e, L);
  };
  const result = all.filter((e) => pass(e)).sort((a, b) => (L != null ? off(a, L) - off(b, L) : frontOf(a, book[a.id]).l - frontOf(b, book[b.id]).l));
  const countFor = (k: Key, v: string) => all.filter((e) => valueOf(e, k).includes(v) && pass(e, k)).length;

  const chip = (k: Key, v: string, label: string) => {
    const on = !!s0[k]?.includes(v);
    const n = countFor(k, v);
    return (
      <button class={'chip' + (on ? ' on' : '') + (!on && n === 0 ? ' empty' : '')} disabled={!on && n === 0} onClick={() => toggle(k, v)}>
        {label} <span class="n">{n}</span>
      </button>
    );
  };

  // one shared scale when the sizes allow it (it's the point: a jackal next to a civet), else each print fills its tile
  const lens = result.map((e) => frontOf(e, book[e.id]).l);
  const maxL = Math.max(...lens, 1), minL = Math.min(...lens, maxL);
  const shared = maxL / minL <= 5;
  const S = Math.min(7, 70 / maxL);
  const duel = pick.value.map((id) => all.find((e) => e.id === id)).filter((e): e is Spoor => !!e);

  return (
    <div class="idg tg">
      <GuideSwitch />

      <div class="fgroup">
        <div class="lab">What does the print look like <span class="hint">tick one or several</span></div>
        <div class="gtiles">
          {LOOKS.map(([v, label, rep]) => {
            const e = all.find((x) => x.id === rep);
            const on = !!s0.look?.includes(v);
            const n = countFor('look', v);
            return (
              <button class={'gtile' + (on ? ' on' : '') + (!on && n === 0 ? ' empty' : '')} disabled={!on && n === 0} onClick={() => toggle('look', v)}>
                <div class="pr">{e && <Fit e={e} book={bookFront(book[e.id])} w={84} h={58} />}</div>
                <span class="gl">{label}</span>
                <span class="n">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div class="fgroup">
        <div class="lab">Toes that show <span class="hint">count the separate toe marks</span></div>
        <div class="chips">{TOES.map(([v, l]) => chip('toes', v, l))}</div>
      </div>
      <div class="fgroup">
        <div class="lab">Claws <span class="hint">not sure? leave both off</span></div>
        <div class="chips">{CLAWS.map(([v, l]) => chip('claws', v, l))}</div>
      </div>
      <div class="fgroup">
        <div class="lab">Length of the print <span class="hint">{L == null ? 'heel to toe tip, claws excluded' : `${(L / TOL).toFixed(1)} to ${(L * TOL).toFixed(1)} cm`}</span></div>
        <div class="tlen">
          <input type="range" min={0} max={100} step={0.5} value={L == null ? toT(8) : toT(L)} class={L == null ? 'off' : ''}
            onInput={(ev) => (len.value = toCm(+(ev.target as HTMLInputElement).value))} aria-label="Print length" />
          <b>{L == null ? 'any' : `${L} cm`}</b>
          {L != null && <button class="chip" onClick={() => (len.value = null)}>any</button>}
        </div>
        <p class="hint tref">For scale: a bank card is 8.6 cm long, a palm about 10 cm, a boot about 30 cm.</p>
      </div>

      <div class="idbar">
        <b>{result.length} print{result.length !== 1 ? 's' : ''}</b>
        {active && <button class="btn sm secondary" onClick={() => { sel.value = {}; len.value = null; }}>clear all</button>}
      </div>

      {duel.length === 2 ? <Duel a={duel[0]} b={duel[1]} book={book} />
        : <p class="hint tpick">{duel.length === 1 ? `${short(duel[0].id)} picked: tap a second print to compare them.` : 'Tap two prints to compare them side by side.'}{!shared && result.length > 1 && ' Sizes differ too much here to share one scale; narrow the search to see them true to size.'}</p>}

      <div class="tgrid">
        {result.map((e) => {
          const s = byId.value.get(e.id)!;
          const u = thumbUrl(s);
          const b = bookFront(book[e.id]);
          const on = pick.value.includes(e.id);
          return (
            <div class={'ttile' + (on ? ' on' : '') + (seen.has(e.id) ? ' seen' : '')} key={e.id}>
              <button class="pr" onClick={() => togglePick(e.id)} aria-pressed={on} aria-label={`Compare ${s.en}`}>
                {shared ? <SpoorMini e={e} book={b} S={S} h={Math.round(maxL * S) + 8} /> : <Fit e={e} book={b} w={96} h={78} />}
              </button>
              <a class="nm" href={href('species/' + e.id)}>{u && <i style={`background-image:url(${u})`} />}<span>{short(e.id)}</span><Icon name="chevron-right" size={14} /></a>
              <span class="sz">{e.front.l} / {e.hind.l} cm</span>
            </div>
          );
        })}
      </div>
      <a class="card row tquiz" href={href('learn/spoorquiz')}><Icon name="paw-print" size={20} /><div><b>Test yourself: whose track?</b><div class="muted small">Field photos of prints and dung, four names, hints.</div></div><Icon name="chevron-right" size={18} /></a>
      <p class="credit" style="margin-top:12px">Lengths are front / hind prints, after Gutteridge &amp; Liebenberg, <i>Mammals of Southern Africa and their Tracks &amp; Signs</i> (Jacana, 2013), measured mostly at Londolozi. Young animals, soft sand and speed all change a print: treat the key as a shortlist, then check the species sheet.</p>
    </div>
  );
}

/** Two prints at one scale, front and hind, with the facts side by side and what the book says tells them apart. */
function Duel({ a, b, book }: { a: Spoor; b: Spoor; book: Record<string, BookSpoor> }) {
  const feet = (e: Spoor) => (['front', 'hind'] as const).map((k) => {
    const bf = book[e.id]?.[k];
    return { k, bf, ft: bf ? bookDims(bf) : e[k] };
  }).filter((f) => f.bf || !book[e.id]);
  const fa = feet(a), fb = feet(b);
  const maxL = Math.max(...[...fa, ...fb].map((f) => f.ft.l));
  const S = Math.min(8, 96 / maxL), h = Math.round(maxL * S) + 8;
  const why = [a.why?.[b.id], b.why?.[a.id]].filter((x, i, arr): x is string => !!x && arr.indexOf(x) === i);
  const claws = (e: Spoor) => e.clawsNote ? (e.clawsNote === 'n/a' ? 'none' : e.clawsNote) : e.claws ? 'show' : 'none';
  const col = (e: Spoor, ff: typeof fa) => (
    <div class="dcol">
      <a class="dn" href={href('species/' + e.id)}>{short(e.id)}<Icon name="chevron-right" size={14} /></a>
      <div class="dfeet">{ff.map((f) => <div><SpoorMini e={e} book={f.bf} S={S} h={h} /><span>{f.k} {f.ft.l} cm</span></div>)}</div>
      <div class="dfacts"><span>{e.toes} {e.shape === 'cloven' ? 'hoof halves' : e.toes === 1 ? 'hoof' : 'toes'}</span><span>claws: {claws(e)}</span></div>
    </div>
  );
  return (
    <div class="card duel">
      <button class="x" aria-label="Close comparison" onClick={() => (pick.value = [])}><Icon name="x" size={16} /></button>
      <div class="dcols">{col(a, fa)}{col(b, fb)}</div>
      <b class="ttl">What tells them apart</b>
      {why.length ? why.map((t) => <p class="tx">{t}</p>)
        : <p class="tx">The book doesn't set these two against each other: compare the drawings above, then read each species' print and trail.</p>}
    </div>
  );
}
