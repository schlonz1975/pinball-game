import { vec2 } from './physics.js';

const TARGET_W = 30;
const TARGET_H = 12;
const LETTERS  = ['T','O','U','C','H'];

export class DropTarget {
  constructor(x, y, index) {
    this.x      = x;
    this.y      = y;
    this.w      = TARGET_W;
    this.h      = TARGET_H;
    this.index  = index;
    this.letter = LETTERS[index];
    this.active = true;
  }

  // AABB vs circle
  resolveWithBall(ball) {
    if (!this.active) return false;

    const nearestX = Math.max(this.x, Math.min(ball.pos.x, this.x + this.w));
    const nearestY = Math.max(this.y, Math.min(ball.pos.y, this.y + this.h));
    const dx = ball.pos.x - nearestX;
    const dy = ball.pos.y - nearestY;
    const distSq = dx*dx + dy*dy;

    if (distSq < ball.radius * ball.radius) {
      this.active = false;
      // simple deflect: reflect y velocity
      if (ball.vel.y > 0) ball.vel.y *= -0.6;
      return true;
    }
    return false;
  }
}

export function createTargets() {
  const startX = 105;
  const spacing = 56;
  const y = 350;
  return Array.from({ length: 5 }, (_, i) =>
    new DropTarget(startX + i * spacing, y, i)
  );
}

export function allDown(targets) {
  return targets.every(t => !t.active);
}

export function resetTargets(targets) {
  targets.forEach(t => { t.active = true; });
}
