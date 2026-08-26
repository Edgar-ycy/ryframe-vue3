# RyFrame Vue3 架构

本文只记录稳定边界和开发约束。字段、operation、权限与页面目录分别以 OpenAPI、生成代码和源码注册表为准，不在文档中复制维护。

## 目录与依赖

```text
src/
├── app/          # 跨页面用例：会话、消息、租户上下文、导出
├── api/          # 生成契约入口和按资源组织的请求函数
├── features/     # capability、variant 与能力页面声明
├── shared/       # 配置、HTTP 传输和通用安全策略
├── router/       # 守卫、动态路由和页面注册表
├── stores/       # 客户端跨页面状态
├── hooks/        # 可复用交互与查询编排
├── components/   # 无页面所有权的展示组件
├── views/        # 页面编排
└── styles/       # 设计 token 和全局布局
```

目标依赖保持单向：

```text
main / composition root
├── router / page manifest -> views / components
└── app / use case -> stores / feature contract / api/modules
                                           -> operationRequest
                                                -> shared/http -> Rust API
```

| 边界                | 负责                                 | 禁止                                               |
| ------------------- | ------------------------------------ | -------------------------------------------------- |
| `shared/http`       | Axios、协议头、响应包络、刷新协调    | Store、Router、UI 和业务 API                       |
| `api/modules`       | operation descriptor 调用和语义别名  | 字面 URL、手写 method、消息与导航                  |
| `app`               | 跨页面用例和服务端状态协调           | 复制传输 DTO、直接拼 HTTP 请求                     |
| `features` contract | capability、权限和纯展示关系         | Store、Router、View 和会话运行时状态               |
| Store               | 客户端状态投影                       | app、Router、API 调用、QueryClient 和跨 Store 编排 |
| Router              | 守卫、页面 manifest 和路由运行时实现 | 被 app、Store、feature contract 和 View 反向依赖   |
| View                | 页面布局和交互                       | 读写 Token、拼接后端地址和直接操作 HTTP            |

`pnpm check:imports` 检查目录边界和运行时静态导入 SCC。类型导入仍受边界约束，
但不计入运行时环；page manifest 的动态页面加载受边界约束，但不计入初始化 SCC。
当前边界债务与运行时 SCC 均为零，不保留迁移基线；任何新增禁止边都会直接使检查失败。
`main` 作为组合根向 Router 注入应用用例，并向 `shared/http` 注入本地化端口，Router 与 app
不得互相运行时导入。生成代码不作为手写层参与复杂度约束，其模板和消费契约单独验证。

## 契约与请求

- `openapi/openapi.json` 是已提交的后端契约快照，`openapi/source.json` 固定来源提交和摘要。
- `src/api/generated/` 是唯一生成类型目录，只能通过 `pnpm api:sync` 更新。
- 请求必须绑定 operationId，并由生成类型约束 path、query、body 和 response。
- Blob、文本和 multipart 使用声明过的专用传输入口，不绕过 operation 目录。
- 所有 ID 使用 `string`，时间按后端契约传递带时区值。
- 契约破坏性变更直接同步所有调用方，不保留旧字段、旧路径或双读。

后端候选契约由同步 consumer job 检出指定前端完整 SHA 并运行 `pnpm consumer:check`。前端最终同步只能指向包含稳定契约的后端提交。

## 会话、权限与路由

登录、刷新和 `/auth/context` 返回同构的完整 `SessionContext`。应用先完整校验，再原子更新用户、租户上下文、权限和动态路由；校验或强一致刷新失败时清空上下文。

```text
SessionContext
  -> 权限与 capability 校验
  -> pageRegistry 校验 route_key
  -> 构建可访问菜单与动态路由
  -> 注册路由并裁剪旧标签页
```

- 后端不能指定任意前端组件路径。
- 缺权限进入 403，已知但缺 capability 的页面进入功能不可用页，未知路由进入 404。
- 超级管理员语义只取明确的会话字段或权限通配符，不根据角色名称推断。
- `v-perm` 和页面显隐只改善交互，不能替代服务端授权。
- 身份或租户切换必须移除上一上下文的路由、查询缓存和连接状态。

## 服务端状态与导出

TanStack Query 保存按租户、主体和查询参数隔离的服务端状态。Mutation 成功后按资源失效或精确更新缓存；页面卸载后停止无意义轮询。

每个失败只能有一个展示出口：普通用户命令使用全局错误提示；需要内联错误态或定制
409/422 交互时关闭全局提示并由调用方处理；后台轮询和预取使用静默模式。用户取消不提示，
catch 只用于恢复、回滚或转换局部状态，未处理的错误继续抛出。

筛选页面区分三种状态：表单草稿、已应用查询、最后一次成功查询。导出只读取最后一次成功查询：

```text
编辑草稿 -> 查询成功 -> 更新成功快照 -> 创建导出
                    查询失败 -> 保留上一成功快照
```

- 导出意图移除分页字段、trim 字符串并保留 `0` 与 `false`。
- 规范化后为空时必须二次确认，取消后不发送请求。
- 下载、取消和删除对同一任务互斥；网络未知结果使用同一幂等键重试。
- 删除成功或 404 后清除缓存并重拉窗口；409 则刷新状态并提示先取消。
- 跨标签页通过 `deleted` 事件同步，下载完成不会自动删除记录。

## 开发规则

新增 API：

1. 后端更新 DTO、路由和 OpenAPI，并提交候选契约。
2. 前端用 `pnpm api:sync` 同步精确后端提交。
3. 在 `api/modules` 添加 operation descriptor 调用，不复制 DTO。
4. 补单元、组件或契约测试，再运行 `pnpm check`。

新增页面：

1. View 只编排查询、命令和展示组件。
2. 可复用异步流程放 hook 或 `app`，纯转换保持无副作用。
3. 页面在注册表声明稳定 route key；能力页面同时声明 capability 和权限。
4. 加载、空数据、失败、禁用和重复提交状态必须完整。

代码不得使用 `any`、双重断言或兼容式多字段读取。只吞掉明确的用户取消，真实错误交给统一处理或继续抛出。

## 质量门禁

`pnpm check:fast` 并行运行源码规模、导入边界、Lint、应用类型和确定性单测，服务于本地反馈；
`pnpm check` 继续覆盖工作流、依赖策略、契约与生成物、测试类型、生产构建和体积预算。
TypeScript 与 Lint 增量缓存只写入被忽略的 `.local-tests`。源码规模门禁覆盖所有手写 TS、
Vue SFC 和样式；生成目录与声明文件除外。Prettier 不改写生成目录，首次全仓格式化必须使用
独立机械提交，建立基线后再把 `pnpm format:check` 加入完整门禁。

CI 另用 Chrome smoke 测试验证登录、筛选导出、下载和记录删除；定时任务执行 Node 兼容、pnpm audit、OSV、许可证策略和 CycloneDX SBOM。

交付前还要在真实 Chrome 完成受影响流程，检查网络请求与控制台；本次改动不得引入错误或警告。
