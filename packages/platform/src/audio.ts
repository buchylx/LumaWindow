export type AudioProbeResult = "completed" | "stopped";
let cancelCurrent: (() => void) | undefined;
const listeners = new Set<() => void>();
export const audioIsActive = () => !!cancelCurrent;
export function subscribeAudio(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const notify = () => listeners.forEach((listener) => listener());
export function stopTestAudio() {
  cancelCurrent?.();
}

/** One short, user-initiated tone. Pending unlock never survives cancellation. */
export async function testAudio(): Promise<AudioProbeResult> {
  stopTestAudio();
  const context = new AudioContext();
  return new Promise((resolve, reject) => {
    let finished = false;
    let oscillator: OscillatorNode | undefined;
    let gain: GainNode | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (result: AudioProbeResult, error?: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (oscillator) {
        oscillator.onended = null;
        oscillator.disconnect();
      }
      gain?.disconnect();
      if (cancelCurrent === cancel) {
        cancelCurrent = undefined;
        notify();
      }
      void context.close().then(
        () => (error ? reject(error) : resolve(result)),
        (closeError) => reject(error ?? closeError),
      );
    };
    const cancel = () => finish("stopped");
    cancelCurrent = cancel;
    notify();
    timer = setTimeout(
      () => finish("stopped", new Error("请在播放窗口点击开启声音")),
      2000,
    );
    void context
      .resume()
      .then(() => {
        if (finished) return;
        if (context.state !== "running")
          throw new Error("请在播放窗口点击开启声音");
        clearTimeout(timer);
        oscillator = context.createOscillator();
        gain = context.createGain();
        oscillator.frequency.value = 220;
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.025, context.currentTime + 0.15);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 1.2);
        oscillator.connect(gain).connect(context.destination);
        oscillator.onended = () => finish("completed");
        oscillator.start();
        oscillator.stop(context.currentTime + 1.25);
        timer = setTimeout(
          () => finish("stopped", new Error("测试音未正常结束，已停止")),
          2500,
        );
      })
      .catch((error) => finish("stopped", error));
  });
}
