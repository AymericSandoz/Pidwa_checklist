import { signal } from '@preact/signals';

export interface Route { path: string; parts: string[]; query: URLSearchParams }

function parse(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const [p, q = ''] = h.split('?');
  const parts = p.split('/').filter(Boolean);
  return { path: parts[0] || 'list', parts, query: new URLSearchParams(q) };
}

export const route = signal<Route>(parse());
window.addEventListener('hashchange', () => { route.value = parse(); window.scrollTo(0, 0); });

export function navigate(to: string) {
  location.hash = '#/' + to.replace(/^#?\/?/, '');
}
export function back() {
  if (history.length > 1) history.back(); else navigate('list');
}
export const href = (to: string) => '#/' + to.replace(/^#?\/?/, '');
