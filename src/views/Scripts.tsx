import { useState } from "react";
import { Row } from "../components/Row";
import { AddRow, Button, EmptyState, Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { defaultItem } from "../lib/defaults";
import { getAt } from "../lib/configPath";
import { scriptReservedNames } from "../data/metadata";
import { revealRow } from "../lib/scroll";
import type { ConfigObject } from "../types/config";
import type { ViewProps } from "./types";

export default function Scripts({ model, binding }: ViewProps) {
  const [open, setOpen] = useState<number | null>(0);
  const scripts = (getAt(model.config, "$.scriptConfig.scripts", []) as ConfigObject[]) ?? [];
  const write = (next: ConfigObject[]) => binding.set("$.scriptConfig.scripts", next);
  const addScript = () => {
    const index = scripts.length;
    write([...scripts, defaultItem("script") as ConfigObject]);
    setOpen(index);
    revealRow("script-" + index);
  };

  return (
    <div className="view">
      <ViewHeader
        index="07"
        eyebrow="Scripts"
        title="脚本"
        subtitle="脚本决定测速结果的加工方式。rank 越小越先执行，同名不会被去重。"
        meta={
          <>
            <Pill icon="FileCode">{scripts.length} 个脚本</Pill>
            <Pill tone="iris" icon="Zap">{scripts.filter((item) => item.type === "gojajs").length} gojajs</Pill>
          </>
        }
      />
      <div className="split">
        <div className="stack stack--lg">
          <Panel
            eyebrow="Pipeline"
            title="脚本管线"
            icon="FileCode"
            desc="点击行展开编辑源码、路径与排序。"
            actions={
              <Button size="sm" icon="Plus" onClick={addScript}>
                新增脚本
              </Button>
            }
            bodyClass="panel__body--tight"
          >
            {scripts.length ? (
              <div className="rows">
                {scripts.map((script, index) => {
                  const name = String(script.name ?? "");
                  const content = String(script.content ?? "");
                  return (
                    <Row
                      key={index}
                      id={"script-" + index}
                      index={String(script.rank ?? index)}
                      open={open === index}
                      onToggle={() => setOpen(open === index ? null : index)}
                      dirty={model.isDirty("$.scriptConfig.scripts[" + index + "]")}
                      title={<span className="mono">{name || "未命名脚本"}</span>}
                      subtitle={content.startsWith("http") ? content : content ? "内联源码 · " + content.length + " 字符" : "内容为空"}
                      badges={
                        <>
                          <Pill tone={script.type === "gofunc" ? "iris" : "mint"}>{String(script.type ?? "gojajs")}</Pill>
                          <Pill tone="dashed">rank {String(script.rank ?? 0)}</Pill>
                        </>
                      }
                      actions={
                        <>
                          <Button variant="ghost" iconOnly icon="ArrowUp" size="sm" aria-label="上移" disabled={index === 0} onClick={() => {
                            const next = [...scripts];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            write(next);
                            setOpen(index - 1);
                          }} />
                          <Button variant="ghost" iconOnly icon="Trash2" size="sm" aria-label="删除脚本" onClick={() => {
                            write(scripts.filter((_, i) => i !== index));
                            setOpen(null);
                          }} />
                        </>
                      }
                    >
                      <div className="field-grid">
                        <div className="field">
                          <label className="field__label">类型</label>
                          <select className="select" value={String(script.type ?? "gojajs")} onChange={(event) => binding.set("$.scriptConfig.scripts[" + index + "].type", event.target.value)}>
                            <option value="gojajs">gojajs</option>
                            <option value="gofunc">gofunc</option>
                          </select>
                        </div>
                        <div className="field">
                          <label className="field__label">排序 rank</label>
                          <input className="input input--mono" type="number" value={String(script.rank ?? 0)} onChange={(event) => binding.set("$.scriptConfig.scripts[" + index + "].rank", Number(event.target.value))} />
                        </div>
                        <div className="field field--wide">
                          <label className="field__label">名称（支持预保留名称）</label>
                          <input className="input input--mono" list="nova-script-names" value={name} onChange={(event) => binding.set("$.scriptConfig.scripts[" + index + "].name", event.target.value)} placeholder="TEST_PING_RTT" />
                          <span className="field__hint">填写预保留名称可替换内置实现，例如 TEST_PING_RTT。</span>
                        </div>
                        <div className="field field--wide">
                          <label className="field__label">内容</label>
                          <textarea
                            className="textarea textarea--code"
                            rows={8}
                            value={content}
                            onChange={(event) => binding.set("$.scriptConfig.scripts[" + index + "].content", event.target.value)}
                            placeholder="https://raw.example.com/script.js 或直接粘贴 goja 源码"
                            spellCheck={false}
                          />
                          <span className="field__hint">可以是本地/远程路径，也可以是内联源码。</span>
                        </div>
                      </div>
                    </Row>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="FileCode" title="没有脚本" hint="脚本可选；添加后会在测速结果上依次执行。" action={<Button size="sm" icon="Plus" onClick={addScript}>新增脚本</Button>} />
            )}
            {scripts.length ? <AddRow label="在末尾新增一个脚本" onClick={addScript} /> : null}
          </Panel>
        </div>

        <div className="stack">
          <datalist id="nova-script-names">
            {scriptReservedNames.map((item) => (
              <option key={item.value} value={item.value}>{item.description}</option>
            ))}
          </datalist>
          <Panel eyebrow="Reserved" title="预保留名称" icon="Layers" bodyClass="panel__body--tight">
            <div className="stack" style={{ gap: 2 }}>
              {scriptReservedNames.slice(0, 10).map((item) => (
                <div key={item.value} className="change">
                  <span className="change__path">{item.value}</span>
                  <span className="change__val">{item.description}</span>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-3)" }}>共 {scriptReservedNames.length} 个保留名称，用于覆盖内置测试逻辑。</p>
          </Panel>
          <Notice tone="amber" icon="TriangleAlert">
            内联脚本会随配置写入 config.yaml；远程路径请确保 Koipy 所在机器能访问。
          </Notice>
        </div>
      </div>
    </div>
  );
}
