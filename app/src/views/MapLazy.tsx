import { useEffect, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';

// maplibre-gl weighs ~1 MB: load it only when the map tab is opened.
let cached: ComponentType | null = null;

export function MapLazy() {
  const [C, setC] = useState<ComponentType | null>(() => cached); // wrapped: a bare function would be run as an initializer
  useEffect(() => {
    if (!C) import('./MapView').then((m) => { cached = m.MapView; setC(() => m.MapView); });
  }, []);
  return C ? <C /> : <div class="center"><p class="muted">Loading the map…</p></div>;
}
