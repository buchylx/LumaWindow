import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";
import {
  availableMonitors,
  getCurrentWindow,
  PhysicalPosition,
} from "@tauri-apps/api/window";
import {
  moveToDisplay,
  recoverOffscreenWindow,
} from "../../../packages/platform/src";
import { recoveryTarget } from "../../../packages/platform/src/display-bounds";
import type { Rect } from "../../../packages/platform/src/display-bounds";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  openControls,
  type PlayerSnapshot,
} from "../../../packages/platform/src/control";
import type { SceneEngine } from "../../../packages/scene-engine/src";

export async function runPlatformProbe(
  engine: SceneEngine,
  progress: (s: string) => void,
) {
  const record = async (event: string, details: unknown = {}) => {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      buildId: __BUILD_ID__,
      event,
      details,
    });
    progress(entry);
    await invoke("record_validation", { entry });
  };
  const until = async (predicate: () => boolean | Promise<boolean>) => {
    const deadline = performance.now() + 15000;
    while (!(await predicate())) {
      if (performance.now() > deadline) throw Error("Platform probe timed out");
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };
  let off: (() => void) | undefined;
  const w = getCurrentWindow();
  const fits = async (areas: Rect[]) => {
    const p = await w.outerPosition();
    const s = await w.outerSize();
    return areas.some(
      (a) =>
        p.x >= a.x - 2 &&
        p.y >= a.y - 2 &&
        p.x + s.width <= a.x + a.width + 2 &&
        p.y + s.height <= a.y + a.height + 2,
    );
  };
  try {
    await record("platform-start", { userAgent: navigator.userAgent });
    await record("lifecycle-bridge", await invoke("lifecycle_status"));
    const monitors = await availableMonitors();
    if (!monitors.length) throw Error("No monitors returned");
    await record(
      "monitors",
      monitors.map(({ name, size, scaleFactor }) => ({
        name,
        size,
        scaleFactor,
      })),
    );
    await w.setFullscreen(true);
    await until(() => w.isFullscreen());
    await record("fullscreen-entered");
    await w.setFullscreen(false);
    await until(async () => !(await w.isFullscreen()));
    await record("fullscreen-exited");
    await w.minimize();
    await until(() => engine.suspended);
    const minimizedAt = engine.clock.elapsed;
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (engine.clock.elapsed !== minimizedAt)
      throw Error("Clock advanced while minimized");
    await record("native-minimized");
    await w.unminimize();
    await until(() => !engine.suspended && engine.clock.elapsed > minimizedAt);
    await record("native-restored");
    const originalPosition = await w.outerPosition();
    const originalSize = await w.innerSize();
    try {
      const displayIndex = monitors.length - 1;
      const requested = monitors[displayIndex].workArea.position;
      await moveToDisplay(displayIndex);
      await until(async () => {
        const actual = await w.outerPosition();
        return (
          Math.abs(actual.x - requested.x) < 4 &&
          Math.abs(actual.y - requested.y) < 4
        );
      });
      await record("display-positioned", {
        displayIndex,
        position: await w.outerPosition(),
        innerSize: await w.innerSize(),
      });
      await until(() =>
        fits([
          {
            ...monitors[displayIndex].workArea.position,
            ...monitors[displayIndex].workArea.size,
          },
        ]),
      );
      await record("display-fits-workarea", {
        position: await w.outerPosition(),
        outerSize: await w.outerSize(),
        workArea: monitors[displayIndex].workArea,
      });
      const outside = new PhysicalPosition(
        Math.max(...monitors.map((m) => m.position.x + m.size.width)) + 10000,
        10000,
      );
      await w.setPosition(outside);
      await until(async () => (await w.outerPosition()).x === outside.x);
      const changed = await recoverOffscreenWindow();
      if (!changed) throw Error("Offscreen recovery did not move the window");
      const areas = monitors.map((m) => ({
        ...m.workArea.position,
        ...m.workArea.size,
      }));
      await until(
        async () =>
          !recoveryTarget(
            { ...(await w.outerPosition()), ...(await w.outerSize()) },
            areas,
          ),
      );
      await until(() => fits(areas));
      await record("offscreen-recovered", {
        position: await w.outerPosition(),
        size: await w.outerSize(),
      });
    } finally {
      await w.setSize(originalSize);
      await w.setPosition(originalPosition);
    }
    let snapshot: PlayerSnapshot | undefined;
    let canvases = -1;
    off = await listen<{ state: PlayerSnapshot; canvasCount: number }>(
      "control-probe-state",
      ({ payload }) => {
        snapshot = payload.state;
        canvases = payload.canvasCount;
      },
    );
    await openControls(true);
    await until(() => !!snapshot);
    if (canvases !== 0) throw Error("Control window contains a scene canvas");
    await record("control-handshake", { snapshot, canvases });
    await emitTo("main", "control-command", { type: "paused", value: true });
    await until(() => snapshot?.paused === true && engine.paused);
    const pausedAt = engine.clock.elapsed;
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (engine.clock.elapsed !== pausedAt)
      throw Error("Clock advanced while paused");
    await record("pause-roundtrip");
    await emitTo("main", "control-command", { type: "paused", value: false });
    await until(
      () => snapshot?.paused === false && engine.clock.elapsed > pausedAt,
    );
    await record("resume-roundtrip");
    await emitTo("controls", "control-probe-close");
    await until(async () => !(await WebviewWindow.getByLabel("controls")));
    const continuedAt = engine.clock.elapsed;
    await until(() => engine.clock.elapsed > continuedAt);
    await record("control-closed-player-continues");
    const context = document.querySelector("canvas")?.getContext("webgl2");
    const contextTest = context?.getExtension("WEBGL_lose_context");
    if (contextTest) {
      const beforeLoss = engine.clock.elapsed;
      const oldInstance = engine.instance;
      contextTest.loseContext();
      await until(() => engine.suspended);
      await record("graphics-context-lost");
      contextTest.restoreContext();
      await until(
        () =>
          !engine.suspended &&
          engine.instance !== oldInstance &&
          engine.clock.elapsed > beforeLoss &&
          (engine.instance?.stats().calls ?? 0) > 0,
      );
      await record("graphics-context-restored", {
        elapsed: engine.clock.elapsed,
        stats: engine.instance?.stats(),
      });
    } else {
      await record("graphics-recovery-unverified", {
        reason: "WEBGL_lose_context unavailable",
      });
    }
    await record("platform-complete");
  } catch (error) {
    await record("platform-failed", { error: String(error) });
  } finally {
    off?.();
    await w.setFullscreen(false);
  }
}
