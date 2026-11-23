import Dexie, { type Table } from 'dexie';
import type { Observation, Place, QuizCard, SpeciesNote } from './types';

/** A record deleted on this phone, still to be deleted in the cloud backup. key = "<collection>/<doc id>". */
export interface Tomb { key: string; upd: number }

/** Sync fields carried by every synced record: stable id across phones, last change, and "not in the cloud yet". */
export interface SyncFields { uid?: string; upd?: number; dirty?: 0 | 1 }

export const newUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

class PidwaDB extends Dexie {
  observations!: Table<Observation, number>;
  places!: Table<Place, number>;
  quiz!: Table<QuizCard, string>;
  notes!: Table<SpeciesNote, number>;
  tomb!: Table<Tomb, string>;
  constructor() {
    super('pidwa');
    this.version(1).stores({ observations: '++id, speciesId, ts' });
    this.version(2).stores({ observations: '++id, speciesId, ts', places: '++id, ts' });
    this.version(3).stores({ observations: '++id, speciesId, ts', places: '++id, ts', quiz: 'speciesId, due' });
    this.version(4).stores({ observations: '++id, speciesId, ts', places: '++id, ts', quiz: 'speciesId, due', notes: '++id, speciesId, ts' });
    // 5: cloud backup. Every record gets a uid (its id in the cloud), an upd time and a dirty flag.
    this.version(5)
      .stores({ observations: '++id, speciesId, ts, uid', places: '++id, ts, uid', quiz: 'speciesId, due', notes: '++id, speciesId, ts, uid', tomb: 'key' })
      .upgrade(async (tx) => {
        let camp = false;
        await tx.table('observations').toCollection().modify((o: any) => { o.uid ||= newUid(); o.upd ||= o.ts; o.dirty = 1; });
        await tx.table('notes').toCollection().modify((n: any) => { n.uid ||= newUid(); n.upd ||= n.ts; n.dirty = 1; });
        await tx.table('places').toCollection().modify((p: any) => {
          // the seeded camp has a fixed uid, so that a restored backup does not bring a second one
          if (!camp && p.type === 'camp' && p.name === 'Askari Camp') { camp = true; p.uid = 'camp'; } else p.uid ||= newUid();
          p.upd ||= p.ts; p.dirty = 1;
        });
        await tx.table('quiz').toCollection().modify((c: any) => { c.upd ||= c.last; c.dirty = 1; });
      });

    // Any write from the app marks the record dirty, so the sync sends it. The sync's own writes say dirty: 0 explicitly.
    for (const t of [this.observations, this.places, this.notes, this.quiz] as Table<any, any>[]) {
      t.hook('creating', function (_k, obj) {
        if (t !== (db.quiz as any)) obj.uid ||= newUid();
        obj.upd ||= Date.now();
        if (obj.dirty === undefined) obj.dirty = 1;
        this.onsuccess = () => onLocalChange();
      });
      t.hook('updating', function (mods: any) {
        this.onsuccess = () => onLocalChange();
        if ('dirty' in mods) return undefined;
        return { dirty: 1, upd: Date.now() };
      });
    }
  }
}

export const db = new PidwaDB();

/** Called after any local write: the sync module plugs itself in here (kept loose to avoid an import cycle). */
let changeListener: () => void = () => {};
export const setChangeListener = (f: () => void) => { changeListener = f; };
// later, outside the Dexie transaction that fired the hook (its scope does not include the tables the listener reads)
const onLocalChange = () => { setTimeout(() => changeListener(), 0); };

/** Remember that a record is gone, so the cloud copy gets deleted too. */
export async function tombstone(coll: string, id: string | undefined) {
  if (!id) return;
  await db.tomb.put({ key: `${coll}/${id}`, upd: Date.now() });
  onLocalChange();
}
