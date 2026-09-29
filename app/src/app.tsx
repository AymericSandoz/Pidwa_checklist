import { route, href } from './router';
import { loaded, loadError, totals } from './data';
import { ListView } from './views/ListView';
import { SpeciesView } from './views/SpeciesView';
import { IdGuideView } from './views/IdGuideView';
import { JournalView } from './views/JournalView';
import { MapLazy } from './views/MapLazy';
import { StatsView } from './views/StatsView';
import { SettingsView } from './views/SettingsView';

const NAV = [
  ['list', 'List', '☑'],
  ['id', 'Guide', '🔍'],
  ['obs', 'Journal', '📓'],
  ['map', 'Map', '🗺'],
  ['stats', 'Stats', '📊'],
] as const;

export function App() {
  const r = route.value;
  if (loadError.value) return <div class="center"><p>Could not load the species data.</p><pre>{loadError.value}</pre></div>;
  if (!loaded.value) return <div class="center"><p>Loading…</p></div>;

  let view;
  switch (r.path) {
    case 'species': view = <SpeciesView id={r.parts[1]} />; break;
    case 'id': view = <IdGuideView />; break;
    case 'obs': view = <JournalView />; break;
    case 'map': view = <MapLazy />; break;
    case 'stats': view = <StatsView />; break;
    case 'settings': view = <SettingsView />; break;
    default: view = <ListView />;
  }
  const t = totals.value;
  const fullscreen = r.path === 'map';
  return (
    <div class={'shell' + (fullscreen ? ' fullscreen' : '')}>
      {!fullscreen && (
        <header class="top">
          <a href={href('list')} class="brand">Pidwa</a>
          <span class="score" title="species seen / total">🐦 {t.bird.seen}/{t.bird.total} · 🦌 {t.mammal.seen}/{t.mammal.total}</span>
          <a href={href('settings')} class="gear" aria-label="Settings">⚙</a>
        </header>
      )}
      <main class="main">{view}</main>
      <nav class="bottom">
        {NAV.map(([p, label, icon]) => (
          <a href={href(p)} class={r.path === p || (p === 'list' && r.path === 'species') ? 'active' : ''}>
            <span class="ico">{icon}</span><span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
