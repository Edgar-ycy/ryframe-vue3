import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parse as parseYaml } from 'yaml'
import {
  discoverCriticalCoverageFiles,
  validateCoverageFilesExist,
  validateCoverageScope,
} from './coverage-contract.mjs'
import {
  serverStateApiImportExemptions,
  serverStateContracts,
  serverStateInventoryRoots,
  validateServerStateInventory,
  validateServerStateSource,
} from './server-state-contracts.mjs'

const root = process.cwd()
const errors = []
const maintenanceDocumentFiles = [
  'README.md',
  'ARCHITECTURE.md',
  'SECURITY.md',
]
const requiredFiles = [
  ...maintenanceDocumentFiles,
  '.env.production.example',
  '.node-version',
  'openapi/openapi.json',
  'openapi/source.json',
  'playwright.config.ts',
  'pnpm-workspace.yaml',
  'scripts/api-prefix-contract.mjs',
  'scripts/api-prefix-contract.test.mjs',
  'scripts/api-version-contract.mjs',
  'scripts/api-version-contract.test.mjs',
  'scripts/api-artifacts.mjs',
  'scripts/api-artifacts.test.mjs',
  'scripts/permission-catalog-contract.mjs',
  'scripts/permission-catalog-contract.test.mjs',
  'scripts/check-api-contract.mjs',
  'scripts/check-workflows.mjs',
  'scripts/coverage-contract.mjs',
  'scripts/coverage-contract.test.mjs',
  'scripts/coverage-scope.json',
  'scripts/generate-api-artifacts.mjs',
  'scripts/sync-api-contract.mjs',
  'src/api/contract.ts',
  'src/api/generated/operations.ts',
  'src/api/generated/permissions.ts',
  'src/api/generated/schema.ts',
  'src/api/operationRequest.ts',
  'src/router/pageRegistry.ts',
  'src/shared/config/apiEndpoint.ts',
  'src/shared/config/apiPrefix.generated.json',
  'src/shared/security/passwordPolicy.generated.json',
  'src/shared/security/passwordPolicy.ts',
  'src/shared/markdown/noticePolicy.generated.json',
  'src/shared/markdown/noticePolicy.ts',
  'src/views/login/loginState.ts',
  'tests/e2e/app.smoke.spec.ts',
]

for (const relative of requiredFiles) {
  try {
    await readFile(path.join(root, relative))
  }
  catch {
    errors.push(`${relative}: required architecture file is missing`)
  }
}

const maintenanceDocuments = new Map()
for (const relative of maintenanceDocumentFiles) {
  const source = await readFile(path.join(root, relative), 'utf8')
  maintenanceDocuments.set(relative, source)
  if (source.includes('RYFRAME_OPENAPI_SOURCE')) {
    errors.push(`${relative}: removed RYFRAME_OPENAPI_SOURCE must not return`)
  }
}

const architectureDocument = maintenanceDocuments.get('ARCHITECTURE.md') ?? ''
for (const fragment of [
  'RYFRAME_BACKEND_WORKTREE',
  'pnpm build:e2e:production',
  'pnpm test:e2e:production',
]) {
  if (!architectureDocument.includes(fragment)) {
    errors.push(`ARCHITECTURE.md: canonical development flow is missing ${fragment}`)
  }
}

for (const relative of [
  'src/app/messages/messageApi.ts',
  'src/app/messages/messageApi.test.ts',
]) {
  try {
    await readFile(path.join(root, relative))
    errors.push(`${relative}: removed message API compatibility path must not return`)
  }
  catch {
    // 文件不存在即符合唯一模块入口约束。
  }
}

const productionEnvironment = await readFile(path.join(root, '.env.production.example'), 'utf8')
const productionApiOrigin = productionEnvironment.match(/^VITE_APP_API_ORIGIN=(.+)$/m)?.[1]?.trim()
if (!productionApiOrigin || !/^https:\/\/[^/]+$/.test(productionApiOrigin)) {
  errors.push('.env.production.example: VITE_APP_API_ORIGIN must be an absolute HTTPS origin')
}
if (productionEnvironment.includes('VITE_APP_BASE_API')) {
  errors.push('.env.production.example: removed VITE_APP_BASE_API must not return')
}
for (const relative of ['.env', 'src/env.d.ts', 'src/shared/config/runtimeConfig.ts']) {
  const source = await readFile(path.join(root, relative), 'utf8')
  if (source.includes('VITE_APP_BASE_API')) {
    errors.push(`${relative}: removed VITE_APP_BASE_API must not return`)
  }
}
const runtimeConfigSource = await readFile(
  path.join(root, 'src/shared/config/runtimeConfig.ts'),
  'utf8',
)
for (const fragment of [
  'VITE_APP_API_ORIGIN',
  'apiPrefix.generated.json',
  'buildApiBaseUrl(apiOrigin, apiPrefix)',
]) {
  if (!runtimeConfigSource.includes(fragment)) {
    errors.push(`src/shared/config/runtimeConfig.ts: API contract wiring is missing ${fragment}`)
  }
}

const contractCheckSource = await readFile(
  path.join(root, 'scripts/check-api-contract.mjs'),
  'utf8',
)
for (const fragment of [
  "import { apiVersionContractViolation } from './api-version-contract.mjs'",
  'apiVersionContractViolation(packageDocument, document)',
  "document['x-ryframe-menu-routes']",
  "document['x-ryframe-password-policy']",
  "document['x-ryframe-notice-policy']",
  "document['x-ryframe-api-prefix']",
  "document['x-ryframe-permission-catalog']",
  'requirePermissionCatalog(',
  'apiPrefixContractViolation(apiPrefixExtension)',
  "declaration.name.text === 'menuPageRegistry'",
  'menuPageRegistry is missing backend route_key',
  'generated password policy is not synchronized with OpenAPI',
  'generated notice policy is not synchronized with OpenAPI',
  'generated API prefix is not synchronized with OpenAPI',
]) {
  if (!contractCheckSource.includes(fragment)) {
    errors.push(`scripts/check-api-contract.mjs: route contract gate is missing ${fragment}`)
  }
}

const c1ContractGuardFragments = [
  'const c1PaginatedOperationIds = new Set([',
  'const c1OptionOperationContracts = new Map([',
  'const c1RemovedUnboundedListPaths = new Set([',
  'const c1StringPathIdOperationIds = new Set([',
  'c1PaginatedOperationIds.size !== 13',
  'c1RemovedUnboundedListPaths.size !== 11',
  'c1OptionOperationContracts.size !== 2',
  'c1StringPathIdOperationIds.size !== 35',
  "['page', { type: 'integer', minimum: 1, maximum: undefined }]",
  "['page_size', { type: 'integer', minimum: 1, maximum: undefined }]",
  "['q', { type: 'string', minLength: undefined, maxLength: 64 }]",
  "['limit', { type: 'integer', minimum: 1, maximum: undefined }]",
  'validateC1QueryContracts()',
  'validateIdentityParameters()',
  'paths.length < 97',
  'operationCount < 128',
  'Object.keys(schemas).length < 188',
  'pagination operation is missing from the C1 manifest',
  'options operation is missing from the C1 manifest',
  'id and *_id parameters must use string transport',
  '*_ids parameters must use an array of string items',
]
for (const fragment of c1ContractGuardFragments) {
  if (!contractCheckSource.includes(fragment)) {
    errors.push(`scripts/check-api-contract.mjs: C1 contract gate is missing ${fragment}`)
  }
}

const c1RemovedListPaths = [
  '/api/v1/system/configs/all',
  '/api/v1/system/depts/all',
  '/api/v1/system/dict/types/all',
  '/api/v1/system/loginlogs/all',
  '/api/v1/system/menus/all',
  '/api/v1/system/notices/all',
  '/api/v1/system/online/all',
  '/api/v1/system/operlogs/all',
  '/api/v1/system/posts/all',
  '/api/v1/system/roles/all',
  '/api/v1/system/users/all',
]
for (const removedPath of c1RemovedListPaths) {
  if (!contractCheckSource.includes(`'${removedPath}'`)) {
    errors.push(`scripts/check-api-contract.mjs: removed C1 path guard is missing ${removedPath}`)
  }
}

for (const operationId of [
  'get_system_roles_options',
  'get_system_users_options',
]) {
  if (!contractCheckSource.includes(`'${operationId}'`)) {
    errors.push(`scripts/check-api-contract.mjs: C1 options guard is missing ${operationId}`)
  }
}

const c1StringPathIdOperationIds = [
  'delete_system_configs_by_id',
  'delete_system_depts_by_id',
  'delete_system_dict_data_by_id',
  'delete_system_dict_types_by_id',
  'delete_system_menus_by_id',
  'delete_system_notices_by_id',
  'delete_system_perms_by_id',
  'delete_system_posts_by_id',
  'delete_system_roles_by_id',
  'delete_system_users_by_id',
  'get_system_configs_by_id',
  'get_system_depts_by_id',
  'get_system_menus_by_id',
  'get_system_notices_by_id',
  'get_system_perms_by_id',
  'get_system_posts_by_id',
  'get_system_roles_by_id',
  'get_system_roles_by_id_permissions',
  'get_system_users_by_id',
  'post_system_notices_by_id_publish_message',
  'post_system_users_by_id_password_reset_requests',
  'put_system_configs_by_id',
  'put_system_depts_by_id',
  'put_system_dict_data_by_id',
  'put_system_dict_types_by_id',
  'put_system_menus_by_id',
  'put_system_notices_by_id',
  'put_system_perms_by_id',
  'put_system_posts_by_id',
  'put_system_roles_by_id',
  'put_system_roles_by_id_data_scope',
  'put_system_roles_by_id_permissions',
  'put_system_users_by_id',
  'put_system_users_by_id_roles',
  'put_system_users_by_id_status',
]
for (const operationId of c1StringPathIdOperationIds) {
  if (!contractCheckSource.includes(`'${operationId}'`)) {
    errors.push(`scripts/check-api-contract.mjs: string path ID guard is missing ${operationId}`)
  }
}

const syncSource = await readFile(path.join(root, 'scripts/sync-api-contract.mjs'), 'utf8')
for (const fragment of [
  'requireApiPrefixContract(apiPrefix, label)',
  "requirePermissionCatalog(document['x-ryframe-permission-catalog'], label)",
  'RYFRAME_BACKEND_REPOSITORY',
  'RYFRAME_BACKEND_COMMIT',
  'RYFRAME_BACKEND_WORKTREE',
  "['-C', worktree, 'show', objectName]",
  'readPinnedSource(metadata)',
  '--verify-local',
  '--verify-upstream',
  'sourceUrl(metadata)',
]) {
  if (!syncSource.includes(fragment)) {
    errors.push(`scripts/sync-api-contract.mjs: immutable contract source guard is missing ${fragment}`)
  }
}
if (syncSource.includes('raw.githubusercontent.com/Edgar-ycy/ryframe/main')) {
  errors.push('scripts/sync-api-contract.mjs: a floating backend main source is forbidden')
}
if (syncSource.includes('RYFRAME_OPENAPI_SOURCE')) {
  errors.push('scripts/sync-api-contract.mjs: dirty working-tree source override must not return')
}

const artifactGeneratorSource = await readFile(
  path.join(root, 'scripts/generate-api-artifacts.mjs'),
  'utf8',
)
for (const fragment of [
  "mkdtemp(path.join(tmpdir(), 'ryframe-api-artifacts-'))",
  'writeArtifacts(temporaryRoot, artifacts)',
  'committed.equals(generated)',
  'await rm(temporaryRoot, { recursive: true, force: true })',
]) {
  if (!artifactGeneratorSource.includes(fragment)) {
    errors.push(`scripts/generate-api-artifacts.mjs: read-only artifact check is missing ${fragment}`)
  }
}

const apiArtifactSource = await readFile(path.join(root, 'scripts/api-artifacts.mjs'), 'utf8')
for (const fragment of [
  'src/api/generated/permissions.ts',
  "document?.['x-ryframe-permission-catalog']",
  'export type PermissionCode',
  'export function isPermissionCode',
]) {
  if (!apiArtifactSource.includes(fragment)) {
    errors.push(`scripts/api-artifacts.mjs: permission catalog generation is missing ${fragment}`)
  }
}

const permissionHookSource = await readFile(path.join(root, 'src/hooks/usePermission.ts'), 'utf8')
for (const fragment of [
  "import type { PermissionCode } from '@/api/generated/permissions'",
  '(perm: PermissionCode)',
  '(...perms: PermissionCode[])',
]) {
  if (!permissionHookSource.includes(fragment)) {
    errors.push(`src/hooks/usePermission.ts: compiled permission type guard is missing ${fragment}`)
  }
}

const globalDirectiveSource = await readFile(
  path.join(root, 'src/types/global-directives.d.ts'),
  'utf8',
)
if (!globalDirectiveSource.includes('Directive<HTMLElement, PermissionValue>')) {
  errors.push('src/types/global-directives.d.ts: v-perm must use the generated permission union')
}

const operationRequestSource = await readFile(
  path.join(root, 'src/api/operationRequest.ts'),
  'utf8',
)
for (const fragment of [
  'operationManifest[operationId]',
  'OperationJsonBody',
  'OperationJsonResponse',
  'OperationPath',
  'OperationQuery',
  'encodeURIComponent(String(value))',
]) {
  if (!operationRequestSource.includes(fragment)) {
    errors.push(`src/api/operationRequest.ts: typed operation facade is missing ${fragment}`)
  }
}

const contractSource = JSON.parse(await readFile(path.join(root, 'openapi/source.json'), 'utf8'))
if (contractSource.schema_version !== 1
  || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(contractSource.backend_repository ?? '')
  || !/^[0-9a-f]{40}$/i.test(contractSource.backend_commit ?? '')
  || contractSource.openapi_path !== 'openapi/openapi.json'
  || !String(contractSource.openapi_version ?? '').startsWith('3.')
  || !/^[0-9a-f]{64}$/i.test(contractSource.sha256 ?? '')) {
  errors.push('openapi/source.json: must record a valid immutable backend contract source')
}

const packageDocument = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const requiredNodeRange = '^22.22.2 || >=24.15.0'
if (packageDocument.engines?.node !== requiredNodeRange) {
  errors.push(`package.json: engines.node must be ${requiredNodeRange}`)
}
const defaultNodeVersion = (await readFile(path.join(root, '.node-version'), 'utf8')).trim()
if (defaultNodeVersion !== '24.15.0') {
  errors.push('.node-version: default Node.js must be 24.15.0')
}
if (packageDocument.scripts?.['test:e2e'] !== 'playwright test') {
  errors.push('package.json: test:e2e must run the Playwright suite')
}
if (packageDocument.scripts?.['build:e2e:production'] !== 'vite build --mode production-smoke') {
  errors.push('package.json: build:e2e:production must build the production smoke artifact')
}
if (packageDocument.scripts?.['test:e2e:production']
  !== 'playwright test --config=playwright.production.config.ts') {
  errors.push('package.json: test:e2e:production must test the built production artifact')
}
if (packageDocument.scripts?.['check:workflows'] !== 'node scripts/check-workflows.mjs') {
  errors.push('package.json: check:workflows must validate GitHub workflow files')
}
const canonicalCheckCommand = [
  'pnpm check:sources',
  'pnpm check:workflows',
  'pnpm check:dependencies',
  'pnpm check:architecture',
  'pnpm api:check',
  'pnpm lint',
  'pnpm lint:styles',
  'pnpm typecheck',
  'pnpm test:coverage',
  'pnpm build:e2e:production',
  'pnpm check:bundle',
  'pnpm test:e2e',
  'pnpm test:e2e:production',
].join(' && ')
if (packageDocument.scripts?.check !== canonicalCheckCommand) {
  errors.push('package.json: check must remain the canonical full quality gate')
}
if (!packageDocument.scripts?.['check:contract']
  ?.includes('scripts/api-version-contract.test.mjs')) {
  errors.push('package.json: check:contract must run the API version contract tests')
}
const apiCheckCommand = packageDocument.scripts?.['api:check'] ?? ''
if (!apiCheckCommand.includes('--verify-local')
  || !apiCheckCommand.includes('generate-api-artifacts.mjs --check')
  || apiCheckCommand.includes('api:sync')
  || apiCheckCommand.includes('api:generate')
  || apiCheckCommand.includes('git diff')) {
  errors.push('package.json: api:check must verify the committed local contract without syncing')
}
if (!packageDocument.scripts?.['api:check:upstream']?.includes('--verify-upstream')) {
  errors.push('package.json: api:check:upstream must verify the immutable upstream source')
}

const workspaceConfig = parseYaml(
  await readFile(path.join(root, 'pnpm-workspace.yaml'), 'utf8'),
)
if (packageDocument.pnpm !== undefined) {
  errors.push('package.json: pnpm settings must live in pnpm-workspace.yaml')
}
for (const [setting, expected] of Object.entries({
  engineStrict: true,
})) {
  if (workspaceConfig?.[setting] !== expected) {
    errors.push(`pnpm-workspace.yaml: ${setting} must be ${JSON.stringify(expected)}`)
  }
}
if (workspaceConfig?.storeDir !== undefined) {
  errors.push('pnpm-workspace.yaml: storeDir must not override the pnpm global store')
}
for (const [dependency, expected] of Object.entries({
  'fast-uri': '3.1.4',
  immutable: '5.1.9',
  'js-yaml': '4.3.0',
})) {
  if (workspaceConfig?.overrides?.[dependency] !== expected) {
    errors.push(`pnpm-workspace.yaml: override ${dependency} must be ${expected}`)
  }
}

const workflowSource = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8')
for (const fragment of [
  'permissions:\n  contents: read',
  'node-version-file: .node-version',
  'node-version: 22.22.2',
  "github.event_name != 'schedule'",
  "github.event_name == 'schedule'",
  'pnpm check:workflows',
  'docker://rhysd/actionlint@sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9',
  'pnpm api:check:upstream',
  'pnpm test:coverage',
  'pnpm build',
  'pnpm build:e2e:production',
  'playwright install --with-deps chromium',
  'pnpm test:e2e',
  'pnpm test:e2e:production',
]) {
  if (!workflowSource.includes(fragment)) {
    errors.push(`.github/workflows/ci.yml: browser CI gate is missing ${fragment}`)
  }
}
if (workflowSource.includes('raw.githubusercontent.com/Edgar-ycy/ryframe/main')) {
  errors.push('.github/workflows/ci.yml: floating backend main contract source is forbidden')
}
if (workflowSource.includes('.pnpm-store')) {
  errors.push('.github/workflows/ci.yml: repository-local pnpm store must not return')
}
for (const removedJob of ['\n  test:\n', '\n  e2e:\n']) {
  if (workflowSource.includes(removedJob)) {
    errors.push(`.github/workflows/ci.yml: duplicate frontend job returned (${removedJob.trim()})`)
  }
}
if ((workflowSource.match(/pnpm api:check:upstream/g)?.length ?? 0) !== 1) {
  errors.push('.github/workflows/ci.yml: the local and upstream API contract must be checked once')
}

const viteSource = await readFile(path.join(root, 'vite.config.ts'), 'utf8')
for (const fragment of [
  "env.VITE_APP_DEV_HOST || '127.0.0.1'",
  "env.VITE_APP_DEV_PORT",
  "|| '5173'",
]) {
  if (!viteSource.includes(fragment)) {
    errors.push(`vite.config.ts: missing safe local development server default (${fragment})`)
  }
}

const frontendWorkflowFiles = (await readdir(path.join(root, '.github/workflows')))
  .filter(name => /\.ya?ml$/iu.test(name))
  .sort()
for (const workflowName of frontendWorkflowFiles) {
  const source = await readFile(path.join(root, '.github/workflows', workflowName), 'utf8')
  if (workflowName !== 'ci.yml') {
    errors.push(`.github/workflows/${workflowName}: frontend must not publish independently`)
  }
  for (const forbidden of [
    'softprops/action-gh-release',
    'prerelease: true',
    'refs/tags/nightly',
    'tag_name: nightly',
    'git tag ',
    'git push -f',
  ]) {
    if (source.includes(forbidden)) {
      errors.push(`.github/workflows/${workflowName}: stable-only release policy forbids ${forbidden}`)
    }
  }
}

const serverStateSources = new Map()
for (const [relative, requiredFragments] of serverStateContracts) {
  try {
    const source = await readFile(path.join(root, relative), 'utf8')
    serverStateSources.set(relative, source)
    errors.push(...validateServerStateSource(relative, source, requiredFragments))
  }
  catch {
    errors.push(`${relative}: server-state contract source is missing`)
  }
}

for (const inventoryRoot of serverStateInventoryRoots) {
  const inventoryDirectory = path.join(root, inventoryRoot)
  for (const relative of await sourceFilesUnder(inventoryDirectory)) {
    if (/\.(?:test|spec)\.[cm]?[jt]sx?$/iu.test(relative)) continue
    const normalized = path.relative(root, relative).replaceAll(path.sep, '/')
    if (!serverStateSources.has(normalized)) {
      serverStateSources.set(normalized, await readFile(relative, 'utf8'))
    }
  }
}
errors.push(...validateServerStateInventory(
  serverStateSources,
  serverStateContracts,
  serverStateApiImportExemptions,
))

let coverageManifest = {}
try {
  coverageManifest = JSON.parse(
    await readFile(path.join(root, 'scripts/coverage-scope.json'), 'utf8'),
  )
}
catch {
  errors.push('scripts/coverage-scope.json: coverage manifest must be valid JSON')
}
const criticalCoverageFiles = await discoverCriticalCoverageFiles(
  root,
  [...serverStateContracts.keys()],
)
errors.push(...validateCoverageScope(coverageManifest, criticalCoverageFiles))
errors.push(...await validateCoverageFilesExist(root, coverageManifest.files ?? []))

const vitestConfigSource = await readFile(path.join(root, 'vitest.config.ts'), 'utf8')
for (const fragment of [
  "from './scripts/coverage-scope.json'",
  "pool: 'threads'",
  'include: coverageScope.files',
]) {
  if (!vitestConfigSource.includes(fragment)) {
    errors.push(`vitest.config.ts: coverage contract wiring is missing ${fragment}`)
  }
}

const asyncExportSource = await readFile(path.join(root, 'src/hooks/useAsyncExport.ts'), 'utf8')
if (asyncExportSource.includes('ElMessage.error')) {
  errors.push('src/hooks/useAsyncExport.ts: export errors must use the global mutation error path')
}

const moduleDirectory = path.join(root, 'src/api/modules')
const moduleNames = (await readdir(moduleDirectory)).filter(name => name.endsWith('.ts')).sort()
const exportOperations = {
  'config.ts': [
    ['exportConfig', 'post_system_configs_exports'],
  ],
  'dict.ts': [
    ['exportDictType', 'post_system_dict_types_exports'],
  ],
  'monitor.ts': [
    ['exportOperLog', 'post_system_operlogs_exports'],
    ['exportLoginLog', 'post_system_loginlogs_exports'],
  ],
  'post.ts': [
    ['exportPost', 'post_system_posts_exports'],
  ],
  'role.ts': [
    ['exportRole', 'post_system_roles_exports'],
  ],
  'user.ts': [['exportUser', 'post_system_users_exports']],
}
const typedOperationModules = new Map([
  ['notice.ts', [
    'get_system_notices',
    'get_system_notices_by_id',
    'post_system_notices',
    'put_system_notices_by_id',
    'delete_system_notices_by_id',
    'post_system_notices_by_id_publish_message',
  ]],
  ['tenant.ts', [
    'get_platform_tenants',
    'post_platform_tenants',
    'put_platform_tenants_by_tenant_id',
    'put_platform_tenants_by_tenant_id_status',
  ]],
])

for (const name of moduleNames) {
  const relative = `src/api/modules/${name}`
  const source = await readFile(path.join(moduleDirectory, name), 'utf8')
  if (!source.includes("from '@/api/contract'")) {
    errors.push(`${relative}: API modules must consume the generated contract facade`)
  }
  if (/^export interface /m.test(source)) {
    errors.push(`${relative}: exported DTO interfaces must come from the generated contract`)
  }
  if (/generated\/schema/.test(source)) {
    errors.push(`${relative}: import generated schemas through src/api/contract.ts`)
  }
  if (/\bPageQuery\b/.test(source)) {
    errors.push(`${relative}: query parameters must use OperationQuery`)
  }
  const typedOperations = typedOperationModules.get(name)
  if (typedOperations) {
    if (!source.includes("from '@/api/operationRequest'")) {
      errors.push(`${relative}: migrated API module must use the operationId request facade`)
    }
    if (source.includes("from '@/shared/http/client'")
      || /\b(?:method|url)\s*:/u.test(source)) {
      errors.push(`${relative}: migrated API module must not handwrite HTTP methods or URLs`)
    }
    for (const operationId of typedOperations) {
      if (!source.includes(`requestOperation('${operationId}'`)) {
        errors.push(`${relative}: migrated API module is missing operationId ${operationId}`)
      }
    }
  }
  for (const [functionName, operationId] of exportOperations[name] ?? []) {
    if (!source.includes(`OperationQuery<'${operationId}'>`)
      && !source.includes(`OperationJsonBody<'${operationId}'>`)) {
      errors.push(`${relative}: ${functionName} must use ${operationId}`)
    }
    const functionStart = source.indexOf(`export function ${functionName}`)
    const functionEnd = source.indexOf('\n}', functionStart)
    const functionSource = source.slice(functionStart, functionEnd)
    if (functionStart < 0 || functionEnd < 0
      || !functionSource.includes('stripPagination(params)')) {
      errors.push(`${relative}: ${functionName} must strip pagination at the API boundary`)
    }
  }
}

if (errors.length > 0) {
  console.error('Architecture check failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exitCode = 1
}
else {
  console.log(`Architecture check passed (${moduleNames.length} API modules)`)
}

async function sourceFilesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await sourceFilesUnder(absolute))
    else if (/\.(?:ts|vue)$/iu.test(entry.name)) files.push(absolute)
  }
  return files
}
