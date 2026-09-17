import { describe, it, expect } from "vitest";
import { Box3, Matrix4 } from "three";
import { createRailway } from "../scenes/cloudsea-railway/railway";
import { createLighting } from "../scenes/cloudsea-railway/lighting";
import { viewHalfHeight } from "../scenes/cloudsea-railway/composition";

describe("parallel railway composition", () => {
  it("keeps the railway below the vista while zooming and keeps steam attached", () => {
    const railway = createRailway(),
      light = createLighting();
    light.update(0.74);
    let chimneyOffset: number | undefined;
    for (const framing of [0, 0.4, 1]) {
      railway.update(300, 1600, framing, light);
      const screenY =
        0.5 - railway.group.position.y / (2 * viewHalfHeight(framing));
      expect(screenY).toBeCloseTo(0.73);
      const offset = railway.chimney.y - railway.group.position.y;
      if (chimneyOffset !== undefined)
        expect(offset).toBeCloseTo(chimneyOffset);
      chimneyOffset = offset;
    }
    railway.dispose();
  });
  it("keeps the train horizontal and stationary while bridge piers pass behind it", () => {
    const r = createRailway(),
      light = createLighting();
    light.update(0.72);
    r.update(10, 889, 0.4, light);
    r.group.updateMatrixWorld(true);
    const first = r.group.children.find(
      (o) => "isInstancedMesh" in o,
    ) as import("three").InstancedMesh;
    const before = new Matrix4();
    first.getMatrixAt(4, before);
    const train = r.train.position.clone(),
      chimney = r.chimney.clone();
    r.update(20, 889, 0.4, light);
    const after = new Matrix4();
    first.getMatrixAt(4, after);
    expect(after.elements[12] - before.elements[12]).toBeCloseTo(-10);
    expect(after.elements[13]).toBe(0);
    expect(r.train.position.equals(train)).toBe(true);
    expect(r.train.rotation.z).toBe(0);
    expect(r.chimney.equals(chimney)).toBe(true);
    r.dispose();
  });
  it("maintains the long, thin silhouette and covers ultrawide views without growing objects", () => {
    const r = createRailway(),
      light = createLighting();
    light.update(0);
    r.update(0, 889, 0.4, light);
    r.group.updateMatrixWorld(true);
    const b = new Box3().setFromObject(r.train);
    expect((b.max.x - b.min.x) / (b.max.y - b.min.y)).toBeGreaterThan(14);
    expect((b.max.y - b.min.y) / 1000).toBeLessThan(0.04);
    const count = r.group.children.length;
    for (const distance of [100, 10000, 1000000]) {
      r.update(distance, 1600, 0, light);
      expect(r.group.children.length).toBe(count);
      const bridge = r.group.children.find(
        (o) => "isInstancedMesh" in o,
      ) as import("three").InstancedMesh;
      expect(bridge.count).toBeLessThanOrEqual(40);
      const m = new Matrix4();
      bridge.getMatrixAt(bridge.count - 1, m);
      expect(m.elements[12]).toBeGreaterThan(1600);
    }
    r.dispose();
  });
});
