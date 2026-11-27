import { isAbsolute } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { compareSourcePaths, sha256 } from './build-source-inventory.ts'
import { validateSourceDomains } from './build-source-domains.ts'
import {
  validateBackendBuildSources,
  validateFrontendBuildSources,
} from './build-receipt-schema.mjs'
import { endpointPort, restoreRuntimeBinding } from './restore-runtime-binding.mjs'
import { isResourceScopeId } from './resource-scope.mjs'
import { isB0Authority } from './restore-b0-adapter.mjs'

export { restoreRuntimeBinding }

const runtimeFields = [
  'format_version',
  'kind',
  'restore',
  'paths',
  'digests',
  'source',
  'endpoints',
  'backend',
  'frontend',
  'processes',
]
const restoreFields = ['id', 'backup_id', 'plan_hash', 'scope_id', 'data_verified_at']
const pathFields = [
  'backend_product_root',
  'backend_execution_root',
  'frontend_root',
  'runtime_dir',
  'bindings',
  'backend_build',
  'frontend_build',
  'launch',
]
const digestFields = ['bindings', 'backend_build', 'frontend_build', 'launch']
const sourceFields = [
  'backup_source_sha',
  'backend_product_sha',
  'backend_execution_sha',
  'backend_adapter_contract',
  'frontend_sha',
]
const endpointFields = ['api', 'worker', 'frontend']
const processFields = ['receipt_path', 'receipt_sha256', 'identity']
const identityFields = ['pid', 'started', 'executable']
const artifactFields = ['executable', 'command', 'bytes', 'sha256']
const frontendFileFields = ['path', 'bytes', 'sha256']
const legacyB0Frontend = {
  kind: 'restore-legacy-b0-frontend-build',
  contract: 'legacy-stable-readiness-b0-frontend-v1',
  frontendTree: '52fed4e1321ab4b4c04839a3a165c6bd1645e4b6',
}

function exactObject(value, fields, message) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0')
  )
    throw new Error(message)
}

function parseEvidence(bytes) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0 ||
    bytes.byteLength > 16 * 1024 * 1024
  )
    throw new Error('运行产物收据缺失或超过 16 MiB')
  try {
    const receipt = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    exactObject(receipt, runtimeFields, '运行产物收据字段缺失或包含未登记内容')
    return receipt
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('运行产物收据字段')) throw error
    throw new Error('运行产物收据不是有效 UTF-8 JSON', { cause: error })
  }
}

function validHex(value, size) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${size}}$`, 'u').test(value)
}

export function isRestoreIdentifier(value) {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 64 &&
    /^[a-z0-9][a-z0-9_-]*$/u.test(value)
  )
}

export { isResourceScopeId }

function validInstant(value) {
  return (
    typeof value === 'string' &&
    /(?:Z|[+-][0-9]{2}:[0-9]{2})$/u.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

function verifyBackendBuild(receipt, expectedSha) {
  exactObject(
    receipt,
    ['format_version', 'kind', 'sources', 'build', 'artifacts'],
    '运行产物收据内嵌后端构建字段无效',
  )
  validateBackendBuildSources(receipt, expectedSha)
  if (
    receipt.format_version !== 2 ||
    receipt.kind !== 'restore-backend-build' ||
    !receipt.sources.full.source.snapshot.clean
  )
    throw new Error('运行产物收据内嵌后端构建字段无效')
  exactObject(receipt.artifacts, ['api', 'worker'], '运行产物收据后端产物集合无效')
  for (const role of ['api', 'worker']) {
    const artifact = receipt.artifacts[role]
    exactObject(artifact, artifactFields, `运行产物收据的 ${role} 构建产物字段无效`)
    if (
      typeof artifact.executable !== 'string' ||
      !isAbsolute(artifact.executable) ||
      !Array.isArray(artifact.command) ||
      !Number.isInteger(artifact.bytes) ||
      artifact.bytes < 0 ||
      !validHex(artifact.sha256, 64)
    )
      throw new Error(`运行产物收据的 ${role} 构建产物无效`)
  }
}

function validFrontendPath(value) {
  return (
    typeof value === 'string' &&
    Boolean(value) &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    value.split('/').every((part) => part && part !== '.' && part !== '..')
  )
}

function verifyLegacyB0FrontendBuild(receipt, { authority, comparisonArm }) {
  // 工具链和旧构建配置的实际文件由原生核验器核对。
  const message = '运行产物收据内嵌 B0 前端构建没有绑定原基线'
  exactObject(receipt, ['format_version', 'kind', 'adapter', 'sources', 'build', 'files'], message)
  const { adapter, build } = receipt
  exactObject(adapter, ['contract', 'sources', 'program'], message)
  exactObject(build, ['command', 'mode', 'toolchain', 'configuration', 'identity'], message)
  const { toolchain, configuration, identity } = build
  exactObject(toolchain, ['node', 'corepack', 'pnpm', 'vite'], message)
  exactObject(configuration, ['api_origin', 'frontend_tree', 'inputs', 'dependency_state'], message)
  exactObject(identity, ['frontend_commit', 'source_file'], message)
  if (
    comparisonArm !== 'b0' ||
    !isB0Authority(authority) ||
    receipt.format_version !== 1 ||
    adapter.contract !== legacyB0Frontend.contract ||
    !isDeepStrictEqual(build.command, ['corepack', 'pnpm', 'build']) ||
    build.mode !== 'production' ||
    toolchain.node?.version !== 'v24.15.0' ||
    toolchain.pnpm?.version !== '11.20.0' ||
    configuration.api_origin !== 'same-origin' ||
    configuration.frontend_tree !== legacyB0Frontend.frontendTree ||
    identity.frontend_commit !== authority.frontend_sha ||
    identity.source_file !== null
  )
    throw new Error(message)
  const { full } = validateSourceDomains(receipt.sources)
  if (
    full.source.snapshot.head !== authority.frontend_sha ||
    !full.source.snapshot.clean ||
    full.source.snapshot.files.length !== 0
  )
    throw new Error(message)
}

function verifyFrontendBuild(receipt, expected) {
  const legacy = receipt?.kind === legacyB0Frontend.kind
  const message = '运行产物收据内嵌前端构建字段无效'
  if (legacy) {
    verifyLegacyB0FrontendBuild(receipt, expected)
  } else {
    exactObject(receipt, ['format_version', 'kind', 'sources', 'build', 'files'], message)
    validateFrontendBuildSources(receipt, expected.authority.frontend_sha)
    if (receipt.format_version !== 3 || receipt.kind !== 'restore-frontend-build')
      throw new Error(message)
  }
  if (!Array.isArray(receipt.files)) throw new Error(message)
  let previous = ''
  for (const file of receipt.files) {
    exactObject(file, frontendFileFields, '运行产物收据前端文件字段无效')
    if (
      !validFrontendPath(file.path) ||
      (legacy && (file.path.includes('\0') || /[\r\n:]/u.test(file.path))) ||
      (previous && compareSourcePaths(file.path, previous) <= 0) ||
      !Number.isInteger(file.bytes) ||
      file.bytes < 0 ||
      !validHex(file.sha256, 64)
    )
      throw new Error('运行产物收据前端文件必须有序且包含有效摘要')
    previous = file.path
  }
}

function verifyProcess(process, role) {
  exactObject(process, processFields, `运行产物收据的 ${role} 进程字段无效`)
  exactObject(process.identity, identityFields, `运行产物收据的 ${role} 进程身份无效`)
  if (
    typeof process.receipt_path !== 'string' ||
    !isAbsolute(process.receipt_path) ||
    !validHex(process.receipt_sha256, 64) ||
    !Number.isInteger(process.identity.pid) ||
    process.identity.pid <= 1 ||
    typeof process.identity.started !== 'string' ||
    !process.identity.started ||
    typeof process.identity.executable !== 'string' ||
    !isAbsolute(process.identity.executable)
  )
    throw new Error(`运行产物收据的 ${role} 进程绑定无效`)
}

export function inspectRestoreRuntimeReceipt({ bytes, bindingsBytes, expected }) {
  const receipt = parseEvidence(bytes)
  const digest = sha256(bytes)
  const { authority, builds, roots } = expected
  exactObject(receipt.restore, restoreFields, '运行产物收据的恢复绑定字段无效')
  exactObject(receipt.paths, pathFields, '运行产物收据的路径绑定字段无效')
  exactObject(receipt.digests, digestFields, '运行产物收据的摘要绑定字段无效')
  exactObject(receipt.source, sourceFields, '运行产物收据的源码绑定字段无效')
  exactObject(receipt.endpoints, endpointFields, '运行产物收据的端点绑定字段无效')
  exactObject(receipt.processes, ['api', 'worker', 'frontend'], '运行产物收据的进程集合字段无效')
  const endpointPorts = [
    endpointPort(receipt.endpoints.api, '/readyz'),
    endpointPort(receipt.endpoints.worker, '/readyz'),
    endpointPort(receipt.endpoints.frontend, ''),
  ]
  if (
    receipt.format_version !== 3 ||
    receipt.kind !== 'restore-runtime' ||
    !isRestoreIdentifier(receipt.restore.id) ||
    !isRestoreIdentifier(receipt.restore.backup_id) ||
    !isResourceScopeId(receipt.restore.scope_id) ||
    !validHex(receipt.restore.plan_hash, 64) ||
    !validInstant(receipt.restore.data_verified_at) ||
    receipt.restore.id !== authority.restore_id ||
    receipt.restore.backup_id !== authority.backup_id ||
    receipt.restore.plan_hash !== authority.plan_hash ||
    receipt.restore.scope_id !== authority.scope_id ||
    receipt.restore.data_verified_at !== authority.data_verified_at ||
    receipt.digests.bindings !== sha256(bindingsBytes) ||
    !Object.values(receipt.digests).every((value) => validHex(value, 64)) ||
    receipt.source.backup_source_sha !== authority.backup_source_sha ||
    receipt.source.backend_product_sha !== authority.backend_product_sha ||
    receipt.source.backend_execution_sha !== authority.backend_execution_sha ||
    receipt.source.backend_adapter_contract !== authority.backend_adapter_contract ||
    receipt.source.frontend_sha !== authority.frontend_sha ||
    !validHex(receipt.source.backup_source_sha, 40) ||
    !validHex(receipt.source.backend_product_sha, 40) ||
    !validHex(receipt.source.backend_execution_sha, 40) ||
    !validHex(receipt.source.frontend_sha, 40) ||
    !Object.values(receipt.paths).every(
      (value) => typeof value === 'string' && isAbsolute(value),
    ) ||
    receipt.paths.backend_product_root !== roots.source_backend ||
    receipt.paths.backend_execution_root !== roots.execution_backend ||
    receipt.paths.frontend_root !== roots.frontend ||
    receipt.paths.backend_build !== builds.backend.path ||
    receipt.paths.frontend_build !== builds.frontend.path ||
    receipt.digests.backend_build !== builds.backend.sha256 ||
    receipt.digests.frontend_build !== builds.frontend.sha256 ||
    receipt.endpoints.api !== authority.api_endpoint ||
    receipt.endpoints.worker !== authority.worker_endpoint ||
    receipt.endpoints.frontend !== authority.frontend_endpoint ||
    new Set(endpointPorts).size !== endpointPorts.length
  )
    throw new Error('运行产物收据与演练、源码、构建或进程集合不一致')
  verifyBackendBuild(receipt.backend, authority.backend_execution_sha)
  verifyFrontendBuild(receipt.frontend, expected)
  verifyProcess(receipt.processes.api, 'api')
  verifyProcess(receipt.processes.worker, 'worker')
  verifyProcess(receipt.processes.frontend, 'frontend')
  return Object.freeze({ digest, receipt })
}

export function verifyRestoreRuntimeReceipt(input) {
  const result = inspectRestoreRuntimeReceipt(input)
  if (input.verifiedDigest !== result.digest)
    throw new Error('运行产物摘要不是外部核验器本次确认的实际摘要')
  return result
}
