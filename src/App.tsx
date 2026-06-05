import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Code2,
  Database,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  Gauge,
  Globe2,
  HardDrive,
  Layers3,
  ListPlus,
  LoaderCircle,
  LockKeyhole,
  Network,
  Palette,
  Pipette,
  Play,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Server,
  Shield,
  SlidersHorizontal,
  Trash2,
  Undo2,
  UploadCloud,
  X,
} from "lucide-react";
import { hexPattern, runtimeFields, scriptReservedNames, sections } from "./data/metadata";
import { colorGradientStops, defaultItem } from "./lib/defaults";
import {
  clone,
  dangerousChangeMessage,
  getAt,
  gradient,
  helpFor,
  isSensitive,
  pathOf,
  riskFor,
  summarize,
  tokenize,
  typeOf,
} from "./lib/configPath";
import { useKoipyConfig } from "./hooks/useKoipyConfig";
import { useToasts } from "./hooks/useToasts";
import type { ConfigObject, FieldSpec, PathNode, SectionId, ToastMessage } from "./types/config";

gsap.registerPlugin(useGSAP);

type Model = ReturnType<typeof useKoipyConfig>;
type Rgb = { r: number; g: number; b: number };
type ColorChannel = keyof Rgb;
type ColorPopoverPosition = { mode: "anchored"; left: number; top: number; width: number } | { mode: "sheet" };
type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> };

const colorPresets = [
  "#ffffff",
  "#edf3f0",
  "#9ba8a5",
  "#6d7a77",
  "#2dd4bf",
  "#14b8a6",
  "#7dd3fc",
  "#60a5fa",
  "#4ade80",
  "#f7c948",
  "#ff7a45",
  "#ff5f6d",
  "#171b1c",
  "#252b2d",
  "#0d0f10",
  "#000000",
];

const colorChannels: ColorChannel[] = ["r", "g", "b"];

const sectionIcons: Record<SectionId, ComponentType<{ size?: number }>> = {
  dashboard: Activity,
  basic: Shield,
  webapi: Globe2,
  bot: Bot,
  network: Network,
  runtime: Gauge,
  scripts: Code2,
  slaves: Server,
  rules: Layers3,
  appearance: Palette,
  translation: Braces,
};

function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const booted = useRef(false);
  const { toasts, notify, dismiss } = useToasts();
  const model = useKoipyConfig({ notify });
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, number | "all" | null>>({});

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void model.loadConfig({ discardColdSample: true });
  }, [model]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: "(prefers-reduced-motion: reduce)" }, (context) => {
        if (context.conditions?.reduceMotion) return;
        gsap.from(".motion-item", {
          autoAlpha: 0,
          y: 14,
          duration: 0.42,
          stagger: 0.035,
          ease: "power3.out",
          clearProps: "transform,visibility,opacity",
        });
      });
      return () => mm.revert();
    },
    { scope: shellRef },
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: "(prefers-reduced-motion: reduce)" }, (context) => {
        if (context.conditions?.reduceMotion) return;
        gsap.from(".view-panel", {
          autoAlpha: 0,
          y: 12,
          duration: 0.28,
          stagger: 0.025,
          ease: "power2.out",
          clearProps: "transform,visibility,opacity",
        });
      });
      return () => mm.revert();
    },
    { scope: shellRef, dependencies: [model.activeView], revertOnUpdate: true },
  );

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return model.paths
      .filter((node) => `${node.path} ${node.key} ${node.type} ${node.description} ${summarize(node.value, node.path, model.showSecrets)}`.toLowerCase().includes(query))
      .slice(0, 50);
  }, [model.paths, model.showSecrets, search]);

  const selectedSection = sections.find((section) => section.id === model.activeView) ?? sections[0];

  const setArrayMode = (path: string, mode: number | "all" | null) => {
    setExpanded((current) => ({ ...current, [path]: mode }));
  };

  const isExpanded = (path: string, index: number, length: number) => {
    const mode = expanded[path];
    if (mode === "all") return true;
    if (mode === null) return false;
    if (mode === undefined) return length <= 2 || index === 0;
    return mode === index;
  };

  const toggleExpanded = (path: string, index: number) => {
    setExpanded((current) => ({ ...current, [path]: current[path] === index ? null : index }));
  };

  const shared = { expanded, isExpanded, toggleExpanded, setArrayMode };

  return (
    <div className="app-shell" ref={shellRef}>
      <Sidebar model={model} search={search} setSearch={setSearch} searchResults={searchResults} />
      <main className="main" id="main" tabIndex={-1}>
        <Topbar model={model} selectedSection={selectedSection} />
        <StatusStrip model={model} />
        <div className="workspace">
          <section className="content-column">
            <SectionContent model={model} shared={shared} />
            <AdvancedEditor model={model} />
          </section>
          <Inspector model={model} />
        </div>
      </main>
      <ToastRegion toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function Sidebar({
  model,
  search,
  setSearch,
  searchResults,
}: {
  model: Model;
  search: string;
  setSearch: (value: string) => void;
  searchResults: PathNode[];
}) {
  const selectPath = (path: string) => {
    model.setSelectedPath(path);
    model.setActiveView(viewIdForPath(path));
    setSearch("");
    document.querySelector<HTMLElement>("#main")?.focus();
  };

  return (
    <aside className="sidebar motion-item" aria-label="配置分类导航">
      <a className="skip-link" href="#main">
        跳转到配置工作区
      </a>
      <section className="brand-panel" aria-labelledby="app-title">
        <img className="brand-mark" src="/koipy.ico" width="38" height="38" alt="" />
        <div>
          <p className="eyebrow">Koi Control Console</p>
          <h1 id="app-title">Koiboard V3</h1>
        </div>
      </section>

      <div className="search-control">
        <label htmlFor="global-search">全局搜索</label>
        <div className="input-with-icon">
          <Search size={18} />
          <input id="global-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索路径、字段名、中文说明" autoComplete="off" />
        </div>
        {searchResults.length > 0 && (
          <section className="result-panel" aria-label="搜索结果">
            {searchResults.map((node) => (
              <button key={node.path} type="button" onClick={() => selectPath(node.path)}>
                <code>{node.path}</code>
                <span>{summarize(node.value, node.path, model.showSecrets)}</span>
              </button>
            ))}
          </section>
        )}
      </div>

      <nav className="section-nav" aria-label="配置大类">
        {sections.map((section) => {
          const Icon = sectionIcons[section.id];
          const count = section.roots.length ? model.paths.filter((node) => section.roots.includes(String(tokenize(node.path)[0] ?? ""))).length : model.paths.length;
          return (
            <button key={section.id} className={`nav-item ${model.activeView === section.id ? "is-active" : ""}`} type="button" onClick={() => model.setActiveView(section.id)}>
              <Icon size={18} />
              <span>
                <strong>{section.shortTitle}</strong>
                <small>{count} 项</small>
              </span>
            </button>
          );
        })}
      </nav>

      <section className="sidebar-card connection-card">
        <div className="connection-card-head">
          <p className="eyebrow">Connection Monitor</p>
          <HealthPill model={model} />
        </div>
        <div className="connection-card-grid">
          <article>
            <span>最后同步</span>
            <strong>{formatTime(model.lastSyncAt)}</strong>
          </article>
          <article>
            <span>连接延迟</span>
            <strong>{model.healthLatencyMs === null ? "-- ms" : `${model.healthLatencyMs} ms`}</strong>
          </article>
        </div>
        <button className="button secondary full" type="button" onClick={() => void model.loadConfig()}>
          <RefreshCcw size={16} />
          重新拉取配置
        </button>
      </section>
    </aside>
  );
}

function Topbar({ model, selectedSection }: { model: Model; selectedSection: { title: string; hint: string } }) {
  const [apiDraft, setApiDraft] = useState(model.apiBase);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => setApiDraft(model.apiBase), [model.apiBase]);

  const applyApiBase = () => {
    try {
      setApiDraft(model.setApiBase(apiDraft));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
      setApiDraft(model.apiBase);
    }
  };

  return (
    <header className="topbar motion-item">
      <div className="topbar-title">
        <p className="eyebrow">Network Lab / Telegram Bot Ops</p>
        <h2>{selectedSection.title}</h2>
        <p>{selectedSection.hint}</p>
      </div>

      <section className="connection-bar" data-health={model.health} aria-label="连接与认证">
        <div className="connection-head">
          <div>
            <p className="eyebrow">Connection Setup</p>
            <h3>连接与认证</h3>
          </div>
          <HealthPill model={model} />
        </div>
        <div className="connection-grid">
          <label className="connection-field api-field">
            <span>API 地址</span>
            <input value={apiDraft} onChange={(event) => setApiDraft(event.target.value)} onBlur={applyApiBase} placeholder="留空使用同源 API，例如 http://127.0.0.1:8899" inputMode="url" />
            <small>{model.apiBase ? `当前 API：${model.apiBase}` : `当前 API：同源（${window.location.origin}）`}</small>
          </label>
          <div className="connection-field access-field">
            <span>访问密码</span>
            <span className="secret-input">
              <input type={passwordVisible ? "text" : "password"} value={model.password} onChange={(event) => model.setPassword(event.target.value)} placeholder="webapi.password" autoComplete="current-password" />
              <button className="icon-button" type="button" onClick={() => setPasswordVisible((value) => !value)} aria-label={passwordVisible ? "隐藏访问密码" : "显示访问密码"}>
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
            <label className="remember-access">
              <input type="checkbox" checked={model.rememberPassword} onChange={(event) => model.setRememberPassword(event.target.checked)} />
              <span>记住密码（仅当前浏览器）</span>
            </label>
          </div>
        </div>
      </section>

      <div className="topbar-controls">
        <button className="button secondary" type="button" onClick={() => void model.validateDraft()} disabled={!model.config}>
          <FileCheck2 size={16} />
          校验草稿
        </button>
        <button className="button primary" type="button" onClick={() => void model.putDraft()} disabled={!model.config}>
          <UploadCloud size={16} />
          写入内存
        </button>
        <button className="button secondary" type="button" onClick={() => void model.saveWithMode("save")} disabled={!model.config}>
          <Save size={16} />
          保存
        </button>
        <button className="button accent" type="button" onClick={() => void model.saveWithMode("save_reload")} disabled={!model.config}>
          <Play size={16} />
          保存并重载
        </button>
      </div>
    </header>
  );
}

function HealthPill({ model }: { model: Model }) {
  const text = model.health === "online" ? "已连接" : model.health === "error" ? "连接失败" : "连接中";
  return (
    <span className={`health-pill ${model.health}`}>
      {model.health === "pending" ? <LoaderCircle size={15} className="spin" /> : <span className="status-dot" />}
      {text}
    </span>
  );
}

function StatusStrip({ model }: { model: Model }) {
  const fieldCount = model.paths.length;
  const validationText = model.validation === "pass" ? "通过" : model.validation === "fail" ? "失败" : "未校验";
  return (
    <section className="status-strip motion-item" aria-label="配置状态">
      <article>
        <span>草稿</span>
        <strong>{model.dirtyPaths.size ? `${model.dirtyPaths.size} 项修改` : model.config ? "无修改" : "未加载"}</strong>
      </article>
      <article>
        <span>字段数量</span>
        <strong>{fieldCount}</strong>
      </article>
      <article>
        <span>校验结果</span>
        <strong data-tone={model.validation}>{validationText}</strong>
      </article>
      <article>
        <span>最后同步</span>
        <strong>{formatTime(model.lastSyncAt)}</strong>
      </article>
    </section>
  );
}

interface SharedArrayState {
  expanded: Record<string, number | "all" | null>;
  isExpanded: (path: string, index: number, length: number) => boolean;
  toggleExpanded: (path: string, index: number) => void;
  setArrayMode: (path: string, mode: number | "all" | null) => void;
}

function SectionContent({ model, shared }: { model: Model; shared: SharedArrayState }) {
  if (!model.config) return <EmptyConfig model={model} />;
  const renderers: Record<SectionId, ReactElement> = {
    dashboard: <Dashboard model={model} />,
    basic: <BasicView model={model} shared={shared} />,
    webapi: <WebapiView model={model} />,
    bot: <BotView model={model} shared={shared} />,
    network: <NetworkView model={model} />,
    runtime: <RuntimeView model={model} shared={shared} />,
    scripts: <ScriptsView model={model} shared={shared} />,
    slaves: <SlavesView model={model} shared={shared} />,
    rules: <RulesView model={model} shared={shared} />,
    appearance: <AppearanceView model={model} shared={shared} />,
    translation: <TranslationView model={model} />,
  };
  return <section className="view-stack">{renderers[model.activeView]}</section>;
}

function EmptyConfig({ model }: { model: Model }) {
  return (
    <section className="view-stack">
      <Panel title="等待连接" eyebrow="Bootstrap" icon={<Database size={18} />}>
        <div className="empty-state">
          <LockKeyhole size={30} />
          <h3>还没有载入 Koipy 配置</h3>
          <p>填写 API 地址和访问密码后，重新拉取配置即可开始编辑。</p>
          <button className="button primary" type="button" onClick={() => void model.loadConfig()}>
            <RefreshCcw size={16} />
            读取配置
          </button>
        </div>
      </Panel>
    </section>
  );
}

function Dashboard({ model }: { model: Model }) {
  const rules = getAt<unknown[]>(model.config, "$.rules", []);
  const slaves = getAt<unknown[]>(model.config, "$.slaveConfig.slaves", []);
  const scripts = getAt<unknown[]>(model.config, "$.scriptConfig.scripts", []);
  const webapi = getAt<ConfigObject>(model.config, "$.webapi", {});
  const risks = [
    webapi.enable && !webapi.password ? "Web API 已开启但未设置访问密码" : "",
    webapi.tls && (!webapi.tlsCertFile || !webapi.tlsKeyFile) ? "TLS 已开启但证书路径不完整" : "",
    !rules.length ? "rules 为空，测试入口不可用" : "",
    !slaves.length ? "未配置测速后端" : "",
  ].filter(Boolean);

  return (
    <>
      <section className="dashboard-grid view-panel">
        <article className="hero-panel">
          <p className="eyebrow">Control Surface</p>
          <h3>草稿优先的 Koipy 配置台</h3>
          <p>所有修改先停留在浏览器草稿。校验通过后，可写入内存、保存到 config.yaml，或保存并触发重载。</p>
          <div className="hero-actions">
            <button className="button primary" type="button" onClick={() => void model.validateDraft()}>
              <FileCheck2 size={16} />
              校验草稿
            </button>
            <button className="button accent" type="button" onClick={() => void model.saveWithMode("save_reload")}>
              <Play size={16} />
              保存并重载
            </button>
          </div>
        </article>
        <Metric label="规则" value={rules.length} hint="rules" icon={<Layers3 size={20} />} />
        <Metric label="后端" value={slaves.length} hint="slaveConfig.slaves" icon={<Server size={20} />} />
        <Metric label="脚本" value={scripts.length} hint="scriptConfig.scripts" icon={<Code2 size={20} />} />
      </section>

      <Panel title="安全与变更摘要" eyebrow="Ops Guard" icon={<Shield size={18} />}>
        <div className="risk-list">
          {risks.length ? (
            risks.map((risk) => (
              <button key={risk} type="button" className="risk-item" onClick={() => model.setSelectedPath("$.webapi")}>
                <AlertTriangle size={17} />
                {risk}
              </button>
            ))
          ) : (
            <div className="success-state">
              <CheckCircle2 size={18} />
              当前未发现高优先级配置风险。
            </div>
          )}
        </div>
        <div className="change-list">
          {model.dirtyPaths.size ? (
            [...model.dirtyPaths].map((path) => (
              <button key={path} type="button" className="change-item" onClick={() => model.setSelectedPath(path)}>
                <code>{path}</code>
                <span>{summarize(getAt(model.config, path), path, model.showSecrets)}</span>
              </button>
            ))
          ) : (
            <p className="muted">暂无未保存修改。编辑任意字段后会在这里显示变更路径。</p>
          )}
        </div>
      </Panel>
    </>
  );
}

function Metric({ label, value, hint, icon }: { label: string; value: number; hint: string; icon: ReactNode }) {
  return (
    <article className="metric">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
      <em>{hint}</em>
    </article>
  );
}

function BasicView({ model, shared }: { model: Model; shared: SharedArrayState }) {
  return (
    <Panel title="基础与权限" eyebrow="Identity" icon={<Shield size={18} />}>
      <div className="form-grid">
        <FieldInput model={model} path="$.license" label="license" kind="secret" helper="授权信息，默认隐藏。" />
        <FieldInput model={model} path="$.log-level" label="log-level" kind="select" choices={["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL", "DISABLE"]} />
        <ArrayEditor model={model} shared={shared} path="$.admin" title="管理员 Telegram ID" itemName="admin" />
        <ArrayEditor model={model} shared={shared} path="$.user" title="普通用户 Telegram ID" itemName="user" />
      </div>
    </Panel>
  );
}

function WebapiView({ model }: { model: Model }) {
  return (
    <Panel title="Web API 只读配置" eyebrow="Read-only Web API" icon={<Globe2 size={18} />}>
      <div className="readonly-note">
        <LockKeyhole size={18} />
        <span>此配置会影响当前 Web API 的监听、认证和跨域策略。为避免通过前端改掉自身入口，这里只展示，不允许编辑或保存。</span>
      </div>
      <div className="form-grid">
        <ReadOnlyField model={model} path="$.webapi.enable" label="启用 Web API" />
        <ReadOnlyField model={model} path="$.webapi.address" label="监听地址" />
        <ReadOnlyField model={model} path="$.webapi.password" label="访问密码" secret />
        <ReadOnlyField model={model} path="$.webapi.tls" label="启用 TLS" />
        <ReadOnlyField model={model} path="$.webapi.tlsCertFile" label="TLS 证书文件" />
        <ReadOnlyField model={model} path="$.webapi.tlsKeyFile" label="TLS 私钥文件" secret />
        <ReadOnlyArray model={model} path="$.webapi.allowOrigins" title="允许跨域来源" />
      </div>
    </Panel>
  );
}

function BotView({ model, shared }: { model: Model; shared: SharedArrayState }) {
  return (
    <>
      <Panel title="Telegram Bot" eyebrow="Bot Core" icon={<Bot size={18} />}>
        <div className="form-grid">
          <FieldInput model={model} path="$.bot.bot-token" label="bot-token" kind="secret" />
          <FieldInput model={model} path="$.bot.api-id" label="api-id" kind="number" step={1} />
          <FieldInput model={model} path="$.bot.api-hash" label="api-hash" kind="secret" />
          <FieldInput model={model} path="$.bot.proxy" label="Bot 代理" placeholder="socks5://127.0.0.1:1080" />
          <FieldInput model={model} path="$.bot.ipv6" label="IPv6" kind="switch" />
          <FieldInput model={model} path="$.bot.antiGroup" label="防群组滥用" kind="switch" />
          <FieldInput model={model} path="$.bot.strictMode" label="严格模式" kind="switch" />
          <FieldInput model={model} path="$.bot.bypassMode" label="旁路模式" kind="switch" />
          <FieldInput model={model} path="$.bot.parseMode" label="parseMode" kind="select" choices={["DEFAULT", "MARKDOWN", "HTML", "DISABLED"]} />
          <FieldInput model={model} path="$.bot.cacheTime" label="cacheTime" kind="number" min={0} step={1} />
          <FieldInput model={model} path="$.bot.echoLimit" label="echoLimit" kind="number" min={0} step={1} />
          <FieldInput model={model} path="$.bot.autoResetCommands" label="自动重置命令" kind="switch" />
          <ArrayEditor model={model} shared={shared} path="$.bot.inviteGroup" title="invite 群组白名单" itemName="group id" />
          <ArrayEditor model={model} shared={shared} path="$.bot.inviteBlacklistURL" title="邀请测试 URL 黑名单源" itemName="url" />
          <ArrayEditor model={model} shared={shared} path="$.bot.inviteBlacklistDomain" title="邀请测试域名黑名单源" itemName="url" />
        </div>
      </Panel>
      <CommandCards model={model} shared={shared} />
      <Panel title="回调服务" eyebrow="Callbacks" icon={<Network size={18} />}>
        <div className="form-grid one">
          <FieldInput model={model} path="$.callbacks.onMessage" label="onMessage" kind="textarea" rows={4} />
          <FieldInput model={model} path="$.callbacks.onPreSend" label="onPreSend" kind="textarea" rows={4} />
          <FieldInput model={model} path="$.callbacks.onResult" label="onResult" kind="textarea" rows={4} />
        </div>
      </Panel>
    </>
  );
}

function NetworkView({ model }: { model: Model }) {
  return (
    <Panel title="网络与订阅转换" eyebrow="Network Lab" icon={<Network size={18} />}>
      <div className="form-grid">
        <FieldInput model={model} path="$.network.httpProxy" label="HTTP Proxy" />
        <FieldInput model={model} path="$.network.socks5Proxy" label="SOCKS5 Proxy" />
        <FieldInput model={model} path="$.network.userAgent" label="User-Agent" kind="textarea" rows={3} />
        <FieldInput model={model} path="$.subconverter.enable" label="启用 subconverter" kind="switch" />
        <FieldInput model={model} path="$.subconverter.mode" label="模式" kind="select" choices={["subconverter", "substore"]} />
        <FieldInput model={model} path="$.subconverter.template.backend" label="后端模板 URL" />
        <FieldInput model={model} path="$.subconverter.defaults.target" label="默认 target" />
      </div>
    </Panel>
  );
}

function RuntimeView({ model, shared }: { model: Model; shared: SharedArrayState }) {
  return (
    <Panel title="测试运行时" eyebrow="Runtime" icon={<Gauge size={18} />}>
      <div className="form-grid">
        {runtimeFields("$.runtime").map((field) => (
          <FieldInput key={field.path} model={model} {...field} />
        ))}
        <ArrayEditor model={model} shared={shared} path="$.runtime.speedFiles" title="测速文件" itemName="url" />
      </div>
    </Panel>
  );
}

function ScriptsView({ model, shared }: { model: Model; shared: SharedArrayState }) {
  const scripts = getAt<ConfigObject[]>(model.config, "$.scriptConfig.scripts", []);
  const path = "$.scriptConfig.scripts";
  return (
    <Panel title="脚本配置" eyebrow="Script Registry" icon={<Code2 size={18} />}>
      <ToolbarLine count={`${scripts.length} 个脚本，按 rank 升序维护。`} path={path} shared={shared} onAdd={() => model.updateArray(path, (items) => items.push(defaultItem("script")))} />
      <div className="card-list">
        {scripts.length ? scripts.map((script, index) => <ScriptCard key={`${script.name ?? "script"}-${index}`} model={model} shared={shared} script={script} index={index} />) : <EmptyList text="暂无脚本" />}
      </div>
    </Panel>
  );
}

function SlavesView({ model, shared }: { model: Model; shared: SharedArrayState }) {
  const slaves = getAt<ConfigObject[]>(model.config, "$.slaveConfig.slaves", []);
  const path = "$.slaveConfig.slaves";
  return (
    <>
      <Panel title="后端全局设置" eyebrow="Slave Control" icon={<Server size={18} />}>
        <div className="form-grid">
          <FieldInput model={model} path="$.slaveConfig.geoClustering" label="地理聚类" kind="switch" />
          <FieldInput model={model} path="$.slaveConfig.showID" label="显示后端 ID" kind="switch" />
          <FieldInput model={model} path="$.slaveConfig.speedScheduling" label="测速调度" />
          <FieldInput model={model} path="$.slaveConfig.healthCheck.autoHideOnFailure" label="失败自动隐藏" kind="switch" />
          <FieldInput model={model} path="$.slaveConfig.healthCheck.numSamples" label="健康检查样本" kind="number" min={1} max={20} step={1} />
          <FieldInput model={model} path="$.slaveConfig.healthCheck.showStatusStyle" label="状态展示" kind="select" choices={["emoji", "number", "default"]} />
        </div>
      </Panel>
      <Panel title="后端节点" eyebrow="Slave Cards" icon={<HardDrive size={18} />}>
        <ToolbarLine count={`${slaves.length} 个后端`} path={path} shared={shared} onAdd={() => model.updateArray(path, (items) => items.push(defaultItem("slave")))} />
        <div className="card-list">
          {slaves.length ? slaves.map((slave, index) => <SlaveCard key={`${slave.id ?? "slave"}-${index}`} model={model} shared={shared} slave={slave} index={index} />) : <EmptyList text="暂无后端" />}
        </div>
      </Panel>
    </>
  );
}

function RulesView({ model, shared }: { model: Model; shared: SharedArrayState }) {
  const rules = getAt<ConfigObject[]>(model.config, "$.rules", []);
  const path = "$.rules";
  return (
    <Panel title="测试规则" eyebrow="Rules" icon={<Layers3 size={18} />}>
      <div className="toolbar-line">
        <button className="button secondary" type="button" onClick={() => model.updateArray(path, (items) => items.push(defaultItem("rule")))}>
          <ListPlus size={16} />
          新增
        </button>
        <button
          className="button danger"
          type="button"
          onClick={() => {
            if (window.confirm("确认清空 rules 吗？保存前仍会停留在草稿。")) model.updatePath(path, []);
          }}
        >
          <Trash2 size={16} />
          清空 rules
        </button>
        <span>{rules.length} 条规则</span>
        <ArrayModeButtons path={path} length={rules.length} shared={shared} />
      </div>
      <div className="card-list">
        {rules.length ? rules.map((rule, index) => <RuleCard key={`${rule.name ?? "rule"}-${index}`} model={model} shared={shared} rule={rule} index={index} />) : <EmptyList text="暂无规则" />}
      </div>
    </Panel>
  );
}

function AppearanceView({ model, shared }: { model: Model; shared: SharedArrayState }) {
  const speed = getAt(model.config, "$.image.color.speed", []);
  const delay = getAt(model.config, "$.image.color.delay", []);
  const background = getAt<ConfigObject>(model.config, "$.image.color.background", {});
  return (
    <>
      <Panel title="图片与外观" eyebrow="Image" icon={<Palette size={18} />}>
        <div className="form-grid">
          <FieldInput model={model} path="$.image.title" label="标题" />
          <FieldInput model={model} path="$.image.logo" label="协议 Logo" kind="switch" />
          <FieldInput model={model} path="$.image.speedFormat" label="速度格式" />
          <FieldInput model={model} path="$.image.pixelThreshold" label="像素阈值" kind="number" min={0} step={1} />
          <FieldInput model={model} path="$.image.font" label="字体文件" />
          <FieldInput model={model} path="$.image.emoji.enable" label="启用 emoji" kind="switch" />
          <FieldInput model={model} path="$.image.emoji.source" label="emoji 来源" />
          <FieldInput model={model} path="$.image.endColorsSwitch" label="渐变开关" kind="switch" />
          <FieldInput model={model} path="$.image.speedEndColorSwitch" label="速度渐变开关" kind="switch" />
          <FieldInput model={model} path="$.image.compress" label="压缩图片" kind="switch" />
          <FieldInput model={model} path="$.image.invert" label="反色" kind="switch" />
          <FieldInput model={model} path="$.image.save" label="保存结果图" kind="switch" />
          <FieldInput model={model} path="$.image.watermark.enable" label="启用水印" kind="switch" />
          <FieldInput model={model} path="$.image.watermark.text" label="水印内容" />
          <FieldInput model={model} path="$.image.watermark.alpha" label="水印透明度" kind="number" min={0} max={255} step={1} />
          <FieldInput model={model} path="$.image.watermark.angle" label="水印角度" kind="number" min={-180} max={180} step={1} />
          <FieldInput model={model} path="$.image.watermark.size" label="水印大小" kind="number" min={1} step={1} />
          <FieldInput model={model} path="$.image.watermark.row-spacing" label="水印行距" kind="number" min={0} step={1} />
          <FieldInput model={model} path="$.image.watermark.start-y" label="开始 Y 坐标" kind="number" min={0} step={1} />
          <FieldInput model={model} path="$.image.watermark.trace" label="UID 追踪" kind="switch" />
          <FieldInput model={model} path="$.image.watermark.color.value" label="水印颜色" kind="color" />
        </div>
      </Panel>
      <Panel title="速度 / 延迟渐变色" eyebrow="Color Graph" icon={<SlidersHorizontal size={18} />}>
        <div className="gradient-preview">
          <div style={{ background: gradient(speed) }} />
          <span>速度色带</span>
        </div>
        <ColorStopEditor model={model} shared={shared} path="$.image.color.speed" title="速度色带断点" unit="MB/s" />
        <div className="gradient-preview">
          <div style={{ background: gradient(delay) }} />
          <span>延迟色带</span>
        </div>
        <ColorStopEditor model={model} shared={shared} path="$.image.color.delay" title="延迟色带断点" unit="ms" />
        <div className="watermark-preview">
          <strong>{String(getAt(model.config, "$.image.title", "Koipy"))}</strong>
          <span>{String(getAt(model.config, "$.image.watermark.text", "watermark") || "watermark preview")}</span>
        </div>
        <div className="form-grid">
          {Object.entries(background)
            .slice(0, 10)
            .map(([name]) => (
              <FieldInput key={name} model={model} path={`$.image.color.background.${name}.value`} label={name} kind="color" />
            ))}
        </div>
      </Panel>
    </>
  );
}

function TranslationView({ model }: { model: Model }) {
  const resources = getAt<ConfigObject>(model.config, "$.translation.resources", {});
  const langChoices = [...new Set([String(getAt(model.config, "$.translation.lang", "")), ...Object.keys(resources)].filter(Boolean))];
  return (
    <Panel title="本地化配置" eyebrow="Localization" icon={<Braces size={18} />}>
      <div className="form-grid">
        <FieldInput model={model} path="$.translation.lang" label="语言" kind="select" choices={langChoices.length ? langChoices : ["zh-CN"]} />
        <ResourceEditor model={model} path="$.translation.resources" title="语言资源" />
      </div>
    </Panel>
  );
}

function FieldInput({ model, path, label, kind, choices, placeholder, helper, min, max, step, rows, wide, allowUnset }: FieldSpec & { model: Model }) {
  const value = getAt(model.config, path, "");
  const inferredKind = kind ?? inferFieldKind(path, value);
  const help = helper || helpFor(path);
  const changed = model.dirtyPaths.has(path);
  const id = `field-${path.replace(/[^a-z0-9]/gi, "-")}`;
  const display = value === null || value === undefined ? "" : String(value);

  const commit = (nextValue: unknown) => {
    const danger = dangerousChangeMessage(path, nextValue, model.config);
    if (danger && !window.confirm(`确认修改危险字段\n\n${danger}`)) return;
    model.updatePath(path, nextValue);
  };

  const inputProps = {
    id,
    "aria-describedby": `${id}-help`,
    onFocus: () => model.setSelectedPath(path),
  };

  let control: React.ReactNode;
  if (inferredKind === "switch") {
    control = (
      <label className="switch">
        <input {...inputProps} type="checkbox" checked={Boolean(value)} onChange={(event) => commit(event.target.checked)} />
        <span />
      </label>
    );
  } else if (inferredKind === "textarea") {
    control = <textarea {...inputProps} key={`${path}-${display}`} defaultValue={display} rows={rows ?? 3} onBlur={(event) => commit(event.target.value)} placeholder={placeholder} spellCheck={false} />;
  } else if (inferredKind === "select") {
    const values = allowUnset ? ["", ...(choices || [])] : choices || [];
    control = (
      <select {...inputProps} key={`${path}-${display}`} defaultValue={display} onChange={(event) => commit(event.target.value)}>
        {values.map((choice) => (
          <option key={choice || "__unset"} value={choice}>
            {choice || "不覆盖"}
          </option>
        ))}
      </select>
    );
  } else if (inferredKind === "color") {
    control = <ColorField id={id} path={path} value={display} describedBy={`${id}-help`} onFocus={inputProps.onFocus} onCommit={commit} />;
  } else if (inferredKind === "secret") {
    control = (
      <input
        {...inputProps}
        key={`${path}-${display}-${model.showSecrets}`}
        type={model.showSecrets ? "text" : "password"}
        defaultValue={display}
        onBlur={(event) => commit(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    );
  } else {
    control = (
      <input
        {...inputProps}
        key={`${path}-${display}`}
        type={inferredKind === "number" ? "number" : "text"}
        defaultValue={display}
        min={min}
        max={max}
        step={step}
        onBlur={(event) => {
          if (inferredKind === "number") {
            if (!event.target.value.trim()) return;
            const parsed = Number(event.target.value);
            if (!Number.isFinite(parsed)) {
              window.alert("数字格式无效");
              return;
            }
            commit(parsed);
            return;
          }
          commit(event.target.value);
        }}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div className={`field ${changed ? "is-dirty" : ""} ${wide ? "is-wide" : ""}`} data-field-path={path}>
      <span className="field-title">
        <label htmlFor={id}>{label}</label>
        <button type="button" className="help-tip" aria-label={`字段说明：${help}`} title={help} onClick={() => model.setSelectedPath(path)}>
          ?
        </button>
      </span>
      {control}
      <small id={`${id}-help`}>{help}</small>
    </div>
  );
}

function ColorField({ id, path, value, describedBy, onFocus, onCommit }: { id: string; path: string; value: string; describedBy: string; onFocus: () => void; onCommit: (nextValue: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const committedColor = normalizeHexColor(value) ?? "#ffffff";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(committedColor);
  const [text, setText] = useState(value);
  const [popoverPosition, setPopoverPosition] = useState<ColorPopoverPosition>({ mode: "anchored", left: 0, top: 0, width: 360 });
  const [canUseEyeDropper, setCanUseEyeDropper] = useState(false);
  const pickerId = `${id}-picker`;
  const draftColor = normalizeHexColor(draft) ?? committedColor;
  const rgb = useMemo(() => hexToRgb(draftColor), [draftColor]);

  useEffect(() => {
    setDraft(committedColor);
    setText(value);
  }, [committedColor, value]);

  useEffect(() => {
    setCanUseEyeDropper(Boolean(getEyeDropper() && window.isSecureContext));
  }, []);

  const updatePopoverPosition = () => {
    const anchor = rootRef.current;
    if (!anchor) return;
    if (window.innerWidth <= 560) {
      setPopoverPosition({ mode: "sheet" });
      return;
    }

    const margin = 16;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - margin * 2);
    const height = popoverRef.current?.offsetHeight ?? 320;
    const left = clamp(rect.left, margin, window.innerWidth - width - margin);
    const belowTop = rect.bottom + 8;
    const aboveTop = rect.top - height - 8;
    const fitsBelow = belowTop + height <= window.innerHeight - margin;
    const top = fitsBelow || aboveTop < margin ? Math.min(belowTop, window.innerHeight - height - margin) : aboveTop;

    setPopoverPosition({ mode: "anchored", left, top: Math.max(margin, top), width });
  };

  useLayoutEffect(() => {
    if (open) updatePopoverPosition();
  }, [draftColor, open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open]);

  const updateDraft = (nextValue: string) => {
    const normalized = normalizeHexColor(nextValue);
    const next = normalized ?? nextValue;
    setDraft(next);
    setText(next);
  };

  const commitText = (nextValue: string) => {
    const normalized = normalizeHexColor(nextValue);
    const next = normalized ?? nextValue.trim();
    setText(next);
    if (normalized) setDraft(normalized);
    if (next !== value) onCommit(next);
  };

  const applyDraft = () => {
    setOpen(false);
    commitText(draftColor);
  };

  const resetDraft = () => {
    setDraft(committedColor);
    setText(value);
    setOpen(false);
  };

  const updateChannel = (channel: ColorChannel, nextValue: string) => {
    const nextRgb = { ...rgb, [channel]: clampByte(Number(nextValue)) };
    updateDraft(rgbToHex(nextRgb, alphaSuffix(draftColor)));
  };

  const pickFromScreen = async () => {
    const EyeDropper = getEyeDropper();
    if (!EyeDropper) return;
    try {
      const result = await new EyeDropper().open();
      setOpen(false);
      commitText(result.sRGBHex);
    } catch {
      // User canceled the picker.
    }
  };

  const popoverStyle = popoverPosition.mode === "anchored" ? { left: popoverPosition.left, top: popoverPosition.top, width: popoverPosition.width } : undefined;
  const popover =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className={`color-popover ${popoverPosition.mode === "sheet" ? "is-sheet" : ""}`} id={pickerId} ref={popoverRef} role="dialog" aria-label={`${path} 颜色选择`} style={popoverStyle}>
            <div className="color-popover-head">
              <span className="color-preview" style={{ background: draftColor }} />
              <code>{draftColor}</code>
              {canUseEyeDropper && (
                <button className="icon-button color-eyedropper" type="button" onClick={() => void pickFromScreen()} aria-label="从屏幕吸取颜色" title="从屏幕吸取颜色">
                  <Pipette size={16} />
                </button>
              )}
            </div>
            <div className="color-presets" aria-label="预设颜色">
              {colorPresets.map((preset) => (
                <button
                  key={preset}
                  className={preset === draftColor ? "is-selected" : ""}
                  type="button"
                  style={{ background: preset }}
                  onClick={() => updateDraft(preset)}
                  aria-label={`选择颜色 ${preset}`}
                />
              ))}
            </div>
            <div className="color-channels">
              {colorChannels.map((channel) => (
                <label className="color-channel" key={channel}>
                  <span>{channel.toUpperCase()}</span>
                  <input type="range" min={0} max={255} value={rgb[channel]} onChange={(event) => updateChannel(channel, event.target.value)} aria-label={`${channel.toUpperCase()} 通道`} />
                  <output>{rgb[channel]}</output>
                </label>
              ))}
            </div>
            <div className="color-popover-actions">
              <button className="button secondary" type="button" onClick={resetDraft}>
                <X size={16} />
                取消
              </button>
              <button className="button primary" type="button" onClick={applyDraft}>
                <CheckCircle2 size={16} />
                应用
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`color-input ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        className="color-swatch-button"
        type="button"
        onClick={() => {
          onFocus();
          setOpen((current) => !current);
        }}
        aria-label={`打开 ${path} 颜色选择`}
        aria-expanded={open}
        aria-controls={pickerId}
      >
        <span style={{ background: draftColor }} />
      </button>
      <input
        id={id}
        aria-describedby={describedBy}
        value={text}
        onFocus={onFocus}
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => commitText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        placeholder="#7dd3fc"
        autoComplete="off"
        spellCheck={false}
      />
      {popover}
    </div>
  );
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  if (!hexPattern.test(trimmed)) return null;
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function hexToRgb(value: string): Rgb {
  const normalized = normalizeHexColor(value) ?? "#ffffff";
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb, alpha = "") {
  const hex = [r, g, b].map((channel) => clampByte(channel).toString(16).padStart(2, "0")).join("");
  return `#${hex}${alpha}`.toLowerCase();
}

function alphaSuffix(value: string) {
  const normalized = normalizeHexColor(value);
  return normalized && normalized.length === 9 ? normalized.slice(7) : "";
}

function clampByte(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function getEyeDropper() {
  return (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;
}

function ReadOnlyField({ model, path, label, secret = false }: { model: Model; path: string; label: string; secret?: boolean }) {
  const value = getAt(model.config, path, "");
  const help = helpFor(path);
  const renderedValue = secret ? summarize(value, path, model.showSecrets) : value === "" || value === null || value === undefined ? "未设置" : String(value);
  return (
    <button className="readonly-field" type="button" onClick={() => model.setSelectedPath(path)}>
      <span className="field-title">
        <strong>{label}</strong>
        <span className="readonly-badge">只读</span>
      </span>
      <output>{renderedValue}</output>
      <small>{help}</small>
    </button>
  );
}

function ReadOnlyArray({ model, path, title }: { model: Model; path: string; title: string }) {
  const items = getAt<unknown[]>(model.config, path, []);
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="readonly-array">
      <div className="array-heading">
        <span className="field-title">
          <strong>{title}</strong>
          <span className="readonly-badge">只读</span>
        </span>
      </div>
      <div className="readonly-list">
        {safeItems.length ? (
          safeItems.map((item, index) => (
            <button key={`${path}-${index}`} type="button" onClick={() => model.setSelectedPath(`${path}[${index}]`)}>
              <code>{String(item)}</code>
            </button>
          ))
        ) : (
          <p className="muted">暂无 {title}</p>
        )}
      </div>
      <small>{helpFor(path)}</small>
    </div>
  );
}

function inferFieldKind(path: string, value: unknown): FieldSpec["kind"] {
  if (typeof value === "boolean") return "switch";
  if (typeof value === "number") return "number";
  if (isSensitive(path)) return "secret";
  if (typeof value === "string" && value.includes("\n")) return "textarea";
  if (typeof value === "string" && hexPattern.test(value)) return "color";
  return "text";
}

function ArrayEditor({ model, shared, path, title, itemName }: { model: Model; shared: SharedArrayState; path: string; title: string; itemName: string }) {
  const items = getAt<unknown[]>(model.config, path, []);
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="array-editor">
      <div className="array-heading">
        <span className="field-title">
          <strong>{title}</strong>
          <button className="help-tip" type="button" title={helpFor(path)} aria-label={`字段说明：${helpFor(path)}`}>
            ?
          </button>
        </span>
        <span className="array-heading-actions">
          <ArrayModeButtons path={path} length={safeItems.length} shared={shared} />
          <button className="button secondary" type="button" onClick={() => model.updateArray(path, (array) => array.push(defaultItem("array")))}>
            <ListPlus size={16} />
            新增
          </button>
        </span>
      </div>
      <div className="array-list">
        {safeItems.length ? (
          safeItems.map((item, index) => {
            const expanded = shared.isExpanded(path, index, safeItems.length);
            const summary = arrayItemSummary(item, index, itemName);
            return (
              <article className={`array-item ${expanded ? "is-expanded" : ""}`} key={`${path}-${index}`}>
                <div className="array-summary">
                  <span>
                    <strong>{summary.label}</strong>
                    <small>{summary.detail}</small>
                  </span>
                  <button className="ghost-chip" type="button" onClick={() => shared.toggleExpanded(path, index)} aria-expanded={expanded}>
                    {expanded ? "收起" : "展开"}
                  </button>
                </div>
                {expanded && (
                  <div className="array-row">
                    <input defaultValue={String(item ?? "")} placeholder={itemName} onFocus={() => model.setSelectedPath(`${path}[${index}]`)} onBlur={(event) => model.updateArray(path, (array) => (array[index] = event.target.value))} />
                    <IconButton label="上移" onClick={() => moveArrayItem(model, path, index, -1)}>
                      <ChevronUp size={16} />
                    </IconButton>
                    <IconButton label="复制" onClick={() => model.updateArray(path, (array) => array.splice(index + 1, 0, clone(array[index])))}>
                      <ClipboardCopy size={16} />
                    </IconButton>
                    <IconButton label="删除" danger onClick={() => model.updateArray(path, (array) => array.splice(index, 1))}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <p className="muted">暂无 {title}</p>
        )}
      </div>
    </div>
  );
}

function CommandCards({ model, shared }: { model: Model; shared: SharedArrayState }) {
  const path = "$.bot.commands";
  const commands = getAt<ConfigObject[]>(model.config, path, []);
  return (
    <Panel title="命令按钮" eyebrow="Command Cards" icon={<Bot size={18} />}>
      <ToolbarLine count={`${commands.length} 个命令`} path={path} shared={shared} onAdd={() => model.updateArray(path, (items) => items.push(defaultItem("command")))} />
      <div className="card-list">
        {commands.map((cmd, index) => {
          const expanded = shared.isExpanded(path, index, commands.length);
          return (
            <article className={`item-card ${expanded ? "is-expanded" : ""}`} key={`${cmd.name ?? "cmd"}-${index}`}>
              <CardHeader title={`/${String(cmd.name || `command-${index + 1}`)}`} subtitle={String(cmd.title || "未命名命令")} badge={cmd.enable === false ? "disabled" : "enabled"} expanded={expanded} onToggle={() => shared.toggleExpanded(path, index)} />
              {expanded && (
                <>
                  <div className="compact-grid">
                    <FieldInput model={model} path={`$.bot.commands[${index}].name`} label="name" />
                    <FieldInput model={model} path={`$.bot.commands[${index}].rule`} label="rule" />
                    <FieldInput model={model} path={`$.bot.commands[${index}].title`} label="title" />
                    <FieldInput model={model} path={`$.bot.commands[${index}].text`} label="text" />
                    <FieldInput model={model} path={`$.bot.commands[${index}].enable`} label="enable" kind="switch" />
                    <FieldInput model={model} path={`$.bot.commands[${index}].pin`} label="pin" kind="switch" />
                    <FieldInput model={model} path={`$.bot.commands[${index}].attachToInvite`} label="attachToInvite" kind="switch" />
                  </div>
                  <CardActions model={model} path={path} index={index} />
                </>
              )}
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function ScriptCard({ model, shared, script, index }: { model: Model; shared: SharedArrayState; script: ConfigObject; index: number }) {
  const path = "$.scriptConfig.scripts";
  const scripts = getAt<unknown[]>(model.config, path, []);
  const expanded = shared.isExpanded(path, index, scripts.length);
  return (
    <article className={`item-card ${expanded ? "is-expanded" : ""}`}>
      <CardHeader title={String(script.name || `script-${index + 1}`)} subtitle={String(script.content || "未设置内容")} badge={String(script.type || "script")} expanded={expanded} onToggle={() => shared.toggleExpanded(path, index)} />
      {expanded && (
        <>
          <div className="compact-grid">
            <FieldWithDatalist model={model} path={`$.scriptConfig.scripts[${index}].name`} label="name" options={scriptReservedNames} />
            <FieldInput model={model} path={`$.scriptConfig.scripts[${index}].type`} label="type" kind="select" choices={["gojajs", "gofunc"]} />
            <FieldInput model={model} path={`$.scriptConfig.scripts[${index}].rank`} label="rank" kind="number" step={1} />
            <FieldInput model={model} path={`$.scriptConfig.scripts[${index}].content`} label="content" kind="textarea" rows={String(script.content || "").includes("\n") ? 10 : 3} wide />
          </div>
          <CardActions model={model} path={path} index={index} />
        </>
      )}
    </article>
  );
}

function SlaveCard({ model, shared, slave, index }: { model: Model; shared: SharedArrayState; slave: ConfigObject; index: number }) {
  const path = "$.slaveConfig.slaves";
  const slaves = getAt<unknown[]>(model.config, path, []);
  const expanded = shared.isExpanded(path, index, slaves.length);
  const base = `$.slaveConfig.slaves[${index}]`;
  return (
    <article className={`item-card ${expanded ? "is-expanded" : ""}`}>
      <CardHeader title={String(slave.id || `slave-${index + 1}`)} subtitle={String(slave.comment || slave.address || "未填写地址")} badge={String(slave.type || "miaospeed")} expanded={expanded} onToggle={() => shared.toggleExpanded(path, index)} />
      {expanded && (
        <>
          <div className="compact-grid">
            <FieldInput model={model} path={`${base}.id`} label="id" />
            <FieldInput model={model} path={`${base}.type`} label="type" kind="select" choices={["miaospeed", "fulltclash", "websocket"]} />
            <FieldInput model={model} path={`${base}.address`} label="address" placeholder="127.0.0.1:8765" />
            <FieldInput model={model} path={`${base}.path`} label="path" />
            <FieldInput model={model} path={`${base}.token`} label="token" kind="secret" />
            <FieldInput model={model} path={`${base}.invoker`} label="invoker" />
            <FieldInput model={model} path={`${base}.buildtoken`} label="buildtoken" kind="secret" />
            <FieldInput model={model} path={`${base}.tls`} label="TLS" kind="switch" />
            <FieldInput model={model} path={`${base}.skipCertVerify`} label="跳过证书校验" kind="switch" />
            <FieldInput model={model} path={`${base}.hidden`} label="隐藏" kind="switch" />
            <FieldInput model={model} path={`${base}.comment`} label="备注" />
            <FieldInput model={model} path={`${base}.option.downloadDuration`} label="下载时长" kind="number" min={1} step={1} />
            <FieldInput model={model} path={`${base}.option.downloadThreading`} label="下载线程" kind="number" min={1} step={1} />
            <FieldInput model={model} path={`${base}.option.downloadURL`} label="下载 URL" />
            <FieldInput model={model} path={`${base}.option.pingAddress`} label="Ping 地址" />
            <FieldInput model={model} path={`${base}.option.taskTimeout`} label="超时 ms" kind="number" min={100} step={100} />
            <FieldInput model={model} path={`${base}.option.apiVersion`} label="API Version" kind="number" min={1} step={1} />
            <FieldInput model={model} path={`${base}.option.uploadURL`} label="上传 URL" />
          </div>
          <ArrayEditor model={model} shared={shared} path={`${base}.option.dnsServer`} title="DNS Server" itemName="dns" />
          <CardActions model={model} path={path} index={index} />
        </>
      )}
    </article>
  );
}

function RuleCard({ model, shared, rule, index }: { model: Model; shared: SharedArrayState; rule: ConfigObject; index: number }) {
  const path = "$.rules";
  const rules = getAt<unknown[]>(model.config, path, []);
  const expanded = shared.isExpanded(path, index, rules.length);
  const base = `$.rules[${index}]`;
  const slaves = getAt<ConfigObject[]>(model.config, "$.slaveConfig.slaves", []).map((slave) => String(slave.id || "")).filter(Boolean);
  const scripts = getAt<ConfigObject[]>(model.config, "$.scriptConfig.scripts", []).map((script) => String(script.name || "")).filter(Boolean);
  return (
    <article className={`item-card ${expanded ? "is-expanded" : ""}`}>
      <CardHeader title={String(rule.name || `rule-${index + 1}`)} subtitle={String(rule.url || "未设置订阅 URL")} badge="rule" expanded={expanded} onToggle={() => shared.toggleExpanded(path, index)} />
      {expanded && (
        <>
          <div className="compact-grid">
            <FieldInput model={model} path={`${base}.name`} label="name" />
            <FieldInput model={model} path={`${base}.url`} label="订阅 URL" />
            <FieldInput model={model} path={`${base}.owner`} label="owner" kind="number" step={1} />
            <TagPicker model={model} path={`${base}.slaveid`} title="选择后端" choices={slaves} />
            <TagPicker model={model} path={`${base}.script`} title="选择脚本" choices={scripts} />
            {runtimeFields(`${base}.runtime`, { optional: true, labelPrefix: "覆盖 " }).map((field) => (
              <FieldInput key={field.path} model={model} {...field} />
            ))}
            <ArrayEditor model={model} shared={shared} path={`${base}.runtime.speedFiles`} title="规则测速文件" itemName="url" />
          </div>
          <CardActions model={model} path={path} index={index} />
        </>
      )}
    </article>
  );
}

function FieldWithDatalist({ model, path, label, options }: { model: Model; path: string; label: string; options: Array<{ value: string; description: string }> }) {
  const value = String(getAt(model.config, path, ""));
  const listId = `${path.replace(/[^a-z0-9]/gi, "-")}-list`;
  return (
    <label className="field">
      <span className="field-title">
        <strong>{label}</strong>
        <button type="button" className="help-tip" title={helpFor(path)} aria-label={`字段说明：${helpFor(path)}`}>
          ?
        </button>
      </span>
      <input list={listId} defaultValue={value} onFocus={() => model.setSelectedPath(path)} onBlur={(event) => model.updatePath(path, event.target.value)} />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.description}
          </option>
        ))}
      </datalist>
      <small>{helpFor(path)}</small>
    </label>
  );
}

function TagPicker({ model, path, title, choices }: { model: Model; path: string; title: string; choices: string[] }) {
  const raw = getAt(model.config, path, []);
  const selected = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : [];
  const setChoice = (choice: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(choice);
    else next.delete(choice);
    model.updatePath(path, [...next]);
  };
  return (
    <div className="tag-editor">
      <span className="field-title">
        <strong>{title}</strong>
        <button className="help-tip" type="button" title={helpFor(path)} aria-label={`字段说明：${helpFor(path)}`}>
          ?
        </button>
      </span>
      <div className="tag-cloud">
        {choices.length ? (
          choices.map((choice) => (
            <label key={choice}>
              <input type="checkbox" checked={selected.includes(choice)} onChange={(event) => setChoice(choice, event.target.checked)} />
              <span>{choice}</span>
            </label>
          ))
        ) : (
          <small>暂无可选项</small>
        )}
      </div>
    </div>
  );
}

function ResourceEditor({ model, path, title }: { model: Model; path: string; title: string }) {
  const resources = getAt<ConfigObject>(model.config, path, {});
  const entries = resources && typeof resources === "object" && !Array.isArray(resources) ? Object.entries(resources) : [];
  const commit = (nextEntries: Array<[string, unknown]>) => {
    const next: ConfigObject = {};
    nextEntries.forEach(([key, value]) => {
      if (key.trim()) next[key.trim()] = String(value ?? "");
    });
    model.updatePath(path, next);
  };
  return (
    <div className="resource-editor">
      <div className="array-heading">
        <span className="field-title">
          <strong>{title}</strong>
          <button className="help-tip" type="button" title={helpFor(path)} aria-label={`字段说明：${helpFor(path)}`}>
            ?
          </button>
        </span>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            const key = entries.length ? `new-lang-${entries.length + 1}` : "zh-CN";
            commit([...entries, [key, key === "zh-CN" ? "./resources/i18n/zh-CN.yml" : `./resources/i18n/${key}.yml`]]);
          }}
        >
          <ListPlus size={16} />
          新增语言资源
        </button>
      </div>
      <div className="resource-list">
        {entries.length ? (
          entries.map(([key, value], index) => (
            <div className="resource-row" key={`${key}-${index}`}>
              <input defaultValue={key} aria-label="语言资源键" onBlur={(event) => commit(entries.map((entry, itemIndex) => (itemIndex === index ? [event.target.value, entry[1]] : entry)))} />
              <input defaultValue={String(value ?? "")} aria-label="语言资源路径" onBlur={(event) => commit(entries.map((entry, itemIndex) => (itemIndex === index ? [entry[0], event.target.value] : entry)))} />
              <IconButton label="删除语言资源" danger onClick={() => commit(entries.filter((_, itemIndex) => itemIndex !== index))}>
                <Trash2 size={16} />
              </IconButton>
            </div>
          ))
        ) : (
          <p className="muted">暂无语言资源。点击新增后填写语言键和 YAML 路径。</p>
        )}
      </div>
    </div>
  );
}

function ColorStopEditor({ model, shared, path, title, unit }: { model: Model; shared: SharedArrayState; path: string; title: string; unit: string }) {
  const stops = getAt<ConfigObject[]>(model.config, path, []);
  const items = Array.isArray(stops) ? stops : [];
  return (
    <div className="color-stop-editor">
      <div className="array-heading">
        <span className="field-title">
          <strong>{title}</strong>
          <button className="help-tip" type="button" title={helpFor(path)} aria-label={`字段说明：${helpFor(path)}`}>
            ?
          </button>
        </span>
        <span className="array-heading-actions">
          <ArrayModeButtons path={path} length={items.length} shared={shared} />
          <button className="button secondary" type="button" onClick={() => model.updatePath(path, colorGradientStops(path, 10))}>
            <RefreshCcw size={16} />
            随机生成
          </button>
          <button className="button secondary" type="button" onClick={() => model.updateArray(path, (array) => array.push(defaultItem("colorStop")))}>
            <ListPlus size={16} />
            新增断点
          </button>
        </span>
      </div>
      <div className="color-stop-list">
        {items.length ? (
          items.map((stop, index) => {
            const expanded = shared.isExpanded(path, index, items.length);
            const color = typeof stop.value === "string" && hexPattern.test(stop.value) ? stop.value : "#ffffff";
            return (
              <article className={`color-stop ${expanded ? "is-expanded" : ""}`} key={`${path}-${index}`}>
                <div className="array-summary">
                  <span>
                    <strong>
                      {String(stop.label ?? index)} {unit}
                    </strong>
                    <small>{String(stop.name || stop.value || "未命名断点")}</small>
                  </span>
                  <span className="color-stop-actions">
                    <i style={{ background: color }} />
                    <button className="ghost-chip" type="button" onClick={() => shared.toggleExpanded(path, index)} aria-expanded={expanded}>
                      {expanded ? "收起" : "展开"}
                    </button>
                  </span>
                </div>
                {expanded && (
                  <>
                    <div className="color-stop-grid">
                      <FieldInput model={model} path={`${path}[${index}].label`} label="label" kind="number" step="any" />
                      <FieldInput model={model} path={`${path}[${index}].name`} label="name" />
                      <FieldInput model={model} path={`${path}[${index}].value`} label="value" kind="color" />
                      <FieldInput model={model} path={`${path}[${index}].alpha`} label="alpha" kind="number" min={0} max={255} step={1} />
                      <FieldInput model={model} path={`${path}[${index}].end_color`} label="end_color" kind="color" />
                    </div>
                    <CardActions model={model} path={path} index={index} />
                  </>
                )}
              </article>
            );
          })
        ) : (
          <p className="muted">暂无{title}。点击新增断点后配置阈值和颜色。</p>
        )}
      </div>
    </div>
  );
}

function AdvancedEditor({ model }: { model: Model }) {
  const [jsonText, setJsonText] = useState("");

  useEffect(() => {
    if (model.config) setJsonText(JSON.stringify(model.config, null, 2));
  }, [model.config]);

  return (
    <Panel title="完整 JSON / YAML" eyebrow="Advanced Editor" icon={<Braces size={18} />} className="advanced-panel">
      <div className="segmented" role="tablist" aria-label="高级编辑器切换">
        <button type="button" className={model.editorTab === "json" ? "is-active" : ""} onClick={() => model.setEditorTab("json")}>
          JSON 草稿
        </button>
        <button
          type="button"
          className={model.editorTab === "yaml" ? "is-active" : ""}
          onClick={() => {
            model.setEditorTab("yaml");
            if (!model.yamlText) void model.refreshYaml();
          }}
        >
          YAML 导出
        </button>
      </div>
      <div className="editor-toolbar">
        <button className="button secondary" type="button" onClick={() => setJsonText(model.config ? JSON.stringify(model.config, null, 2) : "")}>
          <RefreshCcw size={16} />
          同步 JSON
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            try {
              model.applyJson(jsonText);
            } catch (error) {
              window.alert(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          <UploadCloud size={16} />
          用 JSON 替换草稿
        </button>
        <button className="button secondary" type="button" onClick={() => void model.refreshYaml()}>
          <RefreshCcw size={16} />
          刷新 YAML
        </button>
        <button className="button secondary" type="button" onClick={() => void model.exportYaml()}>
          <Download size={16} />
          导出 YAML
        </button>
        <button
          className="button danger"
          type="button"
          onClick={() => {
            if (window.confirm("放弃草稿并从文件重载？未保存草稿会丢失。")) void model.discardAndReload();
          }}
        >
          <RotateCcw size={16} />
          放弃并从文件重载
        </button>
      </div>
      <p className="readonly-editor-note">`webapi` 为只读根配置。即使在 JSON 草稿中改动，校验和写入前也会恢复为后端当前值。</p>
      {model.editorTab === "json" ? (
        <textarea className="code-editor" spellCheck={false} value={jsonText} onChange={(event) => setJsonText(event.target.value)} aria-label="完整 JSON 草稿" />
      ) : (
        <textarea className="code-editor" spellCheck={false} readOnly value={model.yamlText} aria-label="YAML 导出预览" />
      )}
    </Panel>
  );
}

function Inspector({ model }: { model: Model }) {
  const value = getAt(model.config, model.selectedPath);
  const risk = model.config ? riskFor(model.selectedPath, value, model.config) : "";
  const parent = pathOf(tokenize(model.selectedPath).slice(0, -1));
  return (
    <aside className="inspector motion-item" aria-labelledby="inspector-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Inspector</p>
          <h3 id="inspector-title">字段审查</h3>
        </div>
        <span className="type-badge">{typeOf(value)}</span>
      </div>
      <div className="path-card">
        <span>YAMLPath</span>
        <code>{model.selectedPath}</code>
        <button className="button secondary full" type="button" onClick={() => void navigator.clipboard.writeText(model.selectedPath)}>
          <ClipboardCopy size={16} />
          复制 YAMLPath
        </button>
      </div>
      <dl className="inspect-list">
        <div>
          <dt>当前值摘要</dt>
          <dd>{summarize(value, model.selectedPath, model.showSecrets)}</dd>
        </div>
        <div>
          <dt>风险提示</dt>
          <dd>{risk || "无"}</dd>
        </div>
        <div>
          <dt>字段说明</dt>
          <dd>{helpFor(model.selectedPath)}</dd>
        </div>
      </dl>
      <label className="field-label" htmlFor="inspector-json">
        JSON 预览
      </label>
      <textarea id="inspector-json" className="code-editor small" readOnly value={JSON.stringify(value, null, 2) ?? ""} />
      <div className="inspector-actions">
        <button className="button secondary" type="button" disabled={model.selectedPath === "$"} onClick={() => model.restorePath(model.selectedPath)}>
          <Undo2 size={16} />
          恢复字段
        </button>
        <button
          className="button danger"
          type="button"
          disabled={model.selectedPath === "$"}
          onClick={() => {
            if (window.confirm(`确认删除 ${model.selectedPath} 吗？保存前仍会停留在草稿。`)) {
              model.deletePath(model.selectedPath);
              model.setSelectedPath(parent);
            }
          }}
        >
          <Trash2 size={16} />
          删除字段
        </button>
      </div>
      <button className="button ghost full" type="button" onClick={() => model.setShowSecrets(!model.showSecrets)}>
        {model.showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
        {model.showSecrets ? "隐藏敏感值" : "显示敏感值"}
      </button>
    </aside>
  );
}

function Panel({ title, eyebrow, icon, children, className = "" }: { title: string; eyebrow: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel view-panel ${className}`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="panel-icon">{icon}</span>
      </div>
      {children}
    </section>
  );
}

function ToolbarLine({ count, path, shared, onAdd }: { count: string; path: string; shared: SharedArrayState; onAdd: () => void }) {
  return (
    <div className="toolbar-line">
      <button className="button secondary" type="button" onClick={onAdd}>
        <ListPlus size={16} />
        新增
      </button>
      <span>{count}</span>
      <ArrayModeButtons path={path} length={1} shared={shared} />
    </div>
  );
}

function ArrayModeButtons({ path, length, shared }: { path: string; length: number; shared: SharedArrayState }) {
  if (!length) return null;
  return (
    <span className="array-mode-buttons">
      <button type="button" onClick={() => shared.setArrayMode(path, "all")}>
        全部展开
      </button>
      <button type="button" onClick={() => shared.setArrayMode(path, null)}>
        全部收起
      </button>
    </span>
  );
}

function CardHeader({ title, subtitle, badge, expanded, onToggle }: { title: string; subtitle: string; badge: string; expanded: boolean; onToggle: () => void }) {
  return (
    <header>
      <div className="card-summary">
        <span>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
        <button className="ghost-chip" type="button" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? (
            <>
              收起 <ChevronUp size={14} />
            </>
          ) : (
            <>
              展开 <ChevronDown size={14} />
            </>
          )}
        </button>
      </div>
      <span className="type-badge">{badge}</span>
    </header>
  );
}

function CardActions({ model, path, index }: { model: Model; path: string; index: number }) {
  return (
    <footer className="card-actions">
      <button className="button secondary" type="button" onClick={() => moveArrayItem(model, path, index, -1)}>
        <ChevronUp size={16} />
        上移
      </button>
      <button className="button secondary" type="button" onClick={() => model.updateArray(path, (array) => array.splice(index + 1, 0, clone(array[index])))}>
        <ClipboardCopy size={16} />
        复制
      </button>
      <button
        className="button danger"
        type="button"
        onClick={() => {
          if (window.confirm(`确认删除 ${path}[${index}] 吗？`)) model.updateArray(path, (array) => array.splice(index, 1));
        }}
      >
        <Trash2 size={16} />
        删除
      </button>
    </footer>
  );
}

function IconButton({ label, danger, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={`icon-button ${danger ? "danger" : ""}`} type="button" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function ToastRegion({ toasts, dismiss }: { toasts: ToastMessage[]; dismiss: (id: number) => void }) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article className={`toast ${toast.tone}`} key={toast.id}>
          <div>
            <strong>{toast.title}</strong>
            {toast.message && <span>{toast.message}</span>}
          </div>
          <button className="icon-button" type="button" onClick={() => dismiss(toast.id)} aria-label="关闭通知">
            <X size={15} />
          </button>
        </article>
      ))}
    </div>
  );
}

function EmptyList({ text }: { text: string }) {
  return <p className="muted empty-inline">{text}</p>;
}

function moveArrayItem(model: Model, path: string, index: number, direction: -1 | 1) {
  model.updateArray(path, (array) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= array.length) return;
    [array[index], array[nextIndex]] = [array[nextIndex], array[index]];
  });
}

function arrayItemSummary(item: unknown, index: number, fallback: string) {
  if (item && typeof item === "object") {
    const data = item as Record<string, unknown>;
    const label = data.name || data.id || data.title || data.comment || data.url || `${fallback} ${index + 1}`;
    const detail = data.url || data.address || data.content || data.rule || data.type || summarize(item);
    return { label: String(label), detail: String(detail) };
  }
  return { label: `${fallback} ${index + 1}`, detail: String(item ?? "") };
}

function viewIdForPath(path: string): SectionId {
  const root = String(tokenize(path)[0] ?? "");
  return sections.find((section) => section.roots.includes(root))?.id ?? "dashboard";
}

function formatTime(value: Date | null) {
  return value ? value.toLocaleTimeString("zh-CN", { hour12: false }) : "--";
}

export default App;
