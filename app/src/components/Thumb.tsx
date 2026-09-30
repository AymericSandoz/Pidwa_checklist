import type { Species } from '../types';
import { imgUrl } from '../data';
import { Icon } from './Icon';

export function Thumb({ s, class: cls = 'thumb' }: { s: Species; class?: string }) {
  const u = imgUrl(s);
  if (!u) return <div class={cls}><Icon name={s.group === 'bird' ? 'bird' : 'paw-print'} size={22} /></div>;
  return <img class={cls} src={u} loading="lazy" decoding="async" alt="" />;
}
