import * as THREE from 'three';

// ================= config =================
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const LOW = IS_TOUCH || (navigator.hardwareConcurrency || 8) <= 4;
const R = 26;                 // raio do planeta
const SEA = -0.42;            // nível da água, relativo a R
const LAP = 300;              // distância andada que vale "um dia"
const WALK = 4.3, RUN = 8.0;
const DAYS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
const $ = (id) => document.getElementById(id);
const Y = new THREE.Vector3(0, 1, 0);
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sat = (x) => clamp(x, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const sstep = (a, b, x) => smooth(sat((x - a) / (b - a)));
// diferença entre dois ângulos, sempre entre -π e π
const angDiff = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = mulberry(7);
const rr = (a, b) => a + (b - a) * rand();
const pickR = (arr) => arr[Math.floor(rand() * arr.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion();
const col = (hex) => new THREE.Color(hex);

// ================= geometria esférica =================
function dirOf(lat, lon, out = new THREE.Vector3()) {
  const a = lat * D2R, b = lon * D2R;
  return out.set(Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b));
}
const latOf = (d) => Math.asin(clamp(d.y, -1, 1)) / D2R;
const lonOf = (d) => Math.atan2(d.z, d.x) / D2R;
function eastOf(up, out = new THREE.Vector3()) {
  out.crossVectors(up, Y); if (out.lengthSq() < 1e-8) out.set(0, 0, 1); return out.normalize();
}
function northOf(up, out = new THREE.Vector3()) { const e = eastOf(up, tmpV3); return out.crossVectors(e, up).normalize(); }
// direção tangente para um rumo em graus (0 = norte, 90 = leste)
function headingVec(up, deg, out = new THREE.Vector3()) {
  const n = northOf(up, new THREE.Vector3()), e = eastOf(up, new THREE.Vector3());
  const a = deg * D2R; return out.copy(n).multiplyScalar(Math.cos(a)).addScaledVector(e, Math.sin(a)).normalize();
}
// matriz local: x = direita, y = cima (normal do planeta), z = frente
function frameMatrix(pos, up, fwd, out = new THREE.Matrix4()) {
  const f = tmpV.copy(fwd).addScaledVector(up, -fwd.dot(up)).normalize();
  const r = tmpV2.crossVectors(up, f).normalize();
  out.makeBasis(r, up, f); out.setPosition(pos); return out;
}
function orient(obj, up, fwd) {
  const f = tmpV.copy(fwd).addScaledVector(up, -fwd.dot(up));
  if (f.lengthSq() < 1e-10) return; f.normalize();
  const r = tmpV2.crossVectors(up, f).normalize();
  tmpM.makeBasis(r, up, f); obj.quaternion.setFromRotationMatrix(tmpM);
}
const arcDist = (a, b) => Math.acos(clamp(a.dot(b), -1, 1)) * R;
// direção a partir de um ponto, andando 'dist' unidades num rumo
function offsetDir(d, fwd, dist, out = new THREE.Vector3()) {
  const axis = tmpV.crossVectors(d, fwd).normalize();
  return out.copy(d).applyAxisAngle(axis, dist / R).normalize();
}

// ================= renderer =================
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
// cor + normal + id codificados no alfa de um alvo float: o contorno sai de uma passada só
const PACK = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
const PR_MAX = Math.min(devicePixelRatio || 1, LOW ? 1.3 : 1.75);
const PR_MIN = LOW ? 0.6 : 0.8;
let PR = PR_MAX;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.15, 900);
scene.add(camera);

function makeGrad(arr) {
  const t = new THREE.DataTexture(new Uint8Array(arr), arr.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
const grad3 = makeGrad([92, 172, 255]);
const grad2 = makeGrad([128, 255]);

// luzes
const ambient = new THREE.AmbientLight('#ffffff', 1.2);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#fff6e8', 2.1);
sun.castShadow = true;
sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 90 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);

// ================= materiais toon com padrões e código de contorno =================
const U = { time: { value: 0 } };
const GLSL_NOISE = `
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h12(i), h12(i + vec2(1.0, 0.0)), f.x), mix(h12(i + vec2(0.0, 1.0)), h12(i + vec2(1.0, 1.0)), f.x), f.y); }
float h13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1,0,0)), f.x), mix(h13(i + vec3(0,1,0)), h13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h13(i + vec3(0,0,1)), h13(i + vec3(1,0,1)), f.x), mix(h13(i + vec3(0,1,1)), h13(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
const PAT_FS = `
#ifdef P_PAT
{
  float code = floor(vPat.z + 0.5);
  float typ = floor(code / 8.0 + 0.01);
  vec2 q = vPat.xy;
  float m = 1.0;
  if (typ > 0.5) {
    if (typ < 1.5) {            // tijolo
      float row = floor(q.y / 0.26); float x = q.x / 0.52 + mod(row, 2.0) * 0.5;
      m = (fract(q.y / 0.26) < 0.1 || fract(x) < 0.05) ? 0.87 : 1.0;
    } else if (typ < 2.5) {     // blocos de pedra
      float row = floor(q.y / 0.55); float x = q.x / 0.95 + h12(vec2(row, 3.0));
      float b = h12(vec2(floor(x), row));
      m = ((fract(q.y / 0.55) < 0.07 || fract(x) < 0.04) ? 0.8 : 1.0) * (0.94 + b * 0.09);
    } else if (typ < 3.5) {     // tábuas verticais
      float k = floor(q.x / 0.24);
      m = fract(q.x / 0.24) < 0.08 ? 0.83 : (0.95 + h12(vec2(k, 1.0)) * 0.07);
    } else if (typ < 4.5) {     // telha ondulada / metal
      m = 0.89 + 0.11 * step(0.5, fract(q.x / 0.2));
    } else if (typ < 5.5) {     // telhado de telhas
      float row = floor(q.y / 0.2); float x = fract(q.x / 0.3 + mod(row, 2.0) * 0.5);
      float arc = 1.0 - pow(abs(x * 2.0 - 1.0), 2.0);
      m = (fract(q.y / 0.2) < 0.12 + arc * 0.12) ? 0.8 : 1.0;
    } else if (typ < 6.5) {     // ladrilho
      vec2 g = fract(q / 0.62); m = (g.x < 0.05 || g.y < 0.05) ? 0.89 : 1.0;
    } else if (typ < 7.5) {     // ripas horizontais
      m = fract(q.y / 0.2) < 0.11 ? 0.86 : 1.0;
    }
    m *= mix(0.87, 1.0, smoothstep(0.0, 1.1, q.y));
    m *= 0.95 + 0.08 * n2(q * 0.9);
  }
  diffuseColor.rgb *= m;
}
#endif
#ifdef P_GROUND
{
  float n = n3(vWPos * 0.31) * 0.72 + n3(vWPos * 1.6 + 7.0) * 0.28;
  float pt = step(0.57, n);
  float spk = step(0.84, n3(vWPos * 6.5));
  diffuseColor.rgb *= 1.0 + vG * (-0.11 * pt + 0.07 * spk * (1.0 - pt));
  diffuseColor.rgb *= 1.0 - (1.0 - vG) * step(0.86, n3(vWPos * 8.0)) * 0.07;
}
#endif
`;
const PACK_FS = `
#ifdef P_PACK
{
  #ifdef P_GRASS
  vec3 pn = normalize((viewMatrix * vec4(normalize(vWPos), 0.0)).xyz);
  #else
  vec3 pn = normalize(normal);
  #endif
  #if defined(P_GROUND) || defined(P_GRASS)
  float pid = 0.0;
  #elif defined(P_PAT)
  float pid = mod(floor(vPat.z + 0.5), 8.0);
  #else
  float pid = P_UID;
  #endif
  float qx = floor(clamp(pn.x * 0.5 + 0.5, 0.0, 0.999) * 16.0);
  float qy = floor(clamp(pn.y * 0.5 + 0.5, 0.0, 0.999) * 16.0);
  gl_FragColor.a = 1.0 + qx + qy * 16.0 + pid * 256.0;
}
#endif
`;
const WIND_VS = `
{
  float sw = aPat.x;
  vec3 upw = normalize(transformed);
  vec3 ew = normalize(cross(upw, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
  float ph = dot(transformed, vec3(0.37, 0.21, 0.29));
  transformed += ew * (sin(uTime * 1.5 + ph) * 0.05 + sin(uTime * 3.3 + ph * 2.0) * 0.015) * sw;
}
`;
const GRASS_VS = `
{
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float ph = dot(ip, vec3(0.43, 0.31, 0.27));
  float k = position.y * position.y * 3.0;
  transformed.x += (sin(uTime * 2.1 + ph) * 0.07 + sin(uTime * 4.7 + ph * 1.7) * 0.02) * k;
  transformed.z += cos(uTime * 1.7 + ph) * 0.05 * k;
}
`;
// o: { pat, ground, wind, grass, uid }
function patchMat(mat, o = {}) {
  const defs = [];
  if (PACK) defs.push('#define P_PACK');
  if (o.pat) defs.push('#define P_PAT');
  if (o.ground) defs.push('#define P_GROUND');
  if (o.grass) defs.push('#define P_GRASS');
  if (o.nearFade) defs.push('#define P_NEARFADE');
  defs.push('#define P_UID ' + (o.uid ?? 0).toFixed(1));
  const key = defs.join('|') + (o.wind ? '|wind' : '');
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time;
    const head = defs.join('\n') + `
      varying vec3 vWPos; uniform float uTime;
      #ifdef P_PAT
      varying vec3 vPat;
      #endif
      #ifdef P_GROUND
      varying float vG;
      #endif
    `;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      ${head}
      #ifdef P_PAT
      attribute vec3 aPat;
      #endif
      #ifdef P_GROUND
      attribute float aG;
      #endif
    `).replace('#include <project_vertex>', `
      ${o.wind ? WIND_VS : ''}${o.grass ? GRASS_VS : ''}
      #include <project_vertex>
      { vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        wp4 = instanceMatrix * wp4;
        #endif
        vWPos = (modelMatrix * wp4).xyz; }
      #ifdef P_PAT
      vPat = aPat;
      #endif
      #ifdef P_GROUND
      vG = aG;
      #endif
    `);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      ${head}
      ${GLSL_NOISE}
    `).replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      #ifdef P_NEARFADE
      { float vz = length(vViewPosition);
        if (vz < 1.8) { float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          if (ign > (vz - 0.55) / 1.25) discard; } }
      #endif
    `).replace('#include <color_fragment>', `#include <color_fragment>
      ${PAT_FS}
    `).replace(/}\s*$/, PACK_FS + '\n}');
  };
  return mat;
}
function toon(o = {}) {
  const m = new THREE.MeshToonMaterial({ color: o.color || '#ffffff', gradientMap: o.grad || grad3, vertexColors: !!o.vc, map: o.map || null, alphaTest: o.alphaTest || 0, side: o.side || THREE.FrontSide });
  return patchMat(m, o);
}
// material de linha (fios): fica fora do código de contorno
function lineMat(color) {
  const m = new THREE.LineBasicMaterial({ color });
  m.onBeforeCompile = (sh) => { if (PACK) sh.fragmentShader = sh.fragmentShader.replace(/}\s*$/, 'gl_FragColor.a = 0.0;\n}'); };
  return m;
}

// ================= pós-processamento: contorno de tinta =================
const rtColor = new THREE.WebGLRenderTarget(1, 1, { type: PACK ? THREE.HalfFloatType : THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
rtColor.depthTexture = new THREE.DepthTexture(1, 1); rtColor.depthTexture.type = THREE.UnsignedIntType;
const INK = new THREE.Color('#373f42');
const post = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rtColor.texture }, tDepth: { value: rtColor.depthTexture },
    res: { value: new THREE.Vector2() }, near: { value: camera.near }, far: { value: camera.far },
    ink: { value: INK }, thick: { value: 1 }, fade: { value: new THREE.Vector2(45, 150) }, time: { value: 0 },
    pack: { value: PACK ? 1 : 0 }, warm: { value: 0 }, vign: { value: 0.35 }, sat: { value: 0.9 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tColor, tDepth; uniform vec2 res, fade; uniform float near, far, thick, time, pack, warm, vign, sat; uniform vec3 ink;
    float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    // kind: 0 céu, 1 superfície, 2 água
    vec3 decN(float a, out float id, out float kind){
      if (a < -0.5) { kind = 2.0; id = 7.0; return vec3(0.0, 0.0, 1.0); }
      float k = floor(a + 0.5) - 1.0;
      if (k < 0.0) { kind = 0.0; id = -1.0; return vec3(0.0, 0.0, 1.0); }
      kind = 1.0;
      id = floor(k / 256.0 + 0.001);
      float r = k - id * 256.0;
      float qy = floor(r / 16.0 + 0.001);
      float qx = r - qy * 16.0;
      vec2 xy = (vec2(qx, qy) + 0.5) / 8.0 - 1.0;
      return vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy))));
    }
    void main(){
      vec2 px = thick / res;
      vec4 c0 = texture2D(tColor, vUv);
      float d0 = lin(texture2D(tDepth, vUv).x);
      float dl = lin(texture2D(tDepth, vUv - vec2(px.x, 0.0)).x);
      float dr = lin(texture2D(tDepth, vUv + vec2(px.x, 0.0)).x);
      float dd = lin(texture2D(tDepth, vUv - vec2(0.0, px.y)).x);
      float du = lin(texture2D(tDepth, vUv + vec2(0.0, px.y)).x);
      float dmin = min(min(dl, dr), min(du, dd));
      float lap = abs(dl + dr + du + dd - 4.0 * d0) / max(min(d0, dmin), 0.001);
      float eD = smoothstep(0.03, 0.085, lap);
      float e = eD;
      if (pack > 0.5) {
        float id0, k0, idr, kr, idu, ku, idl, kl, idd, kd;
        vec3 n0 = decN(c0.a, id0, k0);
        vec3 nr = decN(texture2D(tColor, vUv + vec2(px.x, 0.0)).a, idr, kr);
        vec3 nu = decN(texture2D(tColor, vUv + vec2(0.0, px.y)).a, idu, ku);
        decN(texture2D(tColor, vUv - vec2(px.x, 0.0)).a, idl, kl);
        decN(texture2D(tColor, vUv - vec2(0.0, px.y)).a, idd, kd);
        // água encostando no chão não ganha traço: a espuma faz esse papel
        bool wat = k0 > 1.5 || (id0 < 0.5 && k0 > 0.5 && (kr > 1.5 || ku > 1.5 || kl > 1.5 || kd > 1.5));
        if (wat) e = 0.0;
        if (k0 > 0.5 && k0 < 1.5) {
          if (kr > 0.5 && kr < 1.5 && abs(dr - d0) < d0 * 0.05) {
            e = max(e, smoothstep(0.22, 0.45, 1.0 - dot(n0, nr)));
            if (abs(idr - id0) > 0.5) e = max(e, 0.95);
          }
          if (ku > 0.5 && ku < 1.5 && abs(du - d0) < d0 * 0.05) {
            e = max(e, smoothstep(0.22, 0.45, 1.0 - dot(n0, nu)));
            if (abs(idu - id0) > 0.5) e = max(e, 0.95);
          }
        }
      }
      e *= 1.0 - smoothstep(fade.x, fade.y, min(d0, dmin));
      // perto demais da câmera (folhagem pontilhada) não ganha traço
      e *= smoothstep(1.7, 2.15, min(d0, dmin));
      float wob = hash(floor(gl_FragCoord.xy / 3.0) + floor(time * 4.0));
      e *= 0.84 + 0.16 * wob;
      vec3 c = mix(c0.rgb, ink, e);
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, sat);
      c *= mix(vec3(0.97, 1.0, 0.99), vec3(1.05, 0.95, 0.86), warm);
      vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * vign;
      c += (hash(gl_FragCoord.xy + fract(time) * 61.0) - 0.5) * 0.012;
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`,
  depthTest: false, depthWrite: false
});
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

const view = { w: innerWidth, h: innerHeight, portrait: innerWidth < innerHeight };
function applySize() {
  const w = innerWidth, h = innerHeight;
  view.w = w; view.h = h; view.portrait = w < h;
  renderer.setPixelRatio(PR);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const W = Math.floor(w * PR), H = Math.floor(h * PR);
  rtColor.setSize(W, H);
  post.uniforms.res.value.set(W, H);
  post.uniforms.thick.value = Math.max(1, Math.min(2.2, H / 620));
}
addEventListener('resize', () => applySize());
applySize();

// ajuste automático de resolução pelo tempo de quadro
const perf = { acc: 0, n: 0, t: 0, cool: 0 };
function adaptResolution(dt) {
  perf.acc += dt; perf.n++; perf.t += dt; perf.cool -= dt;
  if (perf.t < 1.5) return;
  const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0; perf.t = 0;
  if (perf.cool > 0 || document.hidden) return;
  if (avg > 1 / 42 && PR > PR_MIN + 0.01) { PR = Math.max(PR_MIN, PR - 0.15); applySize(); perf.cool = 2; }
  else if (avg < 1 / 58 && PR < PR_MAX - 0.01) { PR = Math.min(PR_MAX, PR + 0.1); applySize(); perf.cool = 4; }
}

// ================= céu =================
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    cA: { value: new THREE.Color('#5fbfb9') }, cB: { value: new THREE.Color('#9be5d6') }, cH: { value: new THREE.Color('#b9eee2') },
    cI: { value: new THREE.Color('#63c2bb') }, cI2: { value: new THREE.Color('#72cbc3') }, cHalo: { value: new THREE.Color('#86d6cc') },
    mode: { value: 1 }, skyInv: { value: new THREE.Matrix3() }, shift: { value: new THREE.Vector3() },
    pDir: { value: new THREE.Vector3(0, 0, -1) }, pRad: { value: 0.2 }, time: { value: 0 }
  },
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`,
  fragmentShader: `
    varying vec3 vDir;
    uniform vec3 cA, cB, cH, cI, cI2, cHalo, shift, pDir; uniform float mode, pRad, time; uniform mat3 skyInv;
    ${GLSL_NOISE}
    void main(){
      vec3 d = normalize(vDir);
      vec3 L = skyInv * d;
      vec3 p = L * vec3(2.3, 7.0, 2.3) + shift;
      float n = n3(p) * 0.56 + n3(p * 2.2 + 3.1) * 0.3 + n3(p * 5.7) * 0.14;
      float up = L.y;
      float cloud = step(0.565 - 0.05 * (1.0 - clamp(up, 0.0, 1.0)), n);
      float rim = step(0.545 - 0.05 * (1.0 - clamp(up, 0.0, 1.0)), n) - cloud;
      vec3 c = mix(cA, cB, cloud);
      c = mix(c, mix(cA, cB, 0.45), rim);
      c = mix(c, cH, (1.0 - smoothstep(0.0, 0.32, abs(up))) * 0.5);
      c = mix(c, cB, step(0.955, n3(L * 48.0 + shift * 2.0)) * 0.7);
      // modo título: fundo chapado com redemoinhos, ciscos e um halo em volta do planeta
      if (mode > 0.001) {
        float ang = acos(clamp(dot(d, pDir), -1.0, 1.0));
        float rr = ang / pRad;
        float halo = 1.0 - smoothstep(0.98, 1.28, rr);
        float sw = n3(d * 5.0 + vec3(time * 0.015, 0.0, time * 0.01)) * 0.7 + n3(d * 13.0) * 0.3;
        vec3 ci = mix(cI, cI2, step(0.64, sw) * 0.55 + step(0.7, sw) * 0.45);
        ci = mix(ci, cHalo, halo);
        ci = mix(ci, vec3(0.86, 0.97, 0.94), step(0.9955, h13(floor(d * 240.0))) * 0.7);
        c = mix(c, ci, mode);
      }
      gl_FragColor = vec4(c, 0.0);
      #include <colorspace_fragment>
    }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 40, 20), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false;
scene.add(sky);
scene.fog = new THREE.Fog('#79cfc6', 40, 130);
