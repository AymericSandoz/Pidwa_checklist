import { useRef, useState } from 'preact/hooks';
import { Icon } from './Icon';

const BARS = 44;
const FLAT: number[] = new Array(BARS).fill(0.16);
let current: HTMLAudioElement | null = null; // one recording at a time

/** Loudness profile of a recording, BARS values in 0..1, drawn as the progress bar. */
async function peaks(url: string): Promise<number[]> {
  const buf = await (await fetch(url)).arrayBuffer();
  const pcm = (await new OfflineAudioContext(1, 1, 44100).decodeAudioData(buf)).getChannelData(0);
  const step = Math.floor(pcm.length / BARS);
  const out: number[] = [];
  for (let i = 0; i < BARS; i++) {
    let m = 0;
    for (let j = i * step; j < (i + 1) * step; j += 16) { const v = Math.abs(pcm[j]); if (v > m) m = v; }
    out.push(m);
  }
  const max = Math.max(...out, 0.01);
  return out.map((v) => Math.max(0.12, v / max));
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function SoundPlayer({ src, title, sub, len }: { src: string; title: string; sub: string; len: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const asked = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [bars, setBars] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);

  function toggle() {
    const a = audio.current!;
    if (!a.paused) { a.pause(); return; }
    if (current && current !== a) current.pause();
    current = a;
    setFailed(false);
    a.play().catch(() => setFailed(true));
    // the real shape of the sound replaces the flat bars once decoded; without it the bars still show progress
    if (!asked.current) { asked.current = true; peaks(src).then(setBars).catch(() => { asked.current = false; }); }
  }
  function seek(e: PointerEvent) {
    const a = audio.current!;
    if (!dur) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    a.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * dur;
  }

  const done = dur ? t / dur : 0;
  return (
    <div class="player">
      <button class="pp" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} size={18} stroke={2.4} /></button>
      <div class="pw">
        <div class="pl"><b>{title}</b><span>{dur ? `${clock(t)} / ${clock(dur)}` : len}</span></div>
        <div class="wave" onPointerDown={seek}>{(bars || FLAT).map((h, i) => <i class={(i + 0.5) / BARS <= done ? 'p' : ''} style={`height:${Math.round(h * 100)}%`} />)}</div>
        <div class="by">{failed ? <span class="err">Not on this phone yet: download the sound pack in Settings.</span> : sub}</div>
      </div>
      <audio ref={audio} preload="none" src={src}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setT(0); }}
        onTimeUpdate={(e) => setT((e.target as HTMLAudioElement).currentTime)}
        onDurationChange={(e) => { const d = (e.target as HTMLAudioElement).duration; if (isFinite(d)) setDur(d); }}
        onError={() => setFailed(true)} />
    </div>
  );
}
