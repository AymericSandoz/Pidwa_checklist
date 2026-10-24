import { signal } from '@preact/signals';
import { href } from '../router';
import { fmtBytes } from '../util';
import { packs, packState, missing, downloadAll, stopAll, PACK_SHORT } from '../packs';
import { Icon } from './Icon';

// "later" hides the banner until the app is opened again
const dismissed = signal(false);

/** Tells the user, on every screen, that sounds / map / Sound ID are not on the phone yet, and lets them fetch everything. */
export function PackBanner() {
  const m = missing.value;
  if (!packs.value || !m.keys.length) return null;
  const st = packState.value;
  if (m.busy) {
    const pct = Math.round(100 * (1 - m.left / Math.max(1, m.total)));
    return (
      <div class="packbar">
        <div class="info">
          <b>Downloading offline content… {pct}%</b>
          <span class="muted small">{fmtBytes(m.left)} left. Keep the app open.</span>
          <div class="progress"><i style={`width:${pct}%`} /></div>
        </div>
        <button class="btn sm secondary" onClick={stopAll}>stop</button>
      </div>
    );
  }
  if (dismissed.value) return null;
  const what = m.keys.map((k) => PACK_SHORT[k] || k).join(', ');
  const partial = m.keys.some((k) => st[k].cached > 0);
  return (
    <div class="packbar">
      <Icon name="download" size={20} />
      <div class="info">
        <b>{partial ? 'Offline content incomplete' : 'Offline content not downloaded'}</b>
        <span class="muted small">Without it, {what} won't work without network. {fmtBytes(m.left)}, best on Wi-Fi. <a href={href('settings')}>Details</a></span>
      </div>
      <div class="acts">
        {navigator.onLine ? <button class="btn sm" onClick={() => downloadAll()}>download</button> : <span class="small muted">no network</span>}
        <button class="link small" onClick={() => (dismissed.value = true)}>later</button>
      </div>
    </div>
  );
}
