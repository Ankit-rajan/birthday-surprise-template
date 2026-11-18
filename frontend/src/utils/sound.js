/**
 * Sound engine for the birthday site.
 *
 *  - ONE background song (a single <audio> element shared by the whole app, so the Intro can start it
 *    and the MusicPlayer button can control it).
 *  - Sound effects (clapping, cheer, pop, blow, sparkle, Happy Birthday tune) are SYNTHESIZED with the
 *    Web Audio API, so no extra audio files are needed.
 *  - "Happy birthday <name>!" is spoken by the browser's text-to-speech. If you drop your own recording at
 *    /public/music/wish-voice.mp3 it is used instead.
 *
 * Browsers block sound until the visitor taps something, so everything is started from button clicks.
 */

export const FALLBACK_SRC = '/music/our-song.mp3';
const WISH_VOICE_FILE = '/music/wish-voice.mp3'; // optional: your own recording. If missing, the browser voice is used.

const BASE_VOLUME = 0.7; // song volume normally
const DUCK_VOLUME = 0.15; // song volume while an effect is playing

/* ------------------------------------------------------------------ */
/* Background song                                                     */
/* ------------------------------------------------------------------ */

const bg = typeof Audio !== 'undefined' ? new Audio() : null;
let currentSrc = '';
let snapshot = { playing: false, unavailable: false };
const listeners = new Set();

function emit(patch) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getSnapshot = () => snapshot;

if (bg) {
  bg.loop = true;
  bg.preload = 'auto';
  bg.volume = BASE_VOLUME;
  bg.addEventListener('play', () => emit({ playing: true }));
  bg.addEventListener('pause', () => emit({ playing: false }));
  bg.addEventListener('error', () => emit({ unavailable: true, playing: false }));
}

let fadeTimer = null;
function fadeTo(target, ms) {
  if (!bg) return;
  clearInterval(fadeTimer);
  const from = bg.volume;
  const started = performance.now();
  fadeTimer = setInterval(() => {
    const p = Math.min(1, (performance.now() - started) / ms);
    bg.volume = Math.max(0, Math.min(1, from + (target - from) * p));
    if (p >= 1) clearInterval(fadeTimer);
  }, 40);
}

/** Tell the engine which file is the song (null -> /music/our-song.mp3). Safe to call repeatedly. */
export function setSource(url) {
  if (!bg) return;
  const src = url || FALLBACK_SRC;
  if (src === currentSrc) return;
  const wasPlaying = !bg.paused;
  currentSrc = src;
  bg.src = src;
  emit({ unavailable: false });
  if (wasPlaying) bg.play().catch(() => {});
}

/** Start the song with a gentle fade-in. Call from a click handler. */
export async function startMusic(url) {
  if (!bg) return;
  setSource(url);
  bg.volume = 0;
  try {
    await bg.play();
    fadeTo(BASE_VOLUME, 2500);
  } catch (err) {
    bg.volume = BASE_VOLUME;
    // NotAllowedError just means "needs a tap"; anything else means the file itself is the problem.
    if (err?.name !== 'NotAllowedError') emit({ unavailable: true });
  }
}

export async function toggleMusic() {
  if (!bg || snapshot.unavailable) return;
  if (bg.paused) {
    clearInterval(fadeTimer);
    bg.volume = BASE_VOLUME;
    try {
      await bg.play();
    } catch {
      emit({ unavailable: true });
    }
  } else {
    bg.pause();
  }
}

let duckTimer = null;
/** Lower the song for `ms` so the effects/voice are clearly heard, then bring it back. */
export function duck(ms) {
  if (!bg || bg.paused) return;
  fadeTo(DUCK_VOLUME, 350);
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => fadeTo(BASE_VOLUME, 1800), ms);
}

/* ------------------------------------------------------------------ */
/* Web Audio plumbing                                                  */
/* ------------------------------------------------------------------ */

let ctx = null;
let bus = null;
let noiseBuf = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    bus = ctx.createGain();
    bus.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    bus.connect(comp);
    comp.connect(ctx.destination);
    const len = ctx.sampleRate * 4;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Call inside the first click so later effects and the voice are allowed to play (needed on iPhones). */
export function unlockAudio() {
  getCtx();
  try {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  } catch {
    /* ignore */
  }
}

function noise(c, when, dur) {
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const offset = Math.random() * Math.max(0, noiseBuf.duration - dur - 0.05);
  src.start(when, offset, dur);
  return src;
}

function envelope(g, when, attack, peak, hold, release) {
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + attack);
  g.gain.setValueAtTime(Math.max(peak, 0.0002), when + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
}

/* ------------------------------------------------------------------ */
/* Sound effects                                                       */
/* ------------------------------------------------------------------ */

/** Soft "whoooosh" of someone blowing. */
export function playBlow(delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const src = noise(c, t, 0.9);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2200, t);
  lp.frequency.exponentialRampToValueAtTime(350, t + 0.85);
  const g = c.createGain();
  envelope(g, t, 0.12, 0.55, 0.3, 0.45);
  src.connect(lp);
  lp.connect(g);
  g.connect(bus);
}

/** Party-popper "pop". */
export function playPop(delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;

  const src = noise(c, t, 0.15);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2800;
  bp.Q.value = 0.7;
  const ng = c.createGain();
  envelope(ng, t, 0.003, 0.8, 0.01, 0.12);
  src.connect(bp);
  bp.connect(ng);
  ng.connect(bus);

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.18);
  const og = c.createGain();
  envelope(og, t, 0.003, 0.7, 0.02, 0.16);
  osc.connect(og);
  og.connect(bus);
  osc.start(t);
  osc.stop(t + 0.3);
}

function clapBurst(c, when, level) {
  const src = noise(c, when, 0.09);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1200 + Math.random() * 1800;
  bp.Q.value = 0.8 + Math.random();
  const g = c.createGain();
  envelope(g, when, 0.003, level, 0.004, 0.07);
  src.connect(bp);
  bp.connect(g);
  g.connect(bus);
}

/** A room full of people clapping: many tiny noise bursts, swelling then fading. */
export function playClapping(seconds = 4.5, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const count = Math.floor(seconds * 24);
  for (let i = 0; i < count; i += 1) {
    const x = Math.random();
    const swell = Math.sin(x * Math.PI) ** 0.5; // quiet -> loud -> quiet
    clapBurst(c, t0 + x * seconds, (0.18 + Math.random() * 0.3) * (0.3 + 0.7 * swell));
  }
}

/** Crowd cheer (filtered noise swell) plus a little whistle. */
export function playCheer(delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const dur = 2.4;

  const src = noise(c, t, dur);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(650, t);
  bp.frequency.linearRampToValueAtTime(1300, t + 0.6);
  bp.frequency.linearRampToValueAtTime(900, t + dur);
  bp.Q.value = 1.1;
  const g = c.createGain();
  envelope(g, t, 0.35, 0.32, 0.9, 1.15);
  src.connect(bp);
  bp.connect(g);
  g.connect(bus);

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1700, t + 0.1);
  osc.frequency.exponentialRampToValueAtTime(2700, t + 0.55);
  const lfo = c.createOscillator();
  lfo.frequency.value = 7;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 35;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  const wg = c.createGain();
  envelope(wg, t + 0.1, 0.05, 0.07, 0.35, 0.2);
  osc.connect(wg);
  wg.connect(bus);
  osc.start(t + 0.1);
  lfo.start(t + 0.1);
  osc.stop(t + 0.9);
  lfo.stop(t + 0.9);
}

/** Tiny ascending twinkle. */
export function playSparkle(delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  [1318.5, 1568, 1976, 2637].forEach((f, i) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const g = c.createGain();
    envelope(g, t + i * 0.09, 0.01, 0.12, 0.02, 0.55);
    osc.connect(g);
    g.connect(bus);
    osc.start(t + i * 0.09);
    osc.stop(t + i * 0.09 + 0.8);
  });
}

/* ------------------------------------------------------------------ */
/* Happy Birthday tune (music-box)                                     */
/* ------------------------------------------------------------------ */

// [frequency Hz, length in beats]
const TUNE = [
  [392, 0.75], [392, 0.25], [440, 1], [392, 1], [523.25, 1], [493.88, 2],
  [392, 0.75], [392, 0.25], [440, 1], [392, 1], [587.33, 1], [523.25, 2],
  [392, 0.75], [392, 0.25], [783.99, 1], [659.25, 1], [523.25, 1], [493.88, 1], [440, 2],
  [698.46, 0.75], [698.46, 0.25], [659.25, 1], [523.25, 1], [587.33, 1], [523.25, 2],
];
const LINE_STARTS = [0, 6, 12, 19]; // beat at which each of the 4 lyric lines begins
const BEAT = 0.55; // seconds per beat

function musicBoxNote(c, dest, freq, when, beats) {
  const ring = Math.max(beats * BEAT * 1.5, 0.7);
  [[1, 0.22], [2, 0.08], [3.01, 0.03]].forEach(([mult, level]) => {
    const osc = c.createOscillator();
    osc.type = mult === 1 ? 'triangle' : 'sine';
    osc.frequency.value = freq * mult;
    const g = c.createGain();
    envelope(g, when, 0.005, level, 0.01, ring);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + ring + 0.1);
  });
}

/**
 * Plays "Happy Birthday to you". `onLine(i)` fires as each of the 4 lyric lines starts.
 * Returns { duration, stop() }.
 */
export function playHappyBirthday({ onLine, onEnd } = {}) {
  const c = getCtx();
  if (!c) return { duration: 0, stop() {} };
  const tune = c.createGain();
  tune.gain.value = 1;
  tune.connect(bus);

  const first = c.currentTime + 0.2;
  let t = first;
  TUNE.forEach(([freq, beats]) => {
    musicBoxNote(c, tune, freq, t, beats);
    t += beats * BEAT;
  });
  const duration = t - first;

  const timers = LINE_STARTS.map((beat, i) => setTimeout(() => onLine?.(i), 200 + beat * BEAT * 1000));
  timers.push(setTimeout(() => onEnd?.(), (duration + 0.8) * 1000));
  duck((duration + 1.2) * 1000);

  return {
    duration,
    stop() {
      timers.forEach(clearTimeout);
      tune.gain.cancelScheduledValues(c.currentTime);
      tune.gain.setTargetAtTime(0, c.currentTime, 0.05);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Voice                                                               */
/* ------------------------------------------------------------------ */

function tryFile(url, volume = 1) {
  return new Promise((resolve) => {
    const a = new Audio(url);
    a.volume = volume;
    let done = false;
    const finish = (ok) => {
      if (!done) {
        done = true;
        resolve(ok);
      }
    };
    a.addEventListener('error', () => finish(false), { once: true });
    a.addEventListener('playing', () => finish(true), { once: true });
    a.play().catch(() => finish(false));
  });
}

function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => /en[-_]IN/i.test(v.lang) && /female|heera|neerja|veena|google/i.test(v.name)) ||
    voices.find((v) => /en[-_]IN/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang) && /female|zira|samantha|google/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang));
  if (voice) u.voice = voice;
  u.lang = voice?.lang || 'en-IN';
  u.rate = 0.95;
  u.pitch = 1.2;
  u.volume = 1;
  synth.cancel();
  synth.speak(u);
}

export async function speakWish(name) {
  if (await tryFile(WISH_VOICE_FILE)) return;
  speak(`Happy birthday ${name}! Many, many happy returns of the day!`);
}

/* ------------------------------------------------------------------ */
/* Ready-made moments                                                  */
/* ------------------------------------------------------------------ */

/** Played when the envelope is tapped. */
export function playOpenMoment() {
  playSparkle();
}

/** Candles blown out: whoosh, pop, applause, cheer, then "Happy birthday <name>!". */
export function playCelebration(name) {
  duck(9000);
  playBlow(0);
  playPop(0.12);
  playClapping(5, 0.4);
  playCheer(0.5);
  setTimeout(() => speakWish(name), 1100);
}
