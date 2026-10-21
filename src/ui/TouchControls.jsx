// celular: joystick que aparece onde o dedo encosta (lado esquerdo) e o botão de pular
// os gestos em si são lidos em game/play/input.js
import { useUI } from '../store.js';
import { jump, jumpRelease } from '../game/play/player.js';

export function TouchControls() {
  const joy = useUI((s) => s.joy);
  return (
    <>
      <div id="joy" style={joy ? { display: 'block', left: joy.x - 60, top: joy.y - 60 } : undefined}>
        <i style={joy ? { transform: `translate(${joy.kx}px, ${joy.ky}px)` } : undefined} />
      </div>
      {/* segurar o botão pula mais alto; um toque rápido dá um pulinho */}
      <button id="jumpbtn" className="paper" aria-label="Pular" onPointerDown={(e) => { e.stopPropagation(); jump(true); }}
        onPointerUp={jumpRelease} onPointerCancel={jumpRelease} onPointerLeave={jumpRelease}>PULAR</button>
    </>
  );
}
