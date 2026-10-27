import { species } from '../data';
import { href } from '../router';
import { snakeInfo, DANGER_LABEL, DANGER_TONE } from '../learn/snakes';
import { plantInfo, LEAF_LABEL, KIND_LABEL, GRAZE_LABEL, VELD_LABEL } from '../learn/plants';
import { abundance } from '../learn/abundance';
import { otherInfo, WHERE_LABEL } from '../learn/others';
import { RARITY_LABEL } from '../learn/birds';
import { Icon, type IconName } from './Icon';
import { Thumb } from './Thumb';

const MONTHS = 'JFMAMJJASOND';
const RARITY_TONE = { 'very-common': ' ok', 'common': ' ok', 'uncommon': '', 'scarce': ' warn', 'rare': ' warn' };

/** Look-alikes, resolved against the checklist so that they link to their page (same card as the birds'). */
function Confuse({ list, icon }: { list: { sp: string; how: string }[]; icon: IconName }) {
  if (!list.length) return null;
  const byEn = new Map(species.value.map((s) => [s.en.toLowerCase(), s]));
  return (
    <div class="card confuse">
      <b>Not to be confused with</b>
      {list.map((c) => {
        const s = byEn.get(c.sp.toLowerCase());
        const body = <><span class="ph">{s ? <Thumb s={s} /> : <div class="thumb"><Icon name={icon} size={18} /></div>}</span><div><div class="nm">{s ? s.en : c.sp}{s?.fr ? <small> · {s.fr}</small> : null}</div><div class="how">{c.how}</div></div></>;
        return s ? <a class="cf" href={href('species/' + s.id)}>{body}</a> : <div class="cf">{body}</div>;
      })}
    </div>
  );
}

/** "Common here · our estimate": the level of a snake or tree, for the pills of the species page. */
export function LevelPill({ id }: { id: string }) {
  const a = abundance(id);
  if (!a || a.atlas) return null;
  return <span class={'pill' + RARITY_TONE[a.level]} title="Our estimate, from iNaturalist records around Pidwa and the guides">{RARITY_LABEL[a.level]} here · estimate</span>;
}

export function DangerPill({ id }: { id: string }) {
  const b = snakeInfo.value.get(id) || otherInfo.value.get(id);
  if (!b?.danger) return null;
  return <span class={'pill' + DANGER_TONE[b.danger]}>{b.danger !== 'harmless' && <Icon name="triangle-alert" size={13} stroke={2.4} />}{DANGER_LABEL[b.danger]}</span>;
}

/** What to do after a bite: the same for every venomous snake, shown under the species' own bite text. */
function FirstAid() {
  return (
    <details class="card firstaid">
      <summary><b>Snakebite first aid</b><Icon name="chevron-down" size={16} /></summary>
      <ul class="traits">
        <li>Move away from the snake. Don't try to catch or kill it: a photo from a safe distance is enough.</li>
        <li>Keep the victim calm and still, lying down. Take off rings, watches and tight things near the bite.</li>
        <li>Get to hospital as fast as possible; call the camp first. Emergency: 112 from a mobile, ambulance 10177.</li>
        <li>Pressure bandage only for mambas and non-spitting cobras: firm, from the bite over the whole limb, then splint it.</li>
        <li>If breathing fails, give mouth-to-mouth until help arrives: people survive mamba bites this way.</li>
        <li>Venom in the eyes: rinse at once with lots of water (or any bland liquid) for 10–15 minutes, don't rub.</li>
        <li>No tourniquet, no cutting, no sucking, no ice, no electric shock.</li>
      </ul>
    </details>
  );
}

export function SnakeSection({ id }: { id: string }) {
  const b = snakeInfo.value.get(id);
  if (!b) return null;
  return (
    <>
      <div class="sec">How to recognise it</div>
      <div class="card idcard">
        <div class="size"><Icon name="eye" size={16} />{b.size}</div>
        <ul class="traits">{b.keys.map((k) => <li>{k}</li>)}</ul>
        <p class="voice"><Icon name="sun" size={15} />{b.active} · {b.lives}</p>
      </div>
      <Confuse list={b.confuse} icon="snake" />
      <div class="card behave">
        <p>{b.behaviour}</p>
        <p class="memo"><Icon name="zap" size={15} />{b.memo}</p>
      </div>

      <div class="sec">Bite</div>
      <div class={'card bite ' + b.danger}>
        <div class="row" style="justify-content:space-between;gap:8px;margin-bottom:6px">
          <b>{DANGER_LABEL[b.danger]}</b>
          {b.venom && <span class="tag">{b.venom}</span>}
        </div>
        <p style="margin:0">{b.bite}</p>
      </div>
      {(b.danger === 'deadly' || b.danger === 'venomous') && <FirstAid />}
      <p class="credit">Written from Marais, <i>A Complete Guide to Snakes of Southern Africa</i> (2022) and the <a href="https://www.africansnakebiteinstitute.com" target="_blank" rel="noopener">African Snakebite Institute</a>. How common: our estimate from iNaturalist records within 60 km. Not a medical guide: after any bite, hospital.</p>
    </>
  );
}

/** Reptiles, spiders and scorpions: recognition, look-alikes, behaviour and, when there is one, the risk. */
export function OtherSection({ id }: { id: string }) {
  const b = otherInfo.value.get(id);
  if (!b) return null;
  return (
    <>
      <div class="sec">How to recognise it</div>
      <div class="card idcard">
        <div class="size"><Icon name="eye" size={16} />{b.size}</div>
        <ul class="traits">{b.keys.map((k) => <li>{k}</li>)}</ul>
        {b.voice && <p class="voice"><Icon name="audio-lines" size={15} />{b.voice}</p>}
        <p class="voice"><Icon name="sun" size={15} />{b.when.map((w) => (w === 'day' ? 'By day' : 'At night')).join(' and ')} · {b.where.map((w, i) => (i ? WHERE_LABEL[w].charAt(0).toLowerCase() + WHERE_LABEL[w].slice(1) : WHERE_LABEL[w])).join(', ')}</p>
      </div>
      <Confuse list={b.confuse} icon="bug" />
      <div class="card behave">
        <p>{b.behaviour}</p>
        <p class="memo"><Icon name="zap" size={15} />{b.memo}</p>
      </div>
      {b.bite && (
        <>
          <div class="sec">{b.cat === 'reptile' ? 'Risk' : b.danger ? 'Bite or sting' : 'Good to know'}</div>
          <div class={'card bite ' + (b.danger || 'mild')}>
            {b.danger && <div class="row" style="justify-content:space-between;gap:8px;margin-bottom:6px"><b>{DANGER_LABEL[b.danger]}</b>{b.venom && <span class="tag">{b.venom}</span>}</div>}
            <p style="margin:0">{b.bite}</p>
          </div>
        </>
      )}
      <p class="credit">Written from the standard field guides (Branch; Alexander &amp; Marais; Leeming; Dippenaar-Schoeman; Du Preez &amp; Carruthers; Picker, Griffiths &amp; Weaving; Woodhall). How common: our estimate from iNaturalist records within 60 km. Not a medical guide.</p>
    </>
  );
}

/** Twelve bars, one strip for the flowers and one for the fruit; this month ringed. */
function YearStrip({ v, label }: { v: string; label: string }) {
  const now = new Date().getMonth();
  return (
    <div class="yearrow">
      <span class="lb">{label}</span>
      <div class="monthstrip">
        {[...v].map((d, i) => <div class={'m' + (i === now ? ' now' : '')}><i class={'p' + d} /><span>{MONTHS[i]}</span></div>)}
      </div>
    </div>
  );
}

export function PlantSection({ id }: { id: string }) {
  const t = plantInfo.value.get(id);
  if (!t) return null;
  const m = new Date().getMonth();
  const now = [t.flowers[m] > '0' && (t.kind === 'grass' ? 'in seed' : 'in flower'), t.fruit[m] > '0' && 'in fruit'].filter(Boolean).join(' and ');
  return (
    <>
      <div class="sec">How to recognise it</div>
      <div class="card idcard">
        <div class="size"><Icon name="eye" size={16} />{t.size}</div>
        <ul class="traits">{t.keys.map((k) => <li>{k}</li>)}</ul>
        <p class="voice"><Icon name="tree" size={15} />{KIND_LABEL[t.kind]}{t.kind !== 'grass' && <> · {LEAF_LABEL[t.leaf]}{t.spines ? ' · thorns or spines' : ' · no thorns'}</>}{t.sanum ? ` · national tree no. ${t.sanum}` : ''}</p>
      </div>
      {t.graze && (
        <div class="card graze">
          <b class={'gv ' + t.graze}>{GRAZE_LABEL[t.graze]}</b>
          {t.veld && <p>{VELD_LABEL[t.veld]}</p>}
        </div>
      )}
      <Confuse list={t.confuse} icon="tree" />
      <div class="card behave">
        {t.animals && <p><b>Animals. </b>{t.animals}</p>}
        {t.uses && <p style={t.animals ? 'margin-top:8px' : ''}><b>People. </b>{t.uses}</p>}
        <p class="memo"><Icon name="zap" size={15} />{t.memo}</p>
      </div>

      <div class="sec">Through the year</div>
      <div class="card migr">
        <div class="row" style="justify-content:space-between;gap:8px">
          <b>{t.kind === 'grass' ? 'Seedheads' : t.flowers ? (t.fruit ? 'Flowers and fruit' : 'Flowers') : 'Fruit'}</b>
          <span class={'tag ' + (now ? 'ok' : 'off')}>{now ? cap(now) + ' now' : 'Nothing now'}</span>
        </div>
        {t.flowers && <YearStrip v={t.flowers} label={t.kind === 'grass' ? 'Seeds' : 'Flowers'} />}
        {t.fruit && <YearStrip v={t.fruit} label="Fruit" />}
        {!t.flowers && <p class="small" style="margin:8px 0 0">The flowers are hidden inside the figs, pollinated by tiny wasps.</p>}
      </div>
      <p class="credit">Written from the lowveld tree, grass and wildflower guides (Van Wyk &amp; Van Wyk, Schmidt et al., Van Oudtshoorn). Months shift with the rains. How common: our estimate.</p>
    </>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
