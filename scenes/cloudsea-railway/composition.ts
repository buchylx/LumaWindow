// Historical 0.1.1 atlas prototype; not imported by the current scene runtime.
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
