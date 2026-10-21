// ================= HUD, avisos, painéis e cartões =================
// o jogo decide o que aparece; os componentes React (src/ui) desenham a partir de getUI()
import { setUI, getUI } from '../../store.js';
import { DAYS, LAP } from '../core/config.js';
import { clamp } from '../core/math.js';
import { DISTRICTS } from '../world/places.js';
import { NPCS } from '../story/npcs.js';
import { sfx } from './audio.js';
import { dayP, state } from './state.js';


// ---------------- cartões de tela cheia (fim do dia, fim da semana) ----------------
// buttons: [[texto, função, alternativo?], ...]
export function showCard({ k, t, s, buttons, see }) {
  const bs = buttons ? buttons.map(([label, fn, alt]) => ({ label, alt: !!alt, fn: () => { sfx.click(); fn(); } })) : null;
  setUI({ card: { on: true, see: !!see, k, t, s: s || '', buttons: bs } });
  sfx.chime();
}
// troca o texto sem fechar o cartão
export function setCardText(k, t, s) { setUI({ card: { ...getUI().card, k, t, s, buttons: null } }); }
export function hideCard() { setUI({ card: { ...getUI().card, on: false } }); }

// ---------------- cartão do dia ----------------
function fmtClock(p) { const mins = 7 * 60 + Math.floor(p * 12 * 60); return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0'); }
export function updateHud() {
  const p = state.sunday ? 1 : clamp(state.walked / LAP, 0, 1), extra = !state.sunday && state.walked > LAP;
  const day = {
    fill: (p * 100).toFixed(1) + '%',
    pct: state.sunday ? 'folga' : extra ? 'hora extra' : Math.floor(p * 100) + '%',
    clock: state.sunday ? fmtClock(dayP()) : fmtClock(state.walked / LAP),
    name: state.sunday ? 'DOMINGO' : DAYS[state.day - 1],
    week: state.sunday ? 'FOLGA DE VERDADE' : `DIA ${state.day} DE 7 · SEMANA ${state.week}`,
    animo: Math.round(state.animo * 100) + '%', mood: state.mood, low: state.animo < 0.25,
  };
  const ui = getUI(), o = ui.day;
  if (o.fill !== day.fill || o.pct !== day.pct || o.clock !== day.clock || o.name !== day.name || o.week !== day.week || o.animo !== day.animo || o.mood !== day.mood) setUI({ day });
  const stopped = (state.mode === 'play' && !state.sunday && !state.strike && state.idleT > 1.4 && !state.dialog) || state.strike;
  if (ui.stopped !== stopped) setUI({ stopped });
}
// tarefas do dia e bairros já visitados (painel do menu)
export function refreshTasks() {
  const p = clamp(state.walked / LAP, 0, 1);
  const tasks = [];
  if (state.sunday) {
    const all = NPCS.length, got = NPCS.filter((n) => state.talked.has(n.id)).length;
    tasks.push(['Parar', true]);
    tasks.push([`Conversar com todo mundo no domingo (${got}/${all})`, got >= all]);
    tasks.push(['Ver o pôr do sol do mirante', state.visited.has('MIRANTE') && state.district?.name === 'MIRANTE']);
  } else {
    tasks.push([`Dar a volta do dia: andar é trabalhar (${Math.floor(p * 100)}%)`, p >= 1]);
    tasks.push([`Conversar com 3 pessoas hoje (${Math.min(3, state.talked.size)}/3)`, state.talked.size >= 3]);
    if (state.day === 7) tasks.push(['Falar com a Nara na padaria Pão de Cada Dia', state.talked.has('nara')]);
    else tasks.push(['Chegar até o domingo', false]);
  }
  tasks.push([`Achar as folhas de domingo arrancadas (${state.pages.size}/7)`, state.pages.size >= 7]);
  const explore = DISTRICTS.map((z) => {
    const v = state.visited.has(z.name);
    return { text: v ? z.name.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()) : '???', done: v };
  });
  setUI({ tasks: tasks.map(([text, done]) => ({ text, done: !!done })), explore });
}

// ---------------- dicas e avisos ----------------
let hintTimer = 0;
export function setHint(text, ms = 4000) {
  setUI({ hint: { text, on: true } });
  clearTimeout(hintTimer); hintTimer = setTimeout(() => setUI({ hint: { ...getUI().hint, on: false } }), ms);
}
export function hintOnce(key, text, ms) { if (state.hints.has(key)) return; state.hints.add(key); setHint(text, ms); }
let toastTimer = 0;
export function toast(t, s, ms = 3200) {
  setUI({ toast: { t, s: s || '', on: true } });
  clearTimeout(toastTimer); toastTimer = setTimeout(() => setUI({ toast: { ...getUI().toast, on: false } }), ms);
  sfx.paper();
}

// ---------------- painéis: 'menu', 'wardrobe' ou 'emotes' ----------------
export function togglePanel(id) { setUI({ panel: id && getUI().panel !== id ? id : null }); sfx.paper(); }
export function closePanels() { if (getUI().panel) setUI({ panel: null }); }
// atalho de teste do menu
export function skipDay() { if (state.mode === 'play' && !state.sunday && !state.strike) { state.walked = LAP * 1.4; togglePanel(null); } }
