// Telling the Pidwa raptors apart in the air: marks from the web sources kept per species, photos checked by eye (they really
// show the bird flying). A criterion nobody documents stays empty: the bird then stays in the results, rather than being
// ruled out on a guess. The data is its own chunk, loaded when needed. Photos: data/out/flight (on-demand "flight" pack).
import { signal } from '@preact/signals';

export type FlightGroup = 'vulture' | 'eagle' | 'mid-eagle' | 'kite' | 'hawk' | 'falcon';
export const GROUP_LABEL: Record<FlightGroup, string> = { vulture: 'Vultures', eagle: 'Big eagles', 'mid-eagle': 'Medium eagles', kite: 'Kites and buzzards', hawk: 'Goshawks and sparrowhawks', falcon: 'Falcons' };
export const GROUP_HINT: Record<FlightGroup, string> = {
  vulture: 'Huge, very broad wings; soar for hours',
  eagle: 'Big, long broad wings',
  'mid-eagle': 'Smaller eagles, often brown',
  kite: 'Medium; look at the tail',
  hawk: 'Small, short rounded wings, long tail',
  falcon: 'Long pointed wings',
};

export interface FlightPhoto { file: string; w: number; h: number; author: string; license: string; source: string }
export interface FlightInfo {
  id: string;
  group: FlightGroup;
  /** what to look for in the air, most telling first */
  marks: string[];
  /** a caution when the mark is doubtful or the sources disagree */
  doubt?: string;
  size?: string[];
  body?: string[];
  under?: string[];
  tail?: string[];
  style?: string[];
  photo?: FlightPhoto;
  sources: string[];
}

export type FlightKey = 'size' | 'body' | 'under' | 'tail' | 'style';
export const CRITERIA: [FlightKey, string, [string, string][]][] = [
  ['size', 'Size', [['small', 'Dove to pigeon'], ['medium', 'Crow to kite'], ['large', 'Big eagle'], ['huge', 'Huge']]],
  ['body', 'Body from below', [['brown', 'Brown'], ['dark', 'Black or very dark'], ['pale', 'White or pale'], ['grey', 'Grey'], ['barred', 'Barred'], ['rufous', 'Rufous']]],
  ['under', 'Under the wings', [['all-dark', 'All dark'], ['all-pale', 'Mostly white or pale'], ['pale-rear', 'Dark front, pale rear'], ['pale-front', 'Pale front, dark rear'], ['grey', 'Grey, finely barred']]],
  ['tail', 'Tail', [['tiny', 'Almost none'], ['forked', 'Forked'], ['long-square', 'Long and square'], ['short', 'Short'], ['white', 'White'], ['band', 'One white or black band'], ['barred', 'Barred']]],
  ['style', 'How it flies', [['hover', 'Hovers'], ['rock', 'Rocks side to side'], ['high', 'Soars very high'], ['low', 'Low over the bush'], ['dash', 'Fast and dashing'], ['flock', 'In flocks']]],
];

export const flightInfo = signal(new Map<string, FlightInfo>());
let asked = false;
export function loadFlight() {
  if (asked) return;
  asked = true;
  import('./flight.data.json').then((m) => { flightInfo.value = new Map((m.default as FlightInfo[]).map((f) => [f.id, f])); });
}
