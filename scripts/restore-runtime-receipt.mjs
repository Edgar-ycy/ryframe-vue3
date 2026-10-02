import { isAbsolute } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { canonicalDigest, compareSourcePaths, sha256 } from './build-source-inventory.mjs'
import {
  validateBackendBuildSources,
  validateFrontendBuildSources,
} from './build-receipt-schema.mjs'
import { isResourceScopeId } from './resource-scope.mjs'

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
const targetPlanFields = [
  'format_version',
  'kind',
  'target_side',
  'reference_plan_sha256',
  'backup_receipt',
  'comparison_sources',
  'comparison_arm',
  'comparison_arm_sha256',
  'arm_input',
  'fresh_target',
  'maintenance_execution',
  'product_execution',
  'product_plan_file',
  'product_plan',
  'product_plan_sha256',
]
const executionFields = [
  'roots',
  'backend_product_sha',
  'backend_execution_sha',
  'frontend_sha',
  'builds',
  'adapter',
]
const adapterFields = [
  'contract',
  'base_backend_sha',
  'base_frontend_sha',
  'reference_adapter_sha',
  'adapter_tree',
  'reconstructed_tree',
  'adapter_paths',
  'patch',
]
const b0AdapterContract = 'legacy-stable-readiness-b0-v1'

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

function parseTargetPlan(bytes) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0 ||
    bytes.byteLength > 16 * 1024 * 1024
  )
    throw new Error('恢复目标计划缺失或超过 16 MiB')
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    exactObject(value, targetPlanFields, '恢复目标计划字段缺失或包含未登记内容')
    return value
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('恢复目标计划字段')) throw error
    throw new Error('恢复目标计划不是有效 UTF-8 JSON', { cause: error })
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

function documentDescriptor(value, label) {
  exactObject(value, ['path', 'bytes', 'sha256'], `${label}字段无效`)
  if (
    typeof value.path !== 'string' ||
    !isAbsolute(value.path) ||
    !Number.isInteger(value.bytes) ||
    value.bytes <= 0 ||
    !validHex(value.sha256, 64)
  )
    throw new Error(`${label}无效`)
  return value
}

function targetAdapter(execution) {
  const sameBackend = execution.backend_product_sha === execution.backend_execution_sha
  if (sameBackend) {
    if (
      execution.adapter !== null ||
      execution.roots.source_backend !== execution.roots.execution_backend
    )
      throw new Error('候选恢复目标的产品与执行来源不一致')
    return null
  }
  exactObject(execution.adapter, adapterFields, 'B0 恢复适配字段无效')
  if (
    execution.adapter.contract !== b0AdapterContract ||
    execution.adapter.base_backend_sha !== execution.backend_product_sha ||
    execution.adapter.reference_adapter_sha !== execution.backend_execution_sha ||
    execution.adapter.base_frontend_sha !== execution.frontend_sha
  )
    throw new Error('B0 恢复适配没有绑定产品、执行与前端来源')
  return b0AdapterContract
}

/** 从显式登记的目标计划派生运行权威上下文，不信任待核验的运行收据自证来源。 */
export function restoreRuntimeBinding({ record, manifest, targetPlanBytes, frontendEndpoint }) {
  const target = parseTargetPlan(targetPlanBytes)
  const execution = target.product_execution
  exactObject(execution, executionFields, '恢复目标计划的产品执行字段无效')
  exactObject(
    execution.roots,
    ['source_backend', 'execution_backend', 'frontend'],
    '恢复目标计划的产品执行路径无效',
  )
  exactObject(execution.builds, ['backend', 'frontend'], '恢复目标计划的构建绑定无效')
  const builds = {
    backend: documentDescriptor(execution.builds.backend, '恢复目标计划后端构建'),
    frontend: documentDescriptor(execution.builds.frontend, '恢复目标计划前端构建'),
  }
  const roots = execution.roots
  const productPlan = target.product_plan
  const expectedArm =
    target.target_side === 'base' ? 'b0' : target.target_side === 'candidate' ? 'b1' : null
  if (
    target.format_version !== 1 ||
    target.kind !== 'restore-reference-target-plan' ||
    expectedArm === null ||
    target.comparison_arm !== expectedArm ||
    !validHex(target.product_plan_sha256, 64) ||
    target.product_plan_sha256 !== canonicalDigest(productPlan) ||
    !isDeepStrictEqual(productPlan, record?.plan) ||
    !validHex(manifest?.source_sha, 40) ||
    ![execution.backend_product_sha, execution.backend_execution_sha, execution.frontend_sha].every(
      (value) => validHex(value, 40),
    ) ||
    Object.values(roots).some((value) => typeof value !== 'string' || !isAbsolute(value)) ||
    productPlan?.frontend_sha !== execution.frontend_sha
  )
    throw new Error('恢复目标计划没有绑定本次数据、产品、执行或前端来源')
  const adapter = targetAdapter(execution)
  const authority = {
    format_version: 2,
    kind: 'restore-runtime-authority',
    restore_id: productPlan.id,
    backup_id: productPlan.backup_id,
    plan_hash: record.plan_hash,
    scope_id: productPlan.scope_id,
    data_verified_at: record.data_verified_at,
    backup_source_sha: manifest.source_sha,
    backend_product_sha: execution.backend_product_sha,
    backend_execution_sha: execution.backend_execution_sha,
    backend_adapter_contract: adapter,
    frontend_sha: execution.frontend_sha,
    api_endpoint: productPlan.api_ready_url,
    worker_endpoint: productPlan.worker_ready_url,
    frontend_endpoint: frontendEndpoint,
  }
  const ports = [
    endpointPort(authority.api_endpoint, '/readyz'),
    endpointPort(authority.worker_endpoint, '/readyz'),
    endpointPort(authority.frontend_endpoint, ''),
  ]
  if (new Set(ports).size !== ports.length)
    throw new Error('恢复运行的 API、Worker 与前端端点必须互异')
  return Object.freeze({ authority: Object.freeze(authority), builds, roots })
}

function endpointPort(value, expectedPath) {
  const match =
    typeof value === 'string'
      ? /^(https?):\/\/(127\.0\.0\.1|\[::1\]):([0-9]+)(\/readyz)?$/u.exec(value)
      : null
  const port = Number(match?.[3])
  if (
    !match ||
    (match[4] || '') !== expectedPath ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    value !== `${match[1]}://${match[2]}:${port}${expectedPath}`
  )
    throw new Error('运行产物收据端点必须是规范化的本机 loopback 地址和显式端口')
  return port
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

function verifyFrontendBuild(receipt, expectedSha) {
  exactObject(
    receipt,
    ['format_version', 'kind', 'sources', 'build', 'files'],
    '运行产物收据内嵌前端构建字段无效',
  )
  validateFrontendBuildSources(receipt, expectedSha)
  if (
    receipt.format_version !== 2 ||
    receipt.kind !== 'restore-frontend-build' ||
    !Array.isArray(receipt.files)
  )
    throw new Error('运行产物收据内嵌前端构建字段无效')
  let previous = ''
  for (const file of receipt.files) {
    exactObject(file, frontendFileFields, '运行产物收据前端文件字段无效')
    if (
      !validFrontendPath(file.path) ||
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
  verifyFrontendBuild(receipt.frontend, authority.frontend_sha)
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
