/**
 * The reveal sound.
 *
 * If a designed sound exists at /sounds/reveal.mp3 it is used. Until a sound
 * designer delivers that file, a synthesized "dissolve + cash-out" plays instead:
 * an airy dissolve, a register ka-ching, then a cascade of coins.
 * The countdown before it plays one tick per second, rising in pitch.
 *
 * Browsers only allow audio after a tap, and the reveal happens after the
 * message ends (no tap). So unlockRevealSound() must be called from the tap
 * that starts the message; it opens and warms the AudioContext then.
 *
 * Keep identical: resources/js/Components/reveal/revealSound.ts (website)
 *                 src/components/giftnify/reveal/revealSound.ts (app)
 */

const CUSTOM_SOUND_URL = '/sounds/reveal.mp3';

let ctx: AudioContext | null = null;
let customBuffer: AudioBuffer | null = null;
let muted = false;

export function setRevealMuted(value: boolean) {
  muted = value;
}

export function isRevealMuted() {
  return muted;
}

/** Call inside the user's tap that starts the message. Safe to call twice. */
export function unlockRevealSound() {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      // Silent tick so iOS fully unlocks the context inside the gesture.
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
      void loadCustom();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

async function loadCustom() {
  if (!ctx) return;
  try {
    const res = await fetch(CUSTOM_SOUND_URL, { cache: 'force-cache' });
    if (!res.ok) return;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('audio') && !type.includes('mpeg') && !type.includes('octet')) return;
    customBuffer = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    customBuffer = null;
  }
}

/** Plays at the exact frame the name starts to appear. */
export function playRevealSound() {
  if (muted || !ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    if (customBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = customBuffer;
      src.connect(ctx.destination);
      src.start();
      return;
    }
    synthesize(ctx);
  } catch {
    /* sound is a bonus, never a blocker */
  }
}

/** One countdown tick. Pitch and weight rise as it gets closer to zero. */
export function playCountdownTick(n: number, total: number) {
  if (muted || !ctx) return;
  try {
    const ac = ctx;
    if (ac.state === 'suspended') void ac.resume();
    const t = ac.currentTime + 0.005;
    const step = total - n; // 0 … total-1
    // Heartbeat thump
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110 + step * 8, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35 + step * 0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + 0.25);
    // Clock tick on top
    const k = ac.createOscillator();
    k.type = 'triangle';
    k.frequency.value = 1320 + step * 150;
    const kg = ac.createGain();
    kg.gain.setValueAtTime(0.0001, t);
    kg.gain.exponentialRampToValueAtTime(0.12, t + 0.004);
    kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    k.connect(kg).connect(ac.destination);
    k.start(t); k.stop(t + 0.09);
  } catch {
    /* ignore */
  }
}

function synthesize(ac: AudioContext) {
  const t0 = ac.currentTime + 0.01;
  const master = ac.createGain();
  master.gain.value = 0.42;
  const comp = ac.createDynamicsCompressor();
  master.connect(comp).connect(ac.destination);

  const noiseBuffer = (seconds: number) => {
    const len = Math.floor(ac.sampleRate * seconds);
    const b = ac.createBuffer(1, len, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };

  // 1. Dissolve: a soft airy whoosh that opens up as the blur clears.
  const ws = ac.createBufferSource();
  ws.buffer = noiseBuffer(0.9);
  const wf = ac.createBiquadFilter();
  wf.type = 'bandpass';
  wf.Q.value = 1.2;
  wf.frequency.setValueAtTime(500, t0);
  wf.frequency.exponentialRampToValueAtTime(6000, t0 + 0.7);
  const wg = ac.createGain();
  wg.gain.setValueAtTime(0.0001, t0);
  wg.gain.exponentialRampToValueAtTime(0.5, t0 + 0.35);
  wg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
  ws.connect(wf).connect(wg).connect(master);
  ws.start(t0); ws.stop(t0 + 0.9);

  // Shimmer riding the whoosh
  [1568, 2093, 2637].forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.5, t0 + i * 0.05);
    o.frequency.exponentialRampToValueAtTime(f, t0 + 0.5);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    o.connect(g).connect(master);
    o.start(t0); o.stop(t0 + 0.95);
  });

  // 2. Ka-ching: register drawer thunk + two bright bell strikes.
  const kc = t0 + 0.55;
  const th = ac.createBufferSource();
  th.buffer = noiseBuffer(0.12);
  const tf = ac.createBiquadFilter();
  tf.type = 'lowpass';
  tf.frequency.value = 900;
  const tg = ac.createGain();
  tg.gain.setValueAtTime(0.6, kc);
  tg.gain.exponentialRampToValueAtTime(0.0001, kc + 0.1);
  th.connect(tf).connect(tg).connect(master);
  th.start(kc); th.stop(kc + 0.12);

  const bell = (at: number, f: number, level: number, decay: number) => {
    [[1, 1], [2.4, 0.5], [3.9, 0.3], [5.6, 0.15]].forEach(([r, g0]) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * r;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(level * g0, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + decay / r + 0.08);
      o.connect(g).connect(master);
      o.start(at); o.stop(at + decay + 0.2);
    });
  };
  bell(kc + 0.03, 2093, 0.28, 0.5);   // ka-
  bell(kc + 0.13, 2637, 0.32, 1.3);   // -ching

  // 3. Coins cascading into the tray.
  let at = kc + 0.28;
  for (let i = 0; i < 16; i++) {
    const level = 0.16 * (1 - i / 18);
    bell(at, 2400 + Math.random() * 2400, level, 0.18 + Math.random() * 0.12);
    at += 0.035 + Math.random() * 0.06;
  }
}
