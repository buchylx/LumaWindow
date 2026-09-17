import type { SceneEngine } from "../../../packages/scene-engine/src";
import { defaults } from "../../../packages/scene-sdk/src";
import { manifest } from "../../../scenes/cloudsea-railway/manifest";
import { isDesktop } from "../../../packages/platform/src";

export async function runSelfTest(
  engine: SceneEngine,
  signal: AbortSignal,
  progress: (text: string) => void,
) {
  const records: unknown[] = [];
  const quick =
    new URLSearchParams(location.search).get("selftest") === "quick";
  const testParams = quick ? { ...defaults, cycleMinutes: 1 } : defaults;
  const duration = quick ? 60 : 7200;
  async function record(data: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      buildId: __BUILD_ID__,
      ...data,
    };
    records.push(entry);
    if (isDesktop()) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("record_validation", { entry: JSON.stringify(entry) });
    }
    progress(JSON.stringify(entry));
  }
  const delay = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));
  try {
    await record({
      event: "start",
      mode: quick ? "quick" : "soak",
      duration,
      userAgent: navigator.userAgent,
      viewport: engine.getViewport(),
    });
    for (let i = 0; i < 50 && !signal.aborted; i++) {
      const ok = await engine.load(
        () => manifest.load("side"),
        "side",
        8472 + i,
        testParams,
      );
      await delay(350);
      const stats = engine.instance?.stats();
      if (!ok || !stats || stats.calls === 0)
        throw Error(`第 ${i + 1} 次切换未产生画面`);
      await record({
        event: "switch",
        index: i + 1,
        stats,
        elapsed: engine.clock.elapsed,
      });
    }
    if (signal.aborted) return;
    if (quick) {
      await engine.load(() => manifest.load("side"), "side", 8472, {
        ...testParams,
        speed: 0,
      });
      const stopped = engine.instance?.stats();
      await delay(2000);
      const windy = engine.instance?.stats();
      if (
        !stopped ||
        !windy ||
        stopped.distance !== windy.distance ||
        !(windy.skyWind! > stopped.skyWind!)
      )
        throw Error("停止列车时，独立风速或行进距离异常");
      engine.paused = true;
      try {
        const frozen = engine.instance?.stats();
        await delay(600);
        const after = engine.instance?.stats();
        if (
          !frozen ||
          !after ||
          frozen.skyWind !== after.skyWind ||
          frozen.distance !== after.distance ||
          frozen.phase !== after.phase
        )
          throw Error("暂停后景物、天空或昼夜仍在推进");
        await record({ event: "motion-check", stopped, windy, frozen, after });
      } finally {
        engine.paused = false;
      }
    }
    if (signal.aborted) return;
    await engine.load(() => manifest.load("side"), "side", 8472, testParams);
    await record({ event: "switches-complete", count: 50 });
    const start = performance.now();
    const activeStart = engine.clock.elapsed;
    let nextSample = 0;
    while (engine.clock.elapsed - activeStart < duration && !signal.aborted) {
      await delay(1000);
      if (performance.now() - start >= nextSample) {
        nextSample += quick ? 10000 : 60000;
        await record({
          event: quick ? "quick-sample" : "soak-sample",
          wallSeconds: (performance.now() - start) / 1000,
          activeSeconds: engine.clock.elapsed - activeStart,
          frameMs: engine.frameMs,
          cpuMs: engine.cpuMs,
          stats: engine.instance?.stats(),
          hidden: document.hidden,
        });
      }
    }
    if (!signal.aborted)
      await record({
        event: quick ? "quick-complete" : "soak-complete",
        wallSeconds: (performance.now() - start) / 1000,
        activeSeconds: engine.clock.elapsed - activeStart,
        stats: engine.instance?.stats(),
      });
  } catch (error) {
    await record({ event: "failed", error: String(error) });
  }
  return records;
}
