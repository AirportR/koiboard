import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { Button, Pill } from "./ui";
import { getAt, hasAt, helpFor, isSensitive, maskSensitive, pathLabel, riskFor, summarize, typeOf } from "../lib/configPath";
import { isReadOnlyPath } from "../lib/readOnly";
import type { KoipyModel } from "../hooks/useKoipyConfig";

export function Inspector({ path, model, onClose }: { path: string | null; model: KoipyModel; onClose: () => void }) {
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!path) return;
    setCopied("");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, onClose]);

  if (!path) return null;

  const value = getAt(model.config, path);
  const exists = hasAt(model.config, path);
  const originalValue = getAt(model.original, path);
  const type = typeOf(value);
  const dirty = model.isDirty(path);
  const help = helpFor(path, "");
  const risk = riskFor(path, value, model.config);
  const readOnly = isReadOnlyPath(path);
  const display =
    typeof value === "object" && value !== null
      ? JSON.stringify(value, null, 2)
      : String(maskSensitive(value, path, model.showSecrets) || (isSensitive(path) ? "已脱敏" : "—"));

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="字段详情">
        <header className="drawer__head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="eyebrow">字段详情</span>
            <h2 style={{ marginTop: 6 }}>{pathLabel(path)}</h2>
            <small>{path}</small>
          </div>
          <Button variant="ghost" iconOnly icon="X" aria-label="关闭详情" onClick={onClose} />
        </header>
        <div className="drawer__body">
          <div className="inline-actions">
            <Pill>{type}</Pill>
            {dirty ? <Pill tone="amber" icon="Diff">未保存</Pill> : <Pill tone="mint" icon="Check">与运行态一致</Pill>}
            {readOnly ? <Pill tone="iris" icon="ShieldCheck">只读</Pill> : null}
          </div>

          <div className="drawer__section">
            <h3>说明</h3>
            <p>{help}</p>
          </div>

          <div className="drawer__section">
            <h3>当前值</h3>
            <div className="drawer__value">{display || "未设置"}</div>
            {dirty ? (
              <p style={{ marginTop: 8, fontSize: 12 }}>
                运行态值：<span className="mono">{String(maskSensitive(originalValue, path, model.showSecrets) || "—")}</span>
              </p>
            ) : null}
          </div>

          {typeof value === "object" && value !== null ? (
            <div className="drawer__section">
              <h3>摘要</h3>
              <p>{summarize(value, path, model.showSecrets)}</p>
            </div>
          ) : null}

          {risk ? (
            <div className="drawer__section">
              <h3>风险提示</h3>
              <div className="notice notice--amber">
                <Icon name="TriangleAlert" />
                <div>{risk}</div>
              </div>
            </div>
          ) : null}

          {readOnly ? (
            <div className="notice notice--iris">
              <Icon name="ShieldCheck" />
              <div>webapi 属于只读根配置：前端不会写入它的修改，保存前会被恢复为后端当前值。</div>
            </div>
          ) : null}
        </div>
        <footer className="drawer__actions">
          <Button
            icon={copied === "path" ? "Check" : "Copy"}
            onClick={() => void copy(path, "path")}
            size="sm"
            variant="ghost"
          >
            复制路径
          </Button>
          <Button
            icon={copied === "value" ? "Check" : "Copy"}
            onClick={() => void copy(typeof value === "string" ? value : JSON.stringify(value, null, 2), "value")}
            size="sm"
            variant="ghost"
          >
            复制值
          </Button>
          <span style={{ marginLeft: "auto" }} />
          <Button icon="RotateCcw" size="sm" disabled={!dirty || readOnly || !exists} onClick={() => model.restorePath(path)}>
            还原此字段
          </Button>
        </footer>
      </aside>
    </>
  );
}
