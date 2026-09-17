import { recoveryTarget } from "./display-bounds";
export const isDesktop = () => "__TAURI_INTERNALS__" in window;
export async function exitFullscreen() {
  if (isDesktop()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setFullscreen(false);
  } else if (document.fullscreenElement) {
    await document.exitFullscreen();
  }
}
export async function fullscreen() {
  if (isDesktop()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const w = getCurrentWindow();
    await w.setFullscreen(!(await w.isFullscreen()));
  } else if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}
export async function displays() {
  if (!isDesktop()) return [];
  const { availableMonitors } = await import("@tauri-apps/api/window");
  return availableMonitors();
}
export async function moveToDisplay(index: number) {
  const { getCurrentWindow, availableMonitors, PhysicalSize } =
    await import("@tauri-apps/api/window");
  const monitors = await availableMonitors();
  const m = monitors[index];
  if (!m) throw new Error("显示器已断开");
  const w = getCurrentWindow();
  await w.setFullscreen(false);
  await w.setPosition(m.workArea.position);
  const [outer, inner] = await Promise.all([w.outerSize(), w.innerSize()]);
  await w.setSize(
    new PhysicalSize(
      Math.max(
        1,
        m.workArea.size.width - Math.max(0, outer.width - inner.width),
      ),
      Math.max(
        1,
        m.workArea.size.height - Math.max(0, outer.height - inner.height),
      ),
    ),
  );
  await w.setPosition(m.workArea.position);
}
let recovering: Promise<boolean> | undefined;
export function recoverOffscreenWindow(): Promise<boolean> {
  if (!isDesktop()) return Promise.resolve(false);
  if (recovering) return recovering;
  recovering = (async () => {
    const {
      getCurrentWindow,
      availableMonitors,
      PhysicalSize,
      PhysicalPosition,
    } = await import("@tauri-apps/api/window");
    const w = getCurrentWindow();
    const [monitors, position, outer, fullscreen] = await Promise.all([
      availableMonitors(),
      w.outerPosition(),
      w.outerSize(),
      w.isFullscreen(),
    ]);
    const target = recoveryTarget(
      { ...position, ...outer },
      monitors.map((m) => {
        const area = fullscreen ? m : m.workArea;
        return { ...area.position, ...area.size };
      }),
    );
    if (!target) return false;
    await w.setFullscreen(false);
    await w.setPosition(new PhysicalPosition(target.x, target.y));
    const [movedOuter, movedInner] = await Promise.all([
      w.outerSize(),
      w.innerSize(),
    ]);
    await w.setSize(
      new PhysicalSize(
        Math.max(
          1,
          target.width - Math.max(0, movedOuter.width - movedInner.width),
        ),
        Math.max(
          1,
          target.height - Math.max(0, movedOuter.height - movedInner.height),
        ),
      ),
    );
    await w.setPosition(new PhysicalPosition(target.x, target.y));
    return true;
  })().finally(() => {
    recovering = undefined;
  });
  return recovering;
}
export {
  testAudio,
  stopTestAudio,
  audioIsActive,
  subscribeAudio,
} from "./audio";
