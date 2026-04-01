# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

ES modules require HTTP — open via a local server, not `file://`:

```bash
python3 -m http.server 8765
# then open http://localhost:8765/
```

No build step, no dependencies, no package.json.

## Architecture

The game is a fixed-timestep 2D pinball simulation on a 480×900 HTML5 Canvas.

**Data flow per frame:**
1. `main.js` runs the fixed-timestep loop (1/60s steps, accumulator pattern)
2. `update()` calls `ball.step()` which runs 4 physics substeps per tick
3. Inside each substep, `ball.step()` resolves collisions against: static segments (`board.js`), flippers (`flipper.js`), bumpers (`bumper.js`), and drop targets (`targets.js`)
4. Collision events are reported back via a `triggerFn(type, source)` callback to `main.js`, which calls the appropriate `scoring.js` method
5. `renderer.js` draws everything onto the canvas after each frame

**Physics (`physics.js`):**
- All wall/lane collision uses `closestPointOnSegment()` — the backbone function used everywhere
- Segment collision: push out along normal → reflect velocity with restitution + tangential friction
- Circle (bumper) collision: same but with restitution 1.4 (adds energy intentionally)
- Speed is capped at 1800 px/s after each collision to prevent tunneling

**Flipper mechanics (`flipper.js`):**
- The critical detail: ball velocity is reflected relative to the flipper's *surface velocity* (`ω × perp(C - pivot)`), not the world frame. Without this, flipping feels dead.
- Left flipper: restAngle=+0.52rad (down), activeAngle=-0.52rad (up)
- Right flipper: mirrored around π

**Board layout (`board.js`):**
- Play field: x=20–440, y=20–860; shooter lane: x=440–480
- Segments have `{ p1, p2, restitution, friction, isSlingshot?, id? }` shape
- `SPAWN_POS` = shooter lane bottom; `DRAIN_Y` = 870

**State machine (`main.js`):** `READY → LAUNCH → PLAYING → DRAINING → GAME_OVER`

## Controls

| Key | Action |
|-----|--------|
| Left Arrow / Z | Left flipper |
| Right Arrow / X | Right flipper |
| Space (hold/release) | Charge and launch plunger |

## Planned Milestones

- **M1** ✅ Playable core — physics, flippers, bumpers, targets, scoring, 3-ball game
- **M2** — American football theme art (canvas-drawn), Web Audio SFX, slingshot animations, tilt mechanic
- **M3** — Leaderboard (localStorage), title/game-over screens, particles, ball trail, screen shake
