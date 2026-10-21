// ================= conversas, leituras e o roteiro =================
import { setUI } from '../../store.js';
import { DAYS, IS_TOUCH, LAP, R } from '../core/config.js';
import { arcDist, clamp, V3, wait } from '../core/math.js';
import { ctxDir } from '../world/kit.js';
import { DISTRICTS, INTERACT, SPOTS } from '../world/places.js';
import { groundAt } from '../world/terrain.js';
import { headline } from '../story/news.js';
import { npcLines, strikeLines, valdirSpeech } from '../story/npcs.js';
import { actor, ACTORS, placeActor } from './actors.js';
import { sfx } from './audio.js';
import { showEmote } from './bubbles.js';
import { cam, pickSide } from './camera.js';
import { openDialog } from './dialog.js';
import { hideCard, hintOnce, refreshTasks, setCardText, setHint, showCard, toast, togglePanel } from './hud.js';
import { dayTitle, mainPending, missionTalk, runMissionTalk } from './missions.js';
import { respiroTalk, wakeLine } from './mood.js';
import { player } from './player.js';
import { EXTRA_DIST, state } from './state.js';

export async function startTalk(a) {
  if (state.dialog || state.mode !== 'play' || a.talking) return;
  const n = a.n;
  a.talking = true; target = null;
  togglePanel(null);
  cam.side = pickSide(a); cam.shot = { kind: 'talk', a };
  if (a.pet === 'cat') { a.ch.st.sleep = false; a.ch.st.pose = 'sit'; sfx.meow(); }
  if (a.pet === 'dog') { sfx.bark(); a.ch.st.wag = 3; }
  const quest = n.id === 'nara' && state.day === 7 && !state.strike && !state.sunday;
  // um passo de missão com essa pessoa vem antes da conversa do dia
  const mt = !quest && !state.strike && !state.sunday ? missionTalk(n.id) : null;
  const choice = mt ? await runMissionTalk(mt, a)
    : await openDialog(n.name, n.tag, npcLines(n), { voice: n.voice, speaker: a.ch, choices: quest ? ['Parar com todo mundo', 'Melhor continuar andando'] : null });
  state.talked.add(n.id);
  respiroTalk(n.id);
  a.ch.st.happy = 0.9;
  if (a.pet === 'cat') { a.ch.st.sleep = true; a.ch.st.pose = 'sleep'; }
  if (a.pet === 'dog' && !state.strike) { state.follow = 80; hintOnce('dog', 'O Caramelo resolveu te acompanhar um pouco.', 4000); }
  refreshTasks();
  if (quest) {
    if (choice === 0) { a.talking = false; startStrike(a); return; }
    state.declined = true;
    await openDialog(n.name, n.tag, n.lines.declined, { voice: n.voice, speaker: a.ch });
  }
  a.talking = false; cam.shot = null;
  if (state.talked.size === 1) hintOnce('walk', 'Cada passo é trabalho: a barra do dia só enche quando você anda.', 5500);
}
async function startRead(it) {
  if (state.dialog || state.mode !== 'play') return;
  state.read.add(it); target = null;
  togglePanel(null);
  cam.shot = { kind: 'look', p: it.pos };
  let lines = it.lines;
  if (it.news) { const h = headline(); lines = [`JORNAL DE ${state.sunday ? 'DOMINGO' : DAYS[state.day - 1]}: ${h[0]}`, h[1]]; }
  await openDialog(it.name, '#7d8a88', lines, { voice: 170 });
  cam.shot = null;
}
async function endDay() {
  state.mode = 'cutscene'; target = null;
  togglePanel(null);
  const lastDay = state.day === 7;
  if (lastDay) showCard({ k: `SEMANA ${state.week} CONCLUÍDA`, t: 'MAIS UMA SEMANA', s: 'O planeta agradece a sua dedicação.' });
  else showCard({ k: 'FIM DO EXPEDIENTE', t: `${DAYS[state.day - 1]} ACABOU`, s: state.day === 6 ? 'Amanhã é domingo. Dizem.' : 'Amanhã tem mais.' });
  await wait(2300);
  if (lastDay) { state.week++; state.day = 1; } else state.day++;
  state.walked = 0; state.talked.clear(); state.declined = false;
  const mtitle = dayTitle(state.day);
  setCardText(`DIA ${state.day} DE 7 · SEMANA ${state.week}`, DAYS[state.day - 1], state.day === 7 ? '07:00. Hoje é folga, né?' : `07:00. A Duda ${wakeLine(state.day)}.` + (mtitle ? ` Hoje: ${mtitle.toLowerCase()}.` : ''));
  await wait(1700);
  hideCard();
  state.mode = 'play';
  refreshTasks();
  if (state.day === 7) {
    await wait(800);
    state.mode = 'cutscene';
    sfx.bell();
    const v = actor('valdir');
    const gone = state.flags.megaGone;
    await openDialog(gone ? 'SEU VALDIR · GRITANDO' : 'SEU VALDIR · ALTO-FALANTE', v.n.tag, valdirSpeech(), { voice: v.n.voice, speaker: v.ch });
    state.mode = 'play';
    setHint('A Nara quer falar com você na padaria Pão de Cada Dia.', 6500);
    ACTORS.forEach((a, i) => { if (!a.pet && a.id !== 'valdir' && a.dist < 30) { a.reactT = 0.3 + i * 0.12; a.reactTxt = i % 2 ? '…' : '#@!'; } });
  }
}
function marcosOut(a) {
  if (a.out) return;
  a.out = true;
  const c = SPOTS.wheel;
  a.d.copy(ctxDir(c, 2.4, 2.7)); a.h = groundAt(a.d); a.up = null;
  a.fwd.copy(c.fwd).addScaledVector(a.d, -c.fwd.dot(a.d)).normalize(); a.baseFwd = a.fwd.clone();
  a.ch.st.speed = 0;
  placeActor(a);
}
export async function startStrike() {
  state.strike = true; state.mode = 'cutscene'; target = null;
  togglePanel(null);
  const st = player.ch.st; st.pose = 'ground'; st.act = 'protest'; st.sign = true; player.actT = 0;
  player.vel.set(0, 0, 0);
  sfx.thud();
  ACTORS.forEach((a, i) => {
    const s = a.ch.st;
    if (a.pet) { if (a.id === 'caramelo') s.wag = 6; return; }
    if (a.id === 'valdir' || a.id === 'otavio') return;
    if (a.n.wheel) marcosOut(a);
    setTimeout(() => {
      s.pose = a.n.seat !== undefined ? 'sit' : 'ground';
      s.act = 'protest'; s.sign = true; s.propOn = false; a.actT = 0;
      showEmote(a, ['!', '…', '♥', 'zz'][i % 4]);
    }, 250 + i * 150);
  });
  setTimeout(() => showEmote(actor('valdir'), '#@!'), 1200);
  setTimeout(() => showEmote(actor('otavio'), '?'), 1900);
  setUI({ stoppedText: 'TODO MUNDO PAROU.' });
  cam.distT = 6.8;
  await wait(4500);
  // a câmera sobe: o planeta continua girando, sozinho
  cam.shot = { kind: 'orbit', t: 0, th0: Math.atan2(player.d.z, player.d.x), ph0: clamp(Math.asin(player.d.y), -0.75, 0.95) };
  state.autoSun = true; state.sunP = clamp(state.walked / LAP, 0, 1);
  await wait(3400);
  await openDialog('…', '#7d8a88', strikeLines(), { voice: 160 });
  await wait(900);
  // domingo de verdade: o céu volta devagar para uma tarde clara
  state.sunday = true; state.strike = false; state.autoSun = false; state.sunP = 0.6;
  state.talked.clear();
  sundayPoses();
  refreshTasks();
  showCard({ k: 'FIM', t: 'DOMINGO DE VERDADE', s: 'Ninguém precisou girar o planeta hoje. Ele girou sozinho.', see: true, buttons: [
    ['Continuar passeando', () => { hideCard(); cam.shot = null; cam.distT = 4.6; state.mode = 'play'; setHint('Domingo de verdade. Converse com todo mundo de novo.', 6000); refreshTasks(); }],
    ['Jogar de novo', () => location.reload(), true]] });
}
// domingo: cada um descansa do seu jeito
function sundayPoses() {
  const st = player.ch.st; st.pose = 'stand'; st.act = null; st.sign = false;
  for (const a of ACTORS) {
    const s = a.ch.st; s.sign = false; a.actT = 0;
    if (a.pet) { if (a.id === 'mingau') { s.pose = 'sleep'; s.sleep = true; } continue; }
    if (a.id === 'valdir') { s.act = 'shrug'; s.propOn = false; continue; }
    if (a.id === 'otavio') { s.act = null; continue; }
    if (a.n.seat !== undefined) { s.pose = 'sit'; s.act = null; continue; }
    if (a.id === 'tonho') { s.pose = 'stand'; s.act = 'fish'; continue; }
    if (a.id === 'neide') { s.pose = 'ground'; s.act = 'news'; s.propOn = true; continue; }
    if (a.id === 'bia') { s.pose = 'stand'; s.act = 'protest'; continue; }
    if (a.n.wheel) marcosOut(a);
    s.pose = 'ground'; s.act = null; s.propOn = false; s.tired = 0; s.happy = 2;
  }
}
let playT = 0, distTick = 0;
export function updateGame(dt) {
  if (state.mode !== 'play') { target = null; return; }
  playT += dt;
  findTarget();
  if (target && target.kind === 'npc') hintOnce('talk', IS_TOUCH ? 'Toque no balão (ou no aviso embaixo) para conversar.' : 'Aperte E para conversar.', 4500);
  // a volta acabou mas a história do dia não: hora extra (até um limite, que ninguém é de ferro)
  if (!state.sunday && !state.strike && state.walked >= LAP && !state.dialog) {
    if (!mainPending() || state.walked >= LAP + EXTRA_DIST) endDay();
    else hintOnce('extra' + state.week + state.day, 'A volta do dia acabou, mas a história de hoje não. No planeta isso tem nome: hora extra.', 6000);
  }
  distTick -= dt; if (distTick < 0) { distTick = 0.3; updateDistrict(); }
  if (state.idleT > 20 && !state.sunday) hintOnce('idle', 'Parada, o dia não passa. Nem o sol.', 5000);
  if (playT > 45) hintOnce('explore', 'Dá pra ir pra qualquer lugar: praia, parque, morro, fábrica. E tem 7 folhas de domingo escondidas pelo planeta.', 7500);
}

// ================= o que está perto para conversar / olhar =================
export let target = null;
const _tg = V3();
function findTarget() {
  target = null;
  if (state.mode !== 'play' || state.dialog) return null;
  let best = null, bs = 1e9;
  const f = player.fwd;
  for (const a of ACTORS) {
    if (a.dist > 2.7 || !a.vis) continue;
    const dir = _tg.copy(a.d).sub(player.d).normalize();
    const s = a.dist - 0.7 * dir.dot(f);
    if (s < bs) { bs = s; best = { kind: 'npc', a, name: a.n.name }; }
  }
  for (const it of INTERACT) {
    const d = arcDist(player.d, it.dir);
    if (d > 2.1) continue;
    const hh = it.pos.length() - R - player.feet;
    if (hh < -1.2 || hh > 3.2) continue;
    const dir = _tg.copy(it.dir).sub(player.d).normalize();
    const s = d + 0.35 - 0.7 * dir.dot(f);
    if (s < bs) { bs = s; best = { kind: 'it', it, name: it.name }; }
  }
  target = best;
  return best;
}
export function interactNow() {
  const t = target || findTarget();
  if (!t) return;
  if (t.kind === 'npc') startTalk(t.a); else startRead(t.it);
}

// ================= bairros =================
const _dc = {};
function updateDistrict() {
  let best = null, bd = 1e9;
  for (const z of DISTRICTS) { const d = arcDist(player.d, z.d); if (d < z.r && d < bd) { bd = d; best = z; } }
  if (best === state.district) return;
  state.district = best;
  if (!best) return;
  const now = performance.now();
  if (!state.visited.has(best.name)) { state.visited.add(best.name); toast(best.name, best.sub); refreshTasks(); }
  else if (!_dc[best.name] || now - _dc[best.name] > 60000) toast(best.name, best.sub);
  _dc[best.name] = now;
}
