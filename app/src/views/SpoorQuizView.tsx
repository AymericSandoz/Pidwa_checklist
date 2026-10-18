import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { byId, thumbUrl, dataUrl } from '../data';
import { back, href } from '../router';
import { Icon } from '../components/Icon';
import { SpoorCard } from '../components/Spoor';
import type { BookSpoor } from '../components/Spoor';
import { loadSigns, loadBook } from '../components/TracksSection';
import type { SignPhoto } from '../components/TracksSection';
import { loadCards, record, resetCards, pickRound, progress, shuffle, type Verdict } from '../learn/quiz';
import { SPOOR, spoorById, LOOKS, looksOf } from '../learn/tracks';
import type { Spoor } from '../learn/tracks';
import type { QuizCard } from '../types';

// "Whose track is it?": a field photo of a print or of dung, four names to choose from. The wrong names are the animals
// you could really take it for: the book's lookalikes first, then prints of the same family and size. Hints come one
// at a time (what kind of print, its size, the book drawing, then two wrong names struck out); a right answer after a
// hint counts as "close" for the spaced repetition. After a wrong answer the card says what tells the two apart.
// Progress is stored with the photo quiz's, under "spoor:<id>" / "scat:<id>", so the two never mix.

const ROUND = 10;
type Kind = 'track' | 'scat';
const pref = <T extends string>(k: string, d: T): T => { try { return (localStorage.getItem(k) as T) || d; } catch { return d; } };
const keep = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
const KEY: Record<Kind, string> = { track: 'spoor:', scat: 'scat:' };

interface Item { id: string; e: Spoor; kind: Kind }

const short = (id: string) => byId.value.get(id)?.en || id;
const lookLabel = (e: Spoor) => looksOf(e).map((l) => LOOKS.find((x) => x[0] === l)?.[1]).filter(Boolean).join(' or ');
const claws = (e: Spoor) => (e.clawsNote ? (e.clawsNote === 'n/a' ? 'no claw marks' : `claws ${e.clawsNote}`) : e.claws ? 'claw marks show' : 'no claw marks');
const ANIMAL: Record<string, string> = {
  cloven: 'a cloven-hoofed animal (antelope, buffalo, giraffe or pig)', hoof: 'a horse-like animal', giant: 'a giant (elephant, rhino or hippo)',
  cat: 'a cat-like carnivore', dog: 'a dog-like carnivore', five: 'a five-toed animal (mongoose, otter, badger, digger)', hand: 'a primate', other: 'a hare, hyrax or rodent',
};

/** Three wrong names: the book's lookalikes, then same family closest in size, then anything closest in size. */
function distractors(e: Spoor, pool: Spoor[]): string[] {
  const out: string[] = [];
  const add = (id: string) => { if (id !== e.id && !out.includes(id) && pool.some((x) => x.id === id)) out.push(id); };
  shuffle([...(e.confuse || [])]).slice(0, 2).forEach(add);
  const size = (x: Spoor) => Math.abs(Math.log(x.front.l / e.front.l));
  const fam = new Set(looksOf(e));
  const same = pool.filter((x) => looksOf(x).some((l) => fam.has(l))).sort((a, b) => size(a) - size(b));
  // a little randomness among the nearest, so the same three don't always come back
  shuffle(same.slice(0, 6)).forEach((x) => out.length < 3 && add(x.id));
  [...pool].sort((a, b) => size(a) - size(b)).forEach((x) => out.length < 3 && add(x.id));
  return out.slice(0, 3);
}

/** Masks the animal's own name in a text used as a hint ("civetries" would give the civet away). */
function redact(t: string, id: string) {
  const words = (byId.value.get(id)?.en || '').split(/[\s-]+/).filter((w) => w.length > 3 && !/^(african|common|southern|greater|lesser|black|white|spotted|brown|plains|cape|large|small|blue|grey|side)/i.test(w));
  return words.reduce((s, w) => s.replace(new RegExp(`\\b${w.slice(0, Math.min(5, w.length - 1))}\\w*`, 'gi'), '▢▢▢'), t);
}

export function SpoorQuizView() {
  const [kind, setKind] = useState<Kind>(pref('spoorquiz-kind', 'track'));
  const [signs, setSigns] = useState<Record<string, SignPhoto[]> | null>(null);
  const [book, setBook] = useState<Record<string, BookSpoor>>({});
  const [cards, setCards] = useState<Map<string, QuizCard> | null>(null);
  const [round, setRound] = useState<Item[] | null>(null);
  useEffect(() => { loadSigns().then(setSigns); loadBook().then(setBook); loadCards().then(setCards); }, []);

  const species = SPOOR.filter((e) => byId.value.has(e.id));
  const pool = useMemo<Item[]>(() => (signs ? species.filter((e) => signs[e.id]?.some((p) => p.kind === kind)).map((e) => ({ id: KEY[kind] + e.id, e, kind })) : []), [signs, kind]);

  if (round && cards && signs) return <Round list={round} cards={cards} signs={signs} book={book} all={species} onDone={(c) => { setCards(c); setRound(null); }} />;

  async function reset() {
    if (!confirm('Forget your progress on tracks and dung?')) return;
    await resetCards([KEY.track, KEY.scat]);   // the photo quiz shares the store
    setCards(await loadCards());
  }
  const p = cards ? progress(pool, cards) : null;
  return (
    <div>
      <div class="subhead">
        <button class="bk" onClick={back} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button>
        <div><h2>Whose track?</h2><small>A field photo, four names. Hints if you need them.</small></div>
      </div>
      <div class="card">
        <b>What to practise</b>
        <div class="seg" style="margin:10px 0 8px">
          <button class={kind === 'track' ? 'on' : ''} onClick={() => { setKind('track'); keep('spoorquiz-kind', 'track'); }}>Tracks</button>
          <button class={kind === 'scat' ? 'on' : ''} onClick={() => { setKind('scat'); keep('spoorquiz-kind', 'scat'); }}>Dung</button>
        </div>
        {p && (
          <div class="qprog">
            <span class="bar"><i class="k" style={`width:${(100 * p.known) / Math.max(1, p.total)}%`} /><i class="l" style={`width:${(100 * p.learning) / Math.max(1, p.total)}%`} /></span>
            <div class="legend"><span><i class="k" />{p.known} known</span><span><i class="l" />{p.learning} learning</span><span><i />{p.fresh} new</span>{p.due > 0 && <span class="due">{p.due} due today</span>}</div>
          </div>
        )}
        <p class="muted small" style="margin:8px 0 0">{pool.length} species with {kind === 'track' ? 'track' : 'dung'} photos. The photos come with the “Track and dung photos” pack in Settings when you are offline.</p>
      </div>
      <button class="btn block" style="padding:14px;font-size:16px;margin-top:4px" disabled={!cards || pool.length < 4} onClick={() => setRound(pickRound(pool, cards!, ROUND))}>Start · {Math.min(ROUND, pool.length)} photos</button>
      <p class="muted small" style="text-align:center;margin:10px 0 0">Missed ones come back sooner, known ones later. <button class="linkbtn" onClick={reset}>Reset progress</button></p>
    </div>
  );
}

interface Answered { pick: string; v: Verdict }

function Round({ list, cards, signs, book, all, onDone }: { list: Item[]; cards: Map<string, QuizCard>; signs: Record<string, SignPhoto[]>; book: Record<string, BookSpoor>; all: Spoor[]; onDone: (c: Map<string, QuizCard>) => void }) {
  const [i, setI] = useState(0);
  const [hint, setHint] = useState(0);
  const [ans, setAns] = useState<Answered | null>(null);
  const [score, setScore] = useState({ right: 0, close: 0, wrong: 0 });
  const [queue, setQueue] = useState(list);
  const requeued = useRef(new Set<string>());
  const [imgFail, setImgFail] = useState(false);
  const it = queue[i];
  // photo and options are drawn once per question
  const q = useMemo(() => {
    if (!it) return null;
    const ph = signs[it.e.id].filter((p) => p.kind === it.kind);
    const photo = ph[Math.floor(Math.random() * ph.length)];
    const wrong = distractors(it.e, all);
    return { photo, options: shuffle([it.e.id, ...wrong]), struck: shuffle([...wrong]).slice(0, 2) };
  }, [it?.id, i]);
  useEffect(() => { setHint(0); setAns(null); setImgFail(false); }, [i]);

  if (!it || !q) {
    const n = score.right + score.close + score.wrong;
    return (
      <div>
        <div class="subhead"><button class="bk" onClick={() => onDone(cards)} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button><div><h2>Round over</h2><small>{n} answers</small></div></div>
        <div class="card qsum">
          <div><b class="ok">{score.right}</b><span>right</span></div>
          <div><b class="mid">{score.close}</b><span>with hints</span></div>
          <div><b class="bad">{score.wrong}</b><span>missed</span></div>
        </div>
        <button class="btn block" style="padding:14px;font-size:16px" onClick={() => onDone(cards)}>Back to the quiz</button>
      </div>
    );
  }

  const e = it.e;
  const hints: preact.ComponentChildren[] = it.kind === 'track'
    ? [`${lookLabel(e)} · ${e.toes} ${e.shape === 'cloven' ? 'hoof halves' : e.toes === 1 ? 'hoof' : 'toes'} · ${claws(e)}`,
      `Front print about ${e.front.l} cm long, hind ${e.hind.l} cm`,
      <SpoorCard e={e} book={book[e.id]} />]
    : [`Left by ${looksOf(e).map((l) => ANIMAL[l]).join(' or ')}`,
      e.dung ? redact(e.dung.split(/(?<=\.)\s/).slice(0, 2).join(' '), e.id) : 'No description of the dung',
      `Its print: ${lookLabel(e).toLowerCase()}, front about ${e.front.l} cm`];
  const maxHint = hints.length + 1;   // the last step strikes out two wrong names
  const struck = hint >= maxHint ? q.struck : [];

  async function answer(pick: string) {
    if (ans) return;
    const ok = pick === e.id;
    const v: Verdict = ok ? (hint === 0 ? 'right' : 'close') : 'wrong';
    setAns({ pick, v });
    setScore((sc) => ({ ...sc, [v]: sc[v] + 1 }));
    cards.set(it.id, await record(it.id, cards.get(it.id), v));
    if (!ok && !requeued.current.has(it.id) && list.length > 1) { requeued.current.add(it.id); setQueue((qq) => [...qq, it]); }
  }
  // what tells the picked one from the right one, from either sheet
  const why = ans && ans.pick !== e.id ? (e.why?.[ans.pick] || spoorById.get(ans.pick)?.why?.[e.id]) : null;
  const tone = ans ? (ans.v === 'right' ? 'ok' : ans.v === 'close' ? 'mid' : 'bad') : '';
  const p = q.photo;
  return (
    <div class="quiz">
      <div class="qtop">
        <button class="bk" onClick={() => onDone(cards)} aria-label="Stop"><Icon name="x" size={18} stroke={2.4} /></button>
        <span class="bar"><i style={`width:${(100 * i) / queue.length}%`} /></span>
        <span class="n">{i + 1} / {queue.length}</span>
      </div>

      <div class="qphoto" style={`aspect-ratio:${p.w}/${Math.max(p.h, p.w * 0.7)}`}>
        {!imgFail ? <img key={p.file} src={dataUrl(p.file)} alt="" onError={() => setImgFail(true)} /> : <div class="noimg">Photo not on the phone: download the “Track and dung photos” pack in Settings.</div>}
        <span class="cred">{p.author} · {p.license}</span>
      </div>

      <div class="qopts">
        {q.options.map((id) => {
          const s = byId.value.get(id);
          const u = s && thumbUrl(s);
          const cls = ans ? (id === e.id ? ' ok' : id === ans.pick ? ' bad' : ' dim') : struck.includes(id) ? ' out' : '';
          return (
            <button class={'qopt' + cls} disabled={!!ans || struck.includes(id)} onClick={() => answer(id)}>
              {ans && u ? <i style={`background-image:url(${u})`} /> : null}<span>{short(id)}</span>
            </button>
          );
        })}
      </div>

      {!ans ? (
        <>
          <div class="qbtns">
            <button class="btn secondary" disabled={hint >= maxHint} onClick={() => setHint(hint + 1)}>{hint === 0 ? 'Hint' : hint >= maxHint ? 'No more hints' : `Another hint (${hint}/${maxHint})`}</button>
          </div>
          {hint > 0 && <div class="qhint">{hints.slice(0, hint).map((h) => <div>{h}</div>)}{hint >= maxHint && <div>Two wrong names struck out.</div>}</div>}
        </>
      ) : (
        <div class={'card qres ' + tone}>
          <div class="verdict">{ans.v === 'right' ? 'Right' : ans.v === 'close' ? 'Right, with hints' : `Not the ${short(ans.pick).toLowerCase()}`}</div>
          <div class="who"><b>{short(e.id)}</b>{(() => { const fr = byId.value.get(e.id)?.fr; return fr && fr.toLowerCase() !== short(e.id).toLowerCase() ? <span>{fr}</span> : null; })()}</div>
          {why && <p class="tx"><b>{short(ans.pick)} or {short(e.id).toLowerCase()}?</b> {why}</p>}
          {it.kind === 'track' && <SpoorCard e={e} book={book[e.id]} />}
          {it.kind === 'scat' && e.dung && <p class="tx">{e.dung}</p>}
          <div class="qbtns" style="margin-top:12px">
            <a class="btn secondary" href={href('species/' + e.id)}>Species page</a>
            <button class="btn" style="flex:2" onClick={() => setI(i + 1)}>{i + 1 >= queue.length ? 'Finish' : 'Next'}<Icon name="chevron-right" size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
