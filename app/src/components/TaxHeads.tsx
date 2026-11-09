import { signal } from '@preact/signals';
import { familyEn, orderEn, orderName } from '../taxa';
import { taxInfo } from '../learn/taxinfo';
import { Icon } from './Icon';
import type { Species } from '../types';

/** Headers opened to show their description, by scientific name. */
const open = signal(new Set<string>());
const toggle = (k: string) => { const o = new Set(open.value); o.has(k) ? o.delete(k) : o.add(k); open.value = o; };

/** A description under a header, when it is open: what the group is, how old, what its members share. */
function Desc({ k }: { k: string }) {
  const t = taxInfo(k);
  if (!t || !open.value.has(k)) return null;
  return <div class="taxdesc">{t.ma != null && <span class="pill">split ~{t.ma} million years ago</span>}<p>{t.text}</p></div>;
}

/** Headers of a list sorted by family: the order (English name, Latin) when it changes, then the family, each with its
 *  number of species in the list. The Latin name is left out when there is no English one. A header with a description
 *  (see taxinfo.ts) opens it on a tap. */
export function TaxHeads({ list, i }: { list: Species[]; i: number }) {
  const s = list[i], p = list[i - 1];
  const newOrder = !p || p.order !== s.order;
  const newFam = newOrder || p.family !== s.family;
  if (!newFam) return null;
  const n = (k: 'order' | 'family') => list.filter((x) => x[k] === s[k]).length;
  const oEn = orderEn(s.order), fEn = familyEn(s);
  return (
    <>
      {newOrder && s.order && (
        <>
          <Head k={s.order} cls="sec listsec taxo">{oEn || orderName(s.order)}{oEn && <i>{orderName(s.order)}</i>}<span class="n">{n('order')}</span></Head>
          <Desc k={s.order} />
        </>
      )}
      <Head k={s.family || ''} cls="taxf">{fEn || 'Family unknown'}{fEn && fEn !== s.family && <i>{s.family}</i>}<span class="c">{n('family')}</span></Head>
      <Desc k={s.family || ''} />
    </>
  );
}

/** A header, a button when it has a description. */
function Head({ k, cls, children }: { k: string; cls: string; children: preact.ComponentChildren }) {
  if (!taxInfo(k)) return <div class={cls}>{children}</div>;
  const on = open.value.has(k);
  return (
    <button class={cls + ' taxbtn' + (on ? ' open' : '')} aria-expanded={on} onClick={() => toggle(k)}>
      {children}<Icon name={on ? 'chevron-up' : 'chevron-down'} size={15} stroke={2.4} />
    </button>
  );
}
