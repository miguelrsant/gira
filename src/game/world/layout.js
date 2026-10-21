// ---------------- relevo e ruas ----------------
import * as THREE from 'three';
import { SEA } from '../core/config.js';
import { dirOf } from '../core/math.js';
import { defRoad, settleRoads } from './roads.js';
import { addZone, hill, town } from './terrain.js';

export let MAIN, VILA, LADEIRA, CONJ, BOARD, PIER, LAKEPIER;
export function defineWorld() {
  // relevo
  hill(25, 90, 10, 1.3, 'p');          // platô da vila
  hill(16, 300, 6.2, -2.6);            // lago do parque
  hill(-74, 236, 6.5, 4.7, 'p');       // ilha
  hill(50, 350, 8, 2.4);               // mirante
  hill(-38, 152, 13, 2.6, 'p');        // terreno da fábrica (empurra o mar)
  hill(-40, 100, 12, 2.2, 'p');        // conjunto habitacional
  hill(38, 300, 9, 1.6);
  hill(42, 20, 10, 1.8);
  hill(-30, 300, 9, 1.2);
  town(14, 20, 24); town(25, 90, 15); town(-28, 152, 13); town(-27, 232, 16); town(-25, 100, 14);
  town(86, 70, 10); town(-12, 28, 8); town(-74, 236, 5); town(14, 300, 8); town(-16, 78, 6);
  // zona plana do topo do morro
  addZone(dirOf(90, 0), new THREE.Vector3(1, 0, 0), 9.5, 9.5, { h: 6.2, round: true, m: 3.5, kind: 'grass', plane: false });

  MAIN = defRoad({ name: 'Avenida da Esteira', closed: true, w: 3.2, sw: 1.5, marks: 'dash', level: 0, pts: [
    [4, -12], [4, 6], [4.5, 24], [5, 42], [7, 58], [9, 74], [8, 90], [4, 106], [-3, 120], [-10, 134], [-16, 149], [-20, 165],
    [-21, 182], [-20.5, 200], [-20, 218], [-20, 236], [-20.5, 254], [-19.5, 270], [-15, 286], [-9, 301], [-4, 316], [0, 331], [3, 346]] });
  VILA = defRoad({ name: 'Rua do Sossego', w: 2.5, sw: 1.1, marks: 'none', level: 1, kind: 'asphalt', pts: [
    [8.5, 74], [16, 75], [25, 79], [33, 88], [35, 100], [30, 111], [20, 111], [11, 105], [5.5, 101]] });
  defRoad({ name: 'Rua das Flores', w: 2.3, sw: 1.0, marks: 'none', level: 2, pts: [[25, 79], [23, 93], [20, 111]] });
  LADEIRA = defRoad({ name: 'Ladeira', w: 2.6, sw: 0.9, marks: 'double', level: 3, pts: [
    [25, 79], [31, 72], [38, 64], [46, 70], [53, 62], [60, 70], [66, 63], [71, 70]] });
  CONJ = defRoad({ name: 'Conjunto Esteira Feliz', w: 2.5, sw: 1.0, marks: 'none', level: 4, pts: [
    [4, 106], [-6, 101], [-16, 96], [-25, 99], [-31, 108], [-27, 121], [-17, 128], [-10, 134]] });
  defRoad({ name: 'Acesso da Fábrica', w: 2.6, sw: 0.8, marks: 'none', level: 5, pts: [[-16, 149], [-23, 148], [-28, 151]] });
  BOARD = defRoad({ name: 'Calçadão', kind: 'wood', w: 2.2, level: 6, pts: [[-27.6, 203], [-28.3, 216], [-28.6, 230], [-28.3, 244], [-27.6, 256]] });
  PIER = defRoad({ name: 'Píer', kind: 'pier', w: 1.9, fixedH: SEA + 0.95, noFlat: true, pts: [[-29.5, 232], [-40, 232.5], [-50, 233], [-59, 234], [-66, 235]] });
  LAKEPIER = defRoad({ name: 'Deque do Lago', kind: 'pier', w: 1.5, fixedH: SEA + 0.7, noFlat: true, pts: [[7.8, 296], [10.6, 297.5]] });
  // trilhas de terra
  const trail = (pts, w = 1.6) => defRoad({ kind: 'trail', w, pts });
  trail([[-4.5, 312], [3, 305], [9, 296], [16, 289], [23, 296], [24, 306], [18, 313], [9, 310], [3, 305]]);
  trail([[23, 296], [33, 312], [43, 332], [50, 350], [48, 10], [42, 30], [36, 50], [31, 72]], 1.4);
  trail([[-20, 270], [-28, 282], [-34, 296], [-30, 312], [-18, 318], [-4, 316]], 1.3);
  trail([[-3, 120], [-12, 112], [-17, 96]], 1.2);
  trail([[38, 64], [48, 50], [52, 40], [48, 10]], 1.2);
  trail([[-16, 149], [-32, 160], [-40, 170], [-33, 184], [-21, 182]], 1.2);
  trail([[9, 74], [14, 60], [20, 50], [28, 44], [36, 50]], 1.2);
  settleRoads();
}
