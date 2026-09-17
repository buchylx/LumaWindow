import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Cloud, Pause, Play, Maximize, SlidersHorizontal } from "lucide-react";
import { SceneEngine } from "../../../packages/scene-engine/src";
import {
  defaults,
  chooseVariant,
  validateParams,
  type Params,
  type Selection,
  type Variant,
  type Quality,
  type Phase,
} from "../../../packages/scene-sdk/src";
import { manifest } from "../../../scenes/cloudsea-railway/manifest";
import {
  fullscreen,
  exitFullscreen,
  displays,
  moveToDisplay,
  testAudio,
  stopTestAudio,
  subscribeAudio,
  audioIsActive,
  recoverOffscreenWindow,
} from "../../../packages/platform/src";
import { Controls } from "./Controls";
import { isDesktop } from "../../../packages/platform/src";
import { openControls } from "../../../packages/platform/src/control";
import { useDesktopBridge } from "./useDesktopBridge";
import { applySystemEvent } from "../../../packages/platform/src/lifecycle";

export function App() {
  const [awake, setAwake] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  function wakeControls() {
    setAwake(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setAwake(false), 4000);
  }
  useEffect(() => {
    idleTimer.current = setTimeout(() => setAwake(false), 4000);
    return () => clearTimeout(idleTimer.current);
  }, []);
  const audioActive = useSyncExternalStore(subscribeAudio, audioIsActive);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stopTestAudio();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", stopTestAudio);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", stopTestAudio);
      stopTestAudio();
    };
  }, []);
  const qaMode = ["1", "quick"].includes(
    new URLSearchParams(location.search).get("selftest") ?? "",
  );
  const platformProbe =
    new URLSearchParams(location.search).get("platformtest") === "1";
  const qaStarted = useRef(false);
  const qaController = useRef<AbortController | null>(null);
  const [qaProgress, setQaProgress] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null),
    engine = useRef<SceneEngine | null>(null);
  const [params, setParams] = useState<Params>({ ...defaults }),
    [selection, setSelection] = useState<Selection>("auto"),
    [variant, setVariant] = useState<Variant>("side"),
    [quality, setQuality] = useState<Quality>("balanced"),
    [phase, setPhase] = useState<Phase>("ambient");
  const [panel, setPanel] = useState(false),
    [paused, setPaused] = useState(false),
    [seed, setSeed] = useState(8472),
    [reloadVersion, setReloadVersion] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [diagnostics, setDiagnostics] = useState(false),
    [stats, setStats] = useState(""),
    [reduced, setReduced] = useState(
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [displayList, setDisplayList] = useState<string[]>([]);
  const latest = useRef({
    params,
    selection,
    quality,
    phase,
    reduced,
    variant,
    seed,
  });
  latest.current = {
    params,
    selection,
    quality,
    phase,
    reduced,
    variant,
    seed,
  };
  const controlSnapshot = useMemo(
    () => ({
      params,
      selection,
      quality,
      phase,
      reduced,
      seed,
      paused,
      diagnostics,
      audioActive,
    }),
    [
      params,
      selection,
      quality,
      phase,
      reduced,
      seed,
      paused,
      diagnostics,
      audioActive,
    ],
  );
  useDesktopBridge(
    controlSnapshot,
    (cmd) => {
      if (!cmd || typeof cmd !== "object") return;
      if (cmd.type === "params" && cmd.value && typeof cmd.value === "object")
        setParams(validateParams(cmd.value));
      else if (
        cmd.type === "selection" &&
        ["auto", "side", "forward"].includes(cmd.value)
      )
        setSelection(cmd.value);
      else if (
        cmd.type === "quality" &&
        ["eco", "balanced", "high"].includes(cmd.value)
      )
        setQuality(cmd.value);
      else if (
        cmd.type === "phase" &&
        ["ambient", "focus", "relax"].includes(cmd.value)
      )
        setPhase(cmd.value);
      else if (cmd.type === "paused" && typeof cmd.value === "boolean")
        setPaused(cmd.value);
      else if (cmd.type === "reduced" && typeof cmd.value === "boolean")
        setReduced(cmd.value);
      else if (cmd.type === "diagnostics" && typeof cmd.value === "boolean")
        setDiagnostics(cmd.value);
      else if (cmd.type === "regenerate") setSeed((s) => s + 1);
      else if (cmd.type === "reset") setParams({ ...defaults });
      else if (
        cmd.type === "display" &&
        Number.isInteger(cmd.value) &&
        cmd.value >= 0
      )
        void moveToDisplay(cmd.value).catch((e) => setError(String(e)));
      else if (cmd.type === "audio-stop") stopTestAudio();
      else if (cmd.type === "audio") {
        void testAudio()
          .then(
            (result) =>
              import("@tauri-apps/api/event").then(({ emitTo }) =>
                emitTo(
                  "controls",
                  "audio-result",
                  result === "completed"
                    ? "播放窗口已完成测试音。"
                    : "测试音已停止。",
                ),
              ),
            () =>
              import("@tauri-apps/api/event").then(({ emitTo }) =>
                emitTo(
                  "controls",
                  "audio-result",
                  "音频未能解锁，请在播放窗口点击“测试声音”。",
                ),
              ),
          )
          .catch((e) => setError(String(e)));
      }
    },
    setError,
  );
  useEffect(() => {
    const e = new SceneEngine(canvas.current!, setError);
    engine.current = e;
    e.start();
    let canceled = false;
    let offSystem: (() => void) | undefined;
    if (isDesktop()) {
      void import("@tauri-apps/api/event")
        .then(async ({ listen }) => {
          const off = await listen<string>("system-event", ({ payload }) => {
            if (canceled) return;
            applySystemEvent(e, payload);
            if (payload === "displays-changed") {
              void recoverOffscreenWindow().catch((err) =>
                setError(String(err)),
              );
              void displays()
                .then((ms) =>
                  setDisplayList(ms.map((m, i) => m.name ?? `屏幕 ${i + 1}`)),
                )
                .catch((err) => setError(String(err)));
            }
          });
          if (canceled) off();
          else offSystem = off;
        })
        .catch((err) => setError(String(err)));
    }
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      e.resize();
      clearTimeout(timer);
      timer = setTimeout(
        () =>
          setVariant((current) =>
            chooseVariant("side", e.getViewport().aspect, current),
          ),
        600,
      );
    });
    observer.observe(canvas.current!);
    const lost = (event: Event) => {
      event.preventDefault();
      setError("图形上下文暂时不可用，恢复后会重新加载原来的景色。");
      e.setSuspended("graphics", true);
      stopTestAudio();
    };
    const restored = () => setReloadVersion((version) => version + 1);
    const element = canvas.current!;
    element.addEventListener("webglcontextlost", lost);
    element.addEventListener("webglcontextrestored", restored);
    const interval = setInterval(() => {
      const s = e.instance?.stats();
      setStats(
        `${e.frameMs.toFixed(1)} ms / 帧 · CPU ${e.cpuMs.toFixed(1)} ms\n${e.getViewport().pixelWidth} × ${e.getViewport().pixelHeight} · ${s?.calls ?? 0} draw calls\n${s?.geometries ?? 0} geometries · ${s?.textures ?? 0} textures · ${s?.triangles ?? 0} triangles\n时间 ${e.clock.elapsed.toFixed(1)}s · 昼夜 ${((s?.phase ?? 0) * 24).toFixed(1)}h · seed ${latest.current.seed}`,
      );
    }, 1000);
    void displays()
      .then((ms) => setDisplayList(ms.map((m, i) => m.name ?? `屏幕 ${i + 1}`)))
      .catch((err) => setError(String(err)));
    return () => {
      canceled = true;
      offSystem?.();
      clearTimeout(timer);
      clearInterval(interval);
      observer.disconnect();
      qaController.current?.abort();
      element.removeEventListener("webglcontextlost", lost);
      element.removeEventListener("webglcontextrestored", restored);
      e.dispose();
    };
  }, []);
  useEffect(() => {
    setVariant((current) =>
      chooseVariant(
        "side",
        engine.current?.getViewport().aspect ?? 1.7,
        current,
      ),
    );
  }, [selection]);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      void e
        .load(
          () => manifest.load(variant),
          variant,
          seed,
          latest.current.params,
        )
        .then((ok) => {
          if (active) {
            setLoading(false);
            if (!ok) return;
            e.setParams(validateParams(latest.current.params));
            e.setSuspended("graphics", false);
            if (platformProbe && !qaStarted.current) {
              qaStarted.current = true;
              void import("./platformprobe").then(({ runPlatformProbe }) =>
                runPlatformProbe(e, setQaProgress),
              );
            }
            if (qaMode && !qaStarted.current) {
              qaStarted.current = true;
              qaController.current = new AbortController();
              void import("./selftest").then(({ runSelfTest }) =>
                runSelfTest(e, qaController.current!.signal, setQaProgress),
              );
            }
          }
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [variant, seed, reloadVersion]);
  useEffect(() => {
    engine.current?.setParams(validateParams(params));
  }, [params]);
  useEffect(() => {
    const e = engine.current;
    if (e) {
      e.quality = quality;
      e.resize();
    }
  }, [quality]);
  useEffect(() => {
    if (engine.current) engine.current.phase = phase;
  }, [phase]);
  useEffect(() => {
    if (engine.current) engine.current.paused = paused;
  }, [paused]);
  useEffect(() => {
    if (engine.current) engine.current.reducedMotion = reduced;
  }, [reduced]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanel(false);
        void exitFullscreen().catch((e) => setError(String(e)));
        return;
      }
      if ((event.target as HTMLElement).matches("input,select,textarea"))
        return;
      if (event.key.toLowerCase() === "f")
        void fullscreen().catch((e) => setError(String(e)));
      if (event.key === " ") {
        event.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <main
      className={awake ? "controls-awake" : "controls-asleep"}
      onPointerMove={wakeControls}
      onKeyDown={wakeControls}
    >
      <section className="world">
        {(qaMode || platformProbe) && (
          <output className="diagnostics" aria-label="自测进度">
            {qaProgress}
          </output>
        )}
        <canvas
          ref={canvas}
          aria-label={`云海列车 · ${variant === "side" ? "横向远眺" : "纵向穿行"}`}
        />
        <div className={`veil ${loading ? "visible" : ""}`} />
        <header>
          <div className="brand">
            <Cloud size={32} strokeWidth={1.5} />
            <div>
              LumaWindow<small>云海列车</small>
            </div>
          </div>
          {!panel && (
            <button className="settings-button" onClick={() => setPanel(true)}>
              <SlidersHorizontal size={16} />
              设置
            </button>
          )}
        </header>
        {phase === "relax" && (
          <div className="break-message">
            <h1>Take a break.</h1>
            <p>看看远处，放松一下肩膀。</p>
          </div>
        )}
        <footer>
          <span className="caption">
            <i />
            {params.palette === "mist"
              ? "暖霞云谷"
              : params.palette === "warm"
                ? "暖调"
                : "蓝调"}{" "}
            · {variant === "side" ? "横向远眺" : "纵向穿行"}
          </span>
          <div className="playback">
            <button
              className="icon"
              aria-label={paused ? "继续画面" : "暂停画面"}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={20} /> : <Pause size={20} />}
            </button>
            <button
              className="icon"
              aria-label="切换全屏"
              onClick={() =>
                void fullscreen().catch((e) => setError(String(e)))
              }
            >
              <Maximize size={20} />
            </button>
          </div>
        </footer>
        {diagnostics && <pre className="diagnostics">{stats}</pre>}
        {error && (
          <div role="alert" className="error">
            <p>{error}</p>
            <button
              onClick={() => {
                setReloadVersion((version) => version + 1);
              }}
            >
              重新加载
            </button>
          </div>
        )}
      </section>
      {isDesktop() && (
        <button
          className="desktop-control"
          onClick={() => void openControls().catch((e) => setError(String(e)))}
        >
          独立控制窗口
        </button>
      )}
      {panel && (
        <Controls
          {...{
            params,
            selection,
            quality,
            phase,
            diagnostics,
            reduced,
            displayList,
          }}
          setParams={setParams}
          setSelection={setSelection}
          setQuality={setQuality}
          setPhase={setPhase}
          regenerate={() => setSeed((s) => s + 1)}
          reset={() => setParams({ ...defaults })}
          close={() => setPanel(false)}
          setDiagnostics={setDiagnostics}
          setReduced={setReduced}
          audioActive={audioActive}
          audio={() =>
            audioActive
              ? stopTestAudio()
              : void testAudio().catch((e) => setError(String(e)))
          }
          move={(i) => void moveToDisplay(i).catch((e) => setError(String(e)))}
        />
      )}
    </main>
  );
}
