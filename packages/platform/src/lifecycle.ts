import type { SceneEngine } from "../../scene-engine/src";
import { stopTestAudio } from "./audio";

export function applySystemEvent(engine: SceneEngine, event: string) {
  let reason: string;
  let suspended: boolean;
  switch (event) {
    case "session-lock":
      reason = "session";
      suspended = true;
      break;
    case "session-unlock":
      reason = "session";
      suspended = false;
      break;
    case "system-suspend":
      reason = "sleep";
      suspended = true;
      break;
    case "system-resume":
      reason = "sleep";
      suspended = false;
      break;
    case "minimized":
      reason = "minimized";
      suspended = true;
      break;
    case "restored":
      reason = "minimized";
      suspended = false;
      break;
    default:
      return;
  }
  if (suspended) stopTestAudio();
  engine.setSuspended(reason, suspended);
}
