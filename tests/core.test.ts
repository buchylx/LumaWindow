import { describe, it, expect, vi } from "vitest";
import {
  viewport,
  budgets,
  chooseVariant,
  validateParams,
  defaults,
  random,
  type SceneInstance,
} from "../packages/scene-sdk/src";
import { ActivityClock, SceneEngine } from "../packages/scene-engine/src";

describe("parameters", () => {
  it("rejects NaN and invalid palettes; clamps finite values", () => {
    expect(
      validateParams({
        speed: NaN,
        clouds: 9,
        fog: -1,
        cloudShape: Infinity,
        framing: 10,
        palette: "bad" as never,
      }),
    ).toEqual({ ...defaults, clouds: 1, fog: 0, framing: 1 });
  });
  it("does not mutate defaults", () => {
    validateParams({ speed: 1 });
    expect(defaults.speed).toBe(0.2);
  });
});
describe("viewport budget", () => {
  for (const quality of ["eco", "balanced", "high"] as const)
    for (const [w, h] of [
      [3840, 2160],
      [2160, 3840],
      [2560, 1080],
    ])
      it(`${quality} ${w}x${h} is bounded at retina scale`, () => {
        const v = viewport(w, h, 2, quality);
        expect(v.pixelWidth * v.pixelHeight).toBeLessThanOrEqual(
          budgets[quality].pixels,
        );
        expect(v.aspect).toBe(w / h);
      });
  it("handles hidden zero dimensions", () => {
    expect(viewport(0, 0, 0, "eco").pixelWidth).toBeGreaterThan(0);
  });
});
describe("composition", () => {
  it("holds orientation in neutral band", () => {
    expect(chooseVariant("auto", 1, "forward")).toBe("forward");
    expect(chooseVariant("auto", 1)).toBe("side");
  });
  it("uses thresholds and respects manual choice", () => {
    expect(chooseVariant("auto", 0.85)).toBe("forward");
    expect(chooseVariant("auto", 1.15, "forward")).toBe("side");
    expect(chooseVariant("side", 0.5)).toBe("side");
  });
});
describe("time and seed", () => {
  it("freezes suspended time and caps gaps", () => {
    const c = new ActivityClock();
    c.tick(0);
    c.tick(50);
    c.resetFrame();
    c.tick(999999);
    expect(c.elapsed).toBe(0.05);
    expect(c.tick(1000999)).toBe(0.1);
  });
  it("reproduces seed without identical different seed streams", () => {
    const a = random(42),
      b = random(42),
      c = random(43);
    expect([a(), a()]).toEqual([b(), b()]);
    expect(a()).not.toBe(c());
  });
});
describe("engine cancellation", () => {
  const instance = (): SceneInstance => ({
    resize: vi.fn(),
    setParams: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    stats: () => ({ geometries: 0, textures: 0, calls: 0, triangles: 0 }),
  });
  it("disposes a late creation and retains newest instance", async () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const engine = new SceneEngine(
      { clientWidth: 800, clientHeight: 600 } as HTMLCanvasElement,
      vi.fn(),
    );
    let resolve!: (i: SceneInstance) => void;
    const old = instance(),
      current = instance();
    const a = engine.load(
      async () => ({
        create: () =>
          new Promise((r) => {
            resolve = r;
          }),
      }),
      "side",
      1,
      defaults,
    );
    await Promise.resolve();
    await engine.load(
      async () => ({ create: async () => current }),
      "forward",
      1,
      defaults,
    );
    resolve(old);
    await a;
    expect(old.dispose).toHaveBeenCalledOnce();
    expect(engine.instance).toBe(current);
    engine.dispose();
    engine.dispose();
    expect(current.dispose).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
  it("removes a failed first-render instance before retrying", async () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const error = vi.fn();
    const e = new SceneEngine(
      { clientWidth: 800, clientHeight: 600 } as HTMLCanvasElement,
      error,
    );
    const failed = instance();
    failed.render = () => {
      throw new Error("render failed");
    };
    expect(
      await e.load(
        async () => ({ create: async () => failed }),
        "side",
        1,
        defaults,
      ),
    ).toBe(false);
    expect(e.instance).toBeUndefined();
    expect(failed.dispose).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith("render failed");
    const next = instance();
    expect(
      await e.load(
        async () => ({ create: async () => next }),
        "side",
        1,
        defaults,
      ),
    ).toBe(true);
    expect(e.instance).toBe(next);
    expect(failed.dispose).toHaveBeenCalledOnce();
    e.dispose();
    vi.unstubAllGlobals();
  });
  it("reports failure and can load again", async () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const error = vi.fn();
    const e = new SceneEngine(
      { clientWidth: 800, clientHeight: 600 } as HTMLCanvasElement,
      error,
    );
    await e.load(
      async () => {
        throw Error("failed");
      },
      "side",
      1,
      defaults,
    );
    expect(error).toHaveBeenCalledWith("failed");
    expect(
      await e.load(
        async () => ({ create: async () => instance() }),
        "side",
        1,
        defaults,
      ),
    ).toBe(true);
    e.dispose();
    vi.unstubAllGlobals();
  });
});
