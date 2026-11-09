import { useState } from "react";
import { Fields } from "../components/Field";
import { Row } from "../components/Row";
import { AddRow, Button, EmptyState, Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { defaultItem } from "../lib/defaults";
import { revealRow } from "../lib/scroll";
import { getAt, summarize } from "../lib/configPath";
import type { ConfigObject } from "../types/config";
import type { ViewProps } from "./types";

export default function Slaves({ model, binding }: ViewProps) {
  const [open, setOpen] = useState<number | null>(null);
  const slaves = (getAt(model.config, "$.slaveConfig.slaves", []) as ConfigObject[]) ?? [];
  const write = (next: ConfigObject[]) => binding.set("$.slaveConfig.slaves", next);
  const hidden = slaves.filter((slave) => slave.hidden === true).length;
  const addSlave = () => {
    const index = slaves.length;
    write([...slaves, defaultItem("slave") as ConfigObject]);
    setOpen(index);
    revealRow("slave-" + index);
  };

  return (
    <div className="view">
      <ViewHeader
        index="08"
        eyebrow="Slaves"
        title="测速后端"
        subtitle="slave 负责真正跑测速。规则通过 slaveid 选择后端，token 与地址错误会直接握手失败。"
        meta={
          <>
            <Pill icon="ServerCog">{slaves.length} 个后端</Pill>
            {hidden ? <Pill tone="amber" icon="EyeOff">{hidden} 个隐藏</Pill> : null}
            <Pill tone="mint" icon="Activity">{String(getAt(model.config, "$.slaveConfig.speedScheduling", "auto"))}</Pill>
          </>
        }
      />
      <div className="stack stack--lg">
        <Panel eyebrow="Policy" title="健康检查与调度" icon="Activity" desc="这些设置会影响 Bot 选择后端的展示与调度方式。">
          <Fields
            specs={[
              { path: "$.slaveConfig.healthCheck.numSamples", label: "健康检查样本数", kind: "number", min: 1, max: 20, step: 1 },
              { path: "$.slaveConfig.healthCheck.showStatusStyle", label: "展示状态样式", kind: "switch", helper: "在选择后端页面显示健康状态。" },
              { path: "$.slaveConfig.healthCheck.autoHideOnFailure", label: "失败自动隐藏", kind: "switch" },
              { path: "$.slaveConfig.speedScheduling", label: "调度模式", kind: "select", choices: ["auto", "balance", "random", "priority"], allowUnset: true },
              { path: "$.slaveConfig.showID", label: "显示 slaveid", kind: "switch" },
              { path: "$.slaveConfig.geoClustering", label: "拓扑聚类排序", kind: "switch" },
            ]}
            binding={binding}
          />
        </Panel>

        <Panel
          eyebrow="Nodes"
          title="后端列表"
          icon="ServerCog"
          desc="展开后编辑连接参数与测速选项。"
          actions={
            <Button size="sm" icon="Plus" onClick={addSlave}>
              新增后端
            </Button>
          }
          bodyClass="panel__body--tight"
        >
          {slaves.length ? (
            <div className="rows">
              {slaves.map((slave, index) => {
                const option = (slave.option ?? {}) as ConfigObject;
                return (
                  <Row
                    key={index}
                    id={"slave-" + index}
                    index={String(index + 1).padStart(2, "0")}
                    open={open === index}
                    onToggle={() => setOpen(open === index ? null : index)}
                    dirty={model.isDirty("$.slaveConfig.slaves[" + index + "]")}
                    title={
                      <>
                        <span className="mono">{String(slave.id || "未命名")}</span>
                        {slave.hidden ? <Pill tone="coral" icon="EyeOff">隐藏</Pill> : null}
                      </>
                    }
                    subtitle={String(slave.address || "未填写地址") + " · " + String(slave.comment || "无备注")}
                    badges={
                      <>
                        <Pill tone={slave.tls ? "mint" : "dashed"}>{slave.tls ? "TLS" : "PLAIN"}</Pill>
                        <Pill>{String(slave.type ?? "miaospeed")}</Pill>
                        {Object.keys(option).length ? <Pill tone="iris">{Object.keys(option).length} 项覆盖</Pill> : null}
                      </>
                    }
                    actions={
                      <>
                        <Button variant="ghost" iconOnly icon="ArrowUp" size="sm" aria-label="上移" disabled={index === 0} onClick={() => {
                          const next = [...slaves];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          write(next);
                          setOpen(index - 1);
                        }} />
                        <Button variant="ghost" iconOnly icon="Trash2" size="sm" aria-label="删除后端" onClick={() => {
                          write(slaves.filter((_, i) => i !== index));
                          setOpen(null);
                        }} />
                      </>
                    }
                  >
                    <div className="field-grid">
                      <div className="field">
                        <label className="field__label">后端 ID</label>
                        <input className="input input--mono" value={String(slave.id ?? "")} onChange={(event) => binding.set("$.slaveConfig.slaves[" + index + "].id", event.target.value)} />
                        <span className="field__hint">规则用这个 ID 选择后端。</span>
                      </div>
                      <div className="field">
                        <label className="field__label">类型</label>
                        <input className="input input--mono" value={String(slave.type ?? "")} onChange={(event) => binding.set("$.slaveConfig.slaves[" + index + "].type", event.target.value)} />
                      </div>
                      <div className="field">
                        <label className="field__label">地址</label>
                        <input className="input input--mono" value={String(slave.address ?? "")} onChange={(event) => binding.set("$.slaveConfig.slaves[" + index + "].address", event.target.value)} placeholder="127.0.0.1:8765" />
                      </div>
                      <div className="field">
                        <label className="field__label">WebSocket 路径</label>
                        <input className="input input--mono" value={String(slave.path ?? "/")} onChange={(event) => binding.set("$.slaveConfig.slaves[" + index + "].path", event.target.value)} />
                      </div>
                      <div className="field field--wide">
                        <label className="field__label">Token</label>
                        <input className="input input--mono" type={model.showSecrets ? "text" : "password"} value={String(slave.token ?? "")} onChange={(event) => binding.set("$.slaveConfig.slaves[" + index + "].token", event.target.value)} />
                      </div>
                      <div className="field field--wide">
                        <label className="field__label">备注</label>
                        <input className="input" value={String(slave.comment ?? "")} onChange={(event) => binding.set("$.slaveConfig.slaves[" + index + "].comment", event.target.value)} />
                      </div>
                    </div>

                    <div className="field-grid" style={{ marginTop: 16 }}>
                      {[
                        { key: "tls", label: "TLS", hint: "加密连接" },
                        { key: "skipCertVerify", label: "跳过证书校验", hint: "自签证书时使用" },
                        { key: "hidden", label: "隐藏后端", hint: "不在选择页展示" },
                      ].map((flag) => (
                        <div key={flag.key} className="field field--switch">
                          <div className="field__text"><b>{flag.label}</b><span>{flag.hint}</span></div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={slave[flag.key] === true}
                            aria-label={flag.label}
                            className="switch"
                            onClick={() => binding.set("$.slaveConfig.slaves[" + index + "]." + flag.key, slave[flag.key] !== true)}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="toolbar" style={{ marginTop: 22, marginBottom: 10 }}>
                      <div className="toolbar__title"><b>测速选项</b><span>option.*</span></div>
                      <div className="toolbar__spacer" />
                      <Pill>{summarize(option, "", model.showSecrets)}</Pill>
                    </div>
                    <Fields
                      specs={[
                        { path: "$.slaveConfig.slaves[" + index + "].option.downloadDuration", label: "下载时长（秒）", kind: "number", min: 1, max: 120, step: 1 },
                        { path: "$.slaveConfig.slaves[" + index + "].option.downloadThreading", label: "下载线程", kind: "number", min: 1, max: 64, step: 1 },
                        { path: "$.slaveConfig.slaves[" + index + "].option.downloadURL", label: "测速文件 URL", mono: true, wide: true },
                        { path: "$.slaveConfig.slaves[" + index + "].option.pingAddress", label: "延迟测试地址", mono: true, wide: true },
                        { path: "$.slaveConfig.slaves[" + index + "].option.taskTimeout", label: "任务超时（ms）", kind: "number", min: 1000, step: 1000 },
                        { path: "$.slaveConfig.slaves[" + index + "].option.dnsServer", label: "DNS 服务器", mono: true },
                      ]}
                      binding={binding}
                    />
                  </Row>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="ServerCog" title="还没有测速后端" hint="至少要有一个 slave 才能执行测速任务。" action={<Button size="sm" icon="Plus" onClick={addSlave}>新增后端</Button>} />
          )}
          {slaves.length ? <AddRow label="在末尾新增一个后端" onClick={addSlave} /> : null}
        </Panel>
        <Notice tone="iris" icon="Info">
          保存并重载后，Koipy 会立即按新的后端列表建立连接；token 变更会让旧连接失效。
        </Notice>
      </div>
    </div>
  );
}
