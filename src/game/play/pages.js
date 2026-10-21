// ================= folhas de domingo =================
import * as THREE from 'three';
import { R } from '../core/config.js';
import { arcDist, C, headingVec, orient, V3 } from '../core/math.js';
import { camera, scene } from '../core/renderer.js';
import { MAT, overHorizon } from '../world/chunks.js';
import { Geo, GEO, TM } from '../world/geo.js';
import { ctxDir } from '../world/kit.js';
import { PAGES } from '../world/places.js';
import { groundAt } from '../world/terrain.js';
import { texCalendar } from '../world/textures.js';
import { sfx } from './audio.js';
import { showEmote } from './bubbles.js';
import { openDialog } from './dialog.js';
import { refreshTasks } from './hud.js';
import { player } from './player.js';
import { state } from './state.js';

export const PAGEOBJ = [];
export function initPages() {
  const uv = texCalendar();
  const g = new Geo();
  g.add(GEO.box, TM(0, 0, 0, 0.38, 0.5, 0.008), null, { c: C('#f4f4ef'), id: 6 });
  g.add(GEO.plane, TM(0, 0, 0.0055, 0.36, 0.48, 1), null, { c: C('#ffffff'), uv, id: 6 });
  g.add(GEO.plane, TM(0, 0, -0.0055, 0.36, 0.48, 1, Math.PI), null, { c: C('#ffffff'), uv, id: 6 });
  const geo = g.build();
  PAGES.forEach((p, i) => {
    const d = ctxDir(p.c, p.x, p.z);
    const base = Math.max(groundAt(d), p.h ?? -99);
    const m = new THREE.Mesh(geo, MAT.world); m.castShadow = true; m.receiveShadow = false;
    scene.add(m);
    PAGEOBJ.push({ p, i, d, h: base + p.y, m, got: false, fwd: headingVec(d, i * 50) });
  });
}
const _pg = V3();
export function updatePages(dt, t) {
  const camD = camera.position.length();
  for (const o of PAGEOBJ) {
    if (o.got) { o.m.visible = false; continue; }
    o.m.visible = overHorizon(o.d, 0, 2, camera.position, camD);
    if (!o.m.visible) continue;
    o.m.position.copy(o.d).multiplyScalar(R + o.h + Math.sin(t * 2.2 + o.i) * 0.1);
    orient(o.m, o.d, _pg.copy(o.fwd).applyAxisAngle(o.d, t * 1.4 + o.i));
    o.m.rotateX(Math.sin(t * 1.7 + o.i) * 0.15);
    if (state.mode === 'play' && !state.dialog && arcDist(player.d, o.d) < 1.25 && Math.abs(player.feet + 0.7 - o.h) < 1.8) collectPage(o);
  }
}
async function collectPage(o) {
  o.got = true; state.pages.add(o.i);
  sfx.chime();
  const n = state.pages.size;
  showEmote(null, '♥'); player.ch.st.happy = 1.6;
  await openDialog(`FOLHA DE DOMINGO ${n}/7`, '#c25959', [o.p.note,
    n >= 7 ? 'Sete domingos guardados. Esses ninguém remaneja.' : `Alguém arrancou essa folha do calendário. Ainda faltam ${7 - n} pelo planeta.`], { voice: 300 });
  refreshTasks();
}
