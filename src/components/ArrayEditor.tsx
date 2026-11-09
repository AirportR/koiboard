import { Icon } from "./icons";
import { Button, EmptyState } from "./ui";
import type { ConfigBinding } from "./Field";

export function StringArrayEditor({
  binding,
  path,
  placeholder = "https://…",
  addLabel = "添加条目",
  mono = true,
  emptyHint = "还没有条目，添加一个开始。",
}: {
  binding: ConfigBinding;
  path: string;
  placeholder?: string;
  addLabel?: string;
  mono?: boolean;
  emptyHint?: string;
}) {
  const value = binding.get(path);
  const list = Array.isArray(value) ? value.map((item) => String(item ?? "")) : [];
  const write = (next: string[]) => binding.set(path, next);

  return (
    <div className="stack">
      {list.length ? (
        <div className="stack" style={{ gap: 8 }}>
          {list.map((item, index) => (
            <div key={index} className="inline-actions" style={{ gap: 8 }}>
              <span className="pill" style={{ width: 28, justifyContent: "center", flex: "none" }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <input
                className={"input" + (mono ? " input--mono" : "")}
                value={item}
                placeholder={placeholder}
                onChange={(event) => {
                  const next = [...list];
                  next[index] = event.target.value;
                  write(next);
                }}
                spellCheck={false}
                aria-label={"第 " + (index + 1) + " 项"}
              />
              <Button variant="ghost" iconOnly icon="ArrowUp" size="sm" aria-label="上移" disabled={index === 0} onClick={() => {
                const next = [...list];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                write(next);
              }} />
              <Button variant="ghost" iconOnly icon="Trash2" size="sm" aria-label="删除" onClick={() => write(list.filter((_, i) => i !== index))} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="Layers" title="列表为空" hint={emptyHint} />
      )}
      <div>
        <Button icon="Plus" size="sm" onClick={() => write([...list, ""])} disabled={false}>
          {addLabel}
        </Button>
      </div>
      <span className="field__hint">
        <Icon name="Info" size={12} /> 路径 <span className="mono">{path}</span> · 共 {list.length} 项
      </span>
    </div>
  );
}
