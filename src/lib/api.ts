import type { ApiSettings } from "../types/config";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
}

export function normalizeApiBase(rawValue: string): string {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  let candidate = raw;
  if (candidate.startsWith("//")) candidate = `${window.location.protocol}${candidate}`;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    candidate = candidate.startsWith("/") ? `${window.location.origin}${candidate}` : `http://${candidate}`;
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
  return `${url.origin}${suffix}`;
}

export function apiUrl(path: string, apiBase: string): string {
  const targetPath = String(path || "");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(targetPath)) return targetPath;
  const normalizedPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  if (!apiBase) {
    if (window.location.protocol === "file:") throw new Error("当前页面通过 file:// 打开，请先填写 API 地址。");
    return normalizedPath;
  }
  return `${apiBase}${normalizedPath}`;
}

export function headers(settings: ApiSettings, json = false): HeadersInit {
  const result: Record<string, string> = { Accept: "application/json" };
  if (json) result["Content-Type"] = "application/json";
  const password = settings.password.trim();
  if (password) result["X-Access-Password"] = password;
  return result;
}

export async function api<T>(settings: ApiSettings, path: string, options: ApiOptions = {}): Promise<T> {
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
    const detail = payload.details ? `: ${payload.details}` : "";
    throw new Error(`${payload.error || response.statusText}${detail}`);
  }

  return (payload.data ?? payload) as T;
}

export async function exportConfigYaml(settings: ApiSettings): Promise<string> {
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
