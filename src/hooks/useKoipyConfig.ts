import { useCallback, useMemo, useState } from "react";
import { api, downloadText, exportConfigYaml, normalizeApiBase } from "../lib/api";
import { buildPaths, clone, deleteAt, getAt, setAt } from "../lib/configPath";
import { storageKeys } from "../data/metadata";
import type { ConfigObject, EditorTab, HealthState, PathNode, SectionId, ValidationState } from "../types/config";

type Notify = (title: string, message?: string, tone?: "success" | "warning" | "error" | "info") => void;

interface ConfigResponse {
  config: ConfigObject;
}

interface UseKoipyConfigOptions {
  notify: Notify;
}

function initialApiBase() {
  const fromQuery = new URLSearchParams(window.location.search).get("apiBase");
  const stored = window.localStorage.getItem(storageKeys.apiBase) || "";
  try {
    return normalizeApiBase(fromQuery !== null ? fromQuery : stored);
  } catch {
    return "";
  }
}

export function useKoipyConfig({ notify }: UseKoipyConfigOptions) {
  const rememberInitial = window.localStorage.getItem(storageKeys.rememberPassword) === "1";
  const [apiBase, setApiBaseState] = useState(initialApiBase);
  const [password, setPasswordState] = useState(rememberInitial ? window.localStorage.getItem(storageKeys.password) || "" : "");
  const [rememberPassword, setRememberPasswordState] = useState(rememberInitial);
  const [config, setConfig] = useState<ConfigObject | null>(null);
  const [original, setOriginal] = useState<ConfigObject | null>(null);
  const [selectedPath, setSelectedPath] = useState("$");
  const [activeView, setActiveView] = useState<SectionId>("dashboard");
  const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(() => new Set());
  const [validation, setValidation] = useState<ValidationState>("idle");
  const [health, setHealth] = useState<HealthState>("pending");
  const [healthLatencyMs, setHealthLatencyMs] = useState<number | null>(null);
  const [healthLatencyPrimed, setHealthLatencyPrimed] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>("json");
  const [yamlText, setYamlText] = useState("");

  const settings = useMemo(() => ({ apiBase, password }), [apiBase, password]);
  const paths = useMemo<PathNode[]>(() => (config ? buildPaths(config) : []), [config]);

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

  const markDirty = useCallback((path: string) => {
    setDirtyPaths((current) => {
      const next = new Set(current);
      next.add(path);
      return next;
    });
    setValidation("idle");
  }, []);

  const updatePath = useCallback(
    (path: string, value: unknown) => {
      setConfig((current) => {
        if (!current) return current;
        const next = clone(current);
        if (path === "$") return value as ConfigObject;
        setAt(next, path, value);
        return next;
      });
      setSelectedPath(path);
      markDirty(path);
    },
    [markDirty],
  );

  const updateArray = useCallback(
    (path: string, mutate: (items: unknown[]) => void) => {
      setConfig((current) => {
        if (!current) return current;
        const next = clone(current);
        const items = clone(getAt<unknown[]>(next, path, []));
        mutate(items);
        setAt(next, path, items);
        return next;
      });
      setSelectedPath(path);
      markDirty(path);
    },
    [markDirty],
  );

  const deletePath = useCallback(
    (path: string) => {
      setConfig((current) => {
        if (!current || path === "$") return current;
        const next = clone(current);
        deleteAt(next, path);
        return next;
      });
      setSelectedPath("$");
      markDirty(path);
    },
    [markDirty],
  );

  const restorePath = useCallback(
    (path: string) => {
      if (!original || !config || path === "$") return;
      updatePath(path, clone(getAt(original, path)));
    },
    [config, original, updatePath],
  );

  const loadConfig = useCallback(
    async (options: { discardColdSample?: boolean } = {}) => {
      try {
        setHealth("pending");
        setHealthLatencyMs(null);

        const measureHealthLatency = async () => {
          const start = performance.now();
          await api(settings, "/api/health");
          return Math.max(0, Math.round(performance.now() - start));
        };

        let latencyMs = await measureHealthLatency();
        if (options.discardColdSample && !healthLatencyPrimed) {
          setHealthLatencyPrimed(true);
          latencyMs = await measureHealthLatency();
        } else {
          setHealthLatencyPrimed(true);
        }

        const data = await api<ConfigResponse>(settings, "/api/config");
        setConfig(data.config);
        setOriginal(clone(data.config));
        setDirtyPaths(new Set());
        setValidation("idle");
        setHealth("online");
        setHealthLatencyMs(latencyMs);
        setLastSyncAt(new Date());
        setSelectedPath("$");
        setYamlText("");
        notify("配置已加载", "已从 Koipy 运行态读取完整配置。");
      } catch (error) {
        setHealth("error");
        setHealthLatencyMs(null);
        notify("连接失败", error instanceof Error ? error.message : String(error), "error");
      }
    },
    [healthLatencyPrimed, notify, settings],
  );

  const validateDraft = useCallback(async () => {
    if (!config) return false;
    try {
      await api(settings, "/api/config/validate", { method: "POST", body: { config } });
      setValidation("pass");
      notify("校验通过", "当前草稿可被 Koipy 配置模型接受。");
      return true;
    } catch (error) {
      setValidation("fail");
      notify("校验失败", error instanceof Error ? error.message : String(error), "error");
      return false;
    }
  }, [config, notify, settings]);

  const putDraft = useCallback(
    async (quiet = false) => {
      if (!config) return false;
      const data = await api<ConfigResponse>(settings, "/api/config", { method: "PUT", body: { config } });
      setConfig(data.config);
      setOriginal(clone(data.config));
      setDirtyPaths(new Set());
      setValidation("pass");
      setLastSyncAt(new Date());
      if (!quiet) notify("已写入内存", "配置已更新到运行态，尚未必然保存到 config.yaml。");
      return true;
    },
    [config, notify, settings],
  );

  const applyMode = useCallback(
    async (mode: "save" | "save_reload" | "discard_reload") => {
      await api(settings, "/api/config/apply", { method: "POST", body: { mode } });
    },
    [settings],
  );

  const saveWithMode = useCallback(
    async (mode: "save" | "save_reload") => {
      try {
        if (validation !== "pass") {
          const ok = await validateDraft();
          if (!ok) return;
        }
        if (dirtyPaths.size) await putDraft(true);
        await applyMode(mode);
        notify(mode === "save" ? "保存成功" : "保存并重载成功", mode === "save" ? "config.yaml 已写入。" : "config.yaml 已写入并重新加载。");
      } catch (error) {
        notify("保存失败", error instanceof Error ? error.message : String(error), "error");
      }
    },
    [applyMode, dirtyPaths.size, notify, putDraft, validateDraft, validation],
  );

  const discardAndReload = useCallback(async () => {
    try {
      await applyMode("discard_reload");
      await loadConfig();
      notify("已从文件重载", "本地草稿已丢弃。");
    } catch (error) {
      notify("重载失败", error instanceof Error ? error.message : String(error), "error");
    }
  }, [applyMode, loadConfig, notify]);

  const refreshYaml = useCallback(async () => {
    try {
      const text = await exportConfigYaml(settings);
      setYamlText(text);
      notify("YAML 已刷新", "预览来自后端当前运行态。");
      return text;
    } catch (error) {
      notify("YAML 刷新失败", error instanceof Error ? error.message : String(error), "error");
      return "";
    }
  }, [notify, settings]);

  const exportYaml = useCallback(async () => {
    try {
      const text = await exportConfigYaml(settings);
      setYamlText(text);
      downloadText("config.yaml", text, "application/x-yaml");
      notify("导出 YAML", "已生成 config.yaml。");
    } catch (error) {
      notify("导出失败", error instanceof Error ? error.message : String(error), "error");
    }
  }, [notify, settings]);

  const applyJson = useCallback(
    (text: string) => {
      const parsed = JSON.parse(text) as ConfigObject;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("根配置必须是对象");
      setConfig(parsed);
      setSelectedPath("$");
      markDirty("$");
      notify("JSON 已应用", "完整草稿已被替换，保存前请校验。", "warning");
    },
    [markDirty, notify],
  );

  return {
    apiBase,
    password,
    rememberPassword,
    config,
    original,
    selectedPath,
    activeView,
    dirtyPaths,
    validation,
    health,
    healthLatencyMs,
    lastSyncAt,
    showSecrets,
    editorTab,
    yamlText,
    paths,
    settings,
    setApiBase,
    setPassword,
    setRememberPassword,
    setSelectedPath,
    setActiveView,
    setShowSecrets,
    setEditorTab,
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
  };
}
