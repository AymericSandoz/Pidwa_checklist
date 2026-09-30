import type { IconName } from './components/Icon';

// Kinds of places you can put on the map: [key, label, icon]. Add a line here to offer a new kind.
export const PLACE_TYPES: [string, string, IconName][] = [
  ['water', 'Water', 'droplet'],
  ['hide', 'Hide / viewpoint', 'eye'],
  ['gate', 'Gate', 'fence'],
  ['camp', 'Camp', 'tent'],
  ['house', 'House', 'house'],
  ['nest', 'Nest / den', 'egg'],
  ['landmark', 'Landmark', 'signpost'],
  ['danger', 'Danger', 'triangle-alert'],
  ['other', 'Other', 'ellipsis'],
];
export const placeType = (key: string) => PLACE_TYPES.find((t) => t[0] === key) || PLACE_TYPES[PLACE_TYPES.length - 1];

/** Distance in metres and compass direction from (lat1, lon1) to (lat2, lon2). */
export function distanceTo(lat1: number, lon1: number, lat2: number, lon2: number): { m: number; dir: string } {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  const m = 2 * R * Math.asin(Math.sqrt(a));
  const y = Math.sin(dLon) * Math.cos(lat2 * r), x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLon);
  const brg = ((Math.atan2(y, x) / r) + 360) % 360;
  const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return { m, dir: DIRS[Math.round(brg / 45) % 8] };
}
export const fmtDistance = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
