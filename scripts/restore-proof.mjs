import { isAbsolute } from 'node:path'
import { sha256 } from './build-source-inventory.mjs'
import {
  isResourceScopeId,
  isRestoreIdentifier,
  restoreRuntimeBinding,
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
const testRunFields = ['title', 'status', 'retry', 'scenarios']

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

function verifiedRuntime(
  bytes,
  verifiedDigest,
  bindingsBytes,
  targetPlanBytes,
  frontendEndpoint,
  record,
  manifest,
) {
  const expected = restoreRuntimeBinding({
    record,
    manifest,
    targetPlanBytes,
    frontendEndpoint,
  })
  return verifyRestoreRuntimeReceipt({
    bytes,
    verifiedDigest,
    bindingsBytes,
    expected,
  })
}

function sourceDescriptor(root, sha, label) {
  if (typeof root !== 'string' || !isAbsolute(root) || !/^[a-f0-9]{40}$/u.test(sha))
    throw new Error(`恢复业务验收缺少精确${label}源码`)
  return { root, sha }
}

function documentDescriptor(path, bytes, digest, label) {
  if (
    typeof path !== 'string' ||
    !isAbsolute(path) ||
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0 ||
    !/^[a-f0-9]{64}$/u.test(digest)
  )
    throw new Error(`恢复业务验收缺少精确${label}`)
  return { path, bytes: bytes.byteLength, sha256: digest }
}

function verifiedRuns(runs, status) {
  if (status !== 'passed' || !Array.isArray(runs) || runs.length === 0)
    throw new Error('真实浏览器验收有失败、跳过或重试，不能生成成功恢复证明')
  const normalized = []
  for (const run of runs) {
    exactObject(run, testRunFields, '恢复测试明细字段缺失或包含未登记内容')
    if (
      !Array.isArray(run.title) ||
      run.title.length === 0 ||
      run.title.some((part) => typeof part !== 'string' || !part.trim()) ||
      run.status !== 'passed' ||
      run.retry !== 0 ||
      !Array.isArray(run.scenarios) ||
      run.scenarios.some((scenario) => typeof scenario !== 'string' || !scenario)
    )
      throw new Error('真实浏览器验收有失败、跳过或重试，不能生成成功恢复证明')
    normalized.push({
      title: [...run.title],
      status: run.status,
      retry: run.retry,
      scenarios: [...run.scenarios],
    })
  }
  const scenarioNames = normalized.flatMap((run) => run.scenarios)
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
  return normalized
}

export function buildRestoreEvidence({
  bindingsBytes,
  runtimeBytes,
  targetPlanBytes,
  verifiedRuntimeDigest,
  frontendEndpoint,
  runtimeEvidencePath,
  targetPlanPath,
  runnerRoot,
  runnerSha,
  verifierRoot,
  verifierSha,
  started,
  completed,
  runs,
  status,
}) {
  const { record, manifest } = restoreProofBindings(bindingsBytes)
  const runtime = verifiedRuntime(
    runtimeBytes,
    verifiedRuntimeDigest,
    bindingsBytes,
    targetPlanBytes,
    frontendEndpoint,
    record,
    manifest,
  )
  const runner = sourceDescriptor(runnerRoot, runnerSha, 'runner')
  const verifier = sourceDescriptor(verifierRoot, verifierSha, 'verifier')
  const verifiedAt = instant(record.data_verified_at, '恢复业务验收必须绑定包含时区的数据验证时刻')
  if (
    !Number.isFinite(started) ||
    !Number.isFinite(completed) ||
    started < verifiedAt ||
    completed < started
  )
    throw new Error('业务测试必须在数据验证之后执行，且计时必须单调')
  const startedAt = new Date(started).toISOString()
  const completedAt = new Date(completed).toISOString()
  const verifiedTestRuns = verifiedRuns(runs, status)
  const runtimeDescriptor = documentDescriptor(
    runtimeEvidencePath,
    runtimeBytes,
    runtime.digest,
    '运行收据副本',
  )
  const targetPlanDescriptor = documentDescriptor(
    targetPlanPath,
    targetPlanBytes,
    sha256(targetPlanBytes),
    '目标计划',
  )
  const source = runtime.receipt.source
  const sources = {
    backup_source_sha: source.backup_source_sha,
    backend_product_sha: source.backend_product_sha,
    backend_execution_sha: source.backend_execution_sha,
    backend_adapter_contract: source.backend_adapter_contract,
    frontend_sha: source.frontend_sha,
    runner,
    verifier,
  }
  const testsReceipt = {
    format_version: 1,
    kind: 'restore-browser-tests',
    restore: {
      id: record.plan.id,
      plan_hash: record.plan_hash,
      scope_id: record.plan.scope_id,
    },
    runtime: runtimeDescriptor,
    target_plan: targetPlanDescriptor,
    sources,
    frontend_url: frontendEndpoint,
    started_at: startedAt,
    completed_at: completedAt,
    runs: verifiedTestRuns,
  }
  const testsBytes = Buffer.from(JSON.stringify(testsReceipt, null, 2) + '\n')
  const proof = {
    restore_id: record.plan.id,
    plan_hash: record.plan_hash,
    backup_source_sha: source.backup_source_sha,
    backend_product_sha: source.backend_product_sha,
    backend_execution_sha: source.backend_execution_sha,
    backend_adapter_contract: source.backend_adapter_contract,
    frontend_sha: source.frontend_sha,
    runner_sha: runnerSha,
    verifier_sha: verifierSha,
    scope_id: record.plan.scope_id,
    frontend_url: frontendEndpoint,
    runtime_receipt_sha256: runtime.digest,
    tests_receipt_sha256: sha256(testsBytes),
    target_plan_sha256: targetPlanDescriptor.sha256,
    started_at: startedAt,
    completed_at: completedAt,
    scenarios: requiredScenarios.map((name) => ({ name, succeeded: true })),
    // 场景注解只在对应业务、控制台/网络与 axe 断言全部通过后写入。
    unexpected_console_messages: 0,
    unexpected_network_failures: 0,
    axe_serious_or_critical: 0,
  }
  return Object.freeze({ proof: Object.freeze(proof), testsBytes, testsReceipt })
}
