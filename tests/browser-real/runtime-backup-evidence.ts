import { createHash } from 'node:crypto'
import {
  isResourceScopeId,
  isRestoreIdentifier,
  verifyRestoreRuntimeReceipt,
} from '../../scripts/restore-runtime-receipt.mjs'

type JsonObject = Record<string, unknown>

export interface VerifiedRestoreRuntimeFacts {
  backup: {
    capturedAt: string
    id: string
    requiredResources: number
    sourceScopeId: string
  }
  restore: {
    dataVerifiedAt: string
    faultAt: string
    id: string
    recoveredAt: string
    recoveryPointAgeSeconds: number
    startedAt: string
    targetScopeId: string
  }
  runtimeReceiptSha256: string
}

const PLAN_FIELDS = [
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
] as const
const DATABASE_FIELDS = ['source_key', 'target_key', 'server_uuid', 'database'] as const

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}必须是 JSON 对象`)
  }
  return value as JsonObject
}

function exact(value: unknown, fields: readonly string[], label: string): JsonObject {
  const result = object(value, label)
  if (Object.keys(result).sort().join('\0') !== [...fields].sort().join('\0')) {
    throw new Error(`${label}字段缺失或包含未登记内容`)
  }
  return result
}

function parse(bytes: Uint8Array, label: string): JsonObject {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0 ||
    bytes.byteLength > 16 * 1024 * 1024
  ) {
    throw new Error(`${label}缺失或超过 16 MiB`)
  }
  try {
    return object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), label)
  } catch (error) {
    if (error instanceof Error && error.message.endsWith('必须是 JSON 对象')) throw error
    throw new Error(`${label}不是有效 UTF-8 JSON`, { cause: error })
  }
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value || value !== value.trim()) {
    throw new Error(`${label}必须是非空且无首尾空白的文本`)
  }
  return value
}

function identifier(value: unknown, label: string): string {
  const result = text(value, label)
  if (!isRestoreIdentifier(result)) throw new Error(`${label}无效`)
  return result
}

function scopeIdentifier(value: unknown, label: string): string {
  const result = text(value, label)
  if (!isResourceScopeId(result)) throw new Error(`${label}无效`)
  return result
}

function hex(value: unknown, size: number, label: string): string {
  const result = text(value, label)
  if (!new RegExp(`^[a-f0-9]{${size}}$`, 'u').test(result)) throw new Error(`${label}无效`)
  return result
}

function instant(value: unknown, label: string): { milliseconds: number; value: string } {
  const result = text(value, label)
  const milliseconds = Date.parse(result)
  if (!/(?:Z|[+-][0-9]{2}:[0-9]{2})$/u.test(result) || !Number.isFinite(milliseconds)) {
    throw new Error(`${label}必须是包含时区的有效时间`)
  }
  return { milliseconds, value: result }
}

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

function planHash(plan: JsonObject): string {
  const databases = (plan.databases as unknown[]).map((value) => {
    const database = exact(value, DATABASE_FIELDS, '恢复数据库目标')
    return Object.fromEntries(DATABASE_FIELDS.map((field) => [field, database[field]]))
  })
  const normalized = Object.fromEntries(
    PLAN_FIELDS.map((field) => [field, field === 'databases' ? databases : plan[field]]),
  )
  return sha256(new TextEncoder().encode(JSON.stringify(normalized)))
}

function requiredResources(manifest: JsonObject): number {
  if (!Array.isArray(manifest.databases) || manifest.databases.length === 0) {
    throw new Error('备份清单必须包含数据库')
  }
  if (!Array.isArray(manifest.objects)) throw new Error('备份清单对象范围必须是数组')
  const resources = [
    ...manifest.databases.map(
      (value) => `db:${identifier(object(value, '备份数据库').key, '备份数据库 key')}`,
    ),
    ...manifest.objects.map(
      (value) => `objects:${identifier(object(value, '备份对象范围').bucket, '备份对象 bucket')}`,
    ),
  ]
  if (new Set(resources).size !== resources.length) throw new Error('备份资源重复')
  return resources.length
}

/**
 * 只接受外部恢复运行核验器返回的精确摘要，并从同一 bindings/receipt 派生浏览器断言事实。
 * 当前恢复仍处于 data_verified；最终成功只能在浏览器证明被服务端接收后产生。
 */
export function deriveVerifiedRestoreRuntimeFacts(
  bindingsBytes: Uint8Array,
  runtimeBytes: Uint8Array,
  verifiedRuntimeSha256: string,
): VerifiedRestoreRuntimeFacts {
  const binding = exact(
    parse(bindingsBytes, '恢复绑定收据'),
    ['record', 'manifest'],
    '恢复绑定收据',
  )
  const record = exact(
    binding.record,
    [
      'plan',
      'plan_hash',
      'status',
      'started_at',
      'data_verified_at',
      'completed_at',
      'recovered_at',
      'failure',
    ],
    '恢复记录',
  )
  const plan = exact(record.plan, PLAN_FIELDS, '恢复计划')
  const manifest = exact(
    binding.manifest,
    [
      'id',
      'scope_id',
      'source_sha',
      'quiesced_at',
      'captured_at',
      'completed_at',
      'retention_until',
      'control_schema_fingerprint',
      'tenant_schema_fingerprint',
      'databases',
      'objects',
      'artifacts',
    ],
    '备份清单',
  )
  if (!Array.isArray(plan.databases) || plan.databases.length === 0) {
    throw new Error('恢复计划必须包含数据库目标')
  }
  const restoreId = identifier(plan.id, '恢复 ID')
  const backupId = identifier(plan.backup_id, '备份 ID')
  const targetScopeId = scopeIdentifier(plan.scope_id, '恢复 scope')
  const sourceScopeId = scopeIdentifier(manifest.scope_id, '备份 scope')
  const frontendSha = hex(plan.frontend_sha, 40, '前端 SHA')
  const backendSha = hex(manifest.source_sha, 40, '后端 SHA')
  const planDigest = hex(record.plan_hash, 64, '恢复计划摘要')
  if (
    record.status !== 'data_verified' ||
    record.completed_at !== null ||
    record.failure !== null ||
    backupId !== identifier(manifest.id, '清单备份 ID') ||
    sourceScopeId === targetScopeId ||
    text(plan.object_prefix, '恢复对象前缀') !== `${targetScopeId}/` ||
    planDigest !== planHash(plan)
  ) {
    throw new Error('恢复绑定没有绑定唯一的待业务验收演练')
  }
  const startedAt = instant(record.started_at, '恢复开始时间')
  const dataVerifiedAt = instant(record.data_verified_at, '数据验证时间')
  const recoveredAt = instant(record.recovered_at, '恢复点时间')
  const faultAt = instant(plan.fault_at, '故障时间')
  const capturedAt = instant(manifest.captured_at, '备份采集时间')
  const rpoMilliseconds = faultAt.milliseconds - recoveredAt.milliseconds
  const rpoSeconds = Math.trunc(rpoMilliseconds / 1000)
  if (
    dataVerifiedAt.milliseconds < startedAt.milliseconds ||
    recoveredAt.value !== capturedAt.value ||
    rpoMilliseconds < 0 ||
    rpoSeconds > 86_400
  ) {
    throw new Error('恢复时间顺序或 RPO 与绑定清单不一致')
  }

  const { digest: runtimeDigest } = verifyRestoreRuntimeReceipt({
    bytes: runtimeBytes,
    verifiedDigest: hex(verifiedRuntimeSha256, 64, '已核验运行收据摘要'),
    bindingsBytes,
    expected: {
      restoreId,
      backupId,
      planHash: planDigest,
      scopeId: targetScopeId,
      dataVerifiedAt: dataVerifiedAt.value,
      backendSha,
      frontendSha,
      apiEndpoint: text(plan.api_ready_url, 'API 端点'),
      workerEndpoint: text(plan.worker_ready_url, 'Worker 端点'),
    },
  })

  return Object.freeze({
    backup: Object.freeze({
      capturedAt: capturedAt.value,
      id: backupId,
      requiredResources: requiredResources(manifest),
      sourceScopeId,
    }),
    restore: Object.freeze({
      dataVerifiedAt: dataVerifiedAt.value,
      faultAt: faultAt.value,
      id: restoreId,
      recoveredAt: recoveredAt.value,
      recoveryPointAgeSeconds: rpoSeconds,
      startedAt: startedAt.value,
      targetScopeId,
    }),
    runtimeReceiptSha256: runtimeDigest,
  })
}
