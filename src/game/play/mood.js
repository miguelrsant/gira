// ================= humor e ânimo da Duda =================
// o humor de base vem do dia da semana (story/moods.js); o ânimo (state.animo, 0 a 1) cai quando ela anda
// e sobe nos respiros. Quem desenha o humor (rosto, postura, passo) é o player.js: aqui só se escolhe qual.
import { setUI, getUI } from '../../store.js';
import { LAP, WALK } from '../core/config.js';
import { arcDist, clamp, rr } from '../core/math.js';
import { DISTRICTS } from '../world/places.js';
import { DAY_MOOD, RESPIROS } from '../story/moods.js';
import { actor } from './actors.js';
import { sfx } from './audio.js';
import { showEmote } from './bubbles.js';
import { hintOnce, setHint } from './hud.js';
import * as P from './player.js';
import { state } from './state.js';

const M = { key: '', lastW: 0, mood: '', happyT: 0, gT: 6, used: new Set(), prog: 0, at: null, jumps: 0, air: false, closedT: 0 };
const dayInfo = () => DAY_MOOD[state.day] || DAY_MOOD[1];
export function wakeLine(day) { return (DAY_MOOD[day] || DAY_MOOD[1]).wake; }
const gesture = (g) => { if (P.heroGesture) P.heroGesture(g); };

function newDay() {
  M.key = state.week + ':' + state.day; M.used.clear(); M.lastW = state.walked; M.happyT = 0; M.prog = 0; M.at = null;
  state.animo = dayInfo().start;
}
function pickMood() {
  if (state.strike || state.sunday) return 'feliz';
  if (M.happyT > 0) return 'feliz';
  const base = dayInfo().mood, a = state.animo;
  if (a < 0.18) return 'exausta';
  if (a < 0.38 && base !== 'exausta') return 'cansada';
  if (a > 0.82 && base !== 'entediada') return 'tranquila';
  return base;
}
// respiro disponível onde a Duda está agora
function respiroHere() {
  for (const r of RESPIROS) {
    if (M.used.has(r.id) || r.kind === 'talk') continue;
    if (r.district) { const z = DISTRICTS.find((q) => q.name === r.district); if (z && arcDist(P.player.d, z.d) < z.r * 0.8) return r; }
    if (r.npc) { const a = actor(r.npc); if (a && a.dist < (r.r || 3)) return r; }
  }
  return null;
}
function gain(r) {
  M.used.add(r.id);
  state.animo = clamp(state.animo + r.gain, 0, 1);
  M.happyT = 5; M.gT = 1.2; M.stretch = true;
  sfx.chime(); showEmote(null, '♥');
  setHint(`Respiro: ${r.done} (ânimo +${Math.round(r.gain * 100)})`, 4200);
}
// conversas e carinhos que contam como respiro (o director chama depois da conversa)
export function respiroTalk(id) {
  if (state.strike || state.sunday) return;
  const r = RESPIROS.find((q) => q.kind === 'talk' && q.npc === id);
  if (r && !M.used.has(r.id)) gain(r);
}

export function updateMood(dt) {
  if (state.mode !== 'play' && state.mode !== 'cutscene') return;
  if (M.key !== state.week + ':' + state.day) newDay();
  const info = dayInfo(), pl = P.player;
  // andar cansa (correr cansa mais); na terça o relógio anda de má vontade
  const dW = state.walked - M.lastW;
  if (dW > 0 && !state.sunday && !state.strike) {
    const run = pl.aspeed > WALK + 0.5 ? 1.6 : 1;
    state.animo = clamp(state.animo - (dW / LAP) * 0.55 * info.drain * run, 0, 1);
    if (info.slow) state.walked -= dW * info.slow;
  }
  M.lastW = state.walked;
  if (state.sunday || state.strike) state.animo = Math.min(1, state.animo + dt * 0.05);
  if (M.happyT > 0) M.happyT -= dt;
  const mood = pickMood();
  if (mood !== M.mood) { M.mood = state.mood = mood; if (P.setHeroMood) P.setHeroMood(mood); }
  if (state.mode !== 'play' || state.dialog) { publish(null); return; }
  if (state.animo < 0.18) hintOnce('animo' + M.key, 'Sem ânimo, a Duda arrasta os pés. Procure um respiro: o mar, a horta, o Caramelo, o banco do Seu Lino...', 7000);
  // respiros no lugar
  const r = state.sunday || state.strike ? null : respiroHere();
  if (r !== M.at) { M.at = r; M.prog = 0; M.jumps = 0; }
  if (r && r.kind === 'closed') {
    if (M.closedT <= 0) { setHint(r.text, 5000); M.closedT = 40; }
  } else if (r && r.kind === 'still') {
    if (pl.aspeed < 0.4 && !pl.air) M.prog += dt; else M.prog = Math.max(0, M.prog - dt * 2);
    if (M.prog >= r.time) { gain(r); M.at = null; }
  } else if (r && r.kind === 'jump') {
    if (pl.air && !M.air) M.jumps++;
    if (M.jumps >= r.count) { gain(r); M.at = null; }
  }
  M.air = pl.air;
  if (M.closedT > 0) M.closedT -= dt;
  publish(M.at && M.at.kind !== 'closed' ? M.at : null);
  // gestos de vez em quando, conforme o humor
  M.gT -= dt;
  if (M.gT <= 0) {
    M.gT = rr(9, 16);
    const idle = state.idleT > 2.5, v = actor('valdir');
    if (M.stretch) { M.stretch = false; gesture('espreguicar'); }
    else if (mood === 'irritada' && v && v.dist < 7) gesture('bufar');
    else if (mood === 'entediada') gesture(idle ? 'bocejo' : 'olhar-relogio');
    else if (mood === 'exausta') { gesture(Math.random() < 0.6 ? 'dor-de-cabeca' : 'suspiro'); if (Math.random() < 0.3) showEmote(null, '…'); }
    else if (mood === 'cansada') gesture(idle ? 'bocejo' : 'suspiro');
    else if (mood === 'irritada' && idle) gesture('bufar');
  }
}
// chip do respiro (o <Respiro> do React): texto e progresso
let lastR = '';
function publish(r) {
  let v = null;
  if (r) {
    const k = r.kind === 'jump' ? M.jumps / r.count : M.prog / r.time;
    const how = r.kind === 'jump' ? `pule (${M.jumps}/${r.count})` : 'fique parada um pouco';
    v = { text: r.text, how, k: clamp(k, 0, 1) };
  }
  const sig = v ? v.text + v.how + Math.round(v.k * 20) : '';
  if (sig !== lastR) { lastR = sig; if (getUI().respiro !== v) setUI({ respiro: v }); }
}
