import { toolProcessEnvironment } from './tool-inputs.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { restoreProofBindings } from './restore-proof.mjs'
import { inspectRestoreRuntimeReceipt, restoreRuntimeBinding } from './restore-runtime-receipt.mjs'
import { evidenceDirectory, evidenceFile, verifiedCheckout } from './restore-verification.mjs'
import { invokeWorkerTool } from './worker-tool.mjs'
import { parseXtaskJsonReceipt } from './xtask-receipt.mjs'

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

function authorityCommand(input, runtime, targetPlan, execute) {
  const output = invokeWorkerTool(
    input.tool,
    ['__source-evidence'],
    {
      cwd: input.backendRoot,
      input: JSON.stringify({
        operation: 'restore-dataset-authority',
        arguments: {
          backend_dir: input.backendRoot,
          runtime_receipt: runtime.path,
          target_plan: targetPlan.path,
        },
        write: false,
      }),
      encoding: 'utf8',
      windowsHide: true,
      timeout: 300_000,
      maxBuffer: 1024 * 1024,
      env: toolProcessEnvironment(),
    },
    execute,
  )
  const response = exactObject(parseXtaskJsonReceipt(output), ['ok', 'result'], '恢复数据原生响应')
  if (response.ok !== true) throw new Error('恢复数据原生响应未确认成功')
  const result = exactObject(response.result, ['value'], '恢复数据原生结果')
  return result.value
}

/** 在任何业务会话前调用后端唯一只读 validator，并冻结当前目标与 C52 数据来源。 */
export function verifyRestoreDatasetAuthority(
  input,
  { expected, execute = execFileSync, read = evidenceFile } = {},
) {
  const root = evidenceDirectory(input.backendRoot, '恢复证明协调后端')
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
    output = authorityCommand({ ...input, backendRoot: root }, runtime, targetPlan, execute)
  } catch (error) {
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

/** 使用已冻结权威核验登记目标的全部已有数据，登录和注销由 Rust 控制。 */
export function verifyRestoredDataset(
  { authority: verified, coordinatorRoot, coordinatorSha, verifierRoot, verifierSha, tool },
  { execute = execFileSync, checkout = verifiedCheckout } = {},
) {
  const value = exactObject(verified, ['authority', 'lineage'], '恢复数据核验输入')
  const { authority, lineage } = restoreDatasetEvidence(value.authority)
  if (!isDeepStrictEqual(lineage, value.lineage))
    throw new Error('恢复数据血缘与配置阶段冻结内容不一致')
  const root = checkout(coordinatorRoot, coordinatorSha, '恢复证明协调后端')
  const verifier = checkout(verifierRoot, verifierSha, '恢复证明核验源码')
  if (evidenceDirectory(tool.root, '恢复核验工具来源') !== verifier)
    throw new Error('恢复核验源码目录与 Worker 工具来源根不同')
  const posts = lineage.scale?.post_samples
  const sourceScope = lineage.scopes?.origin_tenant_scope_id
  if (
    !Array.isArray(lineage.tenants) ||
    lineage.tenants.length !== 11 ||
    lineage.scale?.tenants !== 11 ||
    !Number.isSafeInteger(posts) ||
    posts < 33 ||
    lineage.scale.business_objects !== 256 ||
    typeof sourceScope !== 'string' ||
    !sourceScope
  )
    throw new Error('恢复数据血缘没有登记完整租户、岗位及对象样本')
  const expected = {
    format_version: 1,
    kind: 'restore-target-existing-verification',
    status: 'target_existing_data_verified',
    scope_id: authority.target.scope_id,
    source_scope_id: sourceScope,
    actions: { business: 'read_only', objects: 'read_only', session: 'login_logout' },
    restore_success: false,
    tenants: 11,
    posts,
    files: 256,
  }

  let output
  try {
    output = invokeWorkerTool(
      tool,
      ['__restore-dataset-verify-existing'],
      {
        cwd: root,
        input: JSON.stringify({
          format_version: 1,
          kind: 'ryframe-restore-dataset-verification',
          write: true,
          authority,
        }),
        encoding: 'utf8',
        windowsHide: true,
        timeout: 20 * 60_000,
        maxBuffer: 1024 * 1024,
        env: toolProcessEnvironment(),
      },
      execute,
    )
  } catch {
    throw new Error('恢复已有数据核验失败。登录或注销可能已发生，请保留失败现场，禁止自动重放。')
  }

  checkout(coordinatorRoot, coordinatorSha, '恢复证明协调后端')
  checkout(verifierRoot, verifierSha, '恢复证明核验源码')
  const result = parseXtaskJsonReceipt(output)
  if (!isDeepStrictEqual(result, expected))
    throw new Error('恢复目标已有数据核验收据与冻结身份、操作或 C52 血缘规模不一致')
  return deepFreeze(result)
}
