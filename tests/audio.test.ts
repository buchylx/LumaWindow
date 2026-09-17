import { afterEach, describe, expect, it, vi } from "vitest";
import {
  audioIsActive,
  stopTestAudio,
  testAudio,
} from "../packages/platform/src/audio";

function fixture(resume: () => Promise<void> = () => Promise.resolve()) {
  const gain = {
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const osc = {
    frequency: { value: 0 },
    connect: vi.fn(() => gain),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };
  const context = {
    state: "running",
    currentTime: 0,
    destination: {},
    resume,
    close: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => gain),
  };
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        return context;
      }
    },
  );
  return { context, osc, gain };
}
afterEach(() => {
  stopTestAudio();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("short audio probe lifecycle", () => {
  it("closes resources after the short tone ends", async () => {
    const { context, osc, gain } = fixture();
    const done = testAudio();
    await Promise.resolve();
    expect(audioIsActive()).toBe(true);
    expect(osc.stop).toHaveBeenCalledWith(1.25);
    osc.onended?.();
    await expect(done).resolves.toBe("completed");
    expect(context.close).toHaveBeenCalledOnce();
    expect(gain.disconnect).toHaveBeenCalledOnce();
    expect(audioIsActive()).toBe(false);
  });
  it("stops immediately without waiting for an ended event", async () => {
    const { context, osc } = fixture();
    const done = testAudio();
    await Promise.resolve();
    stopTestAudio();
    await expect(done).resolves.toBe("stopped");
    expect(osc.disconnect).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
  });
  it("never starts a late unlock after cancellation", async () => {
    let unlock!: () => void;
    const { context } = fixture(
      () =>
        new Promise((resolve) => {
          unlock = resolve;
        }),
    );
    const done = testAudio();
    stopTestAudio();
    await expect(done).resolves.toBe("stopped");
    unlock();
    await Promise.resolve();
    expect(context.createOscillator).not.toHaveBeenCalled();
  });
  it("times out blocked unlock and releases its context", async () => {
    vi.useFakeTimers();
    const { context } = fixture(() => new Promise(() => {}));
    const done = expect(testAudio()).rejects.toThrow("点击开启声音");
    await vi.advanceTimersByTimeAsync(2000);
    await done;
    expect(context.close).toHaveBeenCalledOnce();
    expect(audioIsActive()).toBe(false);
  });
  it("replaces an earlier probe without leaving it running", async () => {
    const first = fixture(() => new Promise(() => {}));
    const old = testAudio();
    const second = fixture();
    const current = testAudio();
    await expect(old).resolves.toBe("stopped");
    expect(first.context.close).toHaveBeenCalledOnce();
    expect(audioIsActive()).toBe(true);
    second.osc.onended?.();
    await expect(current).resolves.toBe("completed");
  });
});
