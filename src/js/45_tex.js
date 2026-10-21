// ================= desenhos do atlas (traço de caneta, cores chapadas) =================
const INKS = '#373f42';
const texRand = mulberry(99);
function jit(a = 1.5) { return (texRand() - 0.5) * 2 * a; }
function inkRect(g, x, y, w, h, lw = 4, color = INKS) {
  g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + jit(), y + jit()); g.lineTo(x + w + jit(), y + jit()); g.lineTo(x + w + jit(), y + h + jit()); g.lineTo(x + jit(), y + h + jit()); g.closePath(); g.stroke();
}
function inkLine(g, x0, y0, x1, y1, lw = 3, color = INKS) {
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0 + jit(0.8), y0 + jit(0.8)); g.quadraticCurveTo((x0 + x1) / 2 + jit(1.5), (y0 + y1) / 2 + jit(1.5), x1 + jit(0.8), y1 + jit(0.8)); g.stroke();
}
function fitText(g, text, maxW, size, font) {
  let s = size; g.font = `${s}px ${font}`;
  while (g.measureText(text).width > maxW && s > 8) { s -= 1; g.font = `${s}px ${font}`; }
  return s;
}
const FONT_SIGN = 'Bungee, "Arial Black", sans-serif', FONT_LBL = 'Silkscreen, monospace', FONT_HAND = '"Patrick Hand SC", "Comic Sans MS", cursive';
// placa de texto
function texSign(text, bg = '#f3c258', fg = '#f4f4ef', o = {}) {
  const w = o.w || 512, h = o.h || 128;
  return atlasAdd(`sign:${text}:${bg}:${fg}:${w}x${h}:${o.font || ''}`, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (o.stripe) { g.fillStyle = o.stripe; g.fillRect(0, h * 0.8, w, h * 0.2); }
    if (o.border !== false) inkRect(g, 5, 5, w - 10, h - 10, 8);
    const lines = String(text).split('\n');
    const font = o.font === 'hand' ? FONT_HAND : o.font === 'lbl' ? FONT_LBL : FONT_SIGN;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lh = (h * (o.fill || 0.62)) / lines.length;
    lines.forEach((ln, i) => {
      const s = fitText(g, ln, w * 0.86, lh * 0.95, font);
      const y = h / 2 + (i - (lines.length - 1) / 2) * lh + s * 0.05;
      if (o.outline !== false && fg !== INKS) { g.lineWidth = Math.max(3, s * 0.12); g.strokeStyle = INKS; g.lineJoin = 'round'; g.strokeText(ln, w / 2, y); }
      g.fillStyle = fg; g.fillText(ln, w / 2, y);
    });
    if (o.icon) o.icon(g, w, h);
  });
}
// janelas
const WIN_KINDS = ['glass', 'curtain', 'blind', 'dark', 'plant', 'grille', 'curtain2', 'shutter'];
function texWin(kind = 'glass', frame = '#eef0e8') {
  return atlasAdd(`win:${kind}:${frame}`, 96, 120, (g) => {
    const w = 96, h = 120, m = 9;
    g.fillStyle = frame; g.fillRect(0, 0, w, h);
    const glass = kind === 'dark' ? '#3e4d55' : '#7fa7b5';
    g.fillStyle = glass; g.fillRect(m, m, w - 2 * m, h - 2 * m);
    if (kind !== 'dark') {
      g.fillStyle = 'rgba(255,255,255,.38)';
      g.beginPath(); g.moveTo(m + 8, h - m); g.lineTo(m + 40, m); g.lineTo(m + 54, m); g.lineTo(m + 22, h - m); g.fill();
      g.fillStyle = '#5d7e8c'; g.fillRect(m, m, w - 2 * m, 10);
    }
    if (kind === 'curtain' || kind === 'curtain2') {
      g.fillStyle = kind === 'curtain' ? '#e7a58c' : '#f0d78c';
      g.beginPath(); g.moveTo(m, m); g.lineTo(m + 26, m); g.quadraticCurveTo(m + 12, h * 0.5, m + 20, h - m); g.lineTo(m, h - m); g.fill();
      g.beginPath(); g.moveTo(w - m, m); g.lineTo(w - m - 26, m); g.quadraticCurveTo(w - m - 12, h * 0.5, w - m - 20, h - m); g.lineTo(w - m, h - m); g.fill();
      g.strokeStyle = 'rgba(55,63,66,.35)'; g.lineWidth = 2;
      for (const x of [m + 9, m + 16, w - m - 9, w - m - 16]) { g.beginPath(); g.moveTo(x, m + 4); g.lineTo(x + (x < w / 2 ? 2 : -2), h - m - 4); g.stroke(); }
    }
    if (kind === 'blind') { g.fillStyle = '#e8e3d3'; g.fillRect(m, m, w - 2 * m, h * 0.55); g.strokeStyle = 'rgba(55,63,66,.4)'; g.lineWidth = 2; for (let y = m + 6; y < h * 0.55 + m; y += 7) { g.beginPath(); g.moveTo(m, y); g.lineTo(w - m, y); g.stroke(); } }
    if (kind === 'plant') { g.fillStyle = '#5f9b5a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(m + 14 + i * 11, h - m - 16 - (i % 2) * 8, 9, 14, 0.3 * (i - 3), 0, Math.PI * 2); g.fill(); } g.fillStyle = '#c9744f'; g.fillRect(m + 6, h - m - 14, w - 2 * m - 12, 14); }
    if (kind === 'grille') { g.strokeStyle = '#2f3a40'; g.lineWidth = 3; for (let x = m + 10; x < w - m; x += 13) { g.beginPath(); g.moveTo(x, m); g.lineTo(x, h - m); g.stroke(); } g.beginPath(); g.moveTo(m, h / 2); g.lineTo(w - m, h / 2); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 14, 0, Math.PI * 2); g.stroke(); }
    if (kind === 'shutter') { g.fillStyle = '#6f9f86'; g.fillRect(m, m, w - 2 * m, h - 2 * m); g.strokeStyle = 'rgba(55,63,66,.5)'; g.lineWidth = 2; for (let y = m + 6; y < h - m; y += 8) { g.beginPath(); g.moveTo(m + 3, y); g.lineTo(w - m - 3, y); g.stroke(); } g.beginPath(); g.moveTo(w / 2, m); g.lineTo(w / 2, h - m); g.stroke(); }
    if (kind !== 'shutter' && kind !== 'grille') { g.fillStyle = frame; g.fillRect(w / 2 - 3, m, 6, h - 2 * m); }
    inkRect(g, 3, 3, w - 6, h - 6, 5); inkRect(g, m, m, w - 2 * m, h - 2 * m, 3);
  });
}
function texOffice() {
  return atlasAdd('office', 256, 128, (g) => {
    g.fillStyle = '#dfe6e3'; g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 62;
      g.fillStyle = i % 3 === 1 ? '#5f8796' : '#79a3b2'; g.fillRect(x, 10, 54, 108);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x + 4, 118); g.lineTo(x + 26, 10); g.lineTo(x + 36, 10); g.lineTo(x + 14, 118); g.fill();
      if (i === 2) { g.fillStyle = '#e8e3d3'; g.fillRect(x, 10, 54, 40); }
      inkRect(g, x, 10, 54, 108, 3);
    }
  });
}
function texDoor(kind = 'wood', c = '#8a6a4f') {
  return atlasAdd(`door:${kind}:${c}`, 96, 192, (g) => {
    const w = 96, h = 192;
    g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = c; g.fillRect(8, 8, w - 16, h - 8);
    if (kind === 'wood') {
      g.strokeStyle = 'rgba(55,63,66,.45)'; g.lineWidth = 3;
      inkRect(g, 18, 20, w - 36, 60, 3, 'rgba(55,63,66,.55)'); inkRect(g, 18, 96, w - 36, 80, 3, 'rgba(55,63,66,.55)');
      g.fillStyle = '#f3c258'; g.beginPath(); g.arc(w - 22, 108, 5, 0, Math.PI * 2); g.fill();
    } else if (kind === 'glass') {
      g.fillStyle = '#86adb9'; g.fillRect(16, 16, w - 32, h - 40);
      g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(20, 150); g.lineTo(50, 20); g.lineTo(62, 20); g.lineTo(32, 150); g.fill();
      inkRect(g, 16, 16, w - 32, h - 40, 3);
    } else if (kind === 'metal') {
      g.strokeStyle = 'rgba(55,63,66,.45)'; g.lineWidth = 2; for (let y = 20; y < h; y += 12) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 10, y); g.stroke(); }
    } else if (kind === 'gate') {
      g.fillStyle = '#e9e6dc'; g.fillRect(8, 8, w - 16, h - 8);
      g.strokeStyle = c; g.lineWidth = 6; for (let x = 18; x < w - 8; x += 14) { g.beginPath(); g.moveTo(x, 12); g.lineTo(x, h); g.stroke(); }
      g.beginPath(); g.moveTo(8, 30); g.lineTo(w - 8, 30); g.stroke(); g.beginPath(); g.moveTo(8, h - 30); g.lineTo(w - 8, h - 30); g.stroke();
    }
    inkRect(g, 8, 8, w - 16, h - 6, 5);
  });
}
// porta de enrolar meio aberta (com pichação às vezes)
function texShutter(kind = 0, c = '#a7b2ad') {
  return atlasAdd(`shutter:${kind}:${c}`, 256, 192, (g) => {
    const w = 256, h = 192, open = kind === 3 ? 0.45 : kind === 2 ? 1 : 0.62;
    g.fillStyle = '#2f3a40'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#46545a'; g.fillRect(14, h * open, w - 28, h);
    if (open < 1) { g.fillStyle = '#5b6a6e'; for (let i = 0; i < 5; i++) g.fillRect(22 + i * 46, h * open + 18 + (i % 2) * 10, 30, h); }
    g.fillStyle = c; g.fillRect(0, 0, w, h * open);
    g.strokeStyle = 'rgba(55,63,66,.45)'; g.lineWidth = 2;
    for (let y = 6; y < h * open; y += 9) { g.beginPath(); g.moveTo(2, y); g.lineTo(w - 2, y); g.stroke(); }
    if (kind === 1) { g.font = `44px ${FONT_SIGN}`; g.fillStyle = '#c25959'; g.textAlign = 'center'; g.save(); g.translate(w / 2, h * 0.3); g.rotate(-0.06); g.fillText('6x1 NÃO', 0, 14); g.restore(); }
    if (kind === 4) { g.font = `30px ${FONT_HAND}`; g.fillStyle = '#4f86b8'; g.textAlign = 'center'; g.fillText('o planeta é nosso', w / 2, h * 0.3); }
    inkRect(g, 3, 3, w - 6, h - 6, 5);
    inkLine(g, 0, h * open, w, h * open, 4);
  });
}
function texShopWin(kind = 'bread') {
  return atlasAdd(`shopwin:${kind}`, 256, 160, (g) => {
    const w = 256, h = 160;
    g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8fb3bf'; g.fillRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#d8cfb8'; g.fillRect(10, h - 48, w - 20, 38);
    const items = { bread: ['#d9a45a', '#c78a43', '#e7bf76'], pharma: ['#f4f4ef', '#66bde6', '#c25959'], market: ['#c25959', '#8cc48c', '#f3c258', '#de794e'], cheap: ['#f3c258', '#c25959', '#66bde6', '#8cc48c', '#de794e'], food: ['#f4f4ef', '#de794e', '#8cc48c'], gym: ['#373f42', '#c25959', '#f3c258'] }[kind] || ['#f4f4ef'];
    for (let i = 0; i < 9; i++) {
      g.fillStyle = items[i % items.length];
      const x = 22 + i * 25, y = h - 62 - (i % 3) * 6;
      if (kind === 'bread') { g.beginPath(); g.ellipse(x + 8, y + 10, 13, 8, 0, 0, Math.PI * 2); g.fill(); }
      else { g.fillRect(x, y, 16, 22); }
    }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(30, h - 10); g.lineTo(90, 10); g.lineTo(108, 10); g.lineTo(48, h - 10); g.fill();
    if (kind === 'pharma') { g.fillStyle = '#c25959'; g.fillRect(w - 70, 26, 40, 12); g.fillRect(w - 56, 12, 12, 40); }
    if (kind === 'gym') { g.font = `22px ${FONT_LBL}`; g.fillStyle = '#c25959'; g.fillText('SEM DOR', 30, 40); g.fillText('SEM GANHO', 30, 64); }
    inkRect(g, 4, 4, w - 8, h - 8, 5); inkRect(g, 10, 10, w - 20, h - 20, 3);
    g.fillStyle = '#e9e6dc'; g.fillRect(w / 2 - 3, 10, 6, h - 20);
  });
}
function texAwning(c1, c2) {
  return atlasAdd(`awn:${c1}:${c2}`, 128, 64, (g) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * 16, 0, 16, 64); }
    g.strokeStyle = 'rgba(55,63,66,.35)'; g.lineWidth = 2; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, 64); g.stroke(); }
  });
}
function texValance(c1, c2) {
  return atlasAdd(`val:${c1}:${c2}`, 128, 32, (g) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 16, 0); g.lineTo(i * 16 + 16, 18); g.arc(i * 16 + 8, 18, 8, 0, Math.PI); g.closePath(); g.fill(); }
    g.strokeStyle = INKS; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 8; i++) { g.moveTo(i * 16 + 16, 18); g.arc(i * 16 + 8, 18, 8, 0, Math.PI); } g.stroke();
  });
}
// cartazes (vários são easter eggs)
function texPoster(kind) {
  return atlasAdd(`poster:${kind}`, 128, 176, (g) => {
    const w = 128, h = 176;
    const P = {
      domingo: ['#f4f4ef', '#c25959', 'PROCURA-SE', 'DOMINGO', 'visto pela última\nvez com a família'],
      gira: ['#de794e', '#f4f4ef', 'GIRA S.A.', 'ANDE MAIS', 'o planeta conta\ncom você'],
      foco: ['#f3c258', '#373f42', 'ENERGÉTICO', 'FOCO', '300% mais\nsegunda-feira'],
      coach: ['#66bde6', '#f4f4ef', 'CURSO', 'MINDSET 7x0', 'só 12x de 97'],
      greve: ['#8cc48c', '#373f42', 'E SE', 'TODO MUNDO', 'parasse junto?'],
      sorte: ['#f4f4ef', '#4f86b8', 'LOTERIA', '1 DOMINGO', 'prêmio acumulado'],
      show: ['#c25959', '#f3c258', 'HOJE', 'SAMBA', 'cancelado\n(demanda alta)'],
      gato: ['#f4f4ef', '#373f42', 'PERDIDO?', 'NÃO.', 'o gato está ótimo.\nobrigado.'],
    }[kind] || ['#f4f4ef', '#373f42', '...', '...', ''];
    g.fillStyle = P[0]; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.fillStyle = P[1];
    fitText(g, P[2], w - 20, 20, FONT_LBL); g.fillText(P[2], w / 2, 30);
    fitText(g, P[3], w - 16, 30, FONT_SIGN); g.fillText(P[3], w / 2, 76);
    g.font = `18px ${FONT_HAND}`; P[4].split('\n').forEach((l, i) => g.fillText(l, w / 2, 112 + i * 20));
    if (kind === 'domingo') { g.strokeStyle = P[1]; g.lineWidth = 3; g.strokeRect(34, 128, 60, 38); g.font = `14px ${FONT_LBL}`; g.fillText('D', w / 2, 152); }
    inkRect(g, 3, 3, w - 6, h - 6, 4);
    g.fillStyle = 'rgba(55,63,66,.25)'; g.beginPath(); g.moveTo(w - 30, 0); g.lineTo(w, 0); g.lineTo(w, 30); g.fill();
  });
}
function texClock() {
  return atlasAdd('clockface', 160, 160, (g) => {
    const c = 80;
    g.fillStyle = '#f4f4ef'; g.beginPath(); g.arc(c, c, 74, 0, Math.PI * 2); g.fill();
    g.strokeStyle = INKS; g.lineWidth = 7; g.beginPath(); g.arc(c, c, 72, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 3 : 6; g.beginPath(); g.moveTo(c + Math.sin(a) * 58, c - Math.cos(a) * 58); g.lineTo(c + Math.sin(a) * 66, c - Math.cos(a) * 66); g.stroke(); }
    g.font = `13px ${FONT_LBL}`; g.fillStyle = INKS; g.textAlign = 'center'; g.fillText('GIRA', c, c + 34);
  });
}
function texCalendar() {
  return atlasAdd('calendar', 96, 128, (g) => {
    g.fillStyle = '#f4f4ef'; g.fillRect(0, 0, 96, 128);
    g.fillStyle = '#c25959'; g.fillRect(0, 0, 96, 34);
    g.font = `16px ${FONT_LBL}`; g.fillStyle = '#f4f4ef'; g.textAlign = 'center'; g.fillText('DOMINGO', 48, 23);
    g.font = `54px ${FONT_SIGN}`; g.fillStyle = INKS; g.fillText('7', 48, 98);
    inkRect(g, 3, 3, 90, 122, 4);
    for (let x = 14; x < 90; x += 16) { g.fillStyle = '#c9cdc2'; g.beginPath(); g.arc(x, 4, 3, 0, Math.PI * 2); g.fill(); }
  });
}
function texVending(kind) {
  return atlasAdd(`vend:${kind}`, 128, 224, (g) => {
    const w = 128, h = 224;
    const bg = kind === 'foco' ? '#f3c258' : kind === 'cafe' ? '#c25959' : '#66bde6';
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e9eef0'; g.fillRect(12, 34, w - 24, 110);
    const cans = kind === 'foco' ? ['#373f42', '#f3c258'] : kind === 'cafe' ? ['#8a6a4f', '#f4f4ef'] : ['#66bde6', '#f4f4ef'];
    for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) { g.fillStyle = cans[(i + r) % 2]; g.fillRect(18 + i * 19, 42 + r * 26, 13, 20); }
    g.font = `16px ${FONT_SIGN}`; g.fillStyle = '#f4f4ef'; g.textAlign = 'center';
    g.lineWidth = 3; g.strokeStyle = INKS; const lbl = kind === 'foco' ? 'FOCO' : kind === 'cafe' ? 'CAFÉ' : 'ÁGUA';
    g.strokeText(lbl, w / 2, 24); g.fillText(lbl, w / 2, 24);
    g.fillStyle = '#2f3a40'; g.fillRect(24, 166, 80, 30);
    g.fillStyle = '#f4f4ef'; g.fillRect(96, 150, 16, 8);
    inkRect(g, 3, 3, w - 6, h - 6, 5); inkRect(g, 12, 34, w - 24, 110, 3);
  });
}
function texBanner(text, bg, fg) {
  return atlasAdd(`banner:${text}`, 96, 384, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 96, 384);
    g.save(); g.translate(48, 192); g.rotate(Math.PI / 2);
    fitText(g, text, 340, 46, FONT_SIGN); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 5; g.strokeStyle = INKS; g.strokeText(text, 0, 0); g.fillStyle = fg; g.fillText(text, 0, 0); g.restore();
    inkRect(g, 4, 4, 88, 376, 5);
  });
}
function texNews() {
  return atlasAdd('news', 128, 96, (g) => {
    g.fillStyle = '#efeee6'; g.fillRect(0, 0, 128, 96);
    g.fillStyle = INKS; g.font = `14px ${FONT_LBL}`; g.fillText('O GIRO', 8, 18);
    g.fillRect(8, 26, 112, 4);
    for (let i = 0; i < 6; i++) g.fillRect(8, 38 + i * 9, i % 3 === 2 ? 70 : 112, 4);
    g.fillStyle = '#9aa7a2'; g.fillRect(84, 36, 36, 30);
  });
}
function texGraffiti(text, c) {
  return atlasAdd(`graf:${text}`, 384, 128, (g) => {
    g.font = `64px ${FONT_SIGN}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, text, 360, 70, FONT_SIGN);
    g.save(); g.translate(192, 64); g.rotate(-0.05);
    g.lineWidth = 9; g.strokeStyle = '#2f3a40'; g.strokeText(text, 0, 0); g.fillStyle = c; g.fillText(text, 0, 0);
    g.restore();
  });
}
function texPlate(text) { return texSign(text, '#4f86b8', '#f4f4ef', { w: 256, h: 64, font: 'lbl', fill: 0.62 }); }
function texWishes() {
  return atlasAdd('wishes', 512, 192, (g) => {
    g.fillStyle = '#f0e6cf'; g.fillRect(0, 0, 512, 192);
    const notes = [['#f3c258', 'um domingo\ninteiro'], ['#8cc48c', 'ver meu pai\nacordado'], ['#66bde6', 'dormir até\ntarde'], ['#e7a58c', 'que a mãe\nria'], ['#f4f4ef', 'ser astronauta\n(sem dar volta)'], ['#f3c258', 'parar\num pouco']];
    notes.forEach(([c, t], i) => {
      const x = 14 + i * 82, y = 24 + (i % 2) * 34;
      g.save(); g.translate(x + 36, y + 36); g.rotate((i % 3 - 1) * 0.08);
      g.fillStyle = c; g.fillRect(-36, -36, 74, 74); inkRect(g, -36, -36, 74, 74, 2);
      g.fillStyle = INKS; g.font = `14px ${FONT_HAND}`; g.textAlign = 'center';
      t.split('\n').forEach((l, k) => g.fillText(l, 0, -6 + k * 16));
      g.restore();
    });
    g.font = `20px ${FONT_LBL}`; g.fillStyle = '#c25959'; g.textAlign = 'center'; g.fillText('MURAL DOS DESEJOS', 256, 182);
  });
}
function texMenu() {
  return atlasAdd('menu', 128, 160, (g) => {
    g.fillStyle = '#2f3a40'; g.fillRect(0, 0, 128, 160);
    g.fillStyle = '#f4f4ef'; g.font = `18px ${FONT_HAND}`; g.textAlign = 'center';
    ['HOJE', 'marmita: 12', 'café: 3', 'almoço em', '4 minutos'].forEach((l, i) => g.fillText(l, 64, 30 + i * 26));
    inkRect(g, 3, 3, 122, 154, 5, '#8a6a4f');
  });
}
function texStripes(c1, c2, n = 6) {
  return atlasAdd(`stripes:${c1}:${c2}:${n}`, 128, 32, (g) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * 128 / n, 0, 128 / n + 1, 32); } });
}
function texLogo() {
  return atlasAdd('logo', 256, 256, (g) => {
    g.fillStyle = '#de794e'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = INKS; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 116, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#f4f4ef'; g.lineWidth = 16; g.beginPath(); g.arc(128, 128, 78, -0.4, Math.PI * 1.5); g.stroke();
    g.fillStyle = '#f4f4ef'; g.beginPath(); g.moveTo(128 + 50, 70); g.lineTo(128 + 98, 74); g.lineTo(128 + 70, 112); g.fill();
    g.font = `46px ${FONT_SIGN}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = INKS; g.strokeText('GIRA', 128, 132); g.fillText('GIRA', 128, 132);
  });
}
function texFace(look) { return null; } // rostos ficam em texturas próprias (ver personagens)
