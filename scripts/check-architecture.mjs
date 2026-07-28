import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parse as parseYaml } from 'yaml'

const root = process.cwd()
const errors = []
const requiredFiles = [
  '.env.production.example',
  '.node-version',
  'openapi/openapi.json',
  'openapi/source.json',
  'playwright.config.ts',
  'pnpm-workspace.yaml',
  'scripts/check-api-contract.mjs',
  'scripts/check-workflows.mjs',
  'scripts/sync-api-contract.mjs',
  'src/api/contract.ts',
  'src/api/generated/schema.ts',
  'src/router/pageRegistry.ts',
  'src/shared/security/passwordPolicy.generated.json',
  'src/shared/security/passwordPolicy.ts',
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

const productionEnvironment = await readFile(path.join(root, '.env.production.example'), 'utf8')
const productionApi = productionEnvironment.match(/^VITE_APP_BASE_API=(.+)$/m)?.[1]?.trim()
if (!productionApi || !/^https:\/\/[^/]+\/api\/v1$/.test(productionApi)) {
  errors.push('.env.production.example: VITE_APP_BASE_API must be an absolute HTTPS /api/v1 URL')
}

const contractCheckSource = await readFile(
  path.join(root, 'scripts/check-api-contract.mjs'),
  'utf8',
)
for (const fragment of [
  "document['x-ryframe-menu-routes']",
  "document['x-ryframe-password-policy']",
  "declaration.name.text === 'menuPageRegistry'",
  'menuPageRegistry is missing backend route_key',
  'generated password policy is not synchronized with OpenAPI',
]) {
  if (!contractCheckSource.includes(fragment)) {
    errors.push(`scripts/check-api-contract.mjs: route contract gate is missing ${fragment}`)
  }
}

const syncSource = await readFile(path.join(root, 'scripts/sync-api-contract.mjs'), 'utf8')
for (const fragment of [
  'passwordPolicy.generated.json',
  "document['x-ryframe-password-policy']",
  'RYFRAME_BACKEND_REPOSITORY',
  'RYFRAME_BACKEND_COMMIT',
  '--verify-local',
  '--verify-upstream',
  'sourceUrl(metadata)',
]) {
  if (!syncSource.includes(fragment)) {
    errors.push(`scripts/sync-api-contract.mjs: password policy generation is missing ${fragment}`)
  }
}
if (syncSource.includes('raw.githubusercontent.com/Edgar-ycy/ryframe/main')) {
  errors.push('scripts/sync-api-contract.mjs: a floating backend main source is forbidden')
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
const requiredNodeRange = '^22.18.0 || >=24.11.0'
if (packageDocument.engines?.node !== requiredNodeRange) {
  errors.push(`package.json: engines.node must be ${requiredNodeRange}`)
}
const defaultNodeVersion = (await readFile(path.join(root, '.node-version'), 'utf8')).trim()
if (defaultNodeVersion !== '24.11.0') {
  errors.push('.node-version: default Node.js must be 24.11.0')
}
if (packageDocument.scripts?.['test:e2e'] !== 'playwright test') {
  errors.push('package.json: test:e2e must run the Playwright suite')
}
if (!packageDocument.scripts?.check?.includes('pnpm test:e2e')) {
  errors.push('package.json: the full check command must include browser smoke tests')
}
if (!packageDocument.scripts?.check?.includes('pnpm check:dependencies')) {
  errors.push('package.json: the full check command must include the prerelease dependency gate')
}
if (packageDocument.scripts?.['check:workflows'] !== 'node scripts/check-workflows.mjs') {
  errors.push('package.json: check:workflows must validate GitHub workflow files')
}
if (!packageDocument.scripts?.check?.includes('pnpm check:workflows')) {
  errors.push('package.json: the full check command must include the workflow gate')
}
if (!packageDocument.scripts?.['api:check']?.includes('--verify-local')
  || packageDocument.scripts?.['api:check']?.includes('api:sync')) {
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
  storeDir: '.pnpm-store',
  engineStrict: true,
})) {
  if (workspaceConfig?.[setting] !== expected) {
    errors.push(`pnpm-workspace.yaml: ${setting} must be ${JSON.stringify(expected)}`)
  }
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
  'node-version: 22.18.0',
  'pnpm check:workflows',
  'go install github.com/rhysd/actionlint/cmd/actionlint@v1.7.12',
  'actionlint" -color',
  'pnpm api:check',
  'pnpm api:check:upstream',
  'playwright install --with-deps chromium',
  'pnpm test:e2e',
]) {
  if (!workflowSource.includes(fragment)) {
    errors.push(`.github/workflows/ci.yml: browser CI gate is missing ${fragment}`)
  }
}
if (workflowSource.includes('raw.githubusercontent.com/Edgar-ycy/ryframe/main')) {
  errors.push('.github/workflows/ci.yml: floating backend main contract source is forbidden')
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

const releaseWorkflowSource = await readFile(
  path.join(root, '.github/workflows/release.yml'),
  'utf8',
)
for (const required of [
  'workflow_run:',
  'workflows: [ CI ]',
  "github.event.workflow_run.conclusion == 'success'",
  "github.event.workflow_run.event == 'push'",
  "github.event.workflow_run.head_branch == 'main'",
  'ref: ${{ github.event.workflow_run.head_sha }}',
  'CHANGELOG.md',
  'nightly-release-notes.md',
  "grep -Eq '^- [^[:space:]].*' nightly-release-notes.md",
  'git tag -a -f --cleanup=verbatim -F nightly-release-notes.md nightly',
  'git cat-file -t refs/tags/nightly',
  'body_path: nightly-release-notes.md',
  'release.get("body") != expected',
  'release.get("assets") != []',
  'published Nightly body does not exactly match CHANGELOG notes',
  'published Nightly must not contain custom assets',
  'gh api --paginate',
  'prerelease:',
  'make_latest:',
]) {
  if (!releaseWorkflowSource.includes(required)) {
    errors.push(`.github/workflows/release.yml: required Nightly source-release gate is missing (${required})`)
  }
}
const strictReleaseShellBlocks = releaseWorkflowSource.match(/set -euo pipefail/g)?.length ?? 0
const multilineReleaseShellBlocks = releaseWorkflowSource.match(/\brun: \|/g)?.length ?? 0
if (strictReleaseShellBlocks !== multilineReleaseShellBlocks) {
  errors.push('.github/workflows/release.yml: every multiline release shell block must enable strict mode')
}
const paginatedAssetSweeps = releaseWorkflowSource.match(/gh api --paginate/g)?.length ?? 0
if (paginatedAssetSweeps < 1) {
  errors.push('.github/workflows/release.yml: Nightly must purge paginated assets')
}
const changelogBodyPaths = releaseWorkflowSource.match(/body_path: nightly-release-notes\.md/g)?.length ?? 0
if (changelogBodyPaths !== 1) {
  errors.push('.github/workflows/release.yml: Nightly must use exactly one Changelog-derived body_path')
}
const nightlyTagCommands = releaseWorkflowSource.match(/^\s*git tag /gm)?.length ?? 0
if (nightlyTagCommands !== 1) {
  errors.push('.github/workflows/release.yml: Nightly must be created by exactly one annotated tag command')
}
for (const forbidden of [
  "tags: [ 'V*', 'v*' ]",
  "tags: [ 'v*.*.*' ]",
  'Create Stable Release',
  'source-release:',
  'make_latest: true',
  'actions/setup-node',
  'setup-pnpm',
  'actions/cache',
  'pnpm install --frozen-lockfile',
  'pnpm run build',
  'Package dist',
  'nightly-dist',
  'upload-artifact',
  'git archive',
  'ghcr.io/',
  'docker/build-push-action',
  'git tag -f nightly',
  'body: |',
  'generate_release_notes:',
  'files:',
]) {
  if (releaseWorkflowSource.includes(forbidden)) {
    errors.push(`.github/workflows/release.yml: forbidden release behavior found (${forbidden})`)
  }
}

const moduleDirectory = path.join(root, 'src/api/modules')
const moduleNames = (await readdir(moduleDirectory)).filter(name => name.endsWith('.ts')).sort()
const fullRecordOperations = {
  'config.ts': [
    ['listConfigNoPage', 'get_system_configs_all'],
    ['exportConfig', 'get_system_configs_export'],
  ],
  'dept.ts': [['listDeptNoPage', 'get_system_depts_all']],
  'dict.ts': [
    ['listDictTypeNoPage', 'get_system_dict_types_all'],
    ['exportDictType', 'get_system_dict_types_export'],
  ],
  'menu.ts': [['listMenuNoPage', 'get_system_menus_all']],
  'monitor.ts': [
    ['listOperLogNoPage', 'get_system_operlogs_all'],
    ['exportOperLog', 'get_system_operlogs_export'],
    ['listLoginLogNoPage', 'get_system_loginlogs_all'],
    ['exportLoginLog', 'get_system_loginlogs_export'],
    ['listOnlineUserNoPage', 'get_system_online_all'],
  ],
  'notice.ts': [['listNoticeNoPage', 'get_system_notices_all']],
  'post.ts': [
    ['listPostNoPage', 'get_system_posts_all'],
    ['exportPost', 'get_system_posts_export'],
  ],
  'role.ts': [
    ['listRoleNoPage', 'get_system_roles_all'],
    ['exportRole', 'get_system_roles_export'],
  ],
  'user.ts': [['exportUser', 'get_system_users_export']],
}

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
  for (const [functionName, operationId] of fullRecordOperations[name] ?? []) {
    if (!source.includes(`OperationQuery<'${operationId}'>`)) {
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
