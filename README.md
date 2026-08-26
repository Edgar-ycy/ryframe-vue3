# RyFrame Vue3

RyFrame 的 Vue 3 管理端，使用 TypeScript、Vite、Element Plus、Pinia 和 TanStack Query，
通过 OpenAPI 契约与 Rust 后端协作。

## 快速开始

环境版本以 `.node-version` 和 `package.json#packageManager` 为准。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

开发服务器默认监听 `http://127.0.0.1:5173`，并将 `/api` 代理到 `VITE_APP_PROXY_TARGET`。

## 常用命令

```bash
pnpm check:fast              # 并行本地快速反馈
pnpm check                   # 完整质量门禁
pnpm test:unit               # 确定性单元与组件测试
pnpm test:targeted-coverage  # 关键状态机定向覆盖率门禁
pnpm test:browser-smoke      # Chrome 关键流程 smoke 测试
pnpm test:browser-real       # 连接真实后端的浏览器测试
pnpm api:check               # 本地契约、生成物和 operation 使用检查
pnpm check:supply-chain-policy # 依赖与许可证策略检查
pnpm build                   # 生产构建
```

需要生成 CycloneDX SBOM 时运行：

```bash
pnpm sbom:generate -- --output artifacts/ryframe-vue3.cdx.json
```

## API 契约

`openapi/openapi.json` 保存后端契约，`openapi/source.json` 保存来源版本与内容摘要。
`src/api/generated/` 只能由脚本生成，禁止手工修改。

在后端仓库根目录同步候选契约：

```powershell
cargo api-sync
```

`cargo api-sync` 会生成、校验并安装 OpenAPI 与前端派生文件，任一步失败都会恢复原状态。
底层 `pnpm api:sync` 是仓库内部实现，不作为日常入口。API 模块必须使用生成的 operation
descriptor，不得手写 URL、HTTP method 或重复 DTO。

Post 与 Notice 的标准 CRUD、页面注册和权限聚合由资源清单生成；中央 Router、页面注册表、
权限聚合及标准 CRUD API 不保留手工注册触点。导出和消息发布等非标准能力放在单一强类型扩展中。

## 运行配置

| 变量                    | 用途                                       |
| ----------------------- | ------------------------------------------ |
| `VITE_APP_TITLE`        | 浏览器标题                                 |
| `VITE_APP_API_ORIGIN`   | 生产 API 的绝对 HTTPS origin               |
| `VITE_APP_PROXY_TARGET` | 本地代理目标，默认 `http://localhost:8080` |
| `VITE_APP_DEV_HOST`     | 开发监听地址，默认 `127.0.0.1`             |
| `VITE_APP_DEV_PORT`     | 开发端口，默认 `5173`                      |

API 版本前缀来自 OpenAPI 扩展，不通过环境变量重复配置。生产环境配置放入本地
`.env.production`，不得在可共享配置中写入秘密。

## 关键约束

- 登录、刷新和 `/auth/context` 使用同一份 `SessionContext`，失败时关闭访问。
- 动态路由同时受服务端菜单、权限、能力和本地页面注册表约束。
- 服务端数据进入 TanStack Query；Pinia 只保存客户端和跨页面状态。
- 列表导出使用最后一次成功应用的筛选快照，覆盖全部匹配分页；空筛选必须确认。
- 导出终态记录可单删或批删，服务端受理后才更新缓存，并通过跨标签事件收敛状态。
- 所有 ID 都按字符串处理；有限状态使用联合类型，业务代码禁止 `any`。
- 新增接口、字段、权限、菜单或页面能力时，必须同步验证前后端契约。

架构边界和开发规则见 [ARCHITECTURE.md](ARCHITECTURE.md)。
