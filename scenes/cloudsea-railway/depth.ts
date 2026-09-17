// Inverse distance relative to the railway. Larger means closer to the camera.
// A single depth controls occlusion, camera parallax and atmospheric extinction.
export const railwayDepth = 1;
export function layerOrder(depth: number) {
  return depth < railwayDepth ? depth * 30 : 55 + depth * 10;
}
export function fogAtDepth(amount: number, depth: number, baseline = 0) {
  const density = Math.max(0, Math.min(1, amount));
  const extinction =
    1 - Math.exp(-(density * density * 2.4) / (0.32 + depth * depth));
  return Math.min(0.96, baseline + (1 - baseline) * extinction);
}
export function skyOffset(distance: number, windDistance: number) {
  return distance * 0.022 + windDistance;
}
