import type { ReactNode } from "react";
import { Icon } from "./icons";

export function Row({
  open,
  onToggle,
  index,
  title,
  subtitle,
  badges,
  actions,
  dirty,
  children,
  id,
}: {
  open: boolean;
  onToggle: () => void;
  index: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  dirty?: boolean;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div className="row" data-open={open} data-dirty={dirty ? "true" : undefined} id={id}>
      <div className="row__head">
        <button type="button" className="row__toggle" aria-expanded={open} onClick={onToggle}>
          <span className="row__index">{index}</span>
          <span className="row__title">
            <b>{title}</b>
            {subtitle ? <span>{subtitle}</span> : null}
          </span>
          {badges ? <span className="row__badges">{badges}</span> : null}
          <span className="row__chev" aria-hidden="true">
            <Icon name="ChevronDown" />
          </span>
        </button>
        {actions ? <div className="row-actions">{actions}</div> : null}
      </div>
      <div className="acc">
        <div className="acc__inner">
          <div className="acc__body">{children}</div>
        </div>
      </div>
    </div>
  );
}
