import Dexie, { type Table } from 'dexie';
import type { Observation, Place, QuizCard, SpeciesNote } from './types';

class PidwaDB extends Dexie {
  observations!: Table<Observation, number>;
  places!: Table<Place, number>;
  quiz!: Table<QuizCard, string>;
  notes!: Table<SpeciesNote, number>;
  constructor() {
    super('pidwa');
    this.version(1).stores({ observations: '++id, speciesId, ts' });
    this.version(2).stores({ observations: '++id, speciesId, ts', places: '++id, ts' });
    this.version(3).stores({ observations: '++id, speciesId, ts', places: '++id, ts', quiz: 'speciesId, due' });
    this.version(4).stores({ observations: '++id, speciesId, ts', places: '++id, ts', quiz: 'speciesId, due', notes: '++id, speciesId, ts' });
  }
}

export const db = new PidwaDB();
