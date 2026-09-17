import { Color } from "three";
import { celestialOrbit } from "./celestial";
import { wrap } from "./day-cycle";
// Sky, horizon, cloud shade/body/light, rock shade/light; authored in sRGB.
const keys = [
  [
    0,
    "#122a53",
    "#6e86b1",
    "#475d94",
    "#7c97c3",
    "#c8d9ef",
    "#182d4e",
    "#5277a3",
  ],
  [
    0.18,
    "#405c91",
    "#e2aab5",
    "#795f9b",
    "#c4a7c5",
    "#f7d9d4",
    "#304364",
    "#8c83ac",
  ],
  [
    0.3,
    "#6daed5",
    "#ffe0b2",
    "#96789e",
    "#f1bbad",
    "#fff0d5",
    "#364c68",
    "#a78aa8",
  ],
  [
    0.48,
    "#448fce",
    "#c9eaf2",
    "#7799c3",
    "#d2e4ee",
    "#fff9e9",
    "#264e6b",
    "#679ab7",
  ],
  [
    0.62,
    "#629dd4",
    "#ffe4c4",
    "#8d80b1",
    "#f3c6bb",
    "#fff3d9",
    "#3a4e70",
    "#9897bc",
  ],
  [
    0.74,
    "#6685bb",
    "#ffc593",
    "#886888",
    "#f09e87",
    "#ffdfab",
    "#343b5e",
    "#ad829f",
  ],
  [
    0.84,
    "#2d467b",
    "#d7a0b2",
    "#645d97",
    "#a59fc8",
    "#e7d9e8",
    "#253459",
    "#7e80b1",
  ],
  [
    0.94,
    "#19305b",
    "#8599bd",
    "#4d659b",
    "#87a0c9",
    "#d0def1",
    "#1c3255",
    "#5c7eaa",
  ],
  [
    1,
    "#122a53",
    "#6e86b1",
    "#475d94",
    "#7c97c3",
    "#c8d9ef",
    "#182d4e",
    "#5277a3",
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
    lightX: 0,
    lightY: 1,
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
      const orbit = celestialOrbit(t);
      this.lightX =
        (orbit.sun.x * (1 - this.night) + orbit.moon.x * this.night) * 0.7;
      this.lightY =
        0.45 +
        (Math.max(0, orbit.sun.altitude) * (1 - this.night) +
          Math.max(0, orbit.moon.altitude) * this.night) *
          0.55;
      const [sky, horizon, shade, body, light, rock, rockLight] = colors;
      roles.cloudNearShade.copy(shade).lerp(violet, 0.1).multiplyScalar(0.8);
      roles.cloudNearBody.copy(body).lerp(shade, 0.14);
      roles.cloudFarShade.copy(shade).lerp(horizon, 0.12);
      roles.rockNear.copy(rock).multiplyScalar(0.63);
      roles.rockMiddle.copy(rockLight).lerp(rock, 0.38);
      roles.rockFar.copy(rockLight).lerp(horizon, 0.16).lerp(blue, 0.08);
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
