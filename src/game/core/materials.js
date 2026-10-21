// ================= materiais =================
// gradientes do sombreamento toon, ruído em GLSL e materiais com padrões
import * as THREE from 'three';
import { PACK } from './renderer.js';

export function makeGrad(arr) {
  const t = new THREE.DataTexture(new Uint8Array(arr), arr.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
const grad3 = makeGrad([92, 172, 255]);
export const grad2 = makeGrad([128, 255]);

// ================= materiais toon com padrões e código de contorno =================
export const U = { time: { value: 0 } };
export const GLSL_NOISE = `
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
export function patchMat(mat, o = {}) {
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
export function toon(o = {}) {
  const m = new THREE.MeshToonMaterial({ color: o.color || '#ffffff', gradientMap: o.grad || grad3, vertexColors: !!o.vc, map: o.map || null, alphaTest: o.alphaTest || 0, side: o.side || THREE.FrontSide });
  return patchMat(m, o);
}
// material de linha (fios): fica fora do código de contorno
export function lineMat(color) {
  const m = new THREE.LineBasicMaterial({ color });
  m.onBeforeCompile = (sh) => { if (PACK) sh.fragmentShader = sh.fragmentShader.replace(/}\s*$/, 'gl_FragColor.a = 0.0;\n}'); };
  return m;
}
