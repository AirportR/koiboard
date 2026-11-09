import { Fields } from "../components/Field";
import { Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { getAt } from "../lib/configPath";
import type { ViewProps } from "./types";

export default function NetworkView({ model, binding }: ViewProps) {
  const proxy = String(getAt(model.config, "$.network.socks5Proxy") || getAt(model.config, "$.network.httpProxy") || "");
  return (
    <div className="view">
      <ViewHeader
        index="05"
        eyebrow="Network"
        title="网络与订阅"
        subtitle="这部分只影响 Koipy 拉取订阅与外部资源；Bot 自身翻墙代理在 Bot 分区。"
        meta={
          <>
            <Pill icon="Link2">{proxy || "直连"}</Pill>
            <Pill tone={getAt(model.config, "$.subconverter.enable") ? "mint" : undefined} icon="Blocks">
              订阅转换 {getAt(model.config, "$.subconverter.enable") ? "启用" : "关闭"}
            </Pill>
          </>
        }
      />
      <div className="split">
        <div className="stack stack--lg">
          <Panel eyebrow="Egress" title="出口代理" icon="Globe" desc="用于 Bot 拉取订阅、调用回调与外部接口。">
            <Fields
              specs={[
                { path: "$.network.httpProxy", label: "HTTP 代理", mono: true, placeholder: "http://127.0.0.1:7890", helper: "留空表示不使用 HTTP 代理。" },
                { path: "$.network.socks5Proxy", label: "SOCKS5 代理", mono: true, placeholder: "socks5://127.0.0.1:7891" },
                { path: "$.network.userAgent", label: "User-Agent", mono: true, wide: true, placeholder: "clash.meta/1.18.0", helper: "部分机场会根据 UA 返回不同格式的订阅内容。" },
              ]}
              binding={binding}
            />
          </Panel>

          <Panel eyebrow="Converter" title="订阅转换" icon="Blocks" desc="当订阅需要转换成 Clash / Sing-box 等目标格式时启用。">
            <Fields
              specs={[
                { path: "$.subconverter.enable", label: "启用订阅转换", kind: "switch", wide: true, helper: "关闭后直接使用原始订阅内容。" },
                { path: "$.subconverter.mode", label: "模式", kind: "select", choices: ["clash", "sing-box", "surge", "quantumult", "loon"], helper: "用于推断默认 Host / Port / Target。" },
                { path: "$.subconverter.defaults.target", label: "默认目标", kind: "select", choices: ["clash", "clash.meta", "sing-box", "surge", "quantumult", "loon"] },
                { path: "$.subconverter.template.backend", label: "转换后端", mono: true, wide: true, placeholder: "https://sub.example.com/api/v1/client/subscribe?token=…" },
              ]}
              binding={binding}
            />
          </Panel>
        </div>
        <div className="stack">
          <Notice tone="iris" icon="Info">
            订阅链接里的 <span className="code-inline">?token=</span> 等参数会被原样透传；转换后端地址支持模板变量，按你的 subconverter 部署填写。
          </Notice>
          <Notice tone="amber" icon="TriangleAlert">
            代理与转换后端都要保证 Koipy 所在机器可以访问，否则拉取订阅会超时。
          </Notice>
          <Panel eyebrow="Checklist" title="上线前自查" icon="ShieldCheck">
            <dl className="kv">
              <dt>代理连通</dt>
              <dd>curl -x {proxy || "DIRECT"} https://www.gstatic.com/generate_204</dd>
              <dt>UA 生效</dt>
              <dd>{String(getAt(model.config, "$.network.userAgent", "默认"))}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
