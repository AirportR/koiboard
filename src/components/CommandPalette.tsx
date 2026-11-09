import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { sections } from "../data/metadata";
import { summarize } from "../lib/configPath";
import type { KoipyModel } from "../hooks/useKoipyConfig";

interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  meta?: string;
  run: () => void;
  group: string;
}

export function CommandPalette({
  open,
  mode,
  model,
  onClose,
  onInspect,
  onOpenConnect,
  onToggleTheme,
}: {
  open: boolean;
  mode: "all" | "changes";
  model: KoipyModel;
  onClose: () => void;
  onInspect: (path: string) => void;
  onOpenConnect: () => void;
  onToggleTheme: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  const items = useMemo<PaletteAction[]>(() => {
    if (!open) return [];
    const actions: PaletteAction[] = [];

    if (mode === "changes") {
      model.changes.forEach((change, index) => {
        actions.push({
          id: "change-" + index,
          label: change.path.replace(/^\$\./, ""),
          hint: summarize(change.after, change.path, model.showSecrets) || "（已删除）",
          icon: "Diff",
          meta: "改动",
          group: "未保存改动",
          run: () => {
            onInspect(change.path);
            onClose();
          },
        });
      });
      return actions;
    }

    model.changes.forEach((change, index) => {
      actions.push({
        id: "change-" + index,
        label: change.path.replace(/^\$\./, ""),
        hint: summarize(change.after, change.path, model.showSecrets) || "（已删除）",
        icon: "Diff",
        meta: "改动",
        group: "未保存改动",
        run: () => {
          onInspect(change.path);
          onClose();
        },
      });
    });

    sections.forEach((section) => {
      actions.push({
        id: "view-" + section.id,
        label: section.title,
        hint: section.hint,
        icon: section.icon,
        meta: section.index,
        group: "跳转视图",
        run: () => {
          model.setActiveView(section.id);
          onClose();
        },
      });
    });

    model.paths.slice(1).forEach((node) => {
      actions.push({
        id: "path-" + node.path,
        label: node.path.replace(/^\$\./, ""),
        hint: summarize(node.value, node.path, model.showSecrets) || node.description,
        icon: "CircleDot",
        meta: node.type,
        group: "配置字段",
        run: () => {
          onInspect(node.path);
          onClose();
        },
      });
    });

    const ops: PaletteAction[] = [
      { id: "op-save", label: "保存到 config.yaml", hint: "校验 → 写入内存 → 写入文件", icon: "Save", meta: "⌘S", group: "操作", run: () => { onClose(); void model.saveWithMode("save"); } },
      { id: "op-reload", label: "保存并重载", hint: "写入文件并让 Koipy 重新加载", icon: "Zap", meta: "⇧⌘S", group: "操作", run: () => { onClose(); void model.saveWithMode("save_reload"); } },
      { id: "op-validate", label: "校验当前草稿", hint: "只校验，不写入", icon: "ShieldCheck", meta: "⌘↵", group: "操作", run: () => { onClose(); void model.validateDraft(); } },
      { id: "op-sync", label: "重新同步运行态", hint: "丢弃本地草稿并重新读取", icon: "Radio", group: "操作", run: () => { onClose(); void model.loadConfig(); } },
      { id: "op-discard", label: "从文件重载（丢弃草稿）", hint: "discard_reload", icon: "RotateCcw", group: "操作", run: () => { onClose(); void model.discardAndReload(); } },
      { id: "op-export", label: "导出 config.yaml", hint: "从后端导出当前运行态", icon: "Download", group: "操作", run: () => { onClose(); void model.exportYaml(); } },
      { id: "op-undo", label: "撤销", hint: "回退一步编辑", icon: "Undo2", meta: "⌘Z", group: "操作", run: () => { onClose(); model.undo(); } },
      { id: "op-redo", label: "重做", hint: "恢复撤销的编辑", icon: "Redo2", meta: "⇧⌘Z", group: "操作", run: () => { onClose(); model.redo(); } },
      { id: "op-secrets", label: model.showSecrets ? "隐藏敏感值" : "显示敏感值", hint: "字段级脱敏开关", icon: model.showSecrets ? "EyeOff" : "Eye", group: "操作", run: () => { onClose(); model.setShowSecrets(!model.showSecrets); } },
      { id: "op-theme", label: "切换主题", hint: "深色 / 浅色", icon: "Moon", group: "操作", run: () => { onToggleTheme(); onClose(); } },
      { id: "op-connect", label: "连接设置", hint: "API 地址与访问密码", icon: "Settings2", group: "操作", run: () => { onClose(); onOpenConnect(); } },
    ];
    return [...actions, ...ops];
  }, [model, mode, onClose, onInspect, onOpenConnect, onToggleTheme, open]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return items.slice(0, 60);
    const scored = items
      .map((item) => {
        const haystack = (item.label + " " + (item.hint ?? "") + " " + item.group).toLowerCase();
        const direct = haystack.includes(text);
        const score = item.label.toLowerCase().startsWith(text) ? 0 : direct ? 1 : 2;
        return { item, score, direct };
      })
      .filter((entry) => entry.direct)
      .sort((a, b) => a.score - b.score);
    return scored.slice(0, 60).map((entry) => entry.item);
  }, [items, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="命令面板">
        <div className="palette__input">
          <Icon name="Search" size={18} />
          <input
            ref={inputRef}
            value={query}
            placeholder={mode === "changes" ? "搜索未保存的改动…" : "搜索字段路径、视图或操作…"}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((current) => Math.min(current + 1, filtered.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((current) => Math.max(current - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                filtered[active]?.run();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
            aria-label="命令面板搜索"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette__list" ref={listRef} role="listbox" aria-label="搜索结果">
          {filtered.length ? (
            filtered.map((item, index) => {
              const header = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {header ? <div className="palette__group">{header}</div> : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    data-active={index === active}
                    className="palette__item"
                    onMouseEnter={() => setActive(index)}
                    onClick={item.run}
                  >
                    <span className="ico">
                      <Icon name={item.icon} size={15} />
                    </span>
                    <span className="body">
                      <b>{item.label}</b>
                      {item.hint ? <span>{item.hint}</span> : null}
                    </span>
                    {item.meta ? <span className="meta">{item.meta}</span> : null}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="palette__empty">没有匹配的结果，试试字段名或「保存」。</div>
          )}
        </div>
        <div className="palette__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>↵</kbd> 执行</span>
          <span><kbd>Esc</kbd> 关闭</span>
          <span style={{ marginLeft: "auto" }}>{filtered.length} 条结果</span>
        </div>
      </div>
    </div>
  );
}
