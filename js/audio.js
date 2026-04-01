let ctx = null;

function ac() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq1, freq2, dur, vol = 0.3, type = 'square') {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.connect(g);
  g.connect(a.destination);
  o.frequency.setValueAtTime(freq1, a.currentTime);
  if (freq2 !== freq1) {
    o.frequency.exponentialRampToValueAtTime(freq2, a.currentTime + dur);
  }
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.start();
  o.stop(a.currentTime + dur + 0.02);
}

// Unlock AudioContext on first call (browsers block until user gesture)
export function unlock() { ac(); }

export function playBump()   { tone(240, 60,  0.09, 0.4); }
export function playFlip()   { tone(380, 190, 0.04, 0.13); }
export function playSling()  { tone(580, 130, 0.07, 0.35, 'sawtooth'); }
export function playTarget() { tone(460, 230, 0.10, 0.25); }
export function playDrain()  { tone(380, 70,  0.55, 0.45, 'sawtooth'); }
export function playTilt()   { tone(160, 100, 0.35, 0.5,  'sawtooth'); }

export function playScore() {
  [523, 659].forEach((f, i) => setTimeout(() => tone(f, f, 0.06, 0.2), i * 75));
}

export function playTouchdown() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => tone(f, f, 0.14, 0.38), i * 115)
  );
}
