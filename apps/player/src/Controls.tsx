import { X, RefreshCw, Volume2 } from "lucide-react";
import {
  type Params,
  type Quality,
  type Selection,
  type Phase,
} from "../../../packages/scene-sdk/src";
interface Props {
  params: Params;
  setParams: (p: Params) => void;
  selection: Selection;
  setSelection: (s: Selection) => void;
  quality: Quality;
  setQuality: (q: Quality) => void;
  phase: Phase;
  setPhase: (p: Phase) => void;
  regenerate: () => void;
  reset: () => void;
  close: () => void;
  diagnostics: boolean;
  setDiagnostics: (b: boolean) => void;
  reduced: boolean;
  setReduced: (b: boolean) => void;
  audio: () => void;
  audioActive: boolean;
  displayList: string[];
  move: (i: number) => void;
}
export function Controls(p: Props) {
  return (
    <aside className="panel" aria-label="场景设置">
      <div className="panel-heading">
        <h2>场景设置</h2>
        <button className="icon plain" onClick={p.close} aria-label="关闭设置">
          <X size={19} />
        </button>
      </div>
      <p className="scene-note">暖霞云谷 · 横向远眺</p>
      <label className="select-row">
        光照
        <select
          aria-label="光照模式"
          value={p.params.timeMode}
          onChange={(e) =>
            p.setParams({
              ...p.params,
              timeMode: e.target.value as Params["timeMode"],
            })
          }
        >
          <option value="auto">自动昼夜</option>
          <option value="fixed">固定时段</option>
        </select>
      </label>
      {p.params.timeMode === "auto" && (
        <label className="select-row">
          昼夜周期
          <select
            aria-label="昼夜周期"
            value={p.params.cycleMinutes}
            onChange={(e) =>
              p.setParams({ ...p.params, cycleMinutes: Number(e.target.value) })
            }
          >
            <option value={15}>15 分钟</option>
            <option value={30}>30 分钟</option>
            <option value={60}>60 分钟</option>
          </select>
        </label>
      )}
      <div className="segments time-presets">
        {(
          [
            [0.48, "白天"],
            [0.72, "暖霞"],
            [0, "月夜"],
          ] as const
        ).map(([time, name]) => (
          <button
            key={name}
            onClick={() =>
              p.setParams({
                ...p.params,
                daylight: time,
                timeRequest: p.params.timeRequest + 1,
                timeMode: "fixed",
              })
            }
          >
            {name}
          </button>
        ))}
      </div>
      <div className="sliders">
        {(
          [
            ["clouds", "云量"],
            ["cloudShape", "云层形态"],
            ["framing", "取景远近"],
            ["fog", "雾感"],
            ["speed", "行进速度"],
            ["daylight", "光照时段"],
          ] as const
        ).map(([key, label]) => (
          <label className="slider" key={key}>
            <span>{label}</span>
            <input
              aria-label={label}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={p.params[key]}
              onChange={(e) =>
                p.setParams({
                  ...p.params,
                  [key]: Number(e.target.value),
                  ...(key === "daylight"
                    ? {
                        timeMode: "fixed" as const,
                        timeRequest: p.params.timeRequest + 1,
                      }
                    : {}),
                })
              }
            />
          </label>
        ))}
      </div>
      <label className="select-row">
        色调
        <select
          value={p.params.palette}
          onChange={(e) =>
            p.setParams({
              ...p.params,
              palette: e.target.value as Params["palette"],
            })
          }
        >
          <option value="mist">自然</option>
          <option value="warm">暖调</option>
          <option value="blue">蓝调</option>
        </select>
      </label>
      <fieldset>
        <legend>画质</legend>
        <div className="segments">
          {(
            [
              ["eco", "省电"],
              ["balanced", "平衡"],
              ["high", "高质量"],
            ] as const
          ).map(([id, name]) => (
            <button
              key={id}
              aria-pressed={p.quality === id}
              onClick={() => p.setQuality(id)}
            >
              {name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>氛围预览</legend>
        <div className="segments">
          {(["ambient", "focus", "relax"] as const).map((id) => (
            <button
              key={id}
              aria-pressed={p.phase === id}
              onClick={() => p.setPhase(id)}
            >
              {id[0].toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="divider" />
      <button className="wide" onClick={p.regenerate}>
        <RefreshCw size={16} />
        换一个景色
      </button>
      <div className="options">
        <label>
          <input
            type="checkbox"
            checked={p.reduced}
            onChange={(e) => p.setReduced(e.target.checked)}
          />
          减少动态效果
        </label>
        <label>
          <input
            type="checkbox"
            checked={p.diagnostics}
            onChange={(e) => p.setDiagnostics(e.target.checked)}
          />
          显示诊断
        </label>
      </div>
      {p.displayList.length > 0 && (
        <label className="select-row">
          播放屏幕
          <select
            defaultValue=""
            onChange={(e) => p.move(Number(e.target.value))}
          >
            <option disabled value="">
              选择显示器
            </option>
            {p.displayList.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="panel-bottom">
        <button className="text-button" onClick={p.reset}>
          恢复默认
        </button>
        <button className="text-button" onClick={p.audio}>
          <Volume2 size={15} />
          {p.audioActive ? "停止测试音" : "测试声音"}
        </button>
      </div>
    </aside>
  );
}
