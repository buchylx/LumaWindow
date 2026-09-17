import { describe, expect, it } from "vitest";
import { DayCycle } from "../scenes/cloudsea-railway/day-cycle";
import { defaults, validateParams } from "../scenes/cloudsea-railway/params";
import { createLighting } from "../scenes/cloudsea-railway/lighting";
import {
  district,
  visibleChunks,
} from "../scenes/cloudsea-railway/composition";
import { ActivityClock } from "../packages/scene-engine/src";

describe("daylight continuity", () => {
  it("reselecting the same preset explicitly seeks back to that time", () => {
    const c = new DayCycle(defaults);
    c.advance(90);
    c.configure({ ...defaults, timeRequest: 1, timeMode: "fixed" });
    expect(c.phase).toBeCloseTo(defaults.daylight);
  });
  it("completes a full 30-minute cycle independently of train speed", () => {
    const c = new DayCycle({ ...defaults, speed: 0 });
    c.advance(900);
    expect(c.phase).toBeCloseTo(0.22);
    c.advance(900);
    expect(c.phase).toBeCloseTo(defaults.daylight);
  });
  it("keeps phase when switching duration and auto/fixed mode", () => {
    const c = new DayCycle(defaults);
    c.advance(200);
    const phase = c.phase;
    c.configure({ ...defaults, cycleMinutes: 60 });
    expect(c.phase).toBe(phase);
    c.advance(360);
    expect(c.phase).toBeCloseTo(phase + 0.1);
    c.configure({ ...defaults, timeMode: "fixed" });
    const fixed = c.phase;
    c.advance(1000);
    expect(c.phase).toBe(fixed);
    c.configure(defaults);
    expect(c.phase).toBe(fixed);
  });
  it("explicit time selection and snapshot restoration work", () => {
    const c = new DayCycle(defaults);
    c.configure({ ...defaults, daylight: 0, timeMode: "fixed" });
    expect(c.phase).toBe(0);
    expect(new DayCycle(defaults, 0.92).phase).toBeCloseTo(0.92);
  });
  it("rejects invalid cycle durations and keeps old parameter objects compatible", () => {
    expect(validateParams({ cycleMinutes: NaN }).cycleMinutes).toBe(30);
    expect(validateParams({ cycleMinutes: 0 }).cycleMinutes).toBe(1);
    expect(validateParams({ cycleMinutes: 999 }).cycleMinutes).toBe(120);
  });
  it("has continuous colors at the midnight wrap", () => {
    const a = createLighting(),
      b = createLighting();
    a.update(0.999999);
    b.update(0.000001);
    a.colors.forEach((color, i) =>
      expect(
        Math.abs(color.r - b.colors[i].r) +
          Math.abs(color.g - b.colors[i].g) +
          Math.abs(color.b - b.colors[i].b),
      ).toBeLessThan(0.001),
    );
  });
  it("retains real activity duration while capping simulation steps", () => {
    const c = new ActivityClock();
    c.tick(0);
    expect(c.tick(400)).toBe(0.1);
    expect(c.elapsed).toBe(0.4);
    c.resetFrame();
    c.tick(100000);
    expect(c.elapsed).toBe(0.4);
  });
});
describe("bounded scenery", () => {
  it("generates stable independent districts", () => {
    expect(district(7, 42, 3)).toEqual(district(7, 42, 3));
    expect(district(7, 42, 3)).not.toEqual(district(7, 43, 3));
    expect(district(7, 42, 3)).not.toEqual(district(8, 42, 3));
  });
  it("keeps a fixed window of chunks over long travel", () => {
    for (const distance of [0, 480, 100000, 100000000]) {
      const { first, last } = visibleChunks(distance, 2200, 0.3);
      expect(last - first + 1).toBeLessThanOrEqual(14);
    }
  });
});
