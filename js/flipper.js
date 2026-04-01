import { vec2, closestPointOnSegment } from './physics.js';

const FLIPPER_RADIUS   = 7;    // capsule half-width
const ANGULAR_SPEED    = 16;   // rad/s when activated
const RETURN_SPEED     = 10;   // rad/s when released
const RESTITUTION      = 0.6;
const FRICTION         = 0.80;

export class Flipper {
  /**
   * @param {'left'|'right'} side
   * @param {{ x, y }} pivot
   * @param {number} length
   */
  constructor(side, pivot, length) {
    this.side   = side;
    this.pivot  = pivot;
    this.length = length;

    if (side === 'left') {
      this.restAngle     =  0.52;   // ~30° below horizontal (pointing down-right)
      this.activeAngle   = -0.52;   // ~30° above horizontal
      this.angularDir    = -1;      // negative = rotate CCW to activate
    } else {
      this.restAngle     =  Math.PI - 0.52;  // mirror: pointing down-left
      this.activeAngle   =  Math.PI + 0.52;
      this.angularDir    =  1;                // positive = rotate CW to activate
    }

    this.angle          = this.restAngle;
    this.angularVelocity = 0;
    this.active         = false;
  }

  update(dt) {
    if (this.active) {
      // Snap toward active angle at ANGULAR_SPEED
      const target = this.activeAngle;
      const diff   = target - this.angle;
      const step   = this.angularDir * ANGULAR_SPEED * dt;
      if (Math.abs(diff) <= Math.abs(step)) {
        this.angle = target;
        this.angularVelocity = 0;
      } else {
        this.angle += step;
        this.angularVelocity = this.angularDir * ANGULAR_SPEED;
      }
    } else {
      // Return toward rest angle
      const target = this.restAngle;
      const diff   = target - this.angle;
      const step   = -this.angularDir * RETURN_SPEED * dt;
      if (Math.abs(diff) <= Math.abs(step)) {
        this.angle = target;
        this.angularVelocity = 0;
      } else {
        this.angle += step;
        this.angularVelocity = -this.angularDir * RETURN_SPEED;
      }
    }
  }

  getTip() {
    return {
      x: this.pivot.x + Math.cos(this.angle) * this.length,
      y: this.pivot.y + Math.sin(this.angle) * this.length,
    };
  }

  resolveWithBall(ball) {
    const tip = this.getTip();
    const c   = closestPointOnSegment(ball.pos, this.pivot, tip);
    const diff = vec2.sub(ball.pos, c);
    const dist = vec2.mag(diff);
    const overlap = ball.radius + FLIPPER_RADIUS - dist;
    if (overlap <= 0) return false;

    const n = dist > 0 ? vec2.scale(diff, 1 / dist) : { x: 0, y: -1 };

    // push out
    ball.pos.x += n.x * overlap;
    ball.pos.y += n.y * overlap;

    // surface velocity at contact point due to flipper rotation
    // v_surface = ω × perp(C - pivot)
    const r = vec2.sub(c, this.pivot);
    const v_surface = vec2.scale(vec2.perp(r), this.angularVelocity);

    // relative velocity
    const v_rel = vec2.sub(ball.vel, v_surface);
    const vRelDotN = vec2.dot(v_rel, n);

    if (vRelDotN < 0) {
      // impulse along normal
      ball.vel.x -= (1 + RESTITUTION) * vRelDotN * n.x;
      ball.vel.y -= (1 + RESTITUTION) * vRelDotN * n.y;

      // friction on tangential
      const tang = vec2.perp(n);
      const vRelDotT = vec2.dot(v_rel, tang);
      ball.vel.x -= (1 - FRICTION) * vRelDotT * tang.x;
      ball.vel.y -= (1 - FRICTION) * vRelDotT * tang.y;
    }

    return true;
  }
}
