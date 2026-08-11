# RyFrame Vue3

现代化企业级后台管理系统前端，基于 Vue 3 + TypeScript + Element Plus 构建。前端与 Rust 后端分别使用独立 Git 仓库和 CI，通过 HTTP API 契约协作；两仓维护同名稳定标签，项目级源码 Release 由后端统一发布。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 语言 | TypeScript | ^6.0 |
| 框架 | Vue 3 | ^3.5 |
| 构建工具 | Vite | ^8.0 |
| UI 组件库 | Element Plus | ^2.14 |
| 状态管理 | Pinia | ^3.0 |
| 服务端状态 | TanStack Vue Query | ^5.101 |
| 数据可视化 | Apache ECharts | 6.1 |
| 路由 | Vue Router | ^5.1 |
| HTTP 请求 | Axios | ^1.17 |
| CSS 预处理 | Sass | ^1.101 |

## 功能模块

- **Dashboard**: 首页工作台，关键指标与快捷入口
- **系统管理**: 用户管理、异步用户导入、权限诊断、角色管理（菜单/权限/数据权限分配）、菜单管理、部门管理、岗位管理、字典管理、参数配置、通知公告
- **系统监控**: 运维总览、数据保留、后台任务、定时任务、在线用户、服务监控、操作日志、登录日志
- **首页活动图**: 仅在当前用户具有运维总览权限时异步加载，复用租户级趋势缓存，不增加无权限用户首屏体积
- **系统工具**: 代码生成
- **个人中心**: 个人信息编辑、密码修改、头像更新
- **消息中心**: 按租户和用户隔离的持久收件箱、未读计数、实时投递与补拉
- **权限控制**: 按钮级权限指令、角色权限、后端菜单驱动的动态路由

## 项目结构

```text
ryframe-vue3/
├── openapi/openapi.json   # 后端 OpenAPI 契约快照
├── src/
│   ├── app/session/        # Token 刷新、退出和会话协调
│   ├── app/messages/       # 消息查询、mutation 与 WebSocket 传输
│   ├── shared/             # 运行时配置、HTTP 基础层和生成式安全策略
│   ├── api/contract.ts     # 生成契约的稳定类型入口
│   ├── api/generated/      # OpenAPI 生成类型，禁止手工修改
│   ├── api/modules/        # 业务 API 请求函数和语义类型
│   ├── router/             # 守卫、动态路由、页面白名单和常量路由
│   ├── stores/             # Pinia 客户端跨页面状态与连接状态
│   ├── components/         # 布局和可复用组件
│   ├── directives/         # 权限和交互指令
│   ├── hooks/              # 组合式逻辑
│   ├── styles/             # 全局样式和设计 token
│   ├── utils/              # 无状态工具
│   ├── views/              # 页面编排
│   ├── App.vue
│   └── main.ts
├── scripts/                # 源码、架构和 API 契约检查
├── ARCHITECTURE.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 快速开始

### 环境要求

- **Node.js** 24.15.0（默认版本，见 `.node-version`）；CI 额外验证 22.22.2 兼容性
- **pnpm** 10.28.2（以 `packageManager` 字段为准，推荐通过 Corepack 使用）

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

开发服务器默认仅监听 `http://127.0.0.1:5173`，支持热模块替换（HMR）。可通过 `VITE_APP_DEV_HOST` 和 `VITE_APP_DEV_PORT` 覆盖。

### 构建生产版本

```bash
pnpm build
```

构建产物输出至 `dist/` 目录。

部署环境从稳定标签源码构建时，应嵌入当前完整提交 SHA：

```bash
test -z "$(git status --porcelain)"
VITE_APP_BUILD_COMMIT="$(git rev-parse HEAD)" pnpm build
```

该构建会在 `dist/build-identity.json` 中记录提交身份，供部署验收确认线上产物确实来自目标标签。GitHub 稳定 Release 不上传 `dist`，只保留平台自动生成的源码 ZIP/TAR。

### 完整工程检查

```bash
pnpm check
```

该命令依次执行工作流、依赖策略、本地 OpenAPI 来源与生成物、菜单 `route_key` 集合、密码和公告策略、ESLint、Stylelint、Vue TSC、生产构建和体积预算；任何警告都会使检查失败。

日常 push、pull request 和手动触发使用单个 Node 24 主质量作业；每周定时任务仅使用 Node 22.22.2 验证安装、类型检查和生产构建兼容性。

前端仓库不创建 Release 或 Nightly，也不发布构建产物、镜像、SBOM 或签名。前端只推送与后端一致的稳定 annotated tag，由后端联合门禁创建纯源码项目 Release。

### 同步 API 契约

后端接口变更后，应先提交最终后端契约并取得真实的 40 位提交 SHA，再从该提交对应的后端仓库快照生成前端类型：

```powershell
$env:RYFRAME_BACKEND_REPOSITORY='Edgar-ycy/ryframe'
$env:RYFRAME_BACKEND_COMMIT='<后端完整 40 位提交 SHA>'
$env:RYFRAME_BACKEND_WORKTREE='..'
pnpm api:sync
```

设置 `RYFRAME_BACKEND_WORKTREE` 后，同步脚本只会通过 `git -C <后端仓库> show <提交>:<契约路径>` 读取精确 Git 对象，不读取后端工作区文件；不设置时则读取完整提交对应的 GitHub Raw 地址。`pnpm api:check` 会在系统临时目录重新生成派生文件并只读比较仓库内容，不访问网络，也不会先覆盖受管文件。`pnpm api:check:upstream` 会按 `openapi/source.json` 中记录的后端仓库与完整提交 SHA 验证上游契约；不会读取浮动分支。API 模块通过 `src/api/contract.ts` 引用生成类型，逐步改用 operationId 请求门面，不手工复制 DTO、URL 或 HTTP 方法；密码、公告策略和编译期权限码同样从 OpenAPI 生成，不复制限制常量、正则或权限字符串联合类型。

### 预览构建结果

```bash
pnpm preview
```

## 配置说明

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_APP_TITLE` | 应用标题（显示在浏览器标签页） | `RyFrame 管理后台` |
| `VITE_APP_API_ORIGIN` | 可选 API origin；生产跨域部署必须使用 API 子域的绝对 HTTPS origin，不能包含路径 | `https://api.example.com` |
| `VITE_APP_BUILD_COMMIT` | 部署构建对应的完整 40 位 Git 提交 SHA | `0123456789abcdef0123456789abcdef01234567` |
| `VITE_APP_PROXY_TARGET` | 开发服务器代理的后端地址 | `http://localhost:8080` |
| `VITE_APP_DEV_HOST` | 开发服务器监听地址 | 默认 `127.0.0.1` |
| `VITE_APP_DEV_PORT` | 开发服务器监听端口 | 默认 `5173` |

API 版本前缀不再由环境变量维护，而是由后端 OpenAPI 的 `x-ryframe-api-prefix` 生成。开发环境未配置 `VITE_APP_API_ORIGIN` 时使用当前页面 origin 并经过 Vite 代理；生产部署从已提交的 `.env.production.example` 复制为被忽略的 `.env.production`，再填写实际 API 子域 origin。

### API 代理

开发环境下，Vite 开发服务器会将 `/api` 开头的请求代理到后端服务。代理目标在 `vite.config.ts` 中配置：

```ts
const proxyTarget = env.VITE_APP_PROXY_TARGET || 'http://localhost:8080'

server: {
  host: env.VITE_APP_DEV_HOST || '127.0.0.1',
  port: Number(env.VITE_APP_DEV_PORT || '5173'),
  proxy: {
    '/api': {
      target: proxyTarget,
      changeOrigin: true,
    },
  },
},
```

### 路径别名

`@` 映射到 `src/` 目录，可在项目中直接使用：

```ts
import { usePermission } from '@/hooks/usePermission'
```

## 核心特性

### 权限控制体系

- **路由权限**: 后端菜单树驱动动态路由注册，无权限页面不可达
- **按钮权限**: `v-perm` 指令实现按钮级显隐控制
- **角色权限**: 支持超级管理员通配符（`*:*:*`）与精确权限匹配

### 请求封装

- **Token 管理**: Bearer Token 自动注入，401 时自动刷新并重放排队请求
- **错误处理**: 统一 HTTP 状态码映射与业务错误码提示
- **响应适配**: 拦截器统一处理业务响应包络与文件下载响应

### 动态路由

- 首页加载时从后端获取用户菜单树，动态注册 Vue Router 路由
- 页面组件只能从本地 `pageRegistry.ts` 白名单解析，后端不能下发任意组件路径
- 首次路由导航自动 replace，避免回退到登录页

### 密码策略

- 个人修改、密码重置和租户管理员初始密码共用后端 OpenAPI 发布的策略
- 契约派生生成器生成只读策略配置，页面只调用统一验证器
- 密码修改成功后清理旧会话并返回登录页

## 与后端对接

本项目为前后端分离架构的前端部分，需搭配后端 API 服务使用。

> 🔗 **配套后端**: [RyFrame](https://github.com/Edgar-ycy/ryframe) — 基于 Rust + Axum 的现代化企业级后端框架，提供完整的认证授权、系统管理、监控运维等 API 服务。

后端 API 采用 RESTful 风格，统一响应格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {},
  "request_id": "019c1234-5678-7abc-8def-0123456789ab",
  "error_key": null,
  "details": null
}
```

分页接口的数据区包含 `items`、`page`、`page_size` 和 `total` 等字段。角色选择使用后端受限的 `/options` 候选接口，支持远程前缀搜索和请求取消；导出接口只发送业务筛选字段。

## 文档

- [架构与演进指南](ARCHITECTURE.md)：当前前端架构、主要耦合问题、目标依赖方向和分阶段改造计划。

## License

MIT
