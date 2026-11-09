function headerOffset(): number {
  const topbar = document.querySelector(".topbar");
  return (topbar?.getBoundingClientRect().height ?? 64) + 16;
}

function placeHeader(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  const header = element.querySelector<HTMLElement>(".row__head") ?? element;
  const top = header.getBoundingClientRect().top + window.scrollY - headerOffset();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
}

export function revealRow(id: string, focusSelector = "input:not([type=hidden]), textarea, select") {
  window.requestAnimationFrame(() => {
    window.setTimeout(() => placeHeader(id), 60);
    // 折叠/展开动画结束后再校正一次，抵消 scroll anchoring 与高度变化
    window.setTimeout(() => placeHeader(id), 420);
    window.setTimeout(() => {
      const element = document.getElementById(id);
      element?.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true });
    }, 520);
  });
}
