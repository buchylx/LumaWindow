export type Variant = "side" | "forward";
export type Selection = Variant | "auto";
export type Quality = "eco" | "balanced" | "high";
export type Phase = "ambient" | "focus" | "relax";
import type { Params } from "../../../scenes/cloudsea-railway/params";
export {
  defaults,
  validateParams,
  type Params,
} from "../../../scenes/cloudsea-railway/params";
export interface Viewport {
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  aspect: number;
}
export interface Frame {
  elapsed: number;
  delta: number;
  phase: Phase;
  blend: number;
  reducedMotion: boolean;
}
export interface SceneInstance {
  resize(v: Viewport): void;
  setParams(p: Params): void;
  update(f: Frame): void;
  render(): void;
  dispose(): void;
  captureState?(): unknown;
  stats(): {
    geometries: number;
    textures: number;
    calls: number;
    triangles: number;
    phase?: number;
    distance?: number;
    skyWind?: number;
  };
}
export interface CreateContext {
  canvas: HTMLCanvasElement;
  viewport: Viewport;
  seed: number;
  params: Params;
  signal: AbortSignal;
  variant: Variant;
  state?: unknown;
  elapsed?: number;
}
export interface SceneModule {
  create(c: CreateContext): Promise<SceneInstance>;
}
export const budgets = {
  eco: { pixels: 600000, fps: 20 },
  balanced: { pixels: 1000000, fps: 30 },
  high: { pixels: 2100000, fps: 30 },
} as const;
export function viewport(
  width: number,
  height: number,
  dpr: number,
  quality: Quality,
): Viewport {
  width = Math.max(1, Number.isFinite(width) ? width : 1);
  height = Math.max(1, Number.isFinite(height) ? height : 1);
  const scale = Math.min(
    Math.max(0.1, Number.isFinite(dpr) ? dpr : 1),
    1.5,
    Math.sqrt(budgets[quality].pixels / (width * height)),
  );
  return {
    width,
    height,
    pixelWidth: Math.max(1, Math.floor(width * scale)),
    pixelHeight: Math.max(1, Math.floor(height * scale)),
    aspect: width / height,
  };
}
export function chooseVariant(
  selection: Selection,
  aspect: number,
  current: Variant = "side",
): Variant {
  if (selection !== "auto") return selection;
  return aspect <= 0.85 ? "forward" : aspect >= 1.15 ? "side" : current;
}
export function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
