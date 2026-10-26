import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { species, seenCount, dataUrl, imgUrl } from '../data';
import { back, href } from '../router';
import { Icon } from '../components/Icon';
import { familyEn, GROUPS, GROUP_LABEL } from '../taxa';
import { judge, loadCards, record, resetCards, pickRound, progress, type Verdict } from '../learn/quiz';
import type { Species, QuizCard, Group } from '../types';

const ROUND = 10;
type Scope = 'seen' | 'all';
type Groups = 'both' | Group;
const pref = <T extends string>(k: string, d: T): T => { try { return (localStorage.getItem(k) as T) || d; } catch { return d; } };
const keep = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

/** A photo of the species for the card: the main photo or one of the extra ones (photos pack), at random. */
function somePhoto(s: Species) {
  const all = [...(s.image ? [s.image] : []), ...s.photos];
  return all.length ? all[Math.floor(Math.random() * all.length)] : null;
}
/** The recording to play with the photo: a song if there is one, else the first. */
const someSound = (s: Species) => s.sounds.find((x) => /song/.test(x.type)) || s.sounds[0] || null;

export function QuizView() {
  // "seen by me" only makes sense once the journal has something in it
  const [scope, setScope] = useState<Scope>(pref('quiz-scope', seenCount.value.size ? 'seen' : 'all'));
  const [groups, setGroups] = useState<Groups>(pref('quiz-groups', 'both'));
  const [sound, setSound] = useState(pref('quiz-sound', 'on') === 'on');
  const [cards, setCards] = useState<Map<string, QuizCard> | null>(null);
  const [round, setRound] = useState<Species[] | null>(null);
  const [havePack, setHavePack] = useState(true);

  useEffect(() => { loadCards().then(setCards); }, []);
  useEffect(() => { caches.open('pack-photos').then((c) => c.keys()).then((k) => setHavePack(k.length > 0)).catch(() => {}); }, []);

  const pool = useMemo(() => species.value.filter((s) => (groups === 'both' || s.group === groups) && (scope === 'all' || seenCount.value.has(s.id)) && (s.image || s.photos.length)), [scope, groups, species.value, seenCount.value]);

  function start() {
    if (!cards) return;
    setRound(pickRound(pool, cards, ROUND));
  }
  async function reset() {
    if (!confirm('Forget everything the quiz knows about your progress?')) return;
    await resetCards();
    setCards(new Map());
  }
  function choose<T extends string>(k: string, v: T, set: (v: T) => void) { set(v); keep(k, v); }

  if (round && cards) return <Round list={round} cards={cards} sound={sound} onDone={(c) => { setCards(c); setRound(null); }} />;

  const p = cards ? progress(pool, cards) : null;
  return (
    <div>
      <div class="subhead">
        <button class="bk" onClick={back} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button>
        <div><h2>Quiz</h2><small>A photo, you name it. Typos forgiven.</small></div>
      </div>

      <div class="card">
        <b>Which species</b>
        <div class="seg" style="margin:10px 0 8px">
          <button class={scope === 'seen' ? 'on' : ''} onClick={() => choose('quiz-scope', 'seen', setScope)}>Seen by me</button>
          <button class={scope === 'all' ? 'on' : ''} onClick={() => choose('quiz-scope', 'all', setScope)}>Whole checklist</button>
        </div>
        <div class="seg">
          <button class={groups === 'both' ? 'on' : ''} onClick={() => choose('quiz-groups', 'both', setGroups)}>All</button>
          {GROUPS.map((g) => <button class={groups === g ? 'on' : ''} onClick={() => choose('quiz-groups', g, setGroups)}>{GROUP_LABEL[g]}</button>)}
        </div>
        {p && (
          <div class="qprog">
            <span class="bar"><i class="k" style={`width:${(100 * p.known) / Math.max(1, p.total)}%`} /><i class="l" style={`width:${(100 * p.learning) / Math.max(1, p.total)}%`} /></span>
            <div class="legend"><span><i class="k" />{p.known} known</span><span><i class="l" />{p.learning} learning</span><span><i />{p.fresh} new</span>{p.due > 0 && <span class="due">{p.due} due today</span>}</div>
          </div>
        )}
        {pool.length === 0 && <p class="muted small" style="margin:8px 0 0">{scope === 'seen' ? 'Nothing seen yet in this group: log a few observations first, or switch to the whole checklist.' : 'No species in this group.'}</p>}
      </div>

      <label class="card row" style="justify-content:space-between;cursor:pointer">
        <div><b style="font-size:15px">Play the call with the photo</b><div class="muted small">Birds only, when the sound pack is on the phone. Ties the voice to the face.</div></div>
        <input type="checkbox" class="switch" checked={sound} onChange={(e) => { const v = (e.target as HTMLInputElement).checked; setSound(v); keep('quiz-sound', v ? 'on' : 'off'); }} />
      </label>

      {!havePack && <a class="card row" href={href('settings')} style="justify-content:space-between"><div><b style="font-size:15px">More photos per species</b><div class="muted small">With one photo you learn the photo, not the animal. Download the photos pack in Settings.</div></div><Icon name="chevron-right" size={18} /></a>}

      <button class="btn block" style="padding:14px;font-size:16px;margin-top:4px" disabled={!cards || pool.length === 0} onClick={start}>Start · {Math.min(ROUND, pool.length)} photos</button>
      <p class="muted small" style="text-align:center;margin:10px 0 0">Each species comes back sooner when missed, later when known. <button class="linkbtn" onClick={reset}>Reset progress</button></p>
    </div>
  );
}

interface Answered { v: Verdict; typed: string }

function Round({ list, cards, sound, onDone }: { list: Species[]; cards: Map<string, QuizCard>; sound: boolean; onDone: (c: Map<string, QuizCard>) => void }) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState('');
  const [hint, setHint] = useState(0);
  const [ans, setAns] = useState<Answered | null>(null);
  const [score, setScore] = useState({ right: 0, close: 0, wrong: 0 });
  const [queue, setQueue] = useState(list);          // missed species come back once at the end of the round
  const requeued = useRef(new Set<string>());
  const input = useRef<HTMLInputElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const s = queue[i];
  const photo = useMemo(() => (s ? somePhoto(s) : null), [s?.id, i]);
  const [imgFail, setImgFail] = useState(false);
  const snd = s && sound && s.group === 'bird' ? someSound(s) : null;

  useEffect(() => { setImgFail(false); setHint(0); setTyped(''); setAns(null); }, [i]);
  useEffect(() => {
    const a = audio.current;
    if (!a || !snd) return;
    a.currentTime = 0;
    a.play().catch(() => {});
    return () => { a.pause(); };
  }, [i, snd?.file]);

  async function answer(v: Verdict, t = typed) {
    if (!s || ans) return;
    setAns({ v, typed: t });
    setScore((sc) => ({ ...sc, [v]: sc[v] + 1 }));
    cards.set(s.id, await record(s.id, cards.get(s.id), v));
    if (v !== 'right' && !requeued.current.has(s.id) && list.length > 1) { requeued.current.add(s.id); setQueue((q) => [...q, s]); } // once more before the end
  }
  function next() {
    if (i + 1 >= queue.length) { setI(queue.length); return; }
    setI(i + 1);
    setTimeout(() => input.current?.focus(), 50);
  }
  const check = () => { if (s && typed.trim()) answer(judge(typed, s, species.value)); };

  if (!s) {
    const n = score.right + score.close + score.wrong;
    return (
      <div>
        <div class="subhead"><button class="bk" onClick={() => onDone(cards)} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button><div><h2>Round over</h2><small>{n} answers</small></div></div>
        <div class="card qsum">
          <div><b class="ok">{score.right}</b><span>right</span></div>
          <div><b class="mid">{score.close}</b><span>close</span></div>
          <div><b class="bad">{score.wrong}</b><span>missed</span></div>
        </div>
        <button class="btn block" style="padding:14px;font-size:16px" onClick={() => onDone(cards)}>Back to the quiz</button>
      </div>
    );
  }

  const hints = [familyEn(s) ? `Family: ${familyEn(s)}` : `Group: ${s.group}`, `Starts with “${s.en[0]}” in English${s.fr ? `, “${s.fr[0]}” in French` : ''} · ${s.en.split(/[\s-]+/).length} word${s.en.split(/[\s-]+/).length > 1 ? 's' : ''}`];
  const src = photo && !imgFail ? dataUrl(photo.file) : imgUrl(s);
  const tone = ans ? (ans.v === 'right' ? 'ok' : ans.v === 'close' ? 'mid' : 'bad') : '';
  return (
    <div class="quiz">
      <div class="qtop">
        <button class="bk" onClick={() => onDone(cards)} aria-label="Stop"><Icon name="x" size={18} stroke={2.4} /></button>
        <span class="bar"><i style={`width:${(100 * i) / queue.length}%`} /></span>
        <span class="n">{i + 1} / {queue.length}</span>
      </div>

      <div class="qphoto" style={photo ? `aspect-ratio:${photo.w}/${Math.max(photo.h, photo.w * 0.7)}` : ''}>
        {src ? <img key={src} src={src} alt="" onError={() => setImgFail(true)} /> : <div class="noimg">no photo</div>}
        {photo && <span class="cred">{photo.author || ''}{photo.license ? ' · ' + photo.license : ''}</span>}
        {snd && <span class="snd"><Icon name="audio-lines" size={14} />{snd.type.split(',')[0]}</span>}
      </div>
      {snd && <audio ref={audio} preload="auto" src={dataUrl(snd.file)} />}

      {!ans ? (
        <>
          <form class="qask" onSubmit={(e) => { e.preventDefault(); check(); }}>
            <input ref={input} type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck={false} enterkeyhint="done" placeholder="Name it, in English, French or Latin" value={typed} onInput={(e) => setTyped((e.target as HTMLInputElement).value)} />
            <button type="submit" class="btn" disabled={!typed.trim()}>Check</button>
          </form>
          <div class="qbtns">
            <button class="btn secondary" onClick={() => answer('right', '')}><Icon name="check" size={16} stroke={2.6} />I knew it</button>
            <button class="btn secondary" onClick={() => answer('wrong', '')}>I didn't</button>
            <button class="btn secondary" disabled={hint >= hints.length} onClick={() => setHint(hint + 1)}>Hint</button>
          </div>
          {hint > 0 && <div class="qhint">{hints.slice(0, hint).map((h) => <div>{h}</div>)}</div>}
        </>
      ) : (
        <div class={'card qres ' + tone}>
          <div class="verdict">{ans.v === 'right' ? 'Right' : ans.v === 'close' ? 'Close' : ans.typed ? 'Not this one' : 'Next time'}{ans.typed && <span class="typed">you wrote “{ans.typed}”</span>}</div>
          <div class="who">
            <b>{s.en}</b>
            {s.fr && <span>{s.fr}</span>}
            <em>{s.sci}</em>
            <small>{familyEn(s)}</small>
          </div>
          <div class="qbtns" style="margin-top:12px">
            <a class="btn secondary" href={href('species/' + s.id)}>Species page</a>
            <button class="btn" style="flex:2" onClick={next}>{i + 1 >= queue.length ? 'Finish' : 'Next'}<Icon name="chevron-right" size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
