# Changelog

## [Unreleased]

## [v0.6.0] - 2026-08-03

### Changed

- 删除 v0.4 localStorage 凭据清理、裸 `*` 超级权限和菜单缺失字段推断，只接受当前 OpenAPI 菜单与权限契约。
- 删除 `src/app/messages/messageApi.ts` 兼容重导出，消息 API 与测试统一使用 `src/api/modules/messages.ts`；架构门禁禁止旧导入路径回流。
- 操作日志与登录日志导出请求只发送规范字段 `name`，不再发送旧的 `oper_name/user_name` 导出筛选字段。
- 公告表单、列表和生成 API 类型统一切换为 `content_markdown`，不再发送或读取旧 `content` 字段；前端从后端 OpenAPI 生成 60,000 UTF-8 字节限制并在提交前按字节校验。
- 部署配置只接受可选的 `VITE_APP_API_ORIGIN`；`/api/v1` 前缀改由后端 OpenAPI 的 `x-ryframe-api-prefix` 生成，删除 `VITE_APP_BASE_API` 及其旧路径回退。
- 删除全部无上限列表 API 与 `NoPage` 类型，不保留旧接口兼容；用户表单和角色分配改用租户级 `/roles/options` 远程前缀搜索，查询键包含 `q/limit`，输入防抖并通过 Axios `signal` 取消过期请求，编辑时保留已选角色。
- 消息中心的收件箱、未读数、加载与刷新状态迁移到 TanStack Vue Query，缓存键包含租户、用户及过滤/游标；WebSocket 投递直接更新 QueryClient，连接/重连和每 60 秒补拉按 ID 合并，确认送达、已读和全部已读统一使用 mutation，Pinia 只保留实时连接状态。
- 删除前端 Nightly 标签与独立 Release 工作流，前端只维护与后端一致的稳定 annotated tag，由后端作为唯一联合发布主控；稳定 Release 只保留 GitHub 自动生成的源码 ZIP/TAR，不上传 `dist`、镜像、SBOM、签名或其他自定义附件。
- 日常 CI 合并为单次依赖安装和单个 Node 24 质量作业，类型、Lint、覆盖率、生产构建、体积和浏览器验收顺序复用同一工作区；Playwright 直接预览已生成的生产构建。Node 22.18 兼容门禁改为每周独立执行，避免与日常主门禁重复编译。
- 覆盖率门禁以受架构守卫管理的核心 TypeScript 业务模块清单为范围，语句、行和函数阈值为 70%、分支为 60%；会话、认证、HTTP、用户状态、权限和消息关键模块分别执行 90%/80% 阈值，Vue 展示层继续由 Lint 与浏览器验收负责。
- 系统、平台、监控、个人资料和代码生成页面的服务端状态统一迁移到租户隔离的 TanStack Query/Mutation；读取支持取消，写操作统一 pending 防重并精确失效资源缓存。
- 异步导出统一使用 Mutation 管理任务创建、轮询和下载，整条链路透传 `AbortSignal`，租户切换或组件卸载会取消请求，同步重复点击只执行一次任务。
- 外观配置改为 Shell Settings Query，语言保存改为租户 Mutation；Store 只保留纯本地状态，Navbar 只吞用户取消而继续传播真实退出错误。
- 新增服务端状态架构清单与自测试，禁止管理页面回退到 `onMounted` 直拉、手工 loading/pending、注释式空 catch 或未登记的运行时 API 入口。

### Fixed

- 修复源码卫生扫描器把 YAML 中的 `docker://` 容器引用误判为斜线注释的问题，并增加词法回归测试，恢复前端 CI 的源码门禁。

## [v0.5.1] - 2026-08-02

### Changed

- GitHub Actions 统一升级到兼容 Node.js 24 的版本，消除托管运行器上的 Node.js 20 弃用警告。
- 合并重复的前端源码、类型、测试和构建检查，单次安装依赖后顺序复用工作区，减少重复运行和 CI 排队时间。
- 同步后端 v0.5.1 OpenAPI 契约并重新生成 TypeScript API 类型与密码策略。

### Fixed

- 关闭 `setup-node` 与当前 pnpm 布局不兼容的自动缓存，避免 CI 在缓存初始化阶段失败。
- 清理重复作业并统一 Action 运行时，恢复前端主分支的完整绿色门禁。
- 修复仪表盘租户与登录状态标签在入场过渡期间颜色被混合、短暂低于 WCAG AA 对比度的问题。

### Validation

- 前端门禁覆盖契约、源码卫生、工作流、依赖策略、架构、ESLint、Stylelint、类型检查、覆盖率、生产构建、体积预算和 Playwright E2E。
- 固定记录后端完整提交 SHA 与 OpenAPI SHA-256，确保 v0.5.1 前端可追溯到唯一后端契约。

## [v0.5.0] - 2026-07-18

### Added

- 生产构建支持 `VITE_APP_BUILD_COMMIT`，并在 dist 根目录生成 `build-identity.json`，供 RC 自动观察校验实际部署的前端提交。
- 新增应用级会话协调器，覆盖初始化、已认证、匿名和依赖不可用状态，并支持页面重载静默恢复。
- 新增 CSRF challenge、单标签 refresh single-flight 与 `BroadcastChannel` 多标签页会话协调。
- 新增 session、认证 API、HTTP client、用户 Store 和关键 Vue 组件测试，以及首屏与异步 chunk bundle budget 门禁。

### Changed

- 登录响应只接收 access token；refresh token 改由 API 域的 HttpOnly Cookie 保存，refresh 改为空请求体。
- Axios 普通与 raw transport 统一启用 credentials；access token、CSRF token 和用户会话只保存在 Pinia 协调器内存中。
- 应用启动和路由守卫等待会话初始化，刷新成功后统一恢复用户、权限和动态路由。
- 在线用户设备标识改为稳定 `sid`，健康检查切换为 `/livez` 与 `/readyz`，并同步 v0.5.0 OpenAPI 生成类型。
- Element Plus 组件与图标改为按需导入，生产构建启用严格的 JS/CSS 体积预算和零 warning 门禁。

- GitHub Nightly 改为仅在 `main` CI 成功后发布纯源码快照，不再安装依赖、构建或上传 `dist` 归档；发布前分页清理旧的自定义附件，页面只保留 GitHub 自动生成的 Source code（zip/tar.gz）。RC 与 stable 继续由后端联合门禁创建项目级源码 Release，前端只维护同名 tag，不提前独立发布。
- Nightly tag 改为 annotated tag，tag 说明和 Release body 共用从当前包版本 Changelog 精确提取的完整章节，不允许空说明或仅有版本标题。

### Removed

- 删除 access/refresh token 的 localStorage 持久化 API，并在首次启动时清理旧版 token 键。
- 删除旧 `RefreshRequest`、JSON `refresh_token` 响应字段和依赖 `X-Tenant-Id` 的刷新协议。

### Fixed

- 修复暗色模式下首页仍使用浅色背景、边框和快捷入口卡片，导致文字与内容显示异常的问题。
- 补齐 MySQL 基线菜单使用的按需图标注册，为未知数据库图标提供统一回退，并修复折叠侧栏子菜单弹层被裁剪的问题。
- 修复并发 `401`、多标签页同时刷新、服务端 refresh `409` 宽限重试及 `503` 依赖故障时的会话状态处理。
- 密码重置页读取一次性 URL token 后立即清除查询参数，避免 token 留在地址栏和浏览器历史中。
- 私有头像与文件统一经鉴权请求转换为 Blob URL，并保持头像 5 MiB、普通文件 10 MiB 和上传 120 秒提示一致。
- 修复 Playwright 冷启动首次进入懒加载页面时 Vite 依赖优化重载导致动态路由模块返回 `504` 的问题。
- 修复架构门禁依赖被 Git 忽略的 `.env.production`、导致 CI checkout 后必然缺失配置文件的问题；改为校验可提交的安全示例文件。
- 修复 Browser Smoke 在整页重载后尚未完成 Cookie 会话恢复便使 access token 过期的竞态；同时移除残留的 `ryframe_device` 测试数据与断言。

### Security

- refresh Cookie 不再暴露给 JavaScript；access token 与 CSRF challenge 仅保存在页面内存，登出始终清理本地会话状态。
- 认证请求统一携带 Cookie 与 `X-CSRF-Token`，不再从本地存储恢复明文 token。

### Validation

- session/auth/HTTP client 覆盖率门禁为 lines/functions/statements 90%、branches 80%；全部手写 TS/Vue 为 60%/50%。
- CI 覆盖 contract、源码架构、ESLint/Stylelint 零 warning、typecheck、unit/coverage、生产构建、bundle budget 与 Playwright E2E。
- Nightly 发布门禁校验 Changelog 章节至少包含一条更新项、tag 必须为 annotated tag、发布后 body 必须与提取内容完全一致，且自定义 Release assets 必须为零。

## [v0.4.2]

### Added

- 代码生成改为弹窗填写项目外的绝对输出目录，生成结果不再直接写入当前前端项目。
- 新增受保护对象存储图片加载逻辑，头像通过鉴权请求转换为可显示的 Blob URL。

### Fixed

- 修复生产环境头像上传后仍显示旧头像的问题。
- 修复头像上传请求超时配置及私有图片 CSP 显示问题。

### Changed

- 代码生成按钮改为先填写后端服务的绝对输出根目录，再将生成选项提交给后端，避免生成文件直接写入当前项目
- 私有对象存储头像统一通过鉴权客户端下载并转换为可显示的 Blob URL，上传后立即刷新个人页与导航栏头像
- 头像上传使用独立的 120 秒请求超时，适配生产环境的图片处理与对象存储延迟

## [v0.4.1] - 2026-07-17

### Changed

- 前端包版本与检入的后端 OpenAPI 快照统一升级到 `0.4.1`，保持发布标签、构建产物和 API 契约一致

### Fixed

- CI 与 Release 工作流显式设置 Git 初始化默认分支，消除 `actions/checkout` 的默认分支 warning 提示
- CI 与 Release 复用仓库内 pnpm 安装 Action，从 `packageManager` 读取精确版本并关闭安装审计噪声，消除第三方安装器的 v11 布局、Node `DEP0169` 和 bootstrap 审计警告

## [v0.4.0] - 2026-07-17

### Added

- 新增用户管理 `DepartmentTree` 组件和 `useUserManagement` composable，分离部门筛选、查询、提交与状态动作
- 新增角色、菜单和权限管理领域 composable 与表单对话框，页面只保留列表展示和交互编排
- 新增菜单树纯函数测试和统一 `confirmAction`，区分用户取消与真实请求失败
- 新增独立用户角色分配对话框
- 新增后端 OpenAPI 快照同步、`openapi-typescript` 生成和 Git diff 契约门禁
- 新增 API 架构与契约检查，覆盖 119 个操作、34 个查询操作、成功响应、写请求体和字符串 ID
- 新增基于 OpenAPI `x-ryframe-menu-routes` 和 TypeScript AST 的跨仓库页面注册表门禁
- 新增由 OpenAPI `x-ryframe-password-policy` 生成的密码策略、运行时验证器和契约一致性测试
- 新增工作台快捷入口与登录初始状态纯函数测试，覆盖权限筛选、开发凭据和安全重定向
- 新增 Playwright 浏览器冒烟测试与独立 CI job，覆盖登录、刷新恢复、动态菜单、权限拒绝、退出及移动端布局
- 新增运行时数据库拓扑表，分别展示主库、命名只读副本、`ryframe_device` 业务数据源、轮询策略及每个节点的动态连接状态

### Changed

- Release 工作流按触发标签精确提取对应版本说明，保留空的 `Unreleased` 区段且不再发布错误章节
- 用户管理页改为页面编排层，复用独立部门树、表单、角色分配、密码重置组件和领域 composable
- 密码重置完成请求统一显式发送 `tenant_id`、`request_id` 和一次性 token，并携带租户请求头
- 角色权限和数据范围改为资源化整体替换接口，数据范围只发送一次原子请求
- 用户创建一次提交资料与角色；资料、角色和状态更新分别使用资源根、`/{id}/roles` 和 `/{id}/status`
- 用户状态、角色数据范围和权限类型使用有限联合类型，移除任意字符串契约
- 14 个 API 模块统一通过 `src/api/contract.ts` 引用生成查询、请求体和响应模型，只保留请求函数和必要的语义窄类型
- CI 在类型检查前校验后端主分支契约、生成文件和 API 模块边界
- 运行时监控直接使用 OpenAPI 生成的主库/副本/业务数据源与对象存储健康类型，展示 RustFS 后端、端点和实际连通状态
- 导出函数改为使用各自 operation 的生成请求类型，并统一清除分页键
- 字典管理拆为类型/数据对话框与 `useDictManagement`，个人中心拆为资料、头像和密码组件，页面只负责组合与状态同步
- 首页改为基于真实会话和权限菜单的操作工作台，删除不存在的 Kafka、gRPC 能力说明及捐赠素材
- 密码重置、个人修改密码和租户管理员密码统一使用后端生成策略；开发模式才预填初始化账号，生产构建保持账号密码为空

### Fixed

- 重置用户查询时同步清空部门筛选，初始化字典和部门数据时使用独立失败处理
- 状态切换取消或失败时恢复原值，删除及状态请求失败不再被确认框捕获逻辑静默吞掉
- 修复公告创建人、个人资料部门和上传文件 ID 的前端契约可能退化为 JavaScript `number`，并纠正健康检查时间戳类型
- 修复导出查询携带 `page/page_size`，导致后端拒绝未知参数的问题
- 修复个人中心和字典管理在移动端维持固定双栏而导致面板裁切、横向滚动的问题
- 修复登录页默认密码与数据库初始化口径不一致，并拒绝外部、数组或登录页循环重定向
- 修复字典分页使用 Element Plus 已弃用 `small` 属性产生的浏览器控制台警告，源码门禁禁止该写法回流
- 修复服务监控页重复手写旧健康 DTO、继续读取已删除 `checks` 字段以及固定三栏在移动端溢出的问题

### Validation

- 源码卫生、ESLint `--max-warnings=0`、Stylelint `--max-warnings=0` 和 Vue TSC 全部通过
- 45 个 Vitest 测试全部通过；覆盖率为语句 91.62%、分支 86.05%、函数 97.87%、行 97.48%
- Vite 生产构建通过且无构建警告
- 3 个 Playwright 浏览器用例通过，覆盖主库/`ryframe_device`/RustFS 运行时页面及移动端无溢出，并保持控制台零 warning/error

---

## [v0.3.1] - 2026-07-15

### Added

- 增加 ESLint 与 Vitest 依赖，补齐前端静态检查与测试工具链
- 增加动态菜单路由和权限匹配单元测试，并设置覆盖率阈值
- 增加应用级 `SessionCoordinator`，统一刷新、退出和全局状态清理
- 增加可注入的导航守卫和 `RuntimeRouteRegistry`，覆盖身份切换时的动态路由清理
- 增加 Stylelint、源码卫生检查、`.editorconfig` 和 `.gitattributes`
- 增加只读运行时配置模块，启动时校验 API 基础路径

### Changed

- 将 Axios 传输层迁移到无 Store、Router 和 UI 依赖的 `shared/http`
- 将认证和菜单类型归还各自 API 模块，删除旧聚合 `api/types.ts`
- 将菜单到路由的转换提取为可独立测试的纯函数
- 区分 JSON、Blob 和文本请求返回类型，移除关键链路中的兼容式响应读取
- TypeScript 开启完整严格模式，业务源码移除显式 `any`，所有后端 64 位 ID 统一为字符串
- API 调用迁移到复数资源和根分页路径，删除旧接口 fallback
- 运行时监控改为展示数据库、Redis、对象存储和上传熔断器等真实后端能力
- 将用户编辑/角色分配和密码重置流程拆为独立组件，用户列表页只保留查询与编排
- CI 无条件执行源码卫生、ESLint、Stylelint、类型检查、覆盖率测试和生产构建，所有警告按失败处理
- `vite.config.ts` 窄范围过滤 `@vueuse/core` 的 Rolldown 纯注解误报，其余构建告警直接升级为构建错误
- 修正 pnpm 10 与 node_modules store 的不一致问题，重建依赖目录
- 分页查询统一发送 `page`/`page_size`，密码重置链接统一使用 `request_id`，与后端严格契约保持一致
- 源码卫生检查禁止 `pageSize`、`pageNum`、`searchValue` 和 `requestId` 等旧 API 字段回流
- 分页基类删除任意字符串索引，配置查询和字典数据查询改为显式字段，错误参数在开发期即可被类型检查发现

### Removed

- 删除未引用的业务/通用组件、指令、Hook、Store、工具函数、图片和临时目录
- 删除旧 `api/request.ts`、`api/types.ts` 以及重复的 Axios/协议入口
- 删除仓库内 `.pnpm-store` 和本次检查生成的无用中间产物

### Validation

- `pnpm check:sources`
- `pnpm lint`
- `pnpm lint:styles`
- `pnpm typecheck`
- `pnpm test:coverage`
- `pnpm build`

---

## [v0.3.0] - 2026-07-01

### Added

- 新增租户管理和租户登录支持
- 新增密码重置功能
- 新增移动端响应式布局支持

### Changed

- 将权限指令统一调整为 `v-perm`
- 优化菜单关联权限的显示与数据处理
- 重构路由权限管理并完善移动端布局适配
- 调整开发服务器默认端口说明
- 更新 CI 使用的 pnpm 版本

---

## [v0.1.0] - 2026-06-17

### Added

- 首个 stable 版本发布
- Vue 3 + TypeScript 管理后台基础框架
- Element Plus 组件库集成
- Pinia 状态管理 + Vue Router 路由
- Axios 请求封装及 API 模块
- 系统管理：用户、角色、菜单、部门、岗位、字典、权限、通知、配置
- 监控管理：在线用户、操作日志、登录日志、服务监控、缓存、数据库连接池、运行时
- 代码生成工具页面
- 登录 / 个人中心 / 错误页面
- 通用组件：图标选择器、字典标签、部门树、分页、右键工具栏
- 指令：复制、防抖、节流、长按、水印、权限、懒加载
- 组合式 API hooks：useAuth、useCrud、useDict、useDownload、useForm、useLoading、usePermission、useTable、useTheme
- GitHub Actions CI 流水线（类型检查 + 构建）
- GitHub Actions Release 流水线（Nightly 自动发布 + Stable Tag 发布）

所有值得注意的项目变更都将记录在此文件中。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
