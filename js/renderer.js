// ── Colour palette ─────────────────────────────────────────────────────
const C = {
  // Field
  fieldLight:     '#2a5c1a',
  fieldDark:      '#1e4212',
  endzone:        '#8a1800',
  endzoneStripe:  '#aa2200',
  fieldLine:      'rgba(255,255,255,0.65)',
  hashMark:       'rgba(255,255,255,0.35)',

  // Goalposts
  goalpost:       '#f5c518',

  // Slingshots
  slingFill:      '#003580',
  slingFlash:     '#66aaff',
  slingEdge:      '#4477cc',

  // Helmet bumpers
  helmet:         '#003580',
  helmetStripe:   '#ffffff',
  helmetRing:     '#0055cc',
  helmetFlash:    '#ffffaa',
  faceguard:      '#aaaaaa',

  // Flippers
  flipperActive:  '#e87722',
  flipperRest:    '#994400',
  flipperEdge:    '#ffaa55',

  // Ball
  ball:           '#8b4513',
  ballDark:       '#5a2d0c',
  ballSeam:       '#ffffff',

  // Targets
  targetOn:       '#00cc44',
  targetOff:      '#223322',
  targetEdgeOn:   '#88ffaa',
  targetEdgeOff:  '#334433',

  // Lanes
  laneOn:         '#ffdd00',

  // Walls
  wall:           'rgba(255,255,255,0.55)',

  // Shooter lane
  shooterBg:      '#080808',
  shooterWall:    '#2a2a2a',

  // HUD
  hudBg:          'rgba(0,0,0,0.80)',
  hudText:        '#ffffff',
  hudScore:       '#ffdd44',
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  // ── Field background ────────────────────────────────────────────────
  drawField() {
    const { ctx } = this;

    // Shooter lane
    ctx.fillStyle = C.shooterBg;
    ctx.fillRect(444, 0, 36, 900);
    ctx.strokeStyle = C.shooterWall;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(444, 0); ctx.lineTo(444, 900); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(478, 0); ctx.lineTo(478, 900); ctx.stroke();

    // Clip rendering to the physical field polygon
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(20, 62);
    ctx.lineTo(200, 20);
    ctx.lineTo(320, 20);
    ctx.lineTo(444, 30);
    ctx.lineTo(444, 862);
    ctx.lineTo(20,  862);
    ctx.closePath();
    ctx.clip();

    // Alternating yard-stripe bands (subtle)
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 === 0 ? C.fieldLight : C.fieldDark;
      ctx.fillRect(20, 65 + i * 88, 424, 88);
    }

    // Yard lines (dashed)
    ctx.strokeStyle = C.fieldLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 6]);
    for (let y = 153; y < 820; y += 88) {
      ctx.beginPath(); ctx.moveTo(25, y); ctx.lineTo(435, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Hash marks
    ctx.strokeStyle = C.hashMark;
    ctx.lineWidth = 1;
    for (let y = 110; y < 820; y += 44) {
      ctx.beginPath(); ctx.moveTo(155, y); ctx.lineTo(180, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(260, y); ctx.lineTo(285, y); ctx.stroke();
    }

    ctx.restore();
  }

  // ── End zone ────────────────────────────────────────────────────────
  drawEndZone(touchdownLanes) {
    const { ctx } = this;

    ctx.save();
    // Clip to end zone area within field shape
    ctx.beginPath();
    ctx.moveTo(20, 62);
    ctx.lineTo(200, 20);
    ctx.lineTo(320, 20);
    ctx.lineTo(444, 30);
    ctx.lineTo(444, 65);
    ctx.lineTo(20, 65);
    ctx.closePath();
    ctx.clip();

    // Base colour
    ctx.fillStyle = C.endzone;
    ctx.fillRect(20, 0, 424, 66);

    // Diagonal stripes
    ctx.strokeStyle = C.endzoneStripe;
    ctx.lineWidth = 10;
    for (let x = -60; x < 500; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 66, 66); ctx.stroke();
    }

    ctx.restore();

    // "TOUCHDOWN" label
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TOUCHDOWN ZONE', 230, 18);

    // Lane indicator dots
    const laneW = 72;
    for (let i = 0; i < 5; i++) {
      const lane = touchdownLanes[i];
      const cx   = 30 + i * laneW + (laneW - 4) / 2;
      ctx.beginPath();
      ctx.arc(cx, 50, 8, 0, Math.PI * 2);
      ctx.fillStyle = lane.lit ? C.laneOn : 'rgba(0,0,0,0.5)';
      ctx.fill();
      if (lane.lit) {
        ctx.strokeStyle = '#ffff88';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // ── Goalposts ────────────────────────────────────────────────────────
  drawGoalposts() {
    const { ctx } = this;
    ctx.strokeStyle = C.goalpost;
    ctx.lineCap = 'round';

    // Centre post
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(230, 64); ctx.lineTo(230, 30); ctx.stroke();
    // Crossbar
    ctx.beginPath(); ctx.moveTo(196, 40); ctx.lineTo(264, 40); ctx.stroke();
    // Uprights
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(196, 40); ctx.lineTo(184, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(264, 40); ctx.lineTo(276, 5); ctx.stroke();

    ctx.lineCap = 'butt';
  }

  // ── Wall lines ────────────────────────────────────────────────────────
  drawWalls(segments) {
    const { ctx } = this;
    ctx.strokeStyle = C.wall;
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    for (const seg of segments) {
      if (seg.isSlingshot) continue;
      ctx.beginPath();
      ctx.moveTo(seg.p1.x, seg.p1.y);
      ctx.lineTo(seg.p2.x, seg.p2.y);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // ── Slingshots ────────────────────────────────────────────────────────
  drawSlingshots(segments) {
    const { ctx } = this;

    const lFlash = segments.find(s => s.id === 'sl_left_top')?.flashTimer > 0;
    const rFlash = segments.find(s => s.id === 'sl_right_top')?.flashTimer > 0;

    const drawQuad = (pts, flash) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle   = flash ? C.slingFlash : C.slingFill;
      ctx.fill();
      ctx.strokeStyle = C.slingEdge;
      ctx.lineWidth   = 2;
      ctx.stroke();
    };

    drawQuad([{x:20,y:340},{x:90,y:260},{x:90,y:370},{x:20,y:370}], lFlash);
    drawQuad([{x:440,y:340},{x:350,y:260},{x:350,y:370},{x:440,y:370}], rFlash);
  }

  // ── Pop bumpers (helmet style) ────────────────────────────────────────
  drawBumper(bumper) {
    const { ctx } = this;
    const { x, y, radius: r } = bumper;
    const flash = bumper.isFlashing;

    // Drop shadow
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    // Helmet body
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle   = flash ? C.helmetFlash : C.helmet;
    ctx.fill();
    ctx.strokeStyle = flash ? '#ffff00' : C.helmetRing;
    ctx.lineWidth   = 3;
    ctx.stroke();

    if (!flash) {
      // Helmet stripe (arc over the top)
      ctx.strokeStyle = C.helmetStripe;
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.52, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();

      // Faceguard: vertical bar + two horizontal bars
      ctx.strokeStyle = C.faceguard;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.2);
      ctx.lineTo(x, y + r * 0.88);
      ctx.stroke();
      for (const fy of [y + r * 0.38, y + r * 0.62]) {
        ctx.beginPath();
        ctx.moveTo(x - r * 0.44, fy);
        ctx.lineTo(x + r * 0.44, fy);
        ctx.stroke();
      }
    }
  }

  // ── Drop targets ──────────────────────────────────────────────────────
  drawTarget(target) {
    const { ctx } = this;
    const { x, y, w, h, active, letter } = target;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 1, y + 1, w, h);

    ctx.fillStyle   = active ? C.targetOn : C.targetOff;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = active ? C.targetEdgeOn : C.targetEdgeOff;
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y, w, h);

    if (active) {
      ctx.fillStyle = '#001a00';
      ctx.font      = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(letter, x + w / 2, y + h - 2);
    }
  }

  // ── Flippers ─────────────────────────────────────────────────────────
  drawFlipper(flipper) {
    const { ctx } = this;
    const { pivot } = flipper;
    const tip = flipper.getTip();

    const dx = tip.x - pivot.x, dy = tip.y - pivot.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;   // perpendicular

    const pw = 9, tw = 4;

    ctx.beginPath();
    ctx.moveTo(pivot.x + nx * pw, pivot.y + ny * pw);
    ctx.lineTo(tip.x   + nx * tw, tip.y   + ny * tw);
    ctx.lineTo(tip.x   - nx * tw, tip.y   - ny * tw);
    ctx.lineTo(pivot.x - nx * pw, pivot.y - ny * pw);
    ctx.closePath();
    ctx.fillStyle   = flipper.active ? C.flipperActive : C.flipperRest;
    ctx.fill();
    ctx.strokeStyle = C.flipperEdge;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Pivot cap
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, pw, 0, Math.PI * 2);
    ctx.fillStyle = flipper.active ? C.flipperActive : C.flipperRest;
    ctx.fill();
  }

  // ── Ball (football) ──────────────────────────────────────────────────
  drawBall(ball) {
    const { ctx } = this;
    const { x, y } = ball.pos;
    const r = ball.radius;

    // Drop shadow
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle   = C.ball;
    ctx.fill();
    ctx.strokeStyle = C.ballDark;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Horizontal seam
    ctx.strokeStyle = C.ballSeam;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r + 2, y);
    ctx.lineTo(x + r - 2, y);
    ctx.stroke();

    // Lace stitches
    ctx.lineWidth = 1.5;
    const stitches = 4;
    for (let i = 0; i < stitches; i++) {
      const sx = x - r * 0.45 + i * (r * 0.9 / (stitches - 1));
      ctx.beginPath();
      ctx.moveTo(sx, y - 2.5);
      ctx.lineTo(sx, y + 2.5);
      ctx.stroke();
    }
  }

  // ── Tilt overlay ─────────────────────────────────────────────────────
  drawTilt(tiltTimer) {
    if (tiltTimer <= 0) return;
    const { ctx, canvas } = this;
    const a = Math.min(1, tiltTimer / 500);
    ctx.fillStyle = `rgba(255,0,0,${a * 0.22})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(255,60,60,${a})`;
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TILT!', canvas.width / 2, canvas.height / 2);
  }

  // ── HUD ───────────────────────────────────────────────────────────────
  drawHUD(scoring, state, plungerCharge, tiltCount) {
    const { ctx, canvas } = this;
    const W = canvas.width;

    // Bottom bar
    ctx.fillStyle = C.hudBg;
    ctx.fillRect(0, 862, W, 38);

    // Score
    ctx.fillStyle = C.hudScore;
    ctx.font      = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(scoring.score).padStart(8, '0'), 18, 888);

    // Ball count
    ctx.fillStyle   = C.hudText;
    ctx.font        = '14px monospace';
    ctx.textAlign   = 'right';
    ctx.fillText(`BALL ${4 - scoring.ballsLeft}/3`, 440, 888);

    // Multiplier
    if (scoring.multiplier > 1) {
      const burst = scoring.multBurstTimer > 0;
      ctx.fillStyle = burst ? '#ffff00' : '#ffaa00';
      ctx.font      = `bold ${burst ? 22 : 15}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${scoring.multiplier}×`, W / 2, 857);
    }

    // Tilt pips (3 small dots, each used tilt dims one)
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(462 + i * 12, 875, 4, 0, Math.PI * 2);
      ctx.fillStyle = i < (3 - tiltCount) ? '#ff6600' : '#333333';
      ctx.fill();
    }

    // Plunger power bar (inside shooter lane)
    if (state === 'LAUNCH') {
      const bx = 451, by = 640, bw = 20, bh = 190;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx, by, bw, bh);
      const fillH = plungerCharge * bh;
      ctx.fillStyle = `hsl(${120 - plungerCharge * 120}, 100%, 50%)`;
      ctx.fillRect(bx, by + bh - fillH, bw, fillH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle   = '#fff';
      ctx.font        = '8px monospace';
      ctx.textAlign   = 'center';
      ctx.fillText('PWR', bx + bw / 2, by + bh + 10);
    }

    // State overlays
    if (state === 'GAME_OVER') {
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, W, canvas.height);
      ctx.fillStyle = '#ff4444';
      ctx.font      = 'bold 38px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, 380);
      ctx.fillStyle = C.hudScore;
      ctx.font      = '24px monospace';
      ctx.fillText(String(scoring.score).padStart(8, '0'), W / 2, 428);
      ctx.fillStyle = C.hudText;
      ctx.font      = '13px monospace';
      ctx.fillText('PRESS SPACE TO PLAY AGAIN', W / 2, 470);
    }

    if (state === 'READY') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(30, 750, 384, 52);
      ctx.fillStyle = C.hudText;
      ctx.font      = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOLD SPACE TO CHARGE', W / 2, 773);
      ctx.fillText('RELEASE TO LAUNCH', W / 2, 793);
    }
  }

  // ── Score popup ───────────────────────────────────────────────────────
  drawScorePopup(scoring) {
    if (scoring.lastPopTimer <= 0) return;
    const { ctx, canvas } = this;
    const a = Math.min(1, scoring.lastPopTimer / 600);
    ctx.fillStyle = `rgba(255,220,50,${a})`;
    ctx.font      = `bold ${14 + Math.floor(a * 8)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`+${scoring.lastPoints}`, canvas.width / 2, 840 - (1 - a) * 30);
  }

  // ── Compositor ────────────────────────────────────────────────────────
  drawAll(state, segments, flippers, bumpers, targets, ball, scoring, touchdownLanes, plungerCharge, tiltTimer, tiltCount) {
    const { ctx, canvas } = this;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.drawField();
    this.drawEndZone(touchdownLanes);
    this.drawGoalposts();
    this.drawWalls(segments);
    this.drawSlingshots(segments);
    for (const t of targets)  this.drawTarget(t);
    for (const b of bumpers)  this.drawBumper(b);
    for (const f of flippers) this.drawFlipper(f);
    if (state !== 'READY') this.drawBall(ball);
    this.drawScorePopup(scoring);
    this.drawTilt(tiltTimer);
    this.drawHUD(scoring, state, plungerCharge, tiltCount);
  }
}
