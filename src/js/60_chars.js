// ================= personagens: corpo arredondado, rosto desenhado, cabelo =================
const gradC = makeGrad([150, 255]);
const FS = 128, FAW = 2048, FAH = 1024;
// atlas dos rostos (4 quadros por pessoa: aberto, piscando, falando, feliz) + decalques (placas, logos)
const FACE = (() => {
  const cv = document.createElement('canvas'); cv.width = FAW; cv.height = FAH;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, FS, FS);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { cv, g, tex, next: 4, decal: 96, keys: new Map() };
})();
function slotUV(slot, w = 1) {
  const c = slot % 16, r = Math.floor(slot / 16);
  return [c * FS / FAW, 1 - (r + 1) * FS / FAH, (c + w) * FS / FAW, 1 - r * FS / FAH];
}
function slotDraw(slot, w, fn) {
  const g = FACE.g, x = (slot % 16) * FS, y = Math.floor(slot / 16) * FS;
  g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w * FS, FS); g.clip(); fn(g, w * FS, FS); g.restore();
}
function decal(key, w, fn) {
  if (FACE.keys.has(key)) return FACE.keys.get(key);
  if ((FACE.decal % 16) + w > 16) FACE.decal += 16 - (FACE.decal % 16);
  const s = FACE.decal; FACE.decal += w;
  slotDraw(s, w, fn);
  const uv = slotUV(s, w); FACE.keys.set(key, uv); return uv;
}
function hexMix(a, b, t) {
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
    if (f.bags) { g.strokeStyle = 'rgba(120,74,92,0.38)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 6, ey + 9); g.quadraticCurveTo(cx, ey + 12.5, cx + 6, ey + 9); g.stroke(); }
    if (f.wrinkles) { g.strokeStyle = shade; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(s * (ex + 0.17)), ey - 1); g.lineTo(X(s * (ex + 0.23)), ey - 3); g.moveTo(X(s * (ex + 0.17)), ey + 2); g.lineTo(X(s * (ex + 0.23)), ey + 3); g.stroke(); }
  }
  // sobrancelhas
  const by = Yp(f.browY ?? 0.2), bc = f.brow || '#2f2a28';
  const tilt = { calm: [0, 0], worry: [-3.2, 1.6], angry: [3.4, -2.4], up: [-2.6, -2.6], sad: [-2.2, 2.4] }[f.brows || 'calm'];
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
const _faceDone = new Map();
// reuse: quadro de um rosto antigo que pode ser redesenhado quando o atlas enche (troca de roupa da Duda)
function faceSheet(f, pet, reuse) {
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

// ---------------- decalques ----------------
function decSign(text, bg = '#f1e6c8', fg = '#c25959') {
  return decal('sign' + text, 2, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(55,63,66,0.25)'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = text.split('\n'), fsz = lines.length > 1 ? 44 : 64;
    g.font = `${fsz}px "Patrick Hand SC", "Comic Sans MS", cursive`;
    lines.forEach((l, i) => { g.save(); g.translate(w / 2, h / 2 + (i - (lines.length - 1) / 2) * fsz * 0.95); g.rotate(-0.03 + i * 0.03); g.fillText(l, 0, 2); g.restore(); });
  });
}
function decLogo() {
  return decal('logo', 1, (g, w, h) => {
    g.fillStyle = '#de794e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f4f4ef'; g.lineWidth = 9; g.beginPath(); g.arc(w / 2, h / 2, 34, 0.4, Math.PI * 1.75); g.stroke();
    g.fillStyle = '#f4f4ef'; g.beginPath(); g.moveTo(w / 2 + 30, h / 2 - 34); g.lineTo(w / 2 + 46, h / 2 - 10); g.lineTo(w / 2 + 16, h / 2 - 12); g.closePath(); g.fill();
    g.font = 'bold 26px "Silkscreen", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GIRA', w / 2, h / 2 + 2);
  });
}
function decPhone() {
  return decal('phone', 1, (g, w, h) => {
    g.fillStyle = '#2f3a40'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9fe0d6'; g.fillRect(30, 10, 68, 108);
    g.fillStyle = '#de794e'; g.beginPath(); g.arc(64, 54, 16, 0, 7); g.fill();
    g.fillStyle = '#c25959'; g.beginPath(); g.arc(44, 24, 5, 0, 7); g.fill();
    g.fillStyle = '#f4f4ef'; g.font = 'bold 12px "Silkscreen", monospace'; g.textAlign = 'center'; g.fillText('AO VIVO', 64, 98);
  });
}
function decNews() {
  return decal('news', 2, (g, w, h) => {
    g.fillStyle = '#efeee6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#373f42'; g.font = 'bold 22px "Silkscreen", monospace'; g.textAlign = 'center'; g.fillText('O GIRANTE', w / 2, 26);
    g.fillRect(10, 34, w - 20, 3);
    g.font = '22px "Patrick Hand SC", cursive'; g.fillText('META: +1 VOLTA', w / 2, 60);
    for (let i = 0; i < 4; i++) { g.fillRect(14, 74 + i * 11, w / 2 - 24, 4); g.fillRect(w / 2 + 10, 74 + i * 11, w / 2 - 24, 4); }
  });
}
function decBox() {
  return decal('jah', 1, (g, w, h) => {
    g.fillStyle = '#c25959'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f4ef'; g.font = '58px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JÁ!', w / 2, h / 2 - 6);
    g.font = 'bold 13px "Silkscreen", monospace'; g.fillText('ENTREGA EM 7 MIN', w / 2, h - 18);
  });
}
const STRIKE = ['PAREI!', '6x1\nNÃO', 'DOMINGO\nÉ NOSSO', 'ELE GIRA\nSOZINHO', 'QUEREMOS\nTEMPO', 'VIDA ALÉM\nDA VOLTA', 'HOJE\nNÃO'];

// ---------------- geometrias ----------------
function weldNormals(geo) {
  const p = geo.attributes.position.array, n = geo.attributes.normal.array, map = new Map();
  for (let i = 0; i < p.length; i += 3) {
    const k = Math.round(p[i] * 1e4) + ',' + Math.round(p[i + 1] * 1e4) + ',' + Math.round(p[i + 2] * 1e4);
    let a = map.get(k); if (!a) map.set(k, a = []); a.push(i);
  }
  for (const a of map.values()) if (a.length > 1) {
    let x = 0, y = 0, z = 0; for (const i of a) { x += n[i]; y += n[i + 1]; z += n[i + 2]; }
    const l = Math.hypot(x, y, z) || 1; for (const i of a) { n[i] = x / l; n[i + 1] = y / l; n[i + 2] = z / l; }
  }
  return geo;
}
// cápsula afunilada: base (r2) em y=0, topo (r1) em y=len
function taperG(r1, r2, len, n = LOW ? 8 : 10) {
  const pts = [], cs = LOW ? 3 : 4;
  for (let i = 0; i <= cs; i++) { const a = -Math.PI / 2 + i / cs * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r2), Math.sin(a) * r2)); }
  for (let i = 0; i <= cs; i++) { const a = i / cs * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r1), len + Math.sin(a) * r1)); }
  return new THREE.LatheGeometry(pts, n, Math.PI);
}
function latheG(prof, n = LOW ? 12 : 16) { return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y)), n, Math.PI); }
const HEADK = {
  adult: { jaw: 0.3, wide: 1, tall: 1.06, deep: 0.97, chin: 0.05 },
  kid: { jaw: 0.16, wide: 1.03, tall: 1.0, deep: 0.98, chin: 0.02 },
  wide: { jaw: 0.12, wide: 1.07, tall: 1.03, deep: 1.0, chin: 0.02 },
  elder: { jaw: 0.22, wide: 0.98, tall: 1.1, deep: 0.97, chin: 0.04 },
  cat: { jaw: 0.25, wide: 1.2, tall: 0.88, deep: 0.92, chin: 0 },
  dog: { jaw: 0.12, wide: 1.06, tall: 0.95, deep: 1.0, chin: 0 },
};
function deformPt(v, k) {
  const t = Math.max(0, -v.y);
  const nar = 1 - k.jaw * Math.pow(t, 1.6);
  v.x *= nar * k.wide;
  v.z *= (1 - k.jaw * 0.35 * Math.pow(t, 1.6)) * k.deep;
  if (v.z > 0) v.z += k.chin * t * t * v.z;
  v.y *= k.tall;
  return v;
}
// cabeça (esfera deformada) + capa do rosto alinhada à mesma grade, um pouco acima da pele
function headGeos(kind) {
  const key = 'head' + kind; if (_gc.has(key)) return _gc.get(key);
  const k = HEADK[kind], W = LOW ? 20 : 24, Hs = LOW ? 12 : 16;
  const head = new THREE.SphereGeometry(1, W, Hs);
  const stepP = 360 / W, nP = Math.floor(75 / stepP), stepT = 180 / Hs, t0 = 2, t1 = Hs - 1;
  const cap = new THREE.SphereGeometry(1, nP * 2, t1 - t0, (90 - nP * stepP) * D2R, nP * 2 * stepP * D2R, t0 * stepT * D2R, (t1 - t0) * stepT * D2R);
  const v = new THREE.Vector3();
  for (const [g, sc] of [[head, 1], [cap, 1.012]]) {
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (g === cap) uv.setXY(i, 0.5 + v.x * 0.5, 0.5 + v.y * 0.5);
      deformPt(v, k).multiplyScalar(sc);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); weldNormals(g);
  }
  const out = { head, cap };
  _gc.set(key, out);
  return out;
}
// casca de cabelo: borda (franja/nuca) varia com o rumo; zigue-zague faz as mechas; vira cortina abaixo do equador
function shellGeo(o) {
  const key = 'sh' + JSON.stringify(o) + LOW; if (_gc.has(key)) return _gc.get(key);
  const NP = LOW ? 28 : 40, NT = LOW ? 7 : 9, th = o.th ?? 0.14, EQ = Math.PI / 2, r0 = o.r ?? 1.1;
  const edgeAt = (phi) => { const a = Math.cos(phi), w = a * Math.abs(a); return a >= 0 ? lerp(o.side, o.front, w) : lerp(o.side, o.back, -w); };
  const zigAt = (phi) => { const a = Math.cos(phi); return a >= 0 ? lerp(o.zigS ?? 0.08, o.zigF ?? 0.2, a * a) : lerp(o.zigS ?? 0.08, o.zigB ?? 0.05, a * a); };
  const point = (phi, theta, inner) => {
    let rad = r0;
    if (o.bump) rad *= 1 + o.bump * (vnoise3(Math.sin(phi) * 2.6 + (o.seed || 0), theta * 2.4, Math.cos(phi) * 2.6) - 0.5) * 2;
    if (o.puff) rad *= 1 + o.puff * Math.sin(Math.min(theta, EQ));
    if (o.flat) rad *= 1 - o.flat * Math.pow(Math.cos(Math.min(theta, EQ)), 2);
    if (inner) rad -= th;
    let y, h;
    if (theta <= EQ) { y = Math.cos(theta) * rad * 1.06; h = Math.sin(theta) * rad; }
    else { y = -(theta - EQ) * (o.drop ?? 1.15); h = rad * (1 - (o.taper ?? 0.05) * (theta - EQ)); }
    return new THREE.Vector3(Math.sin(phi) * h * (o.wide || 1), y, Math.cos(phi) * h);
  };
  const P = [], I = [];
  const push = (v) => { P.push(v.x, v.y, v.z); return P.length / 3 - 1; };
  const grid = (inner) => {
    const pole = push(new THREE.Vector3(0, (r0 - (inner ? th : 0)) * 1.06 * (1 - (o.flat || 0)), 0));
    const ids = [];
    for (let i = 0; i < NP; i++) {
      const phi = i / NP * Math.PI * 2;
      const e = edgeAt(phi) + zigAt(phi) * (i % 2 ? 1 : -0.5);
      const col = [];
      for (let j = 1; j <= NT; j++) col.push(push(point(phi, e * j / NT, inner)));
      ids.push(col);
    }
    return { pole, ids };
  };
  const O = grid(false), In = grid(true);
  const V = (i) => new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
  const tri = (a, b, c, want) => {
    const A = V(a), n = V(b).sub(A).cross(V(c).sub(A));
    if (n.dot(want) < 0) I.push(a, c, b); else I.push(a, b, c);
  };
  const cen = (a, b, c) => V(a).add(V(b)).add(V(c)).multiplyScalar(1 / 3).setY(0).addScaledVector(Y, 0.0001 + Math.max(0, V(a).y) * 0.6);
  for (const [S, sgn] of [[O, 1], [In, -1]]) {
    for (let i = 0; i < NP; i++) {
      const i2 = (i + 1) % NP, A = S.ids[i], B = S.ids[i2];
      { const w = cen(S.pole, A[0], B[0]).multiplyScalar(sgn); tri(S.pole, A[0], B[0], w.lengthSq() < 1e-8 ? Y.clone().multiplyScalar(sgn) : w); }
      for (let j = 0; j < NT - 1; j++) {
        const w = cen(A[j], A[j + 1], B[j + 1]).multiplyScalar(sgn);
        tri(A[j], A[j + 1], B[j + 1], w); tri(A[j], B[j + 1], B[j], w);
      }
    }
  }
  // aro entre a borda de fora e a de dentro
  for (let i = 0; i < NP; i++) {
    const i2 = (i + 1) % NP, a = O.ids[i][NT - 1], b = O.ids[i2][NT - 1], c = In.ids[i2][NT - 1], d = In.ids[i][NT - 1];
    const w = V(a).sub(V(O.ids[i][NT - 2]));
    tri(a, b, c, w); tri(a, c, d, w);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I); g.computeVertexNormals();
  _gc.set(key, g);
  return g;
}
// penteados (unidades da cabeça, raio 1)
const HAIR = {
  bob: { shell: { front: 1.32, side: 2.05, back: 2.15, zigF: 0.24, zigS: 0.12, zigB: 0.07 } },
  pony: { shell: { front: 1.28, side: 1.75, back: 1.7, zigF: 0.22, zigS: 0.1, zigB: 0.04, r: 1.08 }, tail: 'pony' },
  bun: { shell: { front: 1.12, side: 1.62, back: 1.72, zigF: 0.08, zigS: 0.04, zigB: 0.03, r: 1.06, th: 0.1 }, bun: true },
  buns: { shell: { front: 1.3, side: 1.72, back: 1.85, zigF: 0.2, zigS: 0.08, zigB: 0.05, r: 1.08 }, buns: true },
  long: { shell: { front: 1.3, side: 2.5, back: 3.4, zigF: 0.2, zigS: 0.1, zigB: 0.08, taper: 0.03 } },
  braid: { shell: { front: 1.18, side: 1.7, back: 1.8, zigF: 0.12, zigS: 0.06, zigB: 0.04, r: 1.07 }, tail: 'braid' },
  short: { shell: { front: 1.12, side: 1.58, back: 1.95, zigF: 0.2, zigS: 0.1, zigB: 0.08, r: 1.09 }, spikes: 4 },
  spiky: { shell: { front: 1.05, side: 1.55, back: 1.9, zigF: 0.28, zigS: 0.14, zigB: 0.1, r: 1.11 }, spikes: 9 },
  slick: { shell: { front: 0.98, side: 1.56, back: 1.86, zigF: 0.0, zigS: 0.03, zigB: 0.05, r: 1.07, th: 0.1 } },
  buzz: { shell: { front: 1.02, side: 1.6, back: 1.9, zigF: 0.02, zigS: 0.02, zigB: 0.02, r: 1.035, th: 0.06 } },
  curly: { shell: { front: 1.18, side: 1.75, back: 1.95, zigF: 0.14, zigS: 0.1, zigB: 0.1, r: 1.16, bump: 0.09, seed: 3 } },
  afro: { shell: { front: 1.1, side: 1.7, back: 1.95, zigF: 0.05, zigS: 0.05, zigB: 0.05, r: 1.12, bump: 0.08, seed: 5 }, afro: true },
  puff: { shell: { front: 1.05, side: 1.62, back: 1.85, zigF: 0.02, zigS: 0.02, zigB: 0.02, r: 1.06, th: 0.09, bump: 0.05, seed: 8 }, puff: true },
  bald: { sides: true },
};
const HAIR_NAMES = { bob: 'Chanel com franja', pony: 'Rabo de cavalo', bun: 'Coque', buns: 'Dois coquinhos', long: 'Comprido', braid: 'Trança', short: 'Curtinho', spiky: 'Espetado', curly: 'Cacheado', afro: 'Black power', puff: 'Puff' };

// ---------------- corpos ----------------
const BODY = {
  f: { hr: 0.15, hip: 0.8, knee: 0.44, ank: 0.085, waist: 0.86, shY: 1.205, shX: 0.155, neck: 1.295, arm: 0.245, fore: 0.21, hipX: 0.08, tw: 0.95, td: 0.7, belly: 0, chest: 0.014, lg: 0.95, ag: 0.92, head: 'adult' },
  m: { hr: 0.15, hip: 0.81, knee: 0.45, ank: 0.085, waist: 0.87, shY: 1.23, shX: 0.172, neck: 1.315, arm: 0.255, fore: 0.215, hipX: 0.082, tw: 1.03, td: 0.7, belly: 0, chest: 0, lg: 1.0, ag: 1.0, head: 'adult' },
  big: { hr: 0.155, hip: 0.8, knee: 0.44, ank: 0.085, waist: 0.86, shY: 1.22, shX: 0.19, neck: 1.305, arm: 0.25, fore: 0.21, hipX: 0.095, tw: 1.22, td: 0.92, belly: 0.05, chest: 0, lg: 1.2, ag: 1.15, head: 'wide' },
  strong: { hr: 0.148, hip: 0.82, knee: 0.455, ank: 0.085, waist: 0.88, shY: 1.25, shX: 0.205, neck: 1.335, arm: 0.26, fore: 0.22, hipX: 0.085, tw: 1.24, td: 0.78, belly: 0, chest: 0.02, lg: 1.12, ag: 1.35, head: 'adult', shoulders: 0.035 },
  elder: { hr: 0.15, hip: 0.76, knee: 0.42, ank: 0.08, waist: 0.82, shY: 1.15, shX: 0.16, neck: 1.235, arm: 0.24, fore: 0.205, hipX: 0.08, tw: 1.04, td: 0.76, belly: 0.025, chest: 0, lg: 0.95, ag: 0.95, head: 'elder', stoop: 0.22 },
  kid: { hr: 0.142, hip: 0.5, knee: 0.28, ank: 0.07, waist: 0.545, shY: 0.8, shX: 0.118, neck: 0.865, arm: 0.17, fore: 0.15, hipX: 0.058, tw: 0.74, td: 0.74, belly: 0.008, chest: 0, lg: 0.75, ag: 0.72, head: 'kid' },
};
const SKINS = ['#f6d7c3', '#eec1a1', '#d9a27c', '#b97c57', '#8d5a3b', '#6b4430'];
const HAIRCOL = ['#2f3437', '#3d3330', '#5a4032', '#8a5a3a', '#c99a5b', '#d9d4cc', '#9b4a3a', '#29323d'];
// pele em relação ao tom (para nariz/sombra do rosto)
const BI = { root: 0, torso: 1, head: 2, armL: 3, foreL: 4, armR: 5, foreR: 6, legL: 7, shinL: 8, footL: 9, legR: 10, shinR: 11, footR: 12, tail: 13, prop: 14, sign: 15 };

function charMat() {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, map: FACE.tex, gradientMap: gradC });
  patchMat(m, { pat: true });
  const ob = m.onBeforeCompile, face = { value: new THREE.Vector2() };
  m.onBeforeCompile = (sh) => {
    ob(sh);
    sh.uniforms.uFace = face;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec2 uFace;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv += aPat.y * uFace;\n#endif');
  };
  const key = m.customProgramCacheKey(); m.customProgramCacheKey = () => key + '|chr';
  m.userData.face = face;
  return m;
}

// monta uma pessoa. spec: { body, skin, hair:{style,color}, hat:{kind,color}, top:{kind,color,c2}, bottom:{kind,color}, shoes:{kind,color,sole}, socks, acc:[], prop, face:{...}, sign }
function makeChar(spec) {
  const P = Object.assign({}, BODY[spec.body || 'f'], spec.dims || {});
  const g = new Geo(true);
  const skin = spec.skin || SKINS[1];
  const add = (geo, M, color, id, bone, o) => g.add(geo, M, null, Object.assign({ c: C(color), id, bone }, o || {}));
  const hr = P.hr, hc = P.neck + hr * 0.8;           // centro da cabeça
  const top = spec.top || { kind: 'tee', color: '#f4f4ef' }, bot = spec.bottom || { kind: 'pants', color: '#4f6f8f' };
  const shoes = spec.shoes || { kind: 'sneaker', color: '#f3c258', sole: '#f4f4ef' };
  const acc = new Set(spec.acc || []);
  const tc = top.color, bc = bot.color;
  const dress = top.kind === 'dress';
  // ---- ossos ----
  const bones = [];
  const mk = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); if (parent) parent.add(b); bones.push(b); return b; };
  const root = mk(null, 0, P.hip, 0);
  const torso = mk(root, 0, P.waist - P.hip, 0);
  const head = mk(torso, 0, P.neck - P.waist, 0);
  const armL = mk(torso, P.shX, P.shY - P.waist, 0), foreL = mk(armL, 0, -P.arm, 0);
  const armR = mk(torso, -P.shX, P.shY - P.waist, 0), foreR = mk(armR, 0, -P.arm, 0);
  const legL = mk(root, P.hipX, 0, 0), shinL = mk(legL, 0, P.knee - P.hip, 0), footL = mk(shinL, 0, P.ank - P.knee, 0);
  const legR = mk(root, -P.hipX, 0, 0), shinR = mk(legR, 0, P.knee - P.hip, 0), footR = mk(shinR, 0, P.ank - P.knee, 0);
  mk(head, 0, hr * 0.55, -hr * 0.95);                  // 13 rabo de cavalo
  mk(foreR, 0, -P.fore - 0.03 * P.ag, 0.0);              // 14 objeto na mão
  mk(foreR, 0, -P.fore - 0.03 * P.ag, 0.0);              // 15 cartaz da greve
  // ---- tronco ----
  const ky = (P.shY - P.waist) / 0.35, w = P.tw, b = P.belly, cst = P.chest, shd = P.shoulders || 0;
  const prof = [[0.0, -0.12], [0.137, -0.12], [0.14, -0.05], [0.134 + b * 0.8, 0.04], ...(bot.kind === 'overall' ? [[0.136 + b * 0.88, 0.064], [0.137 + b * 0.9, 0.076]] : []), [0.14 + b, 0.1], [0.148 + cst + b * 0.4, 0.18], [0.156 + cst * 0.6, 0.24], [0.16 + shd, 0.3], [0.15 + shd, 0.34], [0.112 + shd * 0.5, 0.375], [0.06, 0.395], [0.0, 0.4]];
  const torsoC = dress ? tc : (top.kind === 'apron' ? tc : tc);
  // macacão: a barriga e as costas até a cintura são do tecido do macacão (nada de camiseta aparecendo por baixo)
  const ovr = bot.kind === 'overall' ? { cf: (x, y) => (y < P.waist + 0.07 * ky ? C(bc) : C(torsoC)) } : null;
  { const tg = latheG(prof.map(([r, y]) => [r * w, y * ky])); add(tg, TM(0, P.waist, 0, 1, 1, P.td), torsoC, 3, BI.torso, ovr); tg.dispose(); }
  // pescoço
  { const ng = taperG(0.042 * hr / 0.15, 0.045 * hr / 0.15, P.neck - P.shY + 0.06); add(ng, TM(0, P.shY - 0.02, 0.0), skin, 1, BI.torso); ng.dispose(); }
  if (top.kind === 'polo' || top.kind === 'shirt' || top.kind === 'blazer') add(torG(1, 0.32, 6, 14), TM(0, P.shY + 0.02, 0.005, 0.058, 0.058, 0.05, 0, Math.PI / 2 + 0.25), top.collar || (top.kind === 'polo' ? tc : '#f4f4ef'), 6, BI.torso);
  if (top.kind === 'hoodie') add(torG(1, 0.45, 6, 14), TM(0, P.shY + 0.0, -0.035, 0.08, 0.08, 0.06, 0, Math.PI / 2 - 0.35), tc, 6, BI.torso);
  // ---- braços ----
  const armC = ['long', 'shirt', 'blazer', 'cardigan', 'hoodie', 'jacket'].includes(top.kind) ? (top.sleeve || tc) : skin;
  const sleeveShort = ['tee', 'polo', 'apron', 'dress'].includes(top.kind);
  const shoulderC = top.kind === 'tank' ? skin : (top.sleeve || tc);
  for (const s of [1, -1]) {
    const x = s * P.shX, bA = s > 0 ? BI.armL : BI.armR, bF = s > 0 ? BI.foreL : BI.foreR, ag = P.ag;
    add(sphG(12, 8), TM(x - s * 0.012, P.shY - 0.014, 0, 0.042 * ag, 0.046 * ag, 0.042 * ag), shoulderC, 3, bA);
    const ua = taperG(0.045 * ag, 0.038 * ag, P.arm); add(ua, TM(x, P.shY - P.arm, 0), armC, armC === skin ? 1 : 3, bA); ua.dispose();
    if (sleeveShort) { const sl = taperG(0.056 * ag, 0.05 * ag, P.arm * 0.42); add(sl, TM(x, P.shY - P.arm * 0.5, 0), top.sleeve || tc, 3, bA); sl.dispose(); }
    const fa = taperG(0.037 * ag, 0.029 * ag, P.fore); add(fa, TM(x, P.shY - P.arm - P.fore, 0), armC, armC === skin ? 1 : 3, bF); fa.dispose();
    if (armC !== skin) { const cf = taperG(0.036 * ag, 0.036 * ag, 0.025); add(cf, TM(x, P.shY - P.arm - P.fore - 0.004, 0), hexMix(armC, '#000000', 0.12), 6, bF); cf.dispose(); }
    const hy = P.shY - P.arm - P.fore - 0.036 * ag;
    add(sphG(10, 8), TM(x, hy, 0.004, 0.034 * ag, 0.047 * ag, 0.026 * ag), skin, 1, bF);
    add(sphG(8, 6), TM(x - s * 0.018 * ag, hy + 0.012, 0.022 * ag, 0.014 * ag, 0.022 * ag, 0.014 * ag, 0, -0.3), skin, 1, bF);
    if (acc.has('watch') && s > 0) add(torG(1, 0.25, 5, 12), TM(x, P.shY - P.arm - P.fore + 0.02, 0, 0.036 * ag, 0.036 * ag, 0.036 * ag, 0, Math.PI / 2), '#e5c27a', 6, bF);
  }
  // ---- quadril, pernas, pés ----
  const legC = bot.kind === 'pants' || bot.kind === 'overall' ? bc : skin;
  const lg = P.lg;
  if (!dress) add(sphG(14, 10), TM(0, P.hip + 0.005, 0, 0.128 * w, 0.105 * ky, 0.09 * P.td / 0.7), bc, 4, BI.root);
  for (const s of [1, -1]) {
    const x = s * P.hipX, bL = s > 0 ? BI.legL : BI.legR, bS = s > 0 ? BI.shinL : BI.shinR, bFt = s > 0 ? BI.footL : BI.footR;
    const th = taperG(0.066 * lg, 0.05 * lg, P.hip - P.knee); add(th, TM(x, P.knee, 0), legC, legC === skin ? 1 : 4, bL); th.dispose();
    if (bot.kind === 'shorts') { const sh = taperG(0.075 * lg, 0.066 * lg, (P.hip - P.knee) * 0.55); add(sh, TM(x, P.hip - (P.hip - P.knee) * 0.55, 0), bc, 4, bL); sh.dispose(); }
    const sn = taperG(0.049 * lg, 0.035 * lg, P.knee - P.ank); add(sn, TM(x, P.ank, 0), legC, legC === skin ? 1 : 4, bS); sn.dispose();
    if (spec.socks && legC === skin) { const sk = taperG(0.04 * lg, 0.038 * lg, 0.075); add(sk, TM(x, P.ank - 0.01, 0), spec.socks, 7, bS); sk.dispose(); }
    // calçado (o pé fica no tornozelo; a sola encosta em y = 0)
    const fl = Math.min(1, lg * 1.05), ay = P.ank;
    if (shoes.kind === 'sandal') {
      add(sphG(10, 6), TM(x, 0.035, 0.035, 0.04 * fl, 0.03, 0.09 * fl), skin, 1, bFt);
      add(GEO.box, TM(x, 0.011, 0.03, 0.1 * fl, 0.022, 0.22 * fl), shoes.color, 5, bFt);
      add(GEO.box, TM(x, 0.04, 0.075, 0.085 * fl, 0.014, 0.022), shoes.sole || '#f4f4ef', 6, bFt);
    } else if (shoes.kind === 'boot') {
      const bt = taperG(0.055 * fl, 0.052 * fl, Math.max(0.05, ay + 0.06)); add(bt, TM(x, 0.04, 0, 1, 1, 1.05), shoes.color, 5, bFt); bt.dispose();
      add(sphG(10, 6), TM(x, 0.045, 0.06, 0.055 * fl, 0.045, 0.08 * fl), shoes.color, 5, bFt);
      add(GEO.box, TM(x, 0.012, 0.03, 0.12 * fl, 0.024, 0.22 * fl), shoes.sole || '#4b3a2f', 6, bFt);
    } else if (shoes.kind === 'shoe') {
      add(sphG(10, 6), TM(x, 0.045, 0.035, 0.05 * fl, 0.04, 0.1 * fl), shoes.color, 5, bFt);
      add(GEO.box, TM(x, 0.009, 0.035, 0.1 * fl, 0.018, 0.2 * fl), shoes.sole || '#2f2a28', 6, bFt);
    } else {
      add(sphG(12, 8), TM(x, 0.05, 0.03, 0.058 * fl, 0.05, 0.105 * fl), shoes.color, 5, bFt);
      add(GEO.box, TM(x, 0.016, 0.03, 0.122 * fl, 0.032, 0.232 * fl), shoes.sole || '#f4f4ef', 6, bFt);
      add(sphG(10, 6), TM(x, 0.036, 0.125 * fl, 0.05 * fl, 0.032, 0.05 * fl), shoes.sole || '#f4f4ef', 6, bFt);
      const cl = taperG(0.045 * fl, 0.045 * fl, 0.04); add(cl, TM(x, ay - 0.02, -0.005), shoes.color, 5, bFt); cl.dispose();
    }
  }
  // saia / vestido
  if (bot.kind === 'skirt' || dress) {
    const hem = P.knee + (dress ? -0.02 : 0.06), H0 = P.waist + 0.04 - hem;
    const sk = latheG([[0.0, H0 + 0.01], [0.132 * w, H0], [0.145 * w, H0 * 0.7], [0.175 * w, H0 * 0.3], [0.205 * w, 0.02], [0.2 * w, 0.0], [0.0, 0.0]].reverse().map(([r, y]) => [r, y]));
    // a barra acompanha as pernas (perto do quadril fica presa ao corpo): a coxa nunca fura a saia
    const span = P.hip + 0.03 - hem;
    const skinF = (x, y) => {
      const k = sstep(0, 1, (P.hip + 0.03 - y) / span) * 0.82, sL = sstep(-0.075, 0.075, x);
      return [BI.root, 1 - k, BI.legL, k * sL, BI.legR, k * (1 - sL)];
    };
    add(sk, TM(0, hem, 0, 1, 1, 0.82), dress ? tc : bc, 4, BI.root, { skinF }); sk.dispose();
  }
  if (bot.kind === 'overall') {
    add(GEO.box, TM(0, P.waist + 0.12 * ky, 0.095 * P.td / 0.7, 0.2 * w, 0.2 * ky, 0.03), bc, 4, BI.torso);
    for (const s of [1, -1]) add(GEO.box, TM(s * 0.075 * w, P.waist + 0.27 * ky, 0.0, 0.03, 0.2 * ky, 0.23 * P.td / 0.7, 0, 0, 0), bc, 4, BI.torso);
  }
  // ---- extras do tronco ----
  const chestZ = 0.152 * P.td / 0.7 + b * 0.5;
  if (top.kind === 'apron') {
    add(GEO.box, TM(0, P.waist + 0.17 * ky, chestZ - 0.03, 0.14 * w, 0.15 * ky, 0.018), top.c2 || '#f4f4ef', 6, BI.torso);
    add(GEO.box, TM(0, P.hip - 0.06, 0.094 * P.td / 0.7, 0.21 * w, 0.28, 0.018, 0, -0.1), top.c2 || '#f4f4ef', 6, BI.root);
    add(torG(1, 0.05, 4, 16), TM(0, P.waist + 0.01, 0, 0.142 * w, 0.142 * w, 0.142 * w * P.td, 0, Math.PI / 2), top.c2 || '#f4f4ef', 6, BI.torso);
  }
  if (top.kind === 'blazer' || top.kind === 'shirt' || acc.has('tie')) {
    if (top.kind === 'blazer') add(GEO.box, TM(0, P.waist + 0.22 * ky, chestZ - 0.018, 0.075 * w, 0.18 * ky, 0.02, 0, 0, 0), '#f4f4ef', 6, BI.torso);
    add(GEO.box, TM(0, P.waist + 0.16 * ky, chestZ - 0.004, 0.035, 0.2 * ky, 0.018), spec.tie || '#c25959', 7, BI.torso);
    add(sphG(8, 6), TM(0, P.waist + 0.345 * ky, chestZ - 0.03, 0.024, 0.02, 0.016), spec.tie || '#c25959', 7, BI.torso);
  }
  if (top.kind === 'cardigan') for (let i = 0; i < 4; i++) add(sphG(6, 4), TM(0, P.waist + (0.04 + i * 0.08) * ky, chestZ - 0.012 + (i === 1 ? b * 0.6 : 0), 0.011, 0.011, 0.008), '#e9e6dc', 6, BI.torso);
  if (top.kind === 'polo' && top.logo !== false) { const uv = decLogo(); add(GEO.plane, TM(-0.07 * w, P.waist + 0.24 * ky, chestZ + 0.001, 0.07, 0.07, 1), '#ffffff', 6, BI.torso, { uv }); }
  if (top.kind === 'hoodie') add(GEO.box, TM(0, P.waist + 0.02, chestZ - 0.01, 0.17 * w, 0.08, 0.02), hexMix(tc, '#000000', 0.12), 6, BI.torso);
  if (acc.has('strap')) {
    const sm = new THREE.Matrix4().makeTranslation(0, P.waist + 0.19 * ky, 0).multiply(new THREE.Matrix4().makeRotationZ(-0.6))
      .multiply(new THREE.Matrix4().makeScale(0.2 * w, 0.2 * w, 0.122 * P.td / 0.7)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    add(torG(1, 0.06, 4, 24), sm, spec.strapC || '#5a6062', 6, BI.torso);
    add(sphG(10, 6), TM(0.15 * w, P.hip + 0.05, 0.03, 0.07, 0.075, 0.04), spec.bagC || '#6b7a7d', 7, BI.root);
  }
  if (acc.has('badge')) {
    for (const s of [1, -1]) add(GEO.box, TM(s * 0.035, P.waist + 0.27 * ky, chestZ - 0.02, 0.01, 0.15 * ky, 0.008, 0, -0.25 * s, s * 0.32), '#4f86b8', 6, BI.torso);
    add(GEO.box, TM(0, P.waist + 0.15 * ky, chestZ + 0.003, 0.055, 0.075, 0.008), '#f4f4ef', 7, BI.torso);
    add(GEO.plane, TM(0, P.waist + 0.153 * ky, chestZ + 0.0085, 0.045, 0.045, 1), '#ffffff', 7, BI.torso, { uv: decLogo() });
  }
  if (acc.has('backpack')) {
    add(sphG(12, 8), TM(0, P.waist + 0.15 * ky, -0.15 * P.td / 0.7 - 0.05, 0.14 * w, 0.16 * ky, 0.08), spec.packC || '#66bde6', 6, BI.torso);
    for (const s of [1, -1]) add(torG(1, 0.12, 4, 12), TM(s * 0.085 * w, P.waist + 0.2 * ky, -0.02, 0.06, 0.14 * ky, 0.12 * P.td / 0.7, Math.PI / 2, 0, 0), '#3f8fb8', 6, BI.torso);
  }
  if (acc.has('delivery')) {
    const bz = -0.12 * P.td / 0.7 - 0.2;
    add(GEO.box, TM(0, P.waist + 0.16 * ky, bz, 0.42, 0.42, 0.36), '#c25959', 6, BI.torso);
    const uv = decBox();
    add(GEO.plane, TM(0, P.waist + 0.16 * ky, bz - 0.181, 0.36, 0.36, 1, Math.PI), '#ffffff', 7, BI.torso, { uv });
    for (const s of [1, -1]) add(GEO.plane, TM(s * 0.211, P.waist + 0.16 * ky, bz, 0.32, 0.32, 1, s * Math.PI / 2), '#ffffff', 7, BI.torso, { uv });
    for (const s of [1, -1]) add(GEO.box, TM(s * 0.09 * w, P.waist + 0.2 * ky, -0.03, 0.025, 0.3 * ky, 0.2 * P.td / 0.7), '#373f42', 6, BI.torso);
  }
  if (acc.has('chain')) add(torG(1, 0.08, 5, 18), TM(0, P.shY - 0.005, 0.025, 0.075, 0.075, 0.07, 0, Math.PI / 2 - 0.5), '#e5c27a', 6, BI.torso);
  if (acc.has('whistle')) { add(sphG(8, 6), TM(0, P.waist + 0.24 * ky, chestZ + 0.01, 0.018, 0.018, 0.024), '#c9cdc2', 7, BI.torso); for (const s of [1, -1]) add(GEO.box, TM(s * 0.03, P.waist + 0.3 * ky, chestZ - 0.01, 0.006, 0.12 * ky, 0.006, 0, 0, s * 0.35), '#c25959', 6, BI.torso); }
  // ---- cabeça ----
  const hk = HEADK[P.head], HG = headGeos(P.head);
  const HM = (x, y, z, sx, sy, sz, ry, rx, rz) => TM(x, hc + y, 0.008 + z, sx, sy, sz, ry, rx, rz);
  add(HG.head, HM(0, 0, 0, hr, hr, hr), skin, 1, BI.head);
  const f = Object.assign({ skin }, spec.face || {});
  if (!f.brow) f.brow = hexMix(spec.hair?.color || '#2f3437', '#1a1a1a', 0.25);
  const slot = faceSheet(f, false, spec.reuseSlot);
  add(HG.cap, HM(0, 0, 0, hr, hr, hr), '#ffffff', 1, BI.head, { uv: slotUV(slot), face: true });
  for (const s of [1, -1]) add(sphG(10, 8), HM(s * hr * 0.97 * hk.wide, -hr * 0.06, -hr * 0.04, hr * 0.13, hr * 0.22, hr * 0.15, s * 0.3), skin, 1, BI.head);
  if (acc.has('earrings')) for (const s of [1, -1]) add(sphG(6, 4), HM(s * hr * 1.0 * hk.wide, -hr * 0.3, -hr * 0.04, hr * 0.06, hr * 0.06, hr * 0.06), '#e5c27a', 6, BI.head);
  // cabelo
  const hs = spec.hair || { style: 'bob', color: HAIRCOL[0] }, H = HAIR[hs.style] || HAIR.bob, hcC = hs.color;
  if (H.shell) add(shellGeo(H.shell), HM(0, 0, 0, hr, hr, hr), hcC, 2, BI.head);
  if (H.spikes) for (let i = 0; i < H.spikes; i++) {
    const a = (i / H.spikes - 0.5) * 2.4, tilt = 0.55 + (i % 2) * 0.25;
    add(cylG(6, 0), HM(Math.sin(a) * hr * 0.55, hr * 0.92, -hr * 0.15 - Math.cos(a) * hr * 0.2, hr * 0.28, hr * 0.5, hr * 0.28, a, -tilt), hcC, 2, BI.head);
  }
  if (H.bun) { add(sphG(12, 8), HM(0, hr * 0.98, -hr * 0.55, hr * 0.42, hr * 0.38, hr * 0.42), hcC, 2, BI.head); add(torG(1, 0.2, 5, 12), HM(0, hr * 0.8, -hr * 0.42, hr * 0.28, hr * 0.28, hr * 0.28, 0, 0.6), spec.hair.band || '#c25959', 6, BI.head); }
  if (H.buns) for (const s of [1, -1]) add(sphG(12, 8), HM(s * hr * 0.66, hr * 0.8, -hr * 0.2, hr * 0.36, hr * 0.36, hr * 0.36), hcC, 2, BI.head);
  if (H.afro) add(blobG(4, LOW ? 1 : 2), HM(0, hr * 0.42, -hr * 0.28, hr * 1.42, hr * 1.25, hr * 1.36), hcC, 2, BI.head);
  // faixa na testa, por baixo do black power
  if (H.afro && spec.hair.band) add(torG(1, 0.13, 6, 22), HM(0, hr * 0.4, hr * 0.02, hr * 1.02, hr * 1.02, hr * 1.02, 0, Math.PI / 2 - 0.42), spec.hair.band, 6, BI.head);
  if (H.puff) { add(blobG(2, LOW ? 1 : 2), HM(0, hr * 1.1, -hr * 0.5, hr * 0.78, hr * 0.7, hr * 0.78), hcC, 2, BI.head); add(torG(1, 0.18, 5, 14), HM(0, hr * 0.8, -hr * 0.36, hr * 0.44, hr * 0.44, hr * 0.44, 0, 0.55), spec.hair.band || '#f3c258', 6, BI.head); }
  if (H.sides) for (const s of [1, -1]) add(blobG(6, 1), HM(s * hr * 0.92, hr * 0.12, -hr * 0.3, hr * 0.26, hr * 0.32, hr * 0.5), hcC, 2, BI.head);
  if (H.tail === 'pony') {
    const ty = hc + hr * 0.55, tz = 0.008 - hr * 0.95;
    add(torG(1, 0.35, 5, 12), TM(0, ty, tz - hr * 0.05, hr * 0.15, hr * 0.15, hr * 0.15, 0, 0.3), spec.hair.band || '#c25959', 6, BI.tail);
    add(sphG(10, 8), TM(0, ty - hr * 0.35, tz - hr * 0.22, hr * 0.26, hr * 0.42, hr * 0.24, 0, -0.35), hcC, 2, BI.tail);
    add(sphG(10, 8), TM(0, ty - hr * 0.85, tz - hr * 0.3, hr * 0.2, hr * 0.42, hr * 0.2, 0, -0.1), hcC, 2, BI.tail);
    add(cylG(6, 0), TM(0, ty - hr * 1.45, tz - hr * 0.28, hr * 0.16, -hr * 0.45, hr * 0.16), hcC, 2, BI.tail);
  }
  if (H.tail === 'braid') {
    const ty = hc + hr * 0.4, tz = 0.008 - hr * 0.98;
    for (let i = 0; i < 6; i++) add(sphG(8, 6), TM(0, ty - i * hr * 0.32, tz - hr * 0.08 - i * 0.004, hr * (0.2 - i * 0.012), hr * 0.22, hr * (0.18 - i * 0.01)), hcC, 2, BI.tail);
    add(torG(1, 0.35, 5, 10), TM(0, ty - 6 * hr * 0.32 + hr * 0.12, tz - hr * 0.1, hr * 0.12, hr * 0.12, hr * 0.12, 0, Math.PI / 2), spec.hair.band || '#f3c258', 6, BI.tail);
  }
  // chapéus
  const hat = spec.hat;
  if (hat) {
    const hcol = hat.color;
    if (hat.kind === 'cap') {
      add(DOME, HM(0, hr * 0.26, -hr * 0.02, hr * 1.13, hr * 0.8, hr * 1.15), hcol, 6, BI.head);
      add(cylG(16), HM(0, hr * 0.33, hr * 0.92, hr * 0.62, hr * 0.06, hr * 0.56, 0, 0.12), hat.brim || hcol, 7, BI.head);
      add(sphG(6, 4), HM(0, hr * 1.06, -hr * 0.02, hr * 0.1, hr * 0.06, hr * 0.1), hcol, 6, BI.head);
      if (hat.logo) add(GEO.plane, HM(0, hr * 0.62, hr * 1.03, hr * 0.5, hr * 0.5, 1, 0, -0.45), '#ffffff', 7, BI.head, { uv: decLogo() });
    } else if (hat.kind === 'flat') {
      add(DOME, HM(0, hr * 0.32, 0.0, hr * 1.12, hr * 0.56, hr * 1.2), hcol, 6, BI.head);
      add(cylG(14), HM(0, hr * 0.36, hr * 0.86, hr * 0.55, hr * 0.06, hr * 0.42, 0, 0.18), hcol, 7, BI.head);
    } else if (hat.kind === 'bucket') {
      add(cylG(14, 0.86), HM(0, hr * 0.32, 0, hr * 1.1, hr * 0.68, hr * 1.1), hcol, 6, BI.head);
      add(cylG(16, 0.72), HM(0, hr * 0.18, 0, hr * 1.62, hr * 0.2, hr * 1.62), hat.brim || hcol, 7, BI.head);
    } else if (hat.kind === 'hard') {
      add(DOME, HM(0, hr * 0.24, 0, hr * 1.16, hr * 0.98, hr * 1.18), hcol, 6, BI.head);
      add(cylG(16), HM(0, hr * 0.22, hr * 0.06, hr * 1.32, hr * 0.06, hr * 1.36), hcol, 7, BI.head);
      add(GEO.box, HM(0, hr * 1.05, 0, hr * 0.16, hr * 0.18, hr * 1.6), hexMix(hcol, '#ffffff', 0.2), 6, BI.head);
    } else if (hat.kind === 'bandana') {
      add(torG(1, 0.1, 6, 22), HM(0, hr * 0.5, -hr * 0.04, hr * 1.0, hr * 1.0, hr * 1.02, 0, Math.PI / 2 + 0.3), hcol, 6, BI.head);
      add(sphG(8, 6), HM(0, hr * 0.12, -hr * 1.08, hr * 0.16, hr * 0.14, hr * 0.12), hcol, 6, BI.head);
      for (const s of [1, -1]) add(sphG(8, 6), HM(s * hr * 0.12, -hr * 0.12, -hr * 1.1, hr * 0.08, hr * 0.22, hr * 0.06, 0, 0, s * 0.4), hcol, 6, BI.head);
    } else if (hat.kind === 'headset') {
      add(torG(1, 0.05, 4, 18, Math.PI), HM(0, hr * 0.05, 0, hr * 1.14, hr * 1.14, hr * 1.14, Math.PI / 2, 0, 0), '#373f42', 6, BI.head);
      for (const s of [1, -1]) add(cylG(10), HM(s * hr * 1.12, -hr * 0.05, 0, hr * 0.24, hr * 0.12, hr * 0.24, 0, 0, Math.PI / 2), '#373f42', 6, BI.head);
    }
  }
  // ---- objetos na mão (osso 14) e cartaz (osso 15) ----
  const ax = -P.shX, handY = P.shY - P.arm - P.fore - 0.036 * P.ag;
  // matriz no sistema do antebraço já posado (theta = rotação total do braço em x)
  const PM = (theta, ox, oy, oz, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Matrix4().makeTranslation(ax, handY, 0);
    m.multiply(new THREE.Matrix4().makeRotationX(-theta));
    m.multiply(new THREE.Matrix4().compose(new THREE.Vector3(ox, oy, oz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz)));
    return m;
  };
  const prop = spec.prop;
  if (prop === 'phone') { add(GEO.box, PM(-1.85, 0, 0.03, 0.0, 0.05, 0.1, 0.012, 0.3, Math.PI), '#2f3a40', 6, BI.prop); add(GEO.plane, PM(-1.85, 0, 0.03, -0.0065, 0.042, 0.088, 1, 0.3, Math.PI), '#ffffff', 7, BI.prop, { uv: decPhone() }); }
  if (prop === 'mega') {
    add(cylG(12, 0.32, false), PM(-2.5, 0, 0.0, 0.16, 0.13, 0.26, 0.13, -Math.PI / 2), '#f4f4ef', 6, BI.prop);
    add(cylG(12), PM(-2.5, 0, 0.0, 0.295, 0.135, 0.02, 0.135, -Math.PI / 2), '#c25959', 7, BI.prop);
    add(GEO.box, PM(-2.5, 0, -0.06, 0.07, 0.025, 0.09, 0.03), '#373f42', 6, BI.prop);
  }
  if (prop === 'rod') {
    add(cylG(5), PM(-1.3, 0, 0, 0.0, 0.012, 1.9, 0.012, 0.88), '#8e6c4b', 6, BI.prop);
    add(cylG(8), PM(-1.3, 0.03, 0.02, 0.08, 0.035, 0.03, 0.035, 0, 0, Math.PI / 2), '#4b5658', 7, BI.prop);
  }
  if (prop === 'news') {
    add(GEO.box, PM(-2.0, 0.01, 0.16, 0.06, 0.34, 0.24, 0.006), '#efeee6', 6, BI.prop);
    const uv = decNews();
    add(GEO.plane, PM(-2.0, 0.01, 0.16, 0.0635, 0.33, 0.23, 1), '#ffffff', 7, BI.prop, { uv });
    add(GEO.plane, PM(-2.0, 0.01, 0.16, 0.0565, 0.33, 0.23, 1, 0, Math.PI), '#ffffff', 7, BI.prop, { uv });
  }
  if (prop === 'coconut') {
    add(sphG(10, 8), PM(-2.2, 0.0, 0.02, 0.05, 0.075, 0.07, 0.075), '#7fae4f', 6, BI.prop);
    add(cylG(5), PM(-2.2, 0.0, 0.08, 0.06, 0.006, 0.12, 0.006, -0.3), '#f3c258', 7, BI.prop);
    add(cylG(8, 0), PM(-2.2, 0.03, 0.12, 0.05, 0.06, 0.04, 0.06, 0.2), '#de794e', 7, BI.prop);
  }
  if (prop === 'bag') {
    add(GEO.box, PM(0, 0, -0.14, 0.0, 0.17, 0.2, 0.09), '#f4f4ef', 6, BI.prop);
    add(torG(1, 0.12, 4, 10, Math.PI), PM(0, 0, -0.04, 0.0, 0.05, 0.06, 0.05), '#f4f4ef', 6, BI.prop);
    add(blobG(1, 1), PM(0, 0.02, -0.02, 0.0, 0.07, 0.06, 0.06), '#8cc48c', 7, BI.prop);
    add(cylG(6, 0.3), PM(0, -0.04, -0.01, 0.02, 0.025, 0.12, 0.025, 0.3), '#de794e', 7, BI.prop);
  }
  // cartaz da greve: segura acima da cabeça
  {
    const th = -2.95, txt = spec.sign || pickR(STRIKE);
    add(cylG(5), PM(th, 0, -0.05, 0, 0.014, 0.62, 0.014), '#b48d63', 6, BI.sign);
    add(GEO.box, PM(th, 0, 0.5, 0.0, 0.56, 0.32, 0.02), '#f1e6c8', 6, BI.sign);
    const uv = decSign(txt);
    add(GEO.plane, PM(th, 0, 0.5, 0.011, 0.54, 0.3, 1), '#ffffff', 7, BI.sign, { uv });
    add(GEO.plane, PM(th, 0, 0.5, -0.011, 0.54, 0.3, 1, 0, Math.PI), '#ffffff', 7, BI.sign, { uv });
  }
  // ---- malha ----
  const geo = g.build();
  const mat = charMat();
  const mesh = new THREE.SkinnedMesh(geo, mat);
  const skel = new THREE.Skeleton(bones);
  mesh.add(root);
  mesh.bind(skel);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, P.hip, 0), 1.7);
  const rig = new THREE.Group();
  rig.add(mesh);
  bones[BI.sign].scale.setScalar(1e-4);
  if (!prop || prop === 'mega') bones[BI.prop].scale.setScalar(1e-4);
  const ch = {
    spec, P, rig, mesh, bones, mat, slot, height: hc + hr * 1.25, headY: hc,
    st: { t: rand() * 10, speed: 0, phase: rand() * 6, w: 0, run: 0, air: 0, pose: spec.pose || 'stand', act: spec.act || null, actW: 0, look: { yaw: 0, pitch: 0 }, lookT: { yaw: 0, pitch: 0 }, talk: false, mouth: 0, mouthOpen: false, blink: rand() * 3, blinkOn: 0, happy: 0, sleep: false, tired: spec.tired || 0, frame: -1, sign: false, propOn: !!prop && prop !== 'mega', signW: 0, wave: 0 },
    d: new THREE.Vector3(0, 1, 0), fwd: new THREE.Vector3(0, 0, 1), h: 0,
  };
  return ch;
}
function disposeChar(ch) { ch.mesh.geometry.dispose(); ch.mat.dispose(); ch.rig.parent && ch.rig.parent.remove(ch.rig); }
// coloca no planeta
function placeChar(ch, d, fwd, h) {
  ch.d.copy(d); ch.fwd.copy(fwd).addScaledVector(d, -fwd.dot(d)).normalize(); ch.h = h;
  ch.rig.position.copy(d).multiplyScalar(R + h);
  orient(ch.rig, d, ch.fwd);
}
function setFace(ch, k) {
  if (ch.st.frame === k) return;
  ch.st.frame = k; ch.mat.userData.face.value.set(k * FS / FAW, 0);
}

// ---------------- animação procedural ----------------
function poseChar(ch, dt) {
  const st = ch.st, B = ch.bones, P = ch.P;
  st.t += dt;
  const t = st.t;
  for (let i = 0; i < 16; i++) B[i].rotation.set(0, 0, 0);
  B[0].position.set(0, P.hip, 0);
  const kSm = 1 - Math.exp(-dt * 9);
  const wT = clamp(st.speed / WALK, 0, 1), rT = clamp((st.speed - WALK) / (RUN - WALK), 0, 1);
  st.w = lerp(st.w, wT, kSm); st.run = lerp(st.run, rT, kSm);
  const stride = lerp(0.62, 0.92, st.run) * (P.hip / 0.8);
  st.phase += st.speed * dt * Math.PI / stride;
  const w = st.w * (1 - st.air), run = st.run, ph = st.phase, s1 = Math.sin(ph), c1 = Math.cos(ph);
  const tired = st.tired;
  // ---- pose de base ----
  const pose = st.pose;
  if (pose === 'sit' || pose === 'lounge') {
    B[0].position.y = (st.seat ?? 0.46) + 0.06;
    B[0].position.z = -0.02;
    B[7].rotation.x = B[10].rotation.x = -1.5;
    B[8].rotation.x = B[11].rotation.x = pose === 'lounge' ? 0.1 : 1.45;
    B[9].rotation.x = B[12].rotation.x = pose === 'lounge' ? -0.2 : 0.05;
    B[7].rotation.z = 0.06; B[10].rotation.z = -0.06;
    if (pose === 'lounge') { B[1].rotation.x = -0.95; B[2].rotation.x = 0.55; B[0].position.y = (st.seat ?? 0.32) + 0.05; }
    else { B[1].rotation.x = -0.06 + Math.sin(t * 1.6) * 0.012; }
    // mãos no colo
    B[3].rotation.x = B[5].rotation.x = pose === 'lounge' ? -0.5 : -0.38;
    B[4].rotation.x = B[6].rotation.x = pose === 'lounge' ? -0.6 : -0.95;
    B[3].rotation.z = 0.12; B[5].rotation.z = -0.12;
  } else if (pose === 'ground') {
    // sentado no chão, pernas esticadas, mãos apoiadas atrás
    B[0].position.y = 0.115 + (st.seat || 0);
    B[0].position.z = -0.04;
    B[7].rotation.x = -1.45; B[10].rotation.x = -1.56;
    B[8].rotation.x = 0.14; B[11].rotation.x = 0.3;
    B[9].rotation.x = -0.15; B[12].rotation.x = -0.3;
    B[7].rotation.z = 0.16; B[10].rotation.z = -0.12;
    B[1].rotation.x = -0.2 + Math.sin(t * 1.5) * 0.015;
    B[3].rotation.x = B[5].rotation.x = 0.62;
    B[4].rotation.x = B[6].rotation.x = -0.12;
    B[3].rotation.z = 0.22; B[5].rotation.z = -0.22;
  } else {
    // em pé: passinhos curtos, o joelho sobe na passada e o peso troca de um pé para o outro
    const legA = lerp(0.34, 0.6, run) * w, kneeA = lerp(0.95, 1.3, run) * w;
    const swL = Math.max(0, c1), swR = Math.max(0, -c1);
    B[7].rotation.x = -s1 * legA - swL * 0.1 * w; B[10].rotation.x = s1 * legA - swR * 0.1 * w;
    B[8].rotation.x = 0.08 * w + swL * kneeA; B[11].rotation.x = 0.08 * w + swR * kneeA;
    B[9].rotation.x = -(B[7].rotation.x + B[8].rotation.x) * 0.6; B[12].rotation.x = -(B[10].rotation.x + B[11].rotation.x) * 0.6;
    B[0].position.y += (Math.abs(c1) - 0.6) * lerp(0.05, 0.07, run) * w - 0.012 * w - 0.03 * run;
    B[0].position.x = -c1 * 0.012 * w * (1 - run * 0.5);
    B[1].rotation.y = -s1 * 0.12 * w;
    B[1].rotation.z = c1 * 0.035 * w * (1 - run * 0.5);
    B[1].rotation.x = 0.03 * w + run * 0.2 + tired * 0.16 + (P.stoop || 0) + Math.sin(t * 1.7) * 0.012 * (1 - w);
    B[0].rotation.y = s1 * 0.07 * w;
    B[2].rotation.y = s1 * 0.09 * w;
    // braços
    const armA = lerp(0.5, 0.95, run) * w * (1 - tired * 0.5);
    B[3].rotation.x = s1 * armA; B[5].rotation.x = -s1 * armA;
    B[4].rotation.x = -(0.2 + 0.25 * w + run * 0.95) * Math.max(w, 0.35) - 0.08 - Math.max(0, -s1) * 0.25 * w;
    B[6].rotation.x = -(0.2 + 0.25 * w + run * 0.95) * Math.max(w, 0.35) - 0.08 - Math.max(0, s1) * 0.25 * w;
    const sway = Math.sin(t * 1.7) * 0.02 * (1 - w);
    B[3].rotation.z = 0.09 + sway + run * 0.12; B[5].rotation.z = -0.09 - sway - run * 0.12;
    // pulo / queda
    if (st.air > 0.01) {
      const a = st.air, up = st.vy > 0 ? 1 : 0;
      B[7].rotation.x = lerp(B[7].rotation.x, -0.75, a); B[8].rotation.x = lerp(B[8].rotation.x, 1.1, a);
      B[10].rotation.x = lerp(B[10].rotation.x, -0.25 + 0.2 * up, a); B[11].rotation.x = lerp(B[11].rotation.x, 0.55, a);
      B[3].rotation.z = lerp(B[3].rotation.z, 1.0 + up * 0.6, a); B[5].rotation.z = lerp(B[5].rotation.z, -1.0 - up * 0.6, a);
      B[3].rotation.x = lerp(B[3].rotation.x, -0.3, a); B[5].rotation.x = lerp(B[5].rotation.x, -0.3, a);
    }
  }
  // ---- ação da parte de cima ----
  const act = st.act;
  st.actW = lerp(st.actW, act ? 1 : 0, 1 - Math.exp(-dt * 7));
  const aw = st.actW;
  const setA = (i, x, y, z) => { B[i].rotation.x = lerp(B[i].rotation.x, x, aw); B[i].rotation.y = lerp(B[i].rotation.y, y, aw); B[i].rotation.z = lerp(B[i].rotation.z, z, aw); };
  if (act === 'mega') { setA(5, -1.35, 0, 0.42); setA(6, -1.15, 0, 0); setA(3, -0.2, 0, 0.45); setA(4, -0.3, 0, -1.25); B[2].rotation.x += -0.08 * aw; }
  else if (act === 'phone') { setA(5, -1.5, 0, -0.32); setA(6, -0.35, 0, 0); B[2].rotation.x += -0.22 * aw; B[2].rotation.y += -0.15 * aw; setA(3, 0.1, 0, 0.5 + Math.sin(t * 3) * 0.05); setA(4, -0.2, 0, 0); }
  else if (act === 'news') { setA(3, -0.6, 0, -0.32); setA(5, -0.6, 0, 0.32); setA(4, -1.4, 0, 0); setA(6, -1.4, 0, 0); B[2].rotation.x += 0.12 * aw; }
  else if (act === 'fish') { setA(5, -0.75, 0, 0.12); setA(6, -0.55, 0, 0); setA(3, -0.7, 0, -0.2); setA(4, -0.7, 0, 0); B[2].rotation.x += 0.1 * aw; }
  else if (act === 'hips') { setA(3, 0.1, 0, 0.55); setA(4, -0.35, 0, -1.45); setA(5, 0.1, 0, -0.55); setA(6, -0.35, 0, 1.45); }
  else if (act === 'cross') { setA(3, -0.42, 0, -0.18); setA(4, -1.5, 0.2, -0.95); setA(5, -0.42, 0, 0.18); setA(6, -1.5, -0.2, 0.95); }
  else if (act === 'clasp') { setA(3, -0.18, 0, -0.18); setA(4, -0.75, 0, -0.55); setA(5, -0.18, 0, 0.18); setA(6, -0.75, 0, 0.55); }
  else if (act === 'wave') { setA(5, -0.3, 0, -2.5); setA(6, -0.2, 0, -0.5 + Math.sin(t * 11) * 0.45); }
  else if (act === 'cheer') { setA(3, -0.2, 0, 2.6 + Math.sin(t * 9) * 0.15); setA(5, -0.2, 0, -2.6 - Math.sin(t * 9) * 0.15); setA(4, -0.3, 0, 0); setA(6, -0.3, 0, 0); B[0].position.y += Math.abs(Math.sin(t * 6)) * 0.12 * aw; }
  else if (act === 'protest') { setA(5, -2.75 + Math.sin(t * 3.2) * 0.08, 0, 0.1); setA(6, -0.2, 0, 0); setA(3, -0.3, 0, 0.25); setA(4, -0.6, 0, 0); }
  else if (act === 'shrug') { setA(3, -0.3, 0, 0.5); setA(5, -0.3, 0, -0.5); setA(4, -1.2, -0.5, 0.4); setA(6, -1.2, 0.5, -0.4); B[2].rotation.z += 0.12 * aw; }
  else if (act === 'think') { setA(5, -0.5, 0, 0.3); setA(6, -2.2, 0, 0.3); setA(3, -0.35, 0, -0.15); setA(4, -1.2, 0, -0.8); B[2].rotation.z += -0.1 * aw; B[2].rotation.x += -0.1 * aw; }
  else if (act === 'love') { setA(3, -0.6, 0, -0.1); setA(5, -0.6, 0, 0.1); setA(4, -1.9, 0, -0.3); setA(6, -1.9, 0, 0.3); B[2].rotation.z += Math.sin(t * 2) * 0.12 * aw; }
  else if (act === 'angry') { setA(3, 0.15, 0, 0.35); setA(5, 0.15, 0, -0.35); setA(4, -0.4, 0, 0); setA(6, -0.4, 0, 0); B[1].rotation.x += 0.12 * aw; B[0].position.y += Math.max(0, Math.sin(t * 14)) * 0.03 * aw; }
  else if (act === 'sleepy') { B[2].rotation.x += 0.45 * aw; B[2].rotation.z += 0.2 * aw; B[1].rotation.x += 0.15 * aw; }
  else if (act === 'carry') { setA(5, -0.05, 0, -0.22); setA(6, -0.15, 0, 0); }
  else if (act === 'sweat') { setA(3, -0.2, 0, 0.2); setA(4, -2.3, 0, -0.6); B[2].rotation.x += 0.1 * aw; }
  // ---- cabeça: olhar ----
  const L = st.look, LT = st.lookT, kl = 1 - Math.exp(-dt * 5);
  L.yaw = lerp(L.yaw, LT.yaw, kl); L.pitch = lerp(L.pitch, LT.pitch, kl);
  B[2].rotation.y += L.yaw * 0.75; B[1].rotation.y += L.yaw * 0.25;
  B[2].rotation.x += L.pitch + tired * 0.22 + (st.sleep ? 0.35 : 0);
  if (pose !== 'sit' && pose !== 'lounge' && pose !== 'ground') B[2].rotation.x -= (P.stoop || 0) * 0.8;
  // rabo de cavalo
  B[13].rotation.x = 0.1 + Math.sin(ph * 2) * 0.12 * w + run * 0.35 - B[1].rotation.x * 0.6 - B[2].rotation.x * 0.5 + st.air * 0.4;
  B[13].rotation.z = Math.sin(ph) * 0.1 * w + Math.sin(t * 1.3) * 0.03;
  // objetos e cartaz
  const wantSign = st.sign ? 1 : 0;
  st.signW = lerp(st.signW, wantSign, 1 - Math.exp(-dt * 6));
  const ss = st.signW < 0.02 ? 1e-4 : st.signW;
  B[15].scale.setScalar(ss);
  B[14].scale.setScalar(st.propOn && st.signW < 0.5 ? 1 : 1e-4);
  // ---- rosto ----
  let fr = 0;
  st.blink -= dt;
  if (st.blink < 0) { st.blinkOn = 0.12; st.blink = rr(1.8, 4.8); }
  if (st.blinkOn > 0) { st.blinkOn -= dt; fr = 1; }
  if (st.talk) {
    st.mouth -= dt;
    if (st.mouth < 0) { st.mouthOpen = !st.mouthOpen; st.mouth = st.mouthOpen ? rr(0.07, 0.13) : rr(0.05, 0.1); }
    if (st.mouthOpen) fr = 2;
  }
  if (st.happy > 0) { st.happy -= dt; fr = 3; }
  if (st.sleep) fr = 1;
  setFace(ch, fr);
}

// ---------------- bichos: gato e cachorro ----------------
function makePet(kind) {
  const cat = kind === 'cat';
  const g = new Geo(true);
  const fur = cat ? '#e9e2d4' : '#d7a15a', fur2 = cat ? '#c9a67a' : '#f0d2a0';
  const add = (geo, M, color, id, bone, o) => g.add(geo, M, null, Object.assign({ c: C(color), id, bone }, o || {}));
  const s = cat ? 0.82 : 1.0;
  const bodyY = 0.3 * s, legH = 0.24 * s, len = cat ? 0.26 : 0.3;
  const bones = [];
  const mk = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); if (parent) parent.add(b); bones.push(b); return b; };
  const root = mk(null, 0, bodyY, 0);
  const headB = mk(root, 0, 0.1 * s, len * 0.95);
  const tailB = mk(root, 0, 0.04 * s, -len * 0.95);
  const legs = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) legs.push(mk(root, x * 0.07 * s, -0.04 * s, z * len * 0.62));
  // corpo
  add(sphG(14, 10), TM(0, bodyY, 0, 0.13 * s, 0.12 * s, len * 1.05), fur, 3, 0);
  add(sphG(12, 8), TM(0, bodyY - 0.02 * s, len * 0.35, 0.11 * s, 0.1 * s, 0.14 * s), fur2, 4, 0);
  if (cat) for (let i = 0; i < 3; i++) add(sphG(10, 6), TM(0, bodyY + 0.105 * s, -len * 0.4 + i * len * 0.3, 0.06 * s, 0.03 * s, 0.07 * s), '#d29a62', 4, 0);
  // cabeça
  const hr = cat ? 0.13 : 0.14, hy = bodyY + 0.1 * s + 0.06, hz = len * 0.95 + 0.06;
  const HG = headGeos(cat ? 'cat' : 'dog');
  add(HG.head, TM(0, hy, hz, hr, hr, hr), fur, 1, 1);
  const f = cat ? { fur, iris: '#9ccf6a', cat: true } : { fur, mask2: null };
  const slot = faceSheet(f, true);
  add(HG.cap, TM(0, hy, hz, hr, hr, hr), '#ffffff', 1, 1, { uv: slotUV(slot), face: true });
  if (cat) {
    for (const sx of [1, -1]) { add(cylG(4, 0), TM(sx * hr * 0.6, hy + hr * 0.72, hz - hr * 0.1, hr * 0.32, hr * 0.55, hr * 0.22, sx * 0.2, 0, -sx * 0.35), fur, 2, 1); add(cylG(4, 0), TM(sx * hr * 0.6, hy + hr * 0.7, hz - hr * 0.04, hr * 0.18, hr * 0.38, hr * 0.06, sx * 0.2, 0, -sx * 0.35), '#e8a0a8', 6, 1); }
  } else {
    add(sphG(12, 8), TM(0, hy - hr * 0.3, hz + hr * 0.75, hr * 0.5, hr * 0.42, hr * 0.62), fur2, 2, 1);
    add(sphG(8, 6), TM(0, hy - hr * 0.12, hz + hr * 1.32, hr * 0.17, hr * 0.13, hr * 0.12), '#2a2524', 6, 1);
    for (const sx of [1, -1]) add(sphG(10, 6), TM(sx * hr * 0.85, hy + hr * 0.35, hz - hr * 0.1, hr * 0.22, hr * 0.5, hr * 0.32, 0, 0.2, sx * 0.5), hexMix(fur, '#5a3a20', 0.25), 2, 1);
    add(torG(1, 0.18, 5, 14), TM(0, hy - hr * 0.72, hz - hr * 0.35, hr * 0.62, hr * 0.62, hr * 0.62, 0, Math.PI / 2 - 0.3), '#c25959', 6, 1);
  }
  // rabo
  const tl = cat ? 0.36 : 0.22;
  { const tg = taperG(0.03 * s, 0.02 * s, tl); add(tg, TM(0, bodyY + 0.04 * s, -len * 0.95, 1, 1, 1, 0, -0.5), cat ? '#d29a62' : fur, 2, 2); tg.dispose(); }
  // patas
  legs.forEach((lb, i) => {
    const x = (i % 2 ? -1 : 1) * 0.07 * s, z = (i < 2 ? 1 : -1) * len * 0.62;
    const lgG = taperG(0.035 * s, 0.03 * s, legH - 0.02); add(lgG, TM(x, 0.03, z), i < 2 ? fur : fur, 4, 3 + i); lgG.dispose();
    add(sphG(8, 6), TM(x, 0.025, z + 0.015, 0.036 * s, 0.026, 0.045 * s), cat ? '#f4f4ef' : fur2, 5, 3 + i);
  });
  const geo = g.build();
  const mat = charMat();
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.add(root); mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.3, 0), 0.9);
  const rig = new THREE.Group(); rig.add(mesh);
  return { pet: true, cat, rig, mesh, bones, mat, slot, height: hy + hr * 1.6, P: { bodyY, s, len, hy }, st: { t: rand() * 10, speed: 0, phase: 0, w: 0, pose: cat ? 'sleep' : 'stand', look: { yaw: 0, pitch: 0 }, lookT: { yaw: 0, pitch: 0 }, blink: 2, blinkOn: 0, happy: 0, sleep: cat, frame: -1, wag: 0, talk: false, mouth: 0 }, d: new THREE.Vector3(0, 1, 0), fwd: new THREE.Vector3(0, 0, 1), h: 0 };
}
function posePet(ch, dt) {
  const st = ch.st, B = ch.bones, P = ch.P;
  st.t += dt; const t = st.t;
  for (const b of B) b.rotation.set(0, 0, 0);
  B[0].position.set(0, P.bodyY, 0);
  const k = 1 - Math.exp(-dt * 8);
  st.w = lerp(st.w, clamp(st.speed / 3, 0, 1), k);
  st.phase += st.speed * dt * Math.PI / 0.28;
  const s1 = Math.sin(st.phase), w = st.w;
  if (st.pose === 'sleep') {
    B[0].position.y = P.bodyY * 0.55 + Math.sin(t * 1.4) * 0.006;
    for (let i = 0; i < 4; i++) B[3 + i].rotation.x = i < 2 ? -1.45 : 1.45;
    B[1].rotation.x = 0.35; B[1].rotation.y = 0.5; B[1].position.y = 0.04;
    B[2].rotation.y = 1.4; B[2].rotation.x = -1.2;
  } else if (st.pose === 'sit') {
    B[0].rotation.x = -0.55; B[0].position.y = P.bodyY * 0.85;
    B[3].rotation.x = B[4].rotation.x = 0.55; B[5].rotation.x = B[6].rotation.x = -0.9;
    B[1].rotation.x = 0.45;
    B[2].rotation.x = -0.2; B[2].rotation.y = Math.sin(t * (st.wag > 0 ? 18 : 2)) * (st.wag > 0 ? 0.7 : 0.15);
  } else {
    B[3].rotation.x = -s1 * 0.6 * w; B[6].rotation.x = -s1 * 0.6 * w;
    B[4].rotation.x = s1 * 0.6 * w; B[5].rotation.x = s1 * 0.6 * w;
    B[0].position.y += Math.abs(Math.cos(st.phase)) * 0.02 * w;
    B[1].rotation.x = Math.sin(st.phase * 2) * 0.05 * w;
    B[2].rotation.x = -0.35 + Math.sin(t * 2.2) * 0.08;
    B[2].rotation.y = Math.sin(t * (st.wag > 0 ? 18 : 3)) * (st.wag > 0 ? 0.6 : 0.2);
  }
  st.wag = Math.max(0, st.wag - dt);
  const L = st.look, LT = st.lookT, kl = 1 - Math.exp(-dt * 5);
  L.yaw = lerp(L.yaw, LT.yaw, kl); B[1].rotation.y += L.yaw;
  let fr = 0;
  st.blink -= dt; if (st.blink < 0) { st.blinkOn = 0.14; st.blink = rr(2, 5); }
  if (st.blinkOn > 0) { st.blinkOn -= dt; fr = 1; }
  if (st.talk) fr = (Math.floor(t * 6) % 2) ? 2 : 0;
  if (st.happy > 0) { st.happy -= dt; fr = 3; }
  if (st.sleep) fr = 1;
  setFace(ch, fr);
}

// ---------------- pombos da praça (instanciados) ----------------
function pigeonGeo() {
  const g = new Geo(), W = null;
  const a = (geo, M, c, id = 7) => g.add(geo, M, W, { c: C(c), id });
  a(sphG(10, 8), TM(0, 0.11, 0, 0.085, 0.075, 0.13), '#98a2ad');
  a(sphG(10, 8), TM(0, 0.105, 0.06, 0.07, 0.065, 0.08), '#b4a5b6');
  a(sphG(8, 6), TM(0, 0.17, 0.08, 0.05, 0.05, 0.05), '#6fa38f');
  a(sphG(10, 8), TM(0, 0.215, 0.1, 0.045, 0.045, 0.05), '#8b95a1');
  a(cylG(6, 0), TM(0, 0.205, 0.155, 0.014, 0.04, 0.014, 0, Math.PI / 2), '#e9b44c', 6);
  a(GEO.box, TM(0, 0.1, -0.15, 0.07, 0.016, 0.11, 0, 0.25), '#6f7883', 5);
  for (const s of [1, -1]) {
    a(sphG(8, 6), TM(s * 0.07, 0.12, -0.02, 0.03, 0.06, 0.11), '#7c8691', 5);
    a(cylG(4), TM(s * 0.025, 0.0, 0.02, 0.008, 0.06, 0.008), '#d77a6a', 6);
  }
  return g.build();
}
