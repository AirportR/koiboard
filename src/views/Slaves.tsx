import { useState } from "react";
import { Fields } from "../components/Field";
import { Row } from "../components/Row";
import { AddRow, Button, EmptyState, Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { defaultItem } from "../lib/defaults";
import { getAt, summarize } from "../lib/configPath";
import { revealRow } from "../lib/scroll";
import type { ConfigObject } from "../types/config";
import type { ConfigBinding } from "../components/Field";
import type { ViewProps } from "./types";

function DnsServerField({ binding, path }: { binding: ConfigBinding; path: string }) {
  const value = binding.get(path);
  if (Array.isArray(value)) {
    return <Fields specs={[{ path, label: "DNS 服务器", kind: "tags", wide: true, placeholder: "119.29.29.29:53" }]} binding={binding} />;
  }
  return (
    <Fields
      specs={[{ path, label: "DNS 服务器", mono: true, wide: true, placeholder: "mihomo://… 或留空", helper: "列表形式可用标签编辑；这里是单条 mihomo://base64 字符串。" }]}
      binding={binding}
    />
  );
}

export default function Slaves({ model, binding }: ViewProps) {
  const [open, setOpen] = useState<number | null>(null);
  const slaves = (getAt(model.config, "$.slaveConfig.slaves", []) as ConfigObject[]) ?? [];
  const write = (next: ConfigObject[]) => binding.set("$.slaveConfig.slaves", next);
  const addSlave = () => {
    const index = slaves.length;
    write([...slaves, defaultItem("slave") as ConfigObject]);
    setOpen(index);
    revealRow("slave-" + index);
  };
  const hidden = slaves.filter((slave) => slave.hidden === true).length;
  const reverseCount = slaves.filter((slave) => slave.reverse === true).length;

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
            {reverseCount ? <Pill tone="iris" icon="Radio">{reverseCount} 个反向</Pill> : null}
            <Pill tone="mint" icon="Activity">{String(getAt(model.config, "$.slaveConfig.speedScheduling", "pipeline"))}</Pill>
          </>
        }
      />
      <div className="stack stack--lg">
        <Panel eyebrow="Policy" title="健康检查与调度" icon="Activity" desc="影响 Bot 选择后端的展示与多后端任务的推进方式。">
          <Fields
            specs={[
              { path: "$.slaveConfig.healthCheck.numSamples", label: "健康检查样本数", kind: "number", min: 1, max: 20, step: 1 },
              { path: "$.slaveConfig.healthCheck.showStatusStyle", label: "状态展示样式", kind: "select", choices: ["emoji", "number", "default"], helper: "emoji：表情；number：延迟数值；default：不展示。" },
              { path: "$.slaveConfig.healthCheck.autoHideOnFailure", label: "失败自动隐藏", kind: "switch" },
              { path: "$.slaveConfig.speedScheduling", label: "调度模式", kind: "select", choices: ["concurrent", "pipeline", "sequential"], helper: "concurrent 并发；pipeline 第一个节点测完就轮到下一个后端；sequential 前一个后端全部测完。" },
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
          desc="展开后编辑连接参数、增删改查与测速选项。"
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
                const reverse = slave.reverse === true;
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
                        {reverse ? <Pill tone="iris" icon="Radio">反向</Pill> : null}
                      </>
                    }
                    subtitle={(reverse ? "reverse " + String(slave.reverseListen || "127.0.0.1:8766") : String(slave.address || "未填写地址")) + " · " + String(slave.comment || "无备注")}
                    badges={
                      <>
                        <Pill tone={slave.tls ? "mint" : "dashed"}>{slave.tls ? "TLS" : "PLAIN"}</Pill>
                        <Pill>{String(slave.type ?? "miaospeed")}</Pill>
                        {slave.mtls ? <Pill tone="iris">mTLS</Pill> : null}
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
                        <select className="select" value={String(slave.type ?? "miaospeed")} onChange={(event) => binding.set("$.slaveConfig.slaves[" + index + "].type", event.target.value)}>
                          <option value="miaospeed">miaospeed</option>
                          <option value="fulltclash">fulltclash</option>
                        </select>
                      </div>
                      <div className="field">
                        <label className="field__label">地址</label>
                        <input className="input input--mono" value={String(slave.address ?? "")} onChange={(event) => binding.set("$.slaveConfig.slaves[" + index + "].address", event.target.value)} placeholder="127.0.0.1:8765" disabled={reverse} />
                      </div>
                      <div className="field">
                        <label className="field__label">WebSocket 路径</label>
                        <input className="input input--mono" value={String(slave.path ?? "/")} onChange={(event) => binding.set("$.slaveConfig.slaves[" + index + "].path", event.target.value)} disabled={reverse} />
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
                        { key: "mtls", label: "双向 TLS", hint: "需同时开启 tls" },
                        { key: "reverse", label: "反向连接", hint: "由后端主动连入" },
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

                    <details className="advanced-block">
                      <summary>高级连接 · mTLS / 反向连接 / 代理</summary>
                      <div className="stack" style={{ gap: 16, marginTop: 14 }}>
                        <Fields
                          specs={[
                            { path: "$.slaveConfig.slaves[" + index + "].proxy", label: "专属 HTTP 代理", mono: true, wide: true, placeholder: "http://user:pass@host:7890" },
                            { path: "$.slaveConfig.slaves[" + index + "].invoker", label: "invoker", mono: true },
                            { path: "$.slaveConfig.slaves[" + index + "].buildtoken", label: "buildtoken", mono: true },
                            { path: "$.slaveConfig.slaves[" + index + "].clientCertFile", label: "客户端证书", mono: true, wide: true },
                            { path: "$.slaveConfig.slaves[" + index + "].clientKeyFile", label: "客户端私钥", mono: true, wide: true },
                            { path: "$.slaveConfig.slaves[" + index + "].caCertFile", label: "附加 CA 证书", mono: true, wide: true },
                            { path: "$.slaveConfig.slaves[" + index + "].reverseListen", label: "反向监听地址", mono: true, placeholder: "127.0.0.1:8766", helper: "每个反向后端使用独立端口。" },
                            { path: "$.slaveConfig.slaves[" + index + "].reverseCertFile", label: "反向证书", mono: true },
                            { path: "$.slaveConfig.slaves[" + index + "].reverseKeyFile", label: "反向私钥", mono: true },
                          ]}
                          binding={binding}
                        />
                        <div className="field-grid">
                          <div className="field field--switch">
                            <div className="field__text"><b>反向 TLS</b><span>开启后必须填写反向证书</span></div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={slave.reverseTLS === true}
                              aria-label="反向 TLS"
                              className="switch"
                              onClick={() => binding.set("$.slaveConfig.slaves[" + index + "].reverseTLS", slave.reverseTLS !== true)}
                            />
                          </div>
                        </div>
                        <span className="field__hint">反向连接没有 IP 白名单，token 就是唯一门禁；监听公网时务必开启 reverseTLS。</span>
                      </div>
                    </details>

                    <div className="toolbar" style={{ marginTop: 22, marginBottom: 10 }}>
                      <div className="toolbar__title"><b>测速选项</b><span>option.*</span></div>
                      <div className="toolbar__spacer" />
                      <Pill>{summarize(option, "", model.showSecrets)}</Pill>
                    </div>
                    <Fields
                      specs={[
                        { path: "$.slaveConfig.slaves[" + index + "].option.downloadDuration", label: "下载时长（秒）", kind: "number", min: 1, max: 120, step: 1 },
                        { path: "$.slaveConfig.slaves[" + index + "].option.downloadThreading", label: "下载线程", kind: "number", min: 1, max: 64, step: 1 },
                        { path: "$.slaveConfig.slaves[" + index + "].option.downloadURL", label: "测速文件 URL", mono: true, wide: true, helper: "可填 DYNAMIC:ALL，从 runtime.speedFiles 随机选取。" },
                        { path: "$.slaveConfig.slaves[" + index + "].option.pingAddress", label: "延迟测试地址", mono: true, wide: true },
                        { path: "$.slaveConfig.slaves[" + index + "].option.pingAverageOver", label: "Ping 平均次数", kind: "number", min: 1, max: 50, step: 1 },
                        { path: "$.slaveConfig.slaves[" + index + "].option.taskRetry", label: "任务重试", kind: "number", min: 0, max: 10, step: 1 },
                        { path: "$.slaveConfig.slaves[" + index + "].option.stunURL", label: "STUN 地址", mono: true, wide: true, placeholder: "udp://stunserver2025.stunprotocol.org:3478" },
                        { path: "$.slaveConfig.slaves[" + index + "].option.taskTimeout", label: "任务超时（ms）", kind: "number", min: 1000, step: 500, helper: "设置过大可能不生效。" },
                        { path: "$.slaveConfig.slaves[" + index + "].option.apiVersion", label: "API 版本", kind: "number", min: 0, max: 3, step: 1, helper: "0/1 兼容旧版，3 支持上行测速；不确定保持 1。" },
                        { path: "$.slaveConfig.slaves[" + index + "].option.uploadURL", label: "上行测速 URL", mono: true, wide: true, helper: "apiVersion=3 时生效。" },
                        { path: "$.slaveConfig.slaves[" + index + "].option.uploadDuration", label: "上行时长（秒）", kind: "number", min: 1, max: 120, step: 1 },
                        { path: "$.slaveConfig.slaves[" + index + "].option.uploadThreading", label: "上行线程", kind: "number", min: 1, max: 64, step: 1 },
                      ]}
                      binding={binding}
                    />
                    <div style={{ marginTop: 16 }}>
                      <DnsServerField binding={binding} path={"$.slaveConfig.slaves[" + index + "].option.dnsServer"} />
                    </div>
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
          保存并重载后，Koipy 会立即按新的后端列表建立连接；token 变更会让旧连接失效。反向连接的后端不需要 address/path。
        </Notice>
      </div>
    </div>
  );
}
