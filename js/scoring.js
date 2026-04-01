const MULTIPLIER_THRESHOLDS = [0, 5, 15, 30]; // bumper hits for 1x,2x,3x,4x

export class Scoring {
  constructor() {
    this.reset();
  }

  reset() {
    this.score         = 0;
    this.multiplier    = 1;
    this.bumperHits    = 0;
    this.ballsLeft     = 3;
    this.touchdownLit  = new Array(5).fill(false);
    this.fieldGoal     = false;

    // For UI: recent score popup
    this.lastPoints    = 0;
    this.lastPopTimer  = 0;

    // multiplier burst animation
    this.multBurstTimer = 0;
  }

  add(points, label = '') {
    const earned = points * this.multiplier;
    this.score += earned;
    this.lastPoints   = earned;
    this.lastPopTimer = 1200; // ms
    return earned;
  }

  onBumperHit() {
    this.bumperHits++;
    const newMult = MULTIPLIER_THRESHOLDS.filter(t => this.bumperHits >= t).length;
    if (newMult > this.multiplier) {
      this.multiplier = newMult;
      this.multBurstTimer = 1000;
    }
    return this.add(100, 'BUMPER');
  }

  onTargetHit() {
    return this.add(200, 'TARGET');
  }

  onSlingshot() {
    return this.add(50, 'SLING');
  }

  onTouchdownLane(index) {
    this.touchdownLit[index] = true;
    if (this.touchdownLit.every(Boolean)) {
      this.touchdownLit.fill(false);
      return this.add(5000, 'TOUCHDOWN!');
    }
    return this.add(100, 'LANE');
  }

  onFieldGoal() {
    if (!this.fieldGoal) {
      this.fieldGoal = true;
      return this.add(1000, 'FIELD GOAL!');
    }
    return 0;
  }

  onAllTargetsDown() {
    return this.add(2500, 'FIRST DOWN!');
  }

  update(dt) {
    if (this.lastPopTimer > 0)   this.lastPopTimer   -= dt * 1000;
    if (this.multBurstTimer > 0) this.multBurstTimer -= dt * 1000;
  }

  drainBall() {
    this.ballsLeft--;
    return this.ballsLeft;
  }
}
