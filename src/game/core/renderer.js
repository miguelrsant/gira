// ================= renderer =================
import * as THREE from 'three';
import { LOW } from './config.js';
import { $ } from './math.js';

export const canvas = $('game');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const gl = renderer.getContext();
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
const glRendererName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
export const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(glRendererName);

renderer.shadowMap.enabled = !isSoftwareGl;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
// cor + normal + id codificados no alfa de um alvo float: o contorno sai de uma passada só
export const PACK = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));

export function afterDraw(cb) {
  if (!isSoftwareGl) { requestAnimationFrame(cb); return; }
  if (typeof gl.fenceSync === 'function') {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const st = gl.clientWaitSync(sync, 0, 0);
      if (st === gl.TIMEOUT_EXPIRED) { setTimeout(poll, 16); return; }
      gl.deleteSync(sync);
      setTimeout(() => cb(performance.now()), 64);
    };
    setTimeout(poll, 16);
  } else {
    setTimeout(() => cb(performance.now()), 80);
  }
}

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.15, 900);
scene.add(camera);

// luzes: chave solar quente + preenchimento hemisférico céu/grama para dar volume às curvas
export const ambient = new THREE.AmbientLight('#fffcf5', isSoftwareGl ? 0.92 : 0.78);
scene.add(ambient);
export const hemi = new THREE.HemisphereLight('#bfeef0', '#8fa673', 0.62);
scene.add(hemi);
export const sun = new THREE.DirectionalLight('#fff6e8', 2.15);
sun.castShadow = !isSoftwareGl;
sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 90 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);
