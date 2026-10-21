// ================= diálogo =================
const dlg = { el: $('dialog'), name: $('dname'), text: $('dtext'), next: $('dnext'), choices: $('choices'), port: $('dport') };
const _tagC = new THREE.Color(), _inkC = new THREE.Color('#373f42');
function openDialog(name, color, lines, opts = {}) {
  return new Promise((resolve) => {
    if (state.dialog) closeDialog(null);
    const d = state.dialog = { lines, i: 0, shown: 0, full: false, hold: 0, voice: opts.voice || 200, choices: opts.choices || null, choicesOn: false, sel: 0, choiceT: 0, resolve, speaker: opts.speaker || null, t: 0, toks: [], chars: [] };
    dlg.name.textContent = name;
    dlg.el.style.setProperty('--tag', color);
    dlg.el.style.setProperty('--tagd', '#' + _tagC.set(color).lerp(_inkC, 0.38).getHexString());
    setPortrait(d.speaker, color);
    dlg.el.classList.remove('on', 'choosing'); void dlg.el.offsetWidth; dlg.el.classList.add('on');
    dlg.choices.classList.remove('on'); dlg.choices.innerHTML = '';
    buildLine(d);
    sfx.paper();
  });
}
// "*assim*" vira destaque: na cor de quem fala, ondulando
function buildLine(d) {
  const toks = [];
  let em = false;
  for (const ch of d.lines[d.i]) { if (ch === '*') { em = !em; continue; } toks.push({ ch, em }); }
  d.toks = toks; d.chars = []; d.shown = 0; d.acc = 0; d.full = false; d.hold = 0.05;
  const box = dlg.text; box.textContent = '';
  let word = null, k = 0;
  for (const t of toks) {
    if (t.ch === ' ') { box.appendChild(document.createTextNode(' ')); word = null; d.chars.push(null); continue; }
    if (!word) { word = document.createElement('span'); word.className = 'w'; box.appendChild(word); }
    const c = document.createElement('span');
    c.className = t.em ? 'c h em' : 'c h';
    if (t.em) { const i = document.createElement('i'); i.textContent = t.ch; i.style.setProperty('--k', k++); c.appendChild(i); }
    else c.textContent = t.ch;
    word.appendChild(c); d.chars.push(c);
  }
}
function revealTo(d, n) {
  for (let i = d.shown; i < n; i++) { const c = d.chars[i]; if (c) { c.classList.remove('h'); c.classList.add('in'); } }
  d.shown = n;
}
function lineDone(d) {
  d.full = true;
  if (d.choices && d.i === d.lines.length - 1 && !d.choicesOn) {
    dlg.choices.innerHTML = ''; d.sel = 0; d.choiceT = 0; d.choicesOn = true;
    d.choices.forEach((c, k) => {
      const b = document.createElement('button'); b.textContent = c;
      b.className = (k === 0 ? 'main' : '') + (k === d.sel ? ' sel' : '');
      b.onclick = (ev) => { ev.stopPropagation(); sfx.click(); closeDialog(k); };
      b.onpointerenter = () => selChoice(k);
      dlg.choices.appendChild(b);
    });
    dlg.choices.classList.add('on');
  }
}
function selChoice(k) {
  const d = state.dialog; if (!d || !d.choicesOn) return;
  const n = d.choices.length; d.sel = ((k % n) + n) % n;
  [...dlg.choices.children].forEach((b, i) => b.classList.toggle('sel', i === d.sel));
}
// fromKey: teclado pode confirmar uma escolha; um toque solto na caixa nunca escolhe sozinho
function advanceDialog(fromKey = false) {
  const d = state.dialog; if (!d || d.t < 0.15) return;
  if (!d.full) { revealTo(d, d.chars.length); lineDone(d); return; }
  if (d.choicesOn) { if (fromKey && d.choiceT > 0.35) { sfx.click(); closeDialog(d.sel); } return; }
  sfx.click();
  d.i++;
  if (d.i >= d.lines.length) { closeDialog(null); return; }
  buildLine(d);
}
function closeDialog(choice) {
  const d = state.dialog; state.dialog = null;
  dlg.el.classList.remove('on'); dlg.choices.classList.remove('on');
  setPortrait(null);
  if (d) { if (d.speaker) d.speaker.st.talk = false; d.resolve(choice); }
}
function updateDialog(dt) {
  const d = state.dialog; document.body.classList.toggle('talking', !!d); if (!d) return;
  d.t += dt;
  if (d.choicesOn) d.choiceT += dt;
  if (!d.full) {
    const N = d.chars.length;
    if (d.hold > 0) d.hold -= dt;
    else {
      d.acc = Math.max(d.acc, d.shown) + dt * 44;
      const from = d.shown;
      let to = Math.min(N, Math.floor(d.acc));
      // respiro depois de ponto e de vírgula, como numa fala de verdade
      for (let i = from; i < to; i++) {
        const ch = d.toks[i].ch, nx = d.toks[i + 1];
        if (nx && nx.ch === ' ' && /[.!?…]/.test(ch)) { to = i + 1; d.acc = to; d.hold = 0.22; break; }
        if (nx && ch === ',') { to = i + 1; d.acc = to; d.hold = 0.09; break; }
      }
      if (to > from) {
        revealTo(d, to);
        if (/[a-zà-ú0-9]/i.test(d.toks[to - 1].ch) && (to % 2 === 0 || to - from > 1)) sfx.blip(d.voice);
      }
      if (d.shown >= N) lineDone(d);
    }
  }
  if (d.speaker) d.speaker.st.talk = !d.full;
  dlg.next.classList.toggle('wait', !d.full || d.choicesOn);
  dlg.el.classList.toggle('choosing', d.choicesOn);
  // onde a janela do retrato está na tela (o rosto é desenhado ali, no canvas)
  if (PORT.ch) {
    const b = dlg.port.getBoundingClientRect(), bw = dlg.port.clientLeft;
    PORT.rect = b.width > 2 * bw + 8 ? { x: b.left + bw, y: b.top + bw, w: b.width - 2 * bw, h: b.height - 2 * bw } : null;
  }
}
$('dbox').addEventListener('click', () => advanceDialog(false));

// ================= cartões de tela cheia =================
const fade = $('fade'), fadeCard = $('fadecard');
function showCard({ k, t, s, buttons, see }) {
  fade.classList.toggle('see', !!see);
  fadeCard.innerHTML = `<div class="k">${k}</div><div class="t">${t}</div><div class="s">${s || ''}</div>` + (buttons ? '<div class="btns"></div>' : '');
  if (buttons) { const wrap = fadeCard.querySelector('.btns'); for (const [label, fn, alt] of buttons) { const b = document.createElement('button'); b.textContent = label; if (alt) b.className = 'alt'; b.onclick = () => { sfx.click(); fn(); }; wrap.appendChild(b); } }
  fade.classList.add('on'); sfx.chime();
}
function hideCard() { fade.classList.remove('on'); }

// ================= HUD =================
function fmtClock(p) { const mins = 7 * 60 + Math.floor(p * 12 * 60); return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0'); }
function updateHud() {
  const p = state.sunday ? 1 : clamp(state.walked / LAP, 0, 1);
  $('barfill').style.width = (p * 100).toFixed(1) + '%';
  $('pct').textContent = state.sunday ? 'folga' : Math.floor(p * 100) + '%';
  $('clock').textContent = state.sunday ? fmtClock(dayP()) : fmtClock(p);
  $('dname-hud').textContent = state.sunday ? 'DOMINGO' : DAYS[state.day - 1];
  $('week').textContent = state.sunday ? 'FOLGA DE VERDADE' : `DIA ${state.day} DE 7 · SEMANA ${state.week}`;
  $('stopped').classList.toggle('on', (state.mode === 'play' && !state.sunday && !state.strike && state.idleT > 1.4 && !state.dialog) || state.strike);
}
const PEOPLE = () => NPCS.filter((n) => !n.pet);
function refreshTasks() {
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
  $('tasks').innerHTML = tasks.map(([t, d]) => `<div class="task ${d ? 'done' : ''}"><span class="box">${d ? '✓' : ''}</span><span>${t}</span></div>`).join('');
  $('explore').innerHTML = DISTRICTS.map((z) => { const v = state.visited.has(z.name); return `<div class="task ${v ? 'done' : ''}"><span class="box">${v ? '✓' : ''}</span><span>${v ? z.name.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()) : '???'}</span></div>`; }).join('');
  $('keys').innerHTML = IS_TOUCH
    ? 'Arraste do lado esquerdo para andar (mais longe = correr). Arraste do lado direito para girar a câmera, com dois dedos para aproximar. Toque no balão para conversar.'
    : '<kbd>WASD</kbd> ou setas: andar · <kbd>SHIFT</kbd>: correr · <kbd>ESPAÇO</kbd>: pular · arraste o mouse: câmera · roda: zoom · <kbd>E</kbd>: conversar · <kbd>1</kbd>–<kbd>6</kbd>: emoções · <kbd>M</kbd>: som';
}
let hintTimer = 0;
function setHint(text, ms = 4000) { const h = $('hint'); h.textContent = text; h.classList.add('on'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.remove('on'), ms); }
function hintOnce(key, text, ms) { if (state.hints.has(key)) return; state.hints.add(key); setHint(text, ms); }
let toastTimer = 0;
function toast(t, s, ms = 3200) {
  $('toast-t').textContent = t; $('toast-s').textContent = s || '';
  const el = $('toast'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), ms);
  sfx.paper();
}

// ================= painéis =================
function togglePanel(id) {
  for (const p of ['menu', 'wardrobe', 'emotes']) { const el = $(p); if (p === id) el.classList.toggle('on'); else el.classList.remove('on'); }
  sfx.paper();
}
$('btn-menu').onclick = () => { refreshTasks(); togglePanel('menu'); };
$('btn-outfit').onclick = () => { renderWardrobe(); togglePanel('wardrobe'); };
$('btn-emote').onclick = () => togglePanel('emotes');
$('btn-music').onclick = () => { initAudio(); setMusic(!state.musicOn); sfx.click(); };
$('skipday').onclick = () => { if (state.mode === 'play' && !state.sunday && !state.strike) { state.walked = LAP; togglePanel(null); } };
const WCATS = [['hair', 'CABELO'], ['top', 'BLUSA'], ['bottom', 'PARTE DE BAIXO'], ['shoes', 'CALÇADO'], ['skin', 'PELE']];
function renderWardrobe() {
  $('wrows').innerHTML = '';
  for (const [k, label] of WCATS) {
    const opts = OUTFIT_OPTS[k], o = opts[outfit[k] % opts.length];
    const row = document.createElement('div'); row.className = 'wrow';
    row.innerHTML = `<button aria-label="anterior">‹</button><div class="lbl"><small>${label}</small>${o[o.length - 1]}</div><button aria-label="próximo">›</button>`;
    const [prev, , next] = row.children;
    prev.onclick = () => changeOutfit(k, -1); next.onclick = () => changeOutfit(k, 1);
    $('wrows').appendChild(row);
  }
}
function changeOutfit(k, d) {
  const n = OUTFIT_OPTS[k].length; outfit[k] = (outfit[k] + d + n) % n;
  try { localStorage.setItem('gira2-outfit', JSON.stringify(outfit)); } catch (e) {}
  rebuildPlayer(); renderWardrobe(); sfx.pop(); showEmote(null, '♥');
}
const EMOTES = ['!', '?', '♥', '…', 'zz', '#@!'];
const EMOTE_ACT = { '!': 'cheer', '?': 'think', '♥': 'love', '…': 'shrug', 'zz': 'sleepy', '#@!': 'angry' };
const EMOTE_REPLY = { '!': '!', '?': '?', '♥': '♥', '…': '…', 'zz': 'zz', '#@!': '!' };
EMOTES.forEach((e, i) => { const b = document.createElement('button'); b.textContent = e; b.setAttribute('aria-label', 'emoção ' + (i + 1)); b.onclick = () => { playerEmote(e); togglePanel(null); }; $('egrid').appendChild(b); });
function playerEmote(e) {
  if (state.mode !== 'play' || state.dialog) return;
  showEmote(null, e);
  const st = player.ch.st;
  if (!state.strike) { st.act = EMOTE_ACT[e]; player.actT = 1.8; }
  if (e === '♥') st.happy = 1.6;
  // quem está perto responde
  for (const a of ACTORS) {
    if (a.dist > 5 || !a.vis) continue;
    a.reactT = rr(0.45, 1.0);
    a.reactTxt = a.id === 'valdir' && e === '#@!' ? '#@!' : a.id === 'valdir' && e === 'zz' ? '!' : EMOTE_REPLY[e];
    if (e === '♥') a.ch.st.happy = 1.4;
    if (a.id === 'caramelo' && (e === '♥' || e === '!')) { state.follow = Math.max(state.follow, 40); sfx.bark(); }
  }
}

// ================= balões, marcadores e emoções no mundo =================
const bubblesLayer = $('bubbles');
function makeOverlay(a) {
  const mk = (cls) => { const el = document.createElement('div'); el.className = cls; bubblesLayer.appendChild(el); return el; };
  a.bubbleEl = mk('bubble'); a.markerEl = mk('marker'); a.markerEl.appendChild(document.createElement('span')); a.emoteEl = mk('emote');
  a.bubbleEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (state.mode === 'play' && !state.dialog && a.dist < 3.2) startTalk(a); });
}
const meEmote = document.createElement('div'); meEmote.className = 'emote'; bubblesLayer.appendChild(meEmote);
let meEmoteT = 0;
const IMARK = []; for (let i = 0; i < 4; i++) { const el = document.createElement('div'); el.className = 'marker read'; el.appendChild(document.createElement('span')); el.firstChild.textContent = '?'; bubblesLayer.appendChild(el); IMARK.push(el); }
function showEmote(a, txt) {
  if (a) { a.emoteEl.textContent = txt; a.emoteT = 2.2; }
  else { meEmote.textContent = txt; meEmoteT = 2.2; }
  sfx.pop(a ? 1.2 : 1);
}
const _ov = { p: V3(), q: V3(), cd: V3() };
// posição na tela (px) ou null se atrás da câmera / escondido pelo planeta
function screenOf(pos, out) {
  const cp = camera.position;
  // planeta no meio do caminho?
  const dx = pos.x - cp.x, dy = pos.y - cp.y, dz = pos.z - cp.z, L2 = dx * dx + dy * dy + dz * dz;
  const t = clamp(-(cp.x * dx + cp.y * dy + cp.z * dz) / L2, 0, 1);
  const cx = cp.x + dx * t, cy = cp.y + dy * t, cz = cp.z + dz * t;
  if (t > 0.02 && t < 0.98 && cx * cx + cy * cy + cz * cz < (R - 0.8) * (R - 0.8)) return null;
  _ov.q.copy(pos).project(camera);
  if (_ov.q.z > 1 || _ov.q.z < -1) return null;
  out[0] = (_ov.q.x * 0.5 + 0.5) * view.w; out[1] = (-_ov.q.y * 0.5 + 0.5) * view.h;
  return out;
}
const _sc = [0, 0];
function headPos(a, out) {
  const ch = a.ch, up = a.up || a.d, st = ch.st;
  let h = ch.height + 0.22;
  if (st.pose === 'sit') h *= 0.8; else if (st.pose === 'lounge') h *= 0.62; else if (st.pose === 'ground') h *= 0.6;
  else if (ch.pet && st.pose === 'sleep') h *= 0.7;
  return out.copy(ch.rig.position).addScaledVector(up, h);
}
function updateOverlays(dt) {
  const playing = state.mode === 'play' || state.mode === 'cutscene';
  camera.getWorldDirection(_ov.cd);
  const now = performance.now();
  for (const a of ACTORS) {
    const n = a.n;
    let s = null;
    if (playing && a.vis && a.dist < 34) s = screenOf(headPos(a, _ov.p), _sc);
    const talkingNow = state.dialog && a.talking;
    const showB = !!s && a.dist < 8 && !talkingNow && !state.dialog && state.mode === 'play';
    a.bubbleEl.classList.toggle('on', showB);
    a.bubbleEl.classList.toggle('click', showB && a.dist < 3.2);
    if (showB) {
      const txt = npcBubble(n); if (a.bubbleEl.textContent !== txt) a.bubbleEl.textContent = txt;
      const sc = clamp(1.25 - a.dist / 12, 0.62, 1.1);
      a.bubbleEl.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px) translate(-50%, -100%) translateY(-12px) scale(${sc.toFixed(3)})`;
    }
    // marcador: "…" para quem ainda não falou hoje, "!" para a Nara no 7º dia (sempre visível, preso na borda)
    const quest = n.id === 'nara' && state.day === 7 && !state.strike && !state.sunday && !state.talked.has('nara') && state.mode === 'play';
    let ms = s;
    if (quest && !ms) ms = edgeOf(headPos(a, _ov.p), _sc);
    const showM = !!ms && !showB && !talkingNow && ((quest) || (a.dist < 26 && !state.talked.has(n.id) && !a.pet && playing));
    a.markerEl.classList.toggle('on', showM);
    a.markerEl.classList.toggle('quest', quest);
    if (showM) {
      a.markerEl.firstChild.textContent = quest ? '!' : '…';
      const bob = Math.sin(now / 300 + a.idx) * 4;
      a.markerEl.style.transform = `translate(${ms[0].toFixed(1)}px, ${(ms[1] - 10 + bob).toFixed(1)}px) translate(-50%, -100%) rotate(45deg)`;
    }
    const showE = !!s && a.emoteT > 0;
    a.emoteEl.classList.toggle('on', showE);
    if (showE) { const k = Math.min(1, (2.2 - a.emoteT) * 6); a.emoteEl.style.transform = `translate(${s[0].toFixed(1)}px, ${(s[1] - 22).toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`; }
  }
  // emoção da Lia
  if (meEmoteT > 0) meEmoteT -= dt;
  const pe = meEmoteT > 0 && playing ? screenOf(_ov.p.copy(player.pos).addScaledVector(player.d, player.ch.st.pose === 'ground' ? 1.15 : 1.85), _sc) : null;
  meEmote.classList.toggle('on', !!pe);
  if (pe) { const k = Math.min(1, (2.2 - meEmoteT) * 6); meEmote.style.transform = `translate(${pe[0].toFixed(1)}px, ${pe[1].toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`; }
  // placas e objetos ainda não lidos por perto
  let k = 0;
  if (state.mode === 'play' && !state.dialog) {
    for (const it of INTERACT) {
      if (k >= IMARK.length) break;
      if (state.read.has(it)) continue;
      const d = arcDist(player.d, it.dir); if (d > 6.5) continue;
      const s2 = screenOf(_ov.p.copy(it.pos).addScaledVector(it.dir, 0.55), _sc); if (!s2) continue;
      const el = IMARK[k++]; el.classList.add('on');
      el.style.transform = `translate(${s2[0].toFixed(1)}px, ${(s2[1] + Math.sin(now / 350 + k) * 3).toFixed(1)}px) translate(-50%, -100%) scale(${clamp(1.2 - d / 8, 0.6, 1).toFixed(2)})`;
    }
  }
  for (; k < IMARK.length; k++) IMARK[k].classList.remove('on');
  // aviso de interação
  const pr = $('prompt');
  const t = state.mode === 'play' && !state.dialog ? target : null;
  pr.classList.toggle('on', !!t);
  if (t) {
    const label = (IS_TOUCH ? '<b>TOQUE</b>' : '<b>E</b>') + (t.kind === 'npc' ? (t.a.pet ? 'FAZER CARINHO EM ' : 'CONVERSAR COM ') : 'VER: ') + t.name;
    if (pr._l !== label) { pr.innerHTML = label; pr._l = label; }
  }
}
// ponto fora da tela: prende na borda (seta do objetivo)
function edgeOf(pos, out) {
  _ov.q.copy(pos).project(camera);
  let x = _ov.q.x, y = _ov.q.y;
  if (_ov.q.z > 1) { x = -x; y = -y; }
  const m = Math.max(Math.abs(x) / 0.86, Math.abs(y) / 0.8, 1e-3);
  if (m > 1 || _ov.q.z > 1) { x /= m; y /= m; }
  out[0] = (x * 0.5 + 0.5) * view.w; out[1] = (-y * 0.5 + 0.5) * view.h;
  return out;
}

// ================= controles =================
const keys = {};
addEventListener('keydown', (e) => {
  if (e.repeat && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter')) return;
  keys[e.code] = true;
  if (state.mode === 'title' && (e.code === 'Enter' || e.code === 'Space')) { startGame(); e.preventDefault(); return; }
  if (state.dialog && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter')) { advanceDialog(true); e.preventDefault(); return; }
  if (state.dialog && state.dialog.choicesOn) {
    const d = state.dialog;
    if (['ArrowLeft', 'ArrowUp', 'KeyA', 'KeyW'].includes(e.code)) { selChoice(d.sel - 1); sfx.blip(300); e.preventDefault(); return; }
    if (['ArrowRight', 'ArrowDown', 'KeyD', 'KeyS'].includes(e.code)) { selChoice(d.sel + 1); sfx.blip(300); e.preventDefault(); return; }
    const n = +e.key; if (n >= 1 && n <= d.choices.length && d.choiceT > 0.35) { sfx.click(); closeDialog(n - 1); e.preventDefault(); return; }
  }
  if (e.code === 'KeyM') { initAudio(); setMusic(!state.musicOn); }
  if (state.mode !== 'play') return;
  if (e.code === 'KeyE' || e.code === 'Enter') interactNow();
  if (e.code === 'Space') { jump(); e.preventDefault(); }
  const ei = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
  if (ei >= 0) playerEmote(EMOTES[ei]);
  if (e.code === 'Escape') togglePanel(null);
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const drag = { id: null, x: 0, y: 0, moved: 0, t0: 0 };
const joy = { id: null, cx: 0, cy: 0, x: 0, y: 0 };
const pinch = new Map();
let pinchD = 0;
const joyEl = $('joy'), joyKnob = joyEl.firstElementChild;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  if (state.mode === 'title') return;
  if (state.dialog) { advanceDialog(); return; }
  for (const p of ['menu', 'wardrobe', 'emotes']) $(p).classList.remove('on');
  if (e.pointerType === 'touch') {
    document.body.classList.add('touch');
    if (e.clientX < view.w * 0.45 && joy.id === null) {
      joy.id = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY; joy.x = 0; joy.y = 0;
      joyEl.style.display = 'block'; joyEl.style.left = (e.clientX - 60) + 'px'; joyEl.style.top = (e.clientY - 60) + 'px'; joyKnob.style.transform = '';
      return;
    }
    pinch.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch.size === 2) { const [a, b] = [...pinch.values()]; pinchD = Math.hypot(a[0] - b[0], a[1] - b[1]); drag.id = null; return; }
  }
  if (drag.id === null) { drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY; drag.moved = 0; drag.t0 = performance.now(); }
  canvas.setPointerCapture?.(e.pointerId);
});
addEventListener('pointermove', (e) => {
  if (e.pointerId === joy.id) {
    const dx = e.clientX - joy.cx, dy = e.clientY - joy.cy, l = Math.hypot(dx, dy), max = 60;
    joy.x = dx / max; joy.y = dy / max;
    const k = Math.min(1, max / Math.max(l, 1));
    joyKnob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    return;
  }
  if (pinch.has(e.pointerId)) {
    pinch.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch.size === 2) { const [a, b] = [...pinch.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinchD > 0) zoomCam((pinchD - d) * 0.02); pinchD = d; return; }
  }
  if (e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    rotateCam(dx / view.w * 5.2, dy / view.h * 2.6);
  }
});
const endPtr = (e) => {
  if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; joyEl.style.display = 'none'; }
  pinch.delete(e.pointerId); if (pinch.size < 2) pinchD = 0;
  if (e.pointerId === drag.id) {
    // toque rápido sem arrastar: conversa com quem estiver perto
    if (e.pointerType === 'touch' && drag.moved < 10 && performance.now() - drag.t0 < 300 && target) interactNow();
    drag.id = null;
  }
};
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { if (state.mode === 'play' || state.mode === 'cutscene') zoomCam(e.deltaY * 0.004); e.preventDefault(); }, { passive: false });
$('jumpbtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); jump(); });
$('prompt').onclick = () => interactNow();
function rotateCam(dx, dy) {
  if (state.mode !== 'play' && state.mode !== 'cutscene') return;
  player.camFwd.applyAxisAngle(player.d, -dx);
  cam.pitch = clamp(cam.pitch + dy * 1.6, 0.04, 1.15);
  cam.lastDrag = performance.now();
}
function zoomCam(d) { cam.distT = clamp(cam.distT + d, 2.6, 9); }
