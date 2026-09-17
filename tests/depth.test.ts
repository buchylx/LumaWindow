import { describe, expect, it } from "vitest";
import {
  fogAtDepth,
  layerOrder,
  railwayDepth,
  skyOffset,
} from "../scenes/cloudsea-railway/depth";
import { natureLayers } from "../scenes/cloudsea-railway/nature";
import { createNature, createSky } from "../scenes/cloudsea-railway/nature";
import { PlaneGeometry } from "three";
import { createLighting } from "../scenes/cloudsea-railway/lighting";
import { defaults } from "../scenes/cloudsea-railway/params";

describe("scene depth contract", () => {
  it("preserves cloud distance contrast in clear weather throughout the day", () => {
    const geometry = new PlaneGeometry(),
      nature = createNature(geometry, 8472),
      lighting = createLighting();
    const clouds = nature.group.children.filter(
      (_, i) => natureLayers[i].kind === "cloud",
    ) as import("three").Mesh<PlaneGeometry, import("three").ShaderMaterial>[];
    const luminance = (c: import("three").Color) =>
      0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    for (const phase of [0, 0.3, 0.48, 0.74, 0.84]) {
      lighting.update(phase);
      nature.update(0, 889, 500, { ...defaults, fog: 0 }, lighting);
      const far = clouds[0].material.uniforms,
        near = clouds.at(-1)!.material.uniforms;
      expect(luminance(far.body.value)).toBeGreaterThan(
        luminance(near.body.value) * 1.7,
      );
      expect(luminance(far.shadow.value)).toBeGreaterThan(
        luminance(near.shadow.value) * 1.5,
      );
      expect(far.sunX.value).toBe(lighting.sunX);
      expect(near.moonX.value).toBe(lighting.moonX);
    }
    nature.dispose();
    geometry.dispose();
  });
  it("keeps every occluding layer faster than the layer it covers, including the bridge", () => {
    const layers = [
      ...natureLayers.map((l) => ({
        order: layerOrder(l.depth),
        speed: l.depth,
      })),
      { order: 40, speed: railwayDepth },
    ].sort((a, b) => a.order - b.order);
    for (let i = 1; i < layers.length; i++)
      expect(layers[i].speed).toBeGreaterThan(layers[i - 1].speed);
  });
  it("makes full fog perceptibly stronger at distance while preserving foreground contrast", () => {
    expect(fogAtDepth(1, 0.06) - fogAtDepth(0, 0.06)).toBeGreaterThan(0.8);
    expect(fogAtDepth(1, 2.4)).toBeLessThan(0.4);
    for (const amount of [0.1, 0.28, 0.5, 1])
      expect(fogAtDepth(amount, 0.24)).toBeGreaterThan(
        fogAtDepth(amount, 1.85),
      );
  });
  it("moves the sky independently of a stopped train", () => {
    expect(skyOffset(0, 132) - skyOffset(0, 0)).toBe(132);
    expect(skyOffset(500, 132) - skyOffset(400, 132)).toBeCloseTo(2.2);
  });
  it("updates the rendered layer uniforms without allocating new scene objects", () => {
    const geo = new PlaneGeometry(),
      nature = createNature(geo, 8472),
      sky = createSky(geo, 8472),
      lighting = createLighting();
    lighting.update(0.48);
    nature.update(0, 889, 500, { ...defaults, fog: 0 }, lighting);
    const before = nature.group.children.map((o) => ({
      object: o,
      fog: (
        o as import("three").Mesh<PlaneGeometry, import("three").ShaderMaterial>
      ).material.uniforms.fog.value,
    }));
    nature.update(250, 889, 500, { ...defaults, fog: 1 }, lighting);
    nature.group.children.forEach((o, i) => {
      expect(o).toBe(before[i].object);
      const uniforms = (
        o as import("three").Mesh<PlaneGeometry, import("three").ShaderMaterial>
      ).material.uniforms;
      expect(uniforms.fog.value).toBeGreaterThan(before[i].fog);
      expect(uniforms.travel.value).toBeCloseTo(250 * natureLayers[i].depth);
    });
    nature.dispose();
    sky.material.dispose();
    sky.veilMaterial.dispose();
    geo.dispose();
  });
});
