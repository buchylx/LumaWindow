import { Color } from "three";
import { wrap } from "./day-cycle";
// Sky, horizon, cloud shade/body/light, rock shade/light; authored in sRGB.
const keys = [
  [
    0,
    "#142740",
    "#8b86a9",
    "#4c557e",
    "#8997b8",
    "#e1d7d5",
    "#182f42",
    "#727c9d",
  ],
  [
    0.18,
    "#445c86",
    "#dba0ab",
    "#786786",
    "#bb9db3",
    "#f8d2b4",
    "#304858",
    "#968899",
  ],
  [
    0.3,
    "#77a5bd",
    "#f8d1a8",
    "#89788f",
    "#e2b6af",
    "#ffedc8",
    "#314c5c",
    "#ad8f97",
  ],
  [
    0.48,
    "#5798b6",
    "#ddded0",
    "#8290b0",
    "#d4cfcd",
    "#fff0cd",
    "#294b57",
    "#899ba7",
  ],
  [
    0.62,
    "#6d9dbc",
    "#f8d4ae",
    "#8c829f",
    "#e8bab0",
    "#ffe9be",
    "#354959",
    "#aa929e",
  ],
  [
    0.74,
    "#6c86b2",
    "#fbc08c",
    "#94768f",
    "#eeae99",
    "#ffe3ae",
    "#394252",
    "#b48f9a",
  ],
  [
    0.84,
    "#374c7a",
    "#d9999f",
    "#645b8c",
    "#a190b2",
    "#efd1c6",
    "#28374e",
    "#89849e",
  ],
  [
    0.94,
    "#1c3053",
    "#9093b6",
    "#515b86",
    "#929bbe",
    "#e4d7da",
    "#1b3046",
    "#757f9f",
  ],
  [
    1,
    "#142740",
    "#8b86a9",
    "#4c557e",
    "#8997b8",
    "#e1d7d5",
    "#182f42",
    "#727c9d",
  ],
] as const;
const stops = keys.map(([time, ...colors]) => ({
  time,
  colors: colors.map((c) => new Color(c)),
}));
export function createLighting() {
  const colors = Array.from({ length: 7 }, () => new Color());
  const targets = colors.map(() => new Color());
  const roles = {
    cloudNearShade: new Color(),
    cloudNearBody: new Color(),
    cloudFarShade: new Color(),
    rockNear: new Color(),
    rockMiddle: new Color(),
    rockFar: new Color(),
    carriage: new Color(),
    carriageLight: new Color(),
    roof: new Color(),
    undercarriage: new Color(),
    brass: new Color(),
    window: new Color(),
    windowDim: new Color(),
    steam: new Color(),
  };
  const green = new Color("#274841"),
    greenLight = new Color("#59746a"),
    charcoal = new Color("#25323b"),
    brass = new Color("#998364"),
    dayGlass = new Color("#abb9ad"),
    nightGlass = new Color("#f9c786"),
    violet = new Color("#716489"),
    blue = new Color("#7598b8");
  return {
    colors,
    roles,
    night: 0,
    sunY: 0,
    update(phase: number, blend = 1) {
      const t = wrap(phase);
      let i = 0;
      while (i < stops.length - 2 && stops[i + 1].time < t) i++;
      const f = (t - stops[i].time) / (stops[i + 1].time - stops[i].time),
        s = f * f * (3 - 2 * f);
      colors.forEach((c, j) => {
        targets[j].copy(stops[i].colors[j]).lerp(stops[i + 1].colors[j], s);
        c.lerp(targets[j], blend);
      });
      const dusk = Math.max(0, Math.min(1, (t - 0.77) / 0.15)),
        dawn = Math.max(0, Math.min(1, (t - 0.16) / 0.16));
      const night =
        t > 0.5
          ? dusk * dusk * (3 - 2 * dusk)
          : 1 - dawn * dawn * (3 - 2 * dawn);
      this.night += (night - this.night) * blend;
      this.sunY += (Math.sin((t - 0.25) * Math.PI * 2) - this.sunY) * blend;
      const [sky, horizon, shade, body, light, rock, rockLight] = colors;
      roles.cloudNearShade.copy(shade).lerp(violet, 0.19).multiplyScalar(0.68);
      roles.cloudNearBody.copy(body).lerp(shade, 0.32);
      roles.cloudFarShade.copy(shade).lerp(horizon, 0.27);
      roles.rockNear.copy(rock).multiplyScalar(0.63);
      roles.rockMiddle.copy(rockLight).lerp(rock, 0.38);
      roles.rockFar.copy(rockLight).lerp(horizon, 0.3).lerp(blue, 0.1);
      roles.carriage
        .copy(green)
        .lerp(rock, 0.28)
        .multiplyScalar(1 - this.night * 0.28);
      roles.carriageLight
        .copy(greenLight)
        .lerp(light, 0.055)
        .multiplyScalar(1 - this.night * 0.38);
      roles.roof.copy(charcoal).lerp(sky, 0.18);
      roles.undercarriage.copy(rock).multiplyScalar(0.36);
      roles.brass
        .copy(brass)
        .lerp(light, 0.1)
        .multiplyScalar(0.63 - this.night * 0.12);
      roles.window.copy(dayGlass).lerp(nightGlass, this.night);
      roles.windowDim.copy(roles.window).lerp(roles.carriage, 0.44);
      roles.steam.copy(body).lerp(light, 0.67);
    },
  };
}
