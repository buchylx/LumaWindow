import { Color } from "three";
import { wrap } from "./day-cycle";
// Top sky, horizon, cloud shadow, body, light, rock shadow, rock light.
const keys = [
  [
    0,
    "#13233f",
    "#67758e",
    "#343e63",
    "#687798",
    "#b3b6cb",
    "#152940",
    "#465d7c",
  ],
  [
    0.2,
    "#536987",
    "#c79ba4",
    "#646685",
    "#b9a1b1",
    "#f4d1be",
    "#36435f",
    "#7e7a91",
  ],
  [
    0.3,
    "#7a9ec4",
    "#ffe0ad",
    "#7a7e9e",
    "#e7b6ad",
    "#fff0d1",
    "#435878",
    "#aa8b9a",
  ],
  [
    0.48,
    "#659cc8",
    "#cbdde3",
    "#7f93ae",
    "#d3d5dc",
    "#fff6dd",
    "#365c78",
    "#839aab",
  ],
  [
    0.62,
    "#759bc7",
    "#ffdbab",
    "#88839f",
    "#edb9b0",
    "#fff0cf",
    "#455676",
    "#aa8d9a",
  ],
  [
    0.74,
    "#6885b3",
    "#ffc980",
    "#786b91",
    "#eea295",
    "#ffe3b4",
    "#364760",
    "#b17f8a",
  ],
  [
    0.84,
    "#384f7b",
    "#d7999a",
    "#4a507c",
    "#9586ab",
    "#efb99e",
    "#263b59",
    "#696581",
  ],
  [
    0.94,
    "#182d50",
    "#8491a7",
    "#394668",
    "#7d88ab",
    "#c8c4d5",
    "#1a2d48",
    "#536886",
  ],
  [
    1,
    "#13233f",
    "#67758e",
    "#343e63",
    "#687798",
    "#b3b6cb",
    "#152940",
    "#465d7c",
  ],
] as const;
const stops = keys.map(([time, ...colors]) => ({
  time,
  colors: colors.map((c) => new Color(c)),
}));
export function createLighting() {
  const colors = Array.from({ length: 7 }, () => new Color());
  const targetColors = Array.from({ length: 7 }, () => new Color());
  return {
    colors,
    night: 0,
    sunY: 0,
    update(phase: number, blend = 1) {
      const t = wrap(phase);
      let i = 0;
      while (i < stops.length - 2 && stops[i + 1].time < t) i++;
      const f = (t - stops[i].time) / (stops[i + 1].time - stops[i].time);
      const s = f * f * (3 - 2 * f);
      colors.forEach((color, j) => {
        targetColors[j]
          .copy(stops[i].colors[j])
          .lerp(stops[i + 1].colors[j], s);
        color.lerp(targetColors[j], blend);
      });
      const dusk = Math.max(0, Math.min(1, (t - 0.77) / 0.15));
      const dawn = Math.max(0, Math.min(1, (t - 0.16) / 0.16));
      const targetNight =
        t > 0.5
          ? dusk * dusk * (3 - 2 * dusk)
          : 1 - dawn * dawn * (3 - 2 * dawn);
      this.night += (targetNight - this.night) * blend;
      this.sunY += (Math.sin((t - 0.25) * Math.PI * 2) - this.sunY) * blend;
    },
  };
}
