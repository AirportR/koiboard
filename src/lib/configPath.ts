import { fieldHelp, hexPattern, sensitivePattern } from "../data/metadata";
import type { ConfigObject, ConfigType, ConfigValue, PathNode } from "../types/config";

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function typeOf(value: unknown): ConfigType {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return typeof value === "object" ? "object" : (typeof value as ConfigType);
}

export function tokenize(path: string): Array<string | number> {
  if (!path || path === "$") return [];
  const source = path.startsWith("$.") ? path.slice(2) : path.replace(/^\$/, "");
  const tokens: Array<string | number> = [];
  let part = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === ".") {
      if (part) tokens.push(part);
      part = "";
      continue;
    }
    if (char === "[") {
      if (part) tokens.push(part);
      part = "";
      const end = source.indexOf("]", index);
      tokens.push(Number(source.slice(index + 1, end)));
      index = end;
      continue;
    }
    part += char;
  }
  if (part) tokens.push(part);
  return tokens;
}

export function pathOf(tokens: Array<string | number>): string {
  if (!tokens.length) return "$";
  return tokens.reduce<string>((path, token) => (typeof token === "number" ? path + "[" + token + "]" : path + "." + token), "$");
}

export function getAt<T = unknown>(root: unknown, path: string, fallback?: T): T {
  try {
    const value = tokenize(path).reduce<unknown>((current, token) => {
      if (current === null || current === undefined) return undefined;
      return (current as Record<string | number, unknown>)[token];
    }, root);
    return (value === undefined ? fallback : value) as T;
  } catch {
    return fallback as T;
  }
}

export function hasAt(root: unknown, path: string): boolean {
  const tokens = tokenize(path);
  if (!tokens.length) return true;
  let current: unknown = root;
  for (const token of tokens) {
    if (current === null || typeof current !== "object") return false;
    if (!Object.prototype.hasOwnProperty.call(current, token)) return false;
    current = (current as Record<string | number, unknown>)[token];
  }
  return true;
}

export function setAt(root: ConfigObject, path: string, value: unknown): void {
  const tokens = tokenize(path);
  if (!tokens.length) return;
  const last = tokens.pop()!;
  const parent = tokens.reduce<Record<string | number, unknown>>((current, token, index) => {
    if (current[token] === undefined || current[token] === null) {
      current[token] = typeof tokens[index + 1] === "number" ? [] : {};
    }
    return current[token] as Record<string | number, unknown>;
  }, root);
  parent[last] = value as ConfigValue;
}

export function deleteAt(root: ConfigObject, path: string): void {
  const tokens = tokenize(path);
  if (!tokens.length) return;
  const last = tokens.pop()!;
  const parent = tokens.reduce<unknown>((current, token) => (current as Record<string | number, unknown>)[token], root);
  if (Array.isArray(parent) && typeof last === "number") parent.splice(last, 1);
  else if (parent && typeof parent === "object") delete (parent as Record<string | number, unknown>)[last];
}

export function childCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

export function normalizeHelpPath(path: string): string {
  return String(path).replace(/\[\d+\]/g, "[]");
}

function wildcardHelpPath(path: string): string {
  const normalized = normalizeHelpPath(path);
  if (/^\$\.image\.color\.background\.[^.]+\.value$/.test(normalized)) return "$.image.color.background.*.value";
  if (/^\$\.translation\.resources\.[^.]+$/.test(normalized)) return "$.translation.resources.*";
  if (/^\$\.image\.color\.[^.]+(?:\[\])?\.(alpha|end-color|end_color|label|name|value)$/.test(normalized)) {
    return normalized.replace(/^(\$\.image\.color)\.[^.]+(?:\[\])?\.(alpha|end-color|end_color|label|name|value)$/, "$1.*.$2");
  }
  return "";
}

export function helpFor(path: string, fallback = ""): string {
  const normalized = normalizeHelpPath(path);
  const wildcard = wildcardHelpPath(path);
  if (normalized.startsWith("$.rules[].runtime.")) {
    const runtimePath = normalized.replace("$.rules[].runtime", "$.runtime");
    const runtimeHelp = fieldHelp[runtimePath];
    if (runtimeHelp) return "规则级覆盖项。" + runtimeHelp;
  }
  return (
    fieldHelp[path] ||
    fieldHelp[normalized] ||
    (wildcard ? fieldHelp[wildcard] : "") ||
    fallback ||
    "字段路径：" + path + "。修改会先进入本地草稿，校验并保存后生效。"
  );
}

export function buildPaths(value: unknown, path = "$", key = "config"): PathNode[] {
  const row: PathNode[] = [{ path, key, type: typeOf(value), value, description: helpFor(path, "") }];
  if (Array.isArray(value)) {
    value.forEach((item, index) => row.push(...buildPaths(item, path + "[" + index + "]", "[" + index + "]")));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      const childPath = path === "$" ? "$." + childKey : path + "." + childKey;
      row.push(...buildPaths(childValue, childPath, childKey));
    });
  }
  return row;
}

export function isSensitive(path: string): boolean {
  return sensitivePattern.test(String(tokenize(path).at(-1) || ""));
}

export function maskSensitive(value: unknown, path: string, showSecrets: boolean): string {
  const text = String(value ?? "");
  if (!text) return "";
  if (showSecrets || !isSensitive(path) || text.length <= 8) return text;
  return text.slice(0, 3) + "*".repeat(Math.min(10, text.length - 6)) + text.slice(-3);
}

export function summarize(value: unknown, path = "", showSecrets = false): string {
  if (isSensitive(path)) return maskSensitive(value, path, showSecrets);
  const type = typeOf(value);
  if (type === "object") return childCount(value) + " 个字段";
  if (type === "array") return childCount(value) + " 项";
  if (type === "string") {
    const text = String(value);
    return text.length > 96 ? text.slice(0, 96) + "..." : text;
  }
  return String(value);
}

export interface DiffEntry {
  path: string;
  before: unknown;
  after: unknown;
}

function walkDiff(a: unknown, b: unknown, path: string, out: DiffEntry[]): void {
  const typeA = typeOf(a);
  const typeB = typeOf(b);
  if (typeA !== typeB) {
    out.push({ path, before: a, after: b });
    return;
  }
  if (typeA === "object") {
    const keys = new Set([...Object.keys(a as ConfigObject), ...Object.keys(b as ConfigObject)]);
    keys.forEach((key) => {
      const existsA = Object.prototype.hasOwnProperty.call(a, key);
      const existsB = Object.prototype.hasOwnProperty.call(b, key);
      if (!existsB) {
        out.push({ path: path + "." + key, before: (a as ConfigObject)[key], after: undefined });
        return;
      }
      if (!existsA) {
        out.push({ path: path + "." + key, before: undefined, after: (b as ConfigObject)[key] });
        return;
      }
      walkDiff((a as ConfigObject)[key], (b as ConfigObject)[key], path + "." + key, out);
    });
    return;
  }
  if (typeA === "array") {
    const listA = a as ConfigValue[];
    const listB = b as ConfigValue[];
    const length = Math.max(listA.length, listB.length);
    for (let index = 0; index < length; index += 1) {
      walkDiff(listA[index], listB[index], path + "[" + index + "]", out);
    }
    return;
  }
  if (a !== b) out.push({ path, before: a, after: b });
}

export function diffPaths(before: unknown, after: unknown): DiffEntry[] {
  if (before === undefined || after === undefined) return [];
  const out: DiffEntry[] = [];
  walkDiff(before, after, "$", out);
  return out;
}

export function riskFor(path: string, value: unknown, root: unknown): string {
  const risks: string[] = [];
  if (isSensitive(path)) risks.push("敏感字段，默认脱敏显示；保存前确认使用安全通道。");
  if (path === "$.webapi.address" && typeof value === "string" && /(^0\.0\.0\.0|:\d+$)/.test(value) && !value.startsWith("127.")) {
    risks.push("可能开放公网访问，请确认访问密码、反向代理和防火墙策略。");
  }
  if (path === "$.webapi.tls" && value === true && (!getAt(root, "$.webapi.tlsCertFile") || !getAt(root, "$.webapi.tlsKeyFile"))) {
    risks.push("TLS 已开启但证书或私钥路径为空。");
  }
  if (path.includes(".token")) risks.push("修改 token 会影响 Bot 或后端握手。");
  if (path === "$.rules" && Array.isArray(value) && value.length === 0) risks.push("rules 为空时命令可能没有可执行测试规则。");
  return risks.join(" ");
}

export function dangerousChangeMessage(path: string, value: unknown, root: unknown): string {
  if (path === "$.bot.bot-token") return "修改 bot-token 会影响 Telegram Bot 登录状态。";
  if (path === "$.webapi.password") return "修改 Web API 访问密码后，当前页面后续请求也需要使用新密码。";
  if (/^\$\.slaveConfig\.slaves\[\d+\]\.token$/.test(path)) return "修改 slave token 会影响测速后端握手。";
  if (path === "$.license") return "license 属于敏感授权字段，请确认来源可靠。";
  if (path === "$.webapi.address" && typeof value === "string" && /(^0\.0\.0\.0|^\[::\]|^\*:|:8899$)/.test(value) && !value.startsWith("127.") && !value.startsWith("localhost")) {
    return "监听地址可能暴露到公网，请确认已设置访问密码和网络访问控制。";
  }
  if (path === "$.webapi.tls" && value === true && (!getAt(root, "$.webapi.tlsCertFile") || !getAt(root, "$.webapi.tlsKeyFile"))) {
    return "TLS 已开启但证书或私钥路径为空，保存重载可能导致 Web API 启动失败。";
  }
  return "";
}

export function gradient(list: unknown): string {
  if (!Array.isArray(list) || !list.length) return "linear-gradient(90deg,#6ef3c5,#8ab4ff,#ffc46b)";
  const stops = list
    .filter((item): item is Record<string, ConfigValue> => Boolean(item) && typeof item === "object")
    .map((item, index) => {
      const color = typeof item.value === "string" && hexPattern.test(item.value) ? item.value : "#ffffff";
      return color + " " + (index / Math.max(list.length - 1, 1)) * 100 + "%";
    });
  return "linear-gradient(90deg, " + stops.join(",") + ")";
}

export function pathLabel(path: string): string {
  return path === "$" ? "根配置" : path.replace(/^\$\./, "").replace(/\[(\d+)\]/g, " #$1");
}

export function arrayItemSummary(item: unknown, index: number, fallback: string): string {
  if (item && typeof item === "object") {
    const record = item as ConfigObject;
    const name = record.name ?? record.id ?? record.title;
    if (typeof name === "string" && name) return name;
  }
  if (typeof item === "string" && item) return item;
  return fallback + " " + (index + 1);
}
