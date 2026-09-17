// Legacy chunk helpers are retained for prototype tests; current framing and
// distance perception helpers below are shared by the procedural runtime.
import { random } from "../../packages/scene-sdk/src";
export const CHUNK_WIDTH = 480;
export function district(seed: number, index: number, layer: number) {
  const r = random(
    seed ^ Math.imul(index, 73856093) ^ Math.imul(layer + 1, 19349663),
  );
  const opening = r();
  return {
    opening,
    x: (r() - 0.5) * 180,
    height: 0.65 + r() * 0.65,
    width: 0.8 + r() * 0.55,
    shape: Math.floor(r() * 4),
    mountain: r(),
    tint: r(),
  };
}
export function visibleChunks(
  distance: number,
  halfWidth: number,
  rate: number,
) {
  const offset = distance * rate;
  const first = Math.floor((offset - halfWidth) / CHUNK_WIDTH) - 1;
  const last = Math.ceil((offset + halfWidth) / CHUNK_WIDTH) + 1;
  return { first, last, offset };
}

/** Framing changes scale; the railway stays in the lower part of the view. */
export function viewHalfHeight(framing: number) {
  return 500 / (0.75 + Math.max(0, Math.min(1, framing)) * 0.6);
}
export function railwayElevation(framing: number) {
  return -viewHalfHeight(framing) * 0.46;
}
/** Continuous depth, independent of the optional weather/fog control. */
export function depthClarity(depth: number) {
  const t = Math.max(
    0,
    Math.min(
      1,
      Math.log(Math.max(0.025, depth) / 0.025) / Math.log(2.4 / 0.025),
    ),
  );
  return t * t * (3 - 2 * t);
}
