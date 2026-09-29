export type Group = 'bird' | 'mammal';

export interface Species {
  id: string;
  group: Group;
  sci: string;
  en: string;
  fr: string | null;
  fr_source?: string | null;
  family: string | null;
  family_fr: string | null;
  order: string | null;
  order_fr: string | null;
  iucn: string | null;
  qid: string | null;
  wiki: { fr: string | null; en: string | null };
  summary: { fr: string | null; en: string | null };
  image: { file: string; w: number; h: number; author: string | null; license: string | null; licenseUrl: string | null; source: string | null; from?: string } | null;
  sounds: { file: string; type: string; q: string; len: string; by: string; license: string; url: string }[];
  traits: string[] | null;
  notes: string | null;
  avonet?: { mass: number | null; beak: number | null; tarsus: number | null; wing: number | null; tail: number | null; habitat: string | null; lifestyle: string | null; niche: string | null; migration: number | null; src: string } | null;
  /** BirdNET class used by sound ID; null when the species is not covered */
  bn?: { index: number; label: string; lumped: boolean; /** score on our own reference clip, 0..1 */ ref?: number | null; heardAs?: string | null } | null;
  idk?: { size: string | null; bill: string | null; legs: string | null; habitat: string | null; lifestyle: string | null; niche: string | null } | null;
}

export interface Observation {
  id?: number;
  speciesId: string;
  ts: number;            // epoch ms
  lat: number | null;
  lon: number | null;
  acc: number | null;    // GPS accuracy in metres
  count: number;
  note: string;
  photo?: Blob | null;
  /** set when the species is not on the Pidwa checklist (logged from sound ID); speciesId is then "x:<slug>" */
  extra?: { sci: string; en: string; fr: string | null } | null;
}

export interface PackFile { path: string; bytes: number }
export interface Packs { [name: string]: { files: PackFile[]; bytes: number } }
