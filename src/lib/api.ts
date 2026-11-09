import type { ApiSettings, ConfigObject } from "../types/config";
import { demoConfig } from "./mock";
import { clone } from "./configPath";
import { toYaml } from "./yaml";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
}

const demoKey = "koiboard.nova.demo";
let demoState: ConfigObject | null = null;

export function demoRequested(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      window.localStorage.setItem(demoKey, "1");
      return true;
    }
    if (params.get("demo") === "0") {
      window.localStorage.removeItem(demoKey);
      return false;
    }
    return window.localStorage.getItem(demoKey) === "1";
  } catch {
    return false;
  }
}

export function leaveDemo(): void {
  try {
    window.localStorage.removeItem(demoKey);
  } catch {
    /* ignore */
  }
}

function demoStore(): ConfigObject {
  if (!demoState) demoState = demoConfig();
  return demoState;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function demoApi<T>(path: string, options: ApiOptions): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  await wait(120 + Math.random() * 180);
  if (path === "/api/health") return { ok: true, demo: true } as T;
  if (path === "/api/config/export") return toYaml(demoStore()) as T;
  if (path === "/api/config" && method === "GET") return { config: clone(demoStore()) } as T;
  if (path === "/api/config" && method === "PUT") {
    const body = options.body as { config?: ConfigObject } | undefined;
    if (body?.config) demoState = clone(body.config);
    return { config: clone(demoStore()) } as T;
  }
  if (path === "/api/config/validate") return { success: true } as T;
  if (path === "/api/config/apply") return { success: true, mode: (options.body as { mode?: string })?.mode } as T;
  throw new Error("演示模式未实现的接口：" + path);
}

export function normalizeApiBase(rawValue: string): string {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  let candidate = raw;
  if (candidate.startsWith("//")) candidate = window.location.protocol + candidate;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    candidate = candidate.startsWith("/") ? window.location.origin + candidate : "http://" + candidate;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("API 地址格式无效");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("API 地址仅支持 http 或 https");
  const pathname = url.pathname.replace(/\/+$/, "");
  const suffix = pathname && pathname !== "/" ? pathname : "";
  return url.origin + suffix;
}

export function apiUrl(path: string, apiBase: string): string {
  const targetPath = String(path || "");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(targetPath)) return targetPath;
  const normalizedPath = targetPath.startsWith("/") ? targetPath : "/" + targetPath;
  if (!apiBase) {
    if (window.location.protocol === "file:") throw new Error("当前页面通过 file:// 打开，请先填写 API 地址。");
    return normalizedPath;
  }
  return apiBase + normalizedPath;
}

export function headers(settings: ApiSettings, json = false): HeadersInit {
  const result: Record<string, string> = { Accept: "application/json" };
  if (json) result["Content-Type"] = "application/json";
  const password = settings.password.trim();
  if (password) result["X-Access-Password"] = password;
  return result;
}

export async function api<T>(settings: ApiSettings, path: string, options: ApiOptions = {}): Promise<T> {
  if (demoRequested()) return demoApi<T>(path, options);

  const response = await fetch(apiUrl(path, settings.apiBase), {
    method: options.method || "GET",
    headers: { ...headers(settings, options.body !== undefined), ...(options.headers || {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { success: response.ok, error: await response.text() };

  if (!response.ok || payload.success === false) {
    const detail = payload.details ? ": " + payload.details : "";
    throw new Error((payload.error || response.statusText) + detail);
  }

  return (payload.data ?? payload) as T;
}

export async function exportConfigYaml(settings: ApiSettings): Promise<string> {
  if (demoRequested()) return demoApi<string>("/api/config/export", {});
  const response = await fetch(apiUrl("/api/config/export", settings.apiBase), {
    headers: headers(settings, false),
  });
  if (!response.ok) throw new Error((await response.text()) || response.statusText);
  return response.text();
}

export function downloadText(filename: string, text: string, type = "text/plain"): void {
  const blob = new Blob([text], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
