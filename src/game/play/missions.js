// ================= missões: o motor =================
// os dados (quem pede o quê, as falas) ficam em story/missions.js; aqui ficam os passos andando,
// as coisas para pegar no mundo, o relógio das corridas e o cartão de objetivo do HUD
import * as THREE from 'three';
import { setUI, getUI } from '../../store.js';
import { LAP, R, RUN, SEA } from '../core/config.js';
import { arcDist, C, dirOf, headingVec, offsetDir, orient, rand, rr, V3 } from '../core/math.js';
import { camera, scene } from '../core/renderer.js';
import { MAT, overHorizon } from '../world/chunks.js';
import { Geo, GEO, TM } from '../world/geo.js';
import { DISTRICTS } from '../world/places.js';
import { groundAt } from '../world/terrain.js';
import { ITEMS, META, MISSIONS } from '../story/missions.js';
import { actor } from './actors.js';
import { sfx } from './audio.js';
import { showEmote } from './bubbles.js';
import { insideTall, pushOut, walkable } from './collide.js';
import { openDialog } from './dialog.js';
import { setHint, toast } from './hud.js';
import { player } from './player.js';
import { state } from './state.js';

const live = [];          // missões do dia: { m, i, done, failed, got, stayT, item, place }
let T = null;             // relógio da missão: { L, t, max }
let busy = false;         // uma fala de missão está acontecendo
let dayKey = '', introT = -1, metaKey = '';

const flagsOf = (L) => ({ ...state.flags, failed: !!L?.failed });
const val = (x, L) => (typeof x === 'function' ? x(flagsOf(L), state.support.size, L?.place) : x);
const cur = (L) => L.m.steps[L.i];
const whoOf = (s, L) => [].concat(val(s.who, L) || []);
const shown = (L) => !L.done && (L.m.main || L.m.meta || L.i > 0);

// ---------------- começo do dia ----------------
function clearDay() {
  for (const L of live) dropItem(L);
  live.length = 0; T = null; state.chase = null;
}
function startDay() {
  clearDay();
  dayKey = state.week + ':' + state.day;
  const list = state.week === 1 ? MISSIONS[state.day] || [] : [];
  for (const m of list) {
    const L = { m, i: 0, done: false, failed: false, got: new Set(), stayT: 0, item: null, place: null };
    if (m.set) Object.assign(state.flags, m.set);
    live.push(L); startStep(L);
  }
  introT = list.some((m) => m.intro) ? 1.4 : -1;
  publish(true);
}
export function dayTitle(day) { return state.week === 1 ? MISSIONS[day]?.find((m) => m.main)?.title || null : null; }
export function mainPending() { return live.some((L) => L.m.main && !L.done); }

// ---------------- passos ----------------
function startStep(L) {
  const s = cur(L);
  L.stayT = 0; L.got.clear();
  if (s.do === 'get') spawnItem(L, s);
  if (s.do === 'chase') { state.chase = val(s.who, L); setHint('O Caramelo tá fugindo! Corre atrás dele (segure SHIFT, ou arraste mais longe).', 5000); }
  if (s.time) {
    let max = s.time;
    if (max === 'auto') {
      const dist = arcDist(player.d, placeDir(s, L) || player.d), legs = s.stopTimer ? 1 : 2;
      max = Math.round((dist * legs) / (RUN * 0.78) + 9);
    }
    T = { L, t: max, max };
    sfx.bell();
  }
}
function advance(L) {
  const s = cur(L);
  if (s.stopTimer && T && T.L === L) T = null;
  if (s.end) { complete(L); return; }
  L.i++;
  if (L.i >= L.m.steps.length) complete(L); else startStep(L);
  publish(true);
}
function complete(L) {
  L.done = true; dropItem(L);
  if (T && T.L === L) T = null;
  if (state.chase && L.m.steps.some((s) => s.do === 'chase')) state.chase = null;
  const sub = L.m.meta ? (L.failed ? 'meta não batida' : 'meta batida') : L.m.main ? 'história do dia concluída' : 'pedido concluído';
  toast(L.m.title.toUpperCase(), sub);
  sfx.chime();
  if (L.m.main && state.walked < LAP) setTimeout(() => { if (state.mode === 'play') setHint('A volta do dia continua. Ainda dá pra ajudar os vizinhos.', 4500); }, 3400);
  publish(true);
}
function addSupport(id) {
  if (!id || state.support.has(id)) return;
  state.support.add(id);
  const a = actor(id);
  if (a) { a.reactT = 0.6; a.reactTxt = '♥'; a.ch.st.happy = 1.6; }
  setTimeout(() => setHint(`${a ? a.n.name.replace(/^(SEU|DONA|SR\.) /, '').toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()) : 'Mais alguém'} vai parar junto no domingo. (${state.support.size} pessoas)`, 4200), 400);
}
function applyEnd(s, L, c) {
  if (c?.set) Object.assign(state.flags, c.set);
  if (s.after) for (const k in s.after) state.flags[k] = val(s.after[k], L);
  addSupport(val(c?.support, L)); addSupport(val(s.support, L));
}
// as falas de um passo (quem fala: o NPC do say, ou o narrador)
async function speak(L, s, lines, choices, sayId, name) {
  lines = val(lines, L);
  if (!lines || !lines.length) return null;
  const a = sayId ? actor(sayId) : null;
  const nm = name || (a ? a.n.name : (ITEMS[s.item]?.name || L.m.title.toUpperCase()));
  return openDialog(nm, a ? a.n.tag : '#7d8a88', lines, { voice: a ? a.n.voice : 170, speaker: a?.ch, choices: choices ? choices.map((c) => c.label) : null });
}
async function finish(L, s, sayId) {
  busy = true;
  try {
    const k = await speak(L, s, s.lines, s.choices, sayId ?? s.say);
    const c = s.choices && k !== null ? s.choices[k] : null;
    if (c?.lines) await speak(L, s, c.lines, null, sayId ?? s.say);
    applyEnd(s, L, c);
  } finally { busy = false; }
  advance(L);
}

// ---------------- conversas (o director pergunta antes de abrir a conversa normal) ----------------
export function missionTalk(id) {
  for (const L of live) {
    if (L.done) continue;
    const s = cur(L);
    if (s.do === 'talk' && whoOf(s, L).includes(id) && !L.got.has(id)) return L;
  }
  return null;
}
export async function runMissionTalk(L, a) {
  const s = cur(L), id = a.id, part = s.each ? s.each[id] : s;
  busy = true;
  try {
    const k = await speak(L, s, part.lines, part.choices, id);
    const c = part.choices && k !== null ? part.choices[k] : null;
    if (c?.lines) await speak(L, s, c.lines, null, id);
    applyEnd(part, L, c);
    if (s.each && part !== s) applyEnd(s, L, null);
  } finally { busy = false; }
  if (s.each) { L.got.add(id); if (L.got.size < whoOf(s, L).length) { publish(true); return; } }
  advance(L);
}

// ---------------- coisas para pegar ----------------
let paperGeo = {};
function itemGeo(key) {
  if (paperGeo[key]) return paperGeo[key];
  const it = ITEMS[key], g = new Geo();
  g.add(GEO.box, TM(0, 0, 0, 0.46, 0.34, 0.01), null, { c: C(it.color), id: 6 });
  for (const z of [0.006, -0.006]) {
    g.add(GEO.box, TM(0, 0.05, z, 0.34, 0.15, 0.004), null, { c: C(it.ink), id: 6 });
    g.add(GEO.box, TM(-0.04, -0.09, z, 0.26, 0.03, 0.004), null, { c: C(it.ink), id: 6 });
  }
  return (paperGeo[key] = g.build());
}
// um lugar livre perto de d: chão firme, fora de prédio
const _f = { a: V3(), b: V3() };
function freeSpot(d, out = V3()) {
  for (const r of [0, 1.2, 2.4, 3.6, 5, 6.5]) {
    for (let k = 0; k < (r ? 10 : 1); k++) {
      out.copy(r ? offsetDir(d, headingVec(d, k * 36 + r * 17), r, _f.a) : d);
      pushOut(out, 0.6);
      if (walkable(out) && groundAt(out) > SEA + 0.08 && !insideTall(out, 0.5)) return out;
    }
  }
  return out.copy(d);
}
function spawnItem(L, s) {
  const m = new THREE.Mesh(itemGeo(s.item), MAT.world); m.castShadow = true;
  scene.add(m);
  let d, h;
  if (s.near) {
    const a = actor(s.near), base = a.home || a.d;
    d = offsetDir(base, a.baseFwd || a.fwd, 1.5); h = (a.homeH ?? a.h) + 0.85;
  } else { d = freeSpot(dirOf(s.at[0], s.at[1])); h = groundAt(d) + 0.85; }
  L.item = { m, d: d.clone(), h, hops: s.hops || 0, fly: null, fwd: headingVec(d, rand() * 360), t: rand() * 6 };
}
function dropItem(L) { if (L.item) { scene.remove(L.item.m); L.item = null; } }
function updateItem(L, s, dt) {
  const it = L.item; if (!it) return;
  it.t += dt;
  if (it.fly) {
    it.fly.k = Math.min(1, it.fly.k + dt / 0.9);
    const k = it.fly.k, e = k * k * (3 - 2 * k);
    it.d.copy(it.fly.a).lerp(it.fly.b, e).normalize();
    it.h = it.fly.h0 + (it.fly.h1 - it.fly.h0) * e + Math.sin(k * Math.PI) * 2.2;
    if (k >= 1) it.fly = null;
  }
  const camD = camera.position.length();
  it.m.visible = overHorizon(it.d, 0, 2, camera.position, camD);
  if (it.m.visible) {
    it.m.position.copy(it.d).multiplyScalar(R + it.h + Math.sin(it.t * 2.2) * 0.1);
    orient(it.m, it.d, _f.b.copy(it.fwd).applyAxisAngle(it.d, it.t * (it.fly ? 9 : 1.4)));
    it.m.rotateX(Math.sin(it.t * 1.7) * 0.2 + (it.fly ? it.t * 6 : 0));
  }
  if (it.fly || state.mode !== 'play' || state.dialog || busy) return;
  const dist = arcDist(player.d, it.d);
  // o vento leva de novo, para longe da Duda
  if (it.hops > 0 && dist < 2.8) {
    it.hops--;
    const away = _f.a.copy(it.d).sub(player.d); away.addScaledVector(it.d, -away.dot(it.d));
    if (away.lengthSq() < 1e-8) away.copy(it.fwd);
    away.normalize().applyAxisAngle(it.d, rr(-0.7, 0.7));
    const to = freeSpot(offsetDir(it.d, away, rr(6, 9)));
    it.fly = { a: it.d.clone(), b: to.clone(), h0: it.h, h1: groundAt(to) + 0.85, k: 0 };
    sfx.paper(); setHint(it.hops ? 'Ih! O vento levou de novo!' : 'O vento levou de novo! Quase...', 2600);
    return;
  }
  if (dist < 1.3 && Math.abs(player.feet + 0.85 - it.h) < 1.9) {
    dropItem(L); sfx.chime(); showEmote(null, '!');
    finish(L, s);
  }
}

// ---------------- onde fica o alvo de cada passo ----------------
function placeDir(s, L) {
  const p = s.place === '$' ? L.place : s.place;
  const z = DISTRICTS.find((q) => q.name === p);
  if (z) return z.d;
  const a = actor(p);
  return a ? a.d : null;
}
const _g = V3();
// metas do momento para o desenho das setas: [{ pos, main }] (itens e lugares; gente tem marcador próprio)
export function goals() {
  const out = [];
  for (const L of live) {
    if (!shown(L)) continue;
    const s = cur(L), main = L.m.main || L.m.meta;
    if (s.do === 'get' && L.item) out.push({ pos: _g.copy(L.item.d).multiplyScalar(R + L.item.h + 0.5).clone(), main });
    if (s.do === 'reach') {
      const d = placeDir(s, L);
      if (d && !actor(s.place)) out.push({ pos: d.clone().multiplyScalar(R + groundAt(d) + 2.2), main, place: true });
    }
  }
  return out;
}
// para o marcador em cima de alguém: 'main', 'side' (pedido aceito), 'offer' (pedido ainda não aceito) ou null
export function questOf(id) {
  let best = null;
  for (const L of live) {
    if (L.done) continue;
    const s = cur(L);
    const hit = ((s.do === 'talk' && !L.got.has(id)) || s.do === 'stay' || s.do === 'emote' || s.do === 'chase' || (s.do === 'reach' && s.place === id)) && whoOf(s, L).concat(s.place || []).includes(id);
    if (!hit) continue;
    const k = L.m.main || L.m.meta ? 'main' : L.i > 0 ? 'side' : 'offer';
    if (k === 'main') return k;
    if (!best || k === 'side') best = k;
  }
  return best;
}
export function bubbleOf(id) {
  for (const L of live) {
    if (L.done) continue;
    const s = cur(L);
    if (s.bubble && whoOf(s, L).includes(id) && !L.got.has(id)) return val(s.bubble, L);
  }
  return null;
}

// ---------------- a cada quadro ----------------
const _e = { last: 0 };
export function updateMissions(dt) {
  if (state.mode !== 'play' && state.mode !== 'cutscene') return;
  if (state.strike || state.sunday) { if (live.length) clearDay(); publish(); return; }
  if (state.mode === 'play' && dayKey !== state.week + ':' + state.day) startDay();
  for (const L of live) { const s = L.done ? null : cur(L); if (s && s.do === 'get') updateItem(L, s, dt); }
  if (state.mode !== 'play') { publish(); return; }
  // a fala de abertura do dia (o Valdir, no dia do alto-falante)
  if (introT > 0 && !state.dialog && !busy) {
    introT -= dt;
    if (introT <= 0) { const L = live.find((q) => q.m.intro); if (L) playIntro(L); }
  }
  // o relógio
  if (T && !state.dialog && !busy) {
    T.t -= dt;
    if (T.t <= 0) {
      const L = T.L, s = cur(L); T = null;
      L.failed = true; dropItem(L); sfx.thud();
      setHint('O tempo acabou.', 2500);
      L.i = s.fail ?? L.m.steps.length - 1; startStep(L); publish(true);
    }
  }
  // meta relâmpago: uma vez por dia, no meio do expediente
  const mk = state.week + ':' + state.day;
  if (metaKey !== mk && state.day <= 6 && (state.week > 1 || state.day >= 2) && state.walked > LAP * 0.42 && !T && !state.chase && !busy && !state.dialog && introT <= 0) startMeta(mk);
  if (state.dialog || busy) { publish(); return; }
  for (const L of live) {
    if (L.done) continue;
    const s = cur(L);
    if (s.do === 'none') { finish(L, s); break; }
    if (s.do === 'chase') {
      const a = actor(s.who);
      if (a && arcDist(player.d, a.d) < 1.35) { state.chase = null; a.ch.st.wag = 4; sfx.bark(); finish(L, s, a.id); break; }
    }
    if (s.do === 'reach') {
      const d = placeDir(s, L);
      if (d && arcDist(player.d, d) < (s.r || (DISTRICTS.find((q) => q.d === d)?.r ?? 3) * 0.75)) { finish(L, s); break; }
    }
    if (s.do === 'stay') {
      const a = actor(val(s.who, L));
      if (a && a.dist < 3.4 && player.aspeed < 0.4) {
        if (L.stayT === 0) setHint('Fica paradinha aqui um pouco...', 3000);
        L.stayT += dt; if (L.stayT >= s.time) { finish(L, s); break; }
      }
    }
    if (s.do === 'emote') {
      const e = state.lastEmote, a = actor(val(s.who, L));
      if (L.wait > 0) { L.wait -= dt; if (L.wait <= 0) { finish(L, s); break; } continue; }
      // a emoção aparece primeiro; a fala vem logo depois
      if (e && e.t !== _e.last && e.e === s.emote && a && a.dist < (s.r || 5.5)) { _e.last = e.t; L.wait = 0.9; }
    }
  }
  publish();
}
async function playIntro(L) {
  const it = L.m.intro, a = actor(it.say);
  busy = true;
  sfx.bell();
  try { await openDialog(val(it.name, L) || a.n.name, a.n.tag, val(it.lines, L), { voice: a.n.voice, speaker: a.ch }); } finally { busy = false; }
}
function startMeta(mk) {
  metaKey = mk;
  const far = DISTRICTS.filter((z) => { const d = arcDist(player.d, z.d); return d > 26 && d < 62 && groundAt(z.d) > SEA; });
  if (!far.length) return;
  const z = far[Math.floor(rand() * far.length)];
  const L = { m: META, i: 0, done: false, failed: false, got: new Set(), stayT: 0, item: null, place: z.name };
  live.push(L);
  playIntro(L).then(() => { if (!L.done) { startStep(L); publish(true); } });
}

// ---------------- cartão de objetivo (o <Quests> do React) ----------------
let lastSig = '', pubAt = 0;
function publish(force) {
  const now = performance.now();
  if (!force && now - pubAt < 100) return;
  pubAt = now;
  const out = [];
  for (const L of live) {
    if (!shown(L)) continue;
    if (L.m.meta && L.i === 0 && !(T && T.L === L)) continue;
    const s = cur(L);
    let text = val(s.text, L) || '';
    if (s.each) text += ` (${L.got.size}/${whoOf(s, L).length})`;
    if (s.do === 'stay' && L.stayT > 0) text += ` (${Math.max(0, Math.ceil(s.time - L.stayT))} s)`;
    const timer = T && T.L === L ? Math.max(0, Math.ceil(T.t)) : null;
    out.push({ kind: L.m.meta ? 'META DO VALDIR' : L.m.main ? 'HISTÓRIA DO DIA' : 'PEDIDO', title: L.m.title, text, timer, low: timer !== null && timer <= 10, main: !!(L.m.main || L.m.meta) });
  }
  out.sort((a, b) => b.main - a.main);
  const sig = JSON.stringify(out);
  if (sig !== lastSig || force) { lastSig = sig; if (JSON.stringify(getUI().quests) !== sig) setUI({ quests: out }); }
}

// atalhos de teste
export const MISSION_DEBUG = {
  live,
  // termina o passo atual da primeira missão aberta (ou da missão id)
  skip(id) { const L = live.find((q) => !q.done && (!id || q.m.id === id)); if (!L) return; const s = cur(L); if (s.do === 'get') dropItem(L); if (s.do === 'chase') state.chase = null; applyEnd(s, L, s.choices?.[0]); advance(L); },
  meta() { metaKey = ''; state.walked = Math.max(state.walked, LAP * 0.45); },
};
