import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { restoreProofBindings } from './restore-proof.mjs'
import { restoreRuntimeBinding } from './restore-runtime-receipt.mjs'
import { evidenceDirectory, evidenceFile } from './restore-verification.mjs'

export function datasetDigest(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function exactObject(value, fields, name) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0')
  )
    throw new Error(`${name}字段缺失或包含未登记内容`)
  return value
}

function descriptor(value, name) {
  exactObject(value, ['path', 'bytes', 'sha256'], name)
  if (
    typeof value.path !== 'string' ||
    !Number.isSafeInteger(value.bytes) ||
    value.bytes <= 0 ||
    !/^[a-f0-9]{64}$/u.test(value.sha256)
  )
    throw new Error(`${name}不是有效文件描述`)
  return value
}

function boundJson(value, name, read) {
  const expected = descriptor(value, name)
  const file = read(expected.path, name)
  if (file.bytes.byteLength !== expected.bytes || datasetDigest(file.bytes) !== expected.sha256)
    throw new Error(`${name}与登记摘要不同`)
  return { descriptor: structuredClone(expected), value: evidence(file.bytes, name) }
}

/**
 * 从正式 target plan 已绑定的备份结果递归定位唯一 STOP、source-runtime、START 与 C52 血缘。
 * 各文档的完整业务 schema 仍由后端唯一 validator 负责；这里拒绝孤立环境文件和摘要替换。
 */
export function restoredDatasetLineage(targetPlanBytes, read = evidenceFile) {
  const target = evidence(targetPlanBytes, '恢复目标计划')
  const backup = boundJson(target.backup_receipt, '正式备份收据', read).value
  if (backup.command !== 'backup' || backup.status !== 'completed')
    throw new Error('恢复目标计划没有绑定已完成正式备份')
  const result = backup.result
  if (result?.format_version !== 2 || result.kind !== 'restore-reference-backup')
    throw new Error('正式备份结果不是当前 v2 格式')
  const sourceGeneration = descriptor(result.source_generation, '来源 STOP 代次')
  if (!isDeepStrictEqual(result.source_export?.source_generation, sourceGeneration))
    throw new Error('正式备份与共享导出没有绑定同一来源 STOP 代次')
  const stopped = boundJson(sourceGeneration, '来源 STOP 代次', read).value
  if (stopped.status !== 'seed_source_generation_published')
    throw new Error('来源代次尚未发布停止证明')
  const sourceRuntime = descriptor(stopped.source_runtime, '来源运行收据')
  const start = descriptor(stopped.start, '来源 START 代次')
  const datasetLineage = descriptor(stopped.dataset_lineage, 'C52 派生数据血缘')
  const runtime = boundJson(sourceRuntime, '来源运行收据', read).value
  const started = boundJson(start, '来源 START 代次', read).value
  const lineage = boundJson(datasetLineage, 'C52 派生数据血缘', read).value
  if (
    runtime.format_version !== 2 ||
    runtime.kind !== 'restore-source-runtime' ||
    runtime.status !== 'source_runtime_verified' ||
    !isDeepStrictEqual(runtime.source_generation, start) ||
    !isDeepStrictEqual(runtime.dataset_lineage, datasetLineage) ||
    !isDeepStrictEqual(started.dataset_lineage, datasetLineage) ||
    !isDeepStrictEqual(stopped.dataset_lineage, datasetLineage)
  )
    throw new Error('来源运行收据、START、STOP 与 C52 血缘不是同一代次')
  if (
    lineage.format_version !== 1 ||
    lineage.kind !== 'restore-source-derived-dataset-lineage' ||
    lineage.status !== 'derived_dataset_verified' ||
    lineage.restore_qualified !== false
  )
    throw new Error('C52 派生数据血缘状态无效')
  return Object.freeze({
    lineage,
    sourceGeneration: Object.freeze(structuredClone(sourceGeneration)),
    sourceRuntime: Object.freeze(structuredClone(sourceRuntime)),
    datasetLineage: Object.freeze(structuredClone(datasetLineage)),
  })
}

function evidence(bytes, name) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0 ||
    bytes.byteLength > 16 * 1024 * 1024
  )
    throw new Error(`${name}缺失或超过 16 MiB`)
  let value
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new Error(`${name}不是有效 UTF-8 JSON`)
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${name}必须是 JSON 对象`)
  return value
}

function exportedFunction(module, name) {
  const value = module?.[name]
  if (typeof value !== 'function') throw new Error(`恢复验证器缺少 ${name}`)
  return value
}

/** 使用当前 verifier 的严格血缘校验器，在 target plan 登记的产品目标只读核验全部样本。 */
export async function verifyRestoredDataset(
  { bindingsBytes, targetPlanBytes, frontendEndpoint, verifierRoot, lineage },
  load = (specifier) => import(specifier),
) {
  const { record, manifest } = restoreProofBindings(bindingsBytes)
  const runtime = restoreRuntimeBinding({ record, manifest, targetPlanBytes, frontendEndpoint })
  const root = evidenceDirectory(verifierRoot, '恢复证明协调后端')
  const [sourceModule, targetModule] = await Promise.all([
    load(pathToFileURL(path.join(root, 'scripts/restore_source_existing.mjs')).href),
    load(pathToFileURL(path.join(root, 'scripts/restore_reference_existing.mjs')).href),
  ])
  exportedFunction(sourceModule, 'validateSourceLineage')(lineage)
  const expected = {
    tenants: 11,
    posts: lineage.scale?.post_samples,
    files: 256,
  }
  if (!Number.isSafeInteger(expected.posts) || expected.posts < 33)
    throw new Error('恢复数据血缘没有登记完整岗位样本')
  const counts = await exportedFunction(targetModule, 'verifyIdentitiesAt')(
    runtime.roots.execution_backend,
    lineage.tenants,
    {
      api_url: new URL(runtime.authority.api_endpoint).origin,
      frontend_url: runtime.authority.frontend_endpoint,
    },
    19,
    lineage.verification.request_interval_ms,
  )
  if (!isDeepStrictEqual(counts, expected)) throw new Error('恢复目标已有数据与 C52 血缘规模不同')
  return Object.freeze({
    format_version: 1,
    kind: 'restore-target-existing-verification',
    status: 'target_existing_data_verified',
    scope_id: record.plan.scope_id,
    source_scope_id: lineage.scopes.origin_tenant_scope_id,
    actions: { business: 'read_only', objects: 'read_only', session: 'login_logout' },
    restore_success: false,
    ...counts,
  })
}
