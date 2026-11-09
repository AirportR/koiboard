import { Icon } from "../components/icons";
import { Fields } from "../components/Field";
import { Button, Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { colorGradientStops, defaultItem } from "../lib/defaults";
import { getAt, gradient } from "../lib/configPath";
import type { ConfigObject } from "../types/config";
import type { ConfigBinding } from "../components/Field";
import type { ViewProps } from "./types";

function ColorStopEditor({ binding, path, unit, title, desc }: { binding: ConfigBinding; path: string; unit: string; title: string; desc: string }) {
  const list = (getAt(binding.get("$"), path, []) as ConfigObject[]) ?? [];
  const write = (next: ConfigObject[]) => binding.set(path, next);
  return (
    <div className="stack">
      <div className="inline-actions" style={{ justifyContent: "space-between" }}>
        <div>
          <b style={{ fontSize: 13 }}>{title}</b>
          <p style={{ fontSize: 11.5, color: "var(--text-3)" }}>{desc}</p>
        </div>
        <Pill>{list.length} 段</Pill>
      </div>
      <div className="gradient-preview" style={{ background: gradient(list) }}>
        <span className="gradient-preview__label mono">{unit}</span>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {list.map((stop, index) => (
          <div key={index} className="swatch-row">
            <span className="swatch" style={{ background: String(stop.value ?? "#000") }} />
            <div className="swatch-row__meta">
              <input
                className="input input--mono"
                type="number"
                value={String(stop.label ?? 0)}
                onChange={(event) => binding.set(path + "[" + index + "].label", Number(event.target.value))}
                aria-label={"阈值 " + (index + 1)}
                title={"阈值（" + unit + "）"}
              />
              <input
                className="input"
                value={String(stop.name ?? "")}
                onChange={(event) => binding.set(path + "[" + index + "].name", event.target.value)}
                aria-label={"名称 " + (index + 1)}
              />
            </div>
            <div className="color-row" style={{ flex: "0 0 auto" }}>
              <label className="color-chip" style={{ background: String(stop.value ?? "#000"), width: 32, height: 32 }}>
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(String(stop.value ?? "")) ? String(stop.value) : "#6ef3c5"}
                  onChange={(event) => binding.set(path + "[" + index + "].value", event.target.value)}
                  style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                  aria-label={"颜色 " + (index + 1)}
                />
              </label>
              <label className="color-chip" style={{ background: String(stop.end_color ?? "#ffffff"), width: 32, height: 32 }}>
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(String(stop.end_color ?? "")) ? String(stop.end_color) : "#ffffff"}
                  onChange={(event) => binding.set(path + "[" + index + "].end_color", event.target.value)}
                  style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                  aria-label={"结束颜色 " + (index + 1)}
                />
              </label>
            </div>
            <Button variant="ghost" iconOnly size="sm" icon="ArrowUp" aria-label="上移" disabled={index === 0} onClick={() => {
              const next = [...list];
              [next[index - 1], next[index]] = [next[index], next[index - 1]];
              write(next);
            }} />
            <Button variant="ghost" iconOnly size="sm" icon="Trash2" aria-label="删除断点" onClick={() => write(list.filter((_, i) => i !== index))} />
          </div>
        ))}
      </div>
      <div className="inline-actions">
        <Button size="sm" icon="Plus" onClick={() => write([...list, defaultItem("colorStop") as ConfigObject])}>添加断点</Button>
        <Button size="sm" icon="Sparkles" onClick={() => write(colorGradientStops(path, list.length || 6))}>生成一组配色</Button>
        <span className="field__hint" style={{ marginLeft: "auto" }}>{path}</span>
      </div>
    </div>
  );
}

export default function Appearance({ model, binding }: ViewProps) {
  const color = getAt(model.config, "$.image.color") as ConfigObject | undefined;
  const background = (color?.background ?? {}) as ConfigObject;
  const delay = (color?.delay ?? []) as ConfigObject[];
  return (
    <div className="view">
      <ViewHeader
        index="10"
        eyebrow="Appearance"
        title="图像外观"
        subtitle="结果图的背景、延迟与速度配色。改动会实时渲染为上方渐变预览。"
        meta={
          <>
            <Pill icon="Palette">{Object.keys(background).length} 个背景</Pill>
            <Pill icon="Timer">{delay.length} 段延迟</Pill>
            <Pill tone="mint" icon="Image">{String(getAt(model.config, "$.image.speedFormat", "—"))}</Pill>
          </>
        }
      />
      <div className="split">
        <div className="stack stack--lg">
          <Panel eyebrow="Format" title="格式与水印" icon="Type">
            <div className="stack" style={{ gap: 16 }}>
              <Fields specs={[{ path: "$.image.speedFormat", label: "速度格式", mono: true, wide: true, placeholder: "%s Mbps", helper: "结果图中速度数字的显示模板。" }]} binding={binding} />
              <Fields
                specs={[
                  { path: "$.image.watermark.text", label: "水印文本", wide: true },
                  { path: "$.image.watermark.trace", label: "UID 追踪", kind: "switch", helper: "在水印中附带可追溯的用户标记。" },
                ]}
                binding={binding}
              />
            </div>
          </Panel>
          <Panel eyebrow="Background" title="背景配色" icon="Image" desc="常用于结果图顶部与底部渐变。">
            <div className="stack" style={{ gap: 12 }}>
              {Object.keys(background).length ? (
                Object.keys(background).map((key) => {
                  const entry = background[key] as ConfigObject;
                  return (
                    <div key={key} className="inline-actions" style={{ gap: 10 }}>
                      <span className="pill" style={{ minWidth: 76, justifyContent: "center" }}>{key}</span>
                      <div className="color-row grow">
                        <label className="color-chip" style={{ background: String(entry?.value ?? "#000") }}>
                          <input
                            type="color"
                            value={/^#[0-9a-f]{6}$/i.test(String(entry?.value ?? "")) ? String(entry.value) : "#0e1319"}
                            onChange={(event) => binding.set("$.image.color.background." + key + ".value", event.target.value)}
                            style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                            aria-label={key}
                          />
                        </label>
                        <input className="input input--mono" value={String(entry?.value ?? "")} onChange={(event) => binding.set("$.image.color.background." + key + ".value", event.target.value)} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <span className="field__hint">当前没有背景配色项。</span>
              )}
            </div>
          </Panel>
          <Panel eyebrow="Delay" title="延迟配色" icon="Timer">
            <ColorStopEditor binding={binding} path="$.image.color.delay" title="延迟断点" desc="label 为阈值，单位毫秒；数值越小越靠前。" unit="ms" />
          </Panel>
          <Panel eyebrow="Speed" title="速度配色" icon="Zap">
            <ColorStopEditor binding={binding} path="$.image.color.speed" title="速度断点" desc="label 为速度阈值，单位与 speedFormat 一致。" unit="Mbps" />
          </Panel>
        </div>
        <div className="stack">
          <Notice tone="iris" icon="Palette">
            渐变断点会按数组顺序依次排布；调整顺序即可改变颜色过渡方向。
          </Notice>
          <Panel eyebrow="Preview" title="结果图预览" icon="Image">
            <div className="result-preview" style={{ background: gradient(delay) }}>
              <div className="result-preview__head">
                <span className="mono">KOIPY · DEMO</span>
                <span className="mono">{String(getAt(model.config, "$.image.speedFormat", "%s Mbps"))}</span>
              </div>
              <div className="result-preview__rows">
                {delay.slice(0, 3).map((stop, index) => (
                  <div key={index} className="result-preview__row">
                    <span className="mono">HK-{String(index + 1).padStart(2, "0")}</span>
                    <span className="result-preview__bar" style={{ width: 40 + index * 18 + "%", background: String(stop.value ?? "#fff") }} />
                    <span className="mono">{String(stop.label ?? "")}ms</span>
                  </div>
                ))}
              </div>
              <div className="result-preview__foot mono">{String(getAt(model.config, "$.image.watermark.text", ""))}</div>
            </div>
          </Panel>
          <Notice tone="amber" icon="TriangleAlert">
            背景与文字色差过小会降低可读性，建议在浅色背景上使用深色文字。
          </Notice>
          <Panel eyebrow="Hint" title="快捷操作" icon="Sparkles" bodyClass="panel__body--tight">
            <div className="quick-list">
              <button type="button" className="quick" onClick={() => binding.set("$.image.color.delay", colorGradientStops("$.image.color.delay", 6))}>
                <Icon name="Sparkles" />
                <b>重置延迟配色</b>
                <span>随机生成</span>
              </button>
              <button type="button" className="quick" onClick={() => binding.set("$.image.color.speed", colorGradientStops("$.image.color.speed", 6))}>
                <Icon name="Sparkles" />
                <b>重置速度配色</b>
                <span>随机生成</span>
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
