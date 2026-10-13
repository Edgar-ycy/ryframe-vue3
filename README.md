# RyFrame Vue3

RyFrame 的 Vue 3 管理端，使用 TypeScript、Vite、Element Plus、Pinia 和 TanStack Query，
通过 OpenAPI 契约连接 Rust 后端。

当前为 `0.x` 开发版本，需配合当前后端契约和全新数据库使用。支持用户、角色、菜单权限、产品套餐、多租户、监控、消息、调度、配置迁移、数据迁移和导入导出。个人中心提供资料、密码、头像和登录会话管理。基础管理遵循权限控制，通知公告和租户主动消息发布可按套餐启停；关闭不删除历史数据，也不关闭系统通知、调度、导入导出或备份恢复。

权限诊断区分授权缓存当前、版本落后、版本异常超前、缺失、未启用和不可用。缓存未启用不作为故障警告；异常超前时检查数据库恢复与缓存作用域，不能把它当成版本落后。

支持导出的列表可以勾选若干行，或点击“全选当前页”后导出；全选只包含当前页。翻页、刷新和切换会话会清空选择。未勾选时按最后一次成功应用的筛选导出所有匹配数据；筛选为空会提示“当前已应用筛选为空，将导出你有权查看的全部匹配数据。数据量可能较大，是否继续？”，确认后才创建导出任务。

## 安装与运行

Node.js 版本以 `.node-version` 为准；pnpm 由 Corepack 按 `package.json#packageManager` 固定。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

开发服务器默认监听 `http://127.0.0.1:5173`，并将 `/api` 代理到
`VITE_APP_PROXY_TARGET`。联调前先启动后端 API。

若登录返回成功，但页面提示“登录会话信息与当前接口契约不一致”，检查后端源码、
前端 OpenAPI 和数据库访问目录是否配套。租户信息完整时，旧菜单权限码也可能使会话
校验失败；已有开发版数据库需审阅具体权限与菜单差异后显式修正，不能仅通过刷新页面解决。

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
corepack pnpm dev       # 启动开发服务器
corepack pnpm check     # 核验当前 OpenAPI 与派生契约
corepack pnpm build     # 类型检查并生成生产构建
corepack pnpm generate  # 预览契约派生文件差异，写入需显式 --write
```

`corepack pnpm check --full` 依次检查契约、静态规则、测试类型、单元覆盖率和生产构建。
`--stage contract|static|unit|build` 可单独运行相应阶段，`--plan` 输出同一任务图且不执行任务。
浏览器 smoke 使用 `corepack pnpm check --stage browser`；真实后端联调使用隔离资源与对应的 real 配置。
仓库 CI 分别执行这些阶段，并保留 Windows 检查。

## 同步 API 契约

后端 DTO 或接口变化后，在后端仓库根目录运行：

```powershell
cargo xtask generate api --write
```

命令会更新 OpenAPI 快照、前端请求描述和派生类型。同步后在 `src/api/modules/` 中接入对应 operation。

页面、API、状态、路由和测试的开发方式见 [ARCHITECTURE.md](ARCHITECTURE.md)。

多租户登录通过名称搜索并选择租户，同名选项同时显示标识。租户列表加载失败可在选择框中重试；单租户模式自动使用系统租户。
