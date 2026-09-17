import { afterEach, describe, expect, it, vi } from "vitest";
import { SceneEngine } from "../packages/scene-engine/src";
import { applySystemEvent } from "../packages/platform/src/lifecycle";
import {
  defaults,
  type SceneInstance,
  type CreateContext,
} from "../packages/scene-sdk/src";

function fixture() {
  const callbacks = new Map<number, FrameRequestCallback>();
  let next = 1;
  const doc = {
    hidden: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = next++;
    callbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  const engine = new SceneEngine(
    { clientWidth: 800, clientHeight: 600 } as HTMLCanvasElement,
    vi.fn(),
  );
  const scene: SceneInstance = {
    update: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    setParams: vi.fn(),
    dispose: vi.fn(),
    stats: () => ({ geometries: 0, textures: 0, calls: 0, triangles: 0 }),
  };
  const load = () =>
    engine.load(
      async () => ({ create: async () => scene }),
      "side",
      1,
      defaults,
    );
  const frame = (now: number) => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(now));
  };
  const visibility = (hidden: boolean) => {
    doc.hidden = hidden;
    const callback = doc.addEventListener.mock.calls.find(
      ([name]) => name === "visibilitychange",
    )?.[1];
    callback();
  };
  return { engine, scene, callbacks, doc, load, frame, visibility };
}
afterEach(() => vi.unstubAllGlobals());

describe("event-driven frame suspension", () => {
  it("does not resume a sleeping or minimized Mac just because its window becomes visible", async () => {
    const f = fixture();
    f.engine.start();
    await f.load();
    f.frame(100);
    f.frame(150);
    applySystemEvent(f.engine, "occluded");
    applySystemEvent(f.engine, "screen-sleep");
    applySystemEvent(f.engine, "minimized");
    expect(f.callbacks.size).toBe(0);
    applySystemEvent(f.engine, "visible");
    applySystemEvent(f.engine, "screen-wake");
    expect(f.engine.suspended).toBe(true);
    expect(f.callbacks.size).toBe(0);
    applySystemEvent(f.engine, "restored");
    expect(f.callbacks.size).toBe(1);
    f.frame(100000);
    expect(f.engine.clock.elapsed).toBeCloseTo(0.05);
    f.engine.dispose();
  });
  it("applies parameter changes while paused without advancing activity", async () => {
    const f = fixture();
    f.engine.start();
    await f.load();
    f.frame(100);
    f.frame(150);
    f.engine.paused = true;
    const elapsed = f.engine.clock.elapsed;
    f.engine.setParams({ ...defaults, daylight: 0, timeMode: "fixed" });
    expect(f.scene.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ delta: 0, elapsed }),
    );
    expect(f.engine.clock.elapsed).toBe(elapsed);
    expect(f.callbacks.size).toBe(0);
    f.engine.dispose();
  });
  it("passes captured scene state through a reload for daylight restoration", async () => {
    const f = fixture();
    await f.load();
    f.scene.captureState = () => ({ phase: 0.38, distance: 100, seed: 1 });
    let context: CreateContext | undefined;
    await f.engine.load(
      async () => ({
        create: async (c) => {
          context = c;
          return { ...f.scene };
        },
      }),
      "side",
      1,
      defaults,
    );
    expect(context?.state).toEqual({ phase: 0.38, distance: 100, seed: 1 });
    expect(context?.elapsed).toBe(f.engine.clock.elapsed);
    f.engine.dispose();
  });
  it("recovers a render fault without overwriting the user's pause choice", async () => {
    const f = fixture();
    f.engine.start();
    await f.load();
    vi.mocked(f.scene.render).mockImplementationOnce(() => {
      throw Error("GPU fault");
    });
    f.frame(100);
    expect(f.engine.suspended).toBe(true);
    expect(f.engine.paused).toBe(false);
    expect(f.callbacks.size).toBe(0);
    f.engine.paused = true;
    await f.load();
    expect(f.engine.suspended).toBe(false);
    expect(f.engine.paused).toBe(true);
    expect(f.callbacks.size).toBe(0);
    f.engine.paused = false;
    expect(f.callbacks.size).toBe(1);
    f.engine.dispose();
  });
  it("keeps overlapping native suspension reasons and manual pause independent", async () => {
    const f = fixture();
    f.engine.start();
    await f.load();
    f.frame(100);
    f.frame(150);
    applySystemEvent(f.engine, "session-lock");
    applySystemEvent(f.engine, "system-suspend");
    expect(f.callbacks.size).toBe(0);
    applySystemEvent(f.engine, "system-resume");
    expect(f.engine.suspended).toBe(true);
    expect(f.callbacks.size).toBe(0);
    f.engine.paused = true;
    applySystemEvent(f.engine, "session-unlock");
    expect(f.engine.suspended).toBe(false);
    expect(f.engine.paused).toBe(true);
    expect(f.callbacks.size).toBe(0);
    f.engine.paused = false;
    f.frame(100000);
    expect(f.engine.clock.elapsed).toBeCloseTo(0.05);
    applySystemEvent(f.engine, "minimized");
    expect(f.callbacks.size).toBe(0);
    applySystemEvent(f.engine, "restored");
    expect(f.callbacks.size).toBe(1);
    f.engine.dispose();
  });
  it("does not schedule without a scene and starts exactly one loop after load", async () => {
    const f = fixture();
    f.engine.start();
    f.engine.start();
    expect(f.callbacks.size).toBe(0);
    await f.load();
    expect(f.callbacks.size).toBe(1);
    f.frame(100);
    f.frame(140);
    expect(f.engine.clock.elapsed).toBeCloseTo(0.04);
    f.engine.paused = true;
    expect(f.callbacks.size).toBe(0);
    const draws = vi.mocked(f.scene.render).mock.calls.length;
    f.engine.resize();
    expect(f.scene.render).toHaveBeenCalledTimes(draws + 1);
    expect(f.callbacks.size).toBe(0);
    f.frame(90000);
    expect(f.engine.clock.elapsed).toBeCloseTo(0.04);
    f.engine.paused = false;
    f.engine.paused = false;
    expect(f.callbacks.size).toBe(1);
    f.frame(90040);
    expect(f.engine.clock.elapsed).toBeCloseTo(0.04);
    f.engine.dispose();
    expect(f.callbacks.size).toBe(0);
  });
  it("does not wake a paused scene on visibility restoration", async () => {
    const f = fixture();
    f.engine.start();
    await f.load();
    f.visibility(true);
    expect(f.callbacks.size).toBe(0);
    f.engine.paused = true;
    f.visibility(false);
    expect(f.callbacks.size).toBe(0);
    f.engine.paused = false;
    expect(f.callbacks.size).toBe(1);
    f.engine.dispose();
    expect(f.doc.removeEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      f.doc.addEventListener.mock.calls[0][1],
    );
    f.visibility(false);
    expect(f.callbacks.size).toBe(0);
  });
  it("does not draw or clear a suspension when a paused window resizes", async () => {
    const f = fixture();
    f.engine.start();
    await f.load();
    f.engine.paused = true;
    for (const reason of ["session", "sleep", "graphics", "render-error"]) {
      f.engine.setSuspended(reason, true);
      const draws = vi.mocked(f.scene.render).mock.calls.length;
      f.engine.resize();
      expect(f.scene.render).toHaveBeenCalledTimes(draws);
      expect(f.engine.suspended).toBe(true);
      expect(f.callbacks.size).toBe(0);
      f.engine.setSuspended(reason, false);
    }
    f.engine.dispose();
  });
  it("suspends during async creation and resumes after it completes", async () => {
    const f = fixture();
    f.engine.start();
    await f.load();
    let finish!: (scene: SceneInstance) => void;
    const pending = f.engine.load(
      async () => ({
        create: () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      }),
      "forward",
      2,
      defaults,
    );
    await Promise.resolve();
    expect(f.callbacks.size).toBe(0);
    finish({ ...f.scene });
    await pending;
    expect(f.callbacks.size).toBe(1);
    f.engine.dispose();
  });
});
