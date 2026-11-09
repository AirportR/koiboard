import { useCallback, useMemo, useRef, useState } from "react";
import { api, demoRequested, downloadText, exportConfigYaml, leaveDemo, normalizeApiBase } from "../lib/api";
import { buildPaths, clone, dangerousChangeMessage, deleteAt, diffPaths, getAt, setAt, type DiffEntry } from "../lib/configPath";
import { isReadOnlyPath, preserveReadOnlyConfig } from "../lib/readOnly";
import { storageKeys, sections } from "../data/metadata";
import type { ApiSettings, BusyState, ConfigObject, HealthState, PathNode, SectionId, ValidationState } from "../types/config";

type Notify = (title: string, message?: string, tone?: "success" | "warning" | "error" | "info") => void;

interface ConfigResponse {
  config: ConfigObject;
}

const historyLimit = 60;

function initialApiBase() {
  const fromQuery = new URLSearchParams(window.location.search).get("apiBase");
  const stored = window.localStorage.getItem(storageKeys.apiBase) || "";
  try {
    return normalizeApiBase(fromQuery !== null ? fromQuery : stored);
  } catch {
    return "";
  }
}

function initialView(): SectionId {
  const fromQuery = new URLSearchParams(window.location.search).get("view");
  const stored = fromQuery ?? window.localStorage.getItem(storageKeys.view);
  return (sections.find((section) => section.id === stored)?.id ?? "dashboard") as SectionId;
}

export type KoipyModel = ReturnType<typeof useKoipyConfig>;

export function useKoipyConfig({ notify }: { notify: Notify }) {
  const rememberInitial = window.localStorage.getItem(storageKeys.rememberPassword) === "1";
  const [apiBase, setApiBaseState] = useState(initialApiBase);
  const [password, setPasswordState] = useState(rememberInitial ? window.localStorage.getItem(storageKeys.password) || "" : "");
  const [rememberPassword, setRememberPasswordState] = useState(rememberInitial);
  const [config, setConfig] = useState<ConfigObject | null>(null);
  const [original, setOriginal] = useState<ConfigObject | null>(null);
  const [history, setHistory] = useState<ConfigObject[]>([]);
  const [future, setFuture] = useState<ConfigObject[]>([]);
  const [selectedPath, setSelectedPath] = useState("$");
  const [activeView, setActiveViewState] = useState<SectionId>(initialView);
  const [validation, setValidation] = useState<ValidationState>("idle");
  const [health, setHealth] = useState<HealthState>("pending");
  const [latencySamples, setLatencySamples] = useState<number[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [busy, setBusy] = useState<BusyState>("idle");
  const [yamlText, setYamlText] = useState("");
  const [demo, setDemo] = useState<boolean>(() => demoRequested());
  const loadSeq = useRef(0);

  const settings = useMemo(() => ({ apiBase, password }), [apiBase, password]);
  const paths = useMemo<PathNode[]>(() => (config ? buildPaths(config) : []), [config]);
  const changes = useMemo<DiffEntry[]>(() => (config && original ? diffPaths(original, config) : []), [config, original]);
  const dirtyPaths = useMemo(() => new Set(changes.map((entry) => entry.path)), [changes]);

  const persistPassword = useCallback((nextPassword: string, remember: boolean) => {
    if (!remember) {
      window.localStorage.removeItem(storageKeys.rememberPassword);
      window.localStorage.removeItem(storageKeys.password);
      return;
    }
    window.localStorage.setItem(storageKeys.rememberPassword, "1");
    if (nextPassword.trim()) window.localStorage.setItem(storageKeys.password, nextPassword.trim());
    else window.localStorage.removeItem(storageKeys.password);
  }, []);

  const setPassword = useCallback(
    (value: string) => {
      setPasswordState(value);
      persistPassword(value, rememberPassword);
    },
    [persistPassword, rememberPassword],
  );

  const setRememberPassword = useCallback(
    (value: boolean) => {
      setRememberPasswordState(value);
      persistPassword(password, value);
    },
    [password, persistPassword],
  );

  const setApiBase = useCallback(
    (raw: string) => {
      const normalized = normalizeApiBase(raw);
      setApiBaseState(normalized);
      if (normalized) window.localStorage.setItem(storageKeys.apiBase, normalized);
      else window.localStorage.removeItem(storageKeys.apiBase);
      notify("API 地址已更新", normalized || "已切换为同源 API。", "info");
      return normalized;
    },
    [notify],
  );

  const setActiveView = useCallback((view: SectionId) => {
    setActiveViewState(view);
    window.localStorage.setItem(storageKeys.view, view);
  }, []);

  const lastEdit = useRef({ path: "", at: 0 });
  const pushHistory = useCallback((snapshot: ConfigObject) => {
    setHistory((current) => [...current.slice(-historyLimit + 1), snapshot]);
    setFuture([]);
  }, []);

  const updatePath = useCallback(
    (path: string, value: unknown) => {
      if (isReadOnlyPath(path)) {
        notify("只读配置", "webapi 只能查看，不能通过前端修改。", "warning");
        return;
      }
      const now = Date.now();
      const coalesce = lastEdit.current.path === path && now - lastEdit.current.at < 900;
      lastEdit.current = { path, at: now };
      setConfig((current) => {
        if (!current) return current;
        if (!coalesce) pushHistory(current);
        const next = clone(current);
        if (path === "$") return value as ConfigObject;
        setAt(next, path, value);
        return next;
      });
      setSelectedPath(path);
      setValidation("idle");
    },
    [notify, pushHistory],
  );

  const updateArray = useCallback(
    (path: string, mutate: (items: unknown[]) => void) => {
      if (isReadOnlyPath(path)) {
        notify("只读配置", "webapi 只能查看，不能通过前端修改。", "warning");
        return;
      }
      setConfig((current) => {
        if (!current) return current;
        pushHistory(current);
        const next = clone(current);
        const items = clone(getAt<unknown[]>(next, path, []));
        mutate(items);
        setAt(next, path, items);
        return next;
      });
      setSelectedPath(path);
      setValidation("idle");
    },
    [notify, pushHistory],
  );

  const deletePath = useCallback(
    (path: string) => {
      if (isReadOnlyPath(path)) {
        notify("只读配置", "webapi 只能查看，不能通过前端删除。", "warning");
        return;
      }
      setConfig((current) => {
        if (!current || path === "$") return current;
        pushHistory(current);
        const next = clone(current);
        deleteAt(next, path);
        return next;
      });
      setSelectedPath("$");
      setValidation("idle");
    },
    [notify, pushHistory],
  );

  const restorePath = useCallback(
    (path: string) => {
      if (!original || !config || path === "$") return;
      const snapshot = clone(getAt(original, path));
      if (snapshot === undefined) deletePath(path);
      else updatePath(path, snapshot);
    },
    [config, deletePath, original, updatePath],
  );

  const undo = useCallback(() => {
    setHistory((current) => {
      if (!current.length) return current;
      const previous = current[current.length - 1];
      setConfig((currentConfig) => {
        if (currentConfig) setFuture((next) => [...next, currentConfig]);
        return previous;
      });
      return current.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((current) => {
      if (!current.length) return current;
      const nextConfig = current[current.length - 1];
      setConfig((currentConfig) => {
        if (currentConfig) setHistory((prev) => [...prev, currentConfig]);
        return nextConfig;
      });
      return current.slice(0, -1);
    });
  }, []);

  const revertAll = useCallback(() => {
    if (!original) return;
    setHistory((current) => (config ? [...current, config] : current));
    setConfig(clone(original));
    setFuture([]);
    setValidation("idle");
    notify("草稿已回滚", "所有未保存的改动已还原为运行态配置。", "info");
  }, [config, notify, original]);

  const loadConfig = useCallback(
    async (options: { silent?: boolean; settings?: ApiSettings } = {}) => {
      const active = options.settings ?? settings;
      const seq = loadSeq.current + 1;
      loadSeq.current = seq;
      setBusy("loading");
      try {
        setHealth("pending");
        const start = performance.now();
        await api(active, "/api/health");
        const latency = Math.max(0, Math.round(performance.now() - start));
        const data = await api<ConfigResponse>(active, "/api/config");
        if (loadSeq.current !== seq) return;
        setConfig(data.config);
        setOriginal(clone(data.config));
        setHistory([]);
        setFuture([]);
        setValidation("idle");
        setHealth("online");
        setLatencySamples((current) => [...current.slice(-23), latency]);
        setLastSyncAt(new Date());
        setYamlText("");
        setDemo(demoRequested());
        if (!options.silent) notify("配置已同步", "已从 Koipy 运行态读取完整配置。");
      } catch (error) {
        if (loadSeq.current !== seq) return;
        setHealth("error");
        notify("连接失败", error instanceof Error ? error.message : String(error), "error");
      } finally {
        if (loadSeq.current === seq) setBusy("idle");
      }
    },
    [notify, settings],
  );

  const validateDraft = useCallback(async () => {
    if (!config) return false;
    setBusy("validating");
    try {
      const writableConfig = preserveReadOnlyConfig(config, original);
      await api(settings, "/api/config/validate", { method: "POST", body: { config: writableConfig } });
      setValidation("pass");
      notify("校验通过", "当前草稿可被 Koipy 配置模型接受。");
      return true;
    } catch (error) {
      setValidation("fail");
      notify("校验失败", error instanceof Error ? error.message : String(error), "error");
      return false;
    } finally {
      setBusy("idle");
    }
  }, [config, notify, original, settings]);

  const putDraft = useCallback(
    async (quiet = false) => {
      if (!config) return false;
      const writableConfig = preserveReadOnlyConfig(config, original);
      const data = await api<ConfigResponse>(settings, "/api/config", { method: "PUT", body: { config: writableConfig } });
      setConfig(data.config);
      setOriginal(clone(data.config));
      setHistory([]);
      setFuture([]);
      setValidation("pass");
      setLastSyncAt(new Date());
      if (!quiet) notify("已写入内存", "配置已更新到运行态，尚未写入 config.yaml。");
      return true;
    },
    [config, notify, original, settings],
  );

  const applyMode = useCallback(
    async (mode: "save" | "save_reload" | "discard_reload") => {
      await api(settings, "/api/config/apply", { method: "POST", body: { mode } });
    },
    [settings],
  );

  const saveWithMode = useCallback(
    async (mode: "save" | "save_reload") => {
      setBusy("saving");
      try {
        if (validation !== "pass") {
          const ok = await validateDraft();
          if (!ok) return;
        }
        setBusy("saving");
        if (changes.length) await putDraft(true);
        setBusy("applying");
        await applyMode(mode);
        setBusy("idle");
        notify(mode === "save" ? "已保存到 config.yaml" : "已保存并重载", mode === "save" ? "文件已写入，运行态保持当前配置。" : "配置已写入文件并重新载入。");
        const sensitive = changes.map((entry) => dangerousChangeMessage(entry.path, entry.after, config)).find(Boolean);
        if (sensitive) notify("敏感变更已生效", sensitive, "warning");
        await loadConfig({ silent: true });
      } catch (error) {
        notify("保存失败", error instanceof Error ? error.message : String(error), "error");
      } finally {
        setBusy("idle");
      }
    },
    [applyMode, changes, config, loadConfig, notify, putDraft, validateDraft, validation],
  );

  const discardAndReload = useCallback(async () => {
    setBusy("applying");
    try {
      await applyMode("discard_reload");
      await loadConfig({ silent: true });
      notify("已从文件重载", "本地草稿已丢弃。");
    } catch (error) {
      notify("重载失败", error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy("idle");
    }
  }, [applyMode, loadConfig, notify]);

  const refreshYaml = useCallback(async () => {
    setBusy("exporting");
    try {
      const text = await exportConfigYaml(settings);
      setYamlText(text);
      return text;
    } catch (error) {
      notify("YAML 刷新失败", error instanceof Error ? error.message : String(error), "error");
      return "";
    } finally {
      setBusy("idle");
    }
  }, [notify, settings]);

  const exportYaml = useCallback(async () => {
    setBusy("exporting");
    try {
      const text = await exportConfigYaml(settings);
      setYamlText(text);
      downloadText("config.yaml", text, "application/x-yaml");
      notify("已导出 config.yaml", "文件已开始下载。");
    } catch (error) {
      notify("导出失败", error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy("idle");
    }
  }, [notify, settings]);

  const applyJson = useCallback(
    (text: string) => {
      try {
        const parsed = JSON.parse(text) as ConfigObject;
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("根配置必须是对象");
        const protectedParsed = preserveReadOnlyConfig(parsed, config || original);
        setConfig((current) => {
          if (current) pushHistory(current);
          return protectedParsed;
        });
        setSelectedPath("$");
        setValidation("idle");
        notify("JSON 已应用", "整份草稿已被替换，保存前请先校验。", "warning");
        return true;
      } catch (error) {
        notify("JSON 解析失败", error instanceof Error ? error.message : String(error), "error");
        return false;
      }
    },
    [config, notify, original, pushHistory],
  );

  const enableDemo = useCallback(() => {
    window.localStorage.setItem("koiboard.nova.demo", "1");
    setDemo(true);
    window.location.reload();
  }, []);

  const disableDemo = useCallback(() => {
    leaveDemo();
    setDemo(false);
    window.location.reload();
  }, []);

  const isDirty = useCallback(
    (path: string) => {
      if (!dirtyPaths.size) return false;
      if (dirtyPaths.has(path)) return true;
      for (const entry of dirtyPaths) {
        if (entry === "$") return true;
        if (path.startsWith(entry + ".") || path.startsWith(entry + "[") || entry.startsWith(path + ".") || entry.startsWith(path + "[")) return true;
      }
      return false;
    },
    [dirtyPaths],
  );

  return {
    apiBase,
    password,
    rememberPassword,
    config,
    original,
    changes,
    dirtyPaths,
    history,
    future,
    selectedPath,
    activeView,
    validation,
    health,
    latencySamples,
    lastSyncAt,
    showSecrets,
    busy,
    yamlText,
    paths,
    settings,
    demo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    setApiBase,
    setPassword,
    setRememberPassword,
    setSelectedPath,
    setActiveView,
    setShowSecrets,
    loadConfig,
    validateDraft,
    putDraft,
    saveWithMode,
    discardAndReload,
    refreshYaml,
    exportYaml,
    updatePath,
    updateArray,
    deletePath,
    restorePath,
    applyJson,
    undo,
    redo,
    revertAll,
    enableDemo,
    disableDemo,
    isDirty,
  };
}
