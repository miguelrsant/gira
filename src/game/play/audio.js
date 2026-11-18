// ================= som: trilha lo-fi / bossa reativa aos bairros + efeitos =================
import { setUI } from '../../store.js';
import { mulberry } from '../core/math.js';
import { state } from './state.js';

export const audio = { ctx: null, mood: 0 };
export function initAudio() {
  if (audio.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = new AC(); audio.ctx = ctx;
  audio.master = ctx.createGain(); audio.master.gain.value = state.musicOn ? 0.8 : 0; audio.master.connect(ctx.destination);
  audio.music = ctx.createGain(); audio.music.gain.value = 0.34; audio.music.connect(ctx.destination ? audio.master : ctx.destination);
  audio.sfx = ctx.createGain(); audio.sfx.gain.value = 0.62; audio.sfx.connect(audio.master);
  audio.tick = ctx.createGain(); audio.tick.gain.value = 0; audio.tick.connect(audio.music);
  const len = Math.floor(ctx.sampleRate * 0.5), nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  audio.noise = nb;
  // reverb estéreo quente de sala pequena
  const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 1.9), ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = ir.getChannelData(c);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2.8);
  }
  audio.verb = ctx.createConvolver(); audio.verb.buffer = ir;
  const vg = ctx.createGain(); vg.gain.value = 0.36; audio.verb.connect(vg); vg.connect(audio.music);
  audio.next = ctx.currentTime + 0.1; audio.step = 0;
  setInterval(schedule, 60);
}
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
// dias úteis: Fmaj9 · Em7 · Dm9 · Cmaj9
// domingo (bossa nova): Cmaj9 · A7(b13) · Dm9 · G13
const CHORDS = [[53, 57, 60, 64, 67], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]];
const CHORDS_SUN = [[48, 52, 55, 59, 62], [57, 61, 64, 67, 70], [50, 53, 57, 60, 64], [55, 59, 62, 65, 69]];
const MEL = [72, 74, 76, 79, 81, 79, 76, 74, 72, 69, 67, 69];
const MEL_SUN = [72, 76, 79, 81, 84, 86, 84, 81, 79, 76, 74, 72];
const BPM = 80, STEP = 60 / BPM / 2;

function voice(t, f, dur, type, gain, dest, attack = 0.02, cutoff = 2200) {
  const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
  o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl); fl.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  return g;
}

// Rhodes elétrico suave: fundamental levemente desafinada + sino harmônico
function rhodes(t, f, dur, gain, cutoff = 1150) {
  const g1 = voice(t, f * 0.9985, dur, 'triangle', gain, audio.music, 0.035, cutoff);
  const g2 = voice(t, f * 2.002, dur * 0.42, 'sine', gain * 0.34, audio.music, 0.008, cutoff * 1.8);
  g1.connect(audio.verb); g2.connect(audio.verb);
}

// Violão de nylon dedilhado (praia, ilha e bossa de domingo)
function nylonPluck(t, f, dur, gain = 0.048) {
  const g = voice(t, f, dur, 'triangle', gain, audio.music, 0.006, 1750);
  voice(t, f * 2, dur * 0.25, 'sine', gain * 0.28, audio.music, 0.003, 2600);
  g.connect(audio.verb);
}

function softKick(t, gain = 0.11) {
  const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(118, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g); g.connect(audio.music); o.start(t); o.stop(t + 0.18);
}

function brushShaker(t, dur = 0.045, gain = 0.024, freq = 5200) {
  const ctx = audio.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = audio.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.6;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(audio.music); s.start(t, Math.random() * 0.25); s.stop(t + dur + 0.02);
}

function birdChirp(t) {
  const ctx = audio.ctx; if (!ctx) return;
  const f0 = 1750 + Math.random() * 450;
  [0, 0.13].forEach((d, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0 * (i ? 1.18 : 1), t + d);
    o.frequency.exponentialRampToValueAtTime(f0 * (i ? 0.94 : 1.26), t + d + 0.09);
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.linearRampToValueAtTime(0.022, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.11);
    o.connect(g); g.connect(audio.verb); o.start(t + d); o.stop(t + d + 0.13);
  });
}

const melRand = mulberry(3);
function schedule() {
  const ctx = audio.ctx; if (!ctx) return;
  const sun = state.sunday, quiet = state.strike;
  const dName = state.district?.name || '';
  const coastal = dName === 'PRAIA DO INTERVALO' || dName === 'ILHA DO SINAL FRACO';
  const green = dName === 'PARQUE DOMINGUEIRO' || dName === 'HORTA COMUNITÁRIA' || dName === 'MIRANTE' || dName === 'VILA DO SOSSEGO';
  const factory = dName === 'FÁBRICA DE VOLTAS';
  const moving = (audio.tick?.gain.value || 0) > 0.15;

  while (audio.next < ctx.currentTime + 0.25) {
    const sw = (audio.step % 2) ? STEP * 0.08 : 0; // leve suingue brasileiro nos contratempo
    const t = audio.next + sw, s = audio.step, bar = Math.floor(s / 8) % 4, beat = s % 8;
    const ch = (sun ? CHORDS_SUN : CHORDS)[bar];

    // Acordes Rhodes: cheios na cabeça do compasso, e sincopados no contratempo do domingo/praia
    if (beat === 0) {
      ch.forEach((n, idx) => rhodes(t + idx * 0.018, midi(n), STEP * (sun ? 4.6 : 7.8), quiet ? 0.024 : 0.036, sun ? 1400 : 1020));
    } else if ((sun || coastal) && !quiet && (beat === 3 || beat === 6)) {
      const pick = ch[1 + (beat % (ch.length - 1))];
      nylonPluck(t, midi(pick + 12), STEP * 2.3, 0.038);
    }

    // Baixo acústico caminhante
    if (!quiet) {
      if (beat === 0) voice(t, midi(ch[0] - 12), STEP * 3.1, 'sine', 0.125, audio.music, 0.012, 380);
      else if (sun && beat === 3) voice(t, midi(ch[2] - 12), STEP * 1.8, 'sine', 0.085, audio.music, 0.012, 380);
      else if (beat === 5) voice(t, midi(ch[0] - 12 + (bar === 3 ? 7 : 0)), STEP * 2.4, 'sine', 0.1, audio.music, 0.012, 380);
    }

    // Percussão escovada leve (acompanha o passo ou embala o domingo)
    if (!quiet && (moving || sun)) {
      if (beat === 0 || (sun && beat === 5)) softKick(t, sun ? 0.09 : 0.075);
      if (beat === 4) voice(t, 680, 0.035, 'triangle', 0.032, audio.music, 0.002, 1900); // aro suave
      if (beat % 2 === 1) brushShaker(t, 0.04, sun ? 0.022 : 0.016, coastal ? 4200 : 5600);
    }

    // Melodia e cores de bairro
    if (!quiet && (beat === 2 || beat === 3 || beat === 6 || (sun && beat === 4)) && melRand() < 0.72) {
      const M = sun ? MEL_SUN : MEL, m = M[Math.floor(melRand() * M.length)];
      if (coastal || sun) {
        nylonPluck(t, midi(m), 0.65, 0.044);
      } else {
        const g = voice(t, midi(m), green ? 0.48 : 0.62, green ? 'triangle' : 'sine', 0.046, audio.music, 0.005, green ? 2600 : 3000);
        g.connect(audio.verb);
      }
    }

    // Passarinhos ocasionais nos bairros arborizados e no domingo
    if ((green || sun) && beat === 7 && melRand() < 0.16) birdChirp(t + 0.05);
    // Maquinário distante na Fábrica de Voltas em dia útil
    if (factory && !sun && !quiet && beat === 6) brushShaker(t, 0.09, 0.028, 950);

    // Tique-taque diegético do relógio de ponto: só soa quando você anda em dia útil
    if (!sun) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = beat % 2 ? 1900 : 1500;
      g.gain.setValueAtTime(0.046, audio.next); g.gain.exponentialRampToValueAtTime(0.0001, audio.next + 0.03);
      o.connect(g); g.connect(audio.tick); o.start(audio.next); o.stop(audio.next + 0.05);
    }
    audio.next += STEP; audio.step++;
  }
}

function sfxNoise(t, dur, freq, q, gain, sweep) {
  const ctx = audio.ctx; if (!ctx) return;
  const s = ctx.createBufferSource(); s.buffer = audio.noise; s.loop = dur > 0.45;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  if (sweep) { f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(sweep, t + dur); }
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.05, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(audio.sfx); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
}
function tone(t, f0, f1, dur, gain, type = 'sine') {
  const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(audio.sfx); o.start(t); o.stop(t + dur + 0.05);
}
export const sfx = {
  step(run) { if (audio.ctx) sfxNoise(audio.ctx.currentTime, run ? 0.06 : 0.07, 650 + Math.random() * 350, 1.2, run ? 0.26 : 0.2); },
  land() { if (audio.ctx) sfxNoise(audio.ctx.currentTime, 0.15, 400, 1, 0.4); },
  jump() { if (audio.ctx) tone(audio.ctx.currentTime, 300, 620, 0.16, 0.08); },
  click() { if (audio.ctx) { const t = audio.ctx.currentTime; voice(t, 880, 0.08, 'sine', 0.12, audio.sfx, 0.002); voice(t + 0.04, 1320, 0.08, 'sine', 0.08, audio.sfx, 0.002); } },
  paper() { if (audio.ctx) sfxNoise(audio.ctx.currentTime, 0.25, 3000, 0.6, 0.12); },
  blip(base) { if (audio.ctx) voice(audio.ctx.currentTime, base * (1 + Math.random() * 0.5), 0.06, 'triangle', 0.07, audio.sfx, 0.003, 1800); },
  chime() { if (audio.ctx) { const t = audio.ctx.currentTime; [72, 76, 79, 84].forEach((m, i) => { const g = voice(t + i * 0.12, midi(m), 1.2, 'sine', 0.09, audio.sfx, 0.005); g.connect(audio.verb); }); } },
  pop(p = 1) { if (audio.ctx) tone(audio.ctx.currentTime, 480 * p, 1100 * p, 0.13, 0.1); },
  whoosh(soft) { if (audio.ctx) sfxNoise(audio.ctx.currentTime, soft ? 0.7 : 0.9, soft ? 500 : 300, 0.8, soft ? 0.16 : 0.32, soft ? 2600 : 3800); },
  thud() { if (audio.ctx) { const t = audio.ctx.currentTime; tone(t, 160, 70, 0.22, 0.2); sfxNoise(t, 0.12, 900, 1, 0.12); } },
  bell() { if (audio.ctx) { const t = audio.ctx.currentTime; [0, 0.5].forEach((d) => { const g = voice(t + d, midi(64), 1.6, 'triangle', 0.08, audio.sfx, 0.004, 2600); g.connect(audio.verb); const g2 = voice(t + d, midi(76), 1.2, 'sine', 0.04, audio.sfx, 0.004); g2.connect(audio.verb); }); } },
  flap() { if (audio.ctx) { const t = audio.ctx.currentTime; for (let i = 0; i < 4; i++) sfxNoise(t + i * 0.07, 0.06, 1400, 1.5, 0.08); } },
  bark() { if (audio.ctx) { const t = audio.ctx.currentTime; tone(t, 520, 300, 0.12, 0.12, 'sawtooth'); tone(t + 0.16, 560, 320, 0.11, 0.1, 'sawtooth'); } },
  meow() { if (audio.ctx) tone(audio.ctx.currentTime, 700, 1050, 0.4, 0.05, 'triangle'); },
  kick() { if (audio.ctx) { const t = audio.ctx.currentTime; tone(t, 185, 62, 0.14, 0.24); sfxNoise(t, 0.05, 1100, 1.4, 0.12); } },
  goal() {
    if (audio.ctx) {
      const t = audio.ctx.currentTime;
      tone(t, 1520, 1760, 0.18, 0.11, 'triangle');
      tone(t + 0.2, 1760, 1980, 0.26, 0.12, 'triangle');
      [72, 76, 79, 84].forEach((m, i) => { const g = voice(t + 0.1 + i * 0.09, midi(m), 0.9, 'triangle', 0.08, audio.sfx, 0.005); g.connect(audio.verb); });
    }
  },
  quack() {
    if (audio.ctx) {
      const t = audio.ctx.currentTime;
      tone(t, 640, 430, 0.13, 0.08, 'sawtooth');
      sfxNoise(t, 0.11, 880, 3.2, 0.09, 520);
    }
  },
  sit() {
    if (audio.ctx) {
      const t = audio.ctx.currentTime;
      sfxNoise(t, 0.12, 520, 1.6, 0.12);
      voice(t + 0.04, midi(60), 0.45, 'triangle', 0.06, audio.sfx, 0.01, 1400);
      voice(t + 0.1, midi(67), 0.55, 'sine', 0.05, audio.sfx, 0.01, 1600);
    }
  },
  shutter() {
    if (audio.ctx) {
      const t = audio.ctx.currentTime;
      sfxNoise(t, 0.035, 2800, 1.1, 0.22);
      sfxNoise(t + 0.055, 0.045, 1900, 1.2, 0.18);
    }
  },
};
export function setMusic(on) {
  state.musicOn = on;
  if (audio.master) audio.master.gain.setTargetAtTime(on ? 0.8 : 0, audio.ctx.currentTime, 0.1);
  try { localStorage.setItem('gira2-sound', on ? '1' : '0'); } catch (e) {}
  setUI({ musicOn: on });
}
// botão de som e tecla M
export function toggleMusic() { initAudio(); setMusic(!state.musicOn); sfx.click(); }
try { if (localStorage.getItem('gira2-sound') === '0') state.musicOn = false; } catch (e) {}
