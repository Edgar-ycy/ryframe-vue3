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

API generation always stages files under `target/` in the current frontend workspace. Temporary directories in deeply nested Windows workspaces use namespaced paths only at the filesystem call boundary; business paths and manifests retain ordinary path representations. Staging validation, backup restoration, and backend managed-file transactions retain their existing boundaries without switching to the system temporary directory.

After changing a backend endpoint, first run `cargo xtask generate api --write` in the backend repository. Once synchronization is complete:

`/business/` endpoints and their referenced models belong to the lazily loaded `system` shard; business requests use that domain's typed caller. The bit width, signedness, and transport types of standard resource integers come from the backend contract. Range constraints and finite enumerations are validated before generation; out-of-range or noncanonical decimal values block generation. String-transported `i64/u64` fields use text or enumeration controls, and request bodies and queries retain decimal strings without conversion through Number; numeric controls are rejected before generation. Non-null minimum/maximum values for these fields also use canonical decimal strings. BigInt validates the complete type range and bound ordering before generation; numeric bounds and invalid strings are rejected. Decimal uses text controls and decimal strings to preserve the exact values declared by the backend. Values exceeding column capacity are rejected by the server; conversion to Number or automatic rounding is prohibited. After a business model changes, use the backend generator to synchronize the current candidate contract and pages. Files are installed together after type and lint checks pass. Business page ownership is stored in `.ryframe/generated.toml`, and routes continue to use registration discovery from the generated directory. The default page uses page.vue in the same directory; `frontend_page` can specify a handwritten extension page.

Generated `tenant_data` resources declare create/update/delete `businessWritePermissions` in their registration manifest. These join domain-page and optional-feature manifests and reuse the existing business-maintenance write protection. This generation rule does not restrict read permissions or `control_row` resources.

The resource definition also marks `tenant_data` storage. Automatic list/detail queries and explicit refreshes require the existing page, authentication, and read-permission qualifications plus a loaded tenant context with active business data. Maintenance, provisioning, and failed states pause reads; a new active scope resumes queries on the same page. Old-scope requests remain cancelled and cannot write results back. Control-row resources retain their existing read behavior, and the global business-state banner explains the pause.

In standard forms, text, numeric, and enumeration fields that cannot change after creation accept input during creation, but are disabled during editing and prevent update events from writing values back; fields that allow updates remain editable.

The public CRUD contract and renderer enforce the same widget type constraints: text accepts strings, integers, or Decimal; textarea accepts strings; number accepts integers; switch accepts booleans; and date, date_time, and json accept their corresponding types. Select requires a valid finite enumeration, and hidden fields cannot be edited. Exact numeric values transported as strings still reject number controls, JSON retains native JSON transport, and nullable and optional create/update semantics remain strictly validated.

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

Standard CRUD list/detail queries require current read permission in addition to active/authenticated state; auxiliary trees and role options use their own API permissions. Managed pages pass `presentation.value.permissions.list` as the required second argument of `useFlatCrudResource(resource, readPermission)`; button visibility does not replace query eligibility. Page filters can be split into a form draft, the applied query, and the last successful query. When creating an export from applied filters, reuse
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

`--consumer-context <file>` applies only to contract/full. `scripts/consumer-context.mjs` strictly reads six-field UTF-8 JSON v1: `format_version`, `arguments`, `backend_root`, `frontend_root`, `origin_tool_binding`, and `tool_configuration`. Duplicate, unknown, and retired interpreter fields are rejected; the frontend root must equal the current working directory. Five argument pairs validate the consumer contract. The origin binding is fixed to backend `.local-tests/frontend-origin-tool.json`; tool configuration binds existing backend `config/tools.toml` and `.local-tests/tools.toml` in order. Configuration, context, origin binding, and source paths reject ParentDir, links, and ancestor reparse points. Before and after tasks, checks cover context digest, binding bytes/digest, configuration existence set/digests, actual executable identity/SHA. Node strictly parses and fully retains the fixed source array without scanning individual sources in frequent hooks. The parent Rust read protection and native entry before/after checks verify complete source contents, sets, and the compiled root; the frontend never rewrites bindings. With context, the task graph is contract→consumer-proof; full retains static, unit, and build tasks. `--plan` only displays the same graph without reading context or spawning processes. Ordinary single-repository unit/contract/full checks read no backend bindings.

The cross-repository proof lives in `scripts/contract-tests/frontend-native-receipt.mjs`, outside the unit glob. Actual Node producer→Rust consumer scenarios retain configuration, identity, complete artifacts, Unicode, malformed-input, and link boundaries. The entry accepts only `--consumer-context`, invokes the bound executable with `__frontend-build-contract --frontend-dir <absolute-path>`, and passes `frontend_inventories` and `backend_inventories` through stdin, limited to 16 MiB. The native entry verifies its compiled source closure. Missing bindings or drift fail without skipping proof, interpreters, PATH discovery, or compilation fallback. Python configuration for the global real-browser recovery chain remains a separate responsibility.

## Writing and Running Tests

- `tests/unit/`: pure model, composable, Store, application use case, and component tests.
- `tests/browser/`: test sources for login, permissions, CRUD, exports, and tenant context using deterministic fixtures.
- `tests/browser-business/`: prepares business samples through the formal API on an isolated business crate fixture, then uses platform pages in Chrome to verify cross-database migration, retention, cancellation, and crash recovery. Run `corepack pnpm check --stage browser --real --fixture business --server preview`; runtime bindings, build receipts, and static response audits must be complete. Missing scenarios or retries fail acceptance.
- `tests/browser-generated/`: independent real acceptance of the evolved generated order page, using `corepack pnpm check --stage browser --real --fixture core --server dev --generated`. Its dedicated configuration reuses the real base's already parsed environment and overrides only the test directory. It rejects restore bindings and credential endpoints, reuses core identity, budget, network, and cleanup constraints, and contributes neither to the four-scenario migration receipt nor to recovery proof.

Public application configuration is read from `app.toml` and required `app.<APP_ENV>.toml` and projected centrally by `scripts/application-config.mjs`; Vite, the client, and build provenance share that source of truth. `envDir:false` and `envPrefix:[]` prevent automatic loading and exposure of old project environment values while retaining Vite's built-in `DEV` and `MODE`. `APP_ENV` independently selects dev/test/prod files; mode does not change the selection. Validation covers ordinary files, ancestor reparse points, strict UTF-8, fields, and drift during reads. TOML is parsed with `smol-toml` 1.9.1, explicitly rejecting unsafe keys, retaining large integers as BigInt, and limiting inline depth to 32. Existing field types reject special numbers, dates/times, and arrays; errors expose only safe positive integer line/column positions. Tool directory selection comes from `config/tools.json` and the higher-priority ignored `.local-tests/frontend-tools.json`, accepting `application_config_dir`, `api_contract`, `real_browser`, and `browser_smoke`. Public configuration remains separate from private test-control inputs.

Runtime reads only typed `__RYFRAME_PUBLIC_CONFIG__={apiOrigin}`. The API prefix still comes from the single generated contract; HTTP and sockets retain their shared address normalization. See [README](README.en.md#runtime-configuration) for configuration structure and examples.

Public configuration, tool-directory selection, identity, and JSON parsing implementations imported directly or indirectly by Vite belong to both product and tool source digests; changing acceptance scripts alone still changes only the tool digest. Ordinary release builds with an explicit `--source-commit` also check provenance before and after tasks. After the same-origin check, external recovery builds compare the validated configuration with the captured context again and do not spawn Vite if configuration drifts.

`scripts/build-identity.mjs` reads fixed `.local-tests/build/source.json`. The ordinary wrapper atomically writes development; explicit `--source-commit <SHA>` verifies a clean Git HEAD before writing a formal identity. The v3 frontend build receipt context contains only `command/mode/target/toolchain/configuration/identity`. Configuration binds the environment, directory, and ordered paths/digests of actual common, environment, and tool files; identity binds the commit and source file. Provenance, configuration, and identity are checked before and after building, and artifact `build-identity.json` must match. Verification reloads files using the receipt's saved environment and checks complete artifacts, without inheriting the current shell's environment selection or accepting old v2 frontend build receipts. Other runtime receipt versions retain their existing protocols.

For a real preview, first run `corepack pnpm build --real`. It verifies provenance before and after type checking and the Vite build, and writes complete artifact digests to the ignored production directory. `corepack pnpm build --real --plan` only displays the same task graph; ordinary `corepack pnpm build` retains its type checking and production build behavior.

- `tests/browser-real/`: runs real Chrome flows against explicitly registered, isolated API, MySQL, Redis, and object storage environments.
  Session race setup uses `createOrdinaryUser` to sign in with `123456` in a registered, separate browser context, verify the restricted context and mandatory password-change route, and change the password to `Valid!Session123` through the page. Administrator reset does not replace first-time password change. `password-lifecycle.spec.ts` separately covers this normal path and administrator-initiated reset, same-origin link fragment consumption, page submission, invalidation of old passwords and sessions, and login with the new password. Accounts and roles remain owned by `sessionResources` and are cleaned up by authoritative ID. Pages using the same fixed client share a request budget; all six logins, including two expected `401` responses, use the shared login ledger with actual configured limits. Waiting windows are not bypassed by changing addresses or increasing capacity.

`corepack pnpm check --stage unit` runs tool tests, test type checks, and unit test coverage;
`corepack pnpm check --stage browser` runs deterministic browser smoke tests. For real environments, run
`corepack pnpm check --stage browser --real --fixture core --server dev` with the registered configuration. Recovery acceptance uses the backend's unified entry point to provide provenance and resource bindings.
