import type { Species } from './types';

export const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const dayKey = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const fmtBytes = (b: number) => (b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' kB');
export const fmtCoord = (lat: number, lon: number) => `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
/** Reliability of sound ID for a species, from the benchmark on our reference clips. */
export const soundIdGrade = (ref: number | null | undefined): 'good' | 'fair' | 'weak' | 'yes' => (ref == null ? 'yes' : ref >= 0.5 ? 'good' : ref >= 0.15 ? 'fair' : 'weak');
/** "Dicrurus adsimilis" -> "dicrurus-adsimilis" (same rule as the data pipeline) */
export const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Accent- and case-insensitive substring match on all names. */
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function matches(sp: Species, q: string) {
  if (!q) return true;
  const n = norm(q);
  return norm(sp.en).includes(n) || norm(sp.fr || '').includes(n) || norm(sp.sci).includes(n) || norm(sp.family || '').includes(n);
}

/** Downscale a camera photo before storing it (keeps IndexedDB small). */
export async function downscalePhoto(file: File, max = 1280, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', quality));
}

// ---- labels for the derived identification classes ----------------------------
// Size classes are body-mass bands from AVONET; the labels name familiar reference birds instead of grams.
export const L = {
  size: { tiny: 'very small (sunbird, waxbill)', sparrow: 'sparrow-sized', thrush: 'thrush / bulbul-sized', dove: 'dove / roller-sized', chicken: 'francolin / guineafowl-sized', goose: 'large (eagle, goose, heron)', huge: 'very large (stork, bustard)' } as Record<string, string>,
  bill: { fine: 'thin', medium: 'medium', stout: 'thick, conical', hooked: 'hooked', gape: 'tiny, wide gape', long: 'long', 'very-long': 'very long' } as Record<string, string>,
  legs: { short: 'short', medium: 'medium', long: 'long', 'very-long': 'very long' } as Record<string, string>,
  habitat: { Forest: 'forest', Woodland: 'woodland', Shrubland: 'shrubland', Grassland: 'grassland', Wetland: 'wetland', Riverine: 'riverine', Rock: 'rocks', 'Human Modified': 'human-modified', Coastal: 'coastal', Marine: 'marine', Desert: 'desert' } as Record<string, string>,
  lifestyle: { Aerial: 'in flight', Insessorial: 'perched', Terrestrial: 'on the ground', Generalist: 'generalist', Aquatic: 'on water' } as Record<string, string>,
  niche: { Invertivore: 'insects', Frugivore: 'fruit', Granivore: 'seeds', Nectarivore: 'nectar', Omnivore: 'omnivore', Vertivore: 'vertebrates', Scavenger: 'scavenger', 'Aquatic predator': 'aquatic predator', 'Herbivore aquatic': 'aquatic plants', 'Herbivore terrestrial': 'plants' } as Record<string, string>,
  iucn: { 'least concern': 'LC', 'near threatened': 'NT', vulnerable: 'VU', endangered: 'EN', 'critically endangered': 'CR' } as Record<string, string>,
};
export const lbl = (dict: Record<string, string>, k: string | null | undefined) => (k ? dict[k] || k : '');
export const ORDER = {
  size: ['tiny', 'sparrow', 'thrush', 'dove', 'chicken', 'goose', 'huge'],
  bill: ['fine', 'medium', 'stout', 'hooked', 'gape', 'long', 'very-long'],
  legs: ['short', 'medium', 'long', 'very-long'],
  habitat: ['Woodland', 'Shrubland', 'Grassland', 'Forest', 'Wetland', 'Riverine', 'Rock', 'Human Modified'],
  lifestyle: ['Insessorial', 'Terrestrial', 'Aerial', 'Aquatic', 'Generalist'],
  niche: ['Invertivore', 'Granivore', 'Frugivore', 'Nectarivore', 'Omnivore', 'Vertivore', 'Scavenger', 'Aquatic predator', 'Herbivore aquatic', 'Herbivore terrestrial'],
};
