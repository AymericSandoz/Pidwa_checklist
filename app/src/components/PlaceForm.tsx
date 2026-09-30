import { useState } from 'preact/hooks';
import { addPlace, updatePlace, deletePlace } from '../data';
import { PLACE_TYPES } from '../places';
import { Icon } from './Icon';
import type { Place } from '../types';

interface Props { place?: Place; lat: number; lon: number; onClose: () => void }

/** Bottom sheet to add or edit a place of your own on the map. */
export function PlaceForm({ place, lat: lat0, lon: lon0, onClose }: Props) {
  const editing = !!place;
  const [name, setName] = useState(place?.name ?? '');
  const [type, setType] = useState(place?.type ?? 'water');
  const [note, setNote] = useState(place?.note ?? '');
  const [lat, setLat] = useState(lat0);
  const [lon, setLon] = useState(lon0);
  const [src, setSrc] = useState<'map' | 'gps' | 'wait' | 'bad'>('map'); // where the position comes from
  const [saving, setSaving] = useState(false);

  function here() {
    if (!('geolocation' in navigator)) { setSrc('bad'); return; }
    setSrc('wait');
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude); setLon(p.coords.longitude); setSrc('gps'); },
      () => setSrc('bad'),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }
  async function save() {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    const rec = { name: n, type, lat, lon, note: note.trim() };
    if (editing && place?.id != null) await updatePlace(place.id, rec); else await addPlace({ ...rec, ts: Date.now() });
    onClose();
  }
  async function remove() {
    if (place?.id != null && confirm(`Remove "${place.name}" from the map?`)) { await deletePlace(place.id); onClose(); }
  }
  const where = src === 'gps' ? 'your position' : src === 'wait' ? 'getting your position…' : src === 'bad' ? 'no GPS fix, map spot kept' : editing ? 'current spot' : 'where you pressed';

  return (
    <div class="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal">
        <h2>{editing ? 'Edit place' : 'New place'}</h2>
        <div class="field"><label>Name</label><input type="text" placeholder="Hippo Dam, main gate…" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} autoFocus={!editing} /></div>
        <div class="field">
          <label>Type</label>
          <div class="chips">{PLACE_TYPES.map(([k, label, icon]) => <button class={'chip' + (type === k ? ' on' : '')} onClick={() => setType(k)}><Icon name={icon} size={15} stroke={2.2} />{label}</button>)}</div>
        </div>
        <div class="field"><label>Note <span class="opt">optional</span></label><textarea value={note} onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)} placeholder="what to look for here, when to come…" /></div>
        <div class="field">
          <label>Position</label>
          <div class={'gps ' + (src === 'gps' ? 'ok' : src === 'bad' ? 'bad' : src === 'wait' ? 'wait' : '')}>
            <span class="dot" />
            <span style="flex:1">{lat.toFixed(5)}, {lon.toFixed(5)} · {where}</span>
            <button class="btn sm secondary" onClick={here} disabled={src === 'wait'}>{src === 'wait' ? '…' : <><Icon name="locate-fixed" size={14} />Here</>}</button>
          </div>
        </div>
        <div class="actions">
          {editing && <button class="btn danger" style="flex:0 0 52px" onClick={remove} aria-label="Remove this place"><Icon name="trash-2" size={17} /></button>}
          <button class="btn secondary" onClick={onClose}>Cancel</button>
          <button class="btn" disabled={!name.trim() || saving} onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
