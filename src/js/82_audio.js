// ================= som: trilha de lo-fi sintetizada + efeitos =================
const audio = { ctx: null, mood: 0 };
function initAudio() {
  if (audio.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = new AC(); audio.ctx = ctx;
  audio.master = ctx.createGain(); audio.master.gain.value = state.musicOn ? 0.8 : 0; audio.master.connect(ctx.destination);
  audio.music = ctx.createGain(); audio.music.gain.value = 0.32; audio.music.connect(audio.master);
  audio.sfx = ctx.createGain(); audio.sfx.gain.value = 0.6; audio.sfx.connect(audio.master);
  audio.tick = ctx.createGain(); audio.tick.gain.value = 0; audio.tick.connect(audio.music);
  const len = ctx.sampleRate * 0.5, nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  audio.noise = nb;
  // reverb simples
  const ir = ctx.createBuffer(2, ctx.sampleRate * 1.8, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3); }
  audio.verb = ctx.createConvolver(); audio.verb.buffer = ir;
  const vg = ctx.createGain(); vg.gain.value = 0.35; audio.verb.connect(vg); vg.connect(audio.music);
  audio.next = ctx.currentTime + 0.1; audio.step = 0;
  setInterval(schedule, 60);
}
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
// dias úteis: Fmaj7 Em7 Dm7 Cmaj7 · domingo: Cmaj7 Fmaj7 Am7 G6
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
const CHORDS_SUN = [[48, 52, 55, 59], [53, 57, 60, 64], [57, 60, 64, 67], [55, 59, 62, 64]];
const MEL = [72, 74, 76, 79, 81, 79, 76, 74, 72, 69, 67, 69];
const MEL_SUN = [72, 76, 79, 81, 84, 81, 79, 76, 74, 72];
const BPM = 78, STEP = 60 / BPM / 2;
function voice(t, f, dur, type, gain, dest, attack = 0.02, cutoff = 2200) {
  const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
  o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cutoff;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl); fl.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  return g;
}
const melRand = mulberry(3);
function schedule() {
  const ctx = audio.ctx; if (!ctx) return;
  const sun = state.sunday, quiet = state.strike;
  while (audio.next < ctx.currentTime + 0.25) {
    const t = audio.next, s = audio.step, bar = Math.floor(s / 8) % 4, beat = s % 8;
    const ch = (sun ? CHORDS_SUN : CHORDS)[bar];
    if (beat === 0) for (const n of ch) { const g = voice(t, midi(n), STEP * 8.2, 'triangle', quiet ? 0.03 : 0.045, audio.music, 0.4, 900); g.connect(audio.verb); }
    if (!quiet && (beat === 0 || beat === 5)) voice(t, midi(ch[0] - 12), STEP * 3, 'sine', 0.12, audio.music, 0.01, 400);
    if (!quiet && (beat === 2 || beat === 3 || beat === 6 || (sun && beat === 4)) && melRand() < 0.7) {
      const M = sun ? MEL_SUN : MEL, m = M[Math.floor(melRand() * M.length)];
      const g = voice(t, midi(m), 0.6, 'sine', 0.05, audio.music, 0.005, 3000); g.connect(audio.verb);
    }
    // tique-taque do relógio de ponto: só soa quando você anda
    if (!sun) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = beat % 2 ? 1900 : 1500;
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03); o.connect(g); g.connect(audio.tick); o.start(t); o.stop(t + 0.05);
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
const sfx = {
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
};
function setMusic(on) {
  state.musicOn = on;
  if (audio.master) audio.master.gain.setTargetAtTime(on ? 0.8 : 0, audio.ctx.currentTime, 0.1);
  try { localStorage.setItem('gira2-sound', on ? '1' : '0'); } catch (e) {}
  $('ico-sound').innerHTML = on ? '<path d="M12 6l14-3v18.5a4.5 4 0 1 1-3-3.8V8.3l-8 1.7v14.5a4.5 4 0 1 1-3-3.8z"/>'
    : '<path d="M12 6l14-3v18.5a4.5 4 0 1 1-3-3.8V8.3l-8 1.7v14.5a4.5 4 0 1 1-3-3.8z" opacity=".35"/><path d="M4 4l24 24" stroke="#c25959" stroke-width="3.5" stroke-linecap="round"/>';
}
try { if (localStorage.getItem('gira2-sound') === '0') state.musicOn = false; } catch (e) {}
