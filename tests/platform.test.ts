import { afterEach, describe, expect, it, vi } from "vitest";
import { exitFullscreen } from "../packages/platform/src";

const setFullscreen = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ setFullscreen }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("exit fullscreen", () => {
  it("exits desktop fullscreen without toggling into it", async () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    await exitFullscreen();
    await exitFullscreen();
    expect(setFullscreen.mock.calls).toEqual([[false], [false]]);
  });

  it("exits browser fullscreen and does nothing when already windowed", async () => {
    vi.stubGlobal("window", {});
    const exit = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("document", { fullscreenElement: {}, exitFullscreen: exit });
    await exitFullscreen();
    expect(exit).toHaveBeenCalledOnce();
    vi.stubGlobal("document", {
      fullscreenElement: null,
      exitFullscreen: exit,
    });
    await exitFullscreen();
    expect(exit).toHaveBeenCalledOnce();
  });

  it("propagates platform rejection for the UI to report", async () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    setFullscreen.mockRejectedValueOnce(new Error("window unavailable"));
    await expect(exitFullscreen()).rejects.toThrow("window unavailable");
  });
});
