export type ConfigPrimitive = string | number | boolean | null;
export type ConfigArray = ConfigValue[];
export type ConfigObject = { [key: string]: ConfigValue };
export type ConfigValue = ConfigPrimitive | ConfigArray | ConfigObject;

export type ConfigType =
  | "array"
  | "object"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined";

export type HealthState = "pending" | "online" | "error";
export type ValidationState = "idle" | "pass" | "fail";
export type EditorTab = "json" | "yaml";

export interface SectionMeta {
  id: SectionId;
  title: string;
  shortTitle: string;
  hint: string;
  roots: string[];
}

export type SectionId =
  | "dashboard"
  | "basic"
  | "webapp"
  | "bot"
  | "network"
  | "runtime"
  | "scripts"
  | "slaves"
  | "rules"
  | "appearance"
  | "translation";

export interface PathNode {
  path: string;
  key: string;
  type: ConfigType;
  value: unknown;
  description: string;
}

export interface ApiSettings {
  apiBase: string;
  password: string;
}

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  tone: "success" | "warning" | "error" | "info";
}

export interface FieldSpec {
  path: string;
  label: string;
  kind?: "text" | "secret" | "number" | "switch" | "textarea" | "select" | "color";
  choices?: string[];
  placeholder?: string;
  helper?: string;
  min?: number;
  max?: number;
  step?: number | "any";
  rows?: number;
  wide?: boolean;
  allowUnset?: boolean;
}
