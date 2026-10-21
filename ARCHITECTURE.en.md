[简体中文](ARCHITECTURE.md)

# RyFrame Vue3 Development Guide

This document describes common ways to add pages, integrate APIs, manage state, register routes, and write tests in RyFrame Vue3.

The session context strictly validates `password_change_required`; restricted sessions cannot carry business authorization. This flag participates in the session scope fingerprint, and its projection is stored by the passive User Store. The route guard directs the user to `/change-password`, and the messaging runtime stops business connections. Login, the initial password change, and password reset reuse the responsive layout provided by `AuthLayout`.

## Choosing Where Code Belongs

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

Page development usually starts in `views/`. Put reusable asynchronous page flows in a composable in the same directory or in
`hooks/`, flows shared across pages in `app/`, and purely presentational components in `components/`. Call server requests through
`api/modules/`; shared transport and query functionality belongs in `shared/`.

Put styles specific to a page or component in that Vue file's `<style scoped lang="scss">`; keep styles shared by multiple components
in separate SCSS files. Global themes, layout, responsive rules, and shared component overrides belong in `src/styles/`
and are loaded through the single `src/styles/index.scss` entry point.

The global entry point loads the official Element Plus dark variables before applying the project's semantic colors. Switching themes recalculates the primary color scale, blending dark backgrounds toward the page background; tags retain the semantic colors of their states, and tree hover and selected states use a consistent fill color.

## Adding a Page

1. Create the page and its local components in the appropriate business directory under `src/views/`.
2. Extract pure logic, such as form conversion and status text, into model or presentation files.
3. Extract page flows, such as list queries, saving, and deletion, into composables.
4. Add the page declaration to `src/features/core/pages.ts`, `system/pages.ts`, or `platform/pages.ts`.
5. For a business capability page, specify the route key, path, permission, and
   capability in the corresponding `src/features/<feature>/manifest.ts`. Basic administration pages do not register plan capabilities; business write permissions are maintained separately in domain page manifests.
   The initial optional capabilities are notices and proactive messaging. The configuration for the `standard` variant must be a strictly empty object; saving is prohibited when the catalog and editor disagree.
6. Start the development server, open the menu with a session that has the required permissions, and verify loading, empty data, failure, and saving flows.

Page declarations are collected in `src/features/registry.ts`. After the session loads, route projection produces accessible menus and dynamic routes.
Tenant and plan management pages declare `requiresMultiTenancy`; route projection and direct URL access enforce the same runtime mode restriction. Configuration migration and data maintenance remain available in single-tenant mode. Global business pages declare `requiresSystemTenant`; menu projection and direct URL access read the tenant identifier from the authoritative session and deny access when the identity is missing or the tenant is not the system tenant. Permission wildcards cannot bypass this restriction. The mode is determined by the backend version endpoint; multi-tenancy is not assumed to be enabled before it is retrieved successfully.
When a page cannot be opened, check the server menu's route key, page declaration, permission, capability, and current
tenant context in that order.

## Integrating APIs

`scripts/api-artifact-manifest.json` is the cross-repository source of truth for the list of OpenAPI-derived files. The frontend generator and backend Rust contract transaction read the version 1 `files` array and reject duplicate fields, duplicate paths, and paths outside the allowed boundaries. When adding derived files, update both the manifest and generator; adding a file without its ownership entry is not sufficient.

After changing a backend endpoint, first run `cargo xtask generate api --write` in the backend repository. Once synchronization is complete:

`/business/` endpoints and their referenced models belong to the lazily loaded `system` shard; business requests use that domain's typed caller. The bit width, signedness, and transport types of standard resource integers come from the backend contract. Range constraints and finite enumerations are validated before generation; out-of-range or noncanonical decimal values block generation. String-transported `i64/u64` fields use text or enumeration controls, and request bodies and queries retain decimal strings without conversion through Number; numeric controls are rejected before generation. Non-null minimum/maximum values for these fields also use canonical decimal strings. BigInt validates the complete type range and bound ordering before generation; numeric bounds and invalid strings are rejected. Decimal uses text controls and decimal strings to preserve the exact values declared by the backend. Values exceeding column capacity are rejected by the server; conversion to Number or automatic rounding is prohibited. After a business model changes, use the backend generator to synchronize the current candidate contract and pages. Files are installed together after type and lint checks pass. Business page ownership is stored in `.ryframe/generated.toml`, and routes continue to use registration discovery from the generated directory. The default page uses page.vue in the same directory; `frontend_page` can specify a handwritten extension page.

In standard forms, text, numeric, and enumeration fields that cannot change after creation accept input during creation, but are disabled during editing and prevent update events from writing values back; fields that allow updates remain editable.

`scripts/resource-render/` provides pure rendering modules for standard CRUD pages. Templates and TypeScript form conversion logic are maintained in the frontend repository. The internal `cli.mjs` reads version 1 batches of resource IR from standard input and returns only the complete asset JSON, sorted deterministically, on standard output. It does not write source files, ownership, or contracts directly. Input is limited to 16 MiB and output to 64 MiB. Each batch explicitly binds the generator version, and `aggregate` specifies the framework aggregation entry points. Duplicate resources, incomplete fields, or unsupported versions fail the entire batch. The backend candidate generation flow handles resource validation, contract synchronization, review, and managed file installation. Template tests compare Post and Notice byte for byte and verify wide-model splitting, strict TypeScript types, and runtime conversions.

1. Find the typed caller in the appropriate domain file under `src/api/generated/operations/`.
2. JSON, multipart, text, and Blob transport are bound automatically from the contract's media types; generation fails when the media type cannot be determined uniquely.
3. Business code needs to retain only normalization, idempotency keys, pagination, response validation, or raw session policies in `src/api/modules/`;
   without these policies, it can call the generated caller directly.
4. Obtain the operation's request and response types from `src/api/contract.ts`.
5. Call the request function from a page composable or application use case.
6. Check the affected modules through the validation entry points currently available in the project.

For an example of export filter normalization, see `src/api/modules/post.ts`. Business modules must not handwrite URLs or HTTP methods,
or call `operationRequest` directly. OpenAPI-derived files are updated through the backend API generation entry point.

## Import and State Boundaries

Vue Router, Pinia, and Element Plus services and types must be imported explicitly in scripts. Auto-import covers only Vue
composition primitives; Vite still resolves template components automatically, and component types are written to `src/components.d.ts`.

All `defineStore` declarations must be under `src/stores/`. Stores remain passive and do not import app, router, business
APIs, QueryClient, or other Stores at runtime; they also do not import Vue Router, TanStack Query, or
Element Plus through type-only imports. The permission Store holds only the neutral route projection defined in `src/shared/navigation/routeProjection.ts`,
and `src/router/routeProjectionAdapter.ts` performs conversion at the Router boundary. Put effects spanning multiple state sources in a `src/app/`
coordinator. API modules do not directly depend on external packages, Router, Store, Query, or UI;
`src/shared/http/` depends only on Axios and pure modules in the same layer.

## Managing State

Use TanStack Query for server-side lists, details, and mutations. Access authenticated server state through
`useServerStateQuery()` and `useServerStateMutation()`; use
`executeServerStateMutation()` for imperative mutations outside components. Do not build tenant-level caches directly with raw `useQuery()` / `useMutation()`. The Query Key
is fixed as `server-state / tenantId / subjectId / sessionEpoch / resource / params`; business code manipulates caches only through
`serverStateScopePrefix()`, `serverStateResourcePrefix()`, and complete Key helpers, without slicing or handwritten prefixes.
Ordinary access token rotation does not change `sessionEpoch`. A new scope generation is created only when the subject, tenant, authorization or runtime epoch, roles, permissions, capability,
or menu projection changes.

When switching sessions, first abort the old scope's signal, then increment `sessionEpoch`, clear old Query/Mutation state, apply the validated
user, tenant, and permission projections, and finally publish the new scope. HTTP requests bind both the caller signal and the session signal. Old epoch
responses cannot update the context, and a 401 from an old epoch cannot borrow a new token for refresh or replay. A Mutation captures its scope at the start
and validates it again on completion. Expired Mutations are treated as cancelled and do not run success or failure callbacks, notifications, cache writes, or invalidations.
The request may still have committed on the server; the client guarantees that old results are not written back into the new session.

Pinia is suitable for cross-page client state such as themes, tabs, and client projections. Flows involving multiple state sources, such as login,
refresh, tenant switching, messaging connections, and export tasks, can be organized by coordinators under `src/app/`.

Page filters can be split into a form draft, the applied query, and the last successful query. When creating an export from applied filters, reuse
the existing flows in `src/shared/query/useAppliedListQuery.ts` and `src/app/exports/`.

Ordinary request errors are displayed by the global reporter. When a page needs an inline error or must handle a particular status code, use silent mode in the request options
and display the corresponding state on the page. User cancellation can simply end the current interaction.

## Sessions and Routing

Login and refresh responses carry the same `SessionContext` structure directly. `GET /auth/context` returns that same structure to restore or revalidate
the current session. The client atomically updates the user, tenant, permissions, and dynamic routes only after validating the complete snapshot.
Runtime routes are projected from both page declarations and server menus:

```text
SessionContext
  -> 校验权限与 capability
  -> 用 route key 查找页面声明
  -> 构建菜单和动态路由
  -> 注册路由并更新标签页
```

Session flows live in `src/app/session/`, route projection in `src/features/navigation/`, and runtime registration in
`src/router/`. When developing identity or tenant switching flows, use these directories to locate session orchestration, route computation, and route
runtime handling respectively.

Text required by route pages is selected by route namespace through `src/i18n/routeCatalogRegistry.ts`. The initial screen synchronously installs
`core`, `shell`, and global export center text; other catalogs load in parallel with page components. Concurrent requests for the same catalog
share a pending promise; failure clears pending state so the next navigation can retry. Each catalog includes both Chinese and English,
so switching languages on an already loaded page stays synchronized without requesting resources again. When adding a business page, register its default catalog under
the corresponding namespace; pages spanning domains explicitly add only the catalogs they need.

Use `v-perm` to control button visibility. Page access is computed from the permissions and capability declared for that page. The 403, feature
unavailable, and 404 pages can be used to verify insufficient permissions, missing capabilities, and unknown routes respectively.

## Build Entry Points

`corepack pnpm dev` starts Vite; `corepack pnpm build` runs Vue TypeScript checks before building production assets.
`corepack pnpm check` validates the current contract and derived files. `--full` runs contract checks, static checks, type checks, tool tests,
unit test coverage, and the production build; `--plan` only displays the same task graph. Use `--stage contract|static|unit|build|browser` for an individual stage.
`corepack pnpm generate --check` checks derived files without writing; updates require an explicit `--write`. Backend contract synchronization uses this formal entry point.
CI runs the corresponding stages, with the browser stage run separately.

## Writing and Running Tests

- `tests/unit/`: pure model, composable, Store, application use case, and component tests.
- `tests/browser/`: test sources for login, permissions, CRUD, exports, and tenant context using deterministic fixtures.
- `tests/browser-business/`: prepares business samples through the formal API on an isolated business crate fixture, then uses platform pages in Chrome to verify cross-database migration, retention, cancellation, and crash recovery. Run `corepack pnpm check --stage browser --real --fixture business --server preview`; runtime bindings, build receipts, and static response audits must be complete. Missing scenarios or retries fail acceptance.

For a real preview, first run `corepack pnpm build --real`. It verifies provenance before and after type checking and the Vite build, and writes complete artifact digests to the ignored production directory. `corepack pnpm build --real --plan` only displays the same task graph; ordinary `corepack pnpm build` retains its type checking and production build behavior.

- `tests/browser-real/`: runs real Chrome flows against explicitly registered, isolated API, MySQL, Redis, and object storage environments.

`corepack pnpm check --stage unit` runs tool tests, test type checks, and unit test coverage;
`corepack pnpm check --stage browser` runs deterministic browser smoke tests. For real environments, run
`corepack pnpm exec playwright test --config playwright.real.config.ts` with the registered configuration. Recovery acceptance uses the backend's unified entry point to provide provenance and resource bindings.
