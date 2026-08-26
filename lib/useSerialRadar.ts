"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { consumeRadarBuffer } from "./parseRadar";
import type { RadarPing } from "./radar";

export type SerialStatus = "idle" | "connecting" | "open" | "error";

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200] as const;
export { BAUD_RATES };

export function useSerialRadar(onPings: (pings: RadarPing[], raw: string) => void) {
  const [status, setStatus] = useState<SerialStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const supported = useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== "undefined" && "serial" in navigator,
    () => false,
  );
  const [baudRate, setBaudRate] = useState<(typeof BAUD_RATES)[number]>(9600);
  const [lastRaw, setLastRaw] = useState("");

  const onPingsRef = useRef(onPings);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const keepReadingRef = useRef(false);
  const baudRef = useRef(baudRate);

  useEffect(() => {
    onPingsRef.current = onPings;
  }, [onPings]);

  useEffect(() => {
    baudRef.current = baudRate;
  }, [baudRate]);

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    const reader = readerRef.current;
    readerRef.current = null;
    try {
      await reader?.cancel();
    } catch {
      /* already closed */
    }
    try {
      reader?.releaseLock();
    } catch {
      /* ignore */
    }
    const port = portRef.current;
    portRef.current = null;
    try {
      await port?.close();
    } catch {
      /* ignore */
    }
    setStatus("idle");
  }, []);

  const connect = useCallback(async () => {
    const serial = navigator.serial;
    if (!serial) {
      setStatus("error");
      setError("Web Serial is not available in this browser. Use Chrome or Edge.");
      return;
    }

    setError(null);

    try {
      await disconnect();
      setStatus("connecting");
      const port = await serial.requestPort();
      await port.open({ baudRate: baudRef.current });
      portRef.current = port;
      keepReadingRef.current = true;
      setStatus("open");

      const onDisconnect = () => {
        void disconnect();
        setError("Arduino disconnected.");
        setStatus("error");
      };
      port.addEventListener("disconnect", onDisconnect);

      const readable = port.readable;
      if (!readable) throw new Error("Port has no readable stream.");

      const reader = readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      (async () => {
        try {
          while (keepReadingRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            if (!value) continue;
            buffer += decoder.decode(value, { stream: true });
            const { pings, rest } = consumeRadarBuffer(buffer);
            buffer = rest;
            if (pings.length) {
              const raw = `${Math.round(pings[pings.length - 1].angle)},${Math.round(pings[pings.length - 1].distance)}`;
              setLastRaw(raw);
              onPingsRef.current(pings, raw);
            }
          }
        } catch (err) {
          if (keepReadingRef.current) {
            setError(err instanceof Error ? err.message : "Serial read failed.");
            setStatus("error");
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {
            /* ignore */
          }
        }
      })();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not open the serial port.";
      if (/No port selected|NotFoundError/i.test(message) || (err as { name?: string })?.name === "NotFoundError") {
        setStatus("idle");
        setError(null);
        return;
      }
      setStatus("error");
      setError(message);
    }
  }, [disconnect]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return {
    status,
    error,
    supported,
    baudRate,
    setBaudRate,
    lastRaw,
    connect,
    disconnect,
  };
}

function emptySubscribe() {
  return () => {};
}
