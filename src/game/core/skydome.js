// ================= céu =================
import * as THREE from 'three';
import { GLSL_NOISE } from './materials.js';
import { scene } from './renderer.js';

export const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    cA: { value: new THREE.Color('#5fbfb9') }, cB: { value: new THREE.Color('#9be5d6') }, cH: { value: new THREE.Color('#b9eee2') },
    cI: { value: new THREE.Color('#63c2bb') }, cI2: { value: new THREE.Color('#72cbc3') }, cHalo: { value: new THREE.Color('#86d6cc') },
    sunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() }, sunCol: { value: new THREE.Color('#fff5d6') }, dusk: { value: 0 },
    mode: { value: 1 }, skyInv: { value: new THREE.Matrix3() }, shift: { value: new THREE.Vector3() },
    pDir: { value: new THREE.Vector3(0, 0, -1) }, pRad: { value: 0.2 }, time: { value: 0 }
  },
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`,
  fragmentShader: `
    varying vec3 vDir;
    uniform vec3 cA, cB, cH, cI, cI2, cHalo, shift, pDir, sunDir, sunCol;
    uniform float mode, pRad, time, dusk;
    uniform mat3 skyInv;
    ${GLSL_NOISE}
    void main(){
      vec3 d = normalize(vDir);
      vec3 L = skyInv * d;
      vec3 p = L * vec3(2.2, 6.8, 2.2) + shift;
      float n = n3(p) * 0.56 + n3(p * 2.2 + 3.1) * 0.3 + n3(p * 5.7) * 0.14;
      float up = L.y;
      float th = 0.565 - 0.05 * (1.0 - clamp(up, 0.0, 1.0));
      float cloud = step(th, n);
      float rim = step(th - 0.022, n) - cloud;
      float belly = step(th + 0.065, n);
      vec3 c = mix(cA, cB, cloud);
      c = mix(c, mix(cB, sunCol, 0.45), belly * 0.45);
      c = mix(c, mix(cA, cB, 0.45), rim);
      // degradê suave de horizonte
      c = mix(c, cH, (1.0 - smoothstep(-0.04, 0.36, up)) * 0.56);
      // disco solar ilustrado + halo quente
      float sd = dot(d, normalize(sunDir));
      float sunHalo = smoothstep(0.92, 0.996, sd);
      float sunDisc = smoothstep(0.9962, 0.9974, sd);
      c = mix(c, sunCol, sunHalo * 0.28 * (1.0 - cloud * 0.65));
      c = mix(c, mix(sunCol, vec3(1.0, 0.99, 0.94), 0.6), sunDisc * (1.0 - cloud * 0.8));
      // estrelas discretas no fim da tarde / hora extra
      float starCell = h13(floor(L * 190.0));
      float twinkle = 0.65 + 0.35 * sin(time * 2.4 + starCell * 40.0);
      float stars = step(0.9945, starCell) * smoothstep(0.08, 0.5, up) * (1.0 - cloud) * dusk * twinkle;
      c = mix(c, vec3(1.0, 0.97, 0.88), stars * 0.85);
      c = mix(c, cB, step(0.955, n3(L * 48.0 + shift * 2.0)) * 0.55);
      // modo título: fundo chapado com redemoinhos, ciscos e um halo em volta do planeta
      if (mode > 0.001) {
        float ang = acos(clamp(dot(d, pDir), -1.0, 1.0));
        float rr = ang / pRad;
        float halo = 1.0 - smoothstep(0.96, 1.32, rr);
        float innerRing = smoothstep(0.98, 1.03, rr) * (1.0 - smoothstep(1.03, 1.09, rr));
        float sw = n3(d * 5.0 + vec3(time * 0.015, 0.0, time * 0.01)) * 0.7 + n3(d * 13.0) * 0.3;
        vec3 ci = mix(cI, cI2, step(0.64, sw) * 0.55 + step(0.7, sw) * 0.45);
        ci = mix(ci, cHalo, halo);
        ci = mix(ci, vec3(0.93, 0.99, 0.96), innerRing * 0.35);
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
