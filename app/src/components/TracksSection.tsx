import { useEffect, useState } from 'preact/hooks';
import { byId, thumbUrl, dataUrl } from '../data';
import { href } from '../router';
import { Icon } from './Icon';
import { SpoorCard, SpoorMini, bookDims, bookFront } from './Spoor';
import type { BookSpoor } from './Spoor';
import { spoorById, SHAPE_LABEL } from '../learn/tracks';
import type { Spoor } from '../learn/tracks';

/** A field photo of a track or dung (iNaturalist, Creative Commons), from data/out/signs/index.json. */
export interface SignPhoto { file: string; kind: 'track' | 'scat'; w: number; h: number; author: string; license: string; source: string }

let cache: Record<string, SignPhoto[]> | null = null;
export async function loadSigns(): Promise<Record<string, SignPhoto[]>> {
  if (cache) return cache;
  try { cache = await (await fetch(dataUrl('signs/index.json'))).json(); } catch { cache = {}; }
  return cache!;
}

/** The prints traced from the field guide, all species in one file (about 300 KB), fetched once. */
let bookCache: Record<string, BookSpoor> | null = null;
let bookPromise: Promise<Record<string, BookSpoor>> | null = null;
export function loadBook(): Promise<Record<string, BookSpoor>> {
  if (bookCache) return Promise.resolve(bookCache);
  if (!bookPromise) bookPromise = fetch(dataUrl('spoor/paths.json')).then((r) => r.json()).catch(() => ({})).then((j) => (bookCache = j));
  return bookPromise;
}

/** Swipeable strip of field photos with a lightbox and the photographer's credit. */
function SignGallery({ photos, label }: { photos: SignPhoto[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  const p = open != null ? photos[open] : null;
  return (
    <>
      <div class="gallery signs">
        {/* offline without the signs pack the photo is not there: drop its button rather than show a broken image */}
        {photos.map((ph, i) => <button key={ph.file} onClick={() => setOpen(i)} aria-label={label}><img src={dataUrl(ph.file)} alt="" loading="lazy" onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')} /></button>)}
      </div>
      {p && (
        <div class="lightbox" onClick={() => setOpen(null)}>
          <button class="x" aria-label="Close"><Icon name="x" size={20} /></button>
          <img src={dataUrl(p.file)} alt={label} />
          <div class="cred">{p.author || 'unknown author'} · {p.license} · <a href={p.source} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>iNaturalist</a></div>
        </div>
      )}
    </>
  );
}

const short = (en: string) => en.replace(/^(African|Common|Plains|Blue|Greater|Southern|Spotted|Black-backed|Side-striped|Chacma|Cape|Scrub|Ground|Rock|Honey|Smith's|Sharpe's) /, '');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Tracks and signs" on a mammal page: field photos, the spoor drawn to scale with its measurements, the trail, the lookalikes
    at one shared scale with what tells them apart, the dung, the other signs. Only species with a full entry get the section. */
export function TracksSection({ id }: { id: string }) {
  const e = spoorById.get(id);
  const [signs, setSigns] = useState<SignPhoto[]>([]);
  const [book, setBook] = useState<Record<string, BookSpoor>>({});
  useEffect(() => { loadSigns().then((all) => setSigns(all[id] || [])); }, [id]);
  useEffect(() => { loadBook().then(setBook); }, []);
  if (!e) return null;
  // lookalikes we can draw (on the checklist, with a print), and the others, named only
  const cmp = (e.confuse || []).map((cid) => spoorById.get(cid)).filter((x): x is Spoor => !!x && byId.value.has(x.id));
  const named = (e.confuse || []).filter((cid) => !cmp.some((x) => x.id === cid));
  const all = [e, ...cmp];
  const frontOf = (x: Spoor) => { const b = bookFront(book[x.id]); return b ? bookDims(b) : x.front; };
  const maxL = Math.max(...all.map((x) => frontOf(x).l));
  const S = Math.min(6, 64 / maxL), h = Math.round(maxL * S) + 8;
  const tracks = signs.filter((p) => p.kind === 'track'), scats = signs.filter((p) => p.kind === 'scat');
  const nameOf = (cid: string) => { const s = byId.value.get(cid); return s ? short(s.en) : cap(cid.replace(/-/g, ' ')); };
  const claws = e.clawsNote ? (e.clawsNote === 'n/a' ? 'none' : e.clawsNote) : e.claws ? 'show' : e.shape === 'cat' ? 'retracted, never show' : 'none';
  return (
    <>
      <div class="sec"><Icon name="paw-print" size={18} stroke={2.4} />Tracks and signs</div>
      <div class="card spoorcard">
        <SignGallery photos={tracks} label="Track photo" />
        <SpoorCard e={e} book={book[id]} />
        <div class="specs flat">
          <div><span>Print</span><b>{SHAPE_LABEL[e.shape]}</b></div>
          <div><span>Toes</span><b>{e.toes}{e.shape === 'cloven' ? ' halves' : ''}</b></div>
          <div><span>Claws</span><b>{claws}</b></div>
          <div><span>{e.shape === 'cloven' ? 'False hooves' : 'Dew claws'}</span><b>{e.dew ? 'may show' : e.shape === 'cloven' ? 'rarely' : 'none'}</b></div>
        </div>
        {e.track && <p class="tx"><b>The print.</b> {e.track}</p>}
        {e.trail && <p class="tx"><b>The trail.</b> {e.trail}</p>}
      </div>

      {(cmp.length > 0 || named.length > 0) && (
        <div class="card cmpcard">
          <b class="ttl">Easily confused with</b>{cmp.length > 0 && <span class="muted small"> · front prints at the same scale</span>}
          {cmp.length > 0 && (
            <div class="cmp">
              {all.map((x, i) => {
                const s = byId.value.get(x.id);
                if (!s) return null;
                const u = thumbUrl(s);
                const inner = <>
                  <SpoorMini e={x} S={S} h={h} book={bookFront(book[x.id])} />
                  <span class="nm">{u && <i style={`background-image:url(${u})`} />}{short(s.en)}</span>
                  <span class="sz">{frontOf(x).l} cm</span>
                </>;
                return i === 0 ? <div class="me">{inner}</div> : <a href={href('species/' + x.id)}>{inner}</a>;
              })}
            </div>
          )}
          {e.why && (
            <ul class="traits why">
              {(e.confuse || []).filter((cid) => e.why![cid]).map((cid) => <li><b>{nameOf(cid)}.</b> {e.why![cid]}</li>)}
            </ul>
          )}
        </div>
      )}

      {e.dung && (
        <div class="card">
          <b class="ttl">Dung</b>
          <SignGallery photos={scats} label="Dung photo" />
          <p class="tx" style="margin-top:6px">{e.dung}</p>
        </div>
      )}
      {e.signs && e.signs.length > 0 && (
        <div class="card"><b class="ttl">Other signs</b><ul class="traits" style="margin-top:6px">{e.signs.map((t) => <li>{t}</li>)}</ul></div>
      )}
      {e.facts && e.facts.length > 0 && (
        <div class="card"><b class="ttl">Worth knowing</b><ul class="traits" style="margin-top:6px">{e.facts.map((t) => <li>{t}</li>)}</ul></div>
      )}
      <p class="credit">Prints and measurements after Gutteridge &amp; Liebenberg, <i>Mammals of Southern Africa and their Tracks &amp; Signs</i> (Jacana, 2013), lengths measured mostly at Londolozi; the print's width is read off the drawing. Field photos: iNaturalist observers, Creative Commons, credited on each photo. Soft sand, mud and speed all change a print.</p>
    </>
  );
}
