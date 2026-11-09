import { useState } from "react";
import { Fields } from "../components/Field";
import { Row } from "../components/Row";
import { AddRow, Button, EmptyState, Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { defaultItem } from "../lib/defaults";
import { revealRow } from "../lib/scroll";
import { getAt } from "../lib/configPath";
import type { ConfigObject } from "../types/config";
import type { ViewProps } from "./types";

export default function BotView({ model, binding }: ViewProps) {
  const [open, setOpen] = useState<number | null>(0);
  const commands = (getAt(model.config, "$.bot.commands", []) as ConfigObject[]) ?? [];
  const rules = (getAt(model.config, "$.rules", []) as ConfigObject[]) ?? [];
  const ruleNames = rules.map((rule) => String(rule.name ?? "")).filter(Boolean);

  const writeCommands = (next: ConfigObject[]) => binding.set("$.bot.commands", next);
  const addCommand = () => {
    const index = commands.length;
    writeCommands([...commands, defaultItem("command") as ConfigObject]);
    setOpen(index);
    revealRow("cmd-" + index);
  };

  return (
    <div className="view">
      <ViewHeader
        index="04"
        eyebrow="Telegram"
        title="Bot 行为"
        subtitle="凭据、连接方式、指令与回调。改 token 会直接影响 Bot 登录，保存前请确认。"
        meta={
          <>
            <Pill tone={getAt(model.config, "$.bot.strictMode") ? "mint" : undefined} icon="ShieldCheck">
              严格模式 {getAt(model.config, "$.bot.strictMode") ? "开" : "关"}
            </Pill>
            <Pill icon="Terminal">{commands.length} 条指令</Pill>
          </>
        }
      />
      <div className="stack stack--lg">
        <div className="split">
          <div className="stack stack--lg">
            <Panel eyebrow="Identity" title="凭据与解析" icon="Bot" desc="bot-token 首次启动必填；修改后需要重新登录 Telegram。">
              <Fields
                specs={[
                  { path: "$.bot.bot-token", label: "Bot Token", kind: "secret", wide: true, mono: true, helper: "默认脱敏显示，点击眼睛临时查看。" },
                  { path: "$.bot.api-id", label: "api_id", kind: "number", min: 0, step: 1, helper: "可选，用于用户账号相关能力。" },
                  { path: "$.bot.api-hash", label: "api_hash", kind: "secret", mono: true },
                  { path: "$.bot.proxy", label: "Bot 代理", mono: true, placeholder: "socks5://127.0.0.1:7890", helper: "与 network 代理不同，这里只影响 Bot 自身连接。" },
                  { path: "$.bot.parseMode", label: "解析模式", kind: "select", choices: ["DEFAULT", "MARKDOWN", "HTML", "DISABLED"] },
                ]}
                binding={binding}
              />
            </Panel>

            <Panel eyebrow="Behavior" title="行为开关" icon="Settings2" desc="严格模式会限制按钮只能被原消息触发者点击。">
              <Fields
                specs={[
                  { path: "$.bot.ipv6", label: "IPv6", kind: "switch" },
                  { path: "$.bot.antiGroup", label: "防拉群模式", kind: "switch" },
                  { path: "$.bot.strictMode", label: "严格模式", kind: "switch" },
                  { path: "$.bot.bypassMode", label: "旁路模式", kind: "switch", helper: "开启后内置指令失效，仅生效 commands。" },
                  { path: "$.bot.autoResetCommands", label: "自动重置指令", kind: "switch", wide: true },
                  { path: "$.bot.cacheTime", label: "订阅缓存（秒）", kind: "number", min: 0, step: 1 },
                  { path: "$.bot.echoLimit", label: "响应限速（秒）", kind: "number", min: 0, step: 0.1, helper: "可填小数，例如 0.8。" },
                ]}
                binding={binding}
              />
            </Panel>
          </div>

          <div className="stack">
            <Notice tone="iris" icon="Info">
              指令 <span className="code-inline">name</span> 绑定 <span className="code-inline">rule</span> 后会升级为测试指令；<span className="code-inline">invite</span> 是内置特殊指令。
            </Notice>
            <Panel eyebrow="Webhooks" title="回调地址" icon="Waypoints" desc="Bot 在关键节点向这些地址发起 POST。">
              <Fields
                specs={[
                  { path: "$.callbacks.onMessage", label: "onMessage", mono: true, wide: true, placeholder: "https://hooks.example.com/message" },
                  { path: "$.callbacks.onPreSend", label: "onPreSend", mono: true, wide: true, placeholder: "https://hooks.example.com/presend" },
                  { path: "$.callbacks.onResult", label: "onResult", mono: true, wide: true, placeholder: "https://hooks.example.com/result" },
                ]}
                binding={binding}
              />
            </Panel>
            <Panel eyebrow="Blacklist" title="邀请测试黑名单" icon="ShieldCheck" desc="远程清单地址，定时拉取用于拦截。">
              <div className="stack" style={{ gap: 16 }}>
                <Fields specs={[{ path: "$.bot.inviteBlacklistURL", label: "URL 清单", kind: "tags", wide: true, placeholder: "https://example.com/blacklist.txt" }]} binding={binding} />
                <Fields specs={[{ path: "$.bot.inviteBlacklistDomain", label: "域名清单", kind: "tags", wide: true, placeholder: "example.com" }]} binding={binding} />
              </div>
            </Panel>
          </div>
        </div>

        <Panel
          eyebrow="Commands"
          title="指令列表"
          icon="Terminal"
          desc="点击行展开编辑；顺序决定 Bot 菜单里的排列。"
          actions={
            <>
              <Pill>{commands.length} 条</Pill>
              <Button icon="Plus" size="sm" onClick={addCommand}>
                新增指令
              </Button>
            </>
          }
          bodyClass="panel__body--tight"
        >
          {commands.length ? (
            <div className="rows">
              {commands.map((command, index) => {
                const name = String(command.name ?? "");
                const enabled = command.enable !== false;
                const dirty = model.isDirty("$.bot.commands[" + index + "]");
                return (
                  <Row
                    key={index}
                    id={"cmd-" + index}
                    index={String(index + 1).padStart(2, "0")}
                    open={open === index}
                    onToggle={() => setOpen(open === index ? null : index)}
                    dirty={dirty}
                    title={
                      <>
                        <span className="mono">/{name || "未命名"}</span>
                        {command.pin ? <Pill tone="mint">置顶</Pill> : null}
                      </>
                    }
                    subtitle={String(command.title || command.text || "未填写标题")}
                    badges={
                      <>
                        {command.rule ? <Pill tone="iris">rule: {String(command.rule)}</Pill> : <Pill tone="dashed">无规则</Pill>}
                        {enabled ? <Pill tone="mint" icon="CircleCheck">启用</Pill> : <Pill tone="coral" icon="CircleAlert">禁用</Pill>}
                      </>
                    }
                    actions={
                      <>
                        <Button variant="ghost" iconOnly icon="ArrowUp" size="sm" aria-label="上移" disabled={index === 0} onClick={() => {
                          const next = [...commands];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          writeCommands(next);
                          setOpen(index - 1);
                        }} />
                        <Button variant="ghost" iconOnly icon="Trash2" size="sm" aria-label="删除指令" onClick={() => {
                          writeCommands(commands.filter((_, i) => i !== index));
                          setOpen(null);
                        }} />
                      </>
                    }
                  >
                    <div className="field-grid">
                      <div className="field">
                        <label className="field__label">指令名</label>
                        <input className="input input--mono" value={String(command.name ?? "")} onChange={(event) => binding.set("$.bot.commands[" + index + "].name", event.target.value)} />
                        <span className="field__hint">不带斜杠，例如 ping。</span>
                      </div>
                      <div className="field">
                        <label className="field__label">标题</label>
                        <input className="input" value={String(command.title ?? "")} onChange={(event) => binding.set("$.bot.commands[" + index + "].title", event.target.value)} />
                        <span className="field__hint">绘图与按钮上显示的任务名。</span>
                      </div>
                      <div className="field field--wide">
                        <label className="field__label">提示文本</label>
                        <input className="input" value={String(command.text ?? "")} onChange={(event) => binding.set("$.bot.commands[" + index + "].text", event.target.value)} />
                      </div>
                      <div className="field">
                        <label className="field__label">绑定规则</label>
                        <select className="select" value={String(command.rule ?? "")} onChange={(event) => {
                          if (!event.target.value) binding.unset("$.bot.commands[" + index + "].rule");
                          else binding.set("$.bot.commands[" + index + "].rule", event.target.value);
                        }}>
                          <option value="">不绑定</option>
                          {ruleNames.map((rule) => (
                            <option key={rule} value={rule}>{rule}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field" style={{ justifyContent: "flex-end" }}>
                        <Button variant="ghost" size="sm" icon="ArrowUpRight" onClick={() => model.setActiveView("rules")}>去编辑规则</Button>
                      </div>
                    </div>
                    <div className="field-grid" style={{ marginTop: 16 }}>
                      <div className="field field--switch">
                        <div className="field__text"><b>启用指令</b><span>关闭后 Bot 不再响应</span></div>
                        <button type="button" role="switch" aria-checked={enabled} aria-label="启用指令" className="switch" onClick={() => binding.set("$.bot.commands[" + index + "].enable", !enabled)} />
                      </div>
                      <div className="field field--switch">
                        <div className="field__text"><b>固定指令</b><span>菜单中优先展示</span></div>
                        <button type="button" role="switch" aria-checked={command.pin === true} aria-label="固定指令" className="switch" onClick={() => binding.set("$.bot.commands[" + index + "].pin", command.pin !== true)} />
                      </div>
                      <div className="field field--switch">
                        <div className="field__text"><b>附加到 invite</b><span>邀请消息附带此按钮</span></div>
                        <button type="button" role="switch" aria-checked={command.attachToInvite === true} aria-label="附加到 invite" className="switch" onClick={() => binding.set("$.bot.commands[" + index + "].attachToInvite", command.attachToInvite !== true)} />
                      </div>
                    </div>
                  </Row>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="Terminal" title="还没有自定义指令" hint="点击新增，或先在测试规则里创建一条规则。" action={<Button size="sm" icon="Plus" onClick={addCommand}>新增指令</Button>} />
          )}
          {commands.length ? <AddRow label="在末尾新增一条指令" onClick={addCommand} /> : null}
        </Panel>
      </div>
    </div>
  );
}
