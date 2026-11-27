[简体中文](CHANGELOG.md)

# Changelog

## [Unreleased]

- The Vite manifest graph and locale bundle rules use TypeScript. The standard Node test entry point discovers existing JavaScript tests and migrated TypeScript tests together.

- DevEx homepage measurements observe cold loads and warmup cache hits for same-origin static assets in the browser. Receipts retain only the counts.

- Fix the parent menu selector to use the menu ID as the tree node value. Real browser coverage exercises permission changes, deletion, and tree refresh after the session scope changes.

- DevEx frontend fast checks use the same nine logical tasks and source-size rules on both arms. B0 retains its separate operation check and B1 retains its combined AST scan.

- Remove the unused Python path requirement from real browser acceptance. Native fixture bindings and frontend configuration register only consumed tools while retaining login budgets, Worker provenance, and artifact verification.

- Bind B0 recovery targets strictly to the original product, exact adapter execution commit, combined patch, and complete tree. Runtime receipts retain the original frontend build and reject mismatched source domains, old backend builds, and receipts from the other side.

- Verify coordinator evidence, verification tools, and test runner sources separately during browser recovery acceptance, retain data and runtime checks in the original coordinator directory, and record each source in the test receipt.

- Login form validation uses the active theme's high-contrast error text color.

- Save real core browser reports and results in separate controller attempts when `runId` is omitted. The managed runner refuses to reuse an existing artifact directory before launch.

- Verify recovery data lineage, the runtime receipt, all three runtime identities, and static artifacts through the Rust commands in the coordinator backend. B0 binds the original frontend build and its separately registered adapter, while B1 binds its v3 build receipt. The business proof records both the coordinator backend and frontend test runner commits.

- Require the API and Worker artifact commands in a recovery runtime receipt to match the corresponding commands in its build context.

- Match the Rust build tool's backend source classification in recovery runtime receipts. Classify `tools/` as tool sources and preserve the existing product-input classification of historical `scripts/` paths.

- Preserve the existing positive cache-variant checks for plan, migration and tenant-plan resource invalidation, and add counterexamples requiring caches for other tenants, subjects, session epochs and unrelated resources to retain their data without invalidation. Use the real QueryClient; this does not replace real cross-tenant page acceptance.

- Add a real multi-tenant login scenario that publishes one empty-capability plan through the UI, reuses it to create 21 exclusive tenants, checks both search pages and their complete tenant IDs using a shared name prefix, then selects the second-page tenant and verifies that initial-owner login reaches the restricted password-change page. Retain fixed client addresses, request and login budgets, and the existing deadline; preserve creation records and page diagnostics on failure without automatic retries or resource deletion.

- Run the existing real permission-theme scenarios' login axe checks at their target desktop or mobile viewport, then switch to desktop to set dark mode and restore the target viewport. Retain the existing permission-page interactions and diagnostic checks.

- Remove permission-theme declaration checks for trees, dropdown items, tags and hover variables already covered by browser measurements of dark backgrounds and text contrast. Check the accessible name of the permission tree node and its visible text on hover separately. Retain declaration checks for primary-link interaction states, tables, dialogs, inputs and disabled backgrounds, along with real permission-tree interaction, layout and accessibility coverage.

- Review existing import/export tests and remove a Promise-reference comparison already implied by public outcomes in the epoch-race case. Preserve fresh-request success, stale-request cancellation, and cache, event and notification isolation safeguards.

- After reviewing existing resource-generator tests, move the Id-import check that does not vary by integer type outside the loop. Preserve actual generation and VM record-ID checks for both large-integer string types, together with typed transport, exact Decimal, permission/routing and batch-failure safeguards.

- Reserve the existing administrator request budget before permission changes in the permission-reduction test. Bind each role-permission PUT to the path returned by its permission GET, and register only message-list and unread-count GET requests created after that PUT succeeds and before the new context responds successfully as expected cancellations. Separately, when the observed page's main frame actually enters `/403`, register only those two message GETs still pending at that moment. Remove completed or failed requests from pending without retroactively accepting cancellations or registering new requests after the `/403` event. Both mechanisms retain the existing `ERR_ABORTED` check for each specific Request; other failures and requests outside their windows remain strictly checked. Add negative diagnostic coverage confirming that registration does not suppress other network or HTTP failures. During login setup, wait for the initial tenant query to finish after the tenant selector becomes visible and before opening it, preventing a new query from cancelling the unfinished initial query.

- Real browser Worker control, import fixtures and export-artifact maintenance explicitly bind the independent tool source and raw digest of its fixed binding file, rechecking the native compilation root and complete sources before and after calls while retaining the business backend, runtime directory and scope bindings; unknown outcomes are not replayed. Export-artifact snapshot/deletion verification, migration gates and history maintenance use the same tool binding and remove the Cargo compilation fallback at invocation. Close, cancellation and failure finalization continue to verify tool sources, preserving both causes when execution and verification fail together.

- Keep concurrent deduplication, failure retries, visible translations and initial catalog isolation in message-loading tests while removing Promise identity and unused catalog-array length assertions. Remove the array export with no production consumer; preserve the actual three-catalog message merge.

- Observe complete concurrent-call outcomes and side effects in session and runtime-capability tests instead of Promise reference identity. Preserve request and cleanup deduplication, retries after failure, settled-state behavior, and isolation of new CSRF requests from old finalization.

- Narrow HTTP and import/export tests by removing fixed module-export sets, literal internal signatures, attachment JSON formatting and redundant permission exclusions while preserving transport, exact identifiers and receipt behavior. Cover export creation key reuse after unknown outcomes and rotation after success, plus API descriptor rejection of unsupported or ambiguous media.

- Keep reactive-input, nested-edit isolation, submitted-field filtering and empty-capability safeguards in snapshot tests while removing Proxy representation assertions outside the public contract. Check only current domains in non-core bundle budgets and use a current-domain example for optional missing-chunk coverage.

- Add a managed ARIA patch for the locked Element Plus TreeSelect, removing conflicting listbox/tree/option roles and the unnamed tooltip when its tree popup opens. Retain tree nodes, selection states and keyboard implementation without changing ordinary Select behavior. Extend real permission-theme coverage for parent/root selection, clear/echo, expansion/collapse, keyboard and Escape/cancel, changing only an unsubmitted form.

- Add real administrator permission-page theme acceptance using actual menus and permission-tree GET responses with the existing login, diagnostics and axe helpers. Check desktop/mobile diagnostic SVGs, visible-row and expanded-child actions, dark tags/trees and horizontal scrolling. Open and cancel the add dialog without submitting permission changes; wait for theme transitions before saving JPEGs and credential-free observations. Share pure layout/Canvas contrast checks with the retained mock scenarios while preserving their independent coverage.

- Fix the dashboard session tag retaining a light background in dark mode. Use shared semantic theme colors and remove the scoped global selector that did not target the tag.

- Restore dataset authority preflight now uses the coordinator backend's formal Cargo entry with the read-only `restore-dataset-authority` operation and binds the runtime receipt and target plan through standard input. Validate the native response, eight-field authority, and before/after file contents; remove the Python parameter specific to this preflight while retaining Python configuration still used by runtime verification.

- Replace preview early-validation source assertions with imports of the actual Playwright configuration in isolated Node subprocesses. Check rejection of invalid environments and rejected local build receipts before report directories are created, plus port call order and configuration output for valid preview, dev, and external preview. Retain real build-receipt semantics tests without starting Playwright or a browser.

- Base styles enforce the ordinary `hidden` attribute so Element Plus button display styles cannot override semantic hiding, while preserving browser semantics for `hidden="until-found"`. Add an independent browser acceptance entry for hiding and restoring buttons with real CSS.

- Generated `tenant_data` pages read only while business data is active. Maintenance, provisioning, and failed states block automatic list/detail queries and explicit refreshes; a new active scope resumes on the same page without old-request results leaking back. Control-row queries retain their existing behavior. The global maintenance banner now states that both reads and writes are paused.

- Generated `tenant_data` CRUD registrations declare create, update, and delete permissions for existing business-maintenance write protection. Resource manifests join the unified permission set so generated write buttons reuse maintenance protection; reads and `control_row` resources gain no additional restriction.

- Simplify session tests by replacing fixed broadcast totals and random identifier encoding assertions with checks for the secure random source and valid message identifiers. Merge duplicate login-failure setup while retaining challenge invalidation, zero identity publication, and cross-tab session isolation safeguards; product behavior is unchanged.

- Add targeted browser scenarios for generated-order tenant boundaries and two nonempty migrations, preserving the original owner page and session, exact amounts, and complete row images. Retain creation responses before assertions and disable automatic retries. Record resources for controller review without shortening source retention; no automatic cleanup consumer is currently bound.
- The managed generated-page browser entry supports `--spec` to select one test file while retaining IPC, isolation, and failure cleanup; omitting it still runs the complete suite.
- Add independent generated Catalog page acceptance for the system administrator, checking exact JSON strings, nullable-object clearing, boolean toggling, and complete-preimage cleanup through the existing generated entry without expanding business migration receipts.

- Count direct API requests in the generated-page acceptance client budget and reserve capacity before multi-page authorization refresh and tab reload, retaining existing rate limits, mounted-page revocation, and exact cleanup checks.

- Remove renderer test expression and layout assertions already covered by generated-code behavior; reuse the existing VM for optional JSON omission, nullable clearing, exact values, boolean and Unicode enums, while retaining strict type rejection and primary-key mapping coverage.

- Fix generated CRUD forms sending empty strings for blank nullable dates and receiving HTTP 422. Date and datetime fields now submit null or omit optional values according to the contract, preserve selected values, and are checked by executing the generated code.

- Fix source domains for real frontend builds: configuration and identity modules indirectly imported by Vite bind both product and tool digests. The generated-page acceptance configuration is a tool input; test type configuration retains its product binding and also records a tool digest. Complete source validation and conservative product ownership for unknown files remain effective.

- Cross-repository consumer contexts remove repeated full-source scans from frequent Node hooks while retaining fixed descriptions, configuration, and executable identity checks. Existing parent Rust read protection and the native entry retain complete source verification.

- Cross-repository build proofs align with the four current frontend tool-file root sections: unused sections bind the complete file digest without exposing values, and changed bytes still reject old receipts.

- Formal frontend build proofs use the fixed-bound Rust native consumer. Consumer contexts remove interpreter fields and manual bypasses while retaining complete sources, executable identity, and before/after drift guards.

- Generated-page acceptance uses `--generated` with an independent test directory and a dedicated configuration reusing the real base and managed controller. It accepts only real core inputs without recovery bindings or a credential endpoint, preserving the original four-scenario business migration receipt.

- Add a real acceptance case for the generated order page, checking large decimal strings during creation and edit population, page-based deletion, write-button revocation while retaining read permission, and owner-data isolation between ordinary subjects in one tenant. It reuses identity registration and mandatory first password changes and attaches exact order ownership and cleanup records. Unknown creation, editing, or deletion outcomes preserve the scene for reconciliation. Deletion first compares every field of the complete registered row and attaches registered and observed snapshots; failure to clean one row does not prevent exact cleanup of other confirmed rows.

- Business migration cancellation and Worker crash recovery acceptance now prepare tenant administrators through the real mandatory first password change. Subsequent business pages retain the same context and new-password session, preserving cancellation, recovery, and data verification assertions.

- Nonempty business migration acceptance completes the mandatory first password change in the same tenant administrator context before logging in with the new password. Order preparation supplies only the code declared by the formal default fixture's generated DTO, retaining shared and dedicated target migration, digest verification, and retention assertions. Amounts and ownership permissions are accepted separately using an evolved sample that declares those fields.

- Removed the restore-fact derivation helper and its dedicated test and fixtures, which had no formal browser or script consumers. Formal runtime-receipt and dataset-authority validation remain unchanged. Removed a duplicate POST-method assertion already guaranteed by the request waiter in capability-switch acceptance, retaining complete capability, permission, and historical-data behavior coverage.

- Reviewed login, session, and CRUD generation tests, removing redundant generated-source fragment checks and merging duplicate authenticated-message samples. Invalid cross-tab sessions, route refresh arguments, byte-for-byte generated assets, actual slot behavior, mandatory first password changes, tenant isolation, and asynchronous race coverage remain protected.

- Notice list and detail queries follow the current session's capability and read permission, avoiding unauthorized queries while a revoked page is still mounted. Tenant business acceptance completes the administrator's mandatory first password change, and the restore lineage type removes the obsolete password-environment field.

- Stopping a message connection immediately revokes the old generation's business callbacks, heartbeat and reconnection. A connecting socket closes after opening, avoiding browser handshake warnings caused by deliberate stops. Browser diagnostic summaries redact URL credentials and query contents while preserving warnings and failure status.

- Standard CRUD list, detail, auxiliary tree and role-option queries now require their current read permissions. Revoking authorization prevents still-mounted pages from requesting data in the new session scope. Flat resource pages explicitly pass their existing list permission, and the formal renderer updates managed pages while preserving scope cancellation and error diagnostics.

- Real session acceptance now prepares ordinary accounts through initial login with `123456` and mandatory page-based password change, retaining `Valid!Session123` for existing race scenarios. The separate `password-lifecycle.spec.ts` preserves administrator reset, same-origin fragment consumption, and page submission coverage, and checks old password and session invalidation plus successful new-password login using existing resource ownership cleanup and budgets from actual configuration.

- The public CRUD contract now accepts the existing resource renderer's type-compatible JSON, boolean switch, date, date-time, and multiline text editing controls. It continues to reject type mismatches, unknown widgets, editable hidden fields, number inputs for exact numeric strings, and invalid transport, enumeration, or nullable/action combinations.

- API generation reports the managed relative path, IO error code, and file-type and permission guidance when a managed file cannot be read. It retains the original error cause and advises preserving unknown directories and files for inspection.

- Parent permissions are selected by their actual node IDs, eliminating missing-node-value warnings; collapsed menus retain localized accessible names. Added desktop and narrow-screen browser coverage for single-line actions, dark tag and tree-node contrast, and permission-page accessibility.

- Added English versions of the architecture guide and complete change history. Static checks validate language pairs, language links, local section references, and command examples; English documentation changes retain provenance without triggering product rebuilds.

- The OpenAPI-derived file manifest uses versioned JSON as the cross-repository source of truth. The frontend generator and Rust contract transaction jointly validate paths, duplicates, and format; the backend no longer parses a JavaScript manifest.

- The frontend takes ownership of all standard resource UI boundary and contract assertions, covering the exact 300/301-line threshold, recursive imports, wide models and large enumerations, control types, and precision conversions. It also verifies Post action slots, typed callers, the system tenant, and relation details; existing backend validation, SQL, and managed transaction tests continue to run independently.

- Frontend tests maintain Order contract completion, integrity checks, and failure samples for resource Workspace consumer verification. The strict standard-input protocol preserves the existing idempotency and partial-contract rejection scenarios without embedding TypeScript code in the backend.

- Standard CRUD pages provide a pure resource renderer maintained by the frontend, explicitly binding resource IR and generator versions and returning complete assets through a read-only standard-input protocol. It preserves Post and Notice byte consistency, recursive wide-table splitting, exact integers and Decimal, and strict type and runtime positive and negative scenario validation.

- Browser smoke tests save reports, screenshots, videos, and traces in separate generations so a rerun does not erase the previous failure evidence.

- Dark-theme text checks now include the actual background after the primary color is overlaid on active tags, fixing insufficient active-tag text contrast on the home, post, and tenant pages.

- Range metadata for 64-bit string integer fields is validated as exact decimal strings, rejecting numeric rounding, invalid formats, and out-of-range values. Text, numeric, and enumeration fields intended only for creation are disabled during editing and prevent late updates from writing back.

- The Chinese and English READMEs document explicit password recovery for ordinary accounts from older development versions, the independence of disabled status, and invalidation of older reset links.

- Global business pages constrain menu projection and direct access using the authoritative system-tenant identity. Other tenants cannot access them even with permission wildcards, while the backend maintains the actual authorization boundary.

- Added an English README and bidirectional language links describing the initial password change, tenant modes, independent startup, and current theme behavior.

- Page manifests and dynamic routes consistently apply multi-tenancy restrictions. Single-tenant mode does not register tenant or plan management pages and blocks direct URL access; configuration migration and data maintenance remain available.

- Integrated the official Element Plus dark variables and fixed the primary color scale after theme switching, semantic tag colors, tree nodes, select overlays, dialogs, tables, inputs, and disabled states. Permission action columns stay on one line while tables allow horizontal scrolling.

- The login page resolves tenant mode only after runtime capabilities load successfully: single-tenant mode hides the tenant selector and uses the system tenant; multi-tenant mode waits for a valid selection; an unknown state neither infers a tenant nor permits submission. Loading failures display the reason and offer a retry.

- Generated menu route contracts carry icons from the access catalog. Generated assets, session menus, and sidebar icons for menus such as authorization diagnostics use the same source of truth.

- Login, refresh, and session restoration consistently recognize the initial-password-change state and restrict business routes and messaging connections. Added a mandatory password-change page, shared a two-column layout across authentication pages, and removed automatic administrator password filling in development.

- Authorization diagnostics distinguish lagging cache versions, abnormally advanced versions, disabled caches, and unavailable caches instead of presenting every version difference as lagging.

- Business migration browser acceptance permits only the single monitoring trend request cancelled by the Query lifecycle when leaving the home page after login. Other request cancellations still count as diagnostic failures.

- The outer polling budget for business migration retention checks covers the cold-start time allowed by the maintenance entry point, avoiding a false failure when the authoritative task completed within one second but the first Cargo build exceeded 30 seconds.

- The real-browser core suite aligns with the capability catalog and export contract: empty-capability plans assert the unauthorized state against the complete catalog; export requests include empty `ids`; selector containers and submenu clicks use stable locators; switches are clicked through their containers; new notices default to published; login-budget client addresses use the allowed 198.19 range; capability changes permit in-flight notice queries cancelled by epoch refresh as designed; and artifact snapshot receipts are written to a runtime directory under the current backend's `.local-tests`.

- Real-browser login waits for tenant options or pagination controls to finish rendering, fixing visibility races after menu expansion and pagination responses.

- Production builds reuse the type-checking and Vite task graph. `--real` verifies provenance before and after the build and issues a complete artifact receipt; `--plan` neither starts the build nor writes files.

- Real business browser acceptance binds core or business fixtures through the unified check entry point. It covers shared and dedicated database migration, retention, cancellation, and Worker crash recovery, and strictly validates complete zero-retry scenario receipts and preview static responses.

- Real-browser acceptance calls the Worker control and import fixture entry points under the current backend's `tools/python`, fixing paths left over from the tool migration.

- Corrected outdated architecture documentation claiming that check, generation, test, and CI entry points had been removed, and added business API sharding and real-environment acceptance usage.

- Generated business endpoints and their referenced models belong to the lazily loaded system shard, keeping business endpoints out of the initial core caller set.

- Fixed candidate consumer checks incorrectly treating provenance markers as the OpenAPI body. Both formal and candidate modes compare the validated contract body.

- Plan and tenant override editors validate consistency against the complete nonempty capability catalog, variants, and configuration Schema. They reject missing catalog entries, duplicates, and enablement requests unavailable in the deployment.

- Completed the static, test, coverage, build, and read-only plan stages of the check entry point. Added helper modules, provenance checks, and regression tests required by real-browser and recovery acceptance to the gates, and restored runtime dependency cycle and bundle size budget checks.

- Plans expose only notices and proactive tenant messaging as optional capabilities. Basic administration pages no longer require plan switches, while protection for post business writes remains. Plan and override editors reject extra configuration fields, and documentation on checks and CI was corrected.

## [v0.13.1] - 2026-10-08

- Export browser acceptance aligns with the selected-primary-key contract, adding row selection, select-all on the current page, clearing selection on page changes, and empty-filter confirmation scenarios.
- Data retention's “Preview cleanup” uses a standard primary button. The global gradient background applies only to enabled solid primary buttons, avoiding overrides of plain, link, text, and disabled button styles.
- Users, roles, posts, parameters, dictionary types, and both log types support exports of selected rows on the current page and a select-all button. With no selection, export continues to use the applied filters; empty filters require confirmation.
- Fixed complete consumer checks mistaking the default stage for an explicit `--stage`, preventing `check --full` from running.

- Moved 19 SCSS files used by a single component into their corresponding Vue files, preserving their style scopes. Global styles continue to load through the unified entry point.
- Standardized the product plan “New version” button on primary styling and limited the scope of title helper-text styles to avoid affecting button text contrast.
- Invalidated the current CSRF challenge after each login request finishes. A subsequent login after response validation or request failure obtains a new challenge matching the current Cookie.
- Session response validation failures explicitly report an interface contract mismatch instead of misreporting menu/permission catalog drift as missing tenant information. Strict validation and fail-closed behavior remain.

## [v0.13.0] - 2026-10-08

This release consolidates the original 0.13 development releases into a single v0.13.0 baseline; the complete commit history is retained.

### Fixed

- Aligned the frontend version with backend `v0.13.0` and bound the formal OpenAPI source to backend `6a1bf8e187546cc00d10aa700744d304e2cfb473`, consolidating earlier duplicate version and contract alignment entries.
- Frontend CI runs contract checks, unit tests, production builds, browser smoke, and Windows smoke separately; default `pnpm check` now runs the complete contract checks.
- Frontend tags create GitHub Releases after independently validating frontend source, without depending on the backend release workflow.
- Windows tasks run through a Node worker assigned to a private Job Object before startup. The actual exit code and signal are returned over IPC first; failure or cancellation closes the Job to reclaim the entire descendant process tree without affecting independent tasks.
- Added alternative text for navbar and profile avatars, retaining accessibility after real avatar uploads.
- Increased text contrast for backup status tags and anomaly numbers. The sum of categorized counts is labeled as anomaly items, explaining that one resource can have multiple anomalies.
- Migration cancellation or completed cleanup releases operation blocking and stops polling. New migrations remain restricted during the retention period, preventing historical request flags from leaving the page permanently processing.
- Ordinary-user theme initialization uses the current tenant's fixed interface-settings endpoint. Search and reset return the refresh Promise to page event handlers, avoiding unhandled rejections from session cancellation.
- Login, refresh, and CSRF requests bind the session cancellation signal, including the anonymous phase. Completed old challenges and refreshes cannot overwrite a new session.
- Fixed explicit Query refreshes throwing unnormalized cancellation exceptions when authorization scope changes. Old refreshes cannot enter completion callbacks for a new session; ordinary failures continue to propagate.
- The development server excludes artifacts under the current frontend's `.local-tests` from file watching to prevent browser trace writes and hot-update notifications from triggering each other. Source hot updates in isolated worktrees remain available.
- Fixed dependency and plugin initialization ordering errors in production bundles caused by forcing application source aggregation. Internationalization builds match the existing Composition API mode and retain the original bundle size budget.
- The message center explicitly sets list font size and line height, preventing checkbox groups' zero font size and line height from making notice titles and content invisible.
- Increased text contrast for status tags in tenant capacity details, retaining their state colors and wording.
- Fixed exceptions when snapshotting reactive preview objects for data migration and plan assignment, isolating subsequent edits to nested capability configuration.

### Removed

- Removed service-account pages, key/delegation dialogs, access audit, service delegation in the profile, and their dedicated APIs, permissions, and text. Profile details, passwords, avatars, and login sessions remain.

### Changed

- Required aggregation consumes GitHub event and needs snapshots through the frontend's unified task graph, removing duplicate workflow maintenance of internal script argument entry points and gate-name lists.
- Formal recovery browser scenarios call the pinned backend's read-only authoritative preflight before the first session, binding the same run, target, and C52 data source to configuration, workers, and final proof.
- Production build receipts use a strict v2 format, separately recording frontend product inputs, acceptance-tool inputs, complete source, Node/Corepack pnpm/Vite versions, the production environment digest, and the full `dist` manifest. Receipts cannot be issued or reused if provenance changes during the build, the actual pnpm version is missing, or the current environment file and artifacts drift.
- Session race tests register users and roles from successful creation responses and clean them up precisely at the end. Preparation failures still reclaim known identities; unknown commits retain a reconciliation state. Page startup and cleanup have separate real-request budgets.
- Real upload acceptance includes 4 MiB text within the default limit, a valid image larger than 2 MiB, and a user import sample. It also checks malformed forms and oversized chunked responses at each upload entry point.
- Fast format checks explicitly load the shared Prettier configuration and reuse a content cache.
- Real-browser tests use a local transparent proxy and exact response gates, preserving real responses and Cookie timing in full. Added verification of queued Worker cancellation and physical export-object cleanup.
- Real-browser logins share an inter-process budget based on actual service limits and reuse stable identities and client addresses. Restarts retain reservation facts rather than bypassing 429 through retries.
- Production builds first freeze the source before-image in the unified task graph, build and check bundle size, and then record source and complete file digests. The built-in real preview checks current source and artifacts before startup; recovery acceptance binds runtime artifacts and checks them again at completion, rejecting old artifacts or changing provenance.
- Typed caller and schema generation converge on the core, system, platform, and monitor domains. Existing plan, tenant, and all monitoring entry points remain, with support for an empty capability catalog.
- Split export status tracking, personal export operations, schedule forms, and cross-tab refresh waiting. Expanded targeted session/message coverage and race tests.
- Routine and extended CI support coordinated tag acceptance. Real-service browser configuration adds a production-build mode and separate failure-artifact directories.
- Routine browser gates reuse current build artifacts and separately accept the development server and production preview. Real acceptance uses an explicitly same-origin build and blocks HTTP/WebSocket requests outside the allowed boundaries.

### Added

- Added real tests for Post exports, notice messages, plans and tenants, data migration, session refresh and logout, scheduling and configuration migration, and user import. Added a strict recovery business-proof generator that produces proof only for complete successful scenarios.
- Runtime monitoring adds a read-only backup and recovery card showing collection availability, anomalous resources, recovery results, and stale snapshot warnings.

## [v0.12.1] - 2026-09-02

### Changed

- Coordinated with the Rust 1.98.0 backend to release 0.12.1, synchronizing versioned OpenAPI and generated assets. Endpoint and page behavior remain unchanged.

## [v0.12.0] - 2026-09-02

### Added

- Added `tenantId / subjectId / sessionEpoch` server-state scopes. Query, messaging, export, profile, and service-account caches are consistently isolated by tenant, subject, and session generation.
- Added request-level session snapshots and session cancellation signals. Expired Queries, Mutations, 401 refreshes, and callbacks cannot write into a new session or display cancellation errors.
- Added typed callers split by OpenAPI domain, explicitly supporting JSON, multipart, text, and blob response binding. Generation fails when the media type cannot be determined uniquely.
- Added a route catalog registry. The initial screen synchronously loads only core, shell, and global export text; other internationalization catalogs load on demand with routes and support concurrent deduplication and retry after failure.

### Changed

- Vue Router, Pinia, and Element Plus services use explicit imports. Static gates enforce the dependency direction of Stores, API modules, feature contracts, and `shared/http`.
- All administration pages, confirmations, export flows, and form Mutations capture the session scope at the start. Expired completions no longer trigger notifications, callbacks, cache writes, or invalidations.
- Generated APIs are emitted by core, system, platform, monitor, and agent domain, removing the old monolithic operation entry point. Handwritten modules retain only business naming, parameter normalization, and explicit adapters.
- Development and CI commands consistently use `pnpm@11.20.0` through Corepack. Routine CI converges on 5 business jobs; compatibility, licensing, bills of materials, and vulnerability scans move to extended gates.
- The README and architecture guide describe only current project usage, boundaries, and CI status, without historical optimization comparisons.

### Fixed

- Fixed old query results, navigation projections, and asynchronous effects writing back after same-tenant user switching, cross-tenant switching, permission reduction, authorization epoch changes, and cross-tab authentication.
- Fixed slow Mutations, export confirmations, administration dialogs, profile operations, and service-account operations potentially showing notifications or refreshing a new subject's cache after a session switch.
- Fixed generated operation response-media-type selection, nested i18n catalog checks, and CI workflow context-scope validation.

### Validation

- Across 5 measured frontend production builds, P50 was 3.996 seconds and P95 was 4.362 seconds; fast-check P95 was 9.506 seconds.
- Initial JavaScript is 162,102 B gzip, core i18n is 8,657 B gzip, and core operations are 780 B gzip. Non-core operations and business catalogs do not enter the initial dependency graph.
- 72 test files, 293 unit tests, 5 browser smoke cases, and real API/MySQL/Redis/Chrome flows passed. Login, home, post, and tenant pages introduced no console errors or warnings, and axe serious/critical findings were zero.

## [v0.11.3] - 2026-08-27

### Changed

- Consolidated the unidirectional dependency, session, navigation, messaging, and settings architecture, keeping Pinia Stores passive and placing effect orchestration in application coordinators.
- Improved feedback speed for formatting, static checks, type checks, resource generation, contract validation, and browser tests.
- Simplified user-facing project documentation, unrelated collaboration templates, and leftover Qodana configuration.

## [v0.11.2] - 2026-08-23

### Changed

- Synchronized asynchronous exports based on applied filters, task downloads, cancellation, and single and batch deletion of terminal tasks.
- Standardized internationalized display of menus, permissions, statuses, and times, and pinned the accompanying backend contract source.

## [v0.11.1] - 2026-08-21

### Fixed

- Fixed HTTP `202` success envelopes being mistaken for deletion failures. Actual status envelopes now cover single deletion, batch deletion, and browser smoke.

## [v0.11.0] - 2026-08-21

### Added

- Added OpenAPI-generated operation descriptors, a strongly typed access catalog, and deterministic contract validation.
- Added export flows using the last applied filters, and interactions for single and batch deletion of terminal tasks.

### Changed

- Standard API calls fully migrate to generated operation descriptors. Menus, permissions, routes, and request types use the same contract source.
- Added release gates pairing immutable frontend and backend commits, and synchronized backend resource and version identities.

## [v0.10.0] - 2026-08-19

### Added

- Added management interfaces for plans, Capability, tenant data placement, and migrations with writes suspended. Product changes and migrations complete through preview, confirmation, and task progress tracking.
- Added an atomic tenant session context and feature manifests. Dynamic routes, menus, buttons, tabs, and business write availability are jointly controlled by tenant Capability, RBAC, and data state.
- Added an operations overview aggregated strictly by the current tenant. On-demand ECharts displays background tasks, schedule results, and login and operation trends; authorized users also see a lightweight activity chart for the last 24 hours on the home page.
- Added a system-tenant-only data retention page for viewing effective policies, previewing estimated cleanup volume, triggering permanent cleanup idempotently, and tracking runs.
- User management adds a resumable, cancellable asynchronous Excel import flow, including template download, progress, invalid rows, cancellation, and error report download.
- Added a read-only authorization diagnostics page that displays role sources, effective permissions, menu visibility, data scope, and authorization cache version status from the primary database.

### Changed

- Removed the old synchronous user-import request entry point. The frontend consistently uses the asynchronous import contract published by backend commit `d5270940c62ec31a6ea14f786549654aeef6bbaa`.
- ECharts registers only line, bar, and pie charts and the components actually used, with SVG rendering. Charts and text for new pages load asynchronously and stay out of the initial screen for users without permission.

### Fixed

- Fixed blank activity, scheduling, login, and operation charts when operations-overview trend requests completed before the overview request and no redraw occurred after the chart container mounted.
- Removed the hardcoded tenant management entry from the sidebar that duplicated server-provided dynamic menus. Platform management uses the session context's menu tree as its sole source.
- Login captchas display at their original resolution and prevent concurrent overwrites during refresh. Input strips whitespace and converts to uppercase, and captcha configuration is requested for the currently selected login tenant.
- Fixed menus and the profile's “Service delegation” card remaining visible and issuing invalid requests when service accounts were not enabled. The frontend consistently hides entries and blocks route access based on the session context's `system.service_accounts` Capability.
- Fixed menu management directory-row `el-tag` components passing an empty `type` and causing Vue prop validation warnings. Directory tags use the default style.
- Fixed Element Plus warnings from the deprecated `small` attribute in tenant management's mobile pagination, replacing it with `size="small"`.
- Uncaught development runtime errors now output the actual `message` or serializable content instead of only `[object Object]`, making intermittent errors easier to diagnose.

### Validation

- Added contract gates for strictly empty write-request bodies, pagination manifests, and string IDs. Type checks, ESLint, Stylelint, production builds, and Bundle budgets continue to pass.

## [v0.9.0] - 2026-08-08

### Changed

- Split the message center into detail dialogs, inbox drawers, operation orchestration, query keys, and cache changes. Delivery acknowledgements, read status, deletion tombstones, and WebSocket runtime state each have separate modules, retaining tenant isolation and existing interaction semantics.
- Split the HTTP client by transport, session, and error handling, and split notice management into a table, an editor dialog, and a domain composable, narrowing each file's responsibilities and standardizing asynchronous error boundaries.
- Vite development dependency prebundling uses a fixed set of top-level runtime dependencies with automatic discovery disabled during execution. The production chunk warning threshold is tightened to 500 KiB, and a reviewable baseline is established for the current build size.

### Fixed

- Fixed deeply nested Element Plus styles being discovered late on the first visit to a lazy-loaded menu after a cold start, triggering Vite `optimized dependencies changed` and reloading the entire page.
- Fixed pnpm 11 aborting dependency-state checks because the `vue-demi` build script had not been approved. Project-level build permission is now registered explicitly.
- Fixed menu switching repeatedly rebuilding application state during development-server configuration changes or dependency optimization. Common runtime dependencies are optimized once during startup.

### Validation

- Frontend gates pass workflow and dependency policies, the pinned backend OpenAPI contract, generated assets, ESLint, Stylelint, type checks, production builds, and size budgets.
- Removed the no-longer-maintained source-comment language and old architecture static-scan scripts and their CI entry points. Current gates consistently run through `pnpm check`.
- This version is released jointly with backend `v0.9.0` using identically named annotated tags. The frontend retains an immutable source tag; the formal GitHub Release is created by the backend's joint release workflow.

## [v0.8.0] - 2026-08-07

### Added

- The message center adds responsive Markdown details and single and batch deletion. Notices and notifications are rendered safely through `markdown-it` with raw HTML disabled and through DOMPurify.
- Role permission dialogs add independent “Expand/collapse,” “Select all/clear all,” and “Link parent and child” options. Trees default to collapsed with parent-child linkage enabled; disabling linkage permits saving any exact combination of permissions.

### Changed

- Messages automatically acknowledge delivery when received and are marked read only when their details open. Removed the manual delivery button. Delivery, read status, deletion, and unread counts synchronize precisely through tenant-isolated Query caches.
- Dynamic routes mount under the stable `RootLayout`. Login and route guards first install accessible routes through an idempotent single-flight flow, then navigate to a safe in-app destination.
- Sidebar menus consistently use Vue Router navigation. Clicking the current address does not repeat the action, and switching top-level menus reuses the same application shell.
- The permission management menu page and role permission trees both default to collapsed on first opening. Switching parent-child linkage affects only subsequent checks and does not change the current selection.
- Session coordination and message queries are split by responsibilities such as channel, CSRF, refresh, lifecycle, cache, sync, and hooks. The original public modules remain as compatibility facades.
- Administration lists, infrequent configuration, messaging, and monitoring resources use explicit Vue Query caching and refresh policies. Element Plus is no longer forced into a single initial chunk.

### Fixed

- Fixed a race in dynamic route registration that sent successful logins to 404 and required clicking Home again to enter the system.
- Fixed sidebar menu clicks triggering document-level navigation, full page reloads, and reconstruction of application state.
- Fixed message content failing to open or render as Markdown, and delivery and read operations having duplicate UI semantics.

### Validation

- Frontend gates cover the pinned OpenAPI source and generated assets, source hygiene, workflows, dependency and architecture checks, ESLint, Stylelint, type checks, production builds, and size budgets.
- This version is released jointly with backend `v0.8.0` using identically named annotated tags. Stable Releases retain only GitHub-generated source ZIP/TAR archives.

## [v0.7.0] - 2026-08-05

### Added

- The operationId registry, permission catalog, and strongly typed request entry points are generated automatically from backend OpenAPI. Notices, tenants, the sidebar, and permission directives consistently use the generated contract rather than handwritten duplicate paths, parameters, or permission strings.
- Added consistency gates for the frontend package version, OpenAPI version, and pinned provenance metadata to prevent version drift from entering commits or releases.

### Changed

- Synchronized backend `0.7.0` OpenAPI. Read-replica runtime status adds consecutive failure and success counts, and contract provenance is pinned to one complete backend commit.

### Validation

- Frontend gates cover contract generation and pinned provenance validation, source hygiene, workflows, dependency policies, architecture, Lint, types, coverage, production builds, size budgets, and Playwright E2E.

## [v0.6.0] - 2026-08-03

### Changed

- Removed v0.4 localStorage credential cleanup, the bare `*` super-permission, and inference of missing menu fields. Only current OpenAPI menu and permission contracts are accepted.
- Removed the `src/app/messages/messageApi.ts` compatibility re-export. Messaging APIs and tests consistently use `src/api/modules/messages.ts`, and architecture gates prohibit the old import path from returning.
- Operation-log and login-log exports send only the canonical `name` field, no longer sending the old `oper_name/user_name` export filters.
- Notice forms, lists, and generated API types consistently use `content_markdown` without sending or reading the old `content` field. The frontend derives the 60,000 UTF-8 byte limit from backend OpenAPI and validates byte length before submission.
- Deployment configuration accepts only the optional `VITE_APP_API_ORIGIN`. The `/api/v1` prefix is generated from backend OpenAPI's `x-ryframe-api-prefix`; `VITE_APP_BASE_API` and its old path fallback are removed.
- Removed all unbounded list APIs and the `NoPage` type without retaining compatibility for old endpoints. User forms and role assignment use tenant-level `/roles/options` remote prefix search. Query keys include `q/limit`; input is debounced and expired requests are cancelled through Axios `signal`, while editing preserves selected roles.
- The message center's inbox, unread count, loading state, and refresh state move to TanStack Vue Query. Cache keys include tenant, user, and filters/cursors. WebSocket delivery directly updates QueryClient; connection/reconnection and backfill every 60 seconds merge by ID. Delivery acknowledgement, read marking, and marking all read consistently use mutations; Pinia retains only real-time connection state.
- Removed frontend Nightly tags and the independent Release workflow. The frontend maintains only stable annotated tags matching the backend, which is the sole joint-release controller. Stable Releases retain only GitHub-generated source ZIP/TAR archives and do not upload `dist`, images, SBOMs, signatures, or other custom attachments.
- Routine CI combines a single dependency installation with one Node 24 quality job. Types, Lint, coverage, production builds, size checks, and browser acceptance sequentially reuse the same workspace. Playwright directly previews the generated production build. Node 22.22.2 compatibility gates run independently each week, avoiding duplicate compilation alongside the routine primary gate.
- Coverage gates are scoped to the list of core TypeScript business modules managed by architecture guards, with 70% thresholds for statements, lines, and functions and 60% for branches. Session, authentication, HTTP, user-state, permission, and messaging critical modules each run with 90%/80% thresholds. Vue presentation remains covered by Lint and browser acceptance.
- Server state for system, platform, monitoring, profile, and code-generation pages consistently moves to tenant-isolated TanStack Query/Mutation. Reads support cancellation; writes use pending state to prevent duplication and precisely invalidate resource caches.
- Asynchronous exports consistently use Mutation to manage task creation, polling, and downloads, passing `AbortSignal` through the entire chain. Tenant switches or component unmounts cancel requests, and simultaneous duplicate clicks execute only one task.
- Appearance configuration moves to Shell Settings Query, and language saving to a tenant Mutation. Stores retain only pure local state; Navbar catches only user cancellation while continuing to propagate actual logout errors.
- Added a server-state architecture manifest and self-tests, prohibiting administration pages from reverting to direct `onMounted` fetches, manual loading/pending, comment-only empty catches, or unregistered runtime API entry points.

### Fixed

- Fixed the source-hygiene scanner mistaking YAML `docker://` container references for slash comments. Added lexical regression tests and restored the frontend CI source gate.

## [v0.5.1] - 2026-08-02

### Changed

- GitHub Actions consistently upgrade to versions compatible with Node.js 24, eliminating Node.js 20 deprecation warnings on hosted runners.
- Combined duplicate frontend source, type, test, and build checks, sequentially reusing the workspace after one dependency installation to reduce repeated execution and CI queue time.
- Synchronized backend v0.5.1 OpenAPI contracts and regenerated TypeScript API types and password policy.

### Fixed

- Disabled `setup-node` automatic caching, which is incompatible with the current pnpm layout, preventing CI failures during cache initialization.
- Removed duplicate jobs and standardized Action runtimes, restoring all-green gates on the frontend's main branch.
- Fixed dashboard tenant and login-status tag colors blending during entrance transitions and briefly falling below WCAG AA contrast.

### Validation

- Frontend gates cover contracts, source hygiene, workflows, dependency policies, architecture, ESLint, Stylelint, type checks, coverage, production builds, size budgets, and Playwright E2E.
- Recorded the full backend commit SHA and OpenAPI SHA-256 to ensure the v0.5.1 frontend traces to one backend contract.

## [v0.5.0] - 2026-07-18

### Added

- Production builds support `VITE_APP_BUILD_COMMIT` and generate `build-identity.json` in the dist root so RC automated observation can validate the frontend commit actually deployed.
- Added application-level session coordination covering initializing, authenticated, anonymous, and dependency-unavailable states, with silent restoration after page reloads.
- Added CSRF challenges, single-tab refresh single-flight, and multi-tab session coordination through `BroadcastChannel`.
- Added session, authentication API, HTTP client, user Store, and key Vue component tests, together with initial-screen and asynchronous-chunk bundle budget gates.

### Changed

- Login responses accept only access tokens. Refresh tokens are stored in HttpOnly Cookies on the API domain, and refresh uses an empty request body.
- Ordinary and raw Axios transports consistently enable credentials. Access tokens, CSRF tokens, and user sessions are stored only in Pinia coordinator memory.
- Application startup and route guards wait for session initialization, then consistently restore users, permissions, and dynamic routes after a successful refresh.
- Online-user device identifiers use the stable `sid`; health checks move to `/livez` and `/readyz`, and v0.5.0 OpenAPI-generated types are synchronized.
- Element Plus components and icons use on-demand imports. Production builds enforce strict JS/CSS size budgets and a zero-warning gate.

- GitHub Nightly publishes source-only snapshots only after `main` CI succeeds, without installing dependencies, building, or uploading `dist` archives. Before release, old custom attachments are removed through paginated cleanup; only GitHub-generated Source code (zip/tar.gz) remains on the page. RC and stable continue to use backend joint gates to create project-level source Releases. The frontend maintains only matching tags and does not release independently in advance.
- Nightly tags become annotated tags. Tag annotations and Release bodies use the same complete section extracted exactly from the Changelog for the current package version. Empty descriptions or version headings alone are not allowed.

### Removed

- Removed localStorage persistence APIs for access/refresh tokens and cleaned up legacy token keys on first startup.
- Removed the old `RefreshRequest`, the JSON `refresh_token` response field, and the refresh protocol that depended on `X-Tenant-Id`.

### Fixed

- Fixed the home page still using light backgrounds, borders, and shortcut cards in dark mode, causing incorrect text and content display.
- Completed on-demand icon registration for MySQL baseline menus, added a consistent fallback for unknown database icons, and fixed collapsed-sidebar submenu popovers being clipped.
- Fixed session-state handling for concurrent `401` responses, simultaneous refreshes across tabs, server refresh `409` grace-period retries, and `503` dependency failures.
- Password reset pages immediately remove query parameters after reading a one-time URL token, preventing the token from remaining in the address bar or browser history.
- Private avatars and files consistently use authenticated requests converted to Blob URLs. Limits and prompts remain consistent: 5 MiB avatars, 10 MiB ordinary files, and 120-second uploads.
- Fixed Vite dependency-optimization reloads on the first visit to lazy-loaded pages after a Playwright cold start causing dynamic route modules to return `504`.
- Fixed architecture gates depending on the Git-ignored `.env.production`, which was necessarily missing after CI checkout. They now validate a safe example file that can be committed.
- Fixed a Browser Smoke race that expired the access token before Cookie session restoration completed after a full reload. Also removed leftover `ryframe_device` test data and assertions.

### Security

- Refresh Cookies are no longer exposed to JavaScript. Access tokens and CSRF challenges remain only in page memory, and logout always clears local session state.
- Authentication requests consistently carry Cookies and `X-CSRF-Token`, without restoring plaintext tokens from local storage.

### Validation

- Session/auth/HTTP client coverage gates require 90% for lines/functions/statements and 80% for branches; all handwritten TS/Vue requires 60%/50%.
- CI covers contracts, source architecture, zero-warning ESLint/Stylelint, typecheck, unit/coverage, production builds, bundle budgets, and Playwright E2E.
- Nightly release gates require at least one change entry in the Changelog section, an annotated tag, a post-release body exactly matching the extracted content, and zero custom Release assets.

## [v0.4.2]

### Added

- Code generation uses a dialog to enter an absolute output directory outside the project. Generated files are no longer written directly into the current frontend project.
- Added protected object-storage image loading, converting authenticated avatar requests into displayable Blob URLs.

### Fixed

- Fixed avatars still showing the old image after upload in production.
- Fixed avatar upload request timeout configuration and CSP display issues for private images.

### Changed

- The code-generation button first asks for an absolute output root on the backend service, then submits generation options to the backend, avoiding direct generation into the current project.
- Private object-storage avatars are downloaded through the authenticated client and converted into displayable Blob URLs. Profile and navbar avatars refresh immediately after upload.
- Avatar uploads use a separate 120-second request timeout to accommodate production image processing and object-storage latency.

## [v0.4.1] - 2026-07-17

### Changed

- The frontend package version and checked-in backend OpenAPI snapshot both upgrade to `0.4.1`, keeping release tags, build artifacts, and API contracts consistent.

### Fixed

- CI and Release workflows explicitly set Git's default initialization branch, eliminating default-branch warnings from `actions/checkout`.
- CI and Release reuse the repository's pnpm installation Action, reading the exact version from `packageManager` and disabling installation audit noise, eliminating third-party installer warnings about the v11 layout, Node `DEP0169`, and bootstrap audits.

## [v0.4.0] - 2026-07-17

### Added

- Added the user-management `DepartmentTree` component and `useUserManagement` composable, separating department filters, queries, submissions, and state actions.
- Added domain composables and form dialogs for role, menu, and permission management, leaving pages responsible only for list presentation and interaction orchestration.
- Added pure-function menu tree tests and a unified `confirmAction` that distinguishes user cancellation from actual request failures.
- Added a separate user role-assignment dialog.
- Added backend OpenAPI snapshot synchronization, `openapi-typescript` generation, and a Git diff contract gate.
- Added API architecture and contract checks covering 119 operations, 34 query operations, success responses, write-request bodies, and string IDs.
- Added a cross-repository page registry gate based on OpenAPI `x-ryframe-menu-routes` and the TypeScript AST.
- Added password policy, runtime validators, and contract consistency tests generated from OpenAPI `x-ryframe-password-policy`.
- Added pure-function tests for workspace shortcuts and initial login state, covering permission filtering, development credentials, and safe redirects.
- Added Playwright browser smoke tests and a separate CI job, covering login, refresh restoration, dynamic menus, permission denial, logout, and mobile layout.
- Added a runtime database topology table separately displaying the primary database, named read replicas, the `ryframe_device` business data source, polling policy, and each node's dynamic connection state.

### Changed

- The Release workflow extracts notes exactly for the triggering version tag, retaining the empty `Unreleased` section and no longer releasing the wrong section.
- The user-management page becomes a page orchestration layer, reusing separate department tree, form, role-assignment, and password-reset components and domain composables.
- Password-reset completion requests consistently send explicit `tenant_id`, `request_id`, and a one-time token, and carry the tenant request header.
- Role permissions and data scope use resource-based full-replacement endpoints. Data scope sends only one atomic request.
- User creation submits profile details and roles together. Profile, role, and status updates use the resource root, `/{id}/roles`, and `/{id}/status` respectively.
- User status, role data scope, and permission type use finite union types, removing arbitrary-string contracts.
- 14 API modules consistently reference generated query, request-body, and response models through `src/api/contract.ts`, retaining only request functions and necessary narrow semantic types.
- CI validates the backend main-branch contract, generated files, and API module boundaries before type checking.
- Runtime monitoring directly uses OpenAPI-generated primary/replica/business-data-source and object-storage health types, displaying the RustFS backend, endpoints, and actual connectivity.
- Export functions use the generated request types for their respective operations and consistently remove pagination keys.
- Dictionary management splits into type/data dialogs and `useDictManagement`; the profile splits into details, avatar, and password components. Pages are responsible only for composition and state synchronization.
- The home page becomes an operational workspace based on the real session and permission menus, removing descriptions of nonexistent Kafka and gRPC capabilities and donation assets.
- Password reset, personal password changes, and tenant administrator passwords consistently use the backend-generated policy. Initialization accounts are prefilled only in development; production builds leave usernames and passwords empty.

### Fixed

- Resetting user queries also clears the department filter. Dictionary and department data initialization use independent failure handling.
- Status changes restore the original value on cancellation or failure. Deletion and status-request failures are no longer silently swallowed by confirmation catch logic.
- Fixed frontend contracts for notice creators, profile departments, and uploaded file IDs potentially degrading to JavaScript `number`, and corrected health-check timestamp types.
- Fixed export queries carrying `page/page_size`, which caused the backend to reject unknown parameters.
- Fixed fixed-width two-column layouts on profile and dictionary pages causing clipped panels and horizontal scrolling on mobile.
- Fixed login-page default passwords disagreeing with database initialization, and rejected external, array-valued, or login-loop redirects.
- Fixed browser console warnings from dictionary pagination using Element Plus's deprecated `small` attribute. Source gates prohibit reintroducing that usage.
- Fixed service-monitoring pages duplicating old health DTOs, continuing to read the removed `checks` field, and overflowing fixed three-column layouts on mobile.

### Validation

- Source hygiene, ESLint `--max-warnings=0`, Stylelint `--max-warnings=0`, and Vue TSC all passed.
- All 45 Vitest tests passed; coverage was 91.62% for statements, 86.05% for branches, 97.87% for functions, and 97.48% for lines.
- The Vite production build passed without build warnings.
- 3 Playwright browser cases passed, covering primary-database/`ryframe_device`/RustFS runtime pages and no mobile overflow, with zero console warnings/errors.

---

## [v0.3.1] - 2026-07-15

### Added

- Added ESLint and Vitest dependencies to complete the frontend static-checking and testing toolchain.
- Added dynamic menu route and permission-matching unit tests, with coverage thresholds.
- Added an application-level `SessionCoordinator` to unify refresh, logout, and global state cleanup.
- Added an injectable navigation guard and `RuntimeRouteRegistry`, covering dynamic-route cleanup during identity switching.
- Added Stylelint, source hygiene checks, `.editorconfig`, and `.gitattributes`.
- Added a read-only runtime configuration module that validates the API base path at startup.

### Changed

- Moved Axios transport into `shared/http`, without Store, Router, or UI dependencies.
- Returned authentication and menu types to their own API modules and removed the old aggregated `api/types.ts`.
- Extracted menu-to-route conversion into independently testable pure functions.
- Distinguished JSON, Blob, and text response types and removed compatibility-style response reading from critical paths.
- Enabled full TypeScript strict mode, removed explicit `any` from business source, and standardized all backend 64-bit IDs as strings.
- Migrated API calls to plural resources and root pagination paths, removing old-endpoint fallbacks.
- Runtime monitoring displays actual backend capabilities such as databases, Redis, object storage, and the upload circuit breaker.
- Split user editing/role assignment and password-reset flows into separate components, leaving the user-list page responsible only for queries and orchestration.
- CI unconditionally runs source hygiene, ESLint, Stylelint, type checks, coverage tests, and production builds, treating every warning as a failure.
- `vite.config.ts` narrowly filters Rolldown pure-annotation false positives from `@vueuse/core`; all other build warnings become errors.
- Fixed the mismatch between pnpm 10 and the node_modules store by rebuilding the dependency directory.
- Pagination queries consistently send `page`/`page_size`, and password-reset links use `request_id`, matching the backend's strict contract.
- Source hygiene checks prohibit old API fields such as `pageSize`, `pageNum`, `searchValue`, and `requestId` from returning.
- Removed the arbitrary string index from the pagination base class. Configuration and dictionary data queries use explicit fields so type checking catches incorrect parameters during development.

### Removed

- Removed unreferenced business/shared components, directives, Hooks, Stores, utilities, images, and temporary directories.
- Removed the old `api/request.ts`, `api/types.ts`, and duplicate Axios/protocol entry points.
- Removed the repository's `.pnpm-store` and unnecessary intermediate artifacts generated by these checks.

### Validation

- `pnpm check:sources`
- `pnpm lint`
- `pnpm lint:styles`
- `pnpm typecheck`
- `pnpm test:coverage`
- `pnpm build`

---

## [v0.3.0] - 2026-07-01

### Added

- Added tenant management and tenant login support.
- Added password-reset functionality.
- Added mobile responsive layout support.

### Changed

- Standardized the permission directive as `v-perm`.
- Improved menu-linked permission display and data handling.
- Refactored route permission management and completed mobile layout adaptation.
- Updated documentation for the development server's default port.
- Updated the pnpm version used by CI.

---

## [v0.1.0] - 2026-06-17

### Added

- First stable release.
- A Vue 3 + TypeScript administration frontend framework.
- Element Plus component library integration.
- Pinia state management + Vue Router routing.
- Axios request wrappers and API modules.
- System management: users, roles, menus, departments, posts, dictionaries, permissions, notices, and configuration.
- Monitoring management: online users, operation logs, login logs, service monitoring, caches, database connection pools, and runtime.
- Code-generation tool page.
- Login / profile / error pages.
- Shared components: icon selector, dictionary tags, department tree, pagination, and context toolbar.
- Directives: copy, debounce, throttle, long press, watermark, permission, and lazy loading.
- Composition API hooks: useAuth, useCrud, useDict, useDownload, useForm, useLoading, usePermission, useTable, useTheme.
- GitHub Actions CI workflow (type checks + build).
- GitHub Actions Release workflow (automatic Nightly releases + Stable Tag releases).

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
and version numbers follow [Semantic Versioning](https://semver.org/lang/zh-CN/).
