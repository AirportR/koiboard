import { Fields } from "../components/Field";
import { Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { getAt } from "../lib/configPath";
import type { ViewProps } from "./types";

export default function NetworkView({ model, binding }: ViewProps) {
  const proxy = String(getAt(model.config, "$.network.socks5Proxy") || getAt(model.config, "$.network.httpProxy") || "");
  const ageEnabled = getAt(model.config, "$.subscription.age.enable") === true;
  const converterMode = String(getAt(model.config, "$.subconverter.mode", "builtin"));
  return (
    <div className="view">
      <ViewHeader
        index="05"
        eyebrow="Network"
        title="网络与订阅"
        subtitle="出口代理、User-Agent、age 加密订阅与订阅转换；Bot 自身代理在 Bot 分区。"
        meta={
          <>
            <Pill icon="Link2">{proxy || "直连"}</Pill>
            <Pill tone={ageEnabled ? "mint" : undefined} icon="Lock">age {ageEnabled ? "启用" : "关闭"}</Pill>
            <Pill tone={getAt(model.config, "$.subconverter.enable") ? "mint" : undefined} icon="Blocks">{converterMode}</Pill>
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
                { path: "$.network.userAgent", label: "User-Agent", mono: true, wide: true, placeholder: "ClashMetaForAndroid/2.8.9.Meta Mihomo/0.16", helper: "部分机场会根据 UA 返回不同格式的订阅内容。" },
              ]}
              binding={binding}
            />
          </Panel>

          <Panel
            eyebrow="Subscription"
            title="age 加密订阅"
            icon="Lock"
            desc="仅支持 age X25519 ASCII armor 格式；不依赖额外二进制。"
            actions={<Pill tone={ageEnabled ? "mint" : "dashed"}>{ageEnabled ? "已启用" : "未启用"}</Pill>}
          >
            <div className="stack" style={{ gap: 16 }}>
              <Fields
                specs={[
                  { path: "$.subscription.age.enable", label: "启用 age 解密", kind: "switch", wide: true, helper: "订阅下载成功后、解析/转换前尝试解密。" },
                  { path: "$.subscription.age.secretKey", label: "age 私钥", kind: "secret", mono: true, wide: true, placeholder: "AGE-SECRET-KEY-…", helper: "启用解密时必填，属于敏感字段。" },
                  { path: "$.subscription.age.publicKey", label: "age 公钥", mono: true, wide: true, placeholder: "age1…", helper: "填写后请求订阅时会通过下方请求头发给服务端。" },
                  { path: "$.subscription.age.publicKeyHeader", label: "公钥请求头", mono: true, placeholder: "X-Age-Public-Key" },
                ]}
                binding={binding}
              />
              <span className="field__hint">服务端可用该公钥临时加密返回内容；私钥只在 Koipy 本机解密。</span>
            </div>
          </Panel>

          <Panel eyebrow="Converter" title="订阅转换" icon="Blocks" desc="把 base64 订阅转换成 Bot 测试需要的 Clash 格式。">
            <div className="stack" style={{ gap: 16 }}>
              <Fields
                specs={[
                  { path: "$.subconverter.enable", label: "启用订阅转换", kind: "switch", wide: true, helper: "关闭后直接使用原始订阅内容。" },
                  { path: "$.subconverter.mode", label: "转换模式", kind: "select", choices: ["subconverter", "substore", "builtin"], helper: "builtin 为内置转换器（实验性），不需要额外后端进程。" },
                  { path: "$.subconverter.defaults.target", label: "默认目标", mono: true, placeholder: "ClashMeta / Clash / Sing-Box", helper: "填充模板中的 $Target；留空时由后端推断。" },
                  { path: "$.subconverter.template.backend", label: "转换后端模板", kind: "textarea", mono: true, wide: true, rows: 3, placeholder: "http://$Host:$Port/sub?target=$Target&url=$EncodedURL", helper: "支持 $EncodedURL / $URL / $Host / $Port / $Target / $Mode，以及 defaults 中的自定义键。" },
                ]}
                binding={binding}
              />
              <Notice tone="amber" icon="TriangleAlert">
                当链接作为 query 参数传递时请使用 <span className="code-inline">$EncodedURL</span>；误用 <span className="code-inline">$URL</span> 会被内层链接的 <span className="code-inline">? &amp; #</span> 破坏。
              </Notice>
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Notice tone="iris" icon="Info">
            订阅链接里的 <span className="code-inline">?token=</span> 等参数会被原样透传；转换后端地址支持模板变量，按你的部署填写。
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
              <dt>age 私钥</dt>
              <dd>{getAt(model.config, "$.subscription.age.secretKey") ? "已设置" : "未设置"}</dd>
              <dt>转换目标</dt>
              <dd>{String(getAt(model.config, "$.subconverter.defaults.target", "自动"))}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
