import { useState } from "react";
import { Icon } from "../components/icons";
import { Fields } from "../components/Field";
import { Button, EmptyState, Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { getAt } from "../lib/configPath";
import type { ViewProps } from "./types";

export default function Translation({ model, binding }: ViewProps) {
  const [draft, setDraft] = useState({ key: "", value: "" });
  const resources = (getAt(model.config, "$.translation.resources", {}) as Record<string, unknown>) ?? {};
  const entries = Object.entries(resources);

  const setResource = (key: string, value: string) => binding.set("$.translation.resources." + key, value);

  return (
    <div className="view">
      <ViewHeader
        index="11"
        eyebrow="Locale"
        title="本地化"
        subtitle="语言包决定 Bot 与结果图的文案。resources 是「语言键 → YAML 文件路径」的映射。"
        meta={
          <>
            <Pill icon="Languages">{String(getAt(model.config, "$.translation.lang", "未设置"))}</Pill>
            <Pill tone="mint">{entries.length} 个语言包</Pill>
          </>
        }
      />
      <div className="split">
        <div className="stack stack--lg">
          <Panel eyebrow="Language" title="当前语言" icon="Languages" desc="必须是 resources 里存在的键，或内置语言代码。">
            <Fields specs={[{ path: "$.translation.lang", label: "语言包键", mono: true, wide: true, placeholder: "zh-CN", helper: "例如 zh-CN / en-US；值需与下方映射一致。" }]} binding={binding} />
          </Panel>

          <Panel
            eyebrow="Resources"
            title="语言资源映射"
            icon="Layers"
            desc="键为语言代码，值为 YAML 文件路径。"
            actions={<Pill>{entries.length} 项</Pill>}
          >
            <div className="stack" style={{ gap: 10 }}>
              {entries.length ? (
                entries.map(([key, value]) => (
                  <div key={key} className="inline-actions" style={{ gap: 8 }}>
                    <input className="input input--mono" style={{ maxWidth: 150 }} value={key} onChange={(event) => {
                      const nextKey = event.target.value;
                      if (!nextKey || nextKey === key) return;
                      binding.unset("$.translation.resources." + key);
                      binding.set("$.translation.resources." + nextKey, value);
                    }} aria-label="语言键" />
                    <span style={{ color: "var(--text-3)" }}>→</span>
                    <input className="input input--mono" value={String(value ?? "")} onChange={(event) => setResource(key, event.target.value)} aria-label="资源路径" />
                    <Button variant="ghost" iconOnly size="sm" icon="Trash2" aria-label="删除映射" onClick={() => binding.unset("$.translation.resources." + key)} />
                  </div>
                ))
              ) : (
                <EmptyState icon="Languages" title="还没有语言包" hint="添加一个键值对，例如 zh-CN → translation/zh-CN.yaml。" />
              )}
              <div className="inline-actions" style={{ gap: 8 }}>
                <input className="input input--mono" style={{ maxWidth: 150 }} placeholder="语言键" value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value })} aria-label="新的语言键" />
                <span style={{ color: "var(--text-3)" }}>→</span>
                <input className="input input--mono" placeholder="translation/xx-XX.yaml" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} aria-label="新的资源路径" />
                <Button size="sm" icon="Plus" onClick={() => {
                  const key = draft.key.trim();
                  if (!key) return;
                  setResource(key, draft.value.trim());
                  setDraft({ key: "", value: "" });
                }}>添加</Button>
              </div>
            </div>
          </Panel>
        </div>
        <div className="stack">
          <Notice tone="iris" icon="Info">
            翻译 YAML 与 Koipy 的 <span className="code-inline">translation</span> 目录对应；文件缺失时 Bot 会回退到内置文案。
          </Notice>
          <Panel eyebrow="Current" title="生效情况" icon="CircleDot">
            <dl className="kv">
              <dt>启用语言</dt>
              <dd>{String(getAt(model.config, "$.translation.lang", "—"))}</dd>
              <dt>资源文件</dt>
              <dd>{entries.length} 个</dd>
              <dt>当前映射</dt>
              <dd>{String(resources[String(getAt(model.config, "$.translation.lang", ""))] ?? "未找到")}</dd>
            </dl>
          </Panel>
          <div className="notice notice--mint">
            <Icon name="CircleCheck" />
            <div>修改会随整份配置一起校验；保存并重载后新文案立即生效。</div>
          </div>
        </div>
      </div>
    </div>
  );
}
