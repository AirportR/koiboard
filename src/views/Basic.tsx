import { Fields } from "../components/Field";
import { Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { maskSensitive } from "../lib/configPath";
import type { ViewProps } from "./types";

export default function Basic({ model, binding }: ViewProps) {
  return (
    <div className="view">
      <ViewHeader
        index="02"
        eyebrow="Access"
        title="基础与权限"
        subtitle="授权码决定 Koipy 能否启动；管理员与用户名单决定谁能操作 Bot。"
        meta={
          <>
            <Pill icon="ShieldCheck">license</Pill>
            <Pill icon="Layers">{(binding.get("$.admin") as unknown[] | undefined)?.length ?? 0} 管理员</Pill>
          </>
        }
      />
      <div className="split">
        <div className="stack stack--lg">
          <Panel eyebrow="License" title="授权与日志" icon="ShieldCheck" desc="这些字段位于配置根节点，保存后立即影响运行态。">
            <Fields
              specs={[
                { path: "$.license", label: "License", kind: "secret", wide: true, helper: "激活码，必填；请确认来源可靠。", placeholder: "KOI-XXXX-XXXX" },
                { path: "$.log-level", label: "日志等级", kind: "select", choices: ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL", "DISABLE"], helper: "写入日志文件的详细程度。" },
              ]}
              binding={binding}
            />
          </Panel>

          <Panel eyebrow="Permissions" title="管理员与用户" icon="Layers" desc="以 Telegram ID 为单位，回车添加；在 Bot 内也可用 /grant 维护。">
            <div className="stack" style={{ gap: 20 }}>
              <Fields specs={[{ path: "$.admin", label: "管理员", kind: "tags", wide: true, placeholder: "输入 Telegram ID 后回车" }]} binding={binding} />
              <Fields specs={[{ path: "$.user", label: "普通用户", kind: "tags", wide: true, placeholder: "输入 Telegram ID 后回车" }]} binding={binding} />
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel eyebrow="Snapshot" title="当前摘要" icon="Info">
            <dl className="kv">
              <dt>License</dt>
              <dd>{maskSensitive(binding.get("$.license"), "$.license", model.showSecrets) || "未设置"}</dd>
              <dt>日志等级</dt>
              <dd>{String(binding.get("$.log-level") ?? "—")}</dd>
              <dt>管理员</dt>
              <dd>{((binding.get("$.admin") as unknown[] | undefined) ?? []).length} 人</dd>
              <dt>普通用户</dt>
              <dd>{((binding.get("$.user") as unknown[] | undefined) ?? []).length} 人</dd>
            </dl>
          </Panel>
          <Notice tone="amber" icon="TriangleAlert">
            修改 <span className="code-inline">license</span> 或权限名单属于敏感操作；保存并重载后，Bot 会按新权限生效。
          </Notice>
          <Notice tone="iris" icon="Keyboard">
            小技巧：在任意字段上点「详情」可查看路径、说明、风险与运行态原值。
          </Notice>
        </div>
      </div>
    </div>
  );
}
