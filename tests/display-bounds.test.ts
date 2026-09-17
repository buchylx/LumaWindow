import { describe, expect, it } from "vitest";
import { recoveryTarget } from "../packages/platform/src/display-bounds";

describe("disconnected monitor recovery", () => {
  const primary = { x: 0, y: 0, width: 1920, height: 1040 };
  it("leaves an accessible window on a negative-coordinate portrait monitor", () => {
    const portrait = { x: -1080, y: -400, width: 1080, height: 1920 };
    const window = { x: -1000, y: -300, width: 900, height: 1500 };
    expect(recoveryTarget(window, [primary, portrait])).toBeNull();
    const target = recoveryTarget(window, [primary])!;
    expect(target.x).toBeGreaterThanOrEqual(0);
    expect(target.y).toBeGreaterThanOrEqual(0);
    expect(target.y + target.height).toBeLessThanOrEqual(primary.height);
  });
  it("recovers when the body is visible but its title bar is off screen", () => {
    expect(
      recoveryTarget({ x: 100, y: -500, width: 800, height: 900 }, [primary]),
    ).not.toBeNull();
  });
  it("chooses the nearest remaining screen and fits oversized bounds", () => {
    const area = { x: 3000, y: 0, width: 1280, height: 720 };
    const target = recoveryTarget(
      { x: 6000, y: 0, width: 4000, height: 3000 },
      [primary, area],
    )!;
    expect(target.x).toBeGreaterThanOrEqual(area.x);
    expect(target.x + target.width).toBeLessThanOrEqual(area.x + area.width);
    expect(target.y + target.height).toBeLessThanOrEqual(area.height);
  });
  it("does not invent a monitor during temporary empty enumeration", () => {
    expect(
      recoveryTarget({ x: 9000, y: 9000, width: 800, height: 600 }, []),
    ).toBeNull();
  });
});
