import type { Species } from '../types';
import { imgUrl } from '../data';
import { Icon } from './Icon';
import { GROUP_ICON } from '../taxa';

export function Thumb({ s, class: cls = 'thumb' }: { s: Species; class?: string }) {
  const u = imgUrl(s);
  if (!u) return <div class={cls}><Icon name={GROUP_ICON[s.group]} size={22} /></div>;
  return <img class={cls} src={u} loading="lazy" decoding="async" alt="" />;
}
