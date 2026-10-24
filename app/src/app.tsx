import { Component, type ComponentChildren } from 'preact';
import { route, href } from './router';
import { loaded, loadError } from './data';
import { ListView } from './views/ListView';
import { SpeciesView } from './views/SpeciesView';
import { IdGuideView } from './views/IdGuideView';
import { TrackGuideView } from './views/TrackGuideView';
import { MapLazy } from './views/MapLazy';
import { StatsView } from './views/StatsView';
import { LearnView } from './views/LearnView';
import { SettingsView } from './views/SettingsView';
import { ListenLazy, listening } from './views/ListenLazy';
import { Icon, type IconName } from './components/Icon';
import { PackBanner } from './components/PackBanner';
import { missing } from './packs';
import './theme';

/** Keeps a crash inside one screen: the navigation still works and the next screen renders normally. */
class ViewBoundary extends Component<{ children: ComponentChildren }, { err: string | null }> {
  state = { err: null as string | null };
  componentDidCatch(e: any) { this.setState({ err: e?.message || String(e) }); }
  render() {
    if (!this.state.err) return this.props.children;
    return <div class="center"><div><p>This screen hit an error.</p><pre class="small muted" style="white-space:pre-wrap">{this.state.err}</pre><button class="btn" onClick={() => location.reload()}>Reload</button></div></div>;
  }
}

const NAV: [string, string, IconName][] = [
  ['list', 'List', 'list-checks'],
  ['id', 'Guide', 'binoculars'],
  ['listen', 'Listen', 'mic'],
  ['map', 'Map', 'map'],
  ['stats', 'Stats', 'chart-no-axes-column'],
  ['learn', 'Learn', 'book-open'],
];

export function App() {
  const r = route.value;
  if (loadError.value) return <div class="center"><p>Could not load the species data.</p><pre>{loadError.value}</pre></div>;
  if (!loaded.value) return <div class="splash"><div><div class="logo" /><p class="muted">Loading…</p></div></div>;

  let view;
  switch (r.path) {
    case 'species': view = <SpeciesView id={r.parts[1]} />; break;
    case 'id': view = r.parts[1] === 'tracks' ? <TrackGuideView /> : <IdGuideView />; break;
    case 'obs': view = <StatsView journal />; break; // old journal link: the journal now lives under Stats
    case 'map': view = <MapLazy />; break;
    case 'listen': view = <ListenLazy />; break;
    case 'stats': view = <StatsView />; break;
    case 'learn': view = <LearnView />; break;
    case 'settings': view = <SettingsView />; break;
    default: view = <ListView />;
  }
  const fullscreen = r.path === 'map';
  const bare = r.path === 'species'; // the species page starts with its photo, edge to edge
  return (
    <div class={'shell' + (fullscreen ? ' fullscreen' : '') + (bare ? ' bare' : '')}>
      {!fullscreen && !bare && (
        <header class="top">
          <a href={href('list')} class="brand"><i class="mark" /><span class="bn"><b>Askari</b><small>Pidwa Wilderness Reserve</small></span></a>
          <a href={href('settings')} class="gear" aria-label="Settings"><Icon name="settings" />{missing.value.keys.length > 0 && <i class="dot" />}</a>
        </header>
      )}
      <main class="main">{!fullscreen && !bare && r.path !== 'settings' && <PackBanner />}<ViewBoundary key={r.path}>{view}</ViewBoundary></main>
      <nav class="bottom">
        {NAV.map(([p, label, icon]) => (
          <a href={href(p)} class={r.path === p || (p === 'list' && r.path === 'species') || (p === 'stats' && r.path === 'obs') ? 'active' : ''}>
            <span class="ico"><Icon name={icon} size={22} />{p === 'listen' && listening.value && <i class="recdot" />}</span><span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
