import { signal, computed } from '@preact/signals';
import { db } from './db';
import type { Species, Observation, Group, Place } from './types';

export const BASE = import.meta.env.BASE_URL; // e.g. "/Pidwa_checklist/"
export const dataUrl = (rel: string) => BASE + 'data/' + rel;

export const species = signal<Species[]>([]);
export const loaded = signal(false);
export const loadError = signal<string | null>(null);
export const byId = computed(() => new Map(species.value.map((s) => [s.id, s])));

export const observations = signal<Observation[]>([]);
export const places = signal<Place[]>([]);

export async function loadAll() {
  try {
    const r = await fetch(dataUrl('species.json'));
    if (!r.ok) throw new Error('species.json HTTP ' + r.status);
    const list = (await r.json()) as Species[];
    const coll = new Intl.Collator('en');
    list.sort((a, b) => coll.compare(a.en, b.en));
    species.value = list;
    await reloadObservations();
    await reloadPlaces();
    loaded.value = true;
  } catch (e: any) {
    loadError.value = e.message || String(e);
  }
}

export async function reloadObservations() {
  observations.value = await db.observations.orderBy('ts').reverse().toArray();
}

export async function reloadPlaces() {
  places.value = await db.places.orderBy('ts').toArray();
  // the camp is the first place; added once, so that it can be renamed or removed like any other
  if (places.value.length === 0 && !localStorage.getItem('camp-seeded')) {
    localStorage.setItem('camp-seeded', '1');
    await db.places.add({ name: 'Askari Camp', type: 'camp', lat: -24.0648, lon: 30.55897, note: '', ts: Date.now() });
    places.value = await db.places.orderBy('ts').toArray();
  }
}
export async function addPlace(p: Place) { const id = await db.places.add(p); await reloadPlaces(); return id; }
export async function updatePlace(id: number, patch: Partial<Place>) { await db.places.update(id, patch); await reloadPlaces(); }
export async function deletePlace(id: number) { await db.places.delete(id); await reloadPlaces(); }

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
/** Small square version of the photo (data/scripts/13_thumbs.mjs), for map markers and other tiny uses. */
export const thumbUrl = (s: Species) => (s.image ? dataUrl(s.image.file.replace(/^images\//, 'thumbs/')) : null);

/** Names for an observation, whether its species is on the Pidwa checklist or an extra one (heard by sound ID). */
export function obsInfo(o: Observation): { en: string; fr: string; sci: string; group: Group; onList: boolean } {
  const s = byId.value.get(o.speciesId);
  if (s) return { en: s.en, fr: s.fr || '', sci: s.sci, group: s.group, onList: true };
  if (o.extra) return { en: o.extra.en, fr: o.extra.fr || '', sci: o.extra.sci, group: 'bird', onList: false };
  return { en: o.speciesId, fr: '', sci: '', group: 'bird', onList: false };
}
