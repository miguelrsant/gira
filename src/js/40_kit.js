// ================= kit de construção =================
// contexto de um objeto colocado no planeta: matriz local (x direita, y cima, z frente)
function placeDir(d, fwd, o = {}) {
  const up = d.clone().normalize();
  const h = o.h !== undefined ? o.h : H(up);
  const pos = up.clone().multiplyScalar(R + h + (o.lift || 0));
  const W = frameMatrix(pos, up, fwd, new THREE.Matrix4());
  return { W, d: up, fwd: fwd.clone().addScaledVector(up, -fwd.dot(up)).normalize(), h, ch: chunkOf(up), layer: o.layer || 'main' };
}
function placeAt(lat, lon, heading, o = {}) { const d = dirOf(lat, lon); return placeDir(d, headingVec(d, heading), o); }
// sub-contexto deslocado dentro de outro objeto
function subCtx(c, x, y, z, ry = 0) {
  const L = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Y, ry), new THREE.Vector3(1, 1, 1));
  return Object.assign({}, c, { W: c.W.clone().multiply(L) });
}
// ponto do mundo a partir de coordenadas locais
function ctxPoint(c, x, y, z, out = new THREE.Vector3()) { return out.set(x, y, z).applyMatrix4(c.W); }
function ctxDir(c, x, z) { const p = ctxPoint(c, x, 0, z); return p.normalize(); }
function G(c, o) { return chunkGeo(c.ch, (o && o.layer) || c.layer); }

// prisma (telhado de duas águas): cumeeira ao longo de x, base em y = 0, largura total em z
const PRISM = (() => {
  const g = new THREE.BufferGeometry();
  const P = [], N = [], UV = [];
  const tri = (a, b, c) => {
    const ab = new THREE.Vector3().subVectors(b, a), ac = new THREE.Vector3().subVectors(c, a), n = ab.cross(ac).normalize();
    for (const p of [a, b, c]) { P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z); UV.push(p.x + 0.5, p.y); }
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const A = v(-0.5, 0, 0.5), B = v(0.5, 0, 0.5), Cc = v(0.5, 1, 0), D = v(-0.5, 1, 0), E = v(-0.5, 0, -0.5), F = v(0.5, 0, -0.5);
  tri(A, B, Cc); tri(A, Cc, D);           // água da frente
  tri(F, E, D); tri(F, D, Cc);            // água de trás
  tri(B, F, Cc); tri(E, A, D);            // empenas
  tri(A, E, F); tri(A, F, B);             // base
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  return g;
})();

const K = {
  box(c, x, y, z, w, h, d, color, o = {}) { G(c, o).add(GEO.box, TM(x, y + h / 2, z, w, h, d, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: C(color), pat: o.pat, id: o.id ?? 4, ps: o.ps, uv: o.uv, sway: o.sway, swayH: o.swayH }); },
  // caixa pelo centro (para peças giradas)
  boxc(c, x, y, z, w, h, d, color, o = {}) { G(c, o).add(GEO.box, TM(x, y, z, w, h, d, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: C(color), pat: o.pat, id: o.id ?? 5, uv: o.uv, sway: o.sway, swayH: o.swayH }); },
  cyl(c, x, y, z, r, h, color, o = {}) {
    const g = cylG(o.n || 10, o.top ?? 1, o.open);
    const M = o.center ? TM(x, y, z, r, h, o.rz2 ? r * o.rz2 : r, o.ry || 0, o.rx || 0, o.rz || 0) : TM(x, y + h / 2, z, r, h, o.rz2 ? r * o.rz2 : r, o.ry || 0, o.rx || 0, o.rz || 0);
    G(c, o).add(g, M, c.W, { c: o.cf ? null : C(color), cf: o.cf, id: o.id ?? 5, pat: o.pat, sway: o.sway, swayH: o.swayH, uv: o.uv });
  },
  sph(c, x, y, z, rx, ry, rz, color, o = {}) { G(c, o).add(o.geo || sphG(o.w || 12, o.h || 8), TM(x, y, z, rx, ry, rz, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: o.cf ? null : C(color), cf: o.cf, id: o.id ?? 7, sway: o.sway, swayH: o.swayH }); },
  blob(c, x, y, z, sx, sy, sz, cf, o = {}) { G(c, Object.assign({ layer: 'fol' }, o)).add(blobG(o.seed ?? Math.floor(rand() * 6), o.det ?? (LOW ? 1 : 2)), TM(x, y, z, sx, sy, sz, o.ry ?? rand() * 6, 0, 0), c.W, { cf, id: o.id ?? 7, sway: o.sway ?? 1, swayH: o.swayH || 3 }); },
  pl(c, x, y, z, w, h, uv, o = {}) { G(c, o).add(GEO.plane, TM(x, y, z, w, h, 1, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: C(o.c || '#ffffff'), uv, id: o.id ?? 6 }); },
  // plano texturizado com moldura em caixa (placas)
  board(c, x, y, z, w, h, uv, o = {}) {
    K.box(c, x, y - h / 2 - 0.03, z - 0.05, w + 0.08, h + 0.06, 0.08, o.frame || '#4b5658', { id: 5, ry: o.ry, layer: o.layer });
    const dz = 0.006;
    if (o.ry) { const s = Math.sin(o.ry), co = Math.cos(o.ry); K.pl(c, x + s * dz, y, z + co * dz, w, h, uv, o); }
    else K.pl(c, x, y, z + dz, w, h, uv, o);
  },
  prism(c, x, y, z, w, h, d, color, o = {}) { G(c, o).add(PRISM, TM(x, y, z, w, h, d, o.ry || 0), c.W, { c: C(color), pat: o.pat, id: o.id ?? 5, ps: o.ps }); },
  tor(c, x, y, z, r, t, color, o = {}) { G(c, o).add(torG(1, t / r, o.rs || 6, o.ts || 18, o.arc || Math.PI * 2), TM(x, y, z, r, r, r, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: C(color), id: o.id ?? 5 }); },
};

// ================= peças de fachada =================
const WALLS = ['#e3d7c0', '#d9c7b8', '#c4cdc5', '#e8c9b4', '#f0dcae', '#bcc7c0', '#e6e1d3', '#a9c2b1', '#dcb9a8', '#cfd8d6', '#efd0a0', '#c8d3b8'];
const HOUSEW = ['#f0d3a8', '#e8b9a9', '#a9d1c4', '#f3e1b0', '#c9dcae', '#f4f4ef', '#bcd4e6', '#e6c3d0', '#f0c98f', '#d4e4c0'];
const ROOFS = ['#c4734f', '#b5654a', '#8f9b96', '#a85d4a', '#c98a5e', '#6f8a8e'];
function addWindow(c, x, y, z, kind, o = {}) {
  const w = o.w || 0.82, h = o.h || 1.05, ry = o.ry || 0;
  K.pl(c, x + Math.sin(ry) * 0.012, y + h / 2, z + Math.cos(ry) * 0.012, w, h, texWin(kind, o.frame), { ry, id: 6 });
  if (ry) return;
  K.box(c, x, y - 0.09, z + 0.04, w + 0.18, 0.09, 0.16, o.sill || '#e9e6dc', { id: 5 });
  if (o.shut) { K.box(c, x - w / 2 - 0.16, y - 0.02, z + 0.03, 0.26, h + 0.04, 0.05, o.shut, { id: 5, pat: 7 }); K.box(c, x + w / 2 + 0.16, y - 0.02, z + 0.03, 0.26, h + 0.04, 0.05, o.shut, { id: 5, pat: 7 }); }
  if (o.lintel) K.box(c, x, y + h + 0.02, z + 0.03, w + 0.14, 0.1, 0.08, o.sill || '#e9e6dc', { id: 5 });
}
function addAC(c, x, y, z) {
  K.box(c, x, y, z + 0.18, 0.58, 0.42, 0.34, '#e4e7e0', { id: 5, layer: 'small' });
  K.cyl(c, x - 0.05, y + 0.21, z + 0.355, 0.13, 0.01, '#9aa39e', { rx: Math.PI / 2, center: true, n: 10, layer: 'small' });
  K.cyl(c, x + 0.2, y - 0.4, z + 0.08, 0.015, 0.4, '#8d9792', { n: 4, layer: 'small' });
}
function addTank(c, x, y, z, s = 1) {
  K.box(c, x, y, z, 1.1 * s, 0.25, 1.1 * s, '#b9bdb4', { id: 5 });
  K.cyl(c, x, y + 0.25, z, 0.5 * s, 0.68 * s, '#4f86b8', { n: 14, top: 0.94 });
  K.cyl(c, x, y + 0.25 + 0.68 * s, z, 0.5 * s, 0.1, '#5d95c6', { n: 14, top: 0.7 });
}
function addAntenna(c, x, y, z) {
  K.cyl(c, x, y, z, 0.03, 1.8, '#7d8a88', { n: 4, layer: 'small' });
  for (let i = 0; i < 3; i++) K.boxc(c, x, y + 1.1 + i * 0.22, z, 0.7 - i * 0.15, 0.03, 0.03, '#7d8a88', { layer: 'small' });
}
function addDish(c, x, y, z, ry = 0) {
  K.cyl(c, x, y, z, 0.03, 0.5, '#8d9792', { n: 4, layer: 'small' });
  K.sph(c, x, y + 0.55, z, 0.34, 0.34, 0.12, '#e9ebe4', { geo: DOME, rx: -1.2, ry, id: 5, layer: 'small' });
}
function addSolar(c, x, y, z) {
  K.box(c, x, y, z, 1.2, 0.08, 0.8, '#3d5a73', { rx: -0.45, id: 6, layer: 'small' });
  K.box(c, x, y - 0.25, z + 0.25, 0.06, 0.4, 0.06, '#8d9792', { layer: 'small' });
}
function addPipe(c, x, y, z, h) { K.cyl(c, x, y, z, 0.05, h, '#8d9792', { n: 6, layer: 'small', id: 5 }); }
function addPoster(c, x, y, z, kind, ry = 0) { K.pl(c, x, y, z + 0.014, 0.55, 0.75, texPoster(kind), { ry, id: 6 }); }
function addRailing(c, x0, x1, y, z, h = 0.8, color = '#4b5658') {
  const n = Math.max(2, Math.round((x1 - x0) / 0.24));
  for (let i = 0; i <= n; i++) K.box(c, lerp(x0, x1, i / n), y, z, 0.035, h, 0.035, color, { id: 5, layer: 'small' });
  K.box(c, (x0 + x1) / 2, y + h, z, x1 - x0 + 0.05, 0.06, 0.06, color, { id: 5, layer: 'small' });
}

// ================= construções =================
// comércio com apartamentos em cima (frente em +z)
function bShop(c, s) {
  const w = s.w, d = s.d, fl = s.fl ?? 1, g0 = 3.0, gf = 2.35, Ht = g0 + fl * gf;
  const wall = s.wall || pickR(WALLS), trim = s.trim || '#eeebe1', zf = d / 2;
  K.box(c, 0, -1.1, 0, w + 0.12, 1.26, d + 0.12, '#a3a8a0', { pat: 2, id: 5 });
  K.box(c, 0, 0.16, 0, w, Ht - 0.16, d, wall, { pat: s.pat ?? 8, id: 4 });
  K.box(c, 0, 0.16, zf - 0.01, w + 0.04, 0.5, 0.06, s.base || '#8f9b96', { pat: 6, id: 5 });
  K.box(c, 0, g0 - 0.08, 0, w + 0.14, 0.17, d + 0.14, trim, { id: 5 });
  for (let f = 1; f < fl; f++) K.box(c, 0, g0 + f * gf - 0.05, 0, w + 0.06, 0.1, d + 0.06, trim, { id: 5 });
  K.box(c, 0, Ht, 0, w + 0.22, 0.2, d + 0.22, trim, { id: 5 });
  K.box(c, 0, Ht + 0.2, 0, w - 0.1, 0.06, d - 0.1, '#9aa29d', { id: 5, pat: 6 });
  for (const [x, z, ww, dd] of [[0, zf - 0.07, w + 0.22, 0.14], [0, -zf + 0.07, w + 0.22, 0.14], [w / 2 - 0.07, 0, 0.14, d], [-w / 2 + 0.07, 0, 0.14, d]]) K.box(c, x, Ht + 0.2, z, ww, 0.5, dd, wall, { id: 4, pat: 8 });
  // térreo
  const sfW = Math.min(w - 1.3, 3.6), sfX = -(w - sfW) / 2 + 0.35;
  if (s.front === 'glass') K.pl(c, sfX, 1.3, zf + 0.012, sfW, 2.0, texShopWin(s.goods || 'market'), { id: 6 });
  else K.pl(c, sfX, 1.35, zf + 0.012, sfW, 2.2, texShutter(s.shutter ?? 0, s.shutterC || '#a7b2ad'), { id: 6 });
  const dx = sfX + sfW / 2 + 0.6;
  if (dx + 0.45 < w / 2) K.pl(c, dx, 1.27, zf + 0.012, 0.86, 2.15, texDoor(s.front === 'glass' ? 'glass' : 'metal', s.doorC || '#7f8f8a'), { id: 6 });
  if (s.sign) K.board(c, 0, 2.62, zf + 0.12, Math.min(w - 0.3, 4.4), 0.62, texSign(s.sign, s.signBg || '#f3c258', s.signFg || '#f4f4ef', { font: s.signFont }), { frame: s.signFrame });
  if (s.awning) {
    const dep = 1.05, a = 0.38;
    K.boxc(c, 0, 2.28 - Math.sin(a) * dep / 2, zf + Math.cos(a) * dep / 2, w * 0.92, 0.05, dep, '#ffffff', { rx: a, uv: texAwning(s.awning[0], s.awning[1]), id: 6 });
    K.boxc(c, 0, 2.28 - Math.sin(a) * dep - 0.11, zf + Math.cos(a) * dep + 0.01, w * 0.92, 0.22, 0.03, '#ffffff', { uv: texStripes(s.awning[0], s.awning[1], 12), id: 6 });
  }
  if (s.posters) for (let i = 0; i < s.posters.length; i++) addPoster(c, w / 2 - 0.45 - i * 0.62, 1.55, zf, s.posters[i]);
  // andares de cima
  const wk = s.win || pickR(WIN_KINDS), n = Math.max(1, Math.floor((w - 0.5) / 1.45));
  for (let f = 0; f < fl; f++) {
    const y0 = g0 + f * gf + 0.55;
    const balc = s.balcony && f === 0;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (w / n);
      addWindow(c, x, y0, zf, (i + f) % 3 === 2 ? pickR(WIN_KINDS) : wk, { lintel: true });
      if (!balc && rand() < 0.3) addAC(c, x + 0.62, y0 - 0.1, zf);
    }
    if (balc) {
      K.box(c, 0, y0 - 0.62, zf + 0.42, w * 0.7, 0.13, 0.84, trim, { id: 5 });
      addRailing(c, -w * 0.35 + 0.05, w * 0.35 - 0.05, y0 - 0.49, zf + 0.8);
      if (rand() < 0.6) for (let k = 0; k < 3; k++) K.box(c, -w * 0.2 + k * 0.42, y0 - 0.1, zf + 0.84, 0.32, 0.42, 0.015, pickR(['#f4f4ef', '#66bde6', '#e7a58c', '#f3c258']), { id: 7, layer: 'small' });
    }
    if (d > 3.2) for (const sx of [-1, 1]) addWindow(c, sx * (w / 2), y0, 0, wk, { ry: sx * Math.PI / 2 });
  }
  addPipe(c, w / 2 - 0.12, 0, zf + 0.06, Ht);
  // telhado
  if (s.tank !== false && rand() < 0.75) addTank(c, rr(-w / 4, w / 4), Ht + 0.26, -d / 4, rr(0.85, 1.1));
  if (rand() < 0.5) addAntenna(c, -w / 2 + 0.6, Ht + 0.26, -d / 2 + 0.6);
  if (rand() < 0.4) addDish(c, w / 2 - 0.6, Ht + 0.26, d / 2 - 0.7, rand() * 6);
  if (rand() < 0.35) addSolar(c, 0, Ht + 0.6, d / 2 - 0.9);
  if (rand() < 0.35) K.box(c, -w / 4, Ht + 0.26, d / 4, 1.1, 1.05, 1.1, wall, { id: 4, pat: 8 });
  return Ht;
}
// casa com telhado de duas águas, muro e jardim
function bHouse(c, s) {
  const w = s.w, d = s.d, fl = s.fl ?? 1, fh = 2.55, Ht = 0.3 + fl * fh, zf = d / 2;
  const wall = s.wall || pickR(HOUSEW), roof = s.roof || pickR(ROOFS), trim = '#f1eee4';
  K.box(c, 0, -1.0, 0, w + 0.1, 1.3, d + 0.1, '#aeb1a6', { pat: 2, id: 5 });
  K.box(c, 0, 0.3, 0, w, Ht - 0.3, d, wall, { pat: s.pat ?? pickR([8, 8, 1, 7]), id: 4 });
  K.box(c, 0, Ht - 0.12, 0, w + 0.16, 0.14, d + 0.16, trim, { id: 5 });
  const ov = 0.32, rh = Math.min(1.7, Math.max(w, d) * 0.3);
  if (s.ridgeZ) K.prism(c, 0, Ht, 0, d + ov * 2, rh, w + ov * 2, roof, { pat: 5, id: 3, ry: Math.PI / 2 });
  else K.prism(c, 0, Ht, 0, w + ov * 2, rh, d + ov * 2, roof, { pat: 5, id: 3 });
  // porta, alpendre e janelas
  const doorX = s.doorX ?? (w > 4.2 ? -w / 2 + 1.1 : 0);
  K.pl(c, doorX, 0.3 + 1.0, zf + 0.012, 0.9, 2.0, texDoor('wood', s.doorC || pickR(['#8a6a4f', '#5a8f73', '#4f86b8', '#c25959'])), { id: 6 });
  K.box(c, doorX, 0, zf + 0.4, 1.5, 0.3, 0.8, '#c9cdc2', { id: 5, pat: 6 });
  K.box(c, doorX, -0.1, zf + 0.95, 1.2, 0.15, 0.35, '#c9cdc2', { id: 5 });
  K.box(c, doorX, 2.5, zf + 0.35, 1.45, 0.1, 0.75, trim, { id: 5 });
  const shut = rand() < 0.5 ? pickR(['#5a8f73', '#4f86b8', '#c25959', '#8a6a4f', '#f3c258']) : null;
  const wk = s.win || pickR(['glass', 'curtain', 'grille', 'curtain2', 'blind']);
  for (let f = 0; f < fl; f++) {
    const y0 = 0.3 + f * fh + 0.9;
    const xs = f === 0 ? (w > 4.2 ? [0.4, w / 2 - 0.9] : [w / 2 - 0.85]) : [-w / 4, w / 4];
    for (const x of xs) if (Math.abs(x - doorX) > 0.9 || f > 0) addWindow(c, x, y0, zf, wk, { shut, w: 0.8, h: 1.0 });
    for (const sx of [-1, 1]) if (d > 3) addWindow(c, sx * w / 2, y0, 0, wk, { ry: sx * Math.PI / 2, w: 0.8, h: 1.0 });
  }
  // muro baixo com portão
  if (s.yard) {
    const yz = zf + s.yard, mw = s.lotW || w + 0.8, mc = s.murC || pickR(['#e9e6dc', wall, '#d8d3c4']);
    const gx = doorX, gw = 1.1;
    const segs = [[-mw / 2, gx - gw / 2], [gx + gw / 2, mw / 2]];
    for (const [a, b] of segs) if (b - a > 0.1) {
      K.box(c, (a + b) / 2, -0.3, yz, b - a, 1.25, 0.18, mc, { id: 4, pat: 8 });
      K.box(c, (a + b) / 2, 0.95, yz, b - a + 0.04, 0.07, 0.24, '#c9cdc2', { id: 5 });
    }
    for (const x of [gx - gw / 2 - 0.12, gx + gw / 2 + 0.12]) K.box(c, x, -0.3, yz, 0.26, 1.45, 0.26, mc, { id: 4 });
    K.pl(c, gx, 0.45, yz + 0.01, gw, 0.95, texDoor('gate', '#4b5658'), { id: 6 });
    for (const sx of [-1, 1]) K.box(c, sx * mw / 2, -0.3, (zf + yz) / 2, 0.18, 1.25, s.yard, mc, { id: 4, pat: 8 });
    if (rand() < 0.8) bush(c, mw / 2 - 0.6, yz - 0.6, rr(0.5, 0.8));
    if (rand() < 0.5) flowers(c, -mw / 2 + 0.7, yz - 0.5);
    if (rand() < 0.3) K.box(c, mw / 2 - 0.35, 0.95, yz + 0.05, 0.3, 0.35, 0.22, '#c25959', { id: 7, layer: 'small' });
  }
  // caixa d'água e antena
  if (rand() < 0.7) addTank(c, w / 2 - 0.5, Ht + rh * 0.4, -d / 2 + 0.6, 0.8);
  else if (rand() < 0.5) addDish(c, -w / 2 + 0.5, Ht, d / 2 - 0.2, 0.6);
  return Ht + rh;
}
// sede da GIRA S.A.
function bTower(c, s) {
  const w = s.w || 7, d = s.d || 7, nf = s.floors || 6, g0 = 3.6, fh = 2.6, Ht = g0 + nf * fh, zf = d / 2;
  K.box(c, 0, -1.1, 0, w + 0.2, 1.3, d + 0.2, '#9aa19a', { pat: 2, id: 5 });
  K.box(c, 0, 0.2, 0, w, Ht - 0.2, d, '#c7cfcb', { id: 4, pat: 8 });
  K.box(c, 0, 0.2, zf - 0.2, w + 0.3, 0.2, 2.2, '#9fa8a3', { id: 5 });
  K.pl(c, 0, 1.5, zf + 0.012, w - 1.6, 2.6, texOffice(), { id: 6 });
  K.pl(c, 0, 1.25, zf + 0.02, 1.6, 2.1, texDoor('glass', '#5d6a6b'), { id: 6 });
  for (const x of [-w / 2 + 0.4, w / 2 - 0.4]) K.cyl(c, x, 0.2, zf + 0.9, 0.22, g0 - 0.2, '#e9e6dc', { n: 12, id: 5 });
  K.box(c, 0, g0 - 0.25, zf + 0.5, w + 0.2, 0.25, 1.5, '#e9e6dc', { id: 5 });
  K.board(c, 0, g0 + 0.55, zf + 0.25, 4.8, 0.95, texSign('GIRA S.A.', '#de794e', '#f4f4ef'), {});
  for (let f = 0; f < nf; f++) {
    const y = g0 + f * fh + 0.35;
    for (const [ry, xx, zz, ww] of [[0, 0, zf, w], [Math.PI, 0, -zf, w], [Math.PI / 2, w / 2, 0, d], [-Math.PI / 2, -w / 2, 0, d]]) {
      const s1 = Math.sin(ry), c1 = Math.cos(ry);
      K.pl(c, xx + s1 * 0.012, y + 1.0, zz + c1 * 0.012, ww - 0.6, 1.9, texOffice(), { ry, id: 6 });
    }
    K.box(c, 0, y - 0.3, 0, w + 0.1, 0.12, d + 0.1, '#e9e6dc', { id: 5 });
  }
  K.box(c, 0, Ht - 0.6, 0, w + 0.14, 0.6, d + 0.14, '#de794e', { id: 5 });
  K.box(c, 0, Ht, 0, w + 0.2, 0.25, d + 0.2, '#e9e6dc', { id: 5 });
  // faixas na fachada
  K.pl(c, -w / 2 + 0.55, g0 + 4.4, zf + 0.06, 0.7, 2.8, texBanner('SOMOS UMA FAMÍLIA', '#f3c258', '#f4f4ef'), { id: 6 });
  K.pl(c, w / 2 - 0.55, g0 + 4.4, zf + 0.06, 0.7, 2.8, texBanner('META: 1 VOLTA/DIA', '#66bde6', '#f4f4ef'), { id: 6 });
  K.cyl(c, w / 4, Ht + 0.25, -d / 4, 0.06, 4.5, '#8d9792', { n: 5 });
  K.sph(c, w / 4, Ht + 4.8, -d / 4, 0.14, 0.14, 0.14, '#c25959', { id: 5 });
  for (let i = 0; i < 3; i++) addAC(c, -w / 2 + 1 + i * 1.2, Ht + 0.35, -d / 2 + 0.6);
  return Ht;
}
// galpão da fábrica
function bWarehouse(c, s) {
  const w = s.w || 12, d = s.d || 9, h = s.h || 6, zf = d / 2;
  K.box(c, 0, -1.0, 0, w + 0.2, 1.2, d + 0.2, '#9aa19a', { pat: 2, id: 5 });
  K.box(c, 0, 0.2, 0, w, h, d, s.wall || '#9fb3a9', { pat: 4, id: 4 });
  K.box(c, 0, 0.2, zf - 0.02, w + 0.04, 1.2, 0.08, '#6f8a8e', { id: 5, pat: 4 });
  const n = 3;
  for (let i = 0; i < n; i++) K.prism(c, 0, h + 0.2, -d / 2 + (i + 0.5) * d / n, w + 0.3, 1.3, d / n, '#7d8f8a', { pat: 4, id: 3 });
  K.pl(c, -w / 4, 1.95, zf + 0.012, 3.4, 3.5, texShutter(3, '#c9b183'), { id: 6 });
  K.pl(c, w / 4, 1.95, zf + 0.012, 3.4, 3.5, texShutter(2, '#c9b183'), { id: 6 });
  for (let i = 0; i < 5; i++) K.pl(c, -w / 2 + 1.2 + i * (w - 2.4) / 4, h - 0.7, zf + 0.012, 1.4, 0.8, texWin('glass'), { id: 6 });
  if (s.sign) K.board(c, 0, h + 1.1, zf + 0.15, Math.min(w - 1, 7.5), 0.95, texSign(s.sign, '#373f42', '#f3c258'), { frame: '#2f3a40' });
  if (s.graffiti) K.pl(c, 0, 4.15, zf + 0.014, 4.2, 1.4, texGraffiti(s.graffiti, '#c25959'), { id: 6 });
  for (let i = 0; i < 4; i++) K.cyl(c, w / 2 + 0.25, 1.2 + i * 1.1, -d / 2 + 1, 0.12, d - 2, i % 2 ? '#b07c5c' : '#8d9792', { rx: Math.PI / 2, center: true, n: 8 });
  return h;
}
function chimney(c, x, z, h = 10, r = 0.55) {
  const segs = 6;
  for (let i = 0; i < segs; i++) K.cyl(c, x, i * h / segs, z, r * (1 - i * 0.05), h / segs + 0.01, i % 2 ? '#f4f4ef' : '#c25959', { n: 12, top: (1 - (i + 1) * 0.05) / (1 - i * 0.05), id: 5 });
  K.cyl(c, x, h, z, r * 0.78, 0.25, '#4b5658', { n: 12, id: 5 });
}
function bSchool(c, s) {
  const w = 13, d = 5.5, fh = 2.8, Ht = 0.3 + 2 * fh, zf = d / 2;
  K.box(c, 0, -1.0, 0, w + 0.1, 1.3, d + 0.1, '#aeb1a6', { pat: 2, id: 5 });
  K.box(c, 0, 0.3, 0, w, Ht - 0.3, d, '#efe0b9', { pat: 8, id: 4 });
  K.box(c, 0, 0.3, zf - 0.01, w + 0.04, 1.0, 0.06, '#66bde6', { id: 5 });
  K.box(c, 0, Ht, 0, w + 0.3, 0.3, d + 0.3, '#e9e6dc', { id: 5 });
  K.prism(c, 0, Ht + 0.3, 0, w + 0.5, 1.1, d + 0.6, '#b5654a', { pat: 5, id: 3 });
  for (let f = 0; f < 2; f++) for (let i = 0; i < 7; i++) {
    const x = -w / 2 + 1 + i * (w - 2) / 6;
    if (f === 0 && i === 3) continue;
    addWindow(c, x, 0.3 + f * fh + 0.85, zf, f ? 'blind' : 'glass', { w: 1.0, h: 1.2 });
  }
  K.pl(c, 0, 1.4, zf + 0.012, 1.5, 2.2, texDoor('glass', '#4f86b8'), { id: 6 });
  K.box(c, 0, 2.6, zf + 0.6, 2.4, 0.12, 1.2, '#e9e6dc', { id: 5 });
  for (const x of [-1.1, 1.1]) K.cyl(c, x, 0.3, zf + 1.1, 0.08, 2.3, '#e9e6dc', { n: 8 });
  K.board(c, 0, Ht - 0.55, zf + 0.15, 7.2, 0.62, texSign('ESCOLA ESTADUAL GALILEU GALILEI', '#4f86b8', '#f4f4ef', { font: 'lbl' }), {});
  return Ht;
}
function bMansion(c) {
  const w = 10, d = 7, fh = 3.1, Ht = 0.6 + 2 * fh, zf = d / 2;
  K.box(c, 0, -0.9, 0, w + 0.6, 1.5, d + 0.6, '#dfe2d9', { pat: 6, id: 5 });
  K.box(c, 0, 0.6, 0, w, Ht - 0.6, d, '#f7f5ee', { id: 4, pat: 8 });
  K.box(c, 0, 0.6 + fh - 0.1, 0, w + 0.2, 0.2, d + 0.2, '#e5c27a', { id: 5 });
  K.box(c, 0, Ht, 0, w + 0.4, 0.25, d + 0.4, '#e5c27a', { id: 5 });
  K.prism(c, 0, Ht + 0.25, 0, w + 1.0, 2.0, d + 1.0, '#c25959', { pat: 5, id: 3 });
  for (let i = 0; i < 4; i++) K.cyl(c, -w / 2 + 1.4 + i * (w - 2.8) / 3, 0.6, zf + 1.3, 0.24, fh * 2 - 0.3, '#f7f5ee', { n: 14, id: 5 });
  K.box(c, 0, 0.6 + fh * 2 - 0.3, zf + 0.8, w - 1.6, 0.3, 1.8, '#e5c27a', { id: 5 });
  K.box(c, 0, 0.6 + fh, zf + 0.9, w - 1.6, 0.16, 1.8, '#f7f5ee', { id: 5 });
  addRailing(c, -w / 2 + 0.9, w / 2 - 0.9, 0.6 + fh + 0.16, zf + 1.75, 0.85, '#e5c27a');
  for (let f = 0; f < 2; f++) for (let i = 0; i < 4; i++) addWindow(c, -w / 2 + 1.4 + i * (w - 2.8) / 3, 0.6 + f * fh + 0.8, zf, 'curtain2', { w: 1.1, h: 1.6, frame: '#f2e6c4', sill: '#e5c27a' });
  K.pl(c, 0, 0.6 + 1.25, zf + 0.02, 1.7, 2.4, texDoor('wood', '#8a5a3f'), { id: 6 });
  for (let i = 0; i < 4; i++) K.box(c, 0, 0.6 - i * 0.2 - 0.2, zf + 0.5 + i * 0.32, 3.4 + i * 0.4, 0.2, 0.34, '#dfe2d9', { id: 5, pat: 6 });
  for (const sx of [-1, 1]) for (let f = 0; f < 2; f++) addWindow(c, sx * w / 2, 0.6 + f * fh + 0.8, 0, 'curtain2', { ry: sx * Math.PI / 2, w: 1.1, h: 1.6, frame: '#f2e6c4' });
  return Ht;
}
function bKiosk(c, s) {
  // banca de jornal
  const w = 2.6, d = 1.8;
  K.box(c, 0, 0, 0, w, 2.3, d, '#5a8f73', { id: 4, pat: 4 });
  K.box(c, 0, 2.3, 0, w + 0.6, 0.16, d + 0.8, '#4b7a62', { id: 5 });
  K.box(c, 0, 0.8, d / 2 + 0.3, w - 0.2, 0.12, 0.6, '#e9e6dc', { id: 5 });
  for (let i = 0; i < 4; i++) K.pl(c, -w / 2 + 0.4 + i * 0.6, 1.5, d / 2 + 0.012, 0.5, 0.38, texNews(), { id: 6 });
  for (let i = 0; i < 3; i++) K.pl(c, -0.6 + i * 0.6, 0.98, d / 2 + 0.55, 0.5, 0.36, texNews(), { rx: -1.2, id: 6 });
  K.board(c, 0, 2.62, d / 2 + 0.45, 2.2, 0.42, texSign('BANCA DA NEIDE', '#f3c258', '#373f42', { font: 'lbl' }), {});
}
function bBusStop(c) {
  K.box(c, 0, 0, -0.5, 3.0, 0.08, 1.2, '#c9cdc2', { id: 2 });
  for (const x of [-1.4, 1.4]) K.box(c, x, 0, -0.95, 0.08, 2.4, 0.08, '#4b5658', { id: 5 });
  K.box(c, 0, 2.4, -0.5, 3.2, 0.1, 1.4, '#66bde6', { id: 5 });
  K.box(c, 0, 0.45, -0.85, 2.4, 0.08, 0.38, '#b48d63', { id: 3 });
  K.pl(c, 0, 1.5, -1.0, 2.6, 1.6, texPoster('gira'), { id: 6 });
  K.cyl(c, 1.75, 0, 0.1, 0.04, 2.6, '#4b5658', { n: 5 });
  K.board(c, 1.75, 2.35, 0.13, 0.75, 0.5, texSign('ÔNIBUS', '#4f86b8', '#f4f4ef', { font: 'lbl' }), {});
}
function bOrelhao(c) {
  K.cyl(c, 0, 0, 0, 0.05, 1.7, '#4b5658', { n: 5 });
  K.sph(c, 0, 1.95, 0.12, 0.5, 0.62, 0.5, '#f3c258', { geo: DOME, rx: Math.PI * 0.42, id: 5 });
  K.box(c, 0, 1.25, 0.12, 0.26, 0.42, 0.14, '#9aa39e', { id: 6 });
}
function bLifeguard(c) {
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) K.box(c, x, -0.4, z, 0.14, 2.6, 0.14, '#f4f4ef', { id: 5 });
  K.box(c, 0, 2.2, 0, 2.0, 0.12, 2.0, '#b48d63', { id: 3 });
  K.box(c, 0, 2.32, 0, 1.6, 1.3, 1.6, '#c25959', { id: 4, pat: 3 });
  K.pl(c, 0, 3.0, 0.81, 1.0, 0.5, texWin('dark'), { id: 6 });
  K.prism(c, 0, 3.62, 0, 2.0, 0.6, 2.0, '#f4f4ef', { id: 3 });
  for (let i = 0; i < 6; i++) K.box(c, 0, 0.1 + i * 0.35, 1.2 + i * 0.12, 0.8, 0.06, 0.2, '#b48d63', { id: 3, layer: 'small' });
  K.cyl(c, 0.9, 3.6, 0.9, 0.03, 1.6, '#4b5658', { n: 4 });
  K.box(c, 1.2, 4.7, 0.9, 0.6, 0.4, 0.02, '#c25959', { id: 7 });
}
function bBeachKiosk(c, s) {
  K.box(c, 0, 0, 0, 2.6, 1.1, 1.6, '#b48d63', { id: 4, pat: 3 });
  K.box(c, 0, 1.1, 0.3, 2.8, 0.1, 1.3, '#e9e6dc', { id: 5 });
  for (const [x, z] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.85], [1.3, 0.85]]) K.cyl(c, x, 0, z, 0.06, 2.4, '#8e6c4b', { n: 6 });
  K.sph(c, 0, 2.35, 0.05, 2.0, 0.9, 1.5, '#d9c27a', { geo: DOME, id: 3 });
  K.board(c, 0, 1.95, 0.95, 2.2, 0.4, texSign(s.sign || 'QUIOSQUE', '#66bde6', '#f4f4ef', { font: 'lbl' }), {});
}
function bGuardBooth(c) {
  K.box(c, 0, 0, 0, 1.4, 2.3, 1.4, '#e9e6dc', { id: 4, pat: 8 });
  K.box(c, 0, 2.3, 0, 1.7, 0.15, 1.7, '#4b5658', { id: 5 });
  K.pl(c, 0, 1.5, 0.71, 0.9, 0.7, texWin('glass'), { id: 6 });
  K.pl(c, 0.71, 1.5, 0, 0.9, 0.7, texWin('glass'), { id: 6, ry: Math.PI / 2 });
}
function bClockTower(c) {
  const w = 2.4, h = 8.5;
  K.box(c, 0, -0.6, 0, w + 0.8, 1.2, w + 0.8, '#b9b4a4', { pat: 2, id: 5 });
  K.box(c, 0, 0.6, 0, w, h - 0.6, w, '#e0d2b4', { pat: 1, id: 4 });
  K.box(c, 0, h - 2.4, 0, w + 0.3, 0.2, w + 0.3, '#f1eee4', { id: 5 });
  K.box(c, 0, h, 0, w + 0.3, 0.25, w + 0.3, '#f1eee4', { id: 5 });
  K.prism(c, 0, h + 0.25, 0, w + 0.4, 1.6, w + 0.4, '#5a8f73', { id: 3 });
  K.prism(c, 0, h + 0.25, 0, w + 0.4, 1.6, w + 0.4, '#5a8f73', { id: 3, ry: Math.PI / 2 });
  const uv = texClock();
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, s = Math.sin(a), co = Math.cos(a);
    K.pl(c, s * (w / 2 + 0.015), h - 1.2, co * (w / 2 + 0.015), 1.7, 1.7, uv, { ry: a, id: 6 });
  }
  K.pl(c, 0, 1.4, w / 2 + 0.012, 0.9, 1.6, texDoor('wood', '#5a6a5f'), { id: 6 });
  K.board(c, 0, 3.4, w / 2 + 0.1, 1.5, 0.42, texSign('RELÓGIO DA PRAÇA', '#e0d2b4', '#373f42', { font: 'lbl', outline: false }), { frame: '#8a7b5f' });
}
function bStatue(c) {
  K.box(c, 0, 0, 0, 1.8, 0.4, 1.8, '#b9b4a4', { id: 5, pat: 2 });
  K.box(c, 0, 0.4, 0, 1.2, 1.4, 1.2, '#c9c3b1', { id: 4, pat: 2 });
  K.pl(c, 0, 1.05, 0.612, 0.9, 0.42, texSign('AVÔ OTÁVIO\n1952', '#a07c48', '#f3e1b0', { font: 'lbl', w: 256, h: 128 }), { id: 6 });
  const B = '#6f8f7a', y = 1.8;
  K.box(c, -0.12, y, 0.05, 0.16, 0.8, 0.18, B, { id: 7, rx: 0.25 });
  K.box(c, 0.12, y, -0.05, 0.16, 0.8, 0.18, B, { id: 7, rx: -0.25 });
  K.sph(c, 0, y + 1.15, 0, 0.3, 0.42, 0.22, B, { id: 7 });
  K.sph(c, 0, y + 1.72, 0, 0.19, 0.21, 0.19, B, { id: 7 });
  K.cyl(c, 0.3, y + 1.25, 0.15, 0.06, 0.62, B, { id: 7, rz: 2.4, rx: -0.4, center: true, n: 6 });
  K.cyl(c, -0.3, y + 1.0, 0, 0.06, 0.55, B, { id: 7, rz: -0.2, center: true, n: 6 });
  K.cyl(c, 0, y + 1.88, 0, 0.24, 0.05, B, { id: 7, n: 10 });
  K.cyl(c, 0, y + 1.92, 0, 0.14, 0.18, B, { id: 7, n: 10 });
}
function bFountain(c) {
  K.cyl(c, 0, 0, 0, 2.1, 0.55, '#c9c3b1', { n: 22, id: 5 });
  K.cyl(c, 0, 0.1, 0, 1.85, 0.4, '#6fc4c6', { n: 22, id: 7 });
  K.cyl(c, 0, 0.5, 0, 0.35, 0.9, '#c9c3b1', { n: 12, id: 5 });
  K.cyl(c, 0, 1.4, 0, 0.8, 0.2, '#c9c3b1', { n: 16, id: 5, top: 1.15 });
  K.cyl(c, 0, 1.6, 0, 0.12, 0.5, '#c9c3b1', { n: 8, id: 5 });
}
function bPodium(c) {
  K.box(c, 0, 0, 0, 1.5, 0.35, 1.3, '#c25959', { id: 5 });
  K.box(c, 0, 0.35, 0.35, 0.8, 0.85, 0.45, '#a94e4e', { id: 5 });
  K.pl(c, 0, 0.85, 0.58, 0.62, 0.62, texLogo(), { id: 6 });
}

// ================= mobiliário urbano (camada de detalhes) =================
const SM = { layer: 'small' };
function lampPost(c, x, z) {
  K.cyl(c, x, 0, z, 0.07, 3.6, '#4b5658', { n: 6, layer: 'small' });
  K.cyl(c, x, 3.55, z + 0.3, 0.05, 0.7, '#4b5658', { rx: Math.PI / 2, center: true, n: 5, layer: 'small' });
  K.box(c, x, 3.38, z + 0.6, 0.3, 0.14, 0.42, '#4b5658', { layer: 'small' });
  K.box(c, x, 3.33, z + 0.6, 0.22, 0.05, 0.32, '#f6e7b5', { id: 6, layer: 'small' });
}
// poste com fios: devolve o ponto de amarração
function utilPole(c, x, z) {
  K.cyl(c, x, 0, z, 0.11, 6.2, '#8d968f', { n: 7, top: 0.75, layer: 'small' });
  K.boxc(c, x, 5.6, z, 1.5, 0.1, 0.1, '#6f7a74', { layer: 'small' });
  K.boxc(c, x, 5.0, z, 1.1, 0.08, 0.08, '#6f7a74', { layer: 'small' });
  if (rand() < 0.4) K.cyl(c, x + 0.25, 4.3, z + 0.18, 0.2, 0.55, '#9aa39e', { n: 8, layer: 'small' });
  for (const sx of [-0.6, 0, 0.6]) K.cyl(c, x + sx, 5.65, z, 0.04, 0.12, '#e9e6dc', { n: 5, layer: 'small' });
  return [ctxPoint(c, x - 0.6, 5.72, z), ctxPoint(c, x, 5.72, z), ctxPoint(c, x + 0.6, 5.72, z), ctxPoint(c, x, 5.06, z)];
}
function trashBin(c, x, z) { K.cyl(c, x, 0, z, 0.25, 0.75, '#5a8f73', { n: 10, top: 1.1, layer: 'small' }); K.cyl(c, x, 0.75, z, 0.29, 0.07, '#4b7a62', { n: 10, layer: 'small' }); }
function hydrant(c, x, z) { K.cyl(c, x, 0, z, 0.13, 0.55, '#c25959', { n: 8, layer: 'small' }); K.sph(c, x, 0.55, z, 0.13, 0.1, 0.13, '#c25959', { layer: 'small', w: 8, h: 5 }); K.cyl(c, x, 0.35, z, 0.05, 0.42, '#f3c258', { rz: Math.PI / 2, center: true, n: 6, layer: 'small' }); }
function cone(c, x, z) { K.cyl(c, x, 0, z, 0.2, 0.6, '#de794e', { n: 10, top: 0.15, layer: 'small' }); K.cyl(c, x, 0.28, z, 0.15, 0.1, '#f4f4ef', { n: 10, top: 0.85, layer: 'small' }); K.box(c, x, 0, z, 0.46, 0.05, 0.46, '#de794e', SM); }
function bollard(c, x, z) { K.cyl(c, x, 0, z, 0.09, 0.8, '#f3c258', { n: 8, layer: 'small' }); K.cyl(c, x, 0.55, z, 0.095, 0.1, '#373f42', { n: 8, layer: 'small' }); }
function bench(c, x, z, ry = 0) {
  const s = subCtx(c, x, 0, z, ry);
  for (let i = 0; i < 3; i++) K.box(s, 0, 0.44, -0.12 + i * 0.13, 1.8, 0.06, 0.11, '#b48d63', { id: 3, layer: 'small' });
  for (let i = 0; i < 2; i++) K.box(s, 0, 0.66 + i * 0.16, -0.27, 1.8, 0.1, 0.05, '#b48d63', { id: 3, layer: 'small', rx: -0.15 });
  for (const sx of [-0.75, 0.75]) { K.box(s, sx, 0, 0, 0.07, 0.44, 0.42, '#4b5658', { layer: 'small' }); K.box(s, sx, 0.44, -0.27, 0.07, 0.45, 0.06, '#4b5658', { layer: 'small' }); }
}
function vending(c, x, z, kind, ry = 0) {
  const s = subCtx(c, x, 0, z, ry);
  const bg = kind === 'foco' ? '#f3c258' : kind === 'cafe' ? '#c25959' : '#66bde6';
  K.box(s, 0, 0, 0, 0.95, 1.85, 0.75, bg, { id: 4 });
  K.pl(s, 0, 0.93, 0.38, 0.85, 1.7, texVending(kind), { id: 6 });
}
function pot(c, x, z, s = 1) { K.cyl(c, x, 0, z, 0.22 * s, 0.36 * s, '#c9744f', { n: 9, top: 1.25, layer: 'small' }); K.blob(c, x, 0.5 * s, z, 0.3 * s, 0.32 * s, 0.3 * s, leafCF(LEAVES[1]), { sway: 0.3, swayH: 1, det: 1 }); }
function planter(c, x, z, w = 2) { K.box(c, x, 0, z, w, 0.5, 0.6, '#b9b4a4', { id: 5, layer: 'small', pat: 2 }); for (let i = 0; i < Math.round(w / 0.6); i++) K.blob(c, x - w / 2 + 0.3 + i * 0.6, 0.62, z, 0.36, 0.3, 0.3, leafCF(LEAVES[i % 3]), { sway: 0.2, swayH: 1, det: 1 }); }
function crate(c, x, z, s = 0.7, ry = 0) { K.box(c, x, 0, z, s, s, s, '#b48d63', { id: 3, pat: 3, layer: 'small', ry }); }
function barrel(c, x, z, color = '#4f86b8') { K.cyl(c, x, 0, z, 0.3, 0.9, color, { n: 12, layer: 'small' }); K.cyl(c, x, 0.3, z, 0.31, 0.05, '#4b5658', { n: 12, layer: 'small' }); K.cyl(c, x, 0.65, z, 0.31, 0.05, '#4b5658', { n: 12, layer: 'small' }); }
function gasCyl(c, x, z) { K.cyl(c, x, 0, z, 0.18, 0.5, '#c25959', { n: 10, layer: 'small' }); K.sph(c, x, 0.5, z, 0.18, 0.1, 0.18, '#c25959', { layer: 'small', w: 8, h: 5 }); }
function rock(c, x, z, s = 1, y = 0) { K.blob(c, x, y + s * 0.2, z, s * rr(0.6, 1.0), s * rr(0.35, 0.6), s * rr(0.6, 1.0), () => C(rand() < 0.5 ? '#a7aea6' : '#9aa39a'), { layer: 'main', sway: 0, det: 1, id: 7 }); }
function signPost(c, x, z, uv, w = 0.8, h = 0.8, ry = 0) {
  const s = subCtx(c, x, 0, z, ry);
  K.cyl(s, 0, 0, 0, 0.04, 2.4, '#7d8a88', { n: 5, layer: 'small' });
  K.board(s, 0, 2.15, 0.06, w, h, uv, { layer: 'small' });
}
function fence(c, x0, x1, z, h = 1.0, color = '#f4f4ef') {
  const n = Math.max(1, Math.round((x1 - x0) / 0.3));
  for (let i = 0; i <= n; i++) K.box(c, lerp(x0, x1, i / n), 0, z, 0.08, h, 0.05, color, { id: 3, layer: 'small' });
  K.box(c, (x0 + x1) / 2, h * 0.65, z - 0.04, x1 - x0, 0.08, 0.04, color, { id: 3, layer: 'small' });
}
function guardRail(c, x0, x1, z) {
  const n = Math.max(1, Math.round((x1 - x0) / 2));
  for (let i = 0; i <= n; i++) K.box(c, lerp(x0, x1, i / n), 0, z, 0.1, 0.75, 0.1, '#e9ebe4', { layer: 'small' });
  K.box(c, (x0 + x1) / 2, 0.45, z + 0.06, x1 - x0, 0.28, 0.04, '#e9ebe4', { layer: 'small', id: 5 });
}
// carrinho redondo de desenho animado
const CARC = ['#e8b9a9', '#66bde6', '#f3c258', '#8cc48c', '#f4f4ef', '#c25959', '#a9c2b1'];
function car(c, x, z, ry = 0, color) {
  const s = subCtx(c, x, 0, z, ry), body = color || pickR(CARC), glass = C('#4d6670'), bc = C(body);
  K.sph(s, 0, 0.55, 0, 1.05, 0.36, 0.55, body, { id: 4, w: 16, h: 10 });
  K.sph(s, -0.12, 0.86, 0, 0.6, 0.36, 0.47, null, { id: 6, w: 14, h: 9, cf: (x, y, z, nx, ny) => (ny < 0.75 && y > 0.88 ? glass : bc) });
  for (const [wx, wz] of [[-0.62, 0.46], [0.62, 0.46], [-0.62, -0.46], [0.62, -0.46]]) {
    K.cyl(s, wx, 0.25, wz, 0.25, 0.18, '#373f42', { rx: Math.PI / 2, center: true, n: 12, id: 7 });
    K.cyl(s, wx, 0.25, wz + Math.sign(wz) * 0.06, 0.11, 0.08, '#d9dcd3', { rx: Math.PI / 2, center: true, n: 8, id: 5 });
  }
  K.sph(s, 1.0, 0.6, 0.3, 0.06, 0.07, 0.08, '#f6e7b5', { id: 6, w: 6, h: 5 }); K.sph(s, 1.0, 0.6, -0.3, 0.06, 0.07, 0.08, '#f6e7b5', { id: 6, w: 6, h: 5 });
}
function bike(c, x, z, ry = 0) {
  const s = subCtx(c, x, 0, z, ry), F = pickR(['#c25959', '#66bde6', '#f3c258']);
  for (const wx of [-0.45, 0.45]) K.tor(s, wx, 0.34, 0, 0.3, 0.035, '#373f42', { ts: 16, rs: 4, layer: 'small' });
  K.boxc(s, 0, 0.5, 0, 0.8, 0.05, 0.05, F, { rz: 0.15, layer: 'small' });
  K.boxc(s, -0.15, 0.55, 0, 0.05, 0.45, 0.05, F, { rz: 0.3, layer: 'small' });
  K.boxc(s, -0.22, 0.8, 0, 0.22, 0.05, 0.12, '#373f42', { layer: 'small' });
  K.boxc(s, 0.38, 0.85, 0, 0.05, 0.05, 0.4, '#4b5658', { layer: 'small' });
}
function umbrella(c, x, z, c1 = '#f4f4ef', c2 = '#c25959') {
  K.cyl(c, x, 0, z, 0.04, 2.1, '#e9e6dc', { n: 5, layer: 'small' });
  const A = C(c1), B = C(c2);
  K.cyl(c, x, 1.85, z, 1.2, 0.45, null, { n: 12, top: 0.02, id: 7, cf: (px, py, pz) => (Math.floor((Math.atan2(pz - z, px - x) + Math.PI) / (Math.PI / 4)) % 2 ? A : B) });
}
function towel(c, x, z, ry, color) { K.box(c, x, 0, z, 0.8, 0.02, 1.7, color, { ry, id: 7, layer: 'small' }); }
function boat(c, x, z, ry = 0, o = {}) {
  const s = subCtx(c, x, o.y || 0, z, ry), W = C('#f4f4ef'), B = C(o.color || '#3f8fc2');
  K.sph(s, 0, 0.62, 0, 2.2, 0.75, 0.85, null, { geo: HULL, id: 4, cf: (px, py) => (py < 0.28 ? B : W) });
  K.box(s, 0.1, 0.55, 0, 3.6, 0.1, 1.4, '#b48d63', { id: 3, pat: 3 });
  K.box(s, -0.5, 0.65, 0, 1.3, 0.85, 1.0, '#f4f4ef', { id: 4 });
  K.pl(s, -0.5, 1.15, 0.505, 0.9, 0.4, texWin('dark'), { id: 6 });
  K.box(s, -0.5, 1.5, 0, 1.45, 0.08, 1.15, '#3f8fc2', { id: 5 });
  K.cyl(s, 0.6, 0.65, 0, 0.04, 1.8, '#e9e6dc', { n: 5 });
}
function buoy(c, x, z, y = 0) { K.cyl(c, x, y, z, 0.25, 0.5, '#de794e', { n: 10, top: 0.6 }); K.cyl(c, x, y + 0.2, z, 0.26, 0.12, '#f4f4ef', { n: 10 }); }
function picnic(c, x, z, ry = 0) {
  const s = subCtx(c, x, 0, z, ry);
  K.box(s, 0, 0.72, 0, 1.6, 0.08, 0.8, '#b48d63', { id: 3, layer: 'small', pat: 3 });
  for (const sz of [-0.65, 0.65]) K.box(s, 0, 0.42, sz, 1.6, 0.06, 0.28, '#b48d63', { id: 3, layer: 'small' });
  for (const sx of [-0.6, 0.6]) K.box(s, sx, 0, 0, 0.08, 0.72, 1.4, '#8e6c4b', { id: 3, layer: 'small' });
}
function swing(c, x, z) {
  for (const sx of [-1.1, 1.1]) { K.boxc(c, x + sx, 1.1, z - 0.4, 0.08, 2.3, 0.08, '#c25959', { rx: 0.35, layer: 'small' }); K.boxc(c, x + sx, 1.1, z + 0.4, 0.08, 2.3, 0.08, '#c25959', { rx: -0.35, layer: 'small' }); }
  K.boxc(c, x, 2.15, z, 2.4, 0.08, 0.08, '#c25959', { layer: 'small' });
  for (const sx of [-0.45, 0.45]) { K.box(c, x + sx - 0.18, 0.45, z, 0.02, 1.7, 0.02, '#4b5658', SM); K.box(c, x + sx + 0.18, 0.45, z, 0.02, 1.7, 0.02, '#4b5658', SM); K.box(c, x + sx, 0.42, z, 0.45, 0.05, 0.2, '#f3c258', SM); }
}
function slide(c, x, z) {
  K.box(c, x - 0.9, 0, z, 0.8, 1.5, 0.8, '#66bde6', { id: 5, layer: 'small' });
  K.boxc(c, x + 0.25, 0.8, z, 0.6, 0.06, 1.9, '#f3c258', { ry: Math.PI / 2, rx: 0.6, layer: 'small', id: 6 });
  for (let i = 0; i < 4; i++) K.box(c, x - 1.45, i * 0.37, z, 0.3, 0.06, 0.6, '#c25959', SM);
}
function goal(c, x, z, ry) {
  const s = subCtx(c, x, 0, z, ry);
  for (const sx of [-1.4, 1.4]) K.box(s, sx, 0, 0, 0.1, 1.6, 0.1, '#f4f4ef', { layer: 'small' });
  K.box(s, 0, 1.6, 0, 2.9, 0.1, 0.1, '#f4f4ef', { layer: 'small' });
  K.box(s, 0, 0.0, -0.6, 2.8, 1.55, 0.02, '#e9ebe4', { layer: 'small', id: 7 });
}
function clothesline(c, x, z, len = 3) {
  for (const sx of [-len / 2, len / 2]) K.cyl(c, x + sx, 0, z, 0.04, 1.9, '#8d9792', { n: 4, layer: 'small' });
  K.boxc(c, x, 1.82, z, len, 0.015, 0.015, '#4b5658', SM);
  for (let i = 0; i < 4; i++) K.box(c, x - len / 2 + 0.5 + i * (len - 1) / 3, 1.25, z, 0.42, 0.55, 0.015, pickR(['#f4f4ef', '#66bde6', '#e7a58c', '#f3c258', '#8cc48c', '#c25959']), { id: 7, layer: 'small' });
}
function mailbox(c, x, z) { K.cyl(c, x, 0, z, 0.04, 1.0, '#4b5658', { n: 4, layer: 'small' }); K.box(c, x, 1.0, z, 0.32, 0.3, 0.42, '#c25959', { id: 5, layer: 'small' }); }

// ================= vegetação =================
const LEAVES = [
  ['#7cb867', '#5d9c55', '#457f47'], ['#8bc06a', '#6aa85a', '#4e8a4c'], ['#6db07a', '#4f9466', '#3b7454'],
  ['#9cc46a', '#79ab57', '#5c8d48'], ['#6aa66e', '#4c8a5a', '#386b47']
].map((a) => a.map(C));
function leafCF(set) {
  return (x, y, z, nx, ny) => {
    const n = vnoise3(x * 1.7 + 3, y * 1.7, z * 1.7);
    if (ny > 0.42 || (ny > 0.05 && n > 0.62)) return set[0];
    if (ny < -0.3) return set[2];
    return n < 0.3 ? set[2] : set[1];
  };
}
function tree(c, x, z, s = 1, o = {}) {
  const set = o.leaf || pickR(LEAVES), th = 1.5 * s, top = th + 1.9 * s;
  const lean = rr(-0.08, 0.08);
  K.cyl(c, x, 0, z, 0.15 * s, th + 0.5 * s, '#7a6a58', { n: 7, top: 0.55, layer: 'fol', id: 7, sway: 0.25, swayH: top, rz: lean });
  if (rand() < 0.6) K.cyl(c, x + 0.25 * s, th * 0.75, z, 0.06 * s, 0.75 * s, '#7a6a58', { n: 5, top: 0.5, layer: 'fol', id: 7, rz: -0.8, sway: 0.4, swayH: top });
  const nb = 3 + Math.floor(rand() * 3), cf = leafCF(set);
  K.blob(c, x, th + 0.85 * s, z, 1.0 * s, 0.85 * s, 1.0 * s, cf, { swayH: top });
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand(), rad = rr(0.45, 0.8) * s;
    K.blob(c, x + Math.cos(a) * rad, th + rr(0.45, 1.25) * s, z + Math.sin(a) * rad, rr(0.55, 0.8) * s, rr(0.5, 0.7) * s, rr(0.55, 0.8) * s, cf, { swayH: top });
  }
  if (rand() < 0.5) K.blob(c, x, th + 1.55 * s, z, 0.62 * s, 0.55 * s, 0.62 * s, cf, { swayH: top });
}
function pine(c, x, z, s = 1) {
  const set = LEAVES[4];
  K.cyl(c, x, 0, z, 0.12 * s, 1.2 * s, '#6f5f4e', { n: 6, layer: 'fol', id: 7, sway: 0.1, swayH: 4 * s });
  for (let i = 0; i < 3; i++) K.cyl(c, x, (0.8 + i * 0.85) * s, z, (1.1 - i * 0.28) * s, 1.5 * s, null, { n: 8, top: 0.02, layer: 'fol', id: 7, cf: (px, py, pz, nx, ny) => (ny > 0.55 ? set[0] : set[1]), sway: 1, swayH: 4 * s });
}
// coqueiro
const FROND = (() => {
  const g = new THREE.BufferGeometry(), P = [], N = [], I = [];
  const L = 2.3, segs = 6;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, x = t * L, y = 0.5 * t * L - 1.25 * t * t * L * 0.6, w = 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.04;
    P.push(x, y, -w, x, y + 0.05, 0, x, y, w);
    N.push(0, 1, -0.3, 0, 1, 0, 0, 1, 0.3);
    if (i < segs) { const a = i * 3; I.push(a, a + 1, a + 4, a, a + 4, a + 3, a + 1, a + 2, a + 5, a + 1, a + 5, a + 4); }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I);
  return g;
})();
function palm(c, x, z, s = 1) {
  const segs = 7, bend = rr(0.15, 0.32), dir = rand() * Math.PI * 2;
  let px = x, py = 0, pz = z;
  for (let i = 0; i < segs; i++) {
    const a = bend * (i / segs), hh = 0.55 * s;
    K.cyl(c, px, py, pz, (0.15 - i * 0.008) * s, hh + 0.02, i % 2 ? '#a78b67' : '#b39874', { n: 7, layer: 'fol', id: 7, rx: Math.sin(dir) * a, rz: -Math.cos(dir) * a, sway: 0.5, swayH: 4.5 * s });
    px += Math.cos(dir) * Math.sin(a) * hh; pz += Math.sin(dir) * Math.sin(a) * hh; py += Math.cos(a) * hh;
  }
  const set = LEAVES[3];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + rand() * 0.3;
    G(c, { layer: 'fol' }).add(FROND, TM(px, py, pz, s, s, s, a, 0, rr(-0.15, 0.2)), c.W, { c: i % 2 ? set[0] : set[1], id: 7, sway: 1.3, swayH: 4.5 * s });
  }
  for (let i = 0; i < 3; i++) K.sph(c, px + Math.cos(i * 2) * 0.15, py - 0.12, pz + Math.sin(i * 2) * 0.15, 0.12 * s, 0.12 * s, 0.12 * s, '#8a6a4f', { layer: 'fol', w: 6, h: 5, sway: 1, swayH: 4.5 * s });
}
function bush(c, x, z, s = 0.7, set) {
  set = set || pickR(LEAVES);
  const cf = leafCF(set);
  for (let i = 0; i < 3; i++) K.blob(c, x + rr(-0.35, 0.35) * s, (0.45 + rr(-0.1, 0.15)) * s, z + rr(-0.35, 0.35) * s, rr(0.55, 0.8) * s, rr(0.45, 0.65) * s, rr(0.55, 0.8) * s, cf, { sway: 0.4, swayH: 1.5, det: 1 });
}
function hedge(c, x, z, len, ry = 0) {
  const s = subCtx(c, x, 0, z, ry), cf = leafCF(LEAVES[2]);
  const n = Math.max(1, Math.round(len / 0.9));
  for (let i = 0; i < n; i++) K.blob(s, -len / 2 + (i + 0.5) * len / n, 0.5, 0, 0.6, 0.55, 0.45, cf, { sway: 0.2, swayH: 1.5, det: 1 });
}
function flowers(c, x, z) {
  bush(c, x, z, 0.5);
  const cols = ['#f4f4ef', '#f3c258', '#e7a58c', '#c25959', '#b9a3e3'];
  const fc = pickR(cols);
  for (let i = 0; i < 6; i++) K.sph(c, x + rr(-0.35, 0.35), rr(0.45, 0.62), z + rr(-0.35, 0.35), 0.07, 0.07, 0.07, fc, { layer: 'fol', w: 6, h: 4, sway: 0.4, swayH: 1.5 });
}
