import type { Variant } from "../../packages/scene-sdk/src";
export const manifest = {
  id: "cloudsea-railway",
  version: "0.3.0",
  sdkVersion: 1,
  name: "云海列车",
  baseVariantId: "side",
  variants: [{ id: "side", name: "横向远眺", renderer: "three" }],
  load: (_variant: Variant) => import("./scene"),
};
