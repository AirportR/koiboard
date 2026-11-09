import { useMemo } from "react";
import { Icon } from "./icons";
import { Button, Pill } from "./ui";
import { runtimeFields } from "../data/metadata";
import { getAt } from "../lib/configPath";
import type { ConfigBinding } from "./Field";

const specs = runtimeFields("$.runtime");

function defaultFor(path: string): unknown {
  const spec = specs.find((item) => item.path === path);
  if (!spec) return "";
  if (spec.kind === "switch") return false;
  if (spec.kind === "number") return spec.min ?? 0;
  if (spec.kind === "select") return spec.choices?.[0] ?? "";
  return "";
}

export function RuntimeOverrides({ binding, basePath, onInspect }: { binding: ConfigBinding; basePath: string; onInspect: (path: string) => void }) {
  const current = (getAt(binding.get(basePath), "$", {}) as Record<string, unknown>) ?? {};
  const keys = Object.keys(current);
  const available = useMemo(() => specs.filter((spec) => !keys.includes(spec.path.split(".").at(-1) ?? "")), [keys]);

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="inline-actions" style={{ justifyContent: "space-between" }}>
        <span className="field__hint">覆盖项只作用于这一条规则；未设置的项继承全局 runtime。</span>
        <Pill tone={keys.length ? "iris" : "dashed"}>{keys.length} 项覆盖</Pill>
      </div>

      {keys.length ? (
        <div className="stack" style={{ gap: 10 }}>
          {keys.map((key) => {
            const path = basePath + "." + key;
            const spec = specs.find((item) => item.path === "$.runtime." + key);
            const value = current[key];
            const kind = spec?.kind ?? (typeof value === "boolean" ? "switch" : typeof value === "number" ? "number" : "text");
            return (
              <div key={key} className="override">
                <div className="override__head">
                  <span className="mono">runtime.{key}</span>
                  <button type="button" className="path-btn" onClick={() => onInspect(path)} title={path}>
                    <Icon name="Link2" size={10} /> 详情
                  </button>
                  <Button variant="ghost" iconOnly size="sm" icon="X" aria-label={"移除覆盖 " + key} onClick={() => binding.unset(path)} />
                </div>
                {kind === "switch" ? (
                  <button type="button" role="switch" aria-checked={value === true} aria-label={key} className="switch" onClick={() => binding.set(path, value !== true)} />
                ) : kind === "select" ? (
                  <select className="select" value={String(value ?? "")} onChange={(event) => binding.set(path, event.target.value)}>
                    {(spec?.choices ?? []).map((choice) => (
                      <option key={choice} value={choice}>{choice}</option>
                    ))}
                  </select>
                ) : kind === "number" ? (
                  <input className="input input--mono" type="number" value={String(value ?? "")} onChange={(event) => binding.set(path, Number(event.target.value))} />
                ) : (
                  <input className={spec?.mono ? "input input--mono" : "input"} value={String(value ?? "")} onChange={(event) => binding.set(path, event.target.value)} placeholder={spec?.placeholder} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="readonly-strip"><Icon name="Info" /> 还没有覆盖项，全部继承全局 runtime。</div>
      )}

      <div className="field">
        <label className="field__label">添加覆盖项</label>
        <select
          aria-label="添加覆盖项"
          className="select"
          value=""
          onChange={(event) => {
            const key = event.target.value;
            if (!key) return;
            binding.set(basePath + "." + key, defaultFor("$.runtime." + key));
          }}
        >
          <option value="">选择要覆盖的运行时字段…</option>
          {available.map((spec) => (
            <option key={spec.path} value={spec.path.split(".").at(-1)}>{spec.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
