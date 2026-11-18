import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldConnectWire,
  formatGameClock,
  computeMoodProfile,
  stepCampinhoBall,
  projectPlanetRadar,
} from './rules.js';

test('shouldConnectWire connects nearby poles and rejects long sky-crossing chords', () => {
  assert.equal(shouldConnectWire({ x: 0, y: 0, z: 0 }, { x: 8, y: 1, z: 0 }, 13.5), true);
  assert.equal(shouldConnectWire({ x: 0, y: 0, z: 0 }, { x: 24, y: 0, z: 5 }, 13.5), false);
  assert.equal(shouldConnectWire({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, 13.5), false);
  assert.equal(shouldConnectWire(null, { x: 1, y: 2, z: 3 }), false);
});

test('formatGameClock formats workday, overtime, and Sunday hours accurately', () => {
  const start = formatGameClock({ walked: 0, lap: 300, extraDist: 100, sunday: false });
  assert.equal(start.clock, '06:00');
  assert.equal(start.overtime, false);

  const mid = formatGameClock({ walked: 150, lap: 300, extraDist: 100, sunday: false });
  assert.equal(mid.clock, '12:00');
  assert.equal(mid.overtime, false);

  const over = formatGameClock({ walked: 350, lap: 300, extraDist: 100, sunday: false });
  assert.equal(over.clock, '19:30');
  assert.equal(over.overtime, true);

  const sun = formatGameClock({ walked: 999, lap: 300, extraDist: 100, sunday: true, sunP: 0.5 });
  assert.equal(sun.clock, '13:30');
  assert.equal(sun.overtime, false);
});

test('computeMoodProfile reflects workday fatigue, bench/coffee rest boost, and Sunday relief', () => {
  const fresh = computeMoodProfile({ day: 1, animo: 0.9, sunday: false });
  assert.equal(fresh.face, 'content');
  assert.ok(fresh.speedMul > 0.95);

  const exhausted = computeMoodProfile({ day: 5, animo: 0.1, sunday: false });
  assert.equal(exhausted.face, 'exhausted');
  assert.equal(exhausted.label, 'NO LIMITE');

  const rested = computeMoodProfile({ day: 4, animo: 0.5, restedT: 10 });
  assert.equal(rested.label, 'REVIGORADA');
  assert.ok(rested.speedMul > computeMoodProfile({ day: 4, animo: 0.5, restedT: 0 }).speedMul);

  const sunday = computeMoodProfile({ day: 7, animo: 0.1, sunday: true });
  assert.equal(sunday.face, 'happy');
  assert.equal(sunday.label, 'LEVE');
});

test('stepCampinhoBall handles kicks, sideline bounces, and goal resets', () => {
  let state = { x: 0, z: 0, vx: 0, vz: 0, spin: 0, goals: 0 };
  const kickRes = stepCampinhoBall(
    state,
    { x: 0, z: -0.5, vx: 0, vz: 4.5, fx: 0, fz: 1, radius: 0.55 },
    1 / 60,
  );
  assert.equal(kickRes.event, 'kick');
  assert.ok(kickRes.ball.vz > 4);

  // Advance ball into the goal mouth (|x| <= 1.28, z > 5.5)
  const nearGoal = { x: 0.3, z: 5.4, vx: 0, vz: 8.0, spin: 1, goals: 0 };
  const goalRes = stepCampinhoBall(nearGoal, null, 0.05);
  assert.equal(goalRes.event, 'goal');
  assert.equal(goalRes.ball.goals, 1);
  assert.equal(goalRes.ball.x, 0);
  assert.equal(goalRes.ball.z, 0);

  // Advance ball outside goal posts (|x| > 1.28, z > 5.5) -> bounces off back boundary
  const missGoal = { x: 2.5, z: 5.4, vx: 0, vz: 8.0, spin: 0, goals: 1 };
  const bounceRes = stepCampinhoBall(missGoal, null, 0.05);
  assert.equal(bounceRes.event, null);
  assert.equal(bounceRes.ball.goals, 1);
  assert.ok(bounceRes.ball.vz < 0);
});

test('projectPlanetRadar maps forward targets upward and right targets to +u', () => {
  const playerDir = { x: 0, y: 1, z: 0 };
  const playerFwd = { x: 0, y: 0, z: 1 };
  const ahead = projectPlanetRadar(playerDir, playerFwd, { x: 0, y: Math.SQRT1_2, z: Math.SQRT1_2 });
  assert.ok(Math.abs(ahead.u) < 1e-6);
  assert.ok(ahead.v < -0.2); // forward is upward (-v)

  // East/right vector for playerFwd=(0,0,1), playerDir=(0,1,0) is fwd x dir = (-1, 0, 0)
  const right = projectPlanetRadar(playerDir, playerFwd, { x: -Math.SQRT1_2, y: Math.SQRT1_2, z: 0 });
  assert.ok(right.u > 0.2);
  assert.ok(Math.abs(right.v) < 1e-6);
});
