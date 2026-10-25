# RyFrame Vue3 开发指南

[English](ARCHITECTURE.en.md)

本文说明在 RyFrame Vue3 中添加页面、接入 API、管理状态、注册路由和编写测试的常用方式。

会话上下文严格校验 `password_change_required`；受限会话不能携带业务授权。该标志参与会话范围指纹，并由被动 User Store 保存投影，路由守卫引导到 `/change-password`，消息运行时停止业务连接。登录、首次改密和密码重置通过 `AuthLayout` 复用响应式布局。

## 选择代码位置

```text
src/
├── views/        # 页面壳与页面交互
├── components/   # 跨页面复用的展示组件
├── hooks/        # 可复用的页面查询与交互编排
├── app/          # 会话、消息、租户上下文、导出等跨页面流程
├── stores/       # 客户端跨页面状态
├── features/     # 页面、能力、权限和变体声明
├── router/       # 导航守卫与运行时路由
├── api/generated/operations/ # 按 core/system/platform/monitor 生成的 typed caller
├── api/modules/  # 只组织规范化、幂等、分页、校验和 raw session 策略
├── shared/       # HTTP、查询、安全和其他通用能力
└── styles/       # 设计 token 与全局布局
```

开发页面时通常从 `views/` 开始。页面内可复用的异步流程放入同目录 composable 或
`hooks/`，跨页面流程放入 `app/`，纯展示组件放入 `components/`。服务端请求从
`api/modules/` 调用，通用传输和查询能力位于 `shared/`。

页面或组件专属样式放在对应 Vue 的 `<style scoped lang="scss">` 中；多个组件共享的样式
保留独立 SCSS 文件。全局主题、布局、响应式规则与通用组件覆盖位于 `src/styles/`，
通过 `src/styles/index.scss` 统一引入。

全局入口先加载 Element Plus 官方暗黑变量，再应用项目语义色。主题切换会重新计算主色阶，深色背景向页面底色混合；标签保留各状态的语义色，树的悬浮态与选中态使用统一填充色。

## 添加页面

1. 在 `src/views/` 对应业务目录创建页面和局部组件。
2. 将表单转换、状态文案等纯逻辑提取到 model 或 presentation 文件。
3. 将列表查询、保存、删除等页面流程提取到 composable。
4. 在 `src/features/core/pages.ts`、`system/pages.ts` 或 `platform/pages.ts` 添加页面声明。
5. 业务能力页面在对应的 `src/features/<feature>/manifest.ts` 中填写 route key、路径、权限和
   capability。基础管理页面不登记套餐能力，业务写权限通过领域页面清单独立维护。
   首批可选能力为公告和主动消息，`standard` 变体配置必须是严格空对象；目录与编辑器不一致时禁止保存。
6. 启动开发服务器，用具备相应权限的会话打开菜单并验证加载、空数据、失败和保存流程。

页面声明会汇入 `src/features/registry.ts`，会话加载后由路由投影生成可访问菜单和动态路由。
租户和套餐管理页面声明 `requiresMultiTenancy`，路由投影与直接地址访问使用同一运行模式限制；配置迁移和数据维护在单租户仍可用。全局业务页面声明 `requiresSystemTenant`，菜单投影和直接地址访问读取权威会话的租户标识，缺少身份或非系统租户时拒绝访问，权限通配符不能绕过。模式由后端版本接口确定，未成功获取前不假定多租户已开启。
排查页面无法打开时，可依次检查服务端菜单的 route key、页面声明、权限、capability 和当前
租户上下文。

## 接入 API

`scripts/api-artifact-manifest.json` 是 OpenAPI 派生文件的跨仓清单事实源。前端生成器与后端 Rust 契约事务读取版本 1 的 `files` 数组，并拒绝重复字段、重复路径及越界路径；新增派生文件时同步该清单和生成器，不能只增加文件而遗漏 ownership。

API 生成的暂存目录始终位于当前前端工作区的 `target/`。Windows 深层隔离目录通过文件系统调用边界的 namespace 路径创建临时目录，业务路径及 manifest 仍使用普通路径表达；暂存校验、备份恢复及后端受管文件事务保持原有边界，不改用系统临时目录。

后端接口变化后先在后端仓库运行 `cargo xtask generate api --write`。同步完成后：

`/business/` 接口及引用模型归入延迟加载的 `system` 分片，业务请求使用该领域的 typed caller。标准资源整数的位宽、符号和传输类型来自后端契约；生成前验证范围约束和有限枚举，越界或非规范十进制值会阻止生成。字符串传输的 `i64/u64` 使用文本或枚举控件，正文与查询保留十进制字符串，不经过 Number；数字控件在生成前被拒绝。此类字段的非空 minimum/maximum 也使用规范十进制字符串，生成前以 BigInt 校验完整类型范围及大小关系，数字边界和非法字符串均拒绝。Decimal 使用文本控件和十进制字符串，保留后端声明的精确值；超出列容量由服务端拒绝，禁止转换为 Number 或自动舍入。业务模型改变后通过后端生成器同步本次候选契约及页面，类型和 lint 通过后统一写入；业务页面 ownership 保存在 `.ryframe/generated.toml`，路由沿用生成目录的注册发现。默认页面使用同目录的 page.vue，`frontend_page` 可指定手写扩展页面。

标准表单中创建后不可修改的文本、数字和枚举字段在新建时可以输入，编辑时禁用并阻止更新事件回写；允许更新的字段仍可编辑。

公共 CRUD 契约与渲染器使用相同的控件类型约束：text 用于字符串、整数或 Decimal，textarea 用于字符串，number 用于整数，switch 用于布尔值，date、date_time、json 分别用于对应类型；select 必须提供有效有限枚举，hidden 不可编辑。字符串传输的精确数值仍禁止 number，JSON 保持原生 JSON 传输，nullable 与创建、更新的可选语义继续严格校验。

`scripts/resource-render/` 提供标准 CRUD 页面的纯渲染模块，模板与 TypeScript 表单转换逻辑在前端仓库维护。内部 `cli.mjs` 从标准输入读取版本为 1 的资源 IR 批次，只在标准输出返回确定排序的完整资产 JSON，不直接写入源码、ownership 或契约；输入上限为 16 MiB，结果上限为 64 MiB。每批显式绑定生成器版本，框架聚合入口由 `aggregate` 指定；重复资源、字段不完整或版本不支持时整批失败。后端候选生成流程负责资源校验、契约同步、审阅及受管文件安装。模板测试逐字节核对 Post、Notice，并验证宽模型拆分和严格 TypeScript 类型及运行时转换。

1. 在 `src/api/generated/operations/` 对应领域文件查找 typed caller。
2. JSON、multipart、文本和 Blob 传输由契约媒体类型自动绑定；媒体类型不唯一时生成会失败。
3. 业务只需在 `src/api/modules/` 中保留规范化、幂等键、分页、响应校验或 raw session 策略；
   没有这些策略时可直接调用生成 caller。
4. 从 `src/api/contract.ts` 取得 operation 的请求与响应类型。
5. 在页面 composable 或应用用例中调用请求函数。
6. 按当前项目可用的验证入口检查受影响模块。

可参考 `src/api/modules/post.ts` 中的导出筛选规范化。业务模块不得手写 URL、HTTP method，
也不得直接调用 `operationRequest`。OpenAPI 派生文件由后端生成接口统一更新。

## 导入与状态边界

脚本中的 Vue Router、Pinia、Element Plus 服务和类型必须显式导入。自动导入只覆盖 Vue
composition primitives；模板组件仍由 Vite 自动解析，组件类型写入 `src/components.d.ts`。

所有 `defineStore` 必须位于 `src/stores/`。Store 保持被动，不运行时导入 app、router、业务
API、QueryClient 或其他 Store；也不以 type-only import 引入 Vue Router、TanStack Query 或
Element Plus。权限 Store 只保存 `src/shared/navigation/routeProjection.ts` 定义的中立路由投影，
`src/router/routeProjectionAdapter.ts` 负责在 Router 边界转换。跨状态副作用放入 `src/app/`
coordinator。API module 不直接依赖外部 package，也不依赖 Router、Store、Query 或 UI；
`src/shared/http/` 只依赖 Axios 和同层纯模块。

## 管理状态

服务端列表、详情和 mutation 使用 TanStack Query。已认证服务端状态统一通过
`useServerStateQuery()` 和 `useServerStateMutation()` 接入；组件外的命令式 mutation 使用
`executeServerStateMutation()`，不要直接用原始 `useQuery()` / `useMutation()` 自建租户级缓存。Query Key
固定为 `server-state / tenantId / subjectId / sessionEpoch / resource / params`；业务代码只通过
`serverStateScopePrefix()`、`serverStateResourcePrefix()` 和完整 Key helper 操作缓存，不切片或手写前缀。
普通 access token 轮换不改变 `sessionEpoch`，主体、租户、授权或运行 epoch、角色、权限、capability
与菜单投影变化时才进入新一代范围。

切换会话时先中止旧 scope 的 signal，再递增 `sessionEpoch`、清理旧 Query/Mutation，应用已校验的
用户、租户与权限投影，最后发布新 scope。HTTP 请求同时绑定调用方 signal 与会话 signal；旧 epoch
响应不能更新上下文，旧 epoch 的 401 不能借用新 token 刷新或重放。Mutation 开始时捕获 scope，
完成后再次校验；过期 Mutation 统一按取消处理，不执行成功或失败回调、提示、缓存写入和失效操作。
请求在服务端仍可能已经提交，客户端保证的是旧结果不会写回新会话。

Pinia 适合主题、标签页和客户端投影等跨页面状态。登录、刷新、租户切换、消息连接和导出任务
这类包含多个状态源的流程，可放入 `src/app/` 由 coordinator 组织。

页面筛选可拆成表单草稿、已应用查询和最后一次成功查询。需要从已应用筛选创建导出时，复用
`src/shared/query/useAppliedListQuery.ts` 和 `src/app/exports/` 中的现有流程。

普通请求错误由全局提示展示。页面需要内联错误或处理特定状态码时，在请求选项中使用静默模式，
并在页面中展示对应状态；用户取消可直接结束当前交互。

## 会话与路由

登录和刷新响应直接携带同构的 `SessionContext`；`GET /auth/context` 返回相同结构，用于恢复或重新
校验当前会话。客户端只在完整快照校验通过后原子更新用户、租户、权限和动态路由。
运行时路由由页面声明与服务端菜单共同投影：

```text
SessionContext
  -> 校验权限与 capability
  -> 用 route key 查找页面声明
  -> 构建菜单和动态路由
  -> 注册路由并更新标签页
```

会话流程位于 `src/app/session/`，路由投影位于 `src/features/navigation/`，运行时注册位于
`src/router/`。开发身份或租户切换流程时，可在这些目录中分别定位会话编排、路由计算和路由
运行时处理。

路由页面所需文案由 `src/i18n/routeCatalogRegistry.ts` 按 route namespace 选择。首屏同步安装
`core`、`shell` 和全局导出中心文案，其余 catalog 与页面组件并行加载；同一 catalog 的并发请求
共享 pending promise，失败后清除 pending，下一次导航可以重试。每个 catalog 同时包含中英文，
因此已加载页面的语言切换保持同步，无需再次请求资源。新增业务页面时，应把默认 catalog 登记到
对应 namespace；跨域页面只显式追加确有需要的 catalog。

按钮展示可使用 `v-perm`，页面可访问性由页面声明中的权限和 capability 参与计算。403、功能
不可用和 404 页面可用于分别验证权限不足、能力缺失和未知路由。

## 构建入口

`corepack pnpm dev` 启动 Vite，`corepack pnpm build` 先执行 Vue TypeScript 检查，再构建生产产物。
`corepack pnpm check` 校验当前契约与派生文件；`--full` 执行契约、静态检查、类型检查、工具测试、
单测覆盖率及生产构建，`--plan` 只展示同一任务图。独立阶段使用 `--stage contract|static|unit|build|browser`。
`corepack pnpm generate --check` 只读检查派生文件，显式 `--write` 才更新；后端契约同步使用上述正式入口。
CI 执行对应阶段，浏览器阶段单独运行。

`--consumer-context <file>` 仅用于 contract/full。`scripts/consumer-context.mjs` 严格读取 UTF-8 JSON v1 的七字段协议：`format_version`、`arguments`、`backend_root`、`frontend_root`、`python_program`、`origin_tool_binding`、`tool_configuration`；拒绝重复或未知字段，前端根必须等于当前工作目录。五对参数继续校验消费契约，来源绑定固定为后端 `.local-tests/frontend-origin-tool.json`，工具配置按后端实际存在的 `config/tools.toml`、`.local-tests/tools.toml` 排序绑定。配置、上下文、来源绑定和来源路径拒绝 ParentDir、链接和祖先重解析点，任务前后核对上下文摘要、绑定字节数/摘要及配置存在性集合/摘要。Python 入口独立校验为不含 ParentDir/控制字符的绝对路径，允许显式选择指向普通可执行文件的 symlink；始终保留 venv 入口调用，不改写为 canonical 目标，并在任务前后复核入口/目标身份和目标内容摘要。带上下文的任务图为 contract→consumer-proof；full 继续执行原有静态、unit 和构建任务。`--plan` 只展示相同任务图，不读上下文或派生进程。普通单仓 unit/contract/full 不读取后端绑定。

跨语言证明位于 `scripts/contract-tests/frontend-python-receipt.mjs`，不在 unit 通配符中；它保留七个实际 Node 生产者→Python validator 场景，并从同一上下文选择 Python 与后端。手动执行仍可显式传 `--python <绝对路径> --backend-root <绝对路径>`，不得与 `--consumer-context` 混用；缺少来源绑定或发生漂移时失败，不跳过证明。

## 编写与运行测试

- `tests/unit/`：纯模型、composable、Store、应用用例和组件测试。
- `tests/browser/`：使用确定性 fixture 的登录、权限、CRUD、导出和租户上下文测试源码。
- `tests/browser-business/`：在隔离业务 crate 夹具上，通过正式 API 准备业务样本，使用 Chrome 的平台页面验证跨库迁移、保留期、取消和崩溃恢复。运行 `corepack pnpm check --stage browser --real --fixture business --server preview`；运行绑定、构建收据和静态响应审计必须完整，缺少场景或发生重试时验收失败。

公开应用配置由 `scripts/application-config.mjs` 统一读取 `app.toml` 与必需的 `app.<APP_ENV>.toml` 并投影，Vite、客户端与构建来源共用该事实。`envDir:false` 与 `envPrefix:[]` 禁止旧项目环境自动读取及暴露，保留 Vite 内置 `DEV`、`MODE`。`APP_ENV` 独立选择 dev/test/prod 文件，mode 不改变该选择；普通文件、祖先重解析点、严格 UTF-8、字段及读取期间漂移均校验。TOML 由 `smol-toml` 1.9.1 解析，显式拒绝 unsafe keys，超大整数保留 BigInt，inline 深度限制为 32；既定字段类型拒绝特殊数值、日期时间和数组，错误只取安全正整数行列。工具目录选择来自 `config/tools.json` 与优先级更高的忽略文件 `.local-tests/frontend-tools.json`，允许 `application_config_dir`、`api_contract`、`real_browser` 与 `browser_smoke`；公开配置与私有测试控制输入分开。

运行时只读取强类型 `__RYFRAME_PUBLIC_CONFIG__={apiOrigin}`，API 前缀继续由唯一生成契约提供，HTTP 与 socket 共用原有地址规范化逻辑。配置结构及操作示例见 [README](README.md#运行配置)。

Vite 直接或间接导入的公开配置、工具配置选择、身份及 JSON 解析实现同时计入产品与工具来源摘要；只修改验收脚本仍只改变工具摘要。显式 `--source-commit` 的普通发布构建也执行任务前后来源核对。外部恢复构建在同源检查后将已验证配置与采集上下文再次比较，配置漂移时不派生 Vite。

构建身份由 `scripts/build-identity.mjs` 读取固定 `.local-tests/build/source.json`；普通 wrapper 原子写 development，显式 `--source-commit <SHA>` 核对干净 Git HEAD 后写正式值。v3 前端构建收据的上下文只含 `command/mode/target/toolchain/configuration/identity`；配置绑定环境、目录及实际公共/环境/工具文件的有序路径和摘要，身份绑定提交与来源文件。构建前后核对来源、配置与身份，产物 `build-identity.json` 必须匹配。核验按收据保存的环境重读文件并核对完整产物，不继承当前 shell 的环境选择，也不接受旧 v2 前端构建收据。其他运行收据版本保持其既有协议。

真实 preview 先运行 `corepack pnpm build --real`，在类型检查和 Vite 构建前后核验来源，并把完整产物摘要写入忽略的生产目录。`corepack pnpm build --real --plan` 只展示同一任务图；普通 `corepack pnpm build` 保持类型检查与生产构建行为。

- `tests/browser-real/`：在明确登记的隔离 API、MySQL、Redis 和对象存储环境中执行真实 Chrome 流程。
  会话竞争测试准备普通账号时，`createOrdinaryUser` 在已登记的独立浏览器上下文中使用 `123456` 登录，验证受限上下文和强制改密路由，再通过页面改为 `Valid!Session123`，不使用管理员重置代替首次改密。`password-lifecycle.spec.ts` 单独覆盖这条正常路径及管理员发起重置、同源链接片段消费、页面重置、旧密码和旧会话失效、新密码登录。账号和角色继续通过 `sessionResources` 登记并按权威 ID 清理；同一固定客户的页面共用请求预算，六次登录（包含两次预期 `401`）均使用实际配置的共享登录账本，等待窗口不通过换地址或提高容量绕过。

`corepack pnpm check --stage unit` 执行工具测试、测试类型检查和单测覆盖率；
`corepack pnpm check --stage browser` 执行确定性浏览器 smoke。真实环境按登记配置执行
`corepack pnpm check --stage browser --real --fixture core --server dev`；恢复验收使用后端统一入口提供来源与资源绑定。
