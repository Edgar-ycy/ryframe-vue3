import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { restoreProofBindings } from './restore-proof.mjs'
import { inspectRestoreRuntimeReceipt, restoreRuntimeBinding } from './restore-runtime-receipt.mjs'
import { evidenceDirectory, evidenceFile } from './restore-verification.mjs'

const authorityFields = [
  'format_version',
  'kind',
  'runtime',
  'target_plan',
  'source_generation',
  'dataset_lineage',
  'target',
  'execution_backend',
]

export function datasetDigest(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function exactObject(value, fields, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0')
  )
    throw new Error(`${label}字段必须精确匹配当前格式`)
  return value
}

function samePath(left, right) {
  const normalize = (value) => {
    const resolved = path.normalize(path.resolve(value))
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved
  }
  return normalize(left) === normalize(right)
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const nested of Object.values(value)) deepFreeze(nested)
  return Object.freeze(value)
}

function descriptor(value, label) {
  const item = exactObject(value, ['path', 'bytes', 'sha256'], label)
  if (
    typeof item.path !== 'string' ||
    !path.isAbsolute(item.path) ||
    !Number.isSafeInteger(item.bytes) ||
    item.bytes <= 0 ||
    typeof item.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(item.sha256)
  )
    throw new Error(`${label}不是有效文件描述`)
  return item
}

function evidence(bytes, label) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0 ||
    bytes.byteLength > 16 * 1024 * 1024
  )
    throw new Error(`${label}缺失或超过 16 MiB`)
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch {
    throw new Error(`${label}不是有效 UTF-8 JSON 对象`)
  }
}

function stableFile(filename, label, read) {
  const first = read(filename, label)
  const second = read(filename, label)
  if (
    !samePath(first.path, filename) ||
    !samePath(second.path, filename) ||
    !samePath(first.path, second.path) ||
    !Buffer.from(first.bytes).equals(Buffer.from(second.bytes))
  )
    throw new Error(`${label}路径不一致或读取期间发生变化`)
  return { path: first.path, bytes: Buffer.from(first.bytes) }
}

function stableDocument(value, label, read) {
  const expected = descriptor(value, label)
  const file = stableFile(expected.path, label, read)
  if (file.bytes.byteLength !== expected.bytes || datasetDigest(file.bytes) !== expected.sha256)
    throw new Error(`${label}与登记摘要不同`)
  return {
    descriptor: deepFreeze({
      path: file.path,
      bytes: file.bytes.byteLength,
      sha256: datasetDigest(file.bytes),
    }),
    value: deepFreeze(evidence(file.bytes, label)),
  }
}

/** 只按配置阶段冻结的权威读取 STOP 与血缘，不重新解释可变 target plan。 */
export function restoreDatasetEvidence(value, { read = evidenceFile } = {}) {
  const authority = restoreDatasetAuthority(value)
  const generation = stableDocument(authority.source_generation, '来源 STOP 代次', read)
  const lineage = stableDocument(authority.dataset_lineage, 'C52 派生数据血缘', read)
  if (samePath(generation.descriptor.path, lineage.descriptor.path))
    throw new Error('来源 STOP 代次与 C52 派生数据血缘不能共用文件')
  return deepFreeze({
    authority: restoreDatasetAuthority({
      ...authority,
      source_generation: generation.descriptor,
      dataset_lineage: lineage.descriptor,
    }),
    lineage: lineage.value,
  })
}

function target(value) {
  const selected = exactObject(value, ['scope_id', 'api_url', 'frontend_url'], '恢复数据目标')
  if (Object.values(selected).some((item) => typeof item !== 'string' || !item))
    throw new Error('恢复数据目标字段无效')
  return selected
}

/** 严格解析后端唯一 validator 返回的只读数据权威投影。 */
export function restoreDatasetAuthority(value) {
  const item = exactObject(value, authorityFields, '恢复数据权威')
  if (item.format_version !== 1 || item.kind !== 'restore-dataset-authority')
    throw new Error('恢复数据权威版本或类型无效')
  const executionBackend = item.execution_backend
  if (typeof executionBackend !== 'string' || !path.isAbsolute(executionBackend))
    throw new Error('恢复数据权威执行后端无效')
  return deepFreeze({
    format_version: 1,
    kind: 'restore-dataset-authority',
    runtime: deepFreeze(structuredClone(descriptor(item.runtime, '恢复数据运行收据'))),
    target_plan: deepFreeze(structuredClone(descriptor(item.target_plan, '恢复数据目标计划'))),
    source_generation: deepFreeze(
      structuredClone(descriptor(item.source_generation, '来源 STOP 代次')),
    ),
    dataset_lineage: deepFreeze(
      structuredClone(descriptor(item.dataset_lineage, 'C52 派生数据血缘')),
    ),
    target: deepFreeze(structuredClone(target(item.target))),
    execution_backend: executionBackend,
  })
}

function sameDescriptor(actual, expected, label) {
  if (
    !samePath(actual.path, expected.path) ||
    actual.bytes !== expected.bytes ||
    actual.sha256 !== expected.sha256
  )
    throw new Error(`${label}与本次输入或已冻结权威不一致`)
}

function pythonPath(value) {
  if (typeof value !== 'string' || !value || value !== value.trim() || !path.isAbsolute(value))
    throw new Error('恢复数据预检必须显式绑定绝对 RYFRAME_PYTHON')
  return value
}

function authorityCommand(input, runtime, targetPlan, execute) {
  return execute(
    input.python,
    [
      '-X',
      'utf8',
      '-B',
      path.join(input.backendRoot, 'scripts/restore_business_proof.py'),
      '--preflight',
      '--backend-dir',
      input.backendRoot,
      '--runtime-receipt',
      runtime.path,
      '--target-plan',
      targetPlan.path,
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 300_000, maxBuffer: 1024 * 1024 },
  )
}

/** 在任何业务会话前调用后端唯一只读 validator，并冻结当前目标与 C52 数据来源。 */
export function verifyRestoreDatasetAuthority(
  input,
  { expected, execute = execFileSync, read = evidenceFile } = {},
) {
  const root = evidenceDirectory(input.backendRoot, '恢复证明协调后端')
  const python = pythonPath(input.python)
  const runtime = stableFile(input.runtimeReceipt, '恢复运行收据', read)
  const targetPlan = stableFile(input.targetPlan, '恢复目标计划', read)
  const { record, manifest } = restoreProofBindings(input.bindingsBytes)
  const binding = restoreRuntimeBinding({
    record,
    manifest,
    targetPlanBytes: targetPlan.bytes,
    frontendEndpoint: input.frontendEndpoint,
  })
  inspectRestoreRuntimeReceipt({
    bytes: runtime.bytes,
    bindingsBytes: input.bindingsBytes,
    expected: binding,
  })
  let output
  try {
    output = evidence(
      Buffer.from(
        authorityCommand({ ...input, backendRoot: root, python }, runtime, targetPlan, execute),
      ),
      '恢复数据权威输出',
    )
  } catch (error) {
    if (error instanceof Error && error.message === '恢复数据权威输出不是有效 UTF-8 JSON 对象')
      throw error
    throw new Error('后端恢复数据只读预检失败', { cause: error })
  }
  const projected = restoreDatasetAuthority(output)
  const currentRuntime = {
    path: runtime.path,
    bytes: runtime.bytes.byteLength,
    sha256: datasetDigest(runtime.bytes),
  }
  const currentTarget = {
    path: targetPlan.path,
    bytes: targetPlan.bytes.byteLength,
    sha256: datasetDigest(targetPlan.bytes),
  }
  sameDescriptor(projected.runtime, currentRuntime, '恢复数据运行收据')
  sameDescriptor(projected.target_plan, currentTarget, '恢复数据目标计划')
  const expectedTarget = {
    scope_id: binding.authority.scope_id,
    api_url: new URL(binding.authority.api_endpoint).origin,
    frontend_url: binding.authority.frontend_endpoint,
  }
  if (
    !isDeepStrictEqual(projected.target, expectedTarget) ||
    !samePath(projected.execution_backend, binding.roots.execution_backend)
  )
    throw new Error('恢复数据权威与运行绑定的目标不一致')
  if (expected && !isDeepStrictEqual(projected, restoreDatasetAuthority(expected)))
    throw new Error('恢复数据权威与配置阶段冻结结果不一致')
  const verified = restoreDatasetEvidence(projected, { read })
  const runtimeAfter = stableFile(runtime.path, '恢复运行收据', read)
  const targetAfter = stableFile(targetPlan.path, '恢复目标计划', read)
  if (!runtime.bytes.equals(runtimeAfter.bytes) || !targetPlan.bytes.equals(targetAfter.bytes))
    throw new Error('恢复数据预检期间运行收据或目标计划发生变化')
  const authority = restoreDatasetAuthority({
    ...projected,
    runtime: currentRuntime,
    target_plan: currentTarget,
    source_generation: verified.authority.source_generation,
    dataset_lineage: verified.authority.dataset_lineage,
    execution_backend: path.resolve(projected.execution_backend),
  })
  return deepFreeze({ authority, lineage: verified.lineage })
}

function exportedFunction(module, name) {
  const value = module?.[name]
  if (typeof value !== 'function') throw new Error(`恢复验证器缺少 ${name}`)
  return value
}

/** 使用已冻结权威，在登记目标只读核验 C52 全部样本。 */
export async function verifyRestoredDataset(
  { authority: verified, verifierRoot },
  load = (specifier) => import(specifier),
) {
  const value = exactObject(verified, ['authority', 'lineage'], '恢复数据核验输入')
  const authority = restoreDatasetAuthority(value.authority)
  const lineage = value.lineage
  const root = evidenceDirectory(verifierRoot, '恢复证明协调后端')
  const [sourceModule, targetModule] = await Promise.all([
    load(pathToFileURL(path.join(root, 'scripts/restore_source_existing.mjs')).href),
    load(pathToFileURL(path.join(root, 'scripts/restore_reference_existing.mjs')).href),
  ])
  exportedFunction(sourceModule, 'validateSourceLineage')(lineage)
  const expected = { tenants: 11, posts: lineage.scale?.post_samples, files: 256 }
  if (!Number.isSafeInteger(expected.posts) || expected.posts < 33)
    throw new Error('恢复数据血缘没有登记完整岗位样本')
  const counts = await exportedFunction(targetModule, 'verifyIdentitiesAt')(
    authority.execution_backend,
    lineage.tenants,
    authority.target,
    19,
    lineage.verification.request_interval_ms,
  )
  if (!isDeepStrictEqual(counts, expected)) throw new Error('恢复目标已有数据与 C52 血缘规模不同')
  return deepFreeze({
    format_version: 1,
    kind: 'restore-target-existing-verification',
    status: 'target_existing_data_verified',
    scope_id: authority.target.scope_id,
    source_scope_id: lineage.scopes.origin_tenant_scope_id,
    actions: { business: 'read_only', objects: 'read_only', session: 'login_logout' },
    restore_success: false,
    ...counts,
  })
}
