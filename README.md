# Radar Playground

Live ultrasonic radar for Robotics Club VITC. Connect an Arduino over USB, stream **angle** and **distance**, and watch the sweep on the website.

Same stack and look as the PWM playground: Next.js, React, Tailwind, CRT-style canvas.

## Run the site

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Chrome or Edge is required for **Connect Arduino** (Web Serial). Safari / Firefox can still run the demo sweep.

## Arduino

1. Wire a servo + HC-SR04 as in `arduino/radar.ino` (servo D12, TRIG D10, ECHO D11).
2. Flash that sketch (9600 baud).
3. On the site: pick **9600**, click **Connect Arduino**, choose the COM port.

### Serial format

One packet per ping:

```
90,42.
```

That’s `angle,distance.` — the classic tutorial format. Newline-terminated `90,42` and JSON `{"angle":90,"distance":42}` also work.

`0` distance means no echo (out of range). The radar only draws a blip when distance is between 0 and the range scale (40 / 100 / 200 / 400 cm).

0° is the right side of the screen, 90° is up, 180° is left — matching the usual Processing radar sketch.
