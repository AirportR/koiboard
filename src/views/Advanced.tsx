import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/icons";
import { Button, EmptyState, Notice, Panel, Pill, Segmented, ViewHeader } from "../components/ui";
import { downloadText } from "../lib/api";
import { toYaml } from "../lib/yaml";
import type { ConfigObject } from "../types/config";
import type { ViewProps } from "./types";

function safeStringify(config: ConfigObject | null): string {
  if (!config) return "{}";
  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return "{}";
  }
}

export default function Advanced({ model }: ViewProps) {
  const [tab, setTab] = useState<"json" | "yaml">("json");
  const [text, setText] = useState(() => safeStringify(model.config));
  const [error, setError] = useState("");
  const [yamlMode, setYamlMode] = useState<"live" | "draft">("live");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setText(safeStringify(model.config));
    setError("");
  }, [model.config]);

  const localYaml = useMemo(() => (model.config ? toYaml(model.config) : ""), [model.config]);
  const yaml = yamlMode === "draft" ? localYaml : model.yamlText || "（尚未拉取运行态 YAML，点击右上角「拉取 YAML」）";
  const lines = tab === "json" ? text.split("\n").length : yaml.split("\n").length;

  const validate = () => {
    try {
      const parsed = JSON.parse(text) as ConfigObject;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("根配置必须是对象");
      setError("");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="view">
      <ViewHeader
        index="12"
        eyebrow="Advanced"
        title="高级编辑器"
        subtitle="直接编辑整份草稿，或查看后端导出的 YAML。所有写入都遵循「校验 → 内存 → 文件」的流程。"
        meta={
          <>
            <Segmented<"json" | "yaml">
              ariaLabel="编辑器类型"
              value={tab}
              options={[
                { value: "json", label: "JSON" },
                { value: "yaml", label: "YAML" },
              ]}
              onChange={setTab}
            />
            <Pill icon="Layers">{model.paths.length} 字段</Pill>
          </>
        }
      />
      <div className="stack stack--lg">
        {tab === "json" ? (
          <div className="editor">
            <div className="editor__bar">
              <span className="editor__file"><Icon name="Braces" /> draft.json</span>
              <Pill tone={error ? "coral" : "mint"} icon={error ? "CircleAlert" : "CircleCheck"}>{error ? "JSON 语法错误" : "语法有效"}</Pill>
              <span className="grow" />
              <Button size="sm" variant="ghost" icon="Copy" onClick={() => void copy(text)}>{copied ? "已复制" : "复制"}</Button>
              <Button size="sm" variant="ghost" icon="RotateCcw" onClick={() => { setText(safeStringify(model.config)); setError(""); }}>重置</Button>
              <Button size="sm" icon="Check" onClick={() => {
                if (!validate()) return;
                setText(JSON.stringify(JSON.parse(text), null, 2));
              }}>格式化</Button>
              <Button size="sm" variant="primary" icon="Save" onClick={() => {
                if (!validate()) return;
                if (model.applyJson(text)) setError("");
              }}>应用到草稿</Button>
            </div>
            <textarea
              className="editor__area"
              value={text}
              spellCheck={false}
              onChange={(event) => { setText(event.target.value); if (error) setError(""); }}
              aria-label="JSON 编辑器"
            />
            <div className="editor__foot">
              <span>{lines} 行</span>
              <span>{text.length} 字符</span>
              {error ? <span style={{ color: "var(--coral)" }}>{error}</span> : <span>应用后请先校验，再保存。</span>}
            </div>
          </div>
        ) : (
          <div className="editor">
            <div className="editor__bar">
              <span className="editor__file"><Icon name="FileCode" /> config.yaml</span>
              <Segmented<"live" | "draft">
                ariaLabel="YAML 来源"
                value={yamlMode}
                options={[
                  { value: "live", label: "运行态导出" },
                  { value: "draft", label: "当前草稿" },
                ]}
                onChange={setYamlMode}
              />
              <span className="grow" />
              <Button size="sm" variant="ghost" icon="Copy" onClick={() => void copy(yaml)}>{copied ? "已复制" : "复制"}</Button>
              <Button size="sm" icon="Download" onClick={() => downloadText("config.yaml", yaml, "application/x-yaml")}>下载</Button>
              <Button size="sm" icon="Radio" busy={model.busy === "exporting"} onClick={() => { setYamlMode("live"); void model.refreshYaml(); }}>拉取 YAML</Button>
              <Button size="sm" icon="Save" onClick={() => void model.exportYaml()}>导出 config.yaml</Button>
            </div>
            <pre className="yaml-preview">{yaml}</pre>
            <div className="editor__foot">
              <span>{lines} 行</span>
              <span>{yaml.length} 字符</span>
              <span style={{ marginLeft: "auto" }}>{yamlMode === "draft" ? "本地草稿序列化，不影响运行态" : "来自 GET /api/config/export"}</span>
            </div>
          </div>
        )}

        <div className="inline-actions">
          <Button icon="Cpu" onClick={() => void model.putDraft()} disabled={!model.config || model.busy !== "idle"}>
            写入内存
          </Button>
          <Button icon="ShieldCheck" onClick={() => void model.validateDraft()} disabled={!model.config || model.busy !== "idle"}>
            校验草稿
          </Button>
          <Button icon="Save" variant="primary" onClick={() => void model.saveWithMode("save")} disabled={!model.config || model.busy !== "idle"}>
            保存到文件
          </Button>
          <Button icon="RotateCcw" variant="ghost" onClick={() => void model.discardAndReload()} disabled={model.busy !== "idle"}>
            丢弃草稿并重载
          </Button>
        </div>

        <div className="bento">
          <div className="span-4">
            <Panel eyebrow="Write" title="写入内存" icon="Cpu" desc="PUT /api/config">
              <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>把草稿推送到 Koipy 运行态，不写文件。适合先验证行为。</p>
            </Panel>
          </div>
          <div className="span-4">
            <Panel eyebrow="Write" title="保存" icon="Save" desc="POST apply mode=save">
              <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>先校验并写入内存，再把配置写入 config.yaml。</p>
            </Panel>
          </div>
          <div className="span-4">
            <Panel eyebrow="Write" title="保存并重载" icon="Zap" desc="POST apply mode=save_reload">
              <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>写入文件并让 Koipy 重新加载，最接近「立即生效」。</p>
            </Panel>
          </div>
        </div>

        {!model.config ? (
          <EmptyState icon="Braces" title="尚未读取配置" hint="先连接 Koipy 或进入演示模式，再回来编辑整份草稿。" />
        ) : (
          <Notice tone="iris" icon="ShieldCheck">
            <span className="code-inline">webapi</span> 是只读根配置：即使 JSON 里改了它，应用草稿与保存前也会被恢复为后端当前值。
          </Notice>
        )}
      </div>
    </div>
  );
}
