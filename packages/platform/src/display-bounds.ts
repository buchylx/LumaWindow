export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** All coordinates are physical pixels; negative monitor positions are valid. */
export function recoveryTarget(window: Rect, areas: Rect[]): Rect | null {
  const valid = areas.filter((a) => a.width > 0 && a.height > 0);
  if (!valid.length) return null;
  const accessible = valid.some((a) => {
    const overlap =
      Math.min(window.x + window.width, a.x + a.width) -
      Math.max(window.x, a.x);
    return (
      overlap >= Math.min(160, window.width) &&
      window.y >= a.y &&
      window.y + Math.min(40, window.height) <= a.y + a.height
    );
  });
  if (accessible) return null;
  const distance = (a: Rect) =>
    Math.hypot(
      window.x + window.width / 2 - a.x - a.width / 2,
      window.y + window.height / 2 - a.y - a.height / 2,
    );
  const area = valid.reduce((best, a) =>
    distance(a) < distance(best) ? a : best,
  );
  const width = Math.max(
    1,
    Math.min(window.width, area.width - Math.min(48, area.width / 4)),
  );
  const height = Math.max(
    1,
    Math.min(window.height, area.height - Math.min(48, area.height / 4)),
  );
  return {
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  };
}
