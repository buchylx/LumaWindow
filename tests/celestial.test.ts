import { describe, expect, it } from "vitest";
import { celestialOrbit } from "../scenes/cloudsea-railway/celestial";
import { createLighting } from "../scenes/cloudsea-railway/lighting";

describe("continuous celestial motion", () => {
  it("rises in the east, crosses the sky and sets in the west", () => {
    const dawn = celestialOrbit(0.25).sun,
      noon = celestialOrbit(0.5).sun,
      dusk = celestialOrbit(0.75).sun;
    expect(dawn.x).toBeCloseTo(-1);
    expect(dawn.altitude).toBeCloseTo(0);
    expect(noon.x).toBeCloseTo(0);
    expect(noon.altitude).toBeCloseTo(1);
    expect(dusk.x).toBeCloseTo(1);
    expect(dusk.altitude).toBeCloseTo(0);
    for (let i = 26; i < 75; i++)
      expect(celestialOrbit(i / 100).sun.x).toBeGreaterThan(
        celestialOrbit((i - 1) / 100).sun.x,
      );
  });
  it("continues through midnight and hides the body below the horizon", () => {
    const a = celestialOrbit(1 - 1e-6),
      b = celestialOrbit(1 + 1e-6);
    expect(Math.abs(a.moon.x - b.moon.x)).toBeLessThan(0.00002);
    expect(a.sunOpacity).toBe(0);
    expect(a.moonOpacity).toBe(1);
    expect(celestialOrbit(0.5).moonOpacity).toBe(0);
    expect(celestialOrbit(0.5).sunOpacity).toBe(1);
    for (let i = 0; i < 100; i++) {
      const orbit = celestialOrbit(i / 100);
      expect(orbit.sun.altitude + orbit.moon.altitude).toBeCloseTo(0);
      expect(orbit.sunOpacity).toBeGreaterThanOrEqual(0);
      expect(orbit.sunOpacity).toBeLessThanOrEqual(1);
    }
  });
  it("hands lighting from sun to moon without a direction jump", () => {
    const light = createLighting();
    light.update(0);
    let x = light.lightX,
      y = light.lightY;
    for (let i = 1; i <= 10000; i++) {
      light.update(i / 10000);
      expect(Math.abs(light.lightX - x)).toBeLessThan(0.005);
      expect(Math.abs(light.lightY - y)).toBeLessThan(0.005);
      x = light.lightX;
      y = light.lightY;
    }
  });
});
