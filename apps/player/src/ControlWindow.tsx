import { useEffect, useState } from "react";
import { defaults } from "../../../packages/scene-sdk/src";
import type {
  ControlCommand,
  PlayerSnapshot,
} from "../../../packages/platform/src/control";
import { Controls } from "./Controls";
import { displays } from "../../../packages/platform/src";
export function ControlWindow() {
  const [state, setState] = useState<PlayerSnapshot>({
    params: defaults,
    selection: "auto",
    quality: "balanced",
    phase: "ambient",
    paused: false,
    seed: 8472,
    reduced: false,
    diagnostics: false,
    audioActive: false,
  });
  const [status, setStatus] = useState("正在连接播放窗口…");
  const [displayList, setDisplayList] = useState<string[]>([]);
  async function send(command: ControlCommand) {
    try {
      const { emitTo } = await import("@tauri-apps/api/event");
      await emitTo("main", "control-command", command);
    } catch (e) {
      setStatus(String(e));
    }
  }
  useEffect(() => {
    let canceled = false;
    let off: (() => void) | undefined;
    let offAudio: (() => void) | undefined;
    let offProbe: (() => void) | undefined;
    let offDisplays: (() => void) | undefined;
    let displayRequest = 0;
    function refreshDisplays() {
      const request = ++displayRequest;
      void displays()
        .then((ms) => {
          if (!canceled && request === displayRequest)
            setDisplayList(ms.map((m, i) => m.name ?? `屏幕 ${i + 1}`));
        })
        .catch((e) => {
          if (!canceled && request === displayRequest) setStatus(String(e));
        });
    }
    window.addEventListener("focus", refreshDisplays);
    void import("@tauri-apps/api/event")
      .then(async ({ listen, emitTo }) => {
        const unsubscribeDisplays = await listen<string>(
          "system-event",
          (event) => {
            if (event.payload === "displays-changed") refreshDisplays();
          },
        );
        if (canceled) {
          unsubscribeDisplays();
          return;
        }
        offDisplays = unsubscribeDisplays;
        refreshDisplays();
        const unsubscribe = await listen<PlayerSnapshot>(
          "player-state",
          (event) => {
            setState(event.payload);
            setStatus("已连接 · 画面和声音仅在播放窗口运行");
            if (new URLSearchParams(location.search).has("platformtest"))
              void emitTo("main", "control-probe-state", {
                state: event.payload,
                canvasCount: document.querySelectorAll("canvas").length,
              }).catch((e) => setStatus(String(e)));
          },
        );
        if (canceled) {
          unsubscribe();
          return;
        }
        off = unsubscribe;
        const unsubscribeAudio = await listen<string>("audio-result", (event) =>
          setStatus(event.payload),
        );
        if (canceled) {
          unsubscribeAudio();
          return;
        }
        offAudio = unsubscribeAudio;
        if (new URLSearchParams(location.search).has("platformtest")) {
          const unsubscribeProbe = await listen("control-probe-close", () => {
            void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
              getCurrentWindow().close(),
            );
          });
          if (canceled) {
            unsubscribeProbe();
            return;
          }
          offProbe = unsubscribeProbe;
        }
        await send({ type: "snapshot" });
      })
      .catch((e) => {
        if (!canceled) setStatus(String(e));
      });
    return () => {
      canceled = true;
      off?.();
      offAudio?.();
      offProbe?.();
      offDisplays?.();
      window.removeEventListener("focus", refreshDisplays);
    };
  }, []);
  return (
    <div className="control-window">
      <Controls
        {...state}
        setParams={(value) => void send({ type: "params", value })}
        setSelection={(value) => void send({ type: "selection", value })}
        setQuality={(value) => void send({ type: "quality", value })}
        setPhase={(value) => void send({ type: "phase", value })}
        setReduced={(value) => void send({ type: "reduced", value })}
        setDiagnostics={(value) => void send({ type: "diagnostics", value })}
        regenerate={() => void send({ type: "regenerate" })}
        reset={() => void send({ type: "reset" })}
        close={() =>
          void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
            getCurrentWindow().close(),
          )
        }
        audio={() => {
          setStatus("正在请求播放窗口测试音频…");
          void send({ type: state.audioActive ? "audio-stop" : "audio" });
        }}
        displayList={displayList}
        move={(value) => void send({ type: "display", value })}
      />
      <button
        className="wide"
        onClick={() => void send({ type: "paused", value: !state.paused })}
      >
        {state.paused ? "继续画面" : "暂停画面"}
      </button>
      <p role="status">{status}</p>
    </div>
  );
}
