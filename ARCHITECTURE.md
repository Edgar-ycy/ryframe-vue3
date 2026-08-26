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
├── api/modules/  # 按业务资源组织的请求函数
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

1. 在 `src/api/generated/operations.ts` 查找 operation descriptor。
2. 在 `src/api/modules/` 对应资源文件中添加语义化请求函数。
3. 使用 `requestOperation` 传入 path、query、body、header 或 signal。
4. 从 `src/api/contract.ts` 取得 operation 的请求与响应类型。
5. 在页面 composable 或应用用例中调用请求函数。
6. 运行 `pnpm api:check` 和相关单元测试。

可参考 `src/api/modules/post.ts` 中的导出请求。Blob、文本和 multipart 请求可参考已有同类
module 的调用方式。

## 管理状态

服务端列表、详情和 mutation 使用 TanStack Query。查询 key 可组合租户、当前主体和筛选参数，
mutation 成功后按页面需要失效查询或更新缓存。

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

按钮展示可使用 `v-perm`，页面可访问性由页面声明中的权限和 capability 参与计算。403、功能
不可用和 404 页面可用于分别验证权限不足、能力缺失和未知路由。

## 编写与运行测试

- `tests/unit/`：纯模型、composable、Store、应用用例和组件测试。
- `tests/browser/`：使用确定性 fixture 的登录、权限、CRUD、导出和租户上下文 smoke 测试。
- `tests/browser-real/`：连接真实 API、MySQL 与 Redis 的完整浏览器流程。
- `scripts/tests/`：契约生成、目录检查和开发脚本测试。

开发时可先运行相邻测试：

```bash
pnpm test:unit tests/unit/postPage.component.test.ts
pnpm typecheck:app
pnpm check:fast
```

修改路由、会话、消息、Cron 或设置流程后，可运行定向测试与浏览器 smoke：

```bash
pnpm test:targeted-coverage
pnpm test:browser-smoke
```

准备生产构建时运行：

```bash
pnpm check
```
