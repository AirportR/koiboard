import { Icon } from "./icons";

export function ChipPicker({
  options,
  value,
  onChange,
  emptyHint = "暂无可选项",
  customLabel = "手动添加",
}: {
  options: Array<{ value: string; label?: string; hint?: string }>;
  value: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
  customLabel?: string;
}) {
  const known = new Map(options.map((option) => [option.value, option]));
  const available = options.filter((option) => !value.includes(option.value));

  return (
    <div className="stack" style={{ gap: 8 }}>
      {value.length ? (
        <div className="chip-row">
          {value.map((item) => (
            <span key={item} className="tag tag--mint">
              {known.get(item)?.label ?? item}
              <button type="button" aria-label={"移除 " + item} onClick={() => onChange(value.filter((entry) => entry !== item))}>
                <Icon name="X" size={11} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <span className="field__hint">{emptyHint}</span>
      )}

      <div className="chip-add">
        <select
          className="select"
          value=""
          aria-label={"添加 " + customLabel}
          onChange={(event) => {
            const next = event.target.value;
            if (!next) return;
            onChange([...value, next]);
          }}
        >
          <option value="">+ 从列表选择…</option>
          {available.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label ?? option.value}
            </option>
          ))}
        </select>
        <details className="add-custom">
          <summary>{customLabel}</summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const input = form.elements.namedItem("value") as HTMLInputElement | null;
              const text = input?.value.trim();
              if (text && !value.includes(text)) onChange([...value, text]);
              if (input) input.value = "";
            }}
          >
            <input name="value" className="input input--mono" placeholder="输入后回车" aria-label={customLabel} />
          </form>
        </details>
      </div>
    </div>
  );
}
