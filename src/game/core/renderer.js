// ================= renderer =================
import * as THREE from 'three';
import { LOW } from './config.js';
import { $ } from './math.js';

export const canvas = $('game');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
// cor + normal + id codificados no alfa de um alvo float: o contorno sai de uma passada só
export const PACK = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.15, 900);
scene.add(camera);

// luzes
export const ambient = new THREE.AmbientLight('#ffffff', 1.2);
scene.add(ambient);
export const sun = new THREE.DirectionalLight('#fff6e8', 2.1);
sun.castShadow = true;
sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 90 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);
