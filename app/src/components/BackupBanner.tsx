import { signal } from '@preact/signals';
import { href } from '../router';
import { cloudConfigured, user, signIn } from '../sync';
import { Icon } from './Icon';

const dismissed = signal(false);

/** On every screen while the cloud backup is off: the phone alone can lose everything (Chrome may wipe its storage). */
export function BackupBanner() {
  if (!cloudConfigured || user.value !== null || dismissed.value) return null;
  return (
    <div class="packbar">
      <Icon name="cloud" size={20} />
      <div class="info">
        <b>Cloud backup off</b>
        <span class="muted small">Your observations are only on this phone. Sign in to back them up, or to bring back a backup. <a href={href('settings')}>Details</a></span>
      </div>
      <div class="acts">
        {navigator.onLine ? <button class="btn sm" onClick={() => signIn()}>sign in</button> : <span class="small muted">no network</span>}
        <button class="link small" onClick={() => (dismissed.value = true)}>later</button>
      </div>
    </div>
  );
}
