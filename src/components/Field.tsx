import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { Icon } from "./icons";
import { Switch } from "./ui";
import type { FieldKind, FieldSpec } from "../types/config";

export interface ConfigBinding {
  get: (path: string) => unknown;
  has: (path: string) => boolean;
  set: (path: string, value: unknown) => void;
  unset: (path: string) => void;
  inspect: (path: string) => void;
  dirty: (path: string) => boolean;
  secrets: boolean;
  readonlyHint?: string;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function inferKind(value: unknown): FieldKind {
  if (typeof value === "boolean") return "switch";
  if (typeof value === "number") return "number";
  return "text";
}

function NumberInput({ id, value, onChange, spec }: { id?: string; value: unknown; onChange: (next: number) => void; spec: FieldSpec }) {
  const [text, setText] = useState(String(value ?? ""));
  useEffect(() => {
    setText(String(value ?? ""));
  }, [value]);
  return (
    <input
      id={id}
      className="input input--mono"
      type="number"
      inputMode="numeric"
      value={text}
      min={spec.min}
      max={spec.max}
      step={spec.step ?? 1}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (next.trim() === "") return;
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={() => {
        if (text.trim() === "") setText(String(value ?? ""));
      }}
    />
  );
}

function TagInput({ id, value, onChange, placeholder }: { id?: string; value: string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const text = draft.trim();
    if (!text) return;
    if (!value.includes(text)) onChange([...value, text]);
    setDraft("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    }
    if (event.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="tags">
      {value.map((item) => (
        <span key={item} className="tag">
          {item}
          <button type="button" aria-label={"移除 " + item} onClick={() => onChange(value.filter((entry) => entry !== item))}>
            <Icon name="X" size={11} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        placeholder={placeholder ?? "输入后回车添加"}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        aria-label="添加条目"
      />
    </div>
  );
}

function ColorInput({ id, value, onChange }: { id?: string; value: unknown; onChange: (next: string) => void }) {
  const text = typeof value === "string" ? value : "";
  const safe = /^#[0-9a-f]{3,8}$/i.test(text) ? text : "#6ef3c5";
  return (
    <div className="color-row">
      <label className="color-chip" style={{ background: safe }} title="选择颜色">
        <input
          type="color"
          value={safe.length === 4 || safe.length === 7 ? safe : "#6ef3c5"}
          onChange={(event) => onChange(event.target.value)}
          style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
          aria-label="颜色选择器"
        />
      </label>
      <input id={id} className="input input--mono" value={text} onChange={(event) => onChange(event.target.value)} spellCheck={false} />
    </div>
  );
}

function SecretInput({ id, value, onChange, revealed, onToggle }: { id?: string; value: unknown; onChange: (next: string) => void; revealed: boolean; onToggle: () => void }) {
  return (
    <div className="secret-wrap">
      <input
        id={id}
        className="input input--mono"
        type={revealed ? "text" : "password"}
        value={asText(value)}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <button type="button" className="secret-toggle" onClick={onToggle} aria-label={revealed ? "隐藏敏感值" : "显示敏感值"}>
        <Icon name={revealed ? "EyeOff" : "Eye"} size={15} />
      </button>
    </div>
  );
}

export function Field({ spec, binding }: { spec: FieldSpec; binding: ConfigBinding }) {
  const id = useId();
  const value = binding.get(spec.path);
  const exists = binding.has(spec.path);
  const dirty = binding.dirty(spec.path);
  const kind = spec.kind ?? inferKind(value);
  const [revealed, setRevealed] = useState(false);
  const tags = Array.isArray(value) ? value.map(String) : [];

  const label = (
    <label className="field__label" htmlFor={id}>
      {dirty ? <span className="dot-dirty" title="未保存修改" /> : null}
      {spec.label}
      <button
        type="button"
        className="path-btn"
        onClick={() => binding.inspect(spec.path)}
        aria-label={"查看字段详情：" + spec.path}
        title={spec.path}
      >
        <Icon name="Link2" size={10} />
        详情
      </button>
    </label>
  );

  const hint = spec.helper ? <span className="field__hint">{spec.helper}</span> : null;

  if (kind === "switch") {
    return (
      <div className={"field field--switch" + (spec.wide ? " field--wide" : "")}>
        <div className="field__text">
          <b>
            {dirty ? <span className="dot-dirty" style={{ display: "inline-block", marginRight: 7 }} /> : null}
            {spec.label}
          </b>
          {spec.helper ? <span>{spec.helper}</span> : null}
        </div>
        <Switch checked={value === true} onChange={(next) => binding.set(spec.path, next)} label={spec.label} />
      </div>
    );
  }

  return (
    <div className={"field" + (spec.wide ? " field--wide" : "")}>
      {label}
      {kind === "select" ? (
        <select
          id={id}
          className="select"
          value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "" && spec.allowUnset) binding.unset(spec.path);
            else binding.set(spec.path, next);
          }}
        >
          {spec.allowUnset || !exists ? <option value="">未设置</option> : null}
          {(spec.choices ?? []).map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      ) : kind === "number" ? (
        <NumberInput id={id} value={value} onChange={(next) => binding.set(spec.path, next)} spec={spec} />
      ) : kind === "textarea" ? (
        <textarea
          id={id}
          className={"textarea" + (spec.mono ? " textarea--code" : "")}
          rows={spec.rows ?? 4}
          value={asText(value)}
          placeholder={spec.placeholder}
          onChange={(event) => binding.set(spec.path, event.target.value)}
        />
      ) : kind === "color" ? (
        <ColorInput id={id} value={value} onChange={(next) => binding.set(spec.path, next)} />
      ) : kind === "tags" ? (
        <TagInput id={id} value={tags} onChange={(next) => binding.set(spec.path, next)} placeholder={spec.placeholder} />
      ) : kind === "secret" ? (
        <SecretInput
          id={id}
          value={value}
          onChange={(next) => binding.set(spec.path, next)}
          revealed={revealed || binding.secrets}
          onToggle={() => setRevealed((current) => !current)}
        />
      ) : kind === "readonly" ? (
        <div className="readonly-strip">
          <Icon name="ShieldCheck" />
          <span className="mono">{asText(value) || "—"}</span>
        </div>
      ) : (
        <input
          id={id}
          className={"input" + (spec.mono ? " input--mono" : "")}
          value={asText(value)}
          placeholder={spec.placeholder}
          spellCheck={false}
          onChange={(event) => binding.set(spec.path, event.target.value)}
        />
      )}
      {hint}
    </div>
  );
}

export function Fields({ specs, binding, columns = 2 }: { specs: FieldSpec[]; binding: ConfigBinding; columns?: 2 | 3 }) {
  return (
    <div className={"field-grid" + (columns === 3 ? " field-grid--three" : "")}>
      {specs.map((spec) => (
        <Field key={spec.path} spec={spec} binding={binding} />
      ))}
    </div>
  );
}
