import { resolveCircle } from './physics.js';

export class Bumper {
  constructor(x, y, radius = 22) {
    this.x      = x;
    this.y      = y;
    this.radius = radius;
    this.flashTimer = 0;  // ms remaining for flash
  }

  resolveWithBall(ball) {
    const hit = resolveCircle(ball, this.x, this.y, this.radius, 1.4);
    if (hit) this.flashTimer = 300;
    return hit;
  }

  update(dt) {
    if (this.flashTimer > 0) this.flashTimer -= dt * 1000;
  }

  get isFlashing() { return this.flashTimer > 0; }
}

// 5 bumpers in a football-formation spread
export function createBumpers() {
  return [
    new Bumper(140, 120),
    new Bumper(240, 100),
    new Bumper(340, 120),
    new Bumper(185, 185),
    new Bumper(295, 185),
  ];
}
