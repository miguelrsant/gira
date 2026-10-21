// ================= rostos =================
// expressões desenhadas num atlas de canvas, mais os decalques do mundo
import * as THREE from 'three';

export const FS = 128, FAW = 2048, FAH = 1024;
// atlas dos rostos (4 quadros por pessoa: aberto, piscando, falando, feliz) + decalques (placas, logos)
export const FACE = (() => {
  const cv = document.createElement('canvas'); cv.width = FAW; cv.height = FAH;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, FS, FS);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { cv, g, tex, next: 4, decal: 96, keys: new Map() };
})();
export function slotUV(slot, w = 1) {
  const c = slot % 16, r = Math.floor(slot / 16);
  return [c * FS / FAW, 1 - (r + 1) * FS / FAH, (c + w) * FS / FAW, 1 - r * FS / FAH];
}
function slotDraw(slot, w, fn) {
  const g = FACE.g, x = (slot % 16) * FS, y = Math.floor(slot / 16) * FS;
  g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w * FS, FS); g.clip(); fn(g, w * FS, FS); g.restore();
}
export function decal(key, w, fn) {
  if (FACE.keys.has(key)) return FACE.keys.get(key);
  if ((FACE.decal % 16) + w > 16) FACE.decal += 16 - (FACE.decal % 16);
  const s = FACE.decal; FACE.decal += w;
  slotDraw(s, w, fn);
  const uv = slotUV(s, w); FACE.keys.set(key, uv); return uv;
}
export function hexMix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// ---------------- rostos ----------------
const LASH = '#25292b';
function eyeOpen(g, cx, cy, s, f) {
  const w = 8 * (f.eyeW || 1), h = 10 * (f.eyeH || 1), lid = f.lid || 0;
  g.fillStyle = f.iris || '#3a3330';
  g.beginPath(); g.ellipse(cx, cy + 1, w * 0.6, h * 0.62, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b1d1f'; g.beginPath(); g.ellipse(cx, cy + 1.6, w * 0.3, h * 0.34, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx + 2.3, cy - 1.8, 1.9 * (f.eyeW || 1), 0, 7); g.fill();
  if (f.eyeW > 1.05) { g.beginPath(); g.arc(cx - 2.2, cy + 3.4, 1.0, 0, 7); g.fill(); }
  const top = cy - h * 0.6 + lid * h * 0.75;
  if (lid) { g.fillStyle = f.skin; g.fillRect(cx - w - 3, cy - h - 6, w * 2 + 6, top - (cy - h - 6)); }
  g.strokeStyle = LASH; g.lineWidth = 2.8;
  g.beginPath();
  g.moveTo(cx - s * w * 0.95, top + 2.4);
  g.quadraticCurveTo(cx, top - 1.8, cx + s * w * 0.95, top + 1.0);
  g.lineTo(cx + s * (w + 2.6), top - 0.6);
  g.stroke();
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(40,44,46,0.55)';
  g.beginPath(); g.moveTo(cx - s * w * 0.35, cy + h * 0.66); g.lineTo(cx + s * w * 0.7, cy + h * 0.56); g.stroke();
}
function eyeClosed(g, cx, cy, s, f, happy) {
  const w = 8 * (f.eyeW || 1);
  g.strokeStyle = LASH; g.lineWidth = 2.6; g.beginPath();
  if (happy) { g.moveTo(cx - w, cy + 3); g.quadraticCurveTo(cx, cy - 6.5, cx + w, cy + 3); }
  else { g.moveTo(cx - s * w, cy + 1); g.quadraticCurveTo(cx, cy + 5, cx + s * w, cy + 1); g.lineTo(cx + s * (w + 2.2), cy - 0.6); }
  g.stroke();
}
function drawFace(g, f, k) {
  const S = FS, X = (x) => S / 2 + x * S / 2, Yp = (y) => S / 2 - y * S / 2;
  g.fillStyle = f.skin; g.fillRect(0, 0, S, S);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const happy = k === 3, closed = k === 1 || f.sleepy === 2;
  const shade = hexMix(f.skin, '#5b2f22', 0.3), lipC = f.lips || hexMix(f.skin, '#6a2c2c', 0.55);
  if (f.blush || happy) { g.fillStyle = `rgba(236,118,108,${happy ? 0.42 : 0.3})`; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X(s * 0.47), Yp(-0.3), 8.5, 4.6, 0, 0, 7); g.fill(); } }
  if (f.freckles) { g.fillStyle = hexMix(f.skin, '#7a4a32', 0.5); for (const s of [-1, 1]) for (const [a, b] of [[0.36, -0.22], [0.44, -0.27], [0.52, -0.22], [0.42, -0.17]]) { g.beginPath(); g.arc(X(s * a), Yp(b), 1.1, 0, 7); g.fill(); } }
  if (f.beard) {
    g.fillStyle = f.beard; g.globalAlpha = f.stubble ? 0.32 : 1;
    g.beginPath(); g.moveTo(X(-0.66), Yp(-0.12)); g.quadraticCurveTo(X(-0.66), Yp(-1.0), X(0), Yp(-1.04)); g.quadraticCurveTo(X(0.66), Yp(-1.0), X(0.66), Yp(-0.12));
    g.quadraticCurveTo(X(0.42), Yp(-0.52), X(0), Yp(-0.4)); g.quadraticCurveTo(X(-0.42), Yp(-0.52), X(-0.66), Yp(-0.12)); g.fill(); g.globalAlpha = 1;
  }
  // olhos
  const ey = Yp(f.eyeY ?? -0.06), ex = f.eyeX ?? 0.33;
  if (!f.sun) for (const s of [-1, 1]) {
    const cx = X(s * ex);
    if (happy) eyeClosed(g, cx, ey, s, f, true);
    else if (closed) eyeClosed(g, cx, ey, s, f, false);
    else eyeOpen(g, cx, ey, s, f);
    if (f.bags) {
      // olheira (bags: 2 = noite mal dormida, mais funda e dupla)
      const deep = f.bags === 2;
      g.strokeStyle = deep ? 'rgba(104,58,88,0.58)' : 'rgba(120,74,92,0.38)'; g.lineWidth = deep ? 2.1 : 1.6;
      g.beginPath(); g.moveTo(cx - 6, ey + 9); g.quadraticCurveTo(cx, ey + 12.5, cx + 6, ey + 9); g.stroke();
      if (deep) { g.lineWidth = 1.3; g.beginPath(); g.moveTo(cx - 4, ey + 12.5); g.quadraticCurveTo(cx, ey + 15, cx + 4, ey + 12.5); g.stroke(); }
    }
    if (f.wrinkles) { g.strokeStyle = shade; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(s * (ex + 0.17)), ey - 1); g.lineTo(X(s * (ex + 0.23)), ey - 3); g.moveTo(X(s * (ex + 0.17)), ey + 2); g.lineTo(X(s * (ex + 0.23)), ey + 3); g.stroke(); }
  }
  // sobrancelhas
  const by = Yp(f.browY ?? 0.2), bc = f.brow || '#2f2a28';
  // sorrindo de olho fechado, a sobrancelha relaxa (nada de cara brava feliz)
  const bk = happy && f.brows !== 'up' ? 'calm' : f.brows || 'calm';
  const tilt = { calm: [0, 0], worry: [-3.2, 1.6], angry: [3.4, -2.4], up: [-2.6, -2.6], sad: [-2.2, 2.4] }[bk];
  if (!f.noBrows) { g.strokeStyle = bc; g.lineWidth = f.thickBrows ? 3.8 : 2.4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(s * 0.17), by + tilt[0]); g.quadraticCurveTo(X(s * 0.33), by - 2.4 + (tilt[0] + tilt[1]) / 2, X(s * 0.49), by + tilt[1]); g.stroke(); } }
  // nariz
  g.strokeStyle = shade; g.lineWidth = 1.7;
  g.beginPath(); g.moveTo(X(0.035), Yp(-0.17)); g.lineTo(X(0.07), Yp(-0.29)); g.lineTo(X(-0.01), Yp(-0.31)); g.stroke();
  if (f.wrinkles) { g.beginPath(); g.moveTo(X(-0.17), Yp(-0.3)); g.quadraticCurveTo(X(-0.24), Yp(-0.42), X(-0.2), Yp(-0.52)); g.moveTo(X(0.17), Yp(-0.3)); g.quadraticCurveTo(X(0.24), Yp(-0.42), X(0.2), Yp(-0.52)); g.stroke(); }
  if (f.must) { g.fillStyle = f.must; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X(s * 0.1), Yp(-0.4), 8.5, 3.8, s * 0.28, 0, 7); g.fill(); } }
  // boca
  if (!f.mask) {
    const my = Yp(-0.5) + (f.must ? 2 : 0);
    if (k === 2) {
      g.fillStyle = '#6b2b2b'; g.beginPath(); g.ellipse(X(0), my + 1, 6, 4.6, 0, 0, 7); g.fill();
      g.fillStyle = '#d9787a'; g.beginPath(); g.ellipse(X(0), my + 3.2, 3.8, 2.0, 0, 0, 7); g.fill();
    } else if (happy) {
      g.fillStyle = '#6b2b2b'; g.beginPath(); g.moveTo(X(-0.15), my - 2); g.quadraticCurveTo(X(0), my + 13, X(0.15), my - 2); g.closePath(); g.fill();
      g.fillStyle = '#d9787a'; g.beginPath(); g.ellipse(X(0), my + 4.5, 4.2, 2.4, 0, 0, 7); g.fill();
    } else {
      g.strokeStyle = lipC; g.lineWidth = f.lips ? 2.8 : 2.0; g.beginPath();
      const m = f.mouth || 'line';
      if (m === 'smile') { g.moveTo(X(-0.13), my - 2); g.quadraticCurveTo(X(0), my + 5, X(0.13), my - 2); }
      else if (m === 'frown') { g.moveTo(X(-0.11), my + 2); g.quadraticCurveTo(X(0), my - 3.5, X(0.11), my + 2); }
      else if (m === 'smirk') { g.moveTo(X(-0.1), my + 0.5); g.quadraticCurveTo(X(0.05), my + 2, X(0.14), my - 3); }
      else if (m === 'grin') { g.moveTo(X(-0.2), my - 3); g.quadraticCurveTo(X(0), my + 8, X(0.2), my - 3); g.closePath(); g.fillStyle = '#f7f4ec'; g.fill(); }
      else { g.moveTo(X(-0.08), my); g.lineTo(X(0.08), my); }
      g.stroke();
    }
  }
  // gota de suor na têmpora (exausta)
  if (f.sweat) {
    const sx = X(0.7), sy = Yp(0.36);
    g.fillStyle = '#a9dcf2'; g.strokeStyle = '#4f86b8'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(sx, sy - 9); g.quadraticCurveTo(sx + 6, sy + 1, sx, sy + 5); g.quadraticCurveTo(sx - 6, sy + 1, sx, sy - 9); g.fill(); g.stroke();
  }
  // óculos, máscara
  if (f.glasses) {
    g.strokeStyle = f.glasses; g.lineWidth = 2.2;
    for (const s of [-1, 1]) { g.beginPath(); if (f.square) { g.rect(X(s * ex) - 11, ey - 9, 22, 17); } else g.arc(X(s * ex), ey + 0.5, 11, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(X(-ex) + 11, ey - 1); g.quadraticCurveTo(X(0), ey - 5, X(ex) - 11, ey - 1); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(s * ex) + s * 11, ey - 2); g.lineTo(X(s * 0.95), ey - 4); g.stroke(); }
  }
  if (f.sun) {
    g.fillStyle = f.sun;
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X(s * ex), ey, 13, 8.5, s * 0.08, 0, 7); g.fill(); }
    g.fillRect(X(-ex) + 8, ey - 4, X(ex) - X(-ex) - 16, 3);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(s * ex) - 6, ey - 3); g.lineTo(X(s * ex) - 1, ey - 5); g.stroke(); }
    g.fillStyle = f.sun; for (const s of [-1, 1]) g.fillRect(X(s * (ex + 0.18)), ey - 4, X(s * 0.98) - X(s * (ex + 0.18)), 2.5);
  }
  if (f.mask) {
    g.fillStyle = f.mask; g.strokeStyle = 'rgba(55,63,66,0.5)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(X(-0.6), Yp(-0.2)); g.quadraticCurveTo(X(0), Yp(-0.12), X(0.6), Yp(-0.2)); g.lineTo(X(0.5), Yp(-0.75));
    g.quadraticCurveTo(X(0), Yp(-0.98), X(-0.5), Yp(-0.75)); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); for (const yy of [-0.42, -0.6]) { g.moveTo(X(-0.45), Yp(yy)); g.lineTo(X(0.45), Yp(yy)); } g.stroke();
    g.strokeStyle = f.mask; g.lineWidth = 2; g.beginPath(); g.moveTo(X(-0.6), Yp(-0.22)); g.lineTo(X(-1), Yp(-0.1)); g.moveTo(X(0.6), Yp(-0.22)); g.lineTo(X(1), Yp(-0.1)); g.stroke();
  }
}
// gato e cachorro
function drawPetFace(g, f, k) {
  const S = FS, X = (x) => S / 2 + x * S / 2, Yp = (y) => S / 2 - y * S / 2;
  g.fillStyle = f.fur; g.fillRect(0, 0, S, S);
  if (f.mask2) { g.fillStyle = f.mask2; g.beginPath(); g.ellipse(X(0), Yp(-0.5), 40, 30, 0, 0, 7); g.fill(); }
  g.lineCap = 'round';
  const ey = Yp(0.02), ex = f.cat ? 0.36 : 0.32;
  for (const s of [-1, 1]) {
    const cx = X(s * ex);
    if (k === 1 || k === 3) { g.strokeStyle = LASH; g.lineWidth = 2.8; g.beginPath(); if (k === 3) { g.moveTo(cx - 8, ey + 3); g.quadraticCurveTo(cx, ey - 7, cx + 8, ey + 3); } else { g.moveTo(cx - 8, ey); g.quadraticCurveTo(cx, ey + 5, cx + 8, ey); } g.stroke(); continue; }
    if (f.cat) {
      g.fillStyle = f.iris; g.beginPath(); g.ellipse(cx, ey, 9, 10, 0, 0, 7); g.fill();
      g.fillStyle = '#1b1d1f'; g.beginPath(); g.ellipse(cx, ey, 2.4, 8, 0, 0, 7); g.fill();
      g.strokeStyle = LASH; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, ey, 9, 10, 0, 0, 7); g.stroke();
    } else {
      g.fillStyle = '#1f2224'; g.beginPath(); g.ellipse(cx, ey, 6.5, 7.5, 0, 0, 7); g.fill();
      g.strokeStyle = hexMix(f.fur, '#3b2a1c', 0.55); g.lineWidth = 3; g.beginPath(); g.moveTo(cx - s * 5, ey - 13); g.lineTo(cx + s * 4, ey - 15); g.stroke();
    }
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx + 2.4, ey - 3, 2.2, 0, 7); g.fill();
  }
  if (f.cat) {
    g.fillStyle = '#e48f9a'; g.beginPath(); g.moveTo(X(-0.07), Yp(-0.24)); g.lineTo(X(0.07), Yp(-0.24)); g.lineTo(X(0), Yp(-0.32)); g.closePath(); g.fill();
    g.strokeStyle = LASH; g.lineWidth = 1.8; g.beginPath();
    if (k === 2) { g.fillStyle = '#6b2b2b'; g.ellipse(X(0), Yp(-0.42), 5, 5, 0, 0, 7); g.fill(); }
    else { g.moveTo(X(-0.13), Yp(-0.38)); g.quadraticCurveTo(X(-0.06), Yp(-0.46), X(0), Yp(-0.34)); g.quadraticCurveTo(X(0.06), Yp(-0.46), X(0.13), Yp(-0.38)); g.stroke(); }
    g.strokeStyle = 'rgba(55,63,66,0.7)'; g.lineWidth = 1.2; g.beginPath();
    for (const s of [-1, 1]) for (const a of [-0.08, 0, 0.08]) { g.moveTo(X(s * 0.3), Yp(-0.33 + a * 0.5)); g.lineTo(X(s * 0.92), Yp(-0.3 + a * 2.2)); }
    g.stroke();
  }
}
// redesenha os 4 quadros de um rosto no mesmo lugar do atlas (o humor da Duda muda de um dia para o outro)
export function redrawFace(slot, f) {
  for (let k = 0; k < 4; k++) slotDraw(slot + k, 1, (g) => drawFace(g, f, k));
  FACE.tex.needsUpdate = true;
}
const _faceDone = new Map();
// reuse: quadro de um rosto antigo que pode ser redesenhado quando o atlas enche (troca de roupa da Duda)
export function faceSheet(f, pet, reuse) {
  const key = JSON.stringify(f) + (pet ? 'p' : '');
  if (_faceDone.has(key)) return _faceDone.get(key);
  let slot;
  if (reuse !== undefined && reuse !== null && FACE.next + 4 > 96) {
    slot = reuse;
    for (const [k, v] of _faceDone) if (v === slot) _faceDone.delete(k);
    slotDraw(slot, 4, (g, w, h) => g.clearRect(0, 0, w, h));
  } else { slot = FACE.next; FACE.next += 4; }
  if (FACE.next > 96) console.warn('rostos demais');
  for (let k = 0; k < 4; k++) slotDraw(slot + k, 1, (g) => (pet ? drawPetFace : drawFace)(g, f, k));
  _faceDone.set(key, slot);
  FACE.tex.needsUpdate = true;
  return slot;
}
