import { Icon } from "./icons";
import { Button, EmptyState, Pill } from "./ui";
import { getAt, gradient } from "../lib/configPath";
import { colorGradientStops } from "../lib/defaults";
import type { ConfigBinding } from "./Field";
import type { ConfigObject } from "../types/config";

export function endColorKey(obj: Record<string, unknown>): "end-color" | "end_color" {
  if (Object.prototype.hasOwnProperty.call(obj, "end-color")) return "end-color";
  if (Object.prototype.hasOwnProperty.call(obj, "end_color")) return "end_color";
  return "end-color";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function hex(value: unknown, fallback = "#6ef3c5"): string {
  return typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;
}

export function ColorValueField({ value, onChange, label = "颜色" }: { value: unknown; onChange: (next: string) => void; label?: string }) {
  const current = typeof value === "string" ? value : "";
  return (
    <label className="mini-field mini-field--wide">
      <span>{label}</span>
      <span className="color-pair">
        <span className="color-chip" style={{ background: hex(current) }}>
          <input
            type="color"
            value={hex(current).slice(0, 7)}
            onChange={(event) => onChange(event.target.value)}
            style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
            aria-label={label}
          />
        </span>
        <input className="input input--mono" value={current} onChange={(event) => onChange(event.target.value)} spellCheck={false} />
      </span>
    </label>
  );
}

export function ColorObjectEditor({
  binding,
  path,
  label,
  full = true,
  onInspect,
}: {
  binding: ConfigBinding;
  path: string;
  label: string;
  full?: boolean;
  onInspect?: (path: string) => void;
}) {
  const value = asRecord(binding.get(path));
  const endKey = endColorKey(value);
  return (
    <div className="color-object">
      <div className="color-object__head">
        <span className="color-dot" style={{ background: hex(value.value) }} />
        <b>{label}</b>
        <span className="mono">{path.split(".").slice(-1)[0]}</span>
        {onInspect ? (
          <button type="button" className="path-btn" onClick={() => onInspect(path)} title={path}>
            <Icon name="Link2" size={10} /> 详情
          </button>
        ) : null}
      </div>
      <div className={"color-grid" + (full ? "" : " color-grid--value")}>
        <ColorValueField value={value.value} onChange={(next) => binding.set(path + ".value", next)} />
        {full ? (
          <>
            <label className="mini-field">
              <span>alpha</span>
              <input className="input input--mono" type="number" min={0} max={255} value={String(value.alpha ?? 255)} onChange={(event) => binding.set(path + ".alpha", Number(event.target.value))} />
            </label>
            <ColorValueField label="end-color" value={value[endKey]} onChange={(next) => binding.set(path + "." + endKey, next)} />
            <label className="mini-field">
              <span>label</span>
              <input className="input input--mono" type="number" step="any" value={String(value.label ?? 0)} onChange={(event) => binding.set(path + ".label", Number(event.target.value))} />
            </label>
            <label className="mini-field">
              <span>name</span>
              <input className="input" value={String(value.name ?? "")} onChange={(event) => binding.set(path + ".name", event.target.value)} />
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ColorListEditor({
  binding,
  path,
  title,
  desc,
  unit,
  allowGenerate = false,
  emptyHint = "还没有颜色断点。",
  onInspect,
}: {
  binding: ConfigBinding;
  path: string;
  title: string;
  desc?: string;
  unit?: string;
  allowGenerate?: boolean;
  emptyHint?: string;
  onInspect?: (path: string) => void;
}) {
  const list = (getAt(binding.get("$"), path, []) as ConfigObject[]) ?? [];
  const write = (next: ConfigObject[]) => binding.set(path, next);

  return (
    <div className="stack">
      <div className="inline-actions" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <b style={{ fontSize: 13 }}>{title}</b>
          {desc ? <p style={{ fontSize: 11.5, color: "var(--text-3)" }}>{desc}</p> : null}
        </div>
        <div className="inline-actions">
          <Pill>{list.length} 段</Pill>
          {onInspect ? (
            <button type="button" className="path-btn" onClick={() => onInspect(path)} title={path}>
              <Icon name="Link2" size={10} /> 详情
            </button>
          ) : null}
        </div>
      </div>

      {list.length ? (
        <div className="gradient-preview" style={{ background: gradient(list) }}>
          {unit ? <span className="gradient-preview__label mono">{unit}</span> : null}
        </div>
      ) : null}

      <div className="stack" style={{ gap: 8 }}>
        {list.map((stop, index) => {
          const endKey = endColorKey(stop);
          return (
            <div key={index} className="swatch-row">
              <span className="swatch" style={{ background: hex(stop.value) }} />
              <div className="swatch-row__meta">
                <input className="input input--mono" type="number" step="any" value={String(stop.label ?? 0)} onChange={(event) => binding.set(path + "[" + index + "].label", Number(event.target.value))} aria-label={"阈值 " + (index + 1)} title={"阈值" + (unit ? "（" + unit + "）" : "")} />
                <input className="input" value={String(stop.name ?? "")} onChange={(event) => binding.set(path + "[" + index + "].name", event.target.value)} aria-label={"名称 " + (index + 1)} />
              </div>
              <span className="color-pair" style={{ flex: "0 0 auto" }}>
                <span className="color-chip" style={{ width: 30, height: 30, background: hex(stop.value) }}>
                  <input type="color" value={hex(stop.value).slice(0, 7)} onChange={(event) => binding.set(path + "[" + index + "].value", event.target.value)} style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} aria-label={"颜色 " + (index + 1)} />
                </span>
                <span className="color-chip" style={{ width: 30, height: 30, background: hex(stop[endKey], "#ffffff") }}>
                  <input type="color" value={hex(stop[endKey], "#ffffff").slice(0, 7)} onChange={(event) => binding.set(path + "[" + index + "]." + endKey, event.target.value)} style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} aria-label={"结束颜色 " + (index + 1)} />
                </span>
              </span>
              <label className="alpha-input" title="透明度 alpha">
                <span className="mono">α</span>
                <input className="input input--mono" type="number" min={0} max={255} value={String(stop.alpha ?? 255)} onChange={(event) => binding.set(path + "[" + index + "].alpha", Number(event.target.value))} aria-label={"透明度 " + (index + 1)} />
              </label>
              <Button variant="ghost" iconOnly size="sm" icon="ArrowUp" aria-label="上移" disabled={index === 0} onClick={() => {
                const next = [...list];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                write(next);
              }} />
              <Button variant="ghost" iconOnly size="sm" icon="Trash2" aria-label="删除断点" onClick={() => write(list.filter((_, i) => i !== index))} />
            </div>
          );
        })}
      </div>

      {list.length ? null : <EmptyState icon="Palette" title="空列表" hint={emptyHint} />}

      <div className="inline-actions">
        <Button size="sm" icon="Plus" onClick={() => write([...list, { label: 0, name: String(list.length + 1), value: "#6ef3c5", alpha: 255, "end-color": "#ffffff" } as unknown as ConfigObject])}>
          添加断点
        </Button>
        {allowGenerate ? (
          <Button size="sm" icon="Sparkles" onClick={() => write(colorGradientStops(path, list.length || 6) as unknown as ConfigObject[])}>
            生成一组配色
          </Button>
        ) : null}
        <span className="field__hint" style={{ marginLeft: "auto" }}>{path}</span>
      </div>
    </div>
  );
}
