import { href } from '../router';
import { offlineApp } from '../offline';
import { Icon } from './Icon';

/** While there is network and the app is not yet saved on the phone: without network it would not even open. */
export function OfflineBanner() {
  const o = offlineApp.value;
  if (o.state !== 'failed' && o.state !== 'installing' && o.state !== 'incomplete') return null;
  return (
    <div class="packbar">
      <Icon name="cloud" size={20} />
      <div class="info">
        <b>{o.state === 'incomplete' ? 'Offline copy incomplete' : o.state === 'failed' ? 'Not saved for offline' : 'Saving the app for offline…'}</b>
        <span class="muted small">{o.state !== 'installing' ? 'Without network the app will not open. ' : 'Keep the network for a minute. '}<a href={href('settings')}>Details</a></span>
      </div>
    </div>
  );
}
