import { getTouchdownLanes, getGoalpostZone } from './board.js';

const COLORS = {
  wall:       '#4a9eff',
  flipper:    '#ffcc00',
  bumper:     '#ff6622',
  bumperFlash:'#ffffff',
  ball:       '#eeeeee',
  targetOn:   '#22dd44',
  targetOff:  '#333333',
  text:       '#ffffff',
  laneOn:     '#ffdd00',
  laneOff:    '#445544',
  slingshot:  '#ff4466',
  background: '#1a2a1a',
  field:      '#1e3a1e',
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  clear() {
    const { ctx, canvas } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Simple green field area
    ctx.fillStyle = COLORS.field;
    ctx.fillRect(20, 20, 420, 840);
  }

  drawSegments(segments) {
    const { ctx } = this;
    ctx.lineWidth = 2;
    for (const seg of segments) {
      ctx.strokeStyle = seg.isSlingshot ? COLORS.slingshot : COLORS.wall;
      ctx.beginPath();
      ctx.moveTo(seg.p1.x, seg.p1.y);
      ctx.lineTo(seg.p2.x, seg.p2.y);
      ctx.stroke();
    }
  }

  drawFlipper(flipper) {
    const { ctx } = this;
    const tip = flipper.getTip();
    ctx.strokeStyle = COLORS.flipper;
    ctx.lineWidth = flipper.active ? 10 : 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(flipper.pivot.x, flipper.pivot.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  drawBumper(bumper) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    ctx.fillStyle = bumper.isFlashing ? COLORS.bumperFlash : COLORS.bumper;
    ctx.fill();
    ctx.strokeStyle = '#ff9944';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawTarget(target) {
    const { ctx } = this;
    ctx.fillStyle = target.active ? COLORS.targetOn : COLORS.targetOff;
    ctx.fillRect(target.x, target.y, target.w, target.h);
    if (target.active) {
      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(target.letter, target.x + target.w / 2, target.y + target.h - 2);
    }
  }

  drawBall(ball, alpha = 1) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ball;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawTouchdownLanes(lanes) {
    const { ctx } = this;
    for (const lane of lanes) {
      ctx.fillStyle = lane.lit ? COLORS.laneOn : COLORS.laneOff;
      ctx.fillRect(lane.x, 30, lane.width, 20);
      ctx.fillStyle = lane.lit ? '#000' : '#888';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lane.id + 1, lane.x + lane.width / 2, 44);
    }
    // Label
    ctx.fillStyle = '#88cc88';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TOUCHDOWN ZONE', 240, 22);
  }

  drawGoalposts() {
    const { ctx } = this;
    // Simple goalpost shape at top center
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 3;
    // Post (vertical)
    ctx.beginPath(); ctx.moveTo(240, 55); ctx.lineTo(240, 10); ctx.stroke();
    // Left upright
    ctx.beginPath(); ctx.moveTo(240, 20); ctx.lineTo(200, 8); ctx.stroke();
    // Right upright
    ctx.beginPath(); ctx.moveTo(240, 20); ctx.lineTo(280, 8); ctx.stroke();
  }

  drawYardLines() {
    const { ctx } = this;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    for (let y = 220; y <= 560; y += 56) {
      ctx.beginPath();
      ctx.moveTo(25, y);
      ctx.lineTo(435, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  drawHUD(scoring, state, plungerCharge) {
    const { ctx, canvas } = this;

    // Score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(scoring.score).padStart(8, '0'), 20, 885);

    // Balls left (dots)
    ctx.textAlign = 'right';
    ctx.font = '14px monospace';
    ctx.fillText('BALL ' + (4 - scoring.ballsLeft) + '/3', 440, 885);

    // Multiplier
    if (scoring.multiplier > 1) {
      ctx.fillStyle = scoring.multBurstTimer > 0 ? '#ffff00' : '#ffaa00';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      const scale = scoring.multBurstTimer > 0
        ? 1 + 0.4 * (scoring.multBurstTimer / 1000)
        : 1;
      ctx.save();
      ctx.translate(240, 870);
      ctx.scale(scale, scale);
      ctx.fillText(scoring.multiplier + 'X', 0, 0);
      ctx.restore();
    }

    // Plunger charge bar
    if (state === 'LAUNCH') {
      const barW = 30;
      const barH = 200;
      const x = 452, y = 650;
      ctx.fillStyle = '#333';
      ctx.fillRect(x, y, barW, barH);
      const fill = plungerCharge * barH;
      ctx.fillStyle = `hsl(${120 - plungerCharge * 120}, 100%, 50%)`;
      ctx.fillRect(x, y + barH - fill, barW, fill);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barW, barH);
      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PULL', x + barW/2, y + barH + 12);
    }

    // State overlays
    if (state === 'GAME_OVER') {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', 240, 400);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px monospace';
      ctx.fillText('SCORE: ' + scoring.score, 240, 440);
      ctx.font = '14px monospace';
      ctx.fillText('Press SPACE to play again', 240, 480);
    }

    if (state === 'READY') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(60, 760, 360, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Hold SPACE to charge, release to launch', 240, 790);
    }
  }

  drawAll(state, segments, flippers, bumpers, targets, ball, scoring, touchdownLanes, plungerCharge) {
    this.clear();
    this.drawYardLines();
    this.drawTouchdownLanes(touchdownLanes);
    this.drawGoalposts();
    this.drawSegments(segments);
    for (const t of targets)  this.drawTarget(t);
    for (const b of bumpers)  this.drawBumper(b);
    for (const f of flippers) this.drawFlipper(f);
    if (state !== 'LAUNCH' && state !== 'READY') this.drawBall(ball);
    else if (state === 'LAUNCH') this.drawBall(ball);
    this.drawHUD(scoring, state, plungerCharge);
  }
}
