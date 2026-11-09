import { Icon } from "../components/icons";
import { Button, EmptyState, Panel, Pill, ViewHeader } from "../components/ui";
import { ConnectPanel } from "../components/Connect";
import { getAt } from "../lib/configPath";
import type { ConfigObject } from "../types/config";
import type { ViewProps } from "./types";

function count(cfg: ConfigObject | null, path: string): number {
  const value = getAt(cfg, path);
  return Array.isArray(value) ? value.length : 0;
}

function formatTime(value: Date | null): string {
  if (!value) return "尚未同步";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(value);
}

function Sparkline({ samples }: { samples: number[] }) {
  const points = samples.length >= 2 ? samples.slice(-24) : [18, 16, 17, 15, 19, 14, 16, 13, 15, 12, 14, 11];
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(max - min, 1);
  const coords = points.map((value, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * 100;
    const y = 46 - ((value - min) / span) * 34;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], index) => (index === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2)).join(" ");
  const area = line + " L 100 54 L 0 54 Z";
  return (
    <svg className="spark" viewBox="0 0 100 54" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--mint)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--mint)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="area" d={area} />
      <path className="line" d={line} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Dashboard({ model, onInspect }: ViewProps) {
  const cfg = model.config;
  const rules = count(cfg, "$.rules");
  const slaves = count(cfg, "$.slaveConfig.slaves");
  const scripts = count(cfg, "$.scriptConfig.scripts");
  const commands = count(cfg, "$.bot.commands");
  const latency = model.latencySamples.at(-1);
  const risks: Array<{ tone: "amber" | "coral"; text: string; path: string }> = [];

  if (!getAt(cfg, "$.license")) risks.push({ tone: "coral", text: "缺少 license，Koipy 无法正常启动。", path: "$.license" });
  if (!getAt(cfg, "$.bot.bot-token")) risks.push({ tone: "coral", text: "bot-token 为空，Telegram Bot 无法登录。", path: "$.bot.bot-token" });
  if (rules === 0) risks.push({ tone: "amber", text: "rules 为空，命令没有可执行的测试规则。", path: "$.rules" });
  if (slaves === 0) risks.push({ tone: "amber", text: "没有配置测速后端，测试任务无法下发。", path: "$.slaveConfig.slaves" });
  const webapiAddress = String(getAt(cfg, "$.webapi.address", ""));
  if (webapiAddress && !webapiAddress.startsWith("127.") && !webapiAddress.startsWith("localhost")) {
    risks.push({ tone: "amber", text: "Web API 监听地址不是回环地址，确认已设置密码与访问控制。", path: "$.webapi.address" });
  }
  if (getAt(cfg, "$.webapi.tls") === true && !getAt(cfg, "$.webapi.tlsCertFile")) {
    risks.push({ tone: "amber", text: "TLS 已开启但证书路径为空。", path: "$.webapi.tlsCertFile" });
  }

  return (
    <div className="view">
      <ViewHeader
        index="01"
        eyebrow="Overview"
        title="运行态总览"
        subtitle="连接、规模、风险与未保存改动都在这一屏。搜索或 ⌘K 可直达任意字段。"
        meta={
          <>
            <Pill icon="Clock">{formatTime(model.lastSyncAt)}</Pill>
            <Pill tone={model.demo ? "iris" : model.health === "online" ? "mint" : "coral"} icon="Radio">
              {model.demo ? "演示模式" : model.health === "online" ? "在线" : "离线"}
            </Pill>
            {model.changes.length ? <Pill tone="amber" icon="Diff">{model.changes.length} 处未保存</Pill> : null}
          </>
        }
      />

      <div className="bento stagger">
        <section className="hero">
          <div className="hero__top">
            <div>
              <span className="eyebrow">Connection</span>
              <h2 style={{ fontSize: 18, marginTop: 6 }}>Koipy 运行态连接</h2>
            </div>
            <Pill tone={model.health === "online" ? "mint" : model.health === "error" ? "coral" : undefined} icon={model.health === "online" ? "CircleCheck" : "CircleAlert"}>
              {model.demo ? "本地模拟" : model.apiBase || "同源 API"}
            </Pill>
          </div>

          <div>
            <div className="hero__latency">
              <div className="hero__number">
                <b>{latency ?? "—"}</b>
                <span>ms</span>
              </div>
              <div className="hero__caption">
                <b>/api/health 往返延迟</b>
                <span>最近一次同步 {formatTime(model.lastSyncAt)}</span>
              </div>
            </div>
            <Sparkline samples={model.latencySamples} />
          </div>

          <div className="hero__actions">
            <Button icon="Radio" onClick={() => void model.loadConfig()} busy={model.busy === "loading"}>
              重新同步
            </Button>
            <Button icon="ShieldCheck" onClick={() => void model.validateDraft()} disabled={!cfg || model.busy !== "idle"}>
              校验草稿
            </Button>
            <Button variant="primary" icon="Zap" onClick={() => void model.saveWithMode("save_reload")} disabled={!cfg || model.busy !== "idle"}>
              保存并重载
            </Button>
          </div>
        </section>

        <div className="stat-row">
          <div className="tile">
            <span className="tile__label"><Icon name="ListChecks" size={12} /> 规则</span>
            <span className="tile__value"><b>{rules}</b><span>条</span></span>
            <span className="tile__hint">订阅与运行时组合</span>
          </div>
          <div className="tile">
            <span className="tile__label"><Icon name="ServerCog" size={12} /> 后端</span>
            <span className="tile__value"><b>{slaves}</b><span>个</span></span>
            <span className="tile__hint">slave 测速节点</span>
          </div>
          <div className="tile">
            <span className="tile__label"><Icon name="FileCode" size={12} /> 脚本</span>
            <span className="tile__value"><b>{scripts}</b><span>个</span></span>
            <span className="tile__hint">gojajs / gofunc</span>
          </div>
          <div className="tile">
            <span className="tile__label"><Icon name="Bot" size={12} /> 指令</span>
            <span className="tile__value"><b>{commands}</b><span>条</span></span>
            <span className="tile__hint">已绑定与自定义指令</span>
          </div>
        </div>

        <Panel className="span-4" eyebrow="Shortcuts" title="常用操作" icon="Zap" bodyClass="panel__body--tight" actions={<Pill>{model.paths.length} 个字段</Pill>}>
          <div className="quick-list">
            {[
              { label: "编辑测试规则", icon: "ListChecks", view: "rules" as const, meta: rules + " 条" },
              { label: "管理测速后端", icon: "ServerCog", view: "slaves" as const, meta: slaves + " 个" },
              { label: "配置 Bot 指令", icon: "Bot", view: "bot" as const, meta: commands + " 条" },
              { label: "调整结果配色", icon: "Palette", view: "appearance" as const, meta: "image" },
              { label: "打开高级编辑器", icon: "Braces", view: "advanced" as const, meta: "JSON / YAML" },
            ].map((item) => (
              <button key={item.view} type="button" className="quick" onClick={() => model.setActiveView(item.view)}>
                <Icon name={item.icon} />
                <b>{item.label}</b>
                <span>{item.meta}</span>
                <Icon name="ChevronRight" size={14} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          className="span-4"
          eyebrow="Risk"
          title="风险检查"
          icon="ShieldCheck"
          bodyClass="panel__body--tight"
          actions={<Pill tone={risks.length ? "amber" : "mint"} icon={risks.length ? "TriangleAlert" : "Check"}>{risks.length ? risks.length + " 项" : "全部通过"}</Pill>}
        >
          {risks.length ? (
            <div className="risk-list">
              {risks.map((risk) => (
                <button key={risk.path} type="button" className="risk" data-tone={risk.tone} onClick={() => onInspect(risk.path)} style={{ textAlign: "left" }}>
                  <Icon name="TriangleAlert" />
                  <span>{risk.text}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon="CircleCheck" title="没有发现明显风险" hint="基础字段、后端与规则看起来都完整。" />
          )}
        </Panel>

        <Panel
          className="span-4"
          eyebrow="Draft"
          title="未保存改动"
          icon="Diff"
          bodyClass="panel__body--tight"
          actions={
            <Button variant="ghost" size="sm" onClick={() => model.setActiveView("advanced")}>
              去校验
            </Button>
          }
        >
          {model.changes.length ? (
            <>
              <div className="change-list">
                {model.changes.slice(-12).reverse().map((change) => (
                  <button key={change.path} type="button" className="change" onClick={() => onInspect(change.path)} style={{ textAlign: "left" }}>
                    <Icon name="CircleDot" size={12} />
                    <span className="change__path">{change.path.replace(/^\$\./, "")}</span>
                    <span className="change__val">{String(change.after ?? "已删除")}</span>
                  </button>
                ))}
              </div>
              <div className="inline-actions" style={{ marginTop: 8 }}>
                <Button size="sm" icon="Undo2" disabled={!model.canUndo} onClick={model.undo}>撤销</Button>
                <Button size="sm" icon="Redo2" disabled={!model.canRedo} onClick={model.redo}>重做</Button>
                <Button size="sm" variant="danger" icon="RotateCcw" onClick={model.revertAll}>全部还原</Button>
              </div>
            </>
          ) : (
            <EmptyState icon="CircleCheck" title="草稿与运行态一致" hint="编辑任意字段后，这里会列出差异。" />
          )}
        </Panel>

        {model.health !== "online" ? (
          <div className="span-12">
            <Panel eyebrow="Connect" title="重新连接" icon="Radio">
              <ConnectPanel model={model} />
            </Panel>
          </div>
        ) : null}
      </div>
    </div>
  );
}
