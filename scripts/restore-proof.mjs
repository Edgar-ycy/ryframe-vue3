import { sha256 } from './build-source-inventory.mjs'
import {
  isResourceScopeId,
  isRestoreIdentifier,
  verifyRestoreRuntimeReceipt,
} from './restore-runtime-receipt.mjs'

export const requiredScenarios = [
  'login',
  'session',
  'post',
  'notice',
  'tenant',
  'export',
  'message',
  'schedule',
  'restored-data',
]

const restorePlanFields = [
  'id',
  'backup_id',
  'scope_id',
  'fault_at',
  'databases',
  'object_endpoint',
  'object_prefix',
  'api_ready_url',
  'worker_ready_url',
  'frontend_sha',
]
const databaseFields = ['source_key', 'target_key', 'server_uuid', 'database']

function exactObject(value, fields, message) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0')
  )
    throw new Error(message)
}

function parseEvidence(bytes, name) {
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
    throw new Error(`${name}不是有效 JSON`)
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${name}必须是 JSON 对象`)
  return value
}

function instant(value, message) {
  if (
    typeof value !== 'string' ||
    !/(?:Z|[+-][0-9]{2}:[0-9]{2})$/u.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error(message)
  return Date.parse(value)
}

function restorePlanDigest(plan) {
  exactObject(plan, restorePlanFields, '恢复计划字段缺失或包含未登记内容')
  if (!Array.isArray(plan.databases) || plan.databases.length === 0)
    throw new Error('恢复计划没有登记数据库目标')
  const logicalTargets = new Set()
  const physicalTargets = new Set()
  const databases = plan.databases.map((database) => {
    exactObject(database, databaseFields, '恢复数据库目标字段缺失或包含未登记内容')
    if (databaseFields.some((field) => typeof database[field] !== 'string' || !database[field]))
      throw new Error('恢复数据库目标身份不完整')
    const physical = `${database.server_uuid}\0${database.database.toLowerCase()}`
    if (logicalTargets.has(database.target_key) || physicalTargets.has(physical))
      throw new Error('恢复计划包含重复逻辑或物理数据库目标')
    logicalTargets.add(database.target_key)
    physicalTargets.add(physical)
    return Object.fromEntries(databaseFields.map((field) => [field, database[field]]))
  })
  const normalized = Object.fromEntries(
    restorePlanFields.map((field) => [field, field === 'databases' ? databases : plan[field]]),
  )
  return sha256(Buffer.from(JSON.stringify(normalized)))
}

export function restoreProofBindings(bytes) {
  const bindings = parseEvidence(bytes, '恢复绑定收据')
  const { record, manifest } = bindings
  const plan = record?.plan
  if (
    record?.status !== 'data_verified' ||
    !isRestoreIdentifier(plan?.id) ||
    !isRestoreIdentifier(plan?.backup_id) ||
    !isResourceScopeId(plan?.scope_id) ||
    !isResourceScopeId(manifest?.scope_id) ||
    !/^[a-f0-9]{40}$/u.test(plan?.frontend_sha) ||
    !/^[a-f0-9]{40}$/u.test(manifest?.source_sha) ||
    plan.backup_id !== manifest?.id ||
    plan.scope_id === manifest.scope_id ||
    plan.object_prefix !== `${plan.scope_id}/` ||
    record.plan_hash !== restorePlanDigest(plan)
  )
    throw new Error('恢复业务验收必须绑定同一数据校验、备份、隔离目标与精确源码')
  return { bindings, record, manifest }
}

function verifiedRuntime(bytes, verifiedDigest, bindingsBytes, record, manifest) {
  return verifyRestoreRuntimeReceipt({
    bytes,
    verifiedDigest,
    bindingsBytes,
    expected: {
      restoreId: record.plan.id,
      backupId: record.plan.backup_id,
      planHash: record.plan_hash,
      scopeId: record.plan.scope_id,
      dataVerifiedAt: record.data_verified_at,
      backendSha: manifest.source_sha,
      frontendSha: record.plan.frontend_sha,
      apiEndpoint: record.plan.api_ready_url,
      workerEndpoint: record.plan.worker_ready_url,
    },
  }).digest
}

export function buildRestoreProof({
  bindingsBytes,
  runtimeBytes,
  verifiedRuntimeDigest,
  started,
  completed,
  runs,
  status,
}) {
  const { record, manifest } = restoreProofBindings(bindingsBytes)
  const runtimeDigest = verifiedRuntime(
    runtimeBytes,
    verifiedRuntimeDigest,
    bindingsBytes,
    record,
    manifest,
  )
  const verifiedAt = instant(record.data_verified_at, '恢复业务验收必须绑定包含时区的数据验证时刻')
  if (
    !Number.isFinite(started) ||
    !Number.isFinite(completed) ||
    started < verifiedAt ||
    completed < started
  )
    throw new Error('业务测试必须在数据验证之后执行，且计时必须单调')
  if (
    status !== 'passed' ||
    !Array.isArray(runs) ||
    runs.length === 0 ||
    runs.some((run) => run?.status !== 'passed' || run.retry !== 0 || !Array.isArray(run.scenarios))
  )
    throw new Error('真实浏览器验收有失败、跳过或重试，不能生成成功恢复证明')
  const scenarioNames = runs.flatMap((run) => run.scenarios)
  const names = new Set(scenarioNames)
  if (
    scenarioNames.length !== requiredScenarios.length ||
    names.size !== requiredScenarios.length ||
    !requiredScenarios.every((name) => names.has(name))
  )
    throw new Error(
      `恢复业务验收场景缺失、重复或未知：${requiredScenarios
        .filter((name) => !names.has(name))
        .join(', ')}`,
    )
  return {
    restore_id: record.plan.id,
    plan_hash: record.plan_hash,
    backend_sha: manifest.source_sha,
    frontend_sha: record.plan.frontend_sha,
    scope_id: record.plan.scope_id,
    runtime_receipt_sha256: runtimeDigest,
    started_at: new Date(started).toISOString(),
    completed_at: new Date(completed).toISOString(),
    scenarios: requiredScenarios.map((name) => ({ name, succeeded: true })),
    // 场景注解只在对应业务、控制台/网络与 axe 断言全部通过后写入。
    unexpected_console_messages: 0,
    unexpected_network_failures: 0,
    axe_serious_or_critical: 0,
  }
}
