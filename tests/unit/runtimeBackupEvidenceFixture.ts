import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

import { deriveVerifiedRestoreRuntimeFacts } from '../browser-real/runtime-backup-evidence'
import { backendBuildFixture, frontendBuildFixture } from './runtimeBuildReceiptFixture'

export const sha256 = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex')
export const json = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value))

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    )
  }
  return value
}

const canonicalDigest = (value: unknown): string => sha256(json(canonical(value)))

export function runtimeBackupEvidenceFixture() {
  const plan = {
    id: 'restore-one',
    backup_id: 'backup-one',
    scope_id: 'target-scope',
    fault_at: '2026-09-05T02:00:01Z',
    databases: [
      {
        source_key: 'control',
        target_key: 'target-control',
        server_uuid: 'server-two',
        database: 'target_control',
      },
    ],
    object_endpoint: 'http://127.0.0.1:9000',
    object_prefix: 'target-scope/',
    api_ready_url: 'http://127.0.0.1:8080/readyz',
    worker_ready_url: 'http://127.0.0.1:9091/readyz',
    frontend_sha: 'b'.repeat(40),
  }
  const binding = {
    record: {
      plan,
      plan_hash: sha256(json(plan)),
      status: 'data_verified',
      started_at: '2026-09-05T02:01:00Z',
      data_verified_at: '2026-09-05T02:10:00Z',
      completed_at: null,
      recovered_at: '2026-09-05T01:00:00.500Z',
      failure: null,
    },
    manifest: {
      id: 'backup-one',
      scope_id: 'source-scope',
      source_sha: 'a'.repeat(40),
      quiesced_at: '2026-09-05T00:59:00Z',
      captured_at: '2026-09-05T01:00:00.500Z',
      completed_at: '2026-09-05T01:05:00Z',
      retention_until: '2026-09-12T01:00:00Z',
      control_schema_fingerprint: 'c'.repeat(16),
      tenant_schema_fingerprint: 'd'.repeat(64),
      databases: [{ key: 'control' }],
      objects: [{ bucket: 'uploads' }],
      artifacts: [],
    },
  }
  const bindingsBytes = json(binding)
  const paths = {
    backend: resolve('backend'),
    frontend: resolve('frontend'),
    runtime: resolve('runtime'),
    bindings: resolve('bindings.json'),
    backendBuild: resolve('backend-build.json'),
    frontendBuild: resolve('frontend-build.json'),
    launch: resolve('runtime-launch.json'),
  }
  const digests = {
    backend: 'e'.repeat(64),
    frontend: 'f'.repeat(64),
    launch: '9'.repeat(64),
  }
  const targetPlan = {
    format_version: 1,
    kind: 'restore-reference-target-plan',
    target_side: 'candidate',
    reference_plan_sha256: '1'.repeat(64),
    backup_receipt: {},
    comparison_sources: {},
    comparison_arm: 'b1',
    comparison_arm_sha256: '2'.repeat(64),
    arm_input: {},
    fresh_target: {},
    maintenance_execution: {},
    product_execution: {
      roots: {
        source_backend: paths.backend,
        execution_backend: paths.backend,
        frontend: paths.frontend,
      },
      backend_product_sha: 'a'.repeat(40),
      backend_execution_sha: 'a'.repeat(40),
      frontend_sha: 'b'.repeat(40),
      builds: {
        backend: { path: paths.backendBuild, bytes: 1, sha256: digests.backend },
        frontend: { path: paths.frontendBuild, bytes: 1, sha256: digests.frontend },
      },
      adapter: null,
    },
    product_plan_file: {},
    product_plan: plan,
    product_plan_sha256: canonicalDigest(plan),
  }
  const runtime = {
    format_version: 3,
    kind: 'restore-runtime',
    restore: {
      id: plan.id,
      backup_id: plan.backup_id,
      plan_hash: binding.record.plan_hash,
      scope_id: plan.scope_id,
      data_verified_at: binding.record.data_verified_at,
    },
    paths: {
      backend_product_root: paths.backend,
      backend_execution_root: paths.backend,
      frontend_root: paths.frontend,
      runtime_dir: paths.runtime,
      bindings: paths.bindings,
      backend_build: paths.backendBuild,
      frontend_build: paths.frontendBuild,
      launch: paths.launch,
    },
    digests: {
      bindings: sha256(bindingsBytes),
      backend_build: digests.backend,
      frontend_build: digests.frontend,
      launch: digests.launch,
    },
    source: {
      backup_source_sha: 'a'.repeat(40),
      backend_product_sha: 'a'.repeat(40),
      backend_execution_sha: 'a'.repeat(40),
      backend_adapter_contract: null,
      frontend_sha: 'b'.repeat(40),
    },
    endpoints: {
      api: 'http://127.0.0.1:8080/readyz',
      worker: 'http://127.0.0.1:9091/readyz',
      frontend: 'http://127.0.0.1:4174',
    },
    backend: backendBuildFixture('a'.repeat(40)),
    frontend: frontendBuildFixture('b'.repeat(40)),
    processes: {
      api: {
        receipt_path: resolve('runtime/api.json'),
        receipt_sha256: '1'.repeat(64),
        identity: { pid: 101, started: 'api-started', executable: resolve('api.exe') },
      },
      worker: {
        receipt_path: resolve('runtime/worker.json'),
        receipt_sha256: '2'.repeat(64),
        identity: { pid: 102, started: 'worker-started', executable: resolve('worker.exe') },
      },
      frontend: {
        receipt_path: resolve('runtime/frontend.json'),
        receipt_sha256: '3'.repeat(64),
        identity: { pid: 103, started: 'frontend-started', executable: resolve('python.exe') },
      },
    },
  }
  return {
    binding,
    bindingsBytes,
    runtime,
    runtimeBytes: json(runtime),
    targetPlan,
    targetPlanBytes: json(targetPlan),
  }
}

export function synchronize(value: ReturnType<typeof runtimeBackupEvidenceFixture>): void {
  value.binding.record.plan_hash = sha256(json(value.binding.record.plan))
  Object.assign(value.runtime.restore, {
    id: value.binding.record.plan.id,
    backup_id: value.binding.record.plan.backup_id,
    plan_hash: value.binding.record.plan_hash,
    scope_id: value.binding.record.plan.scope_id,
  })
  value.bindingsBytes = json(value.binding)
  value.targetPlan.product_plan = value.binding.record.plan
  value.targetPlan.product_plan_sha256 = canonicalDigest(value.binding.record.plan)
  value.targetPlan.product_execution.frontend_sha = value.binding.record.plan.frontend_sha
  value.targetPlanBytes = json(value.targetPlan)
  value.runtime.digests.bindings = sha256(value.bindingsBytes)
  value.runtimeBytes = json(value.runtime)
}

export function derive(
  value: ReturnType<typeof runtimeBackupEvidenceFixture>,
  digest = sha256(value.runtimeBytes),
) {
  return deriveVerifiedRestoreRuntimeFacts(
    value.bindingsBytes,
    value.targetPlanBytes,
    value.runtimeBytes,
    digest,
    value.runtime.endpoints.frontend,
  )
}
