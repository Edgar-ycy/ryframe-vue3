import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { deriveVerifiedRestoreRuntimeFacts } from '../browser-real/runtime-backup-evidence'

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
const json = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value))

function fixture() {
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
  const runtime = {
    format_version: 2,
    kind: 'restore-runtime',
    restore: {
      id: plan.id,
      backup_id: plan.backup_id,
      plan_hash: binding.record.plan_hash,
      scope_id: plan.scope_id,
      data_verified_at: binding.record.data_verified_at,
    },
    paths: {
      backend_root: resolve('backend'),
      frontend_root: resolve('frontend'),
      runtime_dir: resolve('runtime'),
      bindings: resolve('bindings.json'),
      backend_build: resolve('backend-build.json'),
      frontend_build: resolve('frontend-build.json'),
    },
    digests: {
      bindings: sha256(bindingsBytes),
      backend_build: 'e'.repeat(64),
      frontend_build: 'f'.repeat(64),
    },
    source: { backend_sha: 'a'.repeat(40), frontend_sha: 'b'.repeat(40) },
    endpoints: {
      api: 'http://127.0.0.1:8080/readyz',
      worker: 'http://127.0.0.1:9091/readyz',
      frontend: 'http://127.0.0.1:4174',
    },
    backend: { kind: 'restore-backend-build' },
    frontend: { kind: 'restore-frontend-build' },
    processes: { api: { pid: 1 }, worker: { pid: 2 } },
  }
  const runtimeBytes = json(runtime)
  return { binding, bindingsBytes, runtime, runtimeBytes }
}

describe('运行时备份恢复证据', () => {
  it('从同一份已核验运行收据和绑定中派生恢复事实', () => {
    const value = fixture()
    const facts = deriveVerifiedRestoreRuntimeFacts(
      value.bindingsBytes,
      value.runtimeBytes,
      sha256(value.runtimeBytes),
    )

    expect(facts).toEqual({
      backup: {
        capturedAt: '2026-09-05T01:00:00.500Z',
        id: 'backup-one',
        requiredResources: 2,
        sourceScopeId: 'source-scope',
      },
      restore: {
        dataVerifiedAt: '2026-09-05T02:10:00Z',
        faultAt: '2026-09-05T02:00:01Z',
        id: 'restore-one',
        recoveredAt: '2026-09-05T01:00:00.500Z',
        recoveryPointAgeSeconds: 3600,
        startedAt: '2026-09-05T02:01:00Z',
        targetScopeId: 'target-scope',
      },
      runtimeReceiptSha256: sha256(value.runtimeBytes),
    })
  })

  it('拒绝未由外部核验器确认或跨绑定的运行收据', () => {
    const wrongDigest = fixture()
    expect(() =>
      deriveVerifiedRestoreRuntimeFacts(
        wrongDigest.bindingsBytes,
        wrongDigest.runtimeBytes,
        '0'.repeat(64),
      ),
    ).toThrow(/外部核验器/u)

    const wrongScope = fixture()
    wrongScope.runtime.restore.scope_id = 'another-scope'
    wrongScope.runtimeBytes = json(wrongScope.runtime)
    expect(() =>
      deriveVerifiedRestoreRuntimeFacts(
        wrongScope.bindingsBytes,
        wrongScope.runtimeBytes,
        sha256(wrongScope.runtimeBytes),
      ),
    ).toThrow(/不一致/u)
  })

  it('拒绝伪造完成、时间错序、重复资源及未知字段', () => {
    const mutations: Array<(value: ReturnType<typeof fixture>) => void> = [
      (value) => {
        value.binding.record.status = 'succeeded'
      },
      (value) => {
        value.binding.record.data_verified_at = '2026-09-05T01:59:00Z'
      },
      (value) => {
        value.binding.manifest.objects.push({ bucket: 'uploads' })
      },
      (value) => {
        Object.assign(value.binding.record, { unknown: true })
      },
      (value) => {
        Object.assign(value.runtime, { unknown: true })
      },
    ]

    for (const mutate of mutations) {
      const value = fixture()
      mutate(value)
      value.bindingsBytes = json(value.binding)
      value.runtime.digests.bindings = sha256(value.bindingsBytes)
      value.runtimeBytes = json(value.runtime)
      expect(() =>
        deriveVerifiedRestoreRuntimeFacts(
          value.bindingsBytes,
          value.runtimeBytes,
          sha256(value.runtimeBytes),
        ),
      ).toThrow()
    }
  })
})
