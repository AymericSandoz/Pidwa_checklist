import Dexie, { type Table } from 'dexie';
import type { Observation } from './types';

class PidwaDB extends Dexie {
  observations!: Table<Observation, number>;
  constructor() {
    super('pidwa');
    this.version(1).stores({ observations: '++id, speciesId, ts' });
  }
}

export const db = new PidwaDB();
