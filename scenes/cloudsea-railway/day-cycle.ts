import type { Params } from "./params";
export const wrap = (n: number) => ((n % 1) + 1) % 1;
export class DayCycle {
  phase: number;
  private params: Params;
  constructor(params: Params, phase = params.daylight) {
    this.params = { ...params };
    this.phase = wrap(phase);
  }
  configure(params: Params) {
    // An explicit time selection wins. Switching modes or duration alone preserves phase.
    if (
      params.daylight !== this.params.daylight ||
      params.timeRequest !== this.params.timeRequest
    )
      this.phase = wrap(params.daylight);
    this.params = { ...params };
  }
  advance(activeSeconds: number) {
    if (this.params.timeMode === "auto")
      this.phase = wrap(
        this.phase +
          Math.max(0, activeSeconds) / (this.params.cycleMinutes * 60),
      );
    return this.phase;
  }
}
