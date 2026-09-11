import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { restoreProofBindings } from './restore-proof.mjs'
import { evidenceFile } from './restore-verification.mjs'

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  return value
}

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

function instant(value, name) {
  if (
    typeof value !== 'string' ||
    !/(?:Z|[+-][0-9]{2}:[0-9]{2})$/u.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error(`${name}必须是包含时区的有效时间`)
  return Date.parse(value)
}

export function restoredDataset(datasetBytes, planBytes, bindingBytes) {
  const dataset = evidence(datasetBytes, '旧数据收据')
  const plan = evidence(planBytes, '恢复参考计划')
  const { bindings, record, manifest } = restoreProofBindings(bindingBytes)
  if (
    bindings.dataset_sha256 !== datasetDigest(datasetBytes) ||
    dataset.plan_sha256 !== datasetDigest(JSON.stringify(canonical(plan))) ||
    dataset.source_scope_id !== plan.source?.scope_id ||
    manifest.scope_id !== dataset.source_scope_id ||
    record.plan.scope_id !== plan.target?.scope_id ||
    record.plan.object_endpoint !== plan.target?.s3?.endpoint
  )
    throw new Error('旧数据收据必须绑定同一参考计划、备份、数据验证和隔离目标')
  const started = instant(dataset.started_at, '旧数据准备开始时间')
  const completed = instant(dataset.completed_at, '旧数据准备完成时间')
  const quiesced = instant(manifest.quiesced_at, '备份停止写入时间')
  if (completed < started || completed > quiesced)
    throw new Error('旧数据必须在备份停止写入前准备完成')
  if (
    dataset.format_version !== 1 ||
    !Number.isSafeInteger(dataset.records) ||
    dataset.records < 100_000 ||
    !Number.isSafeInteger(dataset.object_bytes) ||
    dataset.object_bytes < 1024 ** 3 ||
    !Array.isArray(dataset.tenants) ||
    dataset.tenants.length !== 11
  )
    throw new Error('恢复参考规模必须达到 11 个租户、10 万记录和 1 GiB 对象')
  const expected = new Set([
    'system',
    ...Array.from(
      { length: 10 },
      (_, index) => `${dataset.source_scope_id}-${String(index + 1).padStart(2, '0')}`,
    ),
  ])
  let records = 0
  let bytes = 0
  const filePaths = new Set()
  for (const tenant of dataset.tenants) {
    if (
      !expected.delete(tenant.tenant_id) ||
      typeof tenant.username !== 'string' ||
      !tenant.username.trim() ||
      !/^[A-Z][A-Z0-9_]+$/u.test(tenant.password_env) ||
      !Number.isSafeInteger(tenant.records) ||
      tenant.records <= 0 ||
      !Array.isArray(tenant.posts) ||
      tenant.posts.length < 3 ||
      !Array.isArray(tenant.files) ||
      !tenant.files.length
    )
      throw new Error('旧数据租户、样本或凭据引用不完整')
    const postIds = new Set()
    const postCodes = new Set()
    for (const post of tenant.posts)
      if (
        !/^[1-9][0-9]*$/u.test(post.id) ||
        typeof post.code !== 'string' ||
        !post.code.trim() ||
        typeof post.name !== 'string' ||
        !post.name.trim() ||
        postIds.has(post.id) ||
        postCodes.has(post.code)
      )
        throw new Error('旧岗位样本无效')
      else {
        postIds.add(post.id)
        postCodes.add(post.code)
      }
    for (const file of tenant.files) {
      const parts = typeof file.file_path === 'string' ? file.file_path.split('/') : []
      if (
        !/^[a-f0-9]{64}$/u.test(file.sha256) ||
        !Number.isSafeInteger(file.bytes) ||
        file.bytes <= 0 ||
        file.bytes > 4 * 1024 * 1024 ||
        typeof file.file_path !== 'string' ||
        !file.file_path ||
        file.file_path.startsWith('/') ||
        file.file_path.includes('\\') ||
        parts.some(
          (part) =>
            !part ||
            part === '.' ||
            part === '..' ||
            [...part].some((character) => character.codePointAt(0) < 32),
        ) ||
        filePaths.has(file.file_path)
      )
        throw new Error('旧对象样本无效')
      filePaths.add(file.file_path)
      bytes += file.bytes
    }
    records += tenant.records
  }
  if (records !== dataset.records || bytes !== dataset.object_bytes)
    throw new Error('旧数据样本数量与声明规模不一致')
  return dataset
}

export function restoredExistingVerification(result, datasetBytes, planBytes, bindingBytes) {
  const dataset = restoredDataset(datasetBytes, planBytes, bindingBytes)
  const plan = evidence(planBytes, '恢复参考计划')
  const expected = {
    format_version: 1,
    status: 'existing_data_verified',
    side: 'target',
    scope_id: plan.target.scope_id,
    plan_sha256: datasetDigest(JSON.stringify(canonical(plan))),
    source_scope_id: plan.source.scope_id,
    dataset_sha256: datasetDigest(datasetBytes),
    actions: { business: 'read_only', objects: 'read_only', session: 'login_logout' },
    restore_success: false,
    tenants: dataset.tenants.length,
    posts: dataset.tenants.reduce((count, tenant) => count + tenant.posts.length, 0),
    files: dataset.tenants.reduce((count, tenant) => count + tenant.files.length, 0),
  }
  if (JSON.stringify(canonical(result)) !== JSON.stringify(canonical(expected)))
    throw new Error('已有数据验证结果必须来自绑定的 target；源侧或错范围结果不能作为恢复证明')
}
