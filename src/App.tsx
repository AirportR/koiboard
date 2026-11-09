import { useEffect, useMemo, useState } from "react";
import { useToasts } from "./hooks/useToasts";
import { useKoipyConfig } from "./hooks/useKoipyConfig";
import { Rail, Topbar, DraftDock, NavSheet, MobileBar } from "./components/Shell";
import { CommandPalette } from "./components/CommandPalette";
import { Inspector } from "./components/Inspector";
import { ConnectPanel } from "./components/Connect";
import { ToastRegion, ViewHeader, Panel, Pill, Notice, Button } from "./components/ui";
import { Icon } from "./components/icons";
import { getAt, hasAt } from "./lib/configPath";
import type { ConfigBinding } from "./components/Field";
import type { SectionId } from "./types/config";
import type { ViewProps } from "./views/types";
import Dashboard from "./views/Dashboard";
import Basic from "./views/Basic";
import WebApi from "./views/WebApi";
import BotView from "./views/Bot";
import NetworkView from "./views/Network";
import Runtime from "./views/Runtime";
import Scripts from "./views/Scripts";
import Slaves from "./views/Slaves";
import Rules from "./views/Rules";
import Appearance from "./views/Appearance";
import Translation from "./views/Translation";
import Advanced from "./views/Advanced";
import { storageKeys } from "./data/metadata";

const viewMap: Record<SectionId, (props: ViewProps) => React.JSX.Element> = {
  dashboard: Dashboard,
  basic: Basic,
  webapi: WebApi,
  bot: BotView,
  network: NetworkView,
  runtime: Runtime,
  scripts: Scripts,
  slaves: Slaves,
  rules: Rules,
  appearance: Appearance,
  translation: Translation,
  advanced: Advanced,
};

export default function App() {
  const { toasts, notify, dismiss } = useToasts();
  const model = useKoipyConfig({ notify });
  const [paletteOpen, setPaletteOpen] = useState(() => new URLSearchParams(window.location.search).get("panel") === "palette");
  const [paletteMode, setPaletteMode] = useState<"all" | "changes">("all");
  const [inspectorPath, setInspectorPath] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(() => new URLSearchParams(window.location.search).get("panel") === "nav");
  const [connectOpen, setConnectOpen] = useState(() => new URLSearchParams(window.location.search).get("panel") === "connect");
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === "light" ? "light" : "dark"));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(storageKeys.theme, theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [model.activeView]);

  useEffect(() => {
    void model.loadConfig({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const binding = useMemo<ConfigBinding>(
    () => ({
      get: (path) => getAt(model.config, path),
      has: (path) => hasAt(model.config, path),
      set: model.updatePath,
      unset: model.deletePath,
      inspect: setInspectorPath,
      dirty: model.isDirty,
      secrets: model.showSecrets,
    }),
    [model.config, model.updatePath, model.deletePath, model.isDirty, model.showSecrets],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const target = event.target as HTMLElement | null;
      const typing = target ? ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) : false;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteMode("all");
        setPaletteOpen((current) => !current);
        return;
      }
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void model.saveWithMode(event.shiftKey ? "save_reload" : "save");
        return;
      }
      if (mod && event.key === "Enter") {
        event.preventDefault();
        void model.validateDraft();
        return;
      }
      if (mod && event.key.toLowerCase() === "z" && !typing) {
        event.preventDefault();
        if (event.shiftKey) model.redo();
        else model.undo();
        return;
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setNavOpen(false);
        setConnectOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [model]);

  const openChanges = () => {
    setPaletteMode("changes");
    setPaletteOpen(true);
  };

  const View = viewMap[model.activeView];
  const viewProps: ViewProps = { model, binding, onInspect: setInspectorPath };

  return (
    <div className="shell">
      <a className="skip-link" href="#workspace">跳到主内容</a>
      <Rail model={model} theme={theme} onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} onOpenPalette={() => { setPaletteMode("all"); setPaletteOpen(true); }} />
      <div className="main">
        <Topbar model={model} onOpenPalette={() => { setPaletteMode("all"); setPaletteOpen(true); }} onOpenConnect={() => setConnectOpen(true)} onOpenNav={() => setNavOpen(true)} />
        <main className="page" id="workspace">
          {model.demo ? (
            <div className="demo-banner">
              <Icon name="Sparkles" />
              <div className="demo-banner__text">
                <b>演示模式</b>
                <span>仅在本机内存模拟，不触碰真实 Koipy。</span>
              </div>
              <Button size="sm" variant="ghost" onClick={model.disableDemo}>退出演示</Button>
            </div>
          ) : null}

          {model.config ? (
            <div className="view" key={model.activeView}>
              <View {...viewProps} />
            </div>
          ) : (
            <div className="view">
              <ViewHeader
                index="00"
                eyebrow="Welcome"
                title="连接你的 Koipy"
                subtitle="这是一个只负责 UI 与草稿的前端；填好 API 地址与访问密码，就能读取、校验并写回 Koipy 的运行态配置。"
                meta={
                  <>
                    <Pill tone={model.health === "online" ? "mint" : model.health === "error" ? "coral" : undefined} icon="Radio">
                      {model.health === "online" ? "在线" : model.health === "error" ? "未连接" : "等待连接"}
                    </Pill>
                    <Pill icon="ShieldCheck">webapi 只读</Pill>
                  </>
                }
              />
              <div className="split">
                <Panel eyebrow="Handshake" title="连接设置" icon="Radio" desc="密码只保存在当前浏览器的 localStorage（勾选记住时）。">
                  <ConnectPanel model={model} />
                </Panel>
                <div className="stack">
                  <Panel eyebrow="Demo" title="先看看效果" icon="Sparkles" desc="不需要后端，直接用一份示例配置体验完整交互。">
                    <div className="stack" style={{ gap: 12 }}>
                      <Button variant="primary" icon="Zap" onClick={model.enableDemo}>进入演示模式</Button>
                      <span className="field__hint">演示模式支持校验、保存、撤销、JSON 编辑与 YAML 预览。</span>
                    </div>
                  </Panel>
                  <Panel eyebrow="Flow" title="工作流" icon="Waypoints" bodyClass="panel__body--tight">
                    <div className="quick-list">
                      <div className="quick"><Icon name="Radio" /><b>读取运行态</b><span>GET /api/config</span></div>
                      <div className="quick"><Icon name="ShieldCheck" /><b>校验草稿</b><span>POST validate</span></div>
                      <div className="quick"><Icon name="Cpu" /><b>写入内存</b><span>PUT /api/config</span></div>
                      <div className="quick"><Icon name="Save" /><b>保存 / 重载</b><span>POST apply</span></div>
                    </div>
                  </Panel>
                  {!model.config && model.health === "error" ? (
                    <Panel eyebrow="Troubleshoot" title="连接失败？" icon="CircleAlert">
                      <div className="stack" style={{ gap: 10 }}>
                        <span className="field__hint">逐项确认：</span>
                        <div className="quick-list">
                          <div className="quick"><Icon name="Radio" /><b>Koipy 已启动</b><span>webapi.enable=true</span></div>
                          <div className="quick"><Icon name="Link2" /><b>地址与密码正确</b><span>webapi.address / password</span></div>
                          <div className="quick"><Icon name="ShieldCheck" /><b>跨域已放行</b><span>allowOrigins</span></div>
                        </div>
                      </div>
                    </Panel>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <MobileBar model={model} onOpenNav={() => setNavOpen(true)} />
      <DraftDock model={model} onOpenChanges={openChanges} />

      <CommandPalette
        open={paletteOpen}
        mode={paletteMode}
        model={model}
        onClose={() => setPaletteOpen(false)}
        onInspect={setInspectorPath}
        onOpenConnect={() => setConnectOpen(true)}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />

      <Inspector path={inspectorPath} model={model} onClose={() => setInspectorPath(null)} />

      {navOpen ? (
        <NavSheet
          model={model}
          theme={theme}
          onClose={() => setNavOpen(false)}
          onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          onOpenConnect={() => { setNavOpen(false); setConnectOpen(true); }}
        />
      ) : null}

      {connectOpen ? (
        <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setConnectOpen(false); }}>
          <div className="palette" style={{ maxWidth: 620, padding: 0 }} role="dialog" aria-modal="true" aria-label="连接设置">
            <div className="panel__head">
              <span className="panel__icon"><Icon name="Radio" /></span>
              <div className="panel__title">
                <h2>连接设置</h2>
                <p>API 地址留空表示同源；密码对应 webapi.password。</p>
              </div>
              <Button variant="ghost" iconOnly icon="X" aria-label="关闭" onClick={() => setConnectOpen(false)} />
            </div>
            <div className="panel__body">
              <ConnectPanel model={model} compact />
              {model.config ? (
                <Notice tone="mint" icon="CircleCheck">
                  当前已读取 {model.paths.length} 个字段，连接正常。
                </Notice>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <ToastRegion toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
