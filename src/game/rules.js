// ================= regras puras e matemática testável do jogo =================
// desacoplado de Three.js e DOM para testes rápidos via node:test

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// 1. Validação de vão máximo para cabos elétricos entre postes consecutivos
export function shouldConnectWire(a, b, maxDist = 13.5) {
  if (!a || !b) return false;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  const d2 = dx * dx + dy * dy + dz * dz;
  return d2 > 0.25 && d2 <= maxDist * maxDist;
}

// 2. Relógio diegético do expediente e do domingo
export function formatGameClock({ walked = 0, lap = 300, extraDist = 95, sunday = false, sunP = 0 }) {
  if (sunday) {
    const m = Math.floor((8 + clamp(sunP, 0, 1) * 11) * 60);
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return { clock: `${hh}:${mm}`, overtime: false, progress: clamp(sunP, 0, 1) };
  }
  const over = walked > lap;
  const total = lap + extraDist;
  const m = over
    ? 18 * 60 + Math.floor(clamp((walked - lap) / Math.max(1, extraDist), 0, 1) * 180)
    : Math.floor((6 + clamp(walked / Math.max(1, lap), 0, 1) * 12) * 60);
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return {
    clock: `${hh}:${mm}`,
    overtime: over,
    progress: clamp(walked / Math.max(1, total), 0, 1),
  };
}

// 3. Cálculo do humor, saturação e multiplicador de velocidade conforme dia e ânimo
export function computeMoodProfile({ day = 1, animo = 1, sunday = false, strike = false, happyT = 0, restedT = 0 }) {
  if (sunday || strike) {
    return { face: 'happy', speedMul: 1.06, sat: 1.08, warm: 0.48, label: 'LEVE' };
  }
  const boost = restedT > 0 ? 0.14 : 0;
  const eff = clamp(animo + boost, 0, 1.15);
  const face = happyT > 0
    ? 'happy'
    : eff > 0.68 && day <= 2
      ? 'content'
      : eff > 0.42
        ? 'neutral'
        : eff > 0.2
          ? 'tired'
          : 'exhausted';
  const baseSpeed = 0.72 + clamp(eff, 0, 1) * 0.28 + (restedT > 0 ? 0.08 : 0);
  const sat = 0.58 + clamp(eff, 0, 1) * 0.42;
  const warm = (1 - clamp(eff, 0, 1)) * 0.16;
  const label = restedT > 0
    ? 'REVIGORADA'
    : eff > 0.7
      ? 'DISPOSTA'
      : eff > 0.42
        ? 'AGUENTANDO'
        : eff > 0.2
          ? 'MOÍDA'
          : 'NO LIMITE';
  return { face, speedMul: baseSpeed, sat, warm, label };
}

// 4. Física local 2D da bola do Campinho + detecção de gol nas traves
export function stepCampinhoBall(ball, kicker, dt, bounds = { halfW: 3.6, halfL: 5.5, goalHalfW: 1.28 }) {
  const next = {
    x: ball.x,
    z: ball.z,
    vx: ball.vx,
    vz: ball.vz,
    spin: ball.spin || 0,
    goals: ball.goals || 0,
  };
  let event = null;

  if (kicker) {
    const dx = next.x - kicker.x;
    const dz = next.z - kicker.z;
    const dist = Math.hypot(dx, dz);
    const hitR = (kicker.radius || 0.58) + 0.24;
    if (dist < hitR) {
      const nx = dist > 1e-4 ? dx / dist : (kicker.fx || 0);
      const nz = dist > 1e-4 ? dz / dist : (kicker.fz || 1);
      const kSpeed = Math.hypot(kicker.vx || 0, kicker.vz || 0);
      const impulse = Math.max(4.6, kSpeed * 1.45 + 3.2);
      next.x = kicker.x + nx * (hitR + 0.03);
      next.z = kicker.z + nz * (hitR + 0.03);
      next.vx = nx * impulse + (kicker.vx || 0) * 0.35;
      next.vz = nz * impulse + (kicker.vz || 0) * 0.35;
      event = 'kick';
    }
  }

  next.x += next.vx * dt;
  next.z += next.vz * dt;
  const drag = Math.exp(-2.1 * dt);
  next.vx *= drag;
  next.vz *= drag;
  if (Math.hypot(next.vx, next.vz) < 0.05) {
    next.vx = 0;
    next.vz = 0;
  }
  next.spin += Math.hypot(next.vx, next.vz) * dt * 3.8;

  // Laterais (x)
  if (Math.abs(next.x) > bounds.halfW) {
    next.x = Math.sign(next.x) * bounds.halfW;
    next.vx = -next.vx * 0.68;
  }

  // Linha de fundo / Gol (z)
  if (Math.abs(next.z) > bounds.halfL) {
    if (Math.abs(next.x) <= bounds.goalHalfW) {
      event = 'goal';
      next.goals += 1;
      next.x = 0;
      next.z = 0;
      next.vx = 0;
      next.vz = 0;
    } else {
      next.z = Math.sign(next.z) * bounds.halfL;
      next.vz = -next.vz * 0.68;
    }
  }

  return { ball: next, event };
}

// 5. Projeção azimutal centrada na Duda para o radar/mapa esférico de bolso
export function projectPlanetRadar(playerDir, playerFwd, targetDir, maxAngle = Math.PI * 0.92) {
  // Base tangente: norte do radar = direção para onde Duda/câmera olha (playerFwd)
  // leste do radar = playerFwd x playerDir
  const rx = playerFwd.y * playerDir.z - playerFwd.z * playerDir.y;
  const ry = playerFwd.z * playerDir.x - playerFwd.x * playerDir.z;
  const rz = playerFwd.x * playerDir.y - playerFwd.y * playerDir.x;
  const rLen = Math.hypot(rx, ry, rz) || 1;
  const ex = rx / rLen, ey = ry / rLen, ez = rz / rLen;

  const dot = clamp(
    playerDir.x * targetDir.x + playerDir.y * targetDir.y + playerDir.z * targetDir.z,
    -1,
    1,
  );
  const angle = Math.acos(dot);
  const px = targetDir.x * ex + targetDir.y * ey + targetDir.z * ez;
  const py = targetDir.x * playerFwd.x + targetDir.y * playerFwd.y + targetDir.z * playerFwd.z;
  const pLen = Math.hypot(px, py);
  if (pLen < 1e-5) return { u: 0, v: 0, normDist: 0, antipodal: false };

  const normDist = clamp(angle / maxAngle, 0, 1);
  return {
    u: (px / pLen) * normDist,
    v: -(py / pLen) * normDist, // -v aponta para cima no SVG
    normDist,
    antipodal: angle > Math.PI * 0.68,
  };
}
