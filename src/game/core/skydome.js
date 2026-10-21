// ================= céu =================
import * as THREE from 'three';
import { GLSL_NOISE } from './materials.js';
import { scene } from './renderer.js';

export const skyMat = new THREE.ShaderMaterial({
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
export const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 40, 20), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false;
scene.add(sky);
scene.fog = new THREE.Fog('#79cfc6', 40, 130);
