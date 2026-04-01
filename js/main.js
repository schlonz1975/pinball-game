import { Ball } from './physics.js';
import { getStaticSegments, getTouchdownLanes, getGoalpostZone,
         SPAWN_POS, FIELD_ENTRY, FLIPPER_LEFT_PIVOT, FLIPPER_RIGHT_PIVOT,
         FLIPPER_LENGTH, DRAIN_Y } from './board.js';
import { Flipper } from './flipper.js';
import { createBumpers } from './bumper.js';
import { createTargets, allDown, resetTargets } from './targets.js';
import { Scoring } from './scoring.js';
import { Renderer } from './renderer.js';

// ── Setup ──────────────────────────────────────────────────────────────
const canvas   = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);

const staticSegments = getStaticSegments();
let touchdownLanes   = getTouchdownLanes();
const goalpostZone   = getGoalpostZone();

const flippers = [
  new Flipper('left',  FLIPPER_LEFT_PIVOT,  FLIPPER_LENGTH),
  new Flipper('right', FLIPPER_RIGHT_PIVOT, FLIPPER_LENGTH),
];

let bumpers = createBumpers();
let targets = createTargets();
let scoring = new Scoring();
let ball    = new Ball(SPAWN_POS.x, SPAWN_POS.y);

// ── State machine ──────────────────────────────────────────────────────
// States: READY | LAUNCH | PLAYING | DRAINING | GAME_OVER
let state          = 'READY';
let plungerCharge  = 0;      // 0..1
let drainTimer     = 0;      // ms delay before respawn
const DRAIN_DELAY  = 1200;

function resetBall() {
  ball = new Ball(SPAWN_POS.x, SPAWN_POS.y);
  plungerCharge = 0;
  state = 'READY';
}

function triggerEvent(type, source) {
  switch (type) {
    case 'bumper':
      scoring.onBumperHit();
      break;
    case 'target':
      scoring.onTargetHit();
      if (allDown(targets)) {
        scoring.onAllTargetsDown();
        setTimeout(() => resetTargets(targets), 600);
      }
      break;
    case 'slingshot':
      scoring.onSlingshot();
      break;
  }
}

// ── Input ──────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;

  if (e.code === 'ArrowLeft')  flippers[0].active = true;
  if (e.code === 'ArrowRight') flippers[1].active = true;
  if (e.code === 'KeyZ')       flippers[0].active = true;
  if (e.code === 'KeyX')       flippers[1].active = true;

  // Start charging from READY — edge detection so a held-over Space doesn't auto-fire
  if (e.code === 'Space' && state === 'READY') {
    state = 'LAUNCH';
    plungerCharge = 0;
  }

  // Restart on game over
  if (e.code === 'Space' && state === 'GAME_OVER') {
    scoring = new Scoring();
    bumpers = createBumpers();
    targets = createTargets();
    touchdownLanes = getTouchdownLanes();
    resetBall();
  }

  // Prevent page scroll
  if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;

  if (e.code === 'ArrowLeft')  flippers[0].active = false;
  if (e.code === 'ArrowRight') flippers[1].active = false;
  if (e.code === 'KeyZ')       flippers[0].active = false;
  if (e.code === 'KeyX')       flippers[1].active = false;

  // Release plunger
  if (e.code === 'Space' && state === 'LAUNCH') {
    // min ~700 reaches mid-field; full charge ~1800 clears the ceiling deflector easily
    const launchSpeed = 700 + plungerCharge * 1100;
    ball.vel.y = -launchSpeed;
    ball.vel.x = -20;
    state = 'PLAYING';
  }
});

// ── Fixed timestep ─────────────────────────────────────────────────────
const FIXED_DT  = 1 / 60;
let accumulator = 0;
let lastTime    = null;

function update(dt) {
  scoring.update(dt);
  for (const f of flippers) f.update(dt);
  for (const b of bumpers)  b.update(dt);

  if (state === 'LAUNCH') {
    // Charge plunger while Space held
    if (keys['Space']) {
      plungerCharge = Math.min(1, plungerCharge + dt * 0.9);
    }
    // Ball sits at spawn, no physics
    return;
  }

  if (state === 'READY') {
    return;  // transition to LAUNCH handled by keydown (edge detection)
  }

  if (state === 'DRAINING') {
    drainTimer -= dt * 1000;
    if (drainTimer <= 0) {
      const remaining = scoring.drainBall();
      if (remaining <= 0) {
        state = 'GAME_OVER';
      } else {
        resetBall();
      }
    }
    return;
  }

  if (state !== 'PLAYING') return;

  // Physics step
  ball.step(dt, staticSegments, flippers, bumpers, targets, triggerEvent);

  // Touchdown lane detection
  for (const lane of touchdownLanes) {
    if (ball.pos.y < 60 &&
        ball.pos.x >= lane.x &&
        ball.pos.x <= lane.x + lane.width &&
        !lane.lit) {
      lane.lit = true;
      scoring.onTouchdownLane(lane.id);
      // Check if all lit
      if (touchdownLanes.every(l => l.lit)) {
        touchdownLanes.forEach(l => { l.lit = false; });
      }
    }
  }

  // Field goal detection
  const gz = goalpostZone;
  if (ball.pos.y < gz.y + gz.height &&
      ball.pos.y > gz.y &&
      ball.pos.x > gz.x &&
      ball.pos.x < gz.x + gz.width) {
    scoring.onFieldGoal();
  } else {
    scoring.fieldGoal = false;  // reset so it can score again next pass
  }

  // Drain detection
  if (ball.pos.y > DRAIN_Y) {
    state      = 'DRAINING';
    drainTimer = DRAIN_DELAY;
  }
}

// ── Game loop ──────────────────────────────────────────────────────────
function gameLoop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const rawDt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  accumulator += Math.min(rawDt, 0.05);

  while (accumulator >= FIXED_DT) {
    update(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  const alpha = accumulator / FIXED_DT;

  renderer.drawAll(
    state,
    staticSegments,
    flippers,
    bumpers,
    targets,
    ball,
    scoring,
    touchdownLanes,
    plungerCharge,
  );

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
