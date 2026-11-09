import { useState } from "react";
import { Row } from "../components/Row";
import { ChipPicker } from "../components/ChipPicker";
import { RuntimeOverrides } from "../components/RuntimeOverrides";
import { AddRow, Button, EmptyState, Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { defaultItem } from "../lib/defaults";
import { revealRow } from "../lib/scroll";
import { getAt } from "../lib/configPath";
import { scriptReservedNames } from "../data/metadata";
import type { ConfigObject } from "../types/config";
import type { ViewProps } from "./types";

export default function Rules({ model, binding, onInspect }: ViewProps) {
  const [open, setOpen] = useState<number | null>(0);
  const rules = (getAt(model.config, "$.rules", []) as ConfigObject[]) ?? [];
  const slaves = (getAt(model.config, "$.slaveConfig.slaves", []) as ConfigObject[]) ?? [];
  const scripts = (getAt(model.config, "$.scriptConfig.scripts", []) as ConfigObject[]) ?? [];
  const write = (next: ConfigObject[]) => binding.set("$.rules", next);
  const addRule = () => {
    const index = rules.length;
    write([...rules, defaultItem("rule") as ConfigObject]);
    setOpen(index);
    revealRow("rule-" + index);
  };

  const slaveOptions = slaves.map((slave) => ({
    value: String(slave.id ?? ""),
    label: String(slave.id ?? "未命名") + (slave.comment ? " · " + String(slave.comment) : ""),
  }));
  const scriptOptions = [
    ...scripts.map((script) => ({ value: String(script.name ?? ""), label: String(script.name ?? "") + " · " + String(script.type ?? "gojajs") })),
    ...scriptReservedNames.map((item) => ({ value: item.value, label: item.value, hint: item.description })),
  ].filter((option) => option.value);

  return (
    <div className="view">
      <ViewHeader
        index="09"
        eyebrow="Rules"
        title="测试规则"
        subtitle="一条规则 = 订阅 + 后端 + 脚本 + 运行时覆盖。Bot 指令通过 name 绑定规则。"
        meta={
          <>
            <Pill icon="ListChecks">{rules.length} 条规则</Pill>
            <Pill tone="mint" icon="ServerCog">{slaves.length} 个可选后端</Pill>
          </>
        }
      />
      <div className="stack stack--lg">
        <Panel
          eyebrow="Library"
          title="规则列表"
          icon="ListChecks"
          desc="展开规则后可以组合后端、脚本与覆盖项。"
          actions={
            <Button size="sm" icon="Plus" onClick={addRule}>
              新增规则
            </Button>
          }
          bodyClass="panel__body--tight"
        >
          {rules.length ? (
            <div className="rows">
              {rules.map((rule, index) => {
                const slaveIds = (Array.isArray(rule.slaveid) ? rule.slaveid : rule.slaveid ? [rule.slaveid] : []).map(String);
                const scriptNames = (Array.isArray(rule.script) ? rule.script : rule.script ? [rule.script] : []).map(String);
                const runtime = (rule.runtime ?? {}) as Record<string, unknown>;
                return (
                  <Row
                    key={index}
                    id={"rule-" + index}
                    index={String(index + 1).padStart(2, "0")}
                    open={open === index}
                    onToggle={() => setOpen(open === index ? null : index)}
                    dirty={model.isDirty("$.rules[" + index + "]")}
                    title={<span className="mono">{String(rule.name || "未命名规则")}</span>}
                    subtitle={String(rule.url || "未填写订阅链接")}
                    badges={
                      <>
                        <Pill tone={slaveIds.length ? "mint" : "coral"} icon="ServerCog">{slaveIds.length} 后端</Pill>
                        <Pill tone={scriptNames.length ? "iris" : "dashed"} icon="FileCode">{scriptNames.length} 脚本</Pill>
                        {Object.keys(runtime).length ? <Pill tone="amber" icon="Settings2">{Object.keys(runtime).length} 覆盖</Pill> : null}
                      </>
                    }
                    actions={
                      <>
                        <Button variant="ghost" iconOnly icon="Copy" size="sm" aria-label="复制规则" title="复制规则" onClick={() => {
                          const copy = JSON.parse(JSON.stringify(rule)) as ConfigObject;
                          copy.name = String(rule.name ?? "rule") + "-copy";
                          const next = [...rules];
                          next.splice(index + 1, 0, copy);
                          write(next);
                          setOpen(index + 1);
                          revealRow("rule-" + (index + 1));
                        }} />
                        <Button variant="ghost" iconOnly icon="Trash2" size="sm" aria-label="删除规则" onClick={() => {
                          write(rules.filter((_, i) => i !== index));
                          setOpen(null);
                        }} />
                      </>
                    }
                  >
                    <div className="field-grid">
                      <div className="field">
                        <label className="field__label">规则名称</label>
                        <input className="input input--mono" value={String(rule.name ?? "")} onChange={(event) => binding.set("$.rules[" + index + "].name", event.target.value)} />
                        <span className="field__hint">命令通过这个名称绑定规则。</span>
                      </div>
                      <div className="field">
                        <label className="field__label">创建者 Telegram ID</label>
                        <input className="input input--mono" type="number" value={String(rule.owner ?? "")} onChange={(event) => binding.set("$.rules[" + index + "].owner", Number(event.target.value))} />
                      </div>
                      <div className="field field--wide">
                        <label className="field__label">订阅链接</label>
                        <input className="input input--mono" value={String(rule.url ?? "")} onChange={(event) => binding.set("$.rules[" + index + "].url", event.target.value)} placeholder="https://sub.example.com/api/v1/client/subscribe?token=…" spellCheck={false} />
                      </div>
                    </div>

                    <div className="toolbar" style={{ marginTop: 22, marginBottom: 10 }}>
                      <div className="toolbar__title"><b>后端与脚本</b><span>slaveid / script</span></div>
                    </div>
                    <div className="split" style={{ gap: 20 }}>
                      <div className="stack" style={{ gap: 8 }}>
                        <span className="eyebrow">Slaves</span>
                        <ChipPicker
                          options={slaveOptions}
                          value={slaveIds}
                          onChange={(next) => binding.set("$.rules[" + index + "].slaveid", next)}
                          emptyHint="先去「测速后端」添加节点。"
                          customLabel="手动添加 slaveid"
                        />
                      </div>
                      <div className="stack" style={{ gap: 8 }}>
                        <span className="eyebrow">Scripts</span>
                        <ChipPicker
                          options={scriptOptions}
                          value={scriptNames}
                          onChange={(next) => binding.set("$.rules[" + index + "].script", next)}
                          emptyHint="脚本可选，保留名称可直接使用。"
                          customLabel="手动添加脚本名"
                        />
                      </div>
                    </div>

                    <div className="toolbar" style={{ marginTop: 22, marginBottom: 10 }}>
                      <div className="toolbar__title"><b>运行时覆盖</b><span>runtime</span></div>
                    </div>
                    <RuntimeOverrides binding={binding} basePath={"$.rules[" + index + "].runtime"} onInspect={onInspect} />
                  </Row>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="ListChecks" title="还没有测试规则" hint="一条规则就能让 Bot 开始工作。" action={<Button size="sm" icon="Plus" onClick={addRule}>新增规则</Button>} />
          )}
          {rules.length ? <AddRow label="在末尾新增一条规则" onClick={addRule} /> : null}
        </Panel>
        <Notice tone="iris" icon="Info">
          规则的 runtime 覆盖项只写差异：例如只改 <span className="code-inline">duration</span>，其余继续跟随全局设置，后续调整全局值不会遗漏这条规则。
        </Notice>
      </div>
    </div>
  );
}
