import { isAbsolute } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { canonicalDigest, exactObject, hex as validHex } from './build-source-inventory.mjs'

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

export function endpointPort(value, expectedPath) {
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
