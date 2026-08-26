"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyPing,
  countObjects,
  createRadarFrame,
  RANGE_PRESETS,
  sampleDemo,
  type RadarFrame,
  type RadarPing,
} from "@/lib/radar";
import { BAUD_RATES, useSerialRadar } from "@/lib/useSerialRadar";
import { RadarCanvas } from "./RadarCanvas";

const panel =
  "rounded-2xl border border-border/80 bg-card p-4 shadow-[var(--panel-shadow)] sm:p-5";
const btn =
  "inline-flex items-center justify-center rounded-full border border-border/90 bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground/90 transition-all duration-200 hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary =
  "inline-flex items-center justify-center rounded-full border border-transparent bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export function RadarPlayground() {
  const frameRef = useRef<RadarFrame>(createRadarFrame());
  const pingTimesRef = useRef<number[]>([]);

  const [demo, setDemo] = useState(true);
  const [maxRange, setMaxRange] = useState<(typeof RANGE_PRESETS)[number]>(40);
  const [angle, setAngle] = useState(90);
  const [distance, setDistance] = useState(0);
  const [objects, setObjects] = useState(0);
  const [pps, setPps] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const maxRangeRef = useRef(maxRange);
  const demoRef = useRef(demo);

  useEffect(() => {
    maxRangeRef.current = maxRange;
  }, [maxRange]);

  useEffect(() => {
    demoRef.current = demo;
  }, [demo]);

  const uiAtRef = useRef(0);

  const ingest = useCallback((pings: RadarPing[], raw?: string) => {
    const now = performance.now();
    const frame = frameRef.current;
    for (const ping of pings) {
      applyPing(frame, ping, maxRangeRef.current, now);
      pingTimesRef.current.push(now);
    }
    const cutoff = now - 1000;
    pingTimesRef.current = pingTimesRef.current.filter((t) => t > cutoff);

    if (now - uiAtRef.current > 80) {
      uiAtRef.current = now;
      setAngle(frame.angle);
      setDistance(frame.distance);
      setObjects(countObjects(frame, maxRangeRef.current, now));
      setPps(pingTimesRef.current.length);
    }

    if (raw) {
      setLog((prev) => {
        const next = [...prev, raw];
        return next.length > 8 ? next.slice(-8) : next;
      });
    }
  }, []);

  const serial = useSerialRadar(
    useCallback(
      (pings: RadarPing[], raw: string) => {
        if (demoRef.current) setDemo(false);
        frameRef.current.source = "serial";
        ingest(pings, raw);
      },
      [ingest],
    ),
  );

  useEffect(() => {
    if (!demo) return;
    frameRef.current.source = "demo";
    let raf = 0;
    let last = performance.now();
    let a = 15;
    let dir = 1;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      a += dir * 80 * dt;
      if (a >= 165) {
        a = 165;
        dir = -1;
      } else if (a <= 15) {
        a = 15;
        dir = 1;
      }
      ingest([{ angle: a, distance: sampleDemo(a, now) }]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo, ingest]);

  const clearTraces = useCallback(() => {
    const frame = frameRef.current;
    frame.dist.fill(0);
    frame.hitAt.fill(0);
    frame.distance = 0;
    setDistance(0);
    setObjects(0);
    setLog([]);
  }, []);

  const connected = serial.status === "open";
  const statusLabel = useMemo(() => {
    if (connected) return "Arduino";
    if (demo) return "Demo sweep";
    if (serial.status === "connecting") return "Connecting…";
    if (serial.status === "error") return "Serial error";
    return "Idle";
  }, [connected, demo, serial.status]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:px-6">
      <header className="flex shrink-0 items-center gap-3 sm:gap-4">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[22%] bg-card shadow-sm ring-1 ring-black/5 sm:h-12 sm:w-12">
          <Image
            src="/rclogo.webp"
            alt="Robotics Club VITC"
            width={48}
            height={48}
            priority
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[clamp(1.35rem,3vw,2rem)] font-bold leading-none tracking-tight text-foreground">
            Radar Playground
          </h1>
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground sm:text-sm">
            by Robotics Club VITC · servo angle + ultrasonic distance
          </p>
        </div>
        <button type="button" onClick={clearTraces} className={`${btn} shrink-0`}>
          Clear traces
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12 lg:grid-rows-1">
        <section className={`${panel} flex min-h-0 min-w-0 flex-col gap-3 lg:col-span-8 lg:h-full`}>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">
              Radar
            </h2>
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected
                    ? "bg-signal"
                    : demo
                      ? "bg-accent"
                      : "bg-muted-foreground/40"
                }`}
              />
              {statusLabel}
            </span>
          </div>
          <div className="relative min-h-[280px] w-full flex-1 overflow-hidden rounded-2xl ring-1 ring-black/5 sm:min-h-[360px]">
            <RadarCanvas frameRef={frameRef} maxRange={maxRange} />
          </div>
        </section>

        <div className="flex min-h-0 min-w-0 flex-col gap-3 sm:gap-4 lg:col-span-4 lg:h-full lg:overflow-y-auto">
          <section className={`${panel} shrink-0 space-y-4`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight sm:text-base">
                Arduino
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                USB serial
              </span>
            </div>

            {!serial.supported ? (
              <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                Web Serial needs Chrome or Edge on this computer. Demo sweep still
                runs so you can see the radar.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {connected ? (
                <button type="button" className={btn} onClick={() => void serial.disconnect()}>
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => void serial.connect()}
                  disabled={!serial.supported || serial.status === "connecting"}
                >
                  {serial.status === "connecting" ? "Connecting…" : "Connect Arduino"}
                </button>
              )}
              <button
                type="button"
                className={`${btn} ${demo ? "border-accent bg-accent/10 text-accent" : ""}`}
                onClick={() => setDemo((v) => !v)}
                disabled={connected}
              >
                {demo ? "Demo on" : "Start demo"}
              </button>
            </div>

            <label className="block">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                Baud rate
              </span>
              <select
                className="mt-1.5 w-full rounded-xl border border-border bg-muted px-3 py-2 font-mono text-sm font-semibold outline-none focus:border-signal"
                value={serial.baudRate}
                disabled={connected}
                onChange={(e) =>
                  serial.setBaudRate(Number(e.target.value) as (typeof BAUD_RATES)[number])
                }
              >
                {BAUD_RATES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            {serial.error ? (
              <p className="text-sm font-semibold text-warn">{serial.error}</p>
            ) : null}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Arduino should print <span className="font-mono text-foreground">angle,distance.</span>{" "}
              — same format as the classic ultrasonic + servo radar. Sketch is in{" "}
              <span className="font-mono">arduino/radar.ino</span>.
            </p>
          </section>

          <section className={`${panel} shrink-0 space-y-3`}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
                Range scale
              </h2>
              <span className="font-mono text-lg font-extrabold tabular-nums text-signal">
                {maxRange} cm
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {RANGE_PRESETS.map((cm) => (
                <button
                  key={cm}
                  type="button"
                  onClick={() => setMaxRange(cm)}
                  className={`${btn} px-3 py-1 text-xs ${
                    maxRange === cm
                      ? "border-signal bg-signal/10 text-signal"
                      : ""
                  }`}
                >
                  {cm} cm
                </button>
              ))}
            </div>
          </section>

          <section className={`${panel} flex min-h-0 flex-1 flex-col gap-2`}>
            <h2 className="shrink-0 text-sm font-semibold tracking-tight text-muted-foreground">
              Readings
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Angle" value={`${angle.toFixed(0)}°`} />
              <Stat
                label="Distance"
                value={distance > 0 ? `${distance.toFixed(0)} cm` : "—"}
              />
              <Stat label="Objects" value={`${objects}`} />
              <Stat label="Pings" value={`${pps} /s`} />
            </div>
            <div className="mt-1 min-h-0 flex-1 overflow-hidden rounded-xl bg-muted px-3 py-2">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                Serial
              </p>
              <pre className="mt-1 max-h-28 overflow-auto font-mono text-[11px] leading-5 text-foreground/80">
                {log.length
                  ? log.map((l) => l).join("\n")
                  : serial.lastRaw || (demo ? "demo sweep" : "waiting for Arduino…")}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col justify-center rounded-xl bg-muted px-3 py-2.5 sm:px-3.5 sm:py-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground sm:text-[0.7rem]">
        {label}
      </p>
      <p className="mt-0.5 break-words font-mono text-base font-extrabold tabular-nums leading-tight sm:text-lg">
        {value}
      </p>
    </div>
  );
}
