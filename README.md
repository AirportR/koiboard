# Koiboard V3

Koiboard V3 是 Koipy 的独立前端控制台，用于读取、编辑、校验和保存 Koipy 配置。前端只负责 UI、草稿管理和调用 Koipy Web API，不包含后端服务。

## 功能范围

- 读取 Koipy 运行态配置并生成本地草稿
- 按配置分类编辑 `license`、`bot`、`runtime`、`rules`、`slaveConfig`、`scriptConfig`、`image`、`translation` 等字段
- 校验草稿、写入内存、保存到 `config.yaml`、保存并重载
- 预览和导出 YAML
- 全局搜索 YAMLPath（`Ctrl+K` / `⌘K` 聚焦搜索框）
- 字段说明、风险提示、敏感值脱敏
- 深色 / 浅色主题切换，选择结果保存在 `localStorage`，首次访问跟随系统配色
- 顶部常驻连接与认证状态、最后同步时间、本地改动计数
- `webapi` 配置只读展示，不能通过前端修改或删除

## 环境要求

- Node.js 20+ 或 22+
- npm
- 一个已启动的 Koipy 后端，并启用 `webapi`

建议使用锁文件安装依赖：

```powershell
npm ci
```

## 本地开发

在项目目录运行：

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

浏览器访问：

```text
http://127.0.0.1:5173/
```

如果 Koipy API 和前端不同源，需要在 Koipy 配置里把前端来源加入：

```yaml
webapi:
  allowOrigins:
    - http://127.0.0.1:5173
```

## 连接 Koipy API

页面顶部有两个连接配置：

- `API 地址`：留空时使用同源 API；跨域部署时填写 Koipy Web API 地址，例如 `http://127.0.0.1:8899`
- `访问密码`：对应 Koipy 配置里的 `webapi.password`

也可以用 URL 参数预设 API 地址：

```text
http://127.0.0.1:5173/?apiBase=http://127.0.0.1:8899
```

密码只会保存在当前浏览器的 `localStorage` 中，且只有勾选“记住密码”时才会持久化。

## 构建

生产构建：

```powershell
npm run build
```

构建产物会输出到：

```text
dist/
```

本地预览构建产物：

```powershell
npm run preview -- --host 127.0.0.1 --port 4173
```

## 发布部署

Koiboard V3 是静态前端，发布时只需要部署 `dist/`。

常见部署方式：

- Nginx / Caddy / Apache 静态站点
- Vercel / Netlify / Cloudflare Pages
- Docker / Docker Compose（本仓库已内置）
- 和 Koipy Web API 放在同一域名下，由反向代理分发

推荐同源反向代理结构：

```text
https://example.com/          -> Koiboard V3 dist/
https://example.com/api/*     -> Koipy Web API
```

如果前端和 Koipy API 分离部署，必须在 `webapi.allowOrigins` 中加入前端 origin。不要用不受控的通配来源暴露管理 API。

### Docker 部署

仓库内置了 `Dockerfile`、`docker-compose.yml` 和 `nginx.conf.example`，用于「Nginx + 静态资源 + 反向代理 Koipy Web API」的一体化部署。

首次使用先复制一份本地 Nginx 配置：

```powershell
Copy-Item nginx.conf.example nginx.conf
```

然后编辑 `nginx.conf`，至少修改这些地方：

- `server_name`：改成自己的域名
- `ssl_certificate` / `ssl_certificate_key`：指向自己的证书路径（compose 默认挂载 `/root/koipy_cert` 到 `/etc/nginx/tls`）
- `$http_x_access_password != "..."`：把占位符替换成真实的 `webapi.password`，Nginx 会在转发到 Koipy 前校验该密码

构建并启动：

```powershell
docker compose up -d --build
```

`docker-compose.yml` 使用 `network_mode: host`，Nginx 通过 `127.0.0.1:8899` 访问宿主机上的 Koipy Web API，因此 Koipy 只需监听本机回环地址。健康检查请求 `/healthz`，正常返回 `ok`。

> `nginx.conf` 含明文访问密码，已加入 `.gitignore`，**不要提交到仓库**。需要改代理规则时，请同步更新 `nginx.conf.example`（其中密码位置保持占位符）。

## 安全注意

- `webapi.password` 应设置强密码
- 生产环境建议使用 HTTPS 或放在受信任反向代理后
- 不要把 Koipy Web API 直接暴露到公网且无访问控制
- `webapi` 在本前端中只读：UI 不提供编辑控件；高级 JSON 即使修改了 `webapi`，校验和写入前也会恢复为后端当前值
- 敏感字段默认脱敏显示，可在右侧 Inspector 中临时切换显示
- 部署用的 `nginx.conf` 含明文访问密码，只保留在本机；仓库里只提交 `nginx.conf.example` 占位版本
- 前端记住的访问密码只存在当前浏览器 `localStorage`，换设备或清缓存后需要重新输入

## 维护指南

主要目录：

```text
src/App.tsx                 # React 页面和组件
src/data/metadata.ts        # 分区、字段说明、脚本保留名、字段 schema
src/hooks/useKoipyConfig.ts # 加载、草稿、校验、保存、导出等状态逻辑
src/lib/api.ts              # API 地址、请求头、请求封装、YAML 导出
src/lib/configPath.ts       # YAMLPath 解析、读写、摘要、风险提示
src/lib/defaults.ts         # 新增规则/后端/脚本/命令/颜色断点默认值
src/lib/readOnly.ts         # 只读根配置保护，目前保护 $.webapi
src/types/config.ts         # 共享类型定义
index.html                  # 入口 HTML，含首屏主题初始化脚本
Dockerfile                  # 多阶段构建：node 构建 dist，nginx 托管
docker-compose.yml          # 一体化部署编排
nginx.conf.example          # 反向代理模板（密码为占位符）
docs/extracted-logic.md     # 从旧项目前端提取出的逻辑说明
```

主题与搜索：

- 主题模式存于 `localStorage` 的 `koiboard.theme`（`dark` / `light`）
- `index.html` 里的内联脚本在首屏渲染前写入 `data-theme`，避免深色/浅色闪烁
- 导航和视图样式都基于 `[data-theme]` 选择器覆盖，新增样式请同时提供浅色版本

字段说明维护：

- 优先参考 Koipy 的 `resources/config.example.yaml`
- 真实字段结构以 Koipy 当前 `config.yaml` 和 `/api/config` 返回值为准
- 修改字段路径时，同步更新 `src/data/metadata.ts`、相关视图组件和 `src/lib/configPath.ts` 中的风险规则

新增配置区块的建议步骤：

1. 在 `src/types/config.ts` 增加 `SectionId`
2. 在 `src/data/metadata.ts` 增加 `sections` 项和字段说明
3. 在 `src/App.tsx` 增加对应视图组件
4. 如果字段需要默认新增项，补充 `src/lib/defaults.ts`
5. 如果字段禁止前端修改，加入 `src/lib/readOnly.ts`
6. 运行 `npm run build`

依赖维护：

```powershell
npm audit
npm outdated
npm run build
```

升级依赖后提交 `package.json` 和 `package-lock.json`。

## Git 工作流

查看状态：

```powershell
git status --short
```

提交前至少运行：

```powershell
npm run build
```

建议提交信息沿用当前格式：

```text
:lock: make webapi read-only in frontend
:tada: initialize koiboard v3
```

## 常见问题

### 页面连接失败

检查：

- Koipy 是否启动
- `webapi.enable` 是否为 `true`
- `API 地址` 是否正确
- 访问密码是否匹配 `webapi.password`
- 跨域部署时 `webapi.allowOrigins` 是否包含当前前端 origin

### 浏览器提示 CORS

把前端来源加入 Koipy 配置：

```yaml
webapi:
  allowOrigins:
    - http://127.0.0.1:5173
```

保存并重载 Koipy 后再刷新前端。

### 保存后配置没有变化

确认你点的是：

- `写入内存`：只更新运行态，不一定写入文件
- `保存`：写入 `config.yaml`
- `保存并重载`：写入 `config.yaml` 并让 Koipy 重新加载

另外，`webapi` 是只读保护字段，前端不会写入它的改动。
