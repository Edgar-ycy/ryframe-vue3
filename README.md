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
corepack pnpm dev       # 启动开发服务器；追加 --preview 可预览已有生产产物
corepack pnpm check     # 并行运行日常完整快速检查
corepack pnpm build     # 生成生产构建并检查包体积
corepack pnpm generate  # 只读检查 OpenAPI 派生文件
```

需要完整门禁时运行 `corepack pnpm check --full`；自动修复格式和代码风格使用
`corepack pnpm check --fix`；定向单测使用 `corepack pnpm check --test <测试路径>`。
四类入口都可追加 `--plan`，以同一任务图预览参数、依赖、编译覆盖和允许写入，不执行任务或生成产物。
CI 和专项验收通过 `check --stage static|unit|contract|browser|tools` 选择任务阶段。

## CI 任务

| 类型         | 当前任务数 | 运行时机                      |
| ------------ | ---------: | ----------------------------- |
| 日常业务任务 |       5 个 | push 与 pull request          |
| 低频深度任务 |       2 个 | 每周、协调版本 tag 或手动触发 |

日常任务包括静态检查、单测、生产构建、浏览器 smoke 和 Windows smoke。浏览器任务复用当前 SHA 与 attempt 的构建产物，分别检查开发服务和生产 preview；仅重跑失败的浏览器任务而缺少该 attempt 的构建产物时，需要重新运行完整门禁。扩展 CI 负责 Node 22 兼容、许可证、物料清单和漏洞扫描。

连接显式隔离的真实 API、external Worker、MySQL、Redis 和 S3 兼容对象存储运行浏览器流程时使用：

```bash
corepack pnpm check --stage browser --real
```

设置 `RYFRAME_E2E_SCOPE_ID`、`RYFRAME_E2E_TENANT_ID`、`RYFRAME_E2E_USERNAME` 和 `RYFRAME_E2E_PASSWORD` 后运行写入场景。测试只创建带唯一标识的业务数据，环境回收由后端隔离资源流程负责。验证码开启时还需提供当前有效的 `RYFRAME_E2E_CAPTCHA_CODE`。本地默认使用 Google Chrome；`RYFRAME_E2E_BASE_URL` 可指定已启动的本机 Vite 代理，地址必须为回环地址。各浏览器场景经受信任的本机代理使用独立客户地址，后端限流配置保持生效。

手动运行完整真实测试时，还需将 `RYFRAME_E2E_RATE_LIMIT_CAPACITY` 和 `RYFRAME_E2E_RATE_LIMIT_WINDOW_SECS` 分别设为当前后端实际生效的 IP 限流容量与窗口秒数。跨租户测试会计入该客户端的后台请求，在准备和清理阶段等待可用预算；这两个输入只控制测试节奏，不改变服务端限流，也不将 429 当作成功。后端全栈自动化入口会从同一组运行配置传入这些值。

登录另需 `RYFRAME_E2E_LOGIN_RATE_LIMIT_CAPACITY`、`RYFRAME_E2E_LOGIN_RATE_LIMIT_WINDOW_SECS` 和绝对文件路径 `RYFRAME_E2E_LOGIN_BUDGET_STATE`。前两项由后端 `scripts/full_stack_rate_limit_config.py` 读取实际配置导出；账本放在忽略的本地测试目录。同一隔离环境的 dev 与 preview 必须共享账本，独立套件使用新路径。测试按固定场景客户地址和租户用户名共同预约登录预算，窗口耗尽时在点击登录前等待；失败或未完成尝试同样计费。账本损坏、配置变化或时间回退会明确失败，不自动清空已有预算。

用户导入样本由后端 `scripts/user_import_fixture.py browser` 根据实际下载的模板生成；用
`RYFRAME_E2E_BACKEND_DIR` 指定后端目录、`RYFRAME_E2E_PYTHON` 指定已安装后端检查依赖的
Python。生成器绑定模板和输出文件的 SHA-256，浏览器在上传已验证字节前再次核对并附加收据。
需要保留多轮报告时设置唯一的 `RYFRAME_E2E_RUN_ID`，测试产物写入该轮子目录。

上传边界套件按默认文件 10 MiB、头像 5 MiB 配置验收：4 MiB 文本、超过 2 MiB 的有效 PNG，以及增加 3 MiB 未压缩成员的真实 XLSX 模板。用户导入仍验证原有成功、重复和失败三类业务行；畸形表单与分块超限请求分别要求 400、413，传输失败不计为通过。

排队取消和故障场景还需要 `RYFRAME_E2E_RUNTIME_DIR` 指向后端全栈启动流程生成的运行目录，本地设置 `RYFRAME_E2E_MYSQL_CLIENT` 为 MySQL 客户端的绝对路径。测试通过 `scripts/full_stack_worker.py start|stop|crash|status --backend-root <后端目录> --runtime-dir <运行目录>` 控制已登记 Worker；配置、构建摘要、scope 或进程创建身份不匹配时拒绝操作，重启后按最新收据回收进程。真实会话竞争使用测试进程内的同源透明代理，整份延迟响应包含 Cookie，生产服务无需增加测试接口。

生产构建验收先运行 `corepack pnpm build --real`，再设置 `RYFRAME_E2E_SERVER=preview` 运行 `corepack pnpm check --stage browser --real`。真实构建必须由 `packageManager` 固定版本的 Corepack pnpm 启动；收据会绑定 Node、实际 pnpm、Vite、production 环境文件、产品与工具来源以及完整 `dist` 清单。未设置 `RYFRAME_E2E_BASE_URL` 时，内置 preview 启动前会核对构建收据、当前源码、环境文件、工具链与全部产物摘要；使用外部代理时，需由启动该代理的流程核验对应构建来源。真实构建显式使用同源 API，覆盖本机 `.env.production` 的 API 地址而不修改配置文件；测试仅允许访问本机代理地址，越界请求会被阻止并导致失败。开发服务器与 preview 的 trace、截图、视频和 HTML 报告分别保存在 `.local-tests/playwright-real/` 的对应目录中；fixture smoke 使用 `corepack pnpm check --stage browser`。

正式恢复浏览器验收由后端恢复控制器同时提供 `RYFRAME_RESTORE_BINDINGS`、`RYFRAME_RESTORE_TARGET_PLAN`、`RYFRAME_RESTORE_RUNTIME_RECEIPT`、`RYFRAME_RESTORE_BACKEND_DIR`、`RYFRAME_RESTORE_VERIFIER_SHA` 和 `RYFRAME_RESTORE_RUNNER_SHA`；缺少任一项都会在创建报告或启动服务前失败。目标计划绑定被测产品前后端，verifier SHA 绑定复核证据的干净后端提交，runner SHA 绑定执行当前测试代码的干净前端提交，因此 B0 产品前端可以由最终候选 runner 验收。`RYFRAME_RESTORE_REFERENCE_PLAN` 仍只用于恢复前已有业务数据的只读核验，不作为运行来源权威。

## 同步 API 契约

后端 DTO 或接口变化后，在后端仓库根目录运行：

```powershell
cargo xtask generate api --write
```

命令会更新 OpenAPI 快照、前端请求描述和派生类型，并完成一致性检查。同步后运行
`corepack pnpm check --stage contract`，再在 `src/api/modules/` 中接入对应 operation。仅重新生成
当前契约的前端派生文件时，运行 `corepack pnpm generate --write`。

页面、API、状态、路由和测试的开发方式见 [ARCHITECTURE.md](ARCHITECTURE.md)。
