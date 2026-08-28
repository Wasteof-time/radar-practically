# radar-practically

**make this, run this, and flex with your peers.**

Live ultrasonic radar in the browser. Sweep a servo, ping an HC-SR04, stream `angle,distance.` over USB, watch the CRT-ish scan on the site.

Built by **wasteof-time (JCKAWIN)** for Robotics Club VITC.

**Live:** [sonar-rc.netlify.app](https://sonar-rc.netlify.app)

No Arduino on you? Open the site in any browser, leave **Demo on**, and still look like you know what a radar is.

Chrome or Edge is required for **Connect Arduino** (Web Serial). Safari / Firefox can still run the demo sweep.

---

## What you get

- Next.js playground that draws a 180° radar from live pings
- Demo sweep so the page is never a dead screen
- Web Serial hookup to a real Arduino Uno R3
- Range scale: 40 / 100 / 200 / 400 cm
- Live readouts: angle, distance, object count, pings/sec
- Sketch in `arduino/radar.ino` that already speaks the format the site expects

---

## Hardware

| Piece | Pin / note |
| --- | --- |
| Arduino Uno R3 | USB to the laptop running Chrome / Edge |
| Servo (SG90 or similar) | signal → **D12** |
| HC-SR04 ultrasonic | TRIG → **D10**, ECHO → **D11** |
| Power | 5V + GND. If the servo jitters, give it its **own 5V** and tie grounds together |

Sweep in the sketch is **15° → 165°** and back. The UI maps 0° to the right, 90° up, 180° to the left — same convention as the classic Processing radar sketches.

Distance `0` means no echo (timeout / out of range). A blip is only drawn when the reading is between 0 and the range scale you picked.

---

## Flash the Arduino

1. Wire it like the table above.
2. Open `arduino/radar.ino` in the Arduino IDE.
3. Board: **Arduino Uno**. Port: whatever COM / `/dev/tty…` showed up.
4. Upload. Serial is **9600 baud**.

The sketch prints one packet per ping:

```
90,42.
```

That is `angle,distance.` — the HowToMechatronics-style line. The site also accepts:

```
90,42
90;42
{"angle":90,"distance":42}
angle:90 distance:42
```

---

## Run the site locally

Need [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```bash
git clone https://github.com/Wasteof-time/radar-practically.git
cd radar-practically
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm build && pnpm start   # production locally
```

The public build lives on Netlify at [sonar-rc.netlify.app](https://sonar-rc.netlify.app).

---

## Hook the board to the page

1. Plug in the Uno.
2. On the site: baud **9600**, click **Connect Arduino**, pick the port.
3. Demo turns off by itself when serial pings start landing.
4. **Clear traces** wipes old blips. **Disconnect** when you are done.

If Web Serial is missing, the page tells you. Demo still runs.

---

## Repo map

```
app/components/RadarCanvas.tsx      canvas sweep + traces
app/components/RadarPlayground.tsx  UI, demo loop, serial wiring
lib/parseRadar.ts                   serial packet parser
lib/radar.ts                        frame, bins, demo room
lib/useSerialRadar.ts               Web Serial hook
arduino/radar.ino                   Uno + servo + HC-SR04
```

---

## Club notes

This is a workshop toy, not a ranging instrument. HC-SR04 lies in weird rooms, at angles, and on soft surfaces. Use it to learn the loop (move → ping → print → draw), then go flex on whoever is still stuck in the serial monitor.

Issues and PRs are fine if you actually ran it.

**wasteof-time (JCKAWIN)** · Robotics Club VITC
