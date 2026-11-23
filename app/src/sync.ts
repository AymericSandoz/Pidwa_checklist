/* Cloud backup: every observation, photo, place, note and quiz card goes to Firestore under users/<uid>/,
 * as soon as there is network. The phone stays the working copy (IndexedDB); the cloud is the copy that survives Chrome
 * wiping its storage. After a wipe, signing in again brings everything back.
 *
 * - Each record has a uid (its doc id), upd (last change, ms) and dirty (1 = not in the cloud yet), see db.ts.
 * - Push: dirty records and tombstones (deletions). Runs a few seconds after each change, and costs no reads.
 * - Pull: docs changed since the last pull (upd > cursor). Runs on sign-in, at start, when the network comes back,
 *   and when the app comes back to the screen. Newest upd wins; a deletion is a doc { deleted: true, upd }.
 * - Photos: one doc each in users/<uid>/photos/<obs uid>, a JPEG as a data URL kept under Firestore's 1 MB limit.
 */
import { signal } from '@preact/signals';
import type { Table } from 'dexie';
import { db, setChangeListener } from './db';
import { firebaseConfig } from './firebase-config';
import { reloadObservations, reloadPlaces, reloadNotes } from './data';

type Coll = 'obs' | 'places' | 'notes' | 'quiz';
const COLLS: Coll[] = ['obs', 'places', 'notes', 'quiz'];
const table = (c: Coll): Table<any, any> => ({ obs: db.observations, places: db.places, notes: db.notes, quiz: db.quiz })[c];
const docId = (c: Coll, r: any): string => (c === 'quiz' ? r.speciesId : r.uid);
const pk = (c: Coll, r: any) => (c === 'quiz' ? r.speciesId : r.id);

export const cloudConfigured = !!firebaseConfig.apiKey;
/** undefined while Firebase starts, null when signed out. */
export const user = signal<{ uid: string; email: string | null } | null | undefined>(undefined);
export const syncing = signal(false);
export const syncError = signal<string | null>(null);
export const lastSync = signal<number>(+(localStorage.getItem('last-sync') || 0));
/** Records changed on the phone and not yet in the cloud. */
export const pending = signal(0);

type FB = { fs: typeof import('firebase/firestore/lite'); auth: typeof import('firebase/auth'); a: import('firebase/auth').Auth; d: import('firebase/firestore/lite').Firestore };
let fbp: Promise<FB> | null = null;
function fb(): Promise<FB> {
  fbp ||= (async () => {
    const [{ initializeApp }, auth, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite')]);
    const app = initializeApp(firebaseConfig);
    return { fs, auth, a: auth.getAuth(app), d: fs.getFirestore(app) };
  })();
  return fbp;
}

export async function initSync() {
  if (!cloudConfigured) return;
  setChangeListener(onChange);
  countPending();
  try {
    const { a, auth } = await fb();
    auth.onAuthStateChanged(a, (u) => {
      user.value = u ? { uid: u.uid, email: u.email } : null;
      if (u) syncNow(true);
    });
  } catch (e: any) { user.value = null; syncError.value = 'Cloud backup unavailable: ' + (e.message || e); }
  addEventListener('online', () => syncNow(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastSync.value > 5 * 60e3) syncNow(true); });
  // changes made while a sync was running, or while offline without an "online" event
  setInterval(() => { if (pending.value > 0) syncNow(false); }, 2 * 60e3);
}

export async function signIn() {
  const { a, auth } = await fb();
  syncError.value = null;
  try { await auth.signInWithPopup(a, new auth.GoogleAuthProvider()); }
  catch (e: any) { if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') syncError.value = 'Sign-in failed: ' + (e.message || e); }
}
export async function signOut() {
  const { a, auth } = await fb();
  await auth.signOut(a);
}

let timer: any = 0;
function onChange() {
  countPending();
  if (running) return; // the sync's own writes; anything else left dirty is caught by the interval
  clearTimeout(timer);
  timer = setTimeout(() => syncNow(false), 3000);
}

async function countPending() {
  let n = await db.tomb.count();
  for (const c of COLLS) n += await table(c).filter((r) => r.dirty === 1).count();
  pending.value = n;
}

let running: Promise<void> | null = null;
/** Push what changed on the phone; with pull, also bring what changed in the cloud. */
export function syncNow(pull: boolean): Promise<void> {
  if (!cloudConfigured || !user.value || !navigator.onLine) return Promise.resolve();
  if (running) return running;
  syncing.value = true;
  running = (async () => {
    try {
      const f = await fb();
      const uid = user.value!.uid;
      if (pull) await pullAll(f, uid);
      await pushAll(f, uid);
      syncError.value = null;
      lastSync.value = Date.now(); localStorage.setItem('last-sync', String(lastSync.value));
    } catch (e: any) {
      syncError.value = 'Backup failed, will retry: ' + (e.code || e.message || e);
      console.warn('sync', e);
    } finally {
      running = null; syncing.value = false;
      await countPending();
    }
  })();
  return running;
}

// ---- pull ------------------------------------------------------------------

async function pullAll({ fs, d }: FB, uid: string) {
  const curKey = 'sync-cursor-' + uid;
  const cursor = +(localStorage.getItem(curKey) || 0);
  let max = cursor;
  let changed = false;
  for (const c of COLLS) {
    // a minute of margin for clocks of two phones that differ a little
    const snap = await fs.getDocs(fs.query(fs.collection(d, 'users', uid, c), fs.where('upd', '>', Math.max(0, cursor - 60e3))));
    for (const doc of snap.docs) {
      const r = doc.data() as any;
      max = Math.max(max, r.upd || 0);
      if (await applyRemote(c, doc.id, r, () => fetchPhoto({ fs, d } as FB, uid, doc.id))) changed = true;
    }
  }
  localStorage.setItem(curKey, String(max));
  if (changed) { await reloadObservations(); await reloadPlaces(); await reloadNotes(); }
}

async function applyRemote(c: Coll, id: string, r: any, photo: () => Promise<Blob | null>): Promise<boolean> {
  const t = table(c);
  const local = c === 'quiz' ? await t.get(id) : await t.where('uid').equals(id).first();
  if (r.deleted) {
    if (local && (local.upd || 0) <= r.upd) { await t.delete(pk(c, local)); return true; }
    return false;
  }
  const tomb = await db.tomb.get(`${c}/${id}`);
  if (tomb && tomb.upd >= r.upd) return false; // deleted here after that version
  if (local && (local.upd || 0) >= r.upd) return false; // ours is as new or newer
  const { deleted, hasPhoto, ...fields } = r;
  const rec: any = { ...fields, dirty: 0 };
  if (c === 'obs') rec.photo = hasPhoto ? local?.photo || (await photo()) : null;
  if (c === 'quiz') await t.put({ ...rec, speciesId: id });
  else if (local) await t.update(local.id, rec);
  else await t.add({ ...rec, uid: id });
  return true;
}

async function fetchPhoto({ fs, d }: FB, uid: string, id: string): Promise<Blob | null> {
  const s = await fs.getDoc(fs.doc(d, 'users', uid, 'photos', id));
  const url = s.exists() ? (s.data() as any).data : null;
  return url ? await (await fetch(url)).blob() : null;
}

// ---- push ------------------------------------------------------------------

/** The record as stored in the cloud: no local id, no blob, no undefined (Firestore refuses it). */
const clean = (r: any) => { const { id, photo, dirty, ...rest } = r; return JSON.parse(JSON.stringify(rest)); };

async function pushAll({ fs, d }: FB, uid: string) {
  for (const c of COLLS) {
    const t = table(c);
    const rows = await t.filter((r) => r.dirty === 1).toArray();
    // records without a photo go in batches (fast first upload); each photo is its own write, up to ~0.9 MB
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const batch = fs.writeBatch(d);
      for (const r of chunk) {
        const data = clean(r);
        if (c === 'obs' && r.photo) {
          await fs.setDoc(fs.doc(d, 'users', uid, 'photos', r.uid), { data: await photoDataUrl(r.photo), upd: r.upd });
          data.hasPhoto = true;
        }
        batch.set(fs.doc(d, 'users', uid, c, docId(c, r)), data);
      }
      await batch.commit();
      // clean only what has not changed again meanwhile
      await db.transaction('rw', t, async () => {
        for (const r of chunk) { const x = await t.get(pk(c, r)); if (x && x.upd === r.upd) await t.update(pk(c, r), { dirty: 0 }); }
      });
    }
  }
  const tombs = await db.tomb.toArray();
  for (const tb of tombs) {
    const [c, id] = [tb.key.slice(0, tb.key.indexOf('/')), tb.key.slice(tb.key.indexOf('/') + 1)];
    await fs.setDoc(fs.doc(d, 'users', uid, c, id), { deleted: true, upd: tb.upd });
    if (c === 'obs') await fs.deleteDoc(fs.doc(d, 'users', uid, 'photos', id));
    const now = await db.tomb.get(tb.key);
    if (now && now.upd === tb.upd) await db.tomb.delete(tb.key);
  }
}

/** JPEG data URL small enough for one Firestore doc (1 MiB): shrink until it fits. */
async function photoDataUrl(b: Blob): Promise<string> {
  const toUrl = (x: Blob) => new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = () => rej(fr.error); fr.readAsDataURL(x); });
  if (b.type === 'image/jpeg' && b.size < 600e3) return toUrl(b);
  const bmp = await createImageBitmap(b);
  for (const [max, q] of [[1600, 0.8], [1280, 0.72], [1024, 0.65], [800, 0.6]]) {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
    cv.getContext('2d')!.drawImage(bmp, 0, 0, cv.width, cv.height);
    const out = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/jpeg', q));
    if (out) { const url = await toUrl(out); if (url.length < 900e3) return url; }
  }
  throw new Error('photo too large');
}
