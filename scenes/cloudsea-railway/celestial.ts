import { wrap } from "./day-cycle";

/** One continuous orbit; midnight is phase 0, sunrise .25, sunset .75. */
export function celestialOrbit(phase: number) {
  const angle = (wrap(phase) - 0.25) * Math.PI * 2;
  const sun = { x: -Math.cos(angle), altitude: Math.sin(angle) };
  const moon = { x: -sun.x, altitude: -sun.altitude };
  const visibility = (altitude: number) => {
    const t = Math.max(0, Math.min(1, (altitude + 0.13) / 0.18));
    return t * t * (3 - 2 * t);
  };
  return {
    sun,
    moon,
    sunOpacity: visibility(sun.altitude),
    moonOpacity: visibility(moon.altitude),
  };
}
