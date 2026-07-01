# Changelog

## [v0.3.0] - 2026-07-01

### Added

- 新增租户管理和租户登录支持
- 新增密码重置功能
- 新增移动端响应式布局支持

### Changed

- 将权限指令统一调整为 `v-perm`
- 优化菜单关联权限的展示与数据处理
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
