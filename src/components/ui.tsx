import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./icons";
import type { ToastMessage } from "../types/config";

type ButtonVariant = "default" | "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  iconOnly?: boolean;
  busy?: boolean;
}

export function Button({ icon, variant = "default", size = "md", iconOnly = false, busy = false, children, className = "", ...rest }: ButtonProps) {
  const classes = ["btn"];
  if (variant !== "default") classes.push("btn--" + variant);
  if (size === "sm") classes.push("btn--sm");
  if (iconOnly) classes.push("btn--icon");
  if (className) classes.push(className);
  return (
    <button type="button" className={classes.join(" ")} data-busy={busy ? "true" : undefined} {...rest}>
      {icon ? <Icon name={busy ? "Loader" : icon} /> : null}
      {children ? <span className="btn__label">{children}</span> : null}
    </button>
  );
}

export function Pill({ children, tone, icon }: { children: ReactNode; tone?: "mint" | "iris" | "amber" | "coral" | "dashed"; icon?: string }) {
  const classes = ["pill"];
  if (tone) classes.push("pill--" + tone);
  return (
    <span className={classes.join(" ")}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: { value: string; options: Array<{ value: T; label: string }>; onChange: (value: T) => void; ariaLabel: string }) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({
  title,
  desc,
  eyebrow,
  icon,
  actions,
  children,
  foot,
  bodyClass = "",
  headPlain = false,
  className = "",
}: {
  title?: ReactNode;
  desc?: ReactNode;
  eyebrow?: string;
  icon?: string;
  actions?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
  bodyClass?: string;
  headPlain?: boolean;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      {title || actions ? (
        <header className={"panel__head" + (headPlain ? " panel__head--plain" : "")}>
          {icon ? (
            <span className="panel__icon">
              <Icon name={icon} />
            </span>
          ) : null}
          <div className="panel__title">
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            <h2>{title}</h2>
            {desc ? <p>{desc}</p> : null}
          </div>
          {actions ? <div className="inline-actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className={"panel__body " + bodyClass}>{children}</div>
      {foot ? <footer className="panel__foot">{foot}</footer> : null}
    </section>
  );
}

export function EmptyState({ icon = "Sparkles", title, hint, action }: { icon?: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} />
      </span>
      <b>{title}</b>
      {hint ? <p>{hint}</p> : null}
      {action}
    </div>
  );
}

export function ViewHeader({ index, eyebrow, title, subtitle, meta }: { index: string; eyebrow: string; title: string; subtitle?: string; meta?: ReactNode }) {
  return (
    <header className="view-head">
      <div>
        <div className="view-head__eyebrow">
          <span>{index}</span>
          <em>/</em>
          <span>{eyebrow}</span>
        </div>
        <h1>
          {title}
          {subtitle ? <small>{subtitle}</small> : null}
        </h1>
      </div>
      {meta ? <div className="view-head__meta">{meta}</div> : null}
    </header>
  );
}

export function ToastRegion({ toasts, dismiss }: { toasts: ToastMessage[]; dismiss: (id: number) => void }) {
  const icons: Record<ToastMessage["tone"], string> = {
    success: "CircleCheck",
    warning: "TriangleAlert",
    error: "CircleAlert",
    info: "Info",
  };
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" data-tone={toast.tone}>
          <span className="toast__icon">
            <Icon name={icons[toast.tone]} />
          </span>
          <div className="toast__body">
            <b>{toast.title}</b>
            {toast.message ? <span>{toast.message}</span> : null}
          </div>
          <button type="button" className="toast__close" aria-label="关闭提示" onClick={() => dismiss(toast.id)}>
            <Icon name="X" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Notice({ tone = "default", icon, children }: { tone?: "default" | "mint" | "amber" | "iris"; icon?: string; children: ReactNode }) {
  const classes = ["notice"];
  if (tone !== "default") classes.push("notice--" + tone);
  return (
    <div className={classes.join(" ")}>
      <Icon name={icon ?? "Info"} />
      <div>{children}</div>
    </div>
  );
}

export function AddRow({ label, onClick, icon = "Plus" }: { label: string; onClick: () => void; icon?: string }) {
  return (
    <button type="button" className="add-row" onClick={onClick}>
      <Icon name={icon} size={15} />
      <span>{label}</span>
    </button>
  );
}

export function ReadOnlyStrip({ children }: { children: ReactNode }) {
  return (
    <div className="readonly-strip">
      <Icon name="ShieldCheck" />
      <span>{children}</span>
    </div>
  );
}
