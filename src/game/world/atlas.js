// ================= atlas de texturas (placas, janelas, cartazes) =================
import * as THREE from 'three';

export const ATL = { S: 2048, cv: document.createElement('canvas'), sky: [{ x: 22, y: 0, w: 2026 }, { x: 0, y: 22, w: 22 }], map: new Map(), area: 0, miss: 0 };
ATL.sky.sort((a, b) => a.x - b.x);
ATL.cv.width = ATL.cv.height = ATL.S;
ATL.g = ATL.cv.getContext('2d');
ATL.tex = new THREE.CanvasTexture(ATL.cv);
ATL.tex.colorSpace = THREE.SRGBColorSpace; ATL.tex.anisotropy = 4;
ATL.g.fillStyle = '#ffffff'; ATL.g.fillRect(0, 0, 16, 16);
export const WHITE_UV = [8 / ATL.S, 1 - 8 / ATL.S];
// empacotamento "skyline": cada item desce até onde couber, mais embaixo e à esquerda possível
function skyFit(i, w, h) {
  const K = ATL.sky, S = ATL.S;
  if (K[i].x + w > S) return -1;
  let left = w, j = i, y = 0;
  while (left > 0) {
    if (j >= K.length) return -1;
    y = Math.max(y, K[j].y);
    if (y + h > S) return -1;
    left -= K[j].w; j++;
  }
  return y;
}
function skyPlace(i, x, y, w, h) {
  const K = ATL.sky;
  K.splice(i, 0, { x, y: y + h, w });
  for (let j = i + 1; j < K.length; j++) {
    const prev = K[j - 1], cur = K[j];
    if (cur.x >= prev.x + prev.w) break;
    const cut = prev.x + prev.w - cur.x;
    cur.x += cut; cur.w -= cut;
    if (cur.w <= 0) { K.splice(j, 1); j--; } else break;
  }
  for (let j = 0; j < K.length - 1; j++) if (K[j].y === K[j + 1].y) { K[j].w += K[j + 1].w; K.splice(j + 1, 1); j--; }
}
export function atlasAdd(key, w, h, draw) {
  if (ATL.map.has(key)) return ATL.map.get(key);
  const pad = 4, W = w + pad, Hh = h + pad, K = ATL.sky;
  let best = -1, by = 1e9, bw = 1e9;
  for (let i = 0; i < K.length; i++) {
    const y = skyFit(i, W, Hh);
    if (y >= 0 && (y + Hh < by || (y + Hh === by && K[i].w < bw))) { best = i; by = y + Hh; bw = K[i].w; }
  }
  if (best < 0) { ATL.miss++; console.warn('atlas cheio', key); return [WHITE_UV[0], WHITE_UV[1], WHITE_UV[0], WHITE_UV[1]]; }
  const x = K[best].x, y = by - Hh, g = ATL.g;
  skyPlace(best, x, y, W, Hh);
  ATL.area += w * h;
  g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w, h); g.clip();
  draw(g, w, h);
  g.restore();
  const S = ATL.S, uv = [x / S, 1 - (y + h) / S, (x + w) / S, 1 - y / S];
  ATL.map.set(key, uv);
  return uv;
}
