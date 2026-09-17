export interface Params {
  clouds: number;
  fog: number;
  speed: number;
  daylight: number;
  cloudShape: number;
  framing: number;
  palette: "mist" | "warm" | "blue";
  timeMode: "auto" | "fixed";
  cycleMinutes: number;
  timeRequest: number;
}
export const defaults: Params = {
  clouds: 0.64,
  fog: 0.28,
  speed: 0.2,
  daylight: 0.72,
  cloudShape: 0.6,
  framing: 0.4,
  palette: "mist",
  timeMode: "auto",
  cycleMinutes: 30,
  timeRequest: 0,
};
export function validateParams(input: Partial<Params>): Params {
  const result = { ...defaults };
  for (const key of [
    "clouds",
    "fog",
    "speed",
    "daylight",
    "cloudShape",
    "framing",
  ] as const) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value))
      result[key] = Math.max(0, Math.min(1, value));
  }
  if (["mist", "warm", "blue"].includes(input.palette ?? ""))
    result.palette = input.palette!;
  if (input.timeMode === "fixed") result.timeMode = "fixed";
  if (
    typeof input.cycleMinutes === "number" &&
    Number.isFinite(input.cycleMinutes)
  )
    result.cycleMinutes = Math.max(1, Math.min(120, input.cycleMinutes));
  if (
    typeof input.timeRequest === "number" &&
    Number.isSafeInteger(input.timeRequest) &&
    input.timeRequest >= 0
  )
    result.timeRequest = input.timeRequest;
  return result;
}
