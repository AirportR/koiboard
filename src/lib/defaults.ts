import type { ConfigObject } from "../types/config";

export function defaultItem(kind: "rule" | "slave" | "script" | "command" | "colorStop" | "array"): unknown {
  const factories: Record<string, () => unknown> = {
    rule: () => ({ name: "new-rule", url: "", slaveid: [], script: [], runtime: {} }),
    slave: () => ({
      id: "new-slave",
      type: "miaospeed",
      token: "",
      address: "127.0.0.1:8765",
      path: "/",
      tls: false,
      skipCertVerify: false,
      hidden: false,
      comment: "",
      option: {},
    }),
    script: () => ({ type: "gojajs", name: "NewScript", rank: 0, content: "" }),
    command: () => ({ name: "newcmd", title: "新命令", text: "执行测试", rule: "", enable: true, pin: false, attachToInvite: false }),
    colorStop: () => ({ label: 0, name: "new", value: "#7dd3fc", alpha: 255, end_color: "#ffffff" }),
    array: () => "",
  };
  return factories[kind]();
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;
  const hueToRgb = (p: number, q: number, tRaw: number) => {
    let t = tRaw;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const rgb = [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)].map((channel) =>
    Math.round(channel * 255).toString(16).padStart(2, "0"),
  );
  return `#${rgb.join("")}`;
}

function colorStopLabel(path: string, index: number, count: number): number {
  if (path.endsWith(".delay")) {
    const ratio = count <= 1 ? 0 : index / (count - 1);
    return Math.round(lerp(1, 2000, ratio * ratio));
  }
  return Number((index * 25).toFixed(1));
}

export function colorGradientStops(path: string, count: number): ConfigObject[] {
  const safeCount = Math.max(2, Math.min(64, Math.trunc(Number(count)) || 10));
  const hueStart = randomInt(150, 220);
  const hueSpan = randomInt(70, 170) * (Math.random() > 0.45 ? 1 : -1);
  const saturationStart = randomInt(48, 68);
  const saturationEnd = randomInt(74, 92);
  const lightStart = randomInt(88, 94);
  const lightEnd = randomInt(46, 58);

  return Array.from({ length: safeCount }, (_, index) => {
    const ratio = safeCount === 1 ? 0 : index / (safeCount - 1);
    const eased = ratio * ratio * (3 - 2 * ratio);
    return {
      label: colorStopLabel(path, index, safeCount),
      name: String(index + 1),
      value: hslToHex(hueStart + hueSpan * eased, lerp(saturationStart, saturationEnd, eased), lerp(lightStart, lightEnd, eased)),
      alpha: 255,
      end_color: "#ffffff",
    };
  });
}
