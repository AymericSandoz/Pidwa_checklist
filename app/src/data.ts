import { signal, computed } from '@preact/signals';
import { db } from './db';
import type { Species, Observation, Group } from './types';

export const BASE = import.meta.env.BASE_URL; // e.g. "/Pidwa_checklist/"
export const dataUrl = (rel: string) => BASE + 'data/' + rel;

export const species = signal<Species[]>([]);
export const loaded = signal(false);
export const loadError = signal<string | null>(null);
export const byId = computed(() => new Map(species.value.map((s) => [s.id, s])));

export const observations = signal<Observation[]>([]);

export async function loadAll() {
  try {
    const r = await fetch(dataUrl('species.json'));
    if (!r.ok) throw new Error('species.json HTTP ' + r.status);
    const list = (await r.json()) as Species[];
    const coll = new Intl.Collator('en');
    list.sort((a, b) => coll.compare(a.en, b.en));
    species.value = list;
    await reloadObservations();
    loaded.value = true;
  } catch (e: any) {
    loadError.value = e.message || String(e);
  }
}

export async function reloadObservations() {
  observations.value = await db.observations.orderBy('ts').reverse().toArray();
}

export async function addObservation(o: Observation) {
  const id = await db.observations.add(o);
  await reloadObservations();
  return id;
}
export async function updateObservation(id: number, patch: Partial<Observation>) {
  await db.observations.update(id, patch);
  await reloadObservations();
}
export async function deleteObservation(id: number) {
  await db.observations.delete(id);
  await reloadObservations();
}

/** Number of observations per species id. */
export const seenCount = computed(() => {
  const m = new Map<string, number>();
  for (const o of observations.value) m.set(o.speciesId, (m.get(o.speciesId) || 0) + 1);
  return m;
});
/** First observation timestamp per species id (the "lifer" date). */
export const firstSeen = computed(() => {
  const m = new Map<string, number>();
  for (const o of observations.value) {
    const cur = m.get(o.speciesId);
    if (cur === undefined || o.ts < cur) m.set(o.speciesId, o.ts);
  }
  return m;
});
export const totals = computed(() => {
  const t: Record<Group, { seen: number; total: number }> = { bird: { seen: 0, total: 0 }, mammal: { seen: 0, total: 0 } };
  for (const s of species.value) {
    t[s.group].total++;
    if (seenCount.value.has(s.id)) t[s.group].seen++;
  }
  return t;
});

/** Primary display name (English), secondary (French). */
export const name = (s: Species) => s.en;
export const name2 = (s: Species) => s.fr || '';
export const imgUrl = (s: Species) => (s.image ? dataUrl(s.image.file) : null);
