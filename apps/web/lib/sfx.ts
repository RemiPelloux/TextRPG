/**
 * Sound effects synthesized with the Web Audio API: no audio files to download or license.
 * Each rarity has its own chime, so a legendary is recognizable with eyes closed.
 */
let ctx: AudioContext | null = null;
let enabled = true;

const KEY = "textrpg.sound";

export function loadSoundPreference(): boolean {
  try {
    enabled = localStorage.getItem(KEY) !== "off";
  } catch {
    enabled = true;
  }
  return enabled;
}

export function setSound(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable: keep the in-memory choice */
  }
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, opts: { type?: OscillatorType; dur?: number; gain?: number; delay?: number; slide?: number } = {}): void {
  const a = audio();
  if (!a) return;
  const start = a.currentTime + (opts.delay ?? 0);
  const dur = opts.dur ?? 0.15;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.15, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(dur: number, gainValue: number, filterFreq: number, delay = 0): void {
  const a = audio();
  if (!a) return;
  const start = a.currentTime + delay;
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  const gain = a.createGain();
  gain.gain.value = gainValue;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(start);
}

const RARITY_NOTES: Record<string, number[]> = {
  common: [520],
  magic: [660, 880],
  rare: [740, 988, 1175],
  set: [587, 784, 988, 1318],
  legendary: [392, 587, 784, 1175, 1568],
  ancestral: [262, 392, 523, 784, 1047, 1568],
};

export const sfx = {
  click: () => tone(420, { type: "triangle", dur: 0.05, gain: 0.05 }),
  hit: () => {
    noise(0.09, 0.35, 1800);
    tone(140, { type: "square", dur: 0.08, gain: 0.06, slide: 0.5 });
  },
  crit: () => {
    noise(0.16, 0.5, 3200);
    tone(220, { type: "sawtooth", dur: 0.18, gain: 0.08, slide: 0.4 });
    tone(880, { type: "triangle", dur: 0.2, gain: 0.06, delay: 0.03 });
  },
  hurt: () => {
    noise(0.12, 0.3, 900);
    tone(110, { type: "square", dur: 0.12, gain: 0.05, slide: 0.6 });
  },
  dodge: () => noise(0.12, 0.12, 5000),
  heal: () => [523, 659, 784].forEach((f, i) => tone(f, { type: "sine", dur: 0.25, gain: 0.05, delay: i * 0.06 })),
  coin: () => [1318, 1760].forEach((f, i) => tone(f, { type: "triangle", dur: 0.12, gain: 0.05, delay: i * 0.05 })),
  loot: (rarity: string) =>
    (RARITY_NOTES[rarity] ?? RARITY_NOTES.common!).forEach((f, i) =>
      tone(f, { type: rarity === "common" ? "triangle" : "sine", dur: 0.5, gain: rarity === "legendary" || rarity === "ancestral" ? 0.08 : 0.05, delay: i * 0.09 }),
    ),
  levelUp: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, { type: "triangle", dur: 0.4, gain: 0.07, delay: i * 0.08 })),
  windup: () => tone(70, { type: "sawtooth", dur: 0.7, gain: 0.08, slide: 2.2 }),
  victory: () => [523, 659, 784].forEach((f, i) => tone(f, { type: "triangle", dur: 0.3, gain: 0.06, delay: i * 0.1 })),
  defeat: () => [330, 262, 196].forEach((f, i) => tone(f, { type: "sine", dur: 0.5, gain: 0.07, delay: i * 0.18 })),
  error: () => tone(160, { type: "square", dur: 0.12, gain: 0.04 }),
  splash: () => noise(0.35, 0.2, 700),
};

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
