import { Fragment } from "react";
import { Icon } from "./icons";
import { Button } from "./ui";
import { groupLabels, sections } from "../data/metadata";
import type { KoipyModel } from "../hooks/useKoipyConfig";
import type { SectionId } from "../types/config";

const groups = ["overview", "connect", "pipeline", "studio"] as const;

export function Rail({ model, theme, onToggleTheme, onOpenPalette }: { model: KoipyModel; theme: string; onToggleTheme: () => void; onOpenPalette: () => void }) {
  return (
    <nav className="rail" aria-label="主导航">
      <div className="rail__brand">
        <span className="mark" aria-hidden="true">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path d="M5 18V6l7 6-7 6Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
            <path d="M14 6c3.5 1.4 5 3.4 5 6s-1.5 4.6-5 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </span>
        <span className="word">
          <b>Koiboard Nova</b>
          <span>koipy console</span>
        </span>
      </div>

      <div className="rail__scroll">
        {groups.map((group) => (
          <div className="rail__group" key={group}>
            <span className="rail__label">{groupLabels[group]}</span>
            {sections
              .filter((section) => section.group === group)
              .map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className="rail__item"
                  aria-current={model.activeView === section.id ? "page" : undefined}
                  aria-label={section.title}
                  title={section.title}
                  onClick={() => model.setActiveView(section.id)}
                >
                  <Icon name={section.icon} />
                  <span>{section.title}</span>
                  <em className="rail__index">{section.index}</em>
                </button>
              ))}
          </div>
        ))}
      </div>

      <div className="rail__foot">
        <button type="button" className="rail__item" onClick={onOpenPalette} title="命令面板">
          <Icon name="Command" />
          <span>命令面板</span>
        </button>
        <button type="button" className="rail__item" onClick={onToggleTheme} title="切换主题">
          <Icon name={theme === "dark" ? "Sun" : "Moon"} />
          <span>{theme === "dark" ? "浅色模式" : "深色模式"}</span>
        </button>
      </div>
    </nav>
  );
}

export function Topbar({
  model,
  onOpenPalette,
  onOpenConnect,
  onOpenNav,
}: {
  model: KoipyModel;
  onOpenPalette: () => void;
  onOpenConnect: () => void;
  onOpenNav: () => void;
}) {
  const section = sections.find((item) => item.id === model.activeView) ?? sections[0];
  const healthLabel = model.health === "online" ? (model.latencySamples.at(-1) ?? 0) + "ms" : model.health === "error" ? "离线" : "连接中";
  return (
    <header className="topbar">
      <button type="button" className="btn btn--ghost btn--icon topbar__menu" aria-label="打开导航" onClick={onOpenNav}>
        <Icon name="Menu" />
      </button>
      <div className="topbar__crumb">
        <small>koipy / {section.index}</small>
        <strong>{section.title}</strong>
      </div>
      <div className="topbar__spacer" />
      <button type="button" className="search-trigger" onClick={onOpenPalette} aria-label="搜索配置字段">
        <Icon name="Search" size={15} />
        <span>搜索字段或执行操作</span>
        <span className="keys">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </button>
      <div className="topbar__actions">
        <span className="conn" data-state={model.health}>
          <span className="conn__dot" />
          <span className="conn__label">{model.demo ? "演示模式" : "Koipy"}</span>
          <b>{model.demo ? "DEMO" : healthLabel}</b>
        </span>
        <Button variant="ghost" iconOnly icon="Settings2" aria-label="连接设置" title="连接设置" onClick={onOpenConnect} />
        <Button variant="ghost" iconOnly icon={model.showSecrets ? "EyeOff" : "Eye"} aria-label={model.showSecrets ? "隐藏敏感值" : "显示敏感值"} title={model.showSecrets ? "隐藏敏感值" : "显示敏感值"} onClick={() => model.setShowSecrets(!model.showSecrets)} />
        <Button variant="primary" icon="Save" onClick={() => void model.saveWithMode("save")} disabled={!model.config || model.busy !== "idle"}>
          保存
        </Button>
      </div>
    </header>
  );
}

export function DraftDock({
  model,
  onOpenChanges,
}: {
  model: KoipyModel;
  onOpenChanges: () => void;
}) {
  const count = model.changes.length;
  const busyLabel: Record<string, string> = {
    loading: "正在读取运行态配置",
    validating: "正在校验草稿",
    saving: "正在写入 config.yaml",
    applying: "正在应用并重载",
    exporting: "正在导出 YAML",
  };
  const busy = model.busy !== "idle";
  if (!count && !busy) return null;

  const latest = model.changes.at(-1);
  return (
    <div className="dock" role="region" aria-label="草稿操作">
      <div className="dock__status">
        <span className="dock__badge">{busy && !count ? <Icon name="Loader" size={14} /> : count}</span>
        <div className="dock__text">
          <b>{busy ? busyLabel[model.busy] ?? "处理中" : count + " 处未保存改动"}</b>
          <span>
            {busy
              ? "请稍候，完成后会提示结果"
              : latest
                ? latest.path
                : "校验通过后即可写入文件"}
          </span>
        </div>
        {count ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenChanges}>
            查看
          </button>
        ) : null}
      </div>
      <div className="dock__spacer" />
      <div className="dock__actions">
        <Button variant="ghost" icon="Undo2" iconOnly size="sm" aria-label="撤销" title="撤销 ⌘Z" disabled={!model.canUndo} onClick={model.undo} />
        <Button variant="ghost" icon="Redo2" iconOnly size="sm" aria-label="重做" title="重做 ⇧⌘Z" disabled={!model.canRedo} onClick={model.redo} />
        <Button variant="ghost" icon="RotateCcw" size="sm" onClick={model.revertAll} disabled={!count}>
          还原
        </Button>
        <Button variant="ghost" icon="ShieldCheck" size="sm" onClick={() => void model.validateDraft()} disabled={!model.config || busy}>
          校验
        </Button>
        <Button variant="primary" icon="Save" size="sm" onClick={() => void model.saveWithMode("save")} disabled={busy}>
          保存
        </Button>
        <Button icon="Zap" size="sm" aria-label="保存并重载" title="保存并重载 ⇧⌘S" onClick={() => void model.saveWithMode("save_reload")} disabled={busy}>
          重载
        </Button>
      </div>
    </div>
  );
}

const mobileTabs: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: "dashboard", label: "概览", icon: "Gauge" },
  { id: "rules", label: "规则", icon: "ListChecks" },
  { id: "slaves", label: "后端", icon: "ServerCog" },
  { id: "bot", label: "Bot", icon: "Bot" },
];

export function MobileBar({ model, onOpenNav }: { model: KoipyModel; onOpenNav: () => void }) {
  const inTab = mobileTabs.some((tab) => tab.id === model.activeView);
  return (
    <nav className="mobile-bar" aria-label="移动端导航">
      {mobileTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="mobile-bar__item"
          aria-current={model.activeView === tab.id ? "page" : undefined}
          onClick={() => model.setActiveView(tab.id)}
        >
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
        </button>
      ))}
      <button type="button" className="mobile-bar__item" aria-current={inTab ? undefined : "page"} onClick={onOpenNav}>
        <Icon name="Menu" />
        <span>更多</span>
      </button>
    </nav>
  );
}

export function NavSheet({
  model,
  onClose,
  onToggleTheme,
  onOpenConnect,
  theme,
}: {
  model: KoipyModel;
  onClose: () => void;
  onToggleTheme: () => void;
  onOpenConnect: () => void;
  theme: string;
}) {
  return (
    <div className="nav-sheet" role="dialog" aria-modal="true" aria-label="导航">
      <div className="inline-actions" style={{ justifyContent: "space-between" }}>
        <span className="eyebrow">切换视图</span>
        <Button variant="ghost" icon="X" iconOnly aria-label="关闭导航" onClick={onClose} />
      </div>
      {groups.map((group) => (
        <Fragment key={group}>
          <div className="rail__label" style={{ opacity: 1, padding: "18px 4px 6px" }}>
            {groupLabels[group]}
          </div>
          <div className="nav-sheet__grid">
            {sections
              .filter((section) => section.group === group)
              .map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className="nav-sheet__item"
                  aria-current={model.activeView === section.id ? "page" : undefined}
                  onClick={() => {
                    model.setActiveView(section.id);
                    onClose();
                  }}
                >
                  <Icon name={section.icon} />
                  <b>{section.title}</b>
                </button>
              ))}
          </div>
        </Fragment>
      ))}
      <div className="inline-actions" style={{ marginTop: 20, gap: 8 }}>
        <Button size="sm" icon={theme === "dark" ? "Sun" : "Moon"} onClick={onToggleTheme}>
          {theme === "dark" ? "浅色模式" : "深色模式"}
        </Button>
        <Button size="sm" icon="Settings2" onClick={onOpenConnect}>连接设置</Button>
        <Button size="sm" variant="ghost" icon="X" onClick={onClose}>关闭</Button>
      </div>
    </div>
  );
}
