import Dexie, { type Table } from 'dexie';
import type { Observation, Place, QuizCard } from './types';

class PidwaDB extends Dexie {
  observations!: Table<Observation, number>;
  places!: Table<Place, number>;
  quiz!: Table<QuizCard, string>;
  constructor() {
    super('pidwa');
    this.version(1).stores({ observations: '++id, speciesId, ts' });
    this.version(2).stores({ observations: '++id, speciesId, ts', places: '++id, ts' });
    this.version(3).stores({ observations: '++id, speciesId, ts', places: '++id, ts', quiz: 'speciesId, due' });
  }
}

export const db = new PidwaDB();
