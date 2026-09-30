import Dexie, { type Table } from 'dexie';
import type { Observation, Place } from './types';

class PidwaDB extends Dexie {
  observations!: Table<Observation, number>;
  places!: Table<Place, number>;
  constructor() {
    super('pidwa');
    this.version(1).stores({ observations: '++id, speciesId, ts' });
    this.version(2).stores({ observations: '++id, speciesId, ts', places: '++id, ts' });
  }
}

export const db = new PidwaDB();
