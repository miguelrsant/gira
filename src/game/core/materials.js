// ================= materiais =================
// gradientes do sombreamento toon, ruído em GLSL e materiais com padrões
import * as THREE from 'three';
import { PACK } from './renderer.js';

export function makeGrad(arr) {
  const t = new THREE.DataTexture(new Uint8Array(arr), arr.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
const grad3 = makeGrad([84, 150, 214, 255]);
export const grad2 = makeGrad([126, 206, 255]);

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
  vec3 tint = vec3(1.0);
  if (typ > 0.5) {
    if (typ < 1.5) {            // tijolo aparente com variação por peça
      float row = floor(q.y / 0.25); float x = q.x / 0.50 + mod(row, 2.0) * 0.5;
      float bi = h12(vec2(floor(x), row));
      bool mortar = fract(q.y / 0.25) < 0.11 || fract(x) < 0.055;
      m = mortar ? 0.82 : (0.93 + bi * 0.12);
      if (!mortar) tint = mix(vec3(1.03, 0.97, 0.94), vec3(0.96, 1.01, 1.02), bi);
    } else if (typ < 2.5) {     // blocos de pedra talhada
      float row = floor(q.y / 0.52); float x = q.x / 0.92 + h12(vec2(row, 3.0));
      float b = h12(vec2(floor(x), row));
      bool joint = fract(q.y / 0.52) < 0.075 || fract(x) < 0.045;
      m = (joint ? 0.78 : 1.0) * (0.92 + b * 0.12);
    } else if (typ < 3.5) {     // tábuas de madeira com veio suave
      float k = floor(q.x / 0.23);
      float grain = sin(q.y * 16.0 + n2(q * 4.2) * 3.5) * 0.03;
      m = fract(q.x / 0.23) < 0.085 ? 0.80 : (0.95 + h12(vec2(k, 1.0)) * 0.08 + grain);
    } else if (typ < 4.5) {     // telha ondulada / metal vincado
      float rib = sin(q.x * 31.4159) * 0.5 + 0.5;
      m = 0.87 + 0.15 * smoothstep(0.25, 0.85, rib);
    } else if (typ < 5.5) {     // telhado de telhas coloniais
      float row = floor(q.y / 0.2); float cx = floor(q.x / 0.28 + mod(row, 2.0) * 0.5);
      float x = fract(q.x / 0.28 + mod(row, 2.0) * 0.5);
      float arc = 1.0 - pow(abs(x * 2.0 - 1.0), 1.8);
      float tb = h12(vec2(cx, row));
      m = ((fract(q.y / 0.2) < 0.12 + arc * 0.13) ? 0.78 : (0.95 + tb * 0.09));
      tint = mix(vec3(1.03, 0.98, 0.95), vec3(0.97, 1.0, 0.96), tb);
    } else if (typ < 6.5) {     // ladrilho de calçada / pátio
      vec2 cell = floor(q / 0.60);
      vec2 g = fract(q / 0.60);
      float cb = h12(cell);
      m = ((g.x < 0.055 || g.y < 0.055) ? 0.85 : (0.97 + cb * 0.05));
    } else if (typ < 7.5) {     // ripas horizontais / veneziana
      m = fract(q.y / 0.19) < 0.13 ? 0.83 : 1.01;
    } else {                    // reboco pintado com textura de rolo e leve desgaste na base
      float plaster = (n2(q * 3.4) - 0.5) * 0.05 + (n2(q * 11.0) - 0.5) * 0.025;
      m = 1.0 + plaster;
    }
    m *= mix(0.86, 1.0, smoothstep(0.0, 1.15, q.y));
    m *= 0.96 + 0.07 * n2(q * 0.85);
  }
  diffuseColor.rgb *= m * tint;
}
#endif
#ifdef P_GROUND
{
  float n = n3(vWPos * 0.31) * 0.68 + n3(vWPos * 1.55 + 7.0) * 0.32;
  float pt = smoothstep(0.50, 0.62, n);
  float clover = step(0.79, n3(vWPos * 4.4 + 2.1));
  float spk = step(0.85, n3(vWPos * 7.2));
  diffuseColor.rgb *= 1.0 + vG * (-0.10 * pt + 0.05 * clover * (1.0 - pt) + 0.07 * spk * (1.0 - pt));
  diffuseColor.rgb *= 1.0 - (1.0 - vG) * step(0.84, n3(vWPos * 8.5)) * 0.065;
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
    `).replace('#include <opaque_fragment>', `
      #if !defined(P_GROUND) && !defined(P_GRASS)
      {
        vec3 vn = normalize(vNormal);
        vec3 vd = normalize(vViewPosition);
        float rim = pow(1.0 - clamp(abs(dot(vn, vd)), 0.0, 1.0), 3.4);
        outgoingLight += diffuseColor.rgb * rim * 0.085;
      }
      #endif
      #include <opaque_fragment>
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
  const m = new THREE.LineBasicMaterial({ color, depthWrite: false });
  m.onBeforeCompile = (sh) => { if (PACK) sh.fragmentShader = sh.fragmentShader.replace(/}\s*$/, 'gl_FragColor.a = 0.0;\n}'); };
  return m;
}
