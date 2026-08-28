"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { BIN_COUNT, FRESH_MS, type RadarFrame } from "@/lib/radar";

const CRT = {
  bg: "#050507",
  grid: "#163016",
  gridSoft: "#0e1c0e",
  label: "#7a9a7a",
  sweep: "#00ff41",
  sweepDim: "rgba(0, 255, 65, 0.07)",
  origin: "#b8ffc4",
  object: "#ff3b30",
  objectMid: "#ff9933",
  objectFar: "#00ff41",
  hud: "#9ad6a4",
} as const;

export type RadarCanvasProps = {
  frameRef: MutableRefObject<RadarFrame>;
  maxRange: number;
};

export function RadarCanvas({ frameRef, maxRange }: RadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxRangeRef = useRef(maxRange);

  useEffect(() => {
    maxRangeRef.current = maxRange;
  }, [maxRange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let raf = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const polar = (cx: number, cy: number, deg: number, r: number) => {
      const rad = (deg * Math.PI) / 180;
      return { x: cx + Math.cos(rad) * r, y: cy - Math.sin(rad) * r };
    };

    const draw = (now: number) => {
      if (!running) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const frame = frameRef.current;
      const range = maxRangeRef.current;
      const pad = 18;
      const hudH = 34;
      const cx = w / 2;
      const cy = h - hudH - 8;
      const radius = Math.max(40, Math.min(w / 2 - pad, cy - pad));

      ctx.fillStyle = CRT.bg;
      ctx.fillRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius);
      glow.addColorStop(0, "rgba(0, 40, 12, 0.55)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 1, Math.PI, 0);
      ctx.lineTo(cx + radius + 1, cy);
      ctx.lineTo(cx - radius - 1, cy);
      ctx.closePath();
      ctx.clip();

      // Range rings
      for (let i = 1; i <= 4; i++) {
        const r = (radius * i) / 4;
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 0);
        ctx.strokeStyle = i === 4 ? CRT.grid : CRT.gridSoft;
        ctx.lineWidth = i === 4 ? 1.4 : 1;
        ctx.stroke();
      }

      // Radial ticks every 30°
      for (let a = 0; a <= 180; a += 30) {
        const inner = polar(cx, cy, a, radius * 0.06);
        const outer = polar(cx, cy, a, radius);
        ctx.beginPath();
        ctx.moveTo(inner.x, inner.y);
        ctx.lineTo(outer.x, outer.y);
        ctx.strokeStyle = a === 90 ? "rgba(0,255,65,0.22)" : CRT.gridSoft;
        ctx.lineWidth = a === 90 ? 1.4 : 1;
        ctx.stroke();
      }

      // Sweep fan — trail sits behind the beam
      const angle = frame.angle;
      const dir = frame.dir;
      const fan = 22;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let t = fan; t >= 0; t -= 0.6) {
        const p = polar(cx, cy, angle - dir * t, radius);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      const fanGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      fanGrad.addColorStop(0, "rgba(0, 255, 65, 0.22)");
      fanGrad.addColorStop(1, "rgba(0, 255, 65, 0.02)");
      ctx.fillStyle = fanGrad;
      ctx.fill();

      // Previous sweep ticks (phosphor trail)
      for (let t = 0; t < 18; t++) {
        const a = angle - dir * t * 1.15;
        const p = polar(cx, cy, a, radius);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `rgba(0, 255, 65, ${0.16 * (1 - t / 18)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Object blips
      for (let i = 0; i < BIN_COUNT; i++) {
        const dist = frame.dist[i];
        const hitAt = frame.hitAt[i];
        if (dist <= 0 || dist > range || hitAt <= 0) continue;
        const age = now - hitAt;
        if (age > FRESH_MS) continue;
        const a = i;
        const r = (dist / range) * radius;
        const p = polar(cx, cy, a, r);
        const alpha = Math.max(0, 1 - age / FRESH_MS);
        const closeness = dist / range;
        const color =
          closeness < 0.33 ? CRT.object : closeness < 0.66 ? CRT.objectMid : CRT.objectFar;

        ctx.save();
        ctx.globalAlpha = 0.18 + 0.82 * alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        const outer = polar(cx, cy, a, Math.min(radius, r + 10));
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(outer.x, outer.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Current sweep beam
      const tip = polar(cx, cy, angle, radius);
      ctx.save();
      ctx.shadowColor = CRT.sweep;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = CRT.sweep;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // Baseline
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.strokeStyle = CRT.grid;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Origin
      ctx.save();
      ctx.fillStyle = CRT.origin;
      ctx.shadowColor = CRT.sweep;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Angle labels along the arc
      ctx.fillStyle = CRT.label;
      ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const a of [0, 30, 60, 90, 120, 150, 180]) {
        const p = polar(cx, cy, a, radius + 14);
        ctx.fillText(`${a}°`, p.x, Math.min(p.y, cy - 2));
      }

      // Range labels on the 90° axis
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
      for (let i = 1; i <= 4; i++) {
        const r = (radius * i) / 4;
        const cm = Math.round((range * i) / 4);
        ctx.fillStyle = CRT.label;
        ctx.fillText(`${cm}`, cx + 6, cy - r + 1);
      }

      // HUD
      const live = now - frame.updatedAt < 250;
      const distLabel =
        frame.distance > 0 ? `${frame.distance.toFixed(0).padStart(3, " ")} cm` : "  —   ";
      ctx.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = CRT.hud;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(
        `ANG ${frame.angle.toFixed(0).padStart(3, " ")}°    DIST ${distLabel}    RNG ${range} cm`,
        pad,
        h - 12,
      );
      ctx.textAlign = "right";
      ctx.fillStyle = live ? CRT.sweep : CRT.label;
      ctx.fillText(live ? "● LIVE" : "○ WAIT", w - pad, h - 12);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [frameRef]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      aria-label="Ultrasonic sonar sweep"
    />
  );
}
