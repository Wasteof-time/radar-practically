/*
  Radar Playground — Arduino sketch
  Robotics Club VITC

  Hardware (same pinout as the classic ultrasonic radar tutorials):
    Servo signal  -> D12
    HC-SR04 TRIG  -> D10
    HC-SR04 ECHO  -> D11
    VCC / GND     -> 5V and GND (servo on an external 5V supply if it jitters)

  Serial protocol (9600 baud), one packet per ping:
      angle,distance.
    example:  90,42.

  The website reads that over Web Serial and draws the radar.
*/

#include <Servo.h>

const int TRIG_PIN = 10;
const int ECHO_PIN = 11;
const int SERVO_PIN = 12;

const int ANGLE_MIN = 15;
const int ANGLE_MAX = 165;
const int STEP_MS = 30;      // delay between steps (ms)
const int MAX_CM = 200;      // treat farther / timeout as no echo

Servo radarServo;

long readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 25000); // ~4 m timeout
  if (duration == 0) return 0;
  long cm = duration * 0.0343 / 2.0;
  if (cm <= 0 || cm > MAX_CM) return 0;
  return cm;
}

void ping(int angle) {
  radarServo.write(angle);
  delay(STEP_MS);
  long distance = readDistanceCm();
  Serial.print(angle);
  Serial.print(",");
  Serial.print(distance);
  Serial.print(".");
}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  radarServo.attach(SERVO_PIN);
  Serial.begin(9600);
  radarServo.write(ANGLE_MIN);
  delay(300);
}

void loop() {
  for (int angle = ANGLE_MIN; angle <= ANGLE_MAX; angle++) {
    ping(angle);
  }
  for (int angle = ANGLE_MAX; angle >= ANGLE_MIN; angle--) {
    ping(angle);
  }
}
