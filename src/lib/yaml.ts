import type { ConfigValue } from "../types/config";

function scalar(value: ConfigValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  const text = String(value);
  if (text === "") return '""';
  if (/^(true|false|null|~|-?\d+(\.\d+)?)$/i.test(text)) return JSON.stringify(text);
  if (/^[A-Za-z0-9_./:@#%+\-=?&*()\[\]{}]+$/.test(text) && !/^[-?:]/.test(text) && !text.includes(": ")) return text;
  return JSON.stringify(text);
}

export function toYaml(value: ConfigValue, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return value
      .map((item) => {
        if (item !== null && typeof item === "object" && !Array.isArray(item) && Object.keys(item).length) {
          const body = toYaml(item, indent + 1);
          return pad + "- " + body.trimStart().replace(/\n/g, "\n" + pad + "  ");
        }
        if (Array.isArray(item) && item.length) return pad + "-\n" + toYaml(item, indent + 1);
        return pad + "- " + scalar(item as ConfigValue);
      })
      .join("\n");
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return "{}";
    return entries
      .map(([key, child]) => {
        const label = /^[A-Za-z0-9_.-]+$/.test(key) ? key : JSON.stringify(key);
        if (child !== null && typeof child === "object" && Object.keys(child as object).length) {
          return pad + label + ":\n" + toYaml(child as ConfigValue, indent + 1);
        }
        if (child !== null && typeof child === "object") {
          return pad + label + ": " + (Array.isArray(child) ? "[]" : "{}");
        }
        return pad + label + ": " + scalar(child as ConfigValue);
      })
      .join("\n");
  }
  return pad + scalar(value);
}
