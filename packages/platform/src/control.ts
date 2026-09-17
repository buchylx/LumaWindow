import type { Params, Selection, Quality, Phase } from "../../scene-sdk/src";
export interface PlayerSnapshot {
  params: Params;
  selection: Selection;
  quality: Quality;
  phase: Phase;
  paused: boolean;
  seed: number;
  reduced: boolean;
  diagnostics: boolean;
  audioActive: boolean;
}
export type ControlCommand =
  | { type: "params"; value: Params }
  | { type: "selection"; value: Selection }
  | { type: "quality"; value: Quality }
  | { type: "phase"; value: Phase }
  | { type: "paused" | "reduced" | "diagnostics"; value: boolean }
  | { type: "display"; value: number }
  | { type: "audio" | "audio-stop" }
  | { type: "regenerate" | "reset" | "snapshot" };
export async function openControls(probe = false) {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const existing = await WebviewWindow.getByLabel("controls");
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }
  const w = new WebviewWindow("controls", {
    url: probe ? "index.html?control=1&platformtest=1" : "index.html?control=1",
    title: "LumaWindow · 控制",
    width: 360,
    height: 840,
    minWidth: 320,
    minHeight: 500,
  });
  await new Promise<void>((resolve, reject) => {
    void w.once("tauri://created", () => resolve());
    void w.once("tauri://error", (e) => reject(new Error(String(e.payload))));
  });
}
