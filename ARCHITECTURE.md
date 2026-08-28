# RyFrame Vue3 开发指南

本文说明在 RyFrame Vue3 中添加页面、接入 API、管理状态、注册路由和编写测试的常用方式。

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
├── api/generated/operations/ # 按 core/system/platform/monitor/agent 生成的 typed caller
├── api/modules/  # 只组织规范化、幂等、分页、校验和 raw session 策略
├── shared/       # HTTP、查询、安全和其他通用能力
└── styles/       # 设计 token 与全局布局
```

开发页面时通常从 `views/` 开始。页面内可复用的异步流程放入同目录 composable 或
`hooks/`，跨页面流程放入 `app/`，纯展示组件放入 `components/`。服务端请求从
`api/modules/` 调用，通用传输和查询能力位于 `shared/`。

## 添加页面

1. 在 `src/views/` 对应业务目录创建页面和局部组件。
2. 将表单转换、状态文案等纯逻辑提取到 model 或 presentation 文件。
3. 将列表查询、保存、删除等页面流程提取到 composable。
4. 在 `src/features/core/pages.ts`、`system/pages.ts` 或 `platform/pages.ts` 添加页面声明。
5. 业务能力页面在对应的 `src/features/<feature>/manifest.ts` 中填写 route key、路径、权限和
   capability。
6. 启动开发服务器，用具备相应权限的会话打开菜单并验证加载、空数据、失败和保存流程。

页面声明会汇入 `src/features/registry.ts`，会话加载后由路由投影生成可访问菜单和动态路由。
排查页面无法打开时，可依次检查服务端菜单的 route key、页面声明、权限、capability 和当前
租户上下文。

## 接入 API

后端接口变化后先在后端仓库运行 `cargo api-sync`。同步完成后：

1. 在 `src/api/generated/operations/` 对应领域文件查找 typed caller。
2. JSON、multipart、文本和 Blob 传输由契约媒体类型自动绑定；媒体类型不唯一时生成会失败。
3. 业务只需在 `src/api/modules/` 中保留规范化、幂等键、分页、响应校验或 raw session 策略；
   没有这些策略时可直接调用生成 caller。
4. 从 `src/api/contract.ts` 取得 operation 的请求与响应类型。
5. 在页面 composable 或应用用例中调用请求函数。
6. 运行 `corepack pnpm api:check` 和相关单元测试。

可参考 `src/api/modules/post.ts` 中的导出筛选规范化。业务模块不得手写 URL、HTTP method，
也不得直接调用 `operationRequest`；运行 `corepack pnpm api:generate` 会更新五个领域 caller，连续生成
应保持零差异。

## 导入与状态边界

脚本中的 Vue Router、Pinia、Element Plus 服务和类型必须显式导入。自动导入只覆盖 Vue
composition primitives；模板组件仍由 Vite 自动解析，组件类型写入 `src/components.d.ts`。

所有 `defineStore` 必须位于 `src/stores/`。Store 保持被动，不运行时导入 app、router、业务
API、QueryClient 或其他 Store；跨状态副作用放入 `src/app/` coordinator。API module 不直接依赖
外部 package，也不依赖 Router、Store、Query 或 UI；`src/shared/http/` 只依赖 Axios 和同层纯模块。`corepack pnpm check:imports`
同时检查内部路径、外部 package、运行时环和 Store 定义位置。

## 管理状态

服务端列表、详情和 mutation 使用 TanStack Query。已认证服务端状态的 Query Key 固定为
`server-state / tenantId / subjectId / sessionEpoch / resource / params`；业务代码只通过
`serverStateScopePrefix()`、`serverStateResourcePrefix()` 和完整 Key helper 操作缓存，不切片或手写
前缀。普通 access token 轮换不改变 `sessionEpoch`，主体、租户、授权或运行 epoch、角色、权限、
capability 与菜单投影变化时才进入新一代范围。

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

登录和刷新从 `/auth/context` 获取 `SessionContext`，随后更新用户、租户、权限和动态路由。
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

## 编写与运行测试

- `tests/unit/`：纯模型、composable、Store、应用用例和组件测试。
- `tests/browser/`：使用确定性 fixture 的登录、权限、CRUD、导出和租户上下文 smoke 测试。
- `tests/browser-real/`：连接真实 API、MySQL 与 Redis 的完整浏览器流程。
- `scripts/tests/`：契约生成、目录检查和开发脚本测试。

开发时可先运行相邻测试：

```bash
corepack pnpm test:unit tests/unit/postPage.component.test.ts
corepack pnpm typecheck:app
corepack pnpm check:fast
```

修改路由、会话、消息、Cron 或设置流程后，可运行定向测试与浏览器 smoke：

```bash
corepack pnpm test:targeted-coverage
corepack pnpm test:browser-smoke
```

准备生产构建时运行：

```bash
corepack pnpm check
```
