import type { RadarPing } from "./radar";

/**
 * Pull complete angle/distance packets out of a serial buffer.
 *
 * Accepted forms (Arduino-friendly):
 *   90,42.          classic HowToMechatronics (`angle,distance.`)
 *   90,42           newline-terminated
 *   90;42
 *   {"angle":90,"distance":42}
 *   angle:90 distance:42
 */
export function consumeRadarBuffer(buffer: string): {
  pings: RadarPing[];
  rest: string;
} {
  const pings: RadarPing[] = [];
  let rest = buffer;

  rest = rest.replace(/\{[^{}]*\}/g, (json) => {
    const ping = parseJsonPing(json);
    if (ping) pings.push(ping);
    return "\n";
  });

  // Integer `angle,distance.` stream (may arrive with no newlines).
  rest = rest.replace(/(-?\d+)\s*[,;]\s*(-?\d+)\./g, (_all, a, d) => {
    pushPing(pings, Number(a), Number(d));
    return "\n";
  });

  const parts = rest.split(/\r?\n/);
  rest = parts.pop() ?? "";
  for (const line of parts) {
    const ping = parseLine(line);
    if (ping) pings.push(ping);
  }

  if (rest.length > 2048) rest = rest.slice(-256);
  return { pings, rest };
}

export function parseLine(line: string): RadarPing | null {
  const t = line.trim();
  if (!t) return null;

  if (t.startsWith("{")) return parseJsonPing(t);

  const labeled = t.match(
    /(?:angle|deg|a)\s*[:=]\s*(-?\d+(?:\.\d+)?)[^\d-]+(?:distance|dist|cm|d)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i,
  );
  if (labeled) return pack(Number(labeled[1]), Number(labeled[2]));

  const pair = t.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
  if (pair) return pack(Number(pair[1]), Number(pair[2]));

  return null;
}

function parseJsonPing(raw: string): RadarPing | null {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const angle = num(obj.angle ?? obj.deg ?? obj.a ?? obj.theta);
    const distance = num(obj.distance ?? obj.dist ?? obj.d ?? obj.cm ?? obj.r);
    return pack(angle, distance);
  } catch {
    return null;
  }
}

function pushPing(pings: RadarPing[], angle: number, distance: number) {
  const ping = pack(angle, distance);
  if (ping) pings.push(ping);
}

function pack(angle: number, distance: number): RadarPing | null {
  if (!Number.isFinite(angle) || !Number.isFinite(distance)) return null;
  if (angle < -5 || angle > 185) return null;
  if (distance < 0 || distance > 2000) return null;
  return { angle, distance };
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return NaN;
}
