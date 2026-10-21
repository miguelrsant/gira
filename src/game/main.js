// ================= laço principal e inicialização =================
// boot() é chamado pelo src/main.jsx, depois que a interface React monta
import * as THREE from 'three';
import { setUI, getUI } from '../store.js';
import { IS_TOUCH, QS } from './core/config.js';
import { post, postCam, postScene } from './core/ink.js';
import { U } from './core/materials.js';
import { $, dirOf, eastOf, headingVec, latOf, lonOf, nextFrame, offsetDir, wait } from './core/math.js';
import { camera, renderer, scene } from './core/renderer.js';
import { adaptResolution } from './core/screen.js';
import { skyMat } from './core/skydome.js';
import { ATL } from './world/atlas.js';
import { buildChunks, makeMaterials, updateChunks } from './world/chunks.js';
import { addLandmarks } from './world/landmarks.js';
import { defineWorld } from './world/layout.js';
import { fillLots } from './world/lots.js';
import { BUILDS, COLLIDERS, DISTRICTS, DYN, PAGES, SPOTS } from './world/places.js';
import { buildRoads } from './world/roads.js';
import { buildGrass, scatter } from './world/scatter.js';
import { buildWires, streetFurniture } from './world/street.js';
import { buildTerrain, groundAt, waterMat } from './world/terrain.js';
import { FACE } from './characters/faces.js';
import { outfit } from './story/outfit.js';
import { storyProps } from './story/props.js';
import { actor, ACTORS, spawnActors, updateActors } from './play/actors.js';
import { setMusic } from './play/audio.js';
import { cam, snapCamera, updateCamera } from './play/camera.js';
import { hashColliders, insideTall, pushOut } from './play/collide.js';
import { updateSky } from './play/daylight.js';
import { updateDialog } from './play/dialog.js';
import { startStrike, startTalk, updateGame } from './play/director.js';
import { initDynamics, updateDynamics } from './play/dynamics.js';
import { refreshTasks, updateHud } from './play/hud.js';
import { initInput } from './play/input.js';
import { updateOverlays } from './play/overlays.js';
import { MISSION_DEBUG, updateMissions } from './play/missions.js';
import { updateMood } from './play/mood.js';
import { initPages, PAGEOBJ, updatePages } from './play/pages.js';
import { heroGesture, initPlayer, placePlayer, player, setHeroMood, SKYF, stepPlayer } from './play/player.js';
import { render } from './play/render.js';
import { state } from './play/state.js';
import { buildTitle, startTitle, TITLE, updateTitle } from './play/title.js';

const clock = new THREE.Clock(false);
let hudT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 1 / 20), t = clock.elapsedTime;
  if (state.freeze) return;
  state.frame++;
  U.time.value = t; post.uniforms.time.value = t; waterMat.uniforms.time.value = t; skyMat.uniforms.time.value = t;
  if (DYN.pools) for (const m of DYN.pools) m.material.uniforms.time.value = t;
  if (state.mode === 'title') updateTitle(dt);
  stepPlayer(dt);
  updateGame(dt);
  updateMissions(dt);
  updateMood(dt);
  updateActors(dt, t);
  updatePages(dt, t);
  updateDynamics(dt, t);
  updateDialog(dt);
  updateCamera(dt);
  updateSky(dt);
  updateChunks(camera.position, cam.far);
  updateOverlays(dt);
  hudT += dt; if (hudT > 0.1) { hudT = 0; updateHud(); if (getUI().panel === 'menu') refreshTasks(); }
  // muda a resolução antes de desenhar, para o quadro nunca sair em branco
  adaptResolution(dt);
  render();
}
function teleport(d, heading = 0) {
  player.d.copy(d).normalize();
  player.fwd.copy(headingVec(player.d, heading)); player.camFwd.copy(player.fwd); player.ctrlFwd.copy(player.fwd); player.vel.set(0, 0, 0);
  player.feet = groundAt(player.d);
  eastOf(player.d, SKYF.x); SKYF.z.crossVectors(SKYF.x, player.d).normalize();
  placePlayer(); snapCamera();
}
function quickStart() {
  TITLE.grp.visible = false; setUI({ title: { ...getUI().title, visible: false } });
  $('loader').classList.add('hidden');
  skyMat.uniforms.mode.value = 0;
  camera.fov = cam.fov; camera.updateProjectionMatrix();
  state.mode = 'play'; setUI({ playing: true, hudOn: true });
  if (QS.get('at')) { const [la, lo, hd] = QS.get('at').split(',').map(Number); teleport(dirOf(la, lo), hd || 0); }
  if (QS.get('pitch')) cam.pitch = +QS.get('pitch');
  if (QS.get('dist')) cam.distT = cam.dist = +QS.get('dist');
  if (QS.get('day')) { state.day = +QS.get('day'); refreshTasks(); }
  snapCamera();
}
export async function boot() {
  setUI({ touch: IS_TOUCH, outfit: { ...outfit } });
  initInput();
  try { await Promise.race([Promise.all(['40px Bungee', '20px "Patrick Hand SC"', '20px Silkscreen', 'bold 20px Silkscreen'].map((f) => document.fonts.load(f))), wait(3000)]); } catch (e) {}
  await nextFrame();
  makeMaterials();
  defineWorld(); addLandmarks(); storyProps(); fillLots();
  await nextFrame();
  buildTerrain();
  await nextFrame();
  buildRoads();
  for (let i = 0; i < BUILDS.length; i++) BUILDS[i]();
  await nextFrame();
  streetFurniture(); scatter(); buildWires();
  await nextFrame();
  buildChunks(); buildGrass();
  hashColliders();
  spawnActors(); initPlayer(); initPages(); initDynamics(); buildTitle();
  ATL.tex.needsUpdate = true; FACE.tex.needsUpdate = true;
  setMusic(state.musicOn);
  refreshTasks(); updateHud();
  if (QS.has('skip')) quickStart();
  else { state.mode = 'title'; updateTitle(0); }
  renderer.compile(scene, camera); renderer.compile(postScene, postCam);
  await nextFrame();
  clock.start();
  requestAnimationFrame(frame);
  if (!QS.has('skip')) startTitle();
  window.__ready = true;
}
window.__gira = {
  state, player, ACTORS, cam, SPOTS, DISTRICTS, PAGES, PAGEOBJ, COLLIDERS, ATL, FACE, renderer, TITLE, insideTall, pushOut, groundAt, latOf, lonOf,
  go(la, lo, hd) { teleport(dirOf(la, lo), hd || 0); },
  near(id, back = 2.4) { const a = actor(id); const d = offsetDir(a.d, a.fwd, back); teleport(d, 0); player.fwd.copy(a.d).sub(player.d).normalize(); player.camFwd.copy(player.fwd); snapCamera(); },
  day(n) { state.day = n; refreshTasks(); },
  walk(x) { state.walked = x; },
  strike() { startStrike(); },
  talk(id) { startTalk(actor(id)); },
  mood(m) { setHeroMood(m); },
  gesture(g) { heroGesture(g); },
  missions: MISSION_DEBUG,
};
