# API 契约

前端只使用以下端点，均可跨域（需在 Koipy 的 `webapi.allowOrigins` 中放行）。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 连接检查，同时用于测延迟 |
| GET | `/api/config` | 返回 `{ config }` 运行态配置 |
| PUT | `/api/config` | 请求体 `{ config }`，写入运行态 |
| POST | `/api/config/validate` | 请求体 `{ config }`，校验配置模型 |
| POST | `/api/config/apply` | 请求体 `{ mode }`：`save` / `save_reload` / `discard_reload` |
| GET | `/api/config/export` | 返回 YAML 文本 |

约定：

- 设置密码后所有请求带 `X-Access-Password`
- `apiBase` 为空表示同源；绝对地址用于跨域部署
- 响应可以是 `{ success, data }` 包装，也可以是裸对象
- 失败时读取 `error` 与可选 `details`

## 演示模式

`?demo=1`（或 `localStorage["koiboard.nova.demo"] = "1"`）时，`src/lib/api.ts` 拦截全部请求，由 `src/lib/mock.ts` 提供一份示例配置：

- 约 120–300ms 模拟网络延迟
- `PUT` 会更新内存中的演示配置
- `export` 使用本地 YAML 序列化
- 退出演示：`?demo=0` 或界面上的「退出演示」

演示模式不发出真实网络请求，适合设计评审、离线演示与自动化截图。
