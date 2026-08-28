export type RadarPing = {
  angle: number;
  distance: number;
};

export const ANGLE_MIN = 0;
export const ANGLE_MAX = 180;
export const BIN_COUNT = ANGLE_MAX - ANGLE_MIN + 1;

export const RANGE_PRESETS = [40, 100, 200, 400] as const;

export type RadarFrame = {
  angle: number;
  distance: number;
  /** +1 sweeping toward 180°, -1 toward 0°. */
  dir: 1 | -1;
  /** Distance in cm for each integer degree 0–180. 0 = no echo. */
  dist: Float32Array;
  /** performance.now() of last hit at that degree. */
  hitAt: Float32Array;
  updatedAt: number;
  source: "idle" | "demo" | "serial";
};

export function createRadarFrame(): RadarFrame {
  return {
    angle: 90,
    distance: 0,
    dir: 1,
    dist: new Float32Array(BIN_COUNT),
    hitAt: new Float32Array(BIN_COUNT),
    updatedAt: 0,
    source: "idle",
  };
}

export function applyPing(
  frame: RadarFrame,
  ping: RadarPing,
  maxRange: number,
  now = performance.now(),
) {
  const angle = clamp(ping.angle, ANGLE_MIN, ANGLE_MAX);
  const i = Math.round(angle) - ANGLE_MIN;
  const inRange =
    Number.isFinite(ping.distance) &&
    ping.distance > 0 &&
    ping.distance <= maxRange;

  const delta = angle - frame.angle;
  if (delta > 0.2) frame.dir = 1;
  else if (delta < -0.2) frame.dir = -1;

  frame.angle = angle;
  frame.distance = inRange ? ping.distance : 0;
  frame.updatedAt = now;
  if (i >= 0 && i < BIN_COUNT) {
    frame.dist[i] = inRange ? ping.distance : 0;
    frame.hitAt[i] = inRange ? now : 0;
  }
}

/** How long a blip stays “live” on the sweep (ms). */
export const FRESH_MS = 4000;

/** Closest in-range echo still on the phosphor trail, or null if none. */
export function nearestContact(
  frame: RadarFrame,
  maxRange: number,
  now: number,
): { angle: number; distance: number } | null {
  let best = Infinity;
  let bestAngle = 0;
  for (let i = 0; i < BIN_COUNT; i++) {
    const d = frame.dist[i];
    if (d > 0 && d <= maxRange && now - frame.hitAt[i] < FRESH_MS && d < best) {
      best = d;
      bestAngle = i + ANGLE_MIN;
    }
  }
  if (!Number.isFinite(best) || best === Infinity) return null;
  return { angle: bestAngle, distance: best };
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Demo room: a few boxes the sweep can "see". Distances in cm. */
export function sampleDemo(angle: number, t: number): number {
  let d = 1e9;
  const boxes = [
    { a: 38, span: 7, dist: 22 },
    { a: 90, span: 5, dist: 16 },
    { a: 128, span: 9, dist: 31 },
    { a: 158, span: 4, dist: 19 },
  ];
  for (const b of boxes) {
    if (Math.abs(angle - b.a) < b.span) {
      const wobble = Math.sin(t / 380 + b.a) * 0.8;
      d = Math.min(d, b.dist + wobble);
    }
  }
  if (d > 1e8) return 0;
  return Math.max(2, d + (Math.random() - 0.5) * 0.4);
}
