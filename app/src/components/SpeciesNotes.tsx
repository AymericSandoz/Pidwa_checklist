import { useState } from 'preact/hooks';
import { speciesNotes, addNote, updateNote, deleteNote } from '../data';
import { fmtDay } from '../util';
import { Icon } from './Icon';
import type { SpeciesNote } from '../types';

/** "12 Nov", with the year when it isn't this year's. */
const noteDay = (ts: number) => {
  const y = new Date(ts).getFullYear();
  return y === new Date().getFullYear() ? fmtDay(ts) : `${fmtDay(ts)} ${y}`;
};

/** What the user wants to remember about a species, seen or not (what the guide said…): dated notes, newest first. */
export function SpeciesNotes({ id }: { id: string }) {
  const mine = speciesNotes.value.filter((n) => n.speciesId === id);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<SpeciesNote | null>(null);
  const [draft, setDraft] = useState('');

  async function add() {
    if (!text.trim()) return;
    await addNote(id, text.trim());
    setText('');
  }
  async function save() {
    if (!editing || !draft.trim()) return;
    await updateNote(editing.id!, draft.trim());
    setEditing(null);
  }
  async function remove() {
    if (!editing || !confirm('Delete this note?')) return;
    await deleteNote(editing.id!);
    setEditing(null);
  }

  return (
    <>
      <div class="sec">My notes {mine.length > 0 && <span class="n">{mine.length}</span>}</div>
      <div class="card notenew">
        <textarea value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} placeholder="What the guide said, a tip, something to remember…" />
        <button class="btn sm" disabled={!text.trim()} onClick={add}><Icon name="plus" size={16} stroke={2.6} />Add note</button>
      </div>
      {mine.map((n) => editing?.id === n.id ? (
        <div class="card notenew" key={n.id}>
          <textarea value={draft} onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)} />
          <div class="row" style="justify-content:space-between;gap:8px">
            <button class="btn sm secondary" aria-label="Delete note" onClick={remove}><Icon name="trash-2" size={16} /></button>
            <span class="row" style="gap:8px">
              <button class="btn sm secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button class="btn sm" disabled={!draft.trim()} onClick={save}>Save</button>
            </span>
          </div>
        </div>
      ) : (
        <div class="obs note1" key={n.id} onClick={() => { setEditing(n); setDraft(n.text); }}>
          <div class="when"><b>{noteDay(n.ts)}</b></div>
          <div class="body">{n.text}</div>
        </div>
      ))}
    </>
  );
}
