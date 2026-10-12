import { db } from '../db';
import type { Species, QuizCard } from '../types';
import type { Verdict } from './match';
export { judge, type Verdict } from './match';

/* ---------- spaced repetition (Leitner) ---------- */

const DAY = 86400e3;
/** Delay before asking again, per box after the answer. */
const GAP = [10 * 60e3, DAY, 3 * DAY, 7 * DAY, 21 * DAY, 60 * DAY];

export async function loadCards(): Promise<Map<string, QuizCard>> {
  return new Map((await db.quiz.toArray()).map((c) => [c.speciesId, c]));
}

/** Record an answer and return the updated card. */
export async function record(speciesId: string, prev: QuizCard | undefined, v: Verdict): Promise<QuizCard> {
  const now = Date.now();
  const box = v === 'right' ? Math.min(GAP.length - 1, (prev?.box ?? 0) + 1) : v === 'close' ? Math.max(0, (prev?.box ?? 0)) : 0;
  const card: QuizCard = { speciesId, box, due: now + (v === 'right' ? GAP[box] : GAP[0]), asked: (prev?.asked ?? 0) + 1, right: (prev?.right ?? 0) + (v === 'right' ? 1 : 0), last: now };
  await db.quiz.put(card);
  return card;
}

export async function resetCards() { await db.quiz.clear(); }

/** Build a round: species due for review first, then never-asked ones, then the rest (those known best last), shuffled a little. */
export function pickRound(pool: Species[], cards: Map<string, QuizCard>, n: number): Species[] {
  const now = Date.now();
  const due: Species[] = [], fresh: Species[] = [], later: Species[] = [];
  for (const s of pool) {
    const c = cards.get(s.id);
    if (!c) fresh.push(s);
    else if (c.due <= now) due.push(s);
    else later.push(s);
  }
  shuffle(due); shuffle(fresh);
  // not yet due: the ones with the lowest box (least known) first
  later.sort((a, b) => (cards.get(a.id)!.box - cards.get(b.id)!.box) || (cards.get(a.id)!.due - cards.get(b.id)!.due));
  return [...due, ...fresh, ...later].slice(0, n);
}

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Summary for the quiz home: how many species are in each state. */
export function progress(pool: Species[], cards: Map<string, QuizCard>) {
  const now = Date.now();
  let known = 0, learning = 0, due = 0, fresh = 0;
  for (const s of pool) {
    const c = cards.get(s.id);
    if (!c) fresh++;
    else if (c.box >= 3) known++;
    else learning++;
    if (c && c.due <= now) due++;
  }
  return { known, learning, due, fresh, total: pool.length };
}
