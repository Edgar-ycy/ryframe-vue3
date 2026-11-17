# RyFrame Vue3

[简体中文](README.md)

RyFrame's Vue 3 administration frontend uses TypeScript, Vite, Element Plus, Pinia and TanStack Query, connecting to the Rust backend through OpenAPI contracts.

This is a `0.x` development version and requires the current backend contracts and a new database. It includes users, roles, menus, permissions, product plans, tenancy, monitoring, messages, scheduling, configuration transfer, data migration, imports and exports. The profile area provides personal information, passwords, avatars and login-session management. Basic administration follows RBAC. Notices and tenant message publishing may be enabled per plan; disabling them preserves history and does not disable system notifications, scheduling, imports, exports, backups or recovery.

Authorization diagnostics distinguish current, behind, unexpectedly ahead, missing, disabled and unavailable cache states. A disabled cache is not a failure warning. An ahead version requires checking database recovery and cache scope rather than treating it as behind.

New ordinary users start with `123456`; administrators use the password explicitly supplied during backend initialization. First login requires a password change before business routes or message connections are loaded. Sign in again after changing the password. For an existing development account with an unknown password, an administrator can issue a one-time reset link from user management. The user chooses the new password; resetting it does not enable a disabled account, and a successful password change invalidates other outstanding reset links. Authentication pages use a two-column desktop layout, a single-column mobile layout and the current theme.

Export-enabled lists support selecting rows or selecting the current page. Selection clears after pagination, refresh or session changes. Without a selection, export uses the last successfully applied filters. Empty applied filters require confirmation before exporting all matching records that the user may access.

## Install and run

First install the Node.js version specified by `.node-version` and ensure Corepack is available. If Corepack is missing, follow the [official Corepack installation instructions](https://github.com/nodejs/corepack#how-to-install). From the frontend repository root, run the version checks below: Node.js must match `.node-version`, and pnpm must match the version pinned by `package.json#packageManager`. Then use Corepack to install locked dependencies and start the development server.

```bash
node --version
corepack --version
corepack pnpm --version
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The development server defaults to `http://localhost:5173` and proxies `/api` to file-configured `server.proxy_target`. Start the backend API before testing integration. Installation, startup, routine integration, and optional development checks require no manual creation of Git-ignored directories. The respective tools generate dependencies, build artifacts, and test reports.

Initialize and configure the backend in its separate repository by following [First run after downloading](https://github.com/Edgar-ycy/ryframe/blob/main/README.en.md#first-run-after-downloading). Frontend public TOML files contain only configuration safe to expose to browsers; keep backend plaintext credentials in the backend's private configuration directory.

If login succeeds but the session contract is rejected, check that backend source, frontend OpenAPI and the database access catalog match. Invalid menu permission codes in an older development database may also fail strict session validation. Review the actual permission and menu differences before explicitly correcting them; refreshing the page is insufficient.

## Runtime configuration

Project configuration comes only from public TOML files. The sole environment selector is `APP_ENV`, accepting exactly `dev`, `test`, or `prod`, with `dev` as the default. Vite's `production` mode does not select `prod`. Public application configuration no longer reads `.env*` or `VITE_*` overrides; Vite's built-in `DEV` and `MODE` remain available.

```powershell
$env:APP_ENV = "dev"
corepack pnpm dev
```

The default directory is `config` under the frontend root. Optional `app.toml` supplies common defaults, deep-merged with required `app.<APP_ENV>.toml`. Without the common file, the environment file must provide every required field. Unknown fields, arrays, invalid types, links, and invalid UTF-8 are rejected without echoing source text or field values.

| TOML field            | Purpose and default                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api_origin`          | Browser API origin; an empty string defaults to the page origin. A nonempty value must be an HTTP(S) origin without credentials, paths, queries, or fragments |
| `server.host`         | Development bind address, default `localhost`                                                                                                                 |
| `server.port`         | Development port, default `5173`, range `1..65535`                                                                                                            |
| `server.proxy_target` | Development proxy HTTP(S) origin, default `http://localhost:8080`                                                                                             |

Application TOML is parsed with `smol-toml` 1.9.1 and rejects unsafe keys. Integers outside the safe number range remain BigInt and are rejected by the existing field types without implicit conversion. Inline object/array depth is limited to 32. Syntax errors expose only safe positive integer line/column positions, never source text. Tool configuration, build identity, and receipts retain their respective JSON protocols.

The API prefix still comes exclusively from OpenAPI-generated `apiPrefix.generated.json`. The browser bundle contains only the public `{apiOrigin}` projection. Never include passwords or E2E, recovery, or contract-tool credentials.

Public `config/tools.json` defaults to the empty object `{}`. To select different public application configuration, set `application_config_dir` in that file to a directory outside the working tree, for example `{"application_config_dir":"D:/deployments/ryframe/frontend-config"}`. Relative paths resolve from the frontend root. Public configuration contains only information that can be delivered to browsers. Framework maintainer acceptance may use the higher-priority `.local-tests/frontend-tools.json` file. Both tool files are optional, and invalid files cause an error.

```powershell
$env:APP_ENV = "prod"
corepack pnpm build
```

Real acceptance uses `APP_ENV=test` or explicitly selected suitable configuration files. Before execution, `corepack pnpm build --real` requires the merged `api_origin` to be empty. Correct the environment file identified by the error; the build tool never overrides or rewrites user configuration.

```powershell
$env:APP_ENV = "test"
corepack pnpm build --real
```

An ordinary build atomically writes the `development` identity to managed `.local-tests/build/source.json`. A formal identity uses `corepack pnpm build --real --source-commit <SHA>` and accepts only the complete lowercase SHA of the target's clean Git HEAD. Identity no longer comes from environment variables. `--plan` only parses arguments and displays the same task graph: it reads neither configuration nor Git, writes no identity, and spawns no processes.

Builds with an explicit `--source-commit` check complete source, configuration, identity, and toolchain before and after tasks, with or without `--real`; drift fails the build. The release command `corepack pnpm build --source-commit <SHA>` performs the same checks. Only `--real` issues a recovery build receipt.

A real build issues a v3 receipt binding the three source domains, toolchain, actual configuration and tool-file paths/digests, identity source, and all artifacts. Failures issue no receipt; existing receipts cannot be overwritten; provenance drift during the build is rejected. Preview verifies existing artifacts without rebuilding. It reloads configuration using the receipt's saved `APP_ENV`, so the current shell need not select the same environment. Old v2 frontend build receipts are rejected and require rebuilding.

## Development commands

```bash
corepack pnpm dev
corepack pnpm check
corepack pnpm build
corepack pnpm generate
```

`corepack pnpm dev` starts the development server, `corepack pnpm check` validates current OpenAPI and generated contracts, `corepack pnpm build` checks types and creates production assets, and `corepack pnpm generate` previews generated differences; writing requires explicit `--write`.

`corepack pnpm check --full` runs contract checks, static checks, test type checks, unit coverage and production builds. Select an individual stage with `--stage contract|static|unit|build`. `--plan` prints the same task graph without executing tasks. Browser smoke uses `corepack pnpm check --stage browser`; real-backend acceptance uses isolated resources and its matching real configuration. Each smoke attempt writes its HTML report to `.local-tests/playwright/report/<dev-or-preview>/<attempt-UUID>/` and test attachments to `.local-tests/playwright/results/<dev-or-preview>/<attempt-UUID>/`. Failed attempts retain screenshots, videos and traces; reruns keep earlier attempts intact. CI runs these stages and retains Windows checks. The static stage also validates Chinese and English document pairs, language links, local section references and command examples.

`unit` and `--full` include homepage browser tests that use a temporary local HTTP fixture. Windows uses installed Chrome. On Linux, first run `corepack pnpm exec playwright install --with-deps chromium` to install the pinned Chromium version and its system dependencies.

Cross-repository consumer checks explicitly use `corepack pnpm check --stage contract --consumer-context <file>` (also supported with `--full`), validating the contract before running actual Node→Rust receipt proofs. The context binds the selected frontend/backend directories, native backend tool and configuration digests. Ordinary single-repository checks require no backend or Python. `--plan` reads no context, writes no files, and starts no tasks.

### Framework maintainer acceptance

The real-browser acceptance configuration below uses a registered isolated runtime. The tool reads `config/tools.json` and the higher-priority maintainer file `.local-tests/frontend-tools.json`. Top-level fields override earlier files, and nested sections are replaced as a whole. Keep actual accounts, passwords, and machine paths only in the latter file. The example limits must match the bound backend's actual configuration:

```json
{
  "real_browser": {
    "scopeId": "acceptance-local",
    "tenantId": "system",
    "username": "admin",
    "password": "<isolated-account-password>",
    "workerTool": {
      "root": "D:/project/rustProject/ryframe/tool-source",
      "binding": {
        "path": "D:/project/rustProject/ryframe/tool-source/.local-tests/frontend-origin-tool.json",
        "bytes": 1234,
        "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      }
    },
    "backendDir": "D:/project/rustProject/ryframe/ryframe",
    "runtimeDir": "D:/project/rustProject/ryframe/ryframe/.local-tests/acceptance-local",
    "requestCapacity": 100,
    "requestWindowSeconds": 60,
    "loginCapacity": 5,
    "loginWindowSeconds": 60,
    "loginBudgetState": "D:/project/rustProject/ryframe/ryframe/.local-tests/acceptance-local/login-budget.json",
    "channel": "chrome"
  },
  "browser_smoke": { "serverMode": "dev", "channel": "chrome" }
}
```

`real_browser.workerTool` must separately bind the tool's actual compilation source `root` and the raw byte length `binding.bytes` and lowercase SHA256 `binding.sha256` of that root's fixed `.local-tests/frontend-origin-tool.json`. The example length and digest illustrate the format; replace both with the actual coordinator-registered file values, up to 4 MiB. The tool source may differ from the business backend; `backendDir`, `runtimeDir`, and `scopeId` continue to select the tested business environment. Before and after Worker control, import-fixture, export-artifact snapshot and deletion-verification, business migration-gate and history-retention maintenance calls, the frontend checks the complete tool sources, executable and fixed binding and uses the same executable's native source verification to confirm its compilation root. Export-artifact and migration maintenance run the bound native executable directly without implicitly compiling through Cargo; long-lived migration gates complete precise cleanup before re-verifying sources. Missing fields, drift and unknown outcomes fail without legacy-field fallback or automatic replay.

```powershell
corepack pnpm check --stage browser --real --fixture core --server dev
corepack pnpm check --stage browser --real --fixture core --server dev --generated
corepack pnpm check --stage browser --real --fixture core --server dev --generated --spec generated-catalog-page.spec.ts
corepack pnpm check --stage browser --real --fixture core --server dev --generated --spec generated-tenant-migration.spec.ts
corepack pnpm check --stage browser --real --fixture business --server preview --plan
```

`permission-theme.spec.ts` uses the existing real core browser entry and administrator `real_browser` configuration without intercepting or faking API responses. It checks the diagnostic-menu SVG, successful permission-tree GET, visible and expanded-child row actions, desktop/mobile dark tag/tree contrast, horizontal scrolling and axe. It only opens the add dialog, selects a local parent value and cancels, without submitting permission creation, synchronization, updates or deletion. After theme transitions finish, Playwright `info.outputPath` stores dark-list/tree JPEGs and credential-free observation JSON. This real-backend wiring acceptance remains separate from the fixed fixture scenarios in `tests/browser/permission-theme.spec.ts`.

`--spec` is restricted to core acceptance with `browser --generated --real`. It accepts one `.spec.ts` basename containing lowercase letters, digits, and hyphens, never a path. Omitting it runs the full generated suite; no matching tests still fails.

Real browser acceptance saves HTML reports and attachments under `.local-tests/playwright-real/report/<fixture>/<serverMode>/<artifact-attempt>/` and `.local-tests/playwright-real/results/<fixture>/<serverMode>/<artifact-attempt>/`, respectively. An explicit `runId` selects the artifact attempt. Core runs without one use the current controller's UUID. The managed runner checks both paths before starting Playwright and preserves existing artifacts by refusing an existing directory or link.

`--generated` is limited to core acceptance with `browser --real`. It independently selects `tests/browser-generated/` through `playwright.generated.config.ts`. Use an isolated environment providing the selected generated page and matching API: the order scenario requires an `order` model with exact amounts and owner data scope, and the Catalog scenario requires a system-tenant-only `catalog` model with JSON, nullable JSON, and boolean fields; the complete suite requires both models. Provide current credentials and actual rate limits in the core configuration file; configure neither `restore` nor `credentialEndpoint`. The entry preserves the managed controller, network constraints, budgets, and identity cleanup. It provides targeted evidence for the selected generated page and tenant boundaries, issues no complete migration or recovery proof for the original four business scenarios, and does not run those scenarios. `--plan` only checks arguments and displays the task graph; configuration restrictions are validated before actual execution.

`generated-tenant-migration.spec.ts` requires multi-tenancy and targets `shared-control`, `shared`, `dedicated-a`, and `dedicated-b` with up/verify completed. It checks nonempty migration of three complete orders through the original owner page and session; the shared scenario also checks cross-tenant denial and ordinary-tenant denial of global Catalog access. The scenarios disable automatic retries and retain creation responses before assertions. New tenants, plans, and migrations record intent and actual identifiers; orders retain complete responses and row images. Resources marked `retained_for_fixture_teardown` remain for controller review; no automatic cleanup consumer is currently bound. Sources follow the natural 168-hour retention period and the formal finalize requirements for backups and ownership, without replaying unknown writes, changing timestamps, or deleting by prefix.

Runtime options use `real_browser` fields `fixture`, `serverMode`, `port` (default 4174), `runId`, `baseURL`, `gateEndpoint`, `previewResponseAudit`, and `captchaCode`. Business suites and nonempty generated Order migration acceptance require an explicit fresh `runId`. Formal business preview also requires an absolute `previewResponseAudit` path. `baseURL` accepts only a local HTTP origin with an explicit port; bind an external service's IPC explicitly through an absolute `gateEndpoint`. `channel` accepts `chrome`, `msedge`, and their beta/dev/canary channels; `chromium` selects Playwright's bundled browser. Defaults are Chrome locally and the bundled browser in CI.

Run recovery acceptance with `corepack pnpm check --stage browser --real --fixture core --server preview`. Set `real_browser.baseURL` to the managed production site registered in the runtime receipt. Supply all of `bindings`, `runtimeReceipt`, `targetPlan`, `coordinatorDir`, `coordinatorSha`, `verifierDir`, `verifierSha`, and `runnerSha` in `real_browser.restore`. Use canonical absolute paths and three complete lowercase commit SHAs. Verify the coordinator backend, verifier sources, and test runner against their own clean worktrees; `verifierDir` must match `real_browser.workerTool.root`. The coordinator retains the original runtime ledger and evidence, while the verifier tool may come from another worktree. Put restored tenant passwords in `real_browser.restorePasswords`, keyed by tenant ID.

Before login, the test runner calls `__source-evidence` through the native executable bound by `real_browser.workerTool` to verify and freeze the source and target data bindings in read-only mode. The existing-data scenario reads pages for all 11 reference tenants, then uses the same executable's `__restore-dataset-verify-existing` to verify every registered post sample and all 256 objects. Verification reads business data and objects. Login and logout change session state.

Before and after the business tests, the reporter binds `real_browser.workerTool` again and runs the executable's `check recovery runtime verify` from the registered coordinator backend directory. The command verifies the runtime receipt, the identities of all three running components, and the complete frontend artifacts. The runner rechecks the tool binding before and after each native invocation. The test receipt separately records the coordinator backend, verifier sources, and frontend test runner roots and commits, and the business proof binds its digest; `verifier_sha` identifies the verifier source commit. Use `cargo xtask data restore verify` with `--coordinator-root` and `--coordinator-sha` to bind the original coordinator evidence for independent verification from the registered verifier sources.

The B0 baseline in the two-sided recovery comparison uses the original frontend commit `0087ea2ecf62530d042b9e52f5c950fb34c66d78`. Through the same recovery entry, the test runner reads the registered `restore-legacy-b0-frontend-build` embedded in the backend runtime receipt. The native backend verifier binds the target plan, original baseline sources, and complete build artifacts. B1 and ordinary formal frontend builds continue to use v3 build receipts.

The unified check passes CLI options through `scripts/run-browser.mjs`, exclusively recording the controller, attempt, tool-file digests, and credential-free options at fixed ignored `.local-tests/browser-control.json`. Tool-file drift during a run fails the task. Completion removes only the task's own unchanged control file; inspect task identity before handling a file left after abnormal termination. `--plan` only displays tasks, creating no control file or process. Old project environment variables and browser-channel environment overrides are no longer read. `APP_ENV` still selects only application configuration; operating-system and third-party tool environments remain supported.

The backend's native DevEx homepage measurement invokes the frontend browser tool at `scripts/devex-homepage.mjs`. This entry accepts only controller-supplied JSON on standard input, reads no project configuration environment variables, and never connects to a shared browser. The controller must bind a local HTTP origin, identities and fixed client addresses, an existing artifact directory containing `identity-selection.json`, and the current frontend runner's source fingerprint. Invalid bindings or drift during execution fail the task. Windows uses installed Chrome; Linux uses installed Playwright Chromium. Measurement accounts must already have completed their first password change, and the acceptance environment must disable CAPTCHA. Each identity uses an independent context. After login, the tool measures a cold cache or warms the cache before measuring, recording actual navigation, LCP, and homepage account-section visibility times. Standard output contains a single JSON result; failed cycles preserve their phase and fixed diagnostic codes without exposing passwords, request bodies, or raw browser exceptions. The DevEx controller schedules this entry; it does not replace formal business acceptance.

## Synchronize API contracts

To synchronize formally from a committed backend source, run the following in the frontend. The default validates and previews; explicit `--write` replaces the formal contract and provenance manifest. Sources require a complete 40-character commit SHA. An absolute `--backend-worktree` reads only that SHA's Git object, excluding uncommitted working files. Without a worktree, it reads the pinned GitHub commit. `--openapi-path` selects a repository-relative JSON path without traversal, defaulting to `openapi/openapi.json`.

```powershell
node scripts/sync-api-contract.mjs --backend-repository owner/backend --backend-commit <SHA> --backend-worktree D:/project/rustProject/ryframe/ryframe
node scripts/sync-api-contract.mjs --backend-repository owner/backend --backend-commit <SHA> --backend-worktree D:/project/rustProject/ryframe/ryframe --write
node scripts/sync-api-contract.mjs --verify-local
node scripts/sync-api-contract.mjs --verify-upstream --backend-worktree D:/project/rustProject/ryframe/ryframe
```

The same source can be stored in the tool file's `api_contract` object: `backend_repository`, `backend_commit`, `backend_worktree`, and `openapi_path`. Explicit CLI values take precedence. Verification modes reject source replacement and `--write`; upstream verification always uses formal `openapi/source.json` provenance. Missing pinned sources, unreadable Git objects, and mismatched upstream content fail without falling back to branches or working files.

After changing backend DTOs or endpoints, run this from the backend repository root:

```powershell
cargo xtask generate api --write
```

The command updates the OpenAPI snapshot, request descriptions and derived types. Then integrate the corresponding operation in `src/api/modules/`.

For custom business development, backend `cargo generate -- resource` or `import` with `schema-import` can synchronize the current batch's contracts, standard lists, forms and routes through `generator.sync_frontend=true` / `--sync-frontend`. Install frontend dependencies first. The generator checks types and lint in candidate copies before `--write` installs both repositories together. Default preview preserves official source files; `--no-sync-frontend` temporarily disables synchronization. Set the frontend directory in the backend tool configuration.

See [ARCHITECTURE.md](ARCHITECTURE.en.md) for pages, APIs, state, routes and testing.

Multi-tenant login searches and selects tenants by name; duplicate names show their identifiers. Failed tenant loading can be retried in the selector. Single tenancy uses the internal system tenant automatically.

New backend configurations default to single tenancy. The login page and navigation hide tenant selection, and tenant/product-plan management pages are not registered for access. Configuration transfer and data maintenance remain available. Global business pages are restricted to the system tenant; other tenants cannot see their menus or open their routes even with wildcard permissions. Runtime-mode loading failures offer retry without guessing the mode. Light and dark themes use shared semantic colors, responsive authentication layouts and a single-line permission action column.
