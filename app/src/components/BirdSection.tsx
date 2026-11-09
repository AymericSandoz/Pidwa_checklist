import { species } from '../data';
import { href } from '../router';
import { birdInfo, STATUS_LABEL, hereNow, migKind, rarity, RARITY_LABEL, fmtCommon, birdSort, SORT_LABEL, sortFor, BIRD_ONLY_SORTS, type BirdSort } from '../learn/birds';
import type { BirdInfo } from '../learn/birds';
import { Icon } from './Icon';
import { Thumb } from './Thumb';

const MONTHS = 'JFMAMJJASOND';
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

/** Twelve bars, January to December: tall when the bird is here, short when scarce, empty when away; this month ringed. */
function MonthStrip({ b }: { b: BirdInfo }) {
  const now = new Date().getMonth();
  return (
    <div class="monthstrip">
      {b.months.map((v, i) => (
        <div class={'m' + (i === now ? ' now' : '')}>
          <i class={'p' + v} />
          <span>{MONTHS[i]}</span>
        </div>
      ))}
    </div>
  );
}

/** Migration and "how to recognise it" of a bird, when it has been researched. */
export function BirdSection({ id }: { id: string }) {
  const b = birdInfo.value.get(id);
  if (!b) return null;
  const byEn = new Map(species.value.map((s) => [s.en.toLowerCase(), s]));
  const here = hereNow(b);
  return (
    <>
      <div class="sec">How to recognise it</div>
      <div class="card idcard">
        <div class="size"><Icon name="eye" size={16} />{b.size}</div>
        <ul class="traits">{b.keys.map((k) => <li>{k}</li>)}</ul>
        {b.voice && <p class="voice"><Icon name="audio-lines" size={15} />{b.voice}</p>}
      </div>
      {b.confuse.length > 0 && (
        <div class="card confuse">
          <b>Not to be confused with</b>
          {b.confuse.map((c) => {
            const s = byEn.get(c.sp.toLowerCase());
            const body = <><span class="ph">{s ? <Thumb s={s} /> : <div class="thumb"><Icon name="bird" size={18} /></div>}</span><div><div class="nm">{s ? s.en : c.sp}{s?.fr ? <small> · {s.fr}</small> : null}</div><div class="how">{c.how}</div></div></>;
            return s ? <a class="cf" href={href('species/' + s.id)}>{body}</a> : <div class="cf">{body}</div>;
          })}
        </div>
      )}
      <div class="card behave">
        <p>{b.behaviour}</p>
        <p class="memo"><Icon name="zap" size={15} />{b.memo}</p>
      </div>

      <div class="sec">Through the year</div>
      <div class="card migr">
        <div class="row" style="justify-content:space-between;gap:8px">
          <b class="row" style="gap:7px">{migKind(b) && <span class={'migb inl ' + migKind(b)}>M</span>}{STATUS_LABEL[b.status]}</b>
          <span class={'tag ' + (here ? 'ok' : 'off')}>{here ? 'Here now' : 'Away now'}</span>
        </div>
        <MonthStrip b={b} />
        {b.migration && <p class="small" style="margin:8px 0 0">{b.migration}</p>}
      </div>
      <p class="credit">{b.atlas ? <>Months: <a href="https://sabap2.birdmap.africa" target="_blank" rel="noopener">SABAP2</a> atlas cards in the lowveld around Pidwa. </> : 'Months estimated from the sources. '}
        Sources: {b.sources.map((u, i) => <>{i ? ' · ' : ''}<a href={u} target="_blank" rel="noopener">{host(u)}</a></>)}</p>
    </>
  );
}

/** The "M" on the thumbnail of a list row (see migKind), faded when the bird is away this month. */
export function MigBadge({ id }: { id: string }) {
  const b = birdInfo.value.get(id);
  const k = b && migKind(b);
  if (!k) return null;
  return <span class={'migb ' + k + (hereNow(b!) ? '' : ' away')} title={STATUS_LABEL[b!.status]}>M</span>;
}

const RARITY_TONE = { 'very-common': ' ok', 'common': ' ok', 'uncommon': '', 'scarce': ' warn', 'rare': ' warn' };

/** The sort menu of the lists: commonest, most heard, rarest, heaviest, lightest, by family, A-Z. A chip with a native select
 *  over it, so the phone shows its own picker. Most heard, weight and family are for the birds only. */
export function SortButton({ class: cls = '', birds = true }: { class?: string; birds?: boolean }) {
  const v = sortFor(birdSort.value, birds);
  const opts = (Object.keys(SORT_LABEL) as BirdSort[]).filter((k) => birds || !BIRD_ONLY_SORTS.includes(k));
  return (
    <label class={'chip sortbtn ' + cls + (v !== 'az' ? ' on' : '')}>
      <Icon name="arrow-down-up" size={14} stroke={2.4} />{SORT_LABEL[v]}
      <select aria-label="Sort" value={v} onChange={(e) => { birdSort.value = (e.target as HTMLSelectElement).value as BirdSort; localStorage.setItem('list-sort', birdSort.value); }}>
        {opts.map((k) => <option value={k}>{SORT_LABEL[k]}</option>)}
      </select>
    </label>
  );
}

/** How common the bird is around Pidwa, for the pills of the species page. */
export function RarityPill({ id }: { id: string }) {
  const b = birdInfo.value.get(id);
  const r = b && rarity(b);
  if (!r) return null;
  return <span class={'pill' + RARITY_TONE[r]} title="Share of the SABAP2 atlas cards around Pidwa that list it, in its best months">{RARITY_LABEL[r]} · {fmtCommon(b!.common!)} of atlas cards</span>;
}
