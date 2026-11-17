# RyFrame Vue3

[English](README.en.md)

RyFrame 的 Vue 3 管理端，使用 TypeScript、Vite、Element Plus、Pinia 和 TanStack Query，
通过 OpenAPI 契约连接 Rust 后端。

当前为 `0.x` 开发版本，需配合当前后端契约和全新数据库使用。支持用户、角色、菜单权限、产品套餐、多租户、监控、消息、调度、配置迁移、数据迁移和导入导出。个人中心提供资料、密码、头像和登录会话管理。基础管理遵循权限控制，通知公告和租户主动消息发布可按套餐启停；关闭不删除历史数据，也不关闭系统通知、调度、导入导出或备份恢复。

权限诊断区分授权缓存当前、版本落后、版本异常超前、缺失、未启用和不可用。缓存未启用不作为故障警告；异常超前时检查数据库恢复与缓存作用域，不能把它当成版本落后。

普通新账号初始密码为 `123456`，管理员初始密码由后端初始化时显式设置。首次登录进入强制改密页，改密前不加载业务路由或连接消息中心；改密成功后重新登录。旧开发版普通账号密码未知时，由管理员在用户管理中发起密码重置，用户通过一次性链接自行设置密码；重置不会自动启用停用账号，成功改密后其他旧重置链接失效。登录与密码页面采用桌面左右布局，移动端单列，并随系统主题显示。

支持导出的列表可以勾选若干行，或点击“全选当前页”后导出；全选只包含当前页。翻页、刷新和切换会话会清空选择。未勾选时按最后一次成功应用的筛选导出所有匹配数据；筛选为空会提示“当前已应用筛选为空，将导出你有权查看的全部匹配数据。数据量可能较大，是否继续？”，确认后才创建导出任务。

## 安装与运行

先安装 `.node-version` 指定的 Node.js，并确认 Corepack 可用；缺少 Corepack 时按 [Corepack 官方安装说明](https://github.com/nodejs/corepack#how-to-install)安装。进入前端仓库根目录后，先运行下列版本核对命令：Node.js 应与 `.node-version` 一致，pnpm 应与 `package.json#packageManager` 固定版本一致。随后通过 Corepack 安装锁定依赖并启动开发服务器。

```bash
node --version
corepack --version
corepack pnpm --version
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

开发服务器默认监听 `http://localhost:5173`，并将 `/api` 代理到文件配置的 `server.proxy_target`。联调前先启动后端 API。安装、启动、日常联调和可选的开发检查都无需手工创建 Git 忽略目录。依赖、构建产物和测试报告由对应工具生成。

后端初始化与文件配置请在其独立仓库按[下载后首次运行](https://github.com/Edgar-ycy/ryframe/blob/main/README.md#下载后首次运行)操作。本前端公共 TOML 仅放浏览器可公开配置；后端明文凭据留在后端私有配置目录。

若登录返回成功，但页面提示“登录会话信息与当前接口契约不一致”，检查后端源码、
前端 OpenAPI 和数据库访问目录是否配套。租户信息完整时，旧菜单权限码也可能使会话
校验失败；已有开发版数据库需审阅具体权限与菜单差异后显式修正，不能仅通过刷新页面解决。

## 运行配置

项目配置只从公开 TOML 文件读取，环境入口仅 `APP_ENV`，精确接受 `dev`、`test`、`prod`，缺省为 `dev`。Vite 的 `production` mode 不会自动选择 `prod`。公开应用配置不再读取 `.env*` 或 `VITE_*` 覆盖；Vite 内置 `DEV`、`MODE` 继续可用。

```powershell
$env:APP_ENV = "dev"
corepack pnpm dev
```

默认目录为前端根下 `config`。可选 `app.toml` 提供公共默认值，再深合并必需的 `app.<APP_ENV>.toml`；公共文件缺失时，环境文件必须独立提供全部字段。未知字段、数组、非法类型、链接和错误 UTF-8 均拒绝，报错不回显原文或字段值。

| TOML 字段             | 用途与默认值                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| `api_origin`          | 浏览器 API origin，默认空字符串，使用页面同源；非空仅允许 HTTP(S) origin，不含凭据、路径、查询或片段 |
| `server.host`         | 开发监听地址，默认 `localhost`                                                                       |
| `server.port`         | 开发端口，默认 `5173`，范围 `1..65535`                                                               |
| `server.proxy_target` | 开发代理 HTTP(S) origin，默认 `http://localhost:8080`                                                |

应用 TOML 使用 `smol-toml` 1.9.1 解析，拒绝 unsafe keys；超出安全整数范围的整数保留为 BigInt 并按既定字段类型拒绝，不做隐式转换。inline object/array 深度上限为 32；语法错误只投影安全的正整数行列位置，不输出原文。工具配置、构建身份和收据继续使用各自的 JSON 协议。

API 前缀继续只由 OpenAPI 生成的 `apiPrefix.generated.json` 提供。浏览器包仅包含 `{apiOrigin}` 公开投影，不能放入密码、E2E、恢复或契约工具凭据。

`config/tools.json` 的默认值是公开空对象 `{}`。需要选择另一份公开应用配置时，可在该文件的 `application_config_dir` 中填写工作树外的目录，例如 `{"application_config_dir":"D:/deployments/ryframe/frontend-config"}`。相对路径从前端根解析，公开配置只填写可交付给浏览器的信息。框架维护验收可选用优先级更高的 `.local-tests/frontend-tools.json`。两份工具文件都可缺省，存在但内容无效时会报错。

```powershell
$env:APP_ENV = "prod"
corepack pnpm build
```

真实验收使用 `APP_ENV=test` 或显式选择的合适配置文件。`corepack pnpm build --real` 在执行前要求合并后的 `api_origin` 为空；否则修正报错所指的环境文件，构建工具不会覆盖或改写用户配置。

```powershell
$env:APP_ENV = "test"
corepack pnpm build --real
```

普通构建在固定受管 `.local-tests/build/source.json` 原子写入 `development` 身份。正式身份使用 `corepack pnpm build --real --source-commit <SHA>`，只接受目标干净 Git HEAD 的完整小写 SHA。身份不再从环境变量取得。`--plan` 仅解析参数、展示同一任务图，不读配置或 Git、不写身份、不派生进程。

显式传入 `--source-commit` 的构建，无论是否使用 `--real`，都会在任务前后核对完整源码、配置、身份和工具链；发生漂移时失败。发布使用的 `corepack pnpm build --source-commit <SHA>` 同样执行此核对，只有 `--real` 签发恢复构建收据。

真实构建签发 v3 收据，绑定三域源码、工具链、实际配置与工具文件路径/摘要、身份来源和全部产物；失败不签发，已有收据拒绝覆盖，构建中来源漂移拒绝。preview 只核验现有产物，不重建；它按收据保存的 `APP_ENV` 重读配置，不要求当前 shell 的选择相同。旧 v2 前端构建收据不再接受，需重新构建。

## 常用开发命令

```bash
corepack pnpm dev
corepack pnpm check
corepack pnpm build
corepack pnpm generate
```

`corepack pnpm dev` 启动开发服务器，`corepack pnpm check` 核验当前 OpenAPI 与派生契约，`corepack pnpm build` 完成类型检查和生产构建，`corepack pnpm generate` 预览派生文件差异；写入需显式 `--write`。

`corepack pnpm check --full` 依次检查契约、静态规则、测试类型、单元覆盖率和生产构建。 静态阶段同时检查中英文文档配对、语言切换、本地章节引用和命令示例。
`--stage contract|static|unit|build` 可单独运行相应阶段，`--plan` 输出同一任务图且不执行任务。

`unit` 和 `--full` 包含使用本机临时 HTTP 夹具的首页浏览器测试。Windows 使用已安装的 Chrome。Linux 上在运行前执行 `corepack pnpm exec playwright install --with-deps chromium` 安装锁定版本的 Chromium 和系统依赖。
跨仓消费者检查显式使用 `corepack pnpm check --stage contract --consumer-context <file>`（也可配合 `--full`），先验证契约，再执行真实 Node→Rust 收据证明；上下文绑定本次前后端目录、后端原生工具与配置摘要。普通单仓检查无需后端或 Python。`--plan` 不读取上下文，也不写文件或启动任务。
浏览器 smoke 使用 `corepack pnpm check --stage browser`；真实后端联调使用隔离资源与对应的 real 配置。每次 smoke 将 HTML 报告和测试附件分别保存在 `.local-tests/playwright/report/<dev或preview>/<代次UUID>/` 与 `.local-tests/playwright/results/<dev或preview>/<代次UUID>/`，失败时保留截图、视频和 trace，重跑不会覆盖之前的代次。
仓库 CI 分别执行这些阶段，并保留 Windows 检查。

### 框架维护验收

下列真实浏览器验收配置使用已登记的隔离运行环境。工具读取 `config/tools.json` 及优先级更高的维护验收文件 `.local-tests/frontend-tools.json`，顶层字段按文件覆盖，嵌套配置整体替换。实际账号、密码和本机路径只放在后者。示例数值须与所绑定后端的实际限流配置一致：

```json
{
  "real_browser": {
    "scopeId": "acceptance-local",
    "tenantId": "system",
    "username": "admin",
    "password": "<isolated-account-password>",
    "workerTool": {
      "root": "D:/project/rustProject/ryframe/tool-source",
      "binding": {
        "path": "D:/project/rustProject/ryframe/tool-source/.local-tests/frontend-origin-tool.json",
        "bytes": 1234,
        "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      }
    },
    "backendDir": "D:/project/rustProject/ryframe/ryframe",
    "runtimeDir": "D:/project/rustProject/ryframe/ryframe/.local-tests/acceptance-local",
    "requestCapacity": 100,
    "requestWindowSeconds": 60,
    "loginCapacity": 5,
    "loginWindowSeconds": 60,
    "loginBudgetState": "D:/project/rustProject/ryframe/ryframe/.local-tests/acceptance-local/login-budget.json",
    "channel": "chrome"
  },
  "browser_smoke": { "serverMode": "dev", "channel": "chrome" }
}
```

`real_browser.workerTool` 必须独立登记工具实际编译来源根 `root`，以及该根固定 `.local-tests/frontend-origin-tool.json` 的实际原始字节数 `binding.bytes` 和小写 SHA256 `binding.sha256`；示例的长度和摘要仅为格式示意，必须替换为主控登记文件的真实值，文件上限 4 MiB。工具来源可与业务后端不同；`backendDir`、`runtimeDir` 和 `scopeId` 始终指向被测业务环境。Worker 控制、导入 fixture、导出对象快照与删除复核、业务迁移门及历史保留期维护在调用前后复核完整工具源码、程序和固定绑定，并调用同一程序的原生来源核验以确认实际编译根；导出对象和迁移维护直接执行已绑定的原生程序，不隐式调用 Cargo 编译；长时间运行的迁移门先完成精确关闭，再复核来源。缺字段、漂移或未知结果均失败，不提供旧字段回退或自动重放。

```powershell
corepack pnpm check --stage browser --real --fixture core --server dev
corepack pnpm check --stage browser --real --fixture core --server dev --generated
corepack pnpm check --stage browser --real --fixture core --server dev --generated --spec generated-catalog-page.spec.ts
corepack pnpm check --stage browser --real --fixture core --server dev --generated --spec generated-tenant-migration.spec.ts
corepack pnpm check --stage browser --real --fixture business --server preview --plan
```

`permission-theme.spec.ts` 使用现有真实 core 浏览器入口和管理员 `real_browser` 配置，不拦截或伪造 API：核对权限诊断菜单 SVG、成功的权限树 GET、可见行与展开子行的操作布局，以及桌面/手机暗黑标签和树的对比度、横向滚动和 axe。仅打开新增对话框、选择本地父项并取消，不提交新增、同步、修改或删除权限。主题过渡结束后，通过 Playwright `info.outputPath` 保存暗黑列表/树 JPEG 和无凭据观察 JSON；该真实后端连线验收与原 `tests/browser/permission-theme.spec.ts` 的固定 fixture 场景分别保留。

`--spec` 只与 `browser --generated --real` 的 core 验收组合，接受小写字母、数字及连字符组成的单个 `.spec.ts` 文件名，不接受路径；省略时执行完整 generated 套件，无匹配测试仍失败。

真实浏览器验收将 HTML 报告与附件分别保存在 `.local-tests/playwright-real/report/<fixture>/<serverMode>/<产物代次>/` 和 `.local-tests/playwright-real/results/<fixture>/<serverMode>/<产物代次>/`。显式配置的 `runId` 用作产物代次，core 省略时使用本次运行控制器的 UUID。正式入口在启动 Playwright 前检查两个目录，已有目录或链接时停止并保留原产物。

`--generated` 仅用于 `browser --real` 的 core 验收，通过 `playwright.generated.config.ts` 独立选择 `tests/browser-generated/`。使用提供所选生成页面及匹配 API 的隔离环境：订单场景需要包含精确金额和 owner 数据范围的 `order` 模型，目录场景需要包含 JSON、可空 JSON 和布尔字段的系统租户专用 `catalog` 模型；完整套件需要两种模型。core 文件提供当前凭据和实际限流配置，不配置 `restore` 或 `credentialEndpoint`。入口保留原受管控制器、网络约束、预算和身份清理；提供所选生成页面与租户边界的定向证据，不签发原 business 四场景的整套迁移或恢复证明，也不执行这些原场景。`--plan` 只检查参数并展示任务图，配置限制在实际执行前校验。

`generated-tenant-migration.spec.ts` 需要多租户和已完成 up/verify 的 `shared-control`、`shared`、`dedicated-a`、`dedicated-b` 目标。它以原 owner 页面和会话核对三条完整订单的非空迁移，共享场景另验证跨租户拒绝及普通租户不能访问全局 Catalog。场景禁用自动重试，创建响应先留存再断言；新租户、套餐与迁移登记意图及实际标识，订单保留完整响应和行像。资源标记 `retained_for_fixture_teardown`，保留待主控核对，当前尚未绑定自动清理消费者；来源遵守自然 168 小时保留期及正式 finalize 的备份与归属条件，不自动重放未知写入、改时间或按前缀删除。

运行参数使用 `real_browser` 的 `fixture`、`serverMode`、`port`（默认 4174）、`runId`、`baseURL`、`gateEndpoint`、`previewResponseAudit` 和 `captchaCode`。业务套件和生成订单非空迁移验收都必须显式提供全新的 `runId`。正式业务 preview 还必须提供绝对 `previewResponseAudit` 路径。`baseURL` 只接受带端口的本机 HTTP 原点，外部服务的 IPC 通过绝对 `gateEndpoint` 显式绑定。`channel` 可用 `chrome`、`msedge` 及其 beta/dev/canary 通道；`chromium` 选择 Playwright 内置浏览器，缺省本机用 Chrome、CI 用内置浏览器。

恢复验收使用 `corepack pnpm check --stage browser --real --fixture core --server preview`。`real_browser.baseURL` 指向运行收据登记的受管生产站点。在 `real_browser.restore` 中完整提供 `bindings`、`runtimeReceipt`、`targetPlan`、`coordinatorDir`、`coordinatorSha`、`verifierDir`、`verifierSha` 和 `runnerSha`。路径必须为规范绝对路径，三项 SHA 必须为完整小写提交。协调后端、核验源码和测试 runner 分别核对各自的干净工作树；`verifierDir` 必须与 `real_browser.workerTool.root` 一致。协调后端保留原运行账本和证据，核验工具可以来自另一工作树。恢复租户密码放入 `real_browser.restorePasswords`，以租户 ID 为键。

登录前，测试 runner 使用 `real_browser.workerTool` 绑定的原生程序执行 `__source-evidence`，只读核验并冻结来源与目标的数据绑定。已有数据场景在 11 个参考租户中读取页面，再调用同一程序的 `__restore-dataset-verify-existing` 核验全部登记岗位样本和 256 个对象。核验仅读取业务数据和对象，登录和注销会修改会话。

业务测试前后，报告器重新绑定 `real_browser.workerTool`，在已登记的协调后端目录执行该程序的 `check recovery runtime verify`，核对运行收据、三端运行身份和完整前端产物。每次原生调用前后复核工具绑定。测试收据分别记录协调后端、核验源码与前端测试 runner 的根目录和提交，业务证明绑定该收据摘要；`verifier_sha` 指向核验源码提交。使用 `cargo xtask data restore verify`，通过 `--coordinator-root` 和 `--coordinator-sha` 绑定原协调证据，由登记的核验源码独立核验。

双侧恢复比较的 B0 基线使用原前端提交 `0087ea2ecf62530d042b9e52f5c950fb34c66d78`。测试 runner 通过同一恢复入口读取后端运行收据中登记的 `restore-legacy-b0-frontend-build`，由后端原生核验绑定目标计划、原基线来源和完整构建产物。B1 和普通正式前端构建仍使用 v3 构建收据。

统一检查通过 `scripts/run-browser.mjs` 传递 CLI 选项，在固定忽略路径 `.local-tests/browser-control.json` 独占登记控制器、代次、工具文件摘要和无凭据参数。工具文件运行期间漂移即失败；任务结束只清理自己未被替换的控制文件，异常遗留文件须先核查任务身份。`--plan` 只显示任务，不创建控制文件或启动进程。旧项目环境变量与浏览器通道环境覆盖不再读取；`APP_ENV` 继续只选择应用配置，操作系统与第三方工具环境仍可使用。

后端原生 DevEx 首页测量通过 `scripts/devex-homepage.mjs` 调用前端浏览器工具。该入口只接收控制器通过标准输入传入的 JSON，不读取项目配置环境变量，也不连接共享浏览器。控制器必须绑定本机 HTTP 原点、身份与固定客户地址、已建立的产物目录及其中的 `identity-selection.json`、当前前端 runner 的源码指纹；绑定不符或运行期间漂移会失败。Windows 使用本机 Chrome，Linux 使用已安装的 Playwright Chromium。测量账号须事先完成首次改密，验收环境须关闭验证码。每个身份使用独立上下文，登录后测量冷缓存或先预热再测量暖缓存，记录真实导航、LCP 和首页账号区可见耗时。标准输出仅包含单个 JSON 结果；失败项保留阶段与固定诊断码，不输出密码、请求正文或原始浏览器异常。此入口由 DevEx 控制器调度，不能替代正式业务验收。

## 同步 API 契约

按已提交的后端来源正式同步时，在前端运行下列命令；默认只校验和预览，显式 `--write` 才替换正式契约与来源清单。来源只能是完整的 40 字符提交 SHA。提供绝对 `--backend-worktree` 时只读取该 SHA 的 Git 对象，不读取工作区中的未提交文件；省略工作树时读取 GitHub 固定提交。`--openapi-path` 可指定不含路径穿越的仓库相对 JSON 路径，默认 `openapi/openapi.json`。

```powershell
node scripts/sync-api-contract.mjs --backend-repository owner/backend --backend-commit <SHA> --backend-worktree D:/project/rustProject/ryframe/ryframe
node scripts/sync-api-contract.mjs --backend-repository owner/backend --backend-commit <SHA> --backend-worktree D:/project/rustProject/ryframe/ryframe --write
node scripts/sync-api-contract.mjs --verify-local
node scripts/sync-api-contract.mjs --verify-upstream --backend-worktree D:/project/rustProject/ryframe/ryframe
```

同样的来源可写入工具文件的 `api_contract` 对象：`backend_repository`、`backend_commit`、`backend_worktree`、`openapi_path`；显式 CLI 值优先。校验模式不接受来源替换或 `--write`，上游核验始终使用正式 `openapi/source.json` 的来源。缺少固定来源、Git 对象不可读或上游正文不一致时失败，不回退到分支或工作区文件。

后端 DTO 或接口变化后，在后端仓库根目录运行：

```powershell
cargo xtask generate api --write
```

命令会更新 OpenAPI 快照、前端请求描述和派生类型。同步后在 `src/api/modules/` 中接入对应 operation。

开发自有业务时，后端 `cargo generate -- resource` 或启用 `schema-import` 的 `import` 可通过 `generator.sync_frontend=true` / `--sync-frontend` 同步本批契约与标准列表、表单和路由。先安装前端依赖；生成器在候选副本完成类型与 lint 检查后，只有 `--write` 才统一安装两仓文件。默认预览保持正式源码原样，`--no-sync-frontend` 可临时关闭同步；前端目录在后端工具配置中指定。

页面、API、状态、路由和测试的开发方式见 [ARCHITECTURE.md](ARCHITECTURE.md)。

多租户登录通过名称搜索并选择租户，同名选项同时显示标识。租户列表加载失败可在选择框中重试；单租户模式自动使用系统租户。

后端新配置默认单租户，登录页及导航栏不显示租户选择；租户和套餐管理不注册为可访问页面，配置迁移与数据维护仍可用。全局业务页面只允许系统租户访问，即使其他租户具备通配权限也不能显示菜单或通过直接地址访问。模式获取失败时显示重试，不猜测模式。亮暗主题采用统一语义色，支持响应式认证布局和单行权限操作列。
