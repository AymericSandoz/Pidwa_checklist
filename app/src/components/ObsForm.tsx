import { useEffect, useRef, useState } from 'preact/hooks';
import type { Observation, Species } from '../types';
import { species, byId, name, name2, addObservation, updateObservation, deleteObservation } from '../data';
import { downscalePhoto, matches, slug } from '../util';
import { Icon } from './Icon';

type Extra = NonNullable<Observation['extra']>;
interface Props { speciesId?: string; obs?: Observation; extra?: Extra; note?: string; /** position already known (logging from a place on the map) */ at?: { lat: number; lon: number }; onSaved?: () => void; onClose: () => void }

function toLocalInput(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ObsForm({ speciesId, obs, extra: extraProp, note: noteProp, at, onSaved, onClose }: Props) {
  const editing = !!obs;
  const extra: Extra | null = obs?.extra ?? extraProp ?? null;
  const [spId, setSpId] = useState<string | null>(obs?.speciesId ?? speciesId ?? (extra ? 'x:' + slug(extra.sci) : null));
  const [q, setQ] = useState('');
  const [when, setWhen] = useState(toLocalInput(obs?.ts ?? Date.now()));
  const [lat, setLat] = useState<number | null>(obs?.lat ?? at?.lat ?? null);
  const [lon, setLon] = useState<number | null>(obs?.lon ?? at?.lon ?? null);
  const [acc, setAcc] = useState<number | null>(obs?.acc ?? null);
  const [gps, setGps] = useState<'idle' | 'wait' | 'ok' | 'coarse' | 'bad'>((editing && obs?.lat != null) || at ? 'ok' : 'idle');
  const [gpsMsg, setGpsMsg] = useState(at ? 'position of the place' : '');
  const [count, setCount] = useState(obs?.count ?? 1);
  const [note, setNote] = useState(obs?.note ?? noteProp ?? '');
  const [photo, setPhoto] = useState<Blob | null>(obs?.photo ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const watchId = useRef<number | null>(null);

  function startGps() {
    if (!('geolocation' in navigator)) { setGps('bad'); setGpsMsg('GPS not available'); return; }
    stopGps();
    setGps('wait'); setGpsMsg('searching for signal…');
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const a = Math.round(p.coords.accuracy);
        setLat(p.coords.latitude); setLon(p.coords.longitude); setAcc(a);
        // > 100 m usually means a network/cell fix while the GPS is still warming up: keep listening
        if (a > 100) { setGps('coarse'); setGpsMsg(`rough position ±${a} m, waiting for GPS…`); }
        else { setGps('ok'); setGpsMsg(`accuracy ±${a} m`); }
      },
      (e) => { setGps('bad'); setGpsMsg(e.code === 1 ? 'permission denied' : e.code === 3 ? 'timed out, try again' : 'position unavailable'); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 45000 },
    );
  }
  function stopGps() {
    if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
  }
  useEffect(() => {
    if (!editing && !at) startGps();
    return () => stopGps();
  }, []);
  useEffect(() => {
    const u = photo ? URL.createObjectURL(photo) : null;
    setPreviewUrl(u);
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [photo]);

  async function onPhoto(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try { setPhoto(await downscalePhoto(f)); } catch { setPhoto(f); }
  }

  async function save() {
    if (!spId) return;
    setSaving(true);
    const rec: Observation = { speciesId: spId, ts: new Date(when).getTime() || Date.now(), lat, lon, acc, count: Math.max(1, count | 0), note: note.trim(), photo, extra: spId.startsWith('x:') ? extra : null };
    if (editing && obs?.id != null) await updateObservation(obs.id, rec); else await addObservation(rec);
    setSaving(false);
    onSaved?.();
    onClose();
  }
  async function remove() {
    if (obs?.id != null && confirm('Delete this observation?')) { await deleteObservation(obs.id); onClose(); }
  }

  const sp: Species | undefined = spId ? byId.value.get(spId) : undefined;
  const isExtra = !sp && !!extra && !!spId && spId.startsWith('x:');
  const cands = !sp && !isExtra && q.length >= 2 ? species.value.filter((s) => matches(s, q)).slice(0, 30) : [];

  return (
    <div class="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal">
        <h2>{editing ? 'Edit observation' : 'New observation'}</h2>

        <div class="field">
          <label>Species</label>
          {sp ? (
            <div class="row"><b style="flex:1">{name(sp)} <span class="muted small">{name2(sp)}</span></b>{!editing && <button class="btn sm secondary" onClick={() => setSpId(null)}>change</button>}</div>
          ) : isExtra ? (
            <div><b>{extra!.en}</b> <span class="muted small">{extra!.fr} · <i>{extra!.sci}</i></span><br /><span class="tag off">not on the Pidwa checklist</span></div>
          ) : (
            <>
              <input type="text" placeholder="English, French or Latin name…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} autoFocus />
              {cands.length > 0 && (
                <div class="picker">
                  {cands.map((s) => <div key={s.id} onClick={() => { setSpId(s.id); setQ(''); }}>{name(s)} <small>· {name2(s)}</small></div>)}
                </div>
              )}
            </>
          )}
        </div>

        <div class="field">
          <label>Position</label>
          <div class={'gps ' + gps}>
            <span class="dot" />
            <span style="flex:1">{lat != null && lon != null ? `${lat.toFixed(5)}, ${lon.toFixed(5)} · ` : ''}{gpsMsg || (lat != null ? 'position saved' : 'no position')}</span>
            <button class="btn sm secondary" onClick={startGps}>{gps === 'wait' ? '…' : <><Icon name="locate-fixed" size={14} />GPS</>}</button>
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:2"><label>Date and time</label><input type="datetime-local" value={when} onInput={(e) => setWhen((e.target as HTMLInputElement).value)} /></div>
          <div class="field" style="flex:1"><label>Count</label><input type="number" min="1" value={count} onInput={(e) => setCount(+(e.target as HTMLInputElement).value)} /></div>
        </div>

        <div class="field"><label>Note</label><textarea value={note} onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)} placeholder="behaviour, place, identification doubts…" /></div>

        <div class="field">
          <label>Photo</label>
          <div class="row">
            <label class="btn sm secondary" style="flex:none"><Icon name="camera" size={16} />Take / choose<input type="file" accept="image/*" capture="environment" style="display:none" onChange={onPhoto} /></label>
            {photo && <button class="btn sm danger" onClick={() => setPhoto(null)}>remove</button>}
          </div>
          {previewUrl && <img class="photo-prev" src={previewUrl} alt="" />}
        </div>

        <div class="actions">
          {editing && <button class="btn danger" onClick={remove}>Delete</button>}
          <button class="btn secondary" onClick={onClose}>Cancel</button>
          <button class="btn" disabled={!spId || saving} onClick={save}>{saving ? '…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
