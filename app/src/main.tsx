import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { loadAll } from './data';
import { initPacks } from './packs';
import './style.css';

registerSW({ immediate: true });

// Ask Android to never evict our IndexedDB / caches.
navigator.storage?.persist?.().catch(() => {});

loadAll();
initPacks();
render(<App />, document.getElementById('app')!);
