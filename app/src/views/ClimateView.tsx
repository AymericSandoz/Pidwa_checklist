import { byId, thumbUrl } from '../data';
import { back, href } from '../router';
import { Icon } from '../components/Icon';
import { INTRO, KNOWN, ALREADY, ALREADY_NOTE, DROUGHT_WHAT, HOT_DAYS, TOLL, TOLL_TILES, CHANGED_SINCE, WHY_FEWER, DURING, AFTER, LESSONS, PLANTS, ANIMALS, UNKNOWN, CLIMATE_SOURCES } from '../learn/climate';

/** Chapter "Climate change": what is known, the 2015-16 Kruger drought in detail, then plants and animals. */
export function ClimateView() {
  const maxDays = Math.max(...HOT_DAYS.map((h) => h.n));
  const maxToll = Math.max(...TOLL.map((t) => Math.abs(t.n)));
  return (
    <div>
      <div class="subhead">
        <button class="bk" onClick={back} aria-label="Back"><Icon name="chevron-left" size={20} stroke={2.4} /></button>
        <div><h2>Climate change</h2><small>Southern Africa, and what one hot drought did to Kruger</small></div>
      </div>

      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{INTRO}</p></div>

      <div class="sec">How much is known</div>
      <div class="tiles">{KNOWN.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>

      <div class="sec">What has already changed</div>
      <div class="tiles">{ALREADY.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{ALREADY_NOTE}</p></div>

      <div class="sec">Kruger, 2015 and 2016</div>
      <div class="card tl">{DROUGHT_WHAT.map((s) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{s.t}</strong><p>{s.d}</p></div></div>)}</div>
      <div class="card" style="padding:10px 14px 6px">
        <b>Days above 40 °C at Skukuza</b>
        {HOT_DAYS.map((h) => <div class="cty"><span>{h.l}</span><b>{h.n}</b><span class="b"><i class="hot" style={`width:${(100 * h.n) / maxDays}%`} /></span></div>)}
      </div>

      <div class="sec">Who died</div>
      <div class="card" style="padding:10px 14px 6px">
        <b>Change in numbers over each drought</b>
        {TOLL.map((t) => <div class="cty"><span>{t.l}<small>{t.note}</small></span><b>{t.n > 0 ? '+' : '−'}{Math.abs(t.n)} %</b><span class="b"><i class={t.n > 0 ? '' : 'loss'} style={`width:${(100 * Math.abs(t.n)) / maxToll}%`} /></span></div>)}
        <p class="muted small" style="margin:8px 0 4px;line-height:1.4">Red is a loss, green a gain. In 2015 the park held more buffalo than ever, yet lost a smaller share than in 1991.</p>
      </div>
      <div class="tiles">{TOLL_TILES.map((t) => <div class="tile"><b>{t.n}</b><span>{t.l}</span><small>{t.s}</small></div>)}</div>

      <div class="sec">What the park had changed since 1991</div>
      <div class="card"><p class="muted" style="margin:0;line-height:1.45">{CHANGED_SINCE}</p></div>
      <div class="card tl">{WHY_FEWER.map((s, i) => <div class="tle" style="grid-template-columns:22px 1fr"><b>{i + 1}</b><div><strong>{s.t}</strong><p>{s.d}</p></div></div>)}</div>

      <div class="sec">What the park did during the drought</div>
      <div class="card tl">{DURING.map((s) => <div class="tle" style="grid-template-columns:22px 1fr"><b style={s.ok ? '' : 'color:var(--muted)'}><Icon name={s.ok ? 'check' : 'triangle-alert'} size={16} stroke={s.ok ? 3 : 2.4} /></b><div><strong>{s.t}</strong><p>{s.d}</p></div></div>)}</div>

      <div class="sec">Afterwards</div>
      <div class="card tl">{AFTER.map((s) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{s.t}</strong><p>{s.d}</p></div></div>)}</div>
      <div class="card">
        <b>What it taught</b>
        <ul class="fixes">{LESSONS.map((l) => <li><Icon name="check" size={14} stroke={3} />{l}</li>)}</ul>
      </div>

      <div class="sec">Plants</div>
      <div class="card tl">{PLANTS.map((s) => <div class="tle" style="grid-template-columns:1fr"><div><strong>{s.t}</strong><p>{s.d}</p></div></div>)}</div>
      <a class="card row" href={href('learn/bush')} style="justify-content:space-between"><b>Bush encroachment</b><Icon name="chevron-right" size={18} /></a>

      <div class="sec">Animals</div>
      <div class="card" style="padding:4px 14px">
        {ANIMALS.map((a) => {
          const s = a.id ? byId.value.get(a.id) : undefined; const u = s && thumbUrl(s);
          return (
            <div class="diet">
              {s ? <div class="who" style="margin:0"><a href={href('species/' + s.id)}>{u ? <i style={`background-image:url(${u})`} /> : <i />}<span style="font-size:14px;font-weight:800">{a.t}</span></a></div> : <b>{a.t}</b>}
              <p>{a.d}</p>
            </div>
          );
        })}
      </div>

      <div class="sec">What is not known</div>
      <div class="card"><ul class="fixes" style="margin:0">{UNKNOWN.map((l) => <li><Icon name="x" size={14} stroke={3} />{l}</li>)}</ul></div>

      <div class="card"><b>Where this comes from</b>
        <ul class="srcs">{CLIMATE_SOURCES.map((s) => <li>{s.url ? <a href={s.url} target="_blank" rel="noopener">{s.t}<Icon name="chevron-right" size={13} /></a> : s.t}</li>)}</ul>
      </div>
    </div>
  );
}
