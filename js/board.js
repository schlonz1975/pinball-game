// Board geometry for a 480x900 canvas
// All segments: { p1, p2, restitution, friction, id?, isSlingshot? }

const W = 480, H = 900;

// Shooter lane sits in the rightmost 40px (x=440..480)
// Main play field: x=20..440, y=0..860

export function getStaticSegments() {
  const segs = [];

  function seg(x1,y1, x2,y2, opts = {}) {
    segs.push({ p1:{x:x1,y:y1}, p2:{x:x2,y:y2}, restitution:0.5, friction:0.85, ...opts });
  }

  // ── Outer walls ────────────────────────────────────────────────
  // Left wall
  seg(20, 60,  20, 720);
  // Right wall of field — starts at y=82 to leave gap for ball to exit shooter
  seg(440, 82, 440, 580);

  // Top arc replaced by flat top + diagonal corners
  seg(20, 60,  200, 20);   // top-left diagonal
  seg(200, 20, 320, 20);   // top flat
  seg(320, 20, 444, 30);   // top-right diagonal → connects to shooter ceiling

  // ── Shooter lane ───────────────────────────────────────────────
  // Ceiling deflector: angled like / so ball going UP is reflected LEFT into field
  seg(444, 30, 478, 62, { restitution: 0.7 });
  // Inner wall — gap from y=30..82 lets deflected ball exit into field
  seg(444, 82, 444, 860);
  // Outer wall
  seg(478, 62, 478, 860);

  // ── In-lanes and out-lanes ─────────────────────────────────────
  // Left out-lane (leads to drain)
  seg(20,  620, 70,  720, { restitution: 0.4 });
  // Left in-lane separator
  seg(90,  600, 110, 720, { restitution: 0.4 });
  // Right out-lane
  seg(420, 620, 370, 720, { restitution: 0.4 });
  // Right in-lane separator
  seg(350, 600, 330, 720, { restitution: 0.4 });

  // ── Drain funnel walls ─────────────────────────────────────────
  // Angled walls below flippers leading to drain
  seg(20,  790, 110, 840);
  seg(420, 790, 330, 840);
  // Drain floor (ball exits below y=880)
  // (no segment — drain is detected by y position)

  // ── Slingshots ────────────────────────────────────────────────
  // Left slingshot (triangle, 3 segments)
  seg(20,  340, 90,  260, { restitution: 1.1, isSlingshot: true, id: 'sl_left_top',  flashTimer: 0 });
  seg(90,  260, 90,  370, { restitution: 1.1, isSlingshot: true, id: 'sl_left_bot',  flashTimer: 0 });
  seg(20,  370, 90,  370, { restitution: 0.4 });

  // Right slingshot
  seg(420, 340, 350, 260, { restitution: 1.1, isSlingshot: true, id: 'sl_right_top', flashTimer: 0 });
  seg(350, 260, 350, 370, { restitution: 1.1, isSlingshot: true, id: 'sl_right_bot', flashTimer: 0 });
  seg(420, 370, 350, 370, { restitution: 0.4 });

  // ── Out-lane guide rails ───────────────────────────────────────
  // Angled walls at the bottom of each out-lane that redirect the ball
  // inward toward the flipper rather than straight into the drain.
  seg(20,  680, 115, 740, { restitution: 0.6 });
  seg(440, 680, 325, 740, { restitution: 0.6 });

  // ── Guide rails (gentle funnel above flippers) ────────────────
  seg(20,  600, 20,  620);
  seg(420, 600, 420, 620);

  return segs;
}

// Touchdown rollover lanes — 5 lanes across the top
// Ball triggers one when it passes through the lane's x range at y < 55
export function getTouchdownLanes() {
  // Five equal lanes across x=30..390 (field width minus margins)
  const laneWidth = 72;
  const startX = 30;
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    x: startX + i * laneWidth,
    width: laneWidth - 4,
    y: 50,
    lit: false,
  }));
}

// Goalpost trigger zone (field goal)
export function getGoalpostZone() {
  return { x: 190, y: 10, width: 100, height: 40 };
}

// Ball spawn position (top of shooter lane)
export const SPAWN_POS = { x: 460, y: 820 };
// Ball entry into field from shooter
export const FIELD_ENTRY = { x: 240, y: 35 };

// Flipper pivot points
export const FLIPPER_LEFT_PIVOT  = { x: 140, y: 730 };
export const FLIPPER_RIGHT_PIVOT = { x: 340, y: 730 };
export const FLIPPER_LENGTH = 85;

// Drain zone
export const DRAIN_Y = 870;
