import { describe, expect, it } from "vitest";
import {
  createJourney,
  region,
  regionLength,
  sampleJourney,
  journeyColumns,
} from "../scenes/cloudsea-railway/journey";
import { natureLayers } from "../scenes/cloudsea-railway/nature";
import { createLighting } from "../scenes/cloudsea-railway/lighting";
import {
  createPassengerTrain,
  coachDimensions,
} from "../scenes/cloudsea-railway/train";

describe("continuous journey", () => {
  it("reproduces locations, varies seeds and visits all three rule families", () => {
    const samples = Array.from({ length: 120 }, (_, i) => region(8472, i - 60));
    expect(new Set(samples.map((s) => s.kind)).size).toBe(3);
    expect(samples).toEqual(
      Array.from({ length: 120 }, (_, i) => region(8472, i - 60)),
    );
    expect(sampleJourney(8472, 1500)).not.toEqual(sampleJourney(8473, 1500));
  });
  it("is continuous through positive and negative region boundaries", () => {
    for (let i = -20; i <= 20; i++) {
      const a = sampleJourney(8472, i * regionLength - 0.001),
        b = sampleJourney(8472, i * regionLength + 0.001);
      a.forEach((v, j) => expect(Math.abs(v - b[j])).toBeLessThan(0.00001));
    }
  });
  it("keeps fixed storage across long travel and does not upload a stationary world", () => {
    const j = createJourney(
      8472,
      natureLayers.map((l) => l.depth),
    );
    const data = j.texture.image.data,
      texture = j.texture;
    expect(j.update(0)).toBe(true);
    expect(j.update(0)).toBe(false);
    for (const d of [10000, 100000, 1000000]) {
      j.update(d);
      expect(j.texture).toBe(texture);
      expect(j.texture.image.data).toBe(data);
      expect(data.length).toBe(journeyColumns * natureLayers.length * 4);
      natureLayers.forEach((l, row) => {
        // Widest supported viewport fits inside the guarded table, not its edge.
        expect(d * l.depth - 3200).toBeGreaterThan(
          j.starts[row] * regionLength,
        );
        expect(d * l.depth + 3200).toBeLessThan(
          (j.starts[row] + journeyColumns - 2) * regionLength,
        );
      });
    }
    j.dispose();
  });
  it("matches quantized CPU region data when a streaming window recentres", () => {
    const j = createJourney(33, [1]);
    j.update(0);
    const column = 18,
      a = Array.from(j.texture.image.data.slice(column * 4, column * 4 + 4));
    j.update(regionLength);
    expect(
      Array.from(j.texture.image.data.slice((column - 1) * 4, column * 4)),
    ).toEqual(a);
    j.dispose();
  });
});
describe("lighting and train regressions", () => {
  it("keeps all material roles continuous across the day/night seam", () => {
    const a = createLighting(),
      b = createLighting();
    a.update(1 - 0.000001);
    b.update(0.000001);
    for (const key of Object.keys(a.roles) as (keyof typeof a.roles)[]) {
      const ca = a.roles[key],
        cb = b.roles[key];
      expect(
        Math.abs(ca.r - cb.r) + Math.abs(ca.g - cb.g) + Math.abs(ca.b - cb.b),
      ).toBeLessThan(0.001);
    }
  });
  it("keeps the passenger proportions and the train in the transparent depth ordering", () => {
    expect(coachDimensions.length / coachDimensions.bodyHeight).toBeGreaterThan(
      4.5,
    );
    const train = createPassengerTrain();
    for (const child of train.group.children) {
      const mesh = child as import("three").Mesh<
        import("three").BufferGeometry,
        import("three").MeshBasicMaterial
      >;
      expect(mesh.material.transparent).toBe(true);
      expect(mesh.renderOrder).toBeGreaterThanOrEqual(48);
      expect(mesh.renderOrder).toBeLessThan(55);
    }
    train.dispose();
  });
});
