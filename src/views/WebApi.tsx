import { Icon } from "../components/icons";
import { ReadOnlyStrip, Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { getAt } from "../lib/configPath";
import type { ViewProps } from "./types";

function ValueRow({ label, value, mono = true }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <div className="kv">
      <dt>{label}</dt>
      <dd className={mono ? "" : ""}>{String(value ?? "—") || "—"}</dd>
    </div>
  );
}

export default function WebApi({ model }: ViewProps) {
  const address = getAt(model.config, "$.webapi.address");
  const origins = getAt<string[]>(model.config, "$.webapi.allowOrigins", []);
  const tls = getAt(model.config, "$.webapi.tls") === true;
  return (
    <div className="view">
      <ViewHeader
        index="03"
        eyebrow="Read only"
        title="Web API"
        subtitle="这一段配置只读展示：前端不会写入 webapi 的修改，避免把管理接口改坏。"
        meta={
          <>
            <Pill tone="iris" icon="ShieldCheck">只读</Pill>
            <Pill icon="RadioTower">{String(address ?? "未监听")}</Pill>
          </>
        }
      />
      <div className="split">
        <div className="stack stack--lg">
          <Panel eyebrow="Endpoint" title="监听与认证" icon="RadioTower" desc="如需修改，请直接编辑 Koipy 的 config.yaml 后重启服务。">
            <div className="stack">
              <ReadOnlyStrip>webapi 根配置在后端受保护，前端只能查看。</ReadOnlyStrip>
              <dl className="kv">
                <dt>启用状态</dt>
                <dd>
                  <span className={"pill " + (getAt(model.config, "$.webapi.enable") ? "pill--mint" : "")}>
                    {getAt(model.config, "$.webapi.enable") ? "已启用" : "未启用"}
                  </span>
                </dd>
                <dt>监听地址</dt>
                <dd>{String(address ?? "—")}</dd>
                <dt>访问密码</dt>
                <dd>{getAt(model.config, "$.webapi.password") ? "已设置" : "未设置"}</dd>
                <dt>TLS</dt>
                <dd>{tls ? "已开启" : "关闭"}</dd>
                <dt>证书文件</dt>
                <dd>{String(getAt(model.config, "$.webapi.tlsCertFile", "") || "—")}</dd>
                <dt>私钥文件</dt>
                <dd>{String(getAt(model.config, "$.webapi.tlsKeyFile", "") || "—")}</dd>
              </dl>
            </div>
          </Panel>

          <Panel eyebrow="CORS" title="允许的来源" icon="Globe" desc="跨域部署时，前端 origin 必须出现在这里。">
            {origins.length ? (
              <div className="stack" style={{ gap: 8 }}>
                {origins.map((origin) => (
                  <div key={origin} className="inline-actions" style={{ gap: 8 }}>
                    <span className="pill pill--mint"><Icon name="CircleCheck" size={12} /></span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>{origin}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Notice icon="Info">没有配置 allowOrigins；同源部署时通常不需要。</Notice>
            )}
          </Panel>
        </div>

        <div className="stack">
          <Notice tone="amber" icon="TriangleAlert">
            把管理 API 暴露到公网前，请确保设置了强访问密码，并通过反向代理限制来源。
          </Notice>
          <Panel eyebrow="Deploy" title="同源反向代理" icon="Waypoints">
            <div className="stack" style={{ gap: 10 }}>
              <ValueRow label="前端" value="/ → dist/" />
              <ValueRow label="接口" value="/api/* → Koipy" />
              <ValueRow label="健康检查" value="/healthz" />
            </div>
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
              同源部署时把 API 地址留空即可，前端会直接请求当前域名下的 <span className="code-inline">/api/*</span>。
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
