# RyFrame Vue3

现代化企业级后台管理系统前端，基于 Vue 3 + TypeScript + Element Plus 构建，采用前后端分离架构，配套 Rust 后端 API。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 语言 | TypeScript | ^6.0 |
| 框架 | Vue 3 | ^3.5 |
| 构建工具 | Vite | ^8.0 |
| UI 组件库 | Element Plus | ^2.14 |
| 状态管理 | Pinia | ^3.0 |
| 路由 | Vue Router | ^4.6 |
| HTTP 请求 | Axios | ^1.16 |
| CSS 预处理 | Sass | ^1.100 |
| 工具库 | VueUse | ^14.3 |

## 功能模块

- **Dashboard**: 首页工作台，关键指标与快捷入口
- **系统管理**: 用户管理、角色管理（菜单/权限/数据权限分配）、菜单管理、部门管理、岗位管理、字典管理、参数配置、通知公告
- **系统监控**: 在线用户、服务监控、操作日志、登录日志
- **系统工具**: 代码生成
- **个人中心**: 个人信息编辑、密码修改、头像更新
- **权限控制**: 按钮级权限指令、角色权限、后端菜单驱动的动态路由

## 项目结构

```
ryframe-vue3/
├── public/                 # 静态资源（不参与编译）
├── src/
│   ├── api/                # 接口层
│   │   ├── modules/        #   业务 API 模块（auth/user/role/menu/dept/...）
│   │   └── request.ts      #   Axios 实例封装（拦截器、Token 刷新、错误处理）
│   ├── assets/             # 资源文件（图片、图标等）
│   ├── components/         # 全局组件
│   │   ├── business/       #   业务组件（部门树、字典选择器等）
│   │   ├── common/         #   通用组件（分页、图标选择器、工具栏）
│   │   └── layout/         #   布局组件（侧边栏、导航栏、标签页）
│   ├── directives/         # 自定义指令（权限、防抖、节流、水印等）
│   ├── hooks/              # 组合式函数（useAuth / useCRUD / useTable / useDict 等）
│   ├── router/             # 路由配置
│   │   ├── routes/         #   路由定义（常量路由 + 模块路由）
│   │   ├── index.ts        #   路由实例 + 前置守卫（动态路由注册）
│   │   └── permission.ts   #   权限路由生成
│   ├── stores/             # Pinia 状态管理
│   │   ├── app.ts          #   应用全局状态
│   │   ├── user.ts         #   用户认证状态
│   │   ├── permission.ts   #   权限/菜单/路由状态
│   │   ├── settings.ts     #   主题/布局设置
│   │   ├── tagsView.ts     #   标签页状态
│   │   └── dict.ts         #   字典数据缓存
│   ├── styles/             # 全局样式（SCSS 变量、混入、过渡动画）
│   ├── utils/              # 工具函数（Token 存取、树操作、表单校验、文件下载）
│   ├── views/              # 页面视图
│   │   ├── dashboard/      #   首页
│   │   ├── login/          #   登录页
│   │   ├── system/         #   系统管理（user/role/menu/dept/post/dict/config/notice）
│   │   ├── monitor/        #   系统监控（online/server/operlog/loginlog）
│   │   ├── tools/          #   系统工具（代码生成）
│   │   ├── profile/        #   个人中心
│   │   └── error/          #   错误页面（401/403/404/500）
│   ├── App.vue             # 根组件
│   └── main.ts             # 应用入口
├── .env                    # 默认环境变量
├── .env.development        # 开发环境变量
├── .env.production         # 生产环境变量
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 快速开始

### 环境要求

- **Node.js** >= 18
- **pnpm** >= 9（推荐）

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

开发服务器默认运行在 `http://localhost:80`，支持热模块替换（HMR）。

### 构建生产版本

```bash
pnpm build
```

构建产物输出至 `dist/` 目录。

### 预览构建结果

```bash
pnpm preview
```

## 配置说明

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_APP_TITLE` | 应用标题（显示在浏览器标签页） | `RyFrame 管理后台` |
| `VITE_APP_BASE_API` | API 基础路径 | `/api/v1` |

环境变量按 `development` / `production` 分别在 `.env.development` 和 `.env.production` 中配置。

### API 代理

开发环境下，Vite 开发服务器会将 `/api` 开头的请求代理到后端服务。代理目标在 `vite.config.ts` 中配置：

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8081',   // 后端服务地址
      changeOrigin: true,
    },
  },
},
```

### 路径别名

`@` 映射到 `src/` 目录，可在项目中直接使用：

```ts
import { useAuth } from '@/hooks/useAuth'
```

## 核心特性

### 权限控制体系

- **路由权限**: 后端菜单树驱动动态路由注册，无权限页面不可达
- **按钮权限**: `v-perm` 指令实现按钮级显隐控制
- **角色权限**: 支持超级管理员通配符（`*:*:*`）与精确权限匹配

### 请求封装

- **Token 管理**: Bearer Token 自动注入，401 时自动刷新并重放排队请求
- **错误处理**: 统一 HTTP 状态码映射与业务错误码提示
- **响应解包**: 拦截器自动处理分页数据（`rows` / `total`）提升

### 动态路由

- 首页加载时从后端获取用户菜单树，动态注册 Vue Router 路由
- 支持多端点降级：菜单树 API 不可用时，自动降级为权限码过滤静态路由
- 首次路由导航自动 replace，避免回退到登录页

### 字典缓存

- 字典数据按需加载并全局缓存，避免重复请求
- 多个页面共享同一字典实例，保持数据一致性

## 与后端对接

本项目为前后端分离架构的前端部分，需搭配后端 API 服务使用。

> 🔗 **配套后端**: [RyFrame](https://github.com/Edgar-ycy/ryframe) — 基于 Rust + Axum 的现代化企业级后端框架，提供完整的认证授权、系统管理、监控运维等 API 服务。

后端 API 采用 RESTful 风格，统一响应格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

分页接口额外包含 `rows` 和 `total` 字段。

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=Edgar-ycy/ryframe-vue3&type=timeline&logscale&legend=top-left)](https://www.star-history.com/?repos=Edgar-ycy%2Fryframe-vue3&type=timeline&logscale=&legend=top-left)

## License

MIT
