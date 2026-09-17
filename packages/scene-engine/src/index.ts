import {
  budgets,
  viewport,
  type SceneInstance,
  type SceneModule,
  type Params,
  type Variant,
  type Quality,
  type Phase,
} from "../../scene-sdk/src";
export class ActivityClock {
  elapsed = 0;
  private previous: number | undefined;
  resetFrame() {
    this.previous = undefined;
  }
  private previousActive = 0;
  tick(now: number) {
    this.previousActive =
      this.previous === undefined
        ? 0
        : Math.max(0, (now - this.previous) / 1000);
    const delta =
      this.previous === undefined
        ? 0
        : Math.min(0.1, Math.max(0, (now - this.previous) / 1000));
    this.previous = now;
    this.elapsed += this.previousActive;
    return delta;
  }
}
export class SceneEngine {
  instance: SceneInstance | undefined;
  readonly clock = new ActivityClock();
  quality: Quality = "balanced";
  phase: Phase = "ambient";
  private isPaused = false;
  private started = false;
  private suspensions = new Set<string>();
  get suspended() {
    return this.suspensions.size > 0;
  }
  setSuspended(reason: string, suspended: boolean) {
    if (this.suspensions.has(reason) === suspended) return;
    if (suspended) this.suspensions.add(reason);
    else this.suspensions.delete(reason);
    this.suspendFrames();
    this.scheduleFrame();
  }
  get paused() {
    return this.isPaused;
  }
  set paused(value: boolean) {
    if (this.isPaused === value) return;
    this.isPaused = value;
    this.suspendFrames();
    this.scheduleFrame();
  }
  reducedMotion = false;
  blend = 0;
  private request = 0;
  private abort: AbortController | undefined;
  private raf = 0;
  private lastRender = 0;
  private dead = false;
  private sceneState: unknown;
  frameMs = 0;
  cpuMs = 0;
  private lastActual = 0;
  constructor(
    private canvas: HTMLCanvasElement,
    private onError: (e: string) => void,
  ) {}
  getViewport() {
    return viewport(
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      window.devicePixelRatio,
      this.quality,
    );
  }
  resize() {
    this.instance?.resize(this.getViewport());
    // Resizing clears the drawing buffer; keep a paused scene visible without advancing time.
    if (this.paused && !this.suspended && this.instance && !document.hidden)
      this.instance.render();
  }
  setParams(params: Params) {
    this.instance?.setParams(params);
    if (this.paused && !this.suspended && this.instance && !document.hidden) {
      try {
        this.instance.update({
          elapsed: this.clock.elapsed,
          delta: 0,
          phase: this.phase,
          blend: this.blend,
          reducedMotion: this.reducedMotion,
        });
        this.instance.render();
      } catch (error) {
        this.setSuspended("render-error", true);
        this.onError(String(error));
      }
    }
  }
  async load(
    module: () => Promise<SceneModule>,
    variant: Variant,
    seed: number,
    params: Params,
  ) {
    const id = ++this.request;
    this.abort?.abort();
    const controller = new AbortController();
    this.abort = controller;
    let candidate: SceneInstance | undefined;
    try {
      const loaded = await module();
      if (id !== this.request || this.dead) return false;
      if (this.instance?.captureState)
        this.sceneState = this.instance.captureState();
      this.instance?.dispose();
      this.instance = undefined;
      this.suspendFrames();
      candidate = await loaded.create({
        canvas: this.canvas,
        viewport: this.getViewport(),
        seed,
        params,
        signal: controller.signal,
        variant,
        state: this.sceneState,
        elapsed: this.clock.elapsed,
      });
      if (id !== this.request || this.dead) {
        candidate.dispose();
        return false;
      }
      this.instance = candidate;
      this.clock.resetFrame();
      this.resize();
      this.instance.render();
      this.setSuspended("render-error", false);
      this.scheduleFrame();
      return true;
    } catch (e) {
      if (this.instance === candidate) this.instance = undefined;
      candidate?.dispose();
      if (!controller.signal.aborted)
        this.onError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }
  start() {
    if (this.started || this.dead) return;
    this.started = true;
    document.addEventListener("visibilitychange", this.visibilityChanged);
    this.scheduleFrame();
  }
  private visibilityChanged = () => {
    this.suspendFrames();
    this.scheduleFrame();
  };
  private suspendFrames() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.clock.resetFrame();
    this.lastActual = 0;
    this.lastRender = 0;
  }
  private scheduleFrame() {
    if (
      !this.started ||
      this.dead ||
      this.raf ||
      this.paused ||
      this.suspended ||
      !this.instance ||
      document.hidden
    )
      return;
    this.raf = requestAnimationFrame(this.loop);
  }
  private loop = (now: number) => {
    this.raf = 0;
    if (this.dead) return;
    if (this.paused || this.suspended || document.hidden || !this.instance) {
      this.suspendFrames();
      return;
    }
    if (now - this.lastRender < 1000 / budgets[this.quality].fps - 0.5) {
      this.scheduleFrame();
      return;
    }
    const delta = this.clock.tick(now);
    this.lastRender = now;
    this.frameMs = this.lastActual ? now - this.lastActual : 0;
    this.lastActual = now;
    const start = performance.now();
    const target = this.phase === "relax" ? 1 : 0;
    this.blend += Math.max(
      -delta / 15,
      Math.min(delta / 15, target - this.blend),
    );
    try {
      this.instance.update({
        elapsed: this.clock.elapsed,
        delta,
        phase: this.phase,
        blend: this.blend,
        reducedMotion: this.reducedMotion,
      });
      this.instance.render();
    } catch (e) {
      this.setSuspended("render-error", true);
      this.onError(String(e));
    }
    this.cpuMs = performance.now() - start;
    this.scheduleFrame();
  };
  dispose() {
    if (this.dead) return;
    this.dead = true;
    ++this.request;
    this.abort?.abort();
    this.suspendFrames();
    if (this.started)
      document.removeEventListener("visibilitychange", this.visibilityChanged);
    this.instance?.dispose();
    this.instance = undefined;
  }
}
