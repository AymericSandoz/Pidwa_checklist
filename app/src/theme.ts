import { signal } from '@preact/signals';

// Light / night theme. 'auto' follows the phone; the choice is kept on the device.
// The colours themselves live in style.css; index.html applies a forced theme before the first paint.
export type Theme = 'auto' | 'light' | 'dark';
const BAR = { light: '#f4f2ec', dark: '#11150f' }; // status bar = page background

const stored = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
export const theme = signal<Theme>(stored === 'light' || stored === 'dark' ? stored : 'auto');

const dark = window.matchMedia('(prefers-color-scheme: dark)');
function apply() {
  const t = theme.value;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const bar = BAR[t === 'auto' ? (dark.matches ? 'dark' : 'light') : t];
  document.querySelectorAll('meta[name=theme-color]').forEach((m) => m.setAttribute('content', bar));
}
dark.addEventListener('change', apply);
apply();

export function setTheme(t: Theme) {
  theme.value = t;
  try { if (t === 'auto') localStorage.removeItem('theme'); else localStorage.setItem('theme', t); } catch { /* private mode */ }
  apply();
}
