import { Fields } from "../components/Field";
import { StringArrayEditor } from "../components/ArrayEditor";
import { Notice, Panel, Pill, ViewHeader } from "../components/ui";
import { runtimeFields } from "../data/metadata";
import { getAt } from "../lib/configPath";
import type { ViewProps } from "./types";

const groups = [
  {
    key: "probe",
    title: "探测与过滤",
    desc: "决定测哪些节点、用哪些地址探测。",
    paths: [".entrance", ".ipstack", ".localip", ".nospeed", ".pingURL", ".includeFilter", ".excludeFilter"],
  },
  {
    key: "speed",
    title: "测速规模",
    desc: "线程与节点数直接影响测试时长和后端压力。",
    paths: [".duration", ".speedThreads", ".speedNodes"],
  },
  {
    key: "output",
    title: "输出与行为",
    desc: "结果图样式、实时渲染与订阅转换行为。",
    paths: [".sort", ".output", ".realtime", ".disableSubCvt", ".protectContent", ".enableDNSInject"],
  },
];

export default function Runtime({ model, binding }: ViewProps) {
  const all = runtimeFields("$.runtime");
  const output = String(getAt(model.config, "$.runtime.output", "image"));
  return (
    <div className="view">
      <ViewHeader
        index="06"
        eyebrow="Runtime"
        title="测试运行时"
        subtitle="全局默认参数。规则里的 runtime 会覆盖同名项，只影响那一条规则。"
        meta={
          <>
            <Pill icon="Timer">{String(getAt(model.config, "$.runtime.duration", "—"))}s</Pill>
            <Pill icon="Zap">{String(getAt(model.config, "$.runtime.speedThreads", "—"))} 线程</Pill>
            <Pill tone="mint" icon="Image">{output}</Pill>
          </>
        }
      />
      <div className="split">
        <div className="stack stack--lg">
          {groups.map((group) => (
            <Panel key={group.key} eyebrow="Runtime" title={group.title} desc={group.desc} icon={group.key === "speed" ? "Zap" : group.key === "output" ? "Image" : "Timer"}>
              <Fields specs={all.filter((spec) => group.paths.includes(spec.path.replace("$.runtime", "")))} binding={binding} />
            </Panel>
          ))}
          <Panel eyebrow="Files" title="测速大文件" icon="Download" desc="按顺序尝试下载；链接失效会显著拉低速度结果。">
            <StringArrayEditor binding={binding} path="$.runtime.speedFiles" placeholder="https://speed.example.com/100MB.bin" addLabel="添加测速文件" />
          </Panel>
        </div>
        <div className="stack">
          <Notice tone="iris" icon="Layers">
            规则级覆盖：在「测试规则」中展开任意规则，添加只属于它的 <span className="code-inline">runtime</span> 键，例如更长的下载时间或不同的排序。
          </Notice>
          <Notice tone="amber" icon="TriangleAlert">
            线程过高会打满后端带宽并让结果抖动；建议先按后端数量 × 8 的规模试探。
          </Notice>
          <Panel eyebrow="Defaults" title="当前默认值" icon="Settings2">
            <dl className="kv">
              <dt>下载时长</dt>
              <dd>{String(getAt(model.config, "$.runtime.duration", "—"))} 秒</dd>
              <dt>测速线程</dt>
              <dd>{String(getAt(model.config, "$.runtime.speedThreads", "—"))}</dd>
              <dt>节点上限</dt>
              <dd>{String(getAt(model.config, "$.runtime.speedNodes", "—"))}</dd>
              <dt>排序</dt>
              <dd>{String(getAt(model.config, "$.runtime.sort", "—"))}</dd>
              <dt>测速文件</dt>
              <dd>{((getAt(model.config, "$.runtime.speedFiles") as unknown[]) ?? []).length} 个</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
