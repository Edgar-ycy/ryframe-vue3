# RyFrame Vue3

[简体中文](README.md)

RyFrame's Vue 3 administration frontend uses TypeScript, Vite, Element Plus, Pinia and TanStack Query, connecting to the Rust backend through OpenAPI contracts.

This is a `0.x` development version and requires the current backend contracts and a new database. It includes users, roles, menus, permissions, product plans, tenancy, monitoring, messages, scheduling, configuration transfer, data migration, imports and exports. The profile area provides personal information, passwords, avatars and login-session management. Basic administration follows RBAC. Notices and tenant message publishing may be enabled per plan; disabling them preserves history and does not disable system notifications, scheduling, imports, exports, backups or recovery.

Authorization diagnostics distinguish current, behind, unexpectedly ahead, missing, disabled and unavailable cache states. A disabled cache is not a failure warning. An ahead version requires checking database recovery and cache scope rather than treating it as behind.

New ordinary users start with `123456`; administrators use the password explicitly supplied during backend initialization. First login requires a password change before business routes or message connections are loaded. Sign in again after changing the password. For an existing development account with an unknown password, an administrator can issue a one-time reset link from user management. The user chooses the new password; resetting it does not enable a disabled account, and a successful password change invalidates other outstanding reset links. Authentication pages use a two-column desktop layout, a single-column mobile layout and the current theme.

Export-enabled lists support selecting rows or selecting the current page. Selection clears after pagination, refresh or session changes. Without a selection, export uses the last successfully applied filters. Empty applied filters require confirmation before exporting all matching records that the user may access.

## Install and run

Use the Node.js version in `.node-version`. Corepack selects the pnpm version pinned by `package.json#packageManager`.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The development server defaults to `http://127.0.0.1:5173` and proxies `/api` to `VITE_APP_PROXY_TARGET`. Start the backend API before testing integration.

If login succeeds but the session contract is rejected, check that backend source, frontend OpenAPI and the database access catalog match. Invalid menu permission codes in an older development database may also fail strict session validation. Review the actual permission and menu differences before explicitly correcting them; refreshing the page is insufficient.

## Runtime configuration

| Variable                | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `VITE_APP_TITLE`        | Browser title                                       |
| `VITE_APP_API_ORIGIN`   | Absolute HTTPS origin for the production API        |
| `VITE_APP_PROXY_TARGET` | Local proxy target, default `http://localhost:8080` |
| `VITE_APP_DEV_HOST`     | Development bind address, default `127.0.0.1`       |
| `VITE_APP_DEV_PORT`     | Development port, default `5173`                    |

Place local environment values in `.env.development` and production values in `.env.production`. OpenAPI supplies the API version prefix.

## Development commands

```bash
corepack pnpm dev
corepack pnpm check
corepack pnpm build
corepack pnpm generate
```

`corepack pnpm dev` starts the development server, `corepack pnpm check` validates current OpenAPI and generated contracts, `corepack pnpm build` checks types and creates production assets, and `corepack pnpm generate` previews generated differences; writing requires explicit `--write`.

`corepack pnpm check --full` runs contract checks, static checks, test type checks, unit coverage and production builds. Select an individual stage with `--stage contract|static|unit|build`. `--plan` prints the same task graph without executing tasks. Browser smoke uses `corepack pnpm check --stage browser`; real-backend acceptance uses isolated resources and its matching real configuration. Each smoke attempt writes its HTML report to `.local-tests/playwright/report/<dev-or-preview>/<attempt-UUID>/` and test attachments to `.local-tests/playwright/results/<dev-or-preview>/<attempt-UUID>/`. Failed attempts retain screenshots, videos and traces; reruns keep earlier attempts intact. CI runs these stages and retains Windows checks. The static stage also validates Chinese and English document pairs, language links, local section references and command examples.

## Synchronize API contracts

After changing backend DTOs or endpoints, run this from the backend repository root:

```powershell
cargo xtask generate api --write
```

The command updates the OpenAPI snapshot, request descriptions and derived types. Then integrate the corresponding operation in `src/api/modules/`.

For custom business development, backend `cargo generate -- resource` or `import` with `schema-import` can synchronize the current batch's contracts, standard lists, forms and routes through `generator.sync_frontend=true` / `--sync-frontend`. Install frontend dependencies first. The generator checks types and lint in candidate copies before `--write` installs both repositories together. Default preview preserves official source files; `--no-sync-frontend` temporarily disables synchronization. Set the frontend directory in the backend tool configuration.

See [ARCHITECTURE.md](ARCHITECTURE.en.md) for pages, APIs, state, routes and testing.

Multi-tenant login searches and selects tenants by name; duplicate names show their identifiers. Failed tenant loading can be retried in the selector. Single tenancy uses the internal system tenant automatically.

New backend configurations default to single tenancy. The login page and navigation hide tenant selection, and tenant/product-plan management pages are not registered for access. Configuration transfer and data maintenance remain available. Global business pages are restricted to the system tenant; other tenants cannot see their menus or open their routes even with wildcard permissions. Runtime-mode loading failures offer retry without guessing the mode. Light and dark themes use shared semantic colors, responsive authentication layouts and a single-line permission action column.
