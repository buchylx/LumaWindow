import {
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
  NearestFilter,
} from "three";

export const regionLength = 720;
export const journeyColumns = 32;
export const journeyKinds = ["层峦云谷", "开阔云海", "高云山岛"] as const;
/** Discrete cells choose rules, never complete mountain/cloud silhouettes. */
export function region(seed: number, index: number) {
  let n = (Math.imul(index, 374761393) + Math.imul(seed, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  const a = ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  const kind = Math.min(2, Math.floor(a * 3));
  const variation = (a * 3) % 1;
  const profiles = [
    [0.52, 0.44, 0.9, 0.12],
    [0.28, 0.15, 0.32, 0.42],
    [0.85, 0.93, 0.78, 0.88],
  ];
  return {
    kind,
    values: profiles[kind].map((v, i) =>
      Math.max(0, Math.min(1, v + (variation - 0.5) * (i === 3 ? 0.12 : 0.14))),
    ),
  };
}
export function sampleJourney(seed: number, worldX: number) {
  const cell = Math.floor(worldX / regionLength),
    f = worldX / regionLength - cell;
  const smooth = f * f * (3 - 2 * f);
  const a = region(seed, cell),
    b = region(seed, cell + 1);
  return a.values.map((v, i) => v + (b.values[i] - v) * smooth);
}

/** Fixed-size rows follow each parallax layer. Upload only after a cell crossing. */
export function createJourney(seed: number, depths: readonly number[]) {
  const data = new Uint8Array(journeyColumns * depths.length * 4);
  const texture = new DataTexture(
    data,
    journeyColumns,
    depths.length,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  const starts = depths.map(() => Number.NaN);
  return {
    texture,
    starts,
    update(distance: number) {
      let changed = false;
      depths.forEach((depth, row) => {
        const start =
          Math.floor((distance * depth) / regionLength) - journeyColumns / 2;
        if (starts[row] === start) return;
        starts[row] = start;
        changed = true;
        for (let x = 0; x < journeyColumns; x++) {
          const values = region(seed, start + x).values;
          for (let c = 0; c < 4; c++)
            data[(row * journeyColumns + x) * 4 + c] = Math.round(
              values[c] * 255,
            );
        }
      });
      if (changed) texture.needsUpdate = true;
      return changed;
    },
    dispose() {
      texture.dispose();
    },
  };
}
