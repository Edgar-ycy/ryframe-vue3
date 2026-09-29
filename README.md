# RyFrame Vue3

RyFrame 的 Vue 3 管理端，使用 TypeScript、Vite、Element Plus、Pinia 和 TanStack Query，
通过 OpenAPI 契约连接 Rust 后端。

当前为 `0.x` 开发版本，需配合当前后端契约和全新数据库使用。用户、角色、菜单权限、产品套餐、多租户、监控、消息、调度、配置迁移、数据迁移和导入导出继续保留；Agent 查询、用户委托和服务账号相关入口已移除。个人中心继续提供资料、密码、头像和登录会话管理。

## 安装与运行

Node.js 版本以 `.node-version` 为准；pnpm 由 Corepack 按 `package.json#packageManager` 固定。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

开发服务器默认监听 `http://127.0.0.1:5173`，并将 `/api` 代理到
`VITE_APP_PROXY_TARGET`。联调前先启动后端 API。

## 运行配置

| 变量                    | 用途                                       |
| ----------------------- | ------------------------------------------ |
| `VITE_APP_TITLE`        | 浏览器标题                                 |
| `VITE_APP_API_ORIGIN`   | 生产 API 的绝对 HTTPS origin               |
| `VITE_APP_PROXY_TARGET` | 本地代理目标，默认 `http://localhost:8080` |
| `VITE_APP_DEV_HOST`     | 开发监听地址，默认 `127.0.0.1`             |
| `VITE_APP_DEV_PORT`     | 开发端口，默认 `5173`                      |

本地环境值可放入 `.env.development`，生产环境值可放入 `.env.production`。API 版本前缀
由 OpenAPI 契约提供。

## 常用开发命令

```bash
corepack pnpm dev    # 启动开发服务器
corepack pnpm build  # 类型检查并生成生产构建
```

前端自动化 CI 与任务图已移除；当前仓库不提供对应的检查、生成或浏览器验收命令。

## 同步 API 契约

后端 DTO 或接口变化后，在后端仓库根目录运行：

```powershell
cargo xtask generate api --write
```

命令会更新 OpenAPI 快照、前端请求描述和派生类型。同步后在 `src/api/modules/` 中接入对应 operation。

页面、API、状态、路由和测试的开发方式见 [ARCHITECTURE.md](ARCHITECTURE.md)。
