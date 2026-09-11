import { isAbsolute } from 'node:path'
import { sha256 } from './build-source-inventory.mjs'
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
  'backend_root',
  'frontend_root',
  'runtime_dir',
  'bindings',
  'backend_build',
  'frontend_build',
]
const digestFields = ['bindings', 'backend_build', 'frontend_build']
const sourceFields = ['backend_sha', 'frontend_sha']
const endpointFields = ['api', 'worker', 'frontend']
const processFields = ['receipt_path', 'receipt_sha256', 'identity']
const identityFields = ['pid', 'started', 'executable']
const artifactFields = ['executable', 'command', 'bytes', 'sha256']
const frontendFileFields = ['path', 'bytes', 'sha256']

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
      file.path <= previous ||
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

export function verifyRestoreRuntimeReceipt({ bytes, verifiedDigest, bindingsBytes, expected }) {
  const receipt = parseEvidence(bytes)
  const digest = sha256(bytes)
  if (verifiedDigest !== digest) throw new Error('运行产物摘要不是外部核验器本次确认的实际摘要')
  exactObject(receipt.restore, restoreFields, '运行产物收据的恢复绑定字段无效')
  exactObject(receipt.paths, pathFields, '运行产物收据的路径绑定字段无效')
  exactObject(receipt.digests, digestFields, '运行产物收据的摘要绑定字段无效')
  exactObject(receipt.source, sourceFields, '运行产物收据的源码绑定字段无效')
  exactObject(receipt.endpoints, endpointFields, '运行产物收据的端点绑定字段无效')
  exactObject(receipt.processes, ['api', 'worker'], '运行产物收据的进程集合字段无效')
  const endpointPorts = [
    endpointPort(receipt.endpoints.api, '/readyz'),
    endpointPort(receipt.endpoints.worker, '/readyz'),
    endpointPort(receipt.endpoints.frontend, ''),
  ]
  if (
    receipt.format_version !== 2 ||
    receipt.kind !== 'restore-runtime' ||
    !isRestoreIdentifier(receipt.restore.id) ||
    !isRestoreIdentifier(receipt.restore.backup_id) ||
    !isResourceScopeId(receipt.restore.scope_id) ||
    !validHex(receipt.restore.plan_hash, 64) ||
    !validInstant(receipt.restore.data_verified_at) ||
    receipt.restore.id !== expected.restoreId ||
    receipt.restore.backup_id !== expected.backupId ||
    receipt.restore.plan_hash !== expected.planHash ||
    receipt.restore.scope_id !== expected.scopeId ||
    receipt.restore.data_verified_at !== expected.dataVerifiedAt ||
    receipt.digests.bindings !== sha256(bindingsBytes) ||
    !Object.values(receipt.digests).every((value) => validHex(value, 64)) ||
    receipt.source.backend_sha !== expected.backendSha ||
    receipt.source.frontend_sha !== expected.frontendSha ||
    !validHex(receipt.source.backend_sha, 40) ||
    !validHex(receipt.source.frontend_sha, 40) ||
    !Object.values(receipt.paths).every(
      (value) => typeof value === 'string' && isAbsolute(value),
    ) ||
    receipt.endpoints.api !== expected.apiEndpoint ||
    receipt.endpoints.worker !== expected.workerEndpoint ||
    new Set(endpointPorts).size !== endpointPorts.length
  )
    throw new Error('运行产物收据与演练、源码、构建或进程集合不一致')
  verifyBackendBuild(receipt.backend, expected.backendSha)
  verifyFrontendBuild(receipt.frontend, expected.frontendSha)
  verifyProcess(receipt.processes.api, 'api')
  verifyProcess(receipt.processes.worker, 'worker')
  return Object.freeze({ digest, receipt })
}
