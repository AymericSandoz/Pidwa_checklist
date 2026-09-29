import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { ComponentType } from 'preact';

// TensorFlow.js weighs ~1.5 MB: the listening screen and its engine are loaded on first use only.
let cached: ComponentType | null = null;
/** true while the microphone is open; drives the red dot in the navigation bar */
export const listening = signal(false);

export function ListenLazy() {
  const [C, setC] = useState<ComponentType | null>(() => cached); // wrapped: a bare function would be run as an initializer
  useEffect(() => {
    if (!C) import('./ListenView').then((m) => { cached = m.ListenView; setC(() => m.ListenView); });
  }, []);
  return C ? <C /> : <div class="center"><p class="muted">Loading sound ID…</p></div>;
}
