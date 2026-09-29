import type { Species } from '../types';
import { imgUrl } from '../data';

export function Thumb({ s, class: cls = 'thumb' }: { s: Species; class?: string }) {
  const u = imgUrl(s);
  if (!u) return <div class={cls}>{s.group === 'bird' ? '🐦' : '🦌'}</div>;
  return <img class={cls} src={u} loading="lazy" decoding="async" alt="" />;
}
