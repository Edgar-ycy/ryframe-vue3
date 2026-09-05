# RyFrame Vue3

RyFrame 的 Vue 3 管理端，使用 TypeScript、Vite、Element Plus、Pinia 和 TanStack Query，
通过 OpenAPI 契约连接 Rust 后端。

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
corepack pnpm dev       # 启动开发服务器；追加 --preview 可预览已有生产产物
corepack pnpm check     # 并行运行日常完整快速检查
corepack pnpm build     # 生成生产构建并检查包体积
corepack pnpm generate  # 只读检查 OpenAPI 派生文件
```

完整本地检查与生产构建使用 `corepack pnpm check --full`；自动修复格式和代码风格使用
`corepack pnpm check --fix`；定向单测使用 `corepack pnpm check --test <测试路径>`。
CI 和专项验收通过 `check --stage static|unit|contract|browser|tools` 选择任务阶段。

## CI 任务

| 类型         | 当前任务数 | 运行时机             |
| ------------ | ---------: | -------------------- |
| 日常业务任务 |       5 个 | push 与 pull request |
| 低频深度任务 |       2 个 | 每周或手动触发       |

日常任务包括静态检查、单测、生产构建、浏览器 smoke 和 Windows smoke。扩展 CI 负责 Node 22 兼容、许可证、物料清单和漏洞扫描。

连接真实 API、MySQL 与 Redis 运行浏览器流程时使用：

```bash
corepack pnpm check --stage browser --real
```

## 同步 API 契约

后端 DTO 或接口变化后，在后端仓库根目录运行：

```powershell
cargo xtask generate api --write
```

命令会更新 OpenAPI 快照、前端请求描述和派生类型，并完成一致性检查。同步后运行
`corepack pnpm check --stage contract`，再在 `src/api/modules/` 中接入对应 operation。仅重新生成
当前契约的前端派生文件时，运行 `corepack pnpm generate --write`。

页面、API、状态、路由和测试的开发方式见 [ARCHITECTURE.md](ARCHITECTURE.md)。
