// ================= pós-processamento: contorno de tinta =================
import * as THREE from 'three';
import { camera, PACK } from './renderer.js';

export const rtColor = new THREE.WebGLRenderTarget(1, 1, { type: PACK ? THREE.HalfFloatType : THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
rtColor.depthTexture = new THREE.DepthTexture(1, 1); rtColor.depthTexture.type = THREE.UnsignedIntType;
const INK = new THREE.Color('#373f42');
export const post = new THREE.ShaderMaterial({
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
export const postScene = new THREE.Scene();
export const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
