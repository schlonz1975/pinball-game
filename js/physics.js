// Vec2 utilities
export const vec2 = {
  add:   (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub:   (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (v, s) => ({ x: v.x * s, y: v.y * s }),
  dot:   (a, b) => a.x * b.x + a.y * b.y,
  mag:   (v)    => Math.hypot(v.x, v.y),
  norm:  (v)    => { const m = Math.hypot(v.x, v.y); return m > 0 ? { x: v.x/m, y: v.y/m } : { x: 0, y: 0 }; },
  perp:  (v)    => ({ x: -v.y, y: v.x }),  // 90° CCW
};

const GRAVITY    = 1200;  // px/s²
const MAX_SPEED  = 1800;  // px/s
const AIR_DRAG   = 0.9998;
const SUBSTEPS   = 4;

export class Ball {
  constructor(x, y, radius = 10) {
    this.pos    = { x, y };
    this.prevPos = { x, y };
    this.vel    = { x: 0, y: 0 };
    this.radius = radius;
  }

  step(dt, staticSegments, flippers, bumpers, targets, triggerFn) {
    const sub_dt = dt / SUBSTEPS;
    for (let i = 0; i < SUBSTEPS; i++) {
      // integrate
      this.vel.y += GRAVITY * sub_dt;
      this.vel.x *= AIR_DRAG;
      this.vel.y *= AIR_DRAG;
      this.prevPos = { ...this.pos };
      this.pos.x += this.vel.x * sub_dt;
      this.pos.y += this.vel.y * sub_dt;

      // resolve static segments
      for (const seg of staticSegments) {
        resolveSegment(this, seg, triggerFn);
      }

      // resolve flippers
      for (const flipper of flippers) {
        flipper.resolveWithBall(this);
      }

      // resolve bumpers
      for (const bumper of bumpers) {
        const hit = bumper.resolveWithBall(this);
        if (hit && triggerFn) triggerFn('bumper', bumper);
      }

      // resolve drop targets
      for (const target of targets) {
        if (target.active) {
          const hit = target.resolveWithBall(this);
          if (hit && triggerFn) triggerFn('target', target);
        }
      }

      // cap speed
      const speed = vec2.mag(this.vel);
      if (speed > MAX_SPEED) {
        this.vel = vec2.scale(vec2.norm(this.vel), MAX_SPEED);
      }
    }
  }
}

// Returns closest point on segment [a,b] to point p
export function closestPointOnSegment(p, a, b) {
  const ab = vec2.sub(b, a);
  const ap = vec2.sub(p, a);
  const lenSq = vec2.dot(ab, ab);
  if (lenSq === 0) return { ...a, t: 0 };
  const t = Math.max(0, Math.min(1, vec2.dot(ap, ab) / lenSq));
  return { x: a.x + t * ab.x, y: a.y + t * ab.y, t };
}

// Resolve ball vs static line segment
// seg = { p1, p2, restitution, friction, id?, isSlingshot? }
export function resolveSegment(ball, seg, triggerFn) {
  const c = closestPointOnSegment(ball.pos, seg.p1, seg.p2);
  const diff = vec2.sub(ball.pos, c);
  const dist  = vec2.mag(diff);
  const overlap = ball.radius - dist;
  if (overlap <= 0) return false;

  const n = dist > 0 ? vec2.scale(diff, 1 / dist) : { x: 0, y: -1 };

  // push out
  ball.pos.x += n.x * overlap;
  ball.pos.y += n.y * overlap;

  // reflect velocity
  const restitution = seg.restitution ?? 0.5;
  const friction    = seg.friction    ?? 0.85;
  const vDotN = vec2.dot(ball.vel, n);
  if (vDotN < 0) {
    // normal component
    ball.vel.x -= (1 + restitution) * vDotN * n.x;
    ball.vel.y -= (1 + restitution) * vDotN * n.y;
    // friction on tangential
    const tang = vec2.perp(n);
    const vDotT = vec2.dot(ball.vel, tang);
    ball.vel.x -= (1 - friction) * vDotT * tang.x;
    ball.vel.y -= (1 - friction) * vDotT * tang.y;
  }

  if (seg.isSlingshot && triggerFn) triggerFn('slingshot', seg);
  return true;
}

// Resolve ball vs circle (bumper)
export function resolveCircle(ball, cx, cy, cr, restitution = 1.4) {
  const diff = vec2.sub(ball.pos, { x: cx, y: cy });
  const dist  = vec2.mag(diff);
  const overlap = ball.radius + cr - dist;
  if (overlap <= 0) return false;

  const n = dist > 0 ? vec2.scale(diff, 1 / dist) : { x: 0, y: -1 };

  ball.pos.x += n.x * overlap;
  ball.pos.y += n.y * overlap;

  const vDotN = vec2.dot(ball.vel, n);
  if (vDotN < 0) {
    ball.vel.x -= (1 + restitution) * vDotN * n.x;
    ball.vel.y -= (1 + restitution) * vDotN * n.y;
  }
  return true;
}
