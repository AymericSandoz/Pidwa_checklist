import type { Species } from '../types';

/* ---------- lenient name matching ----------
 * The learner types a name; we want to be generous: accents, case, hyphens, articles, plurals and a few
 * typos must not count as a mistake. English, French and scientific names are all accepted. */

const ARTICLES = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'the', 'a', 'an', 'of']);
/** "L'Aigle ravisseur" -> ["aigle", "ravisseur"] */
export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’`´]s\b/g, '')          // possessive: Abdim's -> abdim
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !ARTICLES.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)); // crude plural
}

/** Levenshtein distance, early exit above `max`. */
export function lev(a: string, b: string, max = 99): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How many typos a word of this length may have and still count. */
const slack = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : 3);
const wordOk = (a: string, b: string) => lev(a, b, 3) <= slack(Math.max(a.length, b.length));

export type Verdict = 'right' | 'close' | 'wrong';

/** All names the species may be called. */
export function namesOf(s: Species): string[] {
  const out = [s.en, s.sci];
  if (s.fr) out.push(s.fr);
  return out;
}

/** Does the answer fit this species: every typed word matches a word of one of its names (typos allowed)? */
export function covers(a: string[], s: Species): boolean {
  const joinedA = a.join('');
  for (const name of namesOf(s)) {
    const t = tokens(name);
    if (!t.length) continue;
    const joinedT = t.join('');
    if (lev(joinedA, joinedT, 2) <= Math.min(2, slack(joinedT.length))) return true; // spaces and hyphens ignored; at most 2 typos, or "black" could pass for "palm"
    if (a.every((w) => t.some((x) => wordOk(w, x)))) return true;
  }
  return false;
}

/** Compare a typed answer with a species. The answer is right when it fits the species and no other one on the
 * list ("kudu" is enough for the greater kudu, "dove" is not enough for the laughing dove), "close" when part of
 * the name was right (the genus, "aigle", "hornbill"…), "wrong" otherwise. */
export function judge(answer: string, s: Species, all: Species[]): Verdict {
  const a = tokens(answer);
  if (!a.length) return 'wrong';
  // the exact name, in any of the languages, is always right
  if (namesOf(s).some((n) => { const t = tokens(n); return t.length === a.length && t.every((w, i) => w === a[i]); })) return 'right';
  if (covers(a, s)) return all.some((o) => o.id !== s.id && covers(a, o)) ? 'close' : 'right';
  for (const name of namesOf(s)) {
    const t = tokens(name);
    if (a.some((w) => w.length >= 4 && t.some((x) => x.length >= 4 && wordOk(w, x)))) return 'close';
  }
  return 'wrong';
}
