import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { species, byId, thumbUrl, dataUrl } from '../data';
import { back, href } from '../router';
import { familyEn, groupOf } from '../taxa';
import { Icon } from '../components/Icon';
import { loadCards, record, resetCards, pickRound, progress, shuffle, type Verdict } from '../learn/quiz';
import { birdInfo, hearScore } from '../learn/birds';
import { redact } from './SpoorQuizView';
import type { QuizCard, Species } from '../types';

// "Who's singing?": a recording, four names. The levels follow the chance of hearing the bird (hearScore), so you learn
// first what you hear every day. Practically silent birds are left out. The wrong names are the bird's look-alikes, then
// birds of the same group, then birds of the same level. Hints as in the track quiz: a right answer after a hint counts
// as "close". Progress is stored with the other quizzes, under "sound:<id>".

const ROUND = 10;
const KEY = 'sound:';
const LEVELS: [string, string, number][] = [
  ['The daily ten', 'What you hear all day, every day', 10],
  ['Around camp', 'The next voices of the bush', 15],
  ['A good ear', 'Regular, but you need to listen', 25],
  ['Birder', 'Heard less often, more look-alikes', 50],
  ['Expert', 'Quiet, scarce or just occasional', Infinity],
];

interface Item { id: string; s: Species }

/** The birds worth listening to, most heard first, cut into levels. */
function makeLevels(birds: Species[]): Item[][] {
  const info = birdInfo.value;
  const ranked = birds.filter((s) => s.sounds.length && info.has(s.id) && (info.get(s.id)!.vocal ?? 2) > 0)
    .sort((a, b) => hearScore(info.get(b.id)!) - hearScore(info.get(a.id)!))
    .map((s) => ({ id: KEY + s.id, s }));
  let from = 0;
  return LEVELS.map(([, , n]) => { const l = ranked.slice(from, from + n); from += n; return l; });
}

function distractors(s: Species, level: Item[], all: Item[]): Species[] {
  const out: Species[] = [];
  const add = (x?: Species) => { if (x && x.id !== s.id && !out.includes(x) && out.length < 3) out.push(x); };
  const inQuiz = all.map((x) => x.s);
  for (const c of shuffle([...(birdInfo.value.get(s.id)?.confuse || [])]).slice(0, 2)) add(inQuiz.find((x) => x.en.toLowerCase() === c.sp.toLowerCase()));
  shuffle(inQuiz.filter((x) => groupOf(x) === groupOf(s))).slice(0, 2).forEach((x) => { if (out.length < 2) add(x); });
  shuffle(level.map((x) => x.s)).forEach(add);
  shuffle([...inQuiz]).forEach(add);
  return out;
}

export function SoundQuizView() {
  const [cards, setCards] = useState<Map<string, QuizCard> | null>(null);
  const [round, setRound] = useState<{ list: Item[]; level: Item[] } | null>(null);
  useEffect(() => { loadCards().then(setCards); }, []);
  const levels = useMemo(() => (birdInfo.value.size ? makeLevels(species.value.filter((s) => s.group === 'bird')) : []), [species.value, birdInfo.value]);
  const all = levels.flat();

  if (round && cards) return <Round list={round.list} level={round.level} all={all} cards={cards} onDone={(c) => { setCards(c); setRound(null); }} />;

  async function reset() {
    if (!confirm('Forget your progress on bird sounds?')) return;
    await resetCards([KEY]);
    setCards(await loadCards());
  }
  return (
    <div>
      <div class="subhead">
        <button class="bk" onClick={back} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button>
        <div><h2>Who's singing?</h2><small>A recording, four names. Start with what you hear most.</small></div>
      </div>
      {cards && levels.map((l, i) => {
        const p = progress(l, cards);
        return l.length > 0 && (
          <button class="card slevel" onClick={() => setRound({ list: pickRound(l, cards, ROUND), level: l })}>
            <div class="lhead"><b>{i + 1}. {LEVELS[i][0]}</b><span class="muted small">{p.known} / {p.total}</span></div>
            <div class="muted small">{LEVELS[i][1]}</div>
            <div class="qprog">
              <span class="bar"><i class="k" style={`width:${(100 * p.known) / Math.max(1, p.total)}%`} /><i class="l" style={`width:${(100 * p.learning) / Math.max(1, p.total)}%`} /></span>
              {p.due > 0 && <div class="legend"><span class="due">{p.due} due today</span></div>}
            </div>
          </button>
        );
      })}
      <p class="muted small" style="text-align:center;margin:10px 0 0">Levels are an estimate: atlas rate around Pidwa x how much the bird calls. Offline, the recordings need the sound pack in <a href={href('settings')}>Settings</a>. <button class="linkbtn" onClick={reset}>Reset progress</button></p>
    </div>
  );
}

interface Answered { pick: string; v: Verdict }

function Round({ list, level, all, cards, onDone }: { list: Item[]; level: Item[]; all: Item[]; cards: Map<string, QuizCard>; onDone: (c: Map<string, QuizCard>) => void }) {
  const [i, setI] = useState(0);
  const [hint, setHint] = useState(0);
  const [ans, setAns] = useState<Answered | null>(null);
  const [score, setScore] = useState({ right: 0, close: 0, wrong: 0 });
  const [queue, setQueue] = useState(list);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const requeued = useRef(new Set<string>());
  const audio = useRef<HTMLAudioElement>(null);
  const it = queue[i];
  // recording and options are drawn once per question
  const q = useMemo(() => {
    if (!it) return null;
    const wrong = distractors(it.s, level, all);
    return { sound: it.s.sounds[Math.floor(Math.random() * it.s.sounds.length)], options: shuffle([it.s, ...wrong]), struck: shuffle([...wrong]).slice(0, 2).map((x) => x.id) };
  }, [it?.id, i]);
  useEffect(() => {
    setHint(0); setAns(null); setFailed(false);
    const a = audio.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});   // a browser may refuse: the big button is there
    return () => a.pause();
  }, [i, q?.sound.file]);

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
        <button class="btn block" style="padding:14px;font-size:16px" onClick={() => onDone(cards)}>Back to the levels</button>
      </div>
    );
  }

  const s = it.s;
  const voice = birdInfo.value.get(s.id)?.voice;
  const hints = [`Family: ${familyEn(s) || s.family}`, ...(voice ? [redact(voice, s.id)] : [])];
  const maxHint = hints.length + 1;   // the last step strikes out two wrong names
  const struck = hint >= maxHint ? q.struck : [];

  function toggle() {
    const a = audio.current!;
    if (!a.paused) { a.pause(); return; }
    setFailed(false);
    a.play().catch(() => setFailed(true));
  }
  async function answer(pick: string) {
    if (ans) return;
    const ok = pick === s.id;
    const v: Verdict = ok ? (hint === 0 ? 'right' : 'close') : 'wrong';
    setAns({ pick, v });
    setScore((sc) => ({ ...sc, [v]: sc[v] + 1 }));
    cards.set(it.id, await record(it.id, cards.get(it.id), v));
    if (!ok && !requeued.current.has(it.id) && list.length > 1) { requeued.current.add(it.id); setQueue((qq) => [...qq, it]); }
  }
  const tone = ans ? (ans.v === 'right' ? 'ok' : ans.v === 'close' ? 'mid' : 'bad') : '';
  const picked = ans && byId.value.get(ans.pick);
  return (
    <div class="quiz">
      <div class="qtop">
        <button class="bk" onClick={() => onDone(cards)} aria-label="Stop"><Icon name="x" size={18} stroke={2.4} /></button>
        <span class="bar"><i style={`width:${(100 * i) / queue.length}%`} /></span>
        <span class="n">{i + 1} / {queue.length}</span>
      </div>

      <div class="qplay">
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} size={30} stroke={2.4} /></button>
        <span>{failed ? 'Not on this phone yet: download the sound pack in Settings.' : ans ? `${q.sound.type || 'recording'} · ${q.sound.by} · xeno-canto` : 'Listen, as many times as you like'}</span>
      </div>
      <audio ref={audio} key={q.sound.file} preload="auto" src={dataUrl(q.sound.file)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setFailed(true)} />

      <div class="qopts">
        {q.options.map((x) => {
          const u = thumbUrl(x);
          const cls = ans ? (x.id === s.id ? ' ok' : x.id === ans.pick ? ' bad' : ' dim') : struck.includes(x.id) ? ' out' : '';
          return (
            <button class={'qopt' + cls} disabled={!!ans || struck.includes(x.id)} onClick={() => answer(x.id)}>
              {ans && u ? <i style={`background-image:url(${u})`} /> : null}<span>{x.en}</span>
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
          <div class="verdict">{ans.v === 'right' ? 'Right' : ans.v === 'close' ? 'Right, with hints' : `Not the ${picked?.en}`}</div>
          <div class="who"><b>{s.en}</b>{s.fr && <span>{s.fr}</span>}</div>
          {voice && <p class="tx">{voice}</p>}
          <div class="qbtns" style="margin-top:12px">
            <a class="btn secondary" href={href('species/' + s.id)}>Species page</a>
            <button class="btn" style="flex:2" onClick={() => setI(i + 1)}>{i + 1 >= queue.length ? 'Finish' : 'Next'}<Icon name="chevron-right" size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
