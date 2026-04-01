import { Ball } from './physics.js';
import { getStaticSegments, getTouchdownLanes, getGoalpostZone,
         SPAWN_POS, FLIPPER_LEFT_PIVOT, FLIPPER_RIGHT_PIVOT,
         FLIPPER_LENGTH, DRAIN_Y } from './board.js';
import { Flipper } from './flipper.js';
import { createBumpers } from './bumper.js';
import { createTargets, allDown, resetTargets } from './targets.js';
import { Scoring } from './scoring.js';
import { Renderer } from './renderer.js';
import * as Audio from './audio.js';

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
let state         = 'READY';
let plungerCharge = 0;
let drainTimer    = 0;
const DRAIN_DELAY = 1200;

// ── Tilt ───────────────────────────────────────────────────────────────
let tiltCount  = 0;   // number of tilts used this ball
let tiltTimer  = 0;   // flash display timer (ms)
const MAX_TILTS = 3;

function resetBall() {
  ball = new Ball(SPAWN_POS.x, SPAWN_POS.y);
  plungerCharge = 0;
  tiltCount     = 0;
  state = 'READY';
}

function newGame() {
  scoring        = new Scoring();
  bumpers        = createBumpers();
  targets        = createTargets();
  touchdownLanes = getTouchdownLanes();
  tiltCount      = 0;
  tiltTimer      = 0;
  resetBall();
}

// ── Event callbacks ────────────────────────────────────────────────────
function triggerEvent(type, source) {
  switch (type) {
    case 'bumper':
      scoring.onBumperHit();
      Audio.playBump();
      break;

    case 'target':
      scoring.onTargetHit();
      Audio.playTarget();
      if (allDown(targets)) {
        scoring.onAllTargetsDown();
        Audio.playScore();
        setTimeout(() => resetTargets(targets), 600);
      }
      break;

    case 'slingshot':
      scoring.onSlingshot();
      source.flashTimer = 220;   // flash the slingshot segment
      Audio.playSling();
      break;
  }
}

// ── Input ──────────────────────────────────────────────────────────────
const keys = {};

window.addEventListener('keydown', e => {
  if (keys[e.code]) return;   // suppress auto-repeat
  keys[e.code] = true;

  Audio.unlock();   // ensure AudioContext is active after first gesture

  if (e.code === 'ArrowLeft')  flippers[0].active = true;
  if (e.code === 'ArrowRight') flippers[1].active = true;
  if (e.code === 'KeyZ')       flippers[0].active = true;
  if (e.code === 'KeyX')       flippers[1].active = true;

  if (e.code === 'ArrowLeft' || e.code === 'KeyZ')  Audio.playFlip();
  if (e.code === 'ArrowRight'|| e.code === 'KeyX')  Audio.playFlip();

  // Start charging — edge-triggered so a held-over Space after a drain
  // does NOT auto-fire the plunger
  if (e.code === 'Space' && state === 'READY') {
    state         = 'LAUNCH';
    plungerCharge = 0;
  }

  // Tilt
  if (e.code === 'KeyT' && state === 'PLAYING') {
    tiltCount++;
    tiltTimer = 700;
    ball.vel.x += (Math.random() - 0.5) * 450;
    ball.vel.y += (Math.random() - 0.5) * 220;
    Audio.playTilt();
    if (tiltCount >= MAX_TILTS) {
      state      = 'DRAINING';
      drainTimer = DRAIN_DELAY;
    }
  }

  // Restart on game over
  if (e.code === 'Space' && state === 'GAME_OVER') {
    newGame();
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

  // Release plunger → launch
  if (e.code === 'Space' && state === 'LAUNCH') {
    const launchSpeed = 700 + plungerCharge * 1100;
    ball.vel.y = -launchSpeed;
    ball.vel.x = -20;
    state = 'PLAYING';
  }
});

// ── Fixed timestep loop ────────────────────────────────────────────────
const FIXED_DT  = 1 / 60;
let accumulator = 0;
let lastTime    = null;

function update(dt) {
  scoring.update(dt);
  for (const f of flippers) f.update(dt);
  for (const b of bumpers)  b.update(dt);

  // Decay slingshot flash timers
  for (const seg of staticSegments) {
    if (seg.isSlingshot && seg.flashTimer > 0) {
      seg.flashTimer = Math.max(0, seg.flashTimer - dt * 1000);
    }
  }

  // Decay tilt timer
  if (tiltTimer > 0) tiltTimer = Math.max(0, tiltTimer - dt * 1000);

  if (state === 'LAUNCH') {
    if (keys['Space']) plungerCharge = Math.min(1, plungerCharge + dt * 0.9);
    return;
  }

  if (state === 'READY') return;

  if (state === 'DRAINING') {
    drainTimer -= dt * 1000;
    if (drainTimer <= 0) {
      const remaining = scoring.drainBall();
      if (remaining <= 0) state = 'GAME_OVER';
      else                resetBall();
    }
    return;
  }

  if (state !== 'PLAYING') return;

  // Physics
  ball.step(dt, staticSegments, flippers, bumpers, targets, triggerEvent);

  // Touchdown lane detection
  for (const lane of touchdownLanes) {
    if (!lane.lit &&
        ball.pos.y < 60 &&
        ball.pos.x >= lane.x &&
        ball.pos.x <= lane.x + lane.width) {
      lane.lit = true;
      const pts = scoring.onTouchdownLane(lane.id);
      if (touchdownLanes.every(l => l.lit)) {
        touchdownLanes.forEach(l => { l.lit = false; });
        Audio.playTouchdown();
      } else {
        Audio.playScore();
      }
    }
  }

  // Field goal detection
  const gz = goalpostZone;
  if (ball.pos.y > gz.y && ball.pos.y < gz.y + gz.height &&
      ball.pos.x > gz.x && ball.pos.x < gz.x + gz.width) {
    scoring.onFieldGoal();
  } else {
    scoring.fieldGoal = false;
  }

  // Drain detection
  if (ball.pos.y > DRAIN_Y) {
    if (ball.pos.x > 440) {
      // Ball fell back down the shooter lane — no ball lost, just reset
      resetBall();
    } else {
      Audio.playDrain();
      state      = 'DRAINING';
      drainTimer = DRAIN_DELAY;
    }
  }
}

// ── Render loop ────────────────────────────────────────────────────────
function gameLoop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const rawDt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  accumulator += Math.min(rawDt, 0.05);
  while (accumulator >= FIXED_DT) {
    update(FIXED_DT);
    accumulator -= FIXED_DT;
  }

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
    tiltTimer,
    tiltCount,
  );

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
