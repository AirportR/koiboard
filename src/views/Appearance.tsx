import { Icon } from "../components/icons";
import { Fields } from "../components/Field";
import { ColorListEditor, ColorObjectEditor } from "../components/ColorEditors";
import { Button, Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { getAt, gradient } from "../lib/configPath";
import { colorGradientStops } from "../lib/defaults";
import type { ConfigObject } from "../types/config";
import type { ViewProps } from "./types";

const speedFormats = [
  { value: "byte/binary", label: "byte/binary · MiB/s" },
  { value: "byte/decimal", label: "byte/decimal · MB/s" },
  { value: "bit/binary", label: "bit/binary · Mib/s" },
  { value: "bit/decimal", label: "bit/decimal · Mbit/s" },
];

const emojiSources = [
  "TwemojiLocalSource",
  "OpenmojiLocalSource",
  "ApplePediaSource",
  "GooglePediaSource",
  "SamsungPediaSource",
  "MicrosoftPediaSource",
  "WhatsAppPediaSource",
  "TwitterPediaSource",
  "FacebookPediaSource",
  "MicrosoftTeamsPediaSource",
  "SkypePediaSource",
  "JoyPixelsPediaSource",
  "TossFacePediaSource",
  "RainbowDraw",
];

const backgroundPresets = [
  { key: "inbound", label: "入口背景" },
  { key: "outbound", label: "出口背景" },
  { key: "script", label: "连通性测试图" },
  { key: "scriptTitle", label: "连通性标题栏" },
  { key: "speed", label: "速度图内容" },
  { key: "speedTitle", label: "速度图标题栏" },
  { key: "topoTitle", label: "拓扑图标题栏" },
];

const statusPresets = [
  { key: "yes", label: "成功 / 解锁", full: true },
  { key: "no", label: "失败", full: true },
  { key: "na", label: "无数据", full: true },
  { key: "wait", label: "等待", full: true },
  { key: "warn", label: "警告", full: true },
  { key: "ipriskLow", label: "IP 风险 · 低", full: true },
  { key: "ipriskMedium", label: "IP 风险 · 中", full: true },
  { key: "ipriskHigh", label: "IP 风险 · 高", full: true },
  { key: "ipriskVeryHigh", label: "IP 风险 · 极高", full: true },
  { key: "xline", label: "X 轴线", full: false },
  { key: "yline", label: "Y 轴线", full: false },
  { key: "font", label: "字体颜色", full: false },
];

function newColorObject(): ConfigObject {
  return { label: 0, name: "", value: "#ffffff", alpha: 255, "end-color": "#ffffff" };
}

export default function Appearance({ model, binding, onInspect }: ViewProps) {
  const color = (getAt(model.config, "$.image.color") as ConfigObject | undefined) ?? {};
  const background = (color.background ?? {}) as ConfigObject;
  const delay = (color.delay ?? []) as ConfigObject[];
  const backgroundKeys = Object.keys(background);
  const statusKeys = statusPresets.map((preset) => preset.key).filter((key) => key in color);
  const missingBackground = backgroundPresets.filter((preset) => !(preset.key in background));
  const missingStatus = statusPresets.filter((preset) => !(preset.key in color));
  const speedFormat = String(getAt(model.config, "$.image.speedFormat", "byte/decimal"));

  return (
    <div className="view">
      <ViewHeader
        index="10"
        eyebrow="Appearance"
        title="图像外观"
        subtitle="输出格式、背景与状态色、渐变断点与水印。所有配色改动会实时反映到右侧预览。"
        meta={
          <>
            <Pill icon="Type">{speedFormat}</Pill>
            <Pill icon="Palette">{backgroundKeys.length} 背景</Pill>
            <Pill tone="mint" icon="Sparkles">{statusKeys.length} 状态色</Pill>
          </>
        }
      />
      <div className="split">
        <div className="stack stack--lg">
          <Panel eyebrow="Format" title="输出与格式" icon="Type" desc="影响结果图的尺寸、字体、emoji 与保存行为。">
            <div className="stack" style={{ gap: 18 }}>
              <Fields
                specs={[
                  { path: "$.image.speedFormat", label: "速度格式", kind: "select", choices: speedFormats.map((item) => item.value), helper: "byte/decimal 是默认的 MB/s，二进制以 1024 换算。" },
                  { path: "$.image.title", label: "绘图标题", helper: "显示在结果图顶部，例如机器人名字。" },
                  { path: "$.image.pixelThreshold", label: "像素阈值", mono: true, placeholder: "2500x3500", helper: "超过阈值发送原图，格式 宽x高。" },
                  { path: "$.image.font", label: "字体路径", mono: true, wide: true, placeholder: "./resources/alibaba-Regular.otf" },
                  { path: "$.image.emoji.source", label: "Emoji 图源", kind: "select", choices: emojiSources, wide: true, helper: "本地图源需要先下载资源包；TwemojiLocalSource 为默认值。" },
                ]}
                binding={binding}
              />
              <Fields
                specs={[
                  { path: "$.image.emoji.enable", label: "启用 Emoji", kind: "switch" },
                  { path: "$.image.compress", label: "压缩图片", kind: "switch" },
                  { path: "$.image.save", label: "保存图片到本地", kind: "switch" },
                  { path: "$.image.invert", label: "取反色", kind: "switch", helper: "与透明度模式不兼容。" },
                  { path: "$.image.logo", label: "显示协议 Logo", kind: "switch" },
                  { path: "$.image.showUnsafeTips", label: "不安全后端提示", kind: "switch" },
                  { path: "$.image.endColorsSwitch", label: "end-color 渐变", kind: "switch" },
                  { path: "$.image.speedEndColorSwitch", label: "速度图渐变", kind: "switch" },
                ]}
                binding={binding}
              />
            </div>
          </Panel>

          <Panel
            eyebrow="Background"
            title="背景配色"
            icon="Image"
            desc="每项都是一个完整颜色对象：value、alpha、end-color、label、name。"
            actions={<Pill>{backgroundKeys.length} 项</Pill>}
          >
            <div className="stack" style={{ gap: 10 }}>
              {backgroundKeys.map((key) => {
                const preset = backgroundPresets.find((item) => item.key === key);
                return (
                  <ColorObjectEditor
                    key={key}
                    binding={binding}
                    path={"$.image.color.background." + key}
                    label={preset?.label ?? key}
                    onInspect={onInspect}
                  />
                );
              })}
              {missingBackground.length ? (
                <div className="field">
                  <label className="field__label">补充背景项</label>
                  <select
                    className="select"
                    value=""
                    aria-label="添加背景颜色项"
                    onChange={(event) => {
                      if (!event.target.value) return;
                      binding.set("$.image.color.background." + event.target.value, newColorObject());
                    }}
                  >
                    <option value="">选择要添加的背景项…</option>
                    {missingBackground.map((item) => (
                      <option key={item.key} value={item.key}>{item.label} ({item.key})</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel
            eyebrow="Status"
            title="状态色"
            icon="CircleDot"
            desc="解锁、IP 风险、坐标轴与字体的颜色。"
            actions={<Pill>{statusKeys.length} 项</Pill>}
          >
            <div className="stack" style={{ gap: 10 }}>
              {statusPresets.filter((preset) => preset.key in color).map((preset) => (
                <ColorObjectEditor
                  key={preset.key}
                  binding={binding}
                  path={"$.image.color." + preset.key}
                  label={preset.label}
                  full={preset.full}
                  onInspect={onInspect}
                />
              ))}
              {missingStatus.length ? (
                <div className="field">
                  <label className="field__label">补充状态色</label>
                  <select
                    className="select"
                    value=""
                    aria-label="添加状态颜色"
                    onChange={(event) => {
                      if (!event.target.value) return;
                      binding.set("$.image.color." + event.target.value, newColorObject());
                    }}
                  >
                    <option value="">选择要添加的状态色…</option>
                    {missingStatus.map((item) => (
                      <option key={item.key} value={item.key}>{item.label} ({item.key})</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel eyebrow="Out colors" title="outColor 输出色表" icon="Layers" desc="额外的输出颜色表，通常留空；结构与延迟/速度断点一致。">
            <ColorListEditor
              binding={binding}
              path="$.image.color.outColor"
              title="outColor"
              desc="按顺序排列的颜色对象。"
              emptyHint="当前为空，通常不需要配置。"
              onInspect={onInspect}
            />
          </Panel>

          <Panel eyebrow="Delay" title="延迟配色" icon="Timer">
            <ColorListEditor binding={binding} path="$.image.color.delay" title="延迟断点" desc="label 为阈值，单位毫秒；数值越小越靠前。" unit="ms" allowGenerate onInspect={onInspect} />
          </Panel>

          <Panel eyebrow="Speed" title="速度配色" icon="Zap">
            <ColorListEditor binding={binding} path="$.image.color.speed" title="速度断点" desc="label 为速度阈值，单位与速度格式一致。" unit={speedFormat.includes("bit") ? "Mbit/s" : "MB/s"} allowGenerate onInspect={onInspect} />
          </Panel>

          <Panel eyebrow="Watermark" title="水印" icon="Type" desc="水印的颜色、角度、间距与追踪。">
            <div className="stack" style={{ gap: 18 }}>
              <Fields
                specs={[
                  { path: "$.image.watermark.text", label: "水印文本", wide: true },
                  { path: "$.image.watermark.alpha", label: "透明度", kind: "number", min: 0, max: 255, step: 1 },
                  { path: "$.image.watermark.size", label: "字号", kind: "number", min: 8, max: 512, step: 1 },
                  { path: "$.image.watermark.angle", label: "旋转角度", kind: "number", step: "any" },
                  { path: "$.image.watermark.start-y", label: "起始 Y", kind: "number", step: 1 },
                  { path: "$.image.watermark.row-spacing", label: "行间距", kind: "number", step: 1 },
                  { path: "$.image.watermark.enable", label: "启用水印", kind: "switch" },
                  { path: "$.image.watermark.trace", label: "UID 追踪", kind: "switch" },
                  { path: "$.image.watermark.shadow", label: "阴影（暂未实现）", kind: "switch" },
                ]}
                binding={binding}
              />
              <ColorObjectEditor binding={binding} path="$.image.watermark.color" label="水印颜色" onInspect={onInspect} />
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Notice tone="iris" icon="Palette">
            颜色对象同时存在于 <span className="code-inline">value</span> 与 <span className="code-inline">end-color</span>：前者是主色，后者用于渐变或描边。
          </Notice>
          <Panel eyebrow="Preview" title="结果图预览" icon="Image">
            <div className="result-preview" style={{ background: gradient(delay) }}>
              <div className="result-preview__head">
                <span className="mono">{String(getAt(model.config, "$.image.title", "KOIPY"))}</span>
                <span className="mono">{String(getAt(model.config, "$.image.speedFormat", "byte/decimal"))}</span>
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
              <div className="result-preview__foot mono">
                {String(getAt(model.config, "$.image.watermark.text", ""))}
                {getAt(model.config, "$.image.watermark.trace") ? " · UID" : ""}
              </div>
            </div>
          </Panel>
          <Notice tone="amber" icon="TriangleAlert">
            背景与文字色差过小会降低可读性；开启 <span className="code-inline">invert</span> 时透明度会失效。
          </Notice>
          <Panel eyebrow="Hint" title="快捷操作" icon="Sparkles" bodyClass="panel__body--tight">
            <div className="quick-list">
              <button type="button" className="quick" onClick={() => binding.set("$.image.color.delay", colorGradientStops("$.image.color.delay", 6) as unknown as ConfigObject[])}>
                <Icon name="Sparkles" />
                <b>重置延迟配色</b>
                <span>随机生成</span>
              </button>
              <button type="button" className="quick" onClick={() => binding.set("$.image.color.speed", colorGradientStops("$.image.color.speed", 6) as unknown as ConfigObject[])}>
                <Icon name="Sparkles" />
                <b>重置速度配色</b>
                <span>随机生成</span>
              </button>
              <button type="button" className="quick" onClick={() => {
                const current = (getAt(model.config, "$.image.color.background", {}) as ConfigObject) ?? {};
                const next: ConfigObject = { ...current };
                backgroundPresets.forEach((preset) => {
                  if (!(preset.key in next)) next[preset.key] = newColorObject();
                });
                binding.set("$.image.color.background", next);
              }}>
                <Icon name="Eraser" />
                <b>补齐缺失背景项</b>
                <span>不覆盖已有</span>
              </button>
            </div>
          </Panel>
          <Button variant="ghost" icon="ArrowUpRight" onClick={() => model.setActiveView("advanced")}>去高级编辑器查看完整 YAML</Button>
        </div>
      </div>
    </div>
  );
}
