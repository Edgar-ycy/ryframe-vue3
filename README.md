# RyFrame Vue3

RyFrame 的 Vue 3 管理端，使用 TypeScript、Vite、Element Plus、Pinia 和 TanStack Query，
通过 OpenAPI 契约连接 Rust 后端。

## 安装与运行

Node.js 和 pnpm 版本以 `.node-version`、`package.json#packageManager` 为准。

```bash
pnpm install --frozen-lockfile
pnpm dev
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
pnpm format                  # 格式化源码和文档
pnpm lint:fix                # 修复 TypeScript、Vue 和 JavaScript 风格问题
pnpm lint:styles:fix         # 修复 CSS、SCSS 和 Vue 样式问题
pnpm typecheck               # 检查应用与测试类型
pnpm test:unit               # 运行单元与组件测试
pnpm test:targeted-coverage  # 运行关键状态流程测试并生成覆盖率
pnpm test:browser-smoke      # 运行本地浏览器 smoke 测试
pnpm api:check               # 检查契约、派生文件和 operation 使用
pnpm check:fast              # 并行运行日常快速检查
pnpm check                   # 运行完整本地检查和生产构建
pnpm build                   # 生成生产构建
```

连接真实 API、MySQL 与 Redis 运行浏览器流程时使用：

```bash
pnpm test:browser-real
```

## 同步 API 契约

后端 DTO 或接口变化后，在后端仓库根目录运行：

```powershell
cargo api-sync
```

命令会更新 OpenAPI 快照、前端请求描述和派生类型，并完成一致性检查。同步后运行
`pnpm api:check`，再在 `src/api/modules/` 中接入对应 operation。

页面、API、状态、路由和测试的开发方式见 [ARCHITECTURE.md](ARCHITECTURE.md)。
