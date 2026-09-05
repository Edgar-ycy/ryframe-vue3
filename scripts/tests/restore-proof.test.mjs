import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRestoreProof, requiredScenarios } from '../restore-proof.mjs'
import { sha256 } from '../restore-build.mjs'

function fixture() {
  const plan = {
    id: 'drill',
    backup_id: 'set',
    scope_id: 'isolated',
    fault_at: '2026-01-01T00:00:00Z',
    databases: [
      {
        source_key: 'control',
        target_key: 'control',
        server_uuid: 'server-one',
        database: 'restore_control',
      },
    ],
    object_endpoint: 'http://127.0.0.1:9000',
    object_prefix: 'isolated/',
    api_ready_url: 'http://127.0.0.1:8080/readyz',
    worker_ready_url: 'http://127.0.0.1:9091/readyz',
    frontend_sha: 'b'.repeat(40),
  }
  const bindings = {
    record: {
      status: 'data_verified',
      plan_hash: sha256(Buffer.from(JSON.stringify(plan))),
      data_verified_at: new Date(1000).toISOString(),
      plan,
    },
    manifest: { id: 'set', source_sha: 'c'.repeat(40) },
  }
  const bindingsBytes = Buffer.from(JSON.stringify(bindings))
  const runtime = {
    format_version: 1,
    kind: 'restore-runtime',
    restore_id: plan.id,
    plan_hash: bindings.record.plan_hash,
    scope_id: plan.scope_id,
    bindings_sha256: sha256(bindingsBytes),
    backend: {
      kind: 'restore-backend-build',
      source: { head: bindings.manifest.source_sha, clean: true },
    },
    frontend: {
      kind: 'restore-frontend-build',
      source: { head: plan.frontend_sha, clean: true },
    },
    processes: { api: {}, worker: {} },
  }
  const runtimeBytes = Buffer.from(JSON.stringify(runtime))
  return {
    bindings,
    bindingsBytes,
    runtime,
    runtimeBytes,
    verifiedRuntimeDigest: sha256(runtimeBytes),
    started: 2000,
    completed: 3000,
    runs: [{ status: 'passed', retry: 0, scenarios: requiredScenarios }],
    status: 'passed',
  }
}

test('证明绑定完整真实测试结果、数据验证时刻、运行收据与精确源码', () => {
  const value = fixture()
  const result = buildRestoreProof(value)
  assert.equal(result.plan_hash, value.bindings.record.plan_hash)
  assert.equal(result.scenarios.length, 9)
  assert.equal(result.completed_at, new Date(3000).toISOString())
  assert.equal(result.runtime_receipt_sha256, value.verifiedRuntimeDigest)
})

test('仅格式正确的摘要、替换的运行收据或绑定收据不能生成证明', () => {
  const wrongDigest = fixture()
  wrongDigest.verifiedRuntimeDigest = 'd'.repeat(64)
  assert.throws(() => buildRestoreProof(wrongDigest), /实际摘要/u)

  const changedRuntime = fixture()
  changedRuntime.runtime.scope_id = 'other'
  changedRuntime.runtimeBytes = Buffer.from(JSON.stringify(changedRuntime.runtime))
  changedRuntime.verifiedRuntimeDigest = sha256(changedRuntime.runtimeBytes)
  assert.throws(() => buildRestoreProof(changedRuntime), /运行产物收据/u)

  const changedBindings = fixture()
  changedBindings.bindings.record.plan.scope_id = 'other'
  changedBindings.bindingsBytes = Buffer.from(JSON.stringify(changedBindings.bindings))
  assert.throws(() => buildRestoreProof(changedBindings), /恢复业务验收/u)
})

test('运行收据必须绑定两端干净源码、绑定摘要与完整进程集合', () => {
  for (const change of [
    (value) => {
      value.runtime.bindings_sha256 = 'a'.repeat(64)
    },
    (value) => {
      value.runtime.backend.source.clean = false
    },
    (value) => {
      value.runtime.frontend.source.head = 'e'.repeat(40)
    },
    (value) => {
      delete value.runtime.processes.worker
    },
  ]) {
    const value = fixture()
    change(value)
    value.runtimeBytes = Buffer.from(JSON.stringify(value.runtime))
    value.verifiedRuntimeDigest = sha256(value.runtimeBytes)
    assert.throws(() => buildRestoreProof(value), /运行产物收据/u)
  }
})

test('失败、跳过、重跑和缺失场景不能生成成功恢复证明', () => {
  for (const changed of [
    [{ status: 'failed', retry: 0, scenarios: requiredScenarios }],
    [{ status: 'skipped', retry: 0, scenarios: requiredScenarios }],
    [{ status: 'passed', retry: 1, scenarios: requiredScenarios }],
    [{ status: 'passed', retry: 0, scenarios: ['login'] }],
    [
      {
        status: 'passed',
        retry: 0,
        scenarios: requiredScenarios.filter((name) => name !== 'restored-data'),
      },
    ],
    [{ status: 'passed', retry: 0, scenarios: [...requiredScenarios, 'login'] }],
    [{ status: 'passed', retry: 0, scenarios: [...requiredScenarios, 'unknown'] }],
    [],
  ]) {
    const value = fixture()
    value.runs = changed
    assert.throws(() => buildRestoreProof(value))
  }
  const value = fixture()
  value.status = 'timedout'
  assert.throws(() => buildRestoreProof(value))
})

test('旧备份、不匹配计划与非单调时间被拒绝', () => {
  for (const change of [
    (value) => {
      value.started = 0
    },
    (value) => {
      value.completed = 1000
    },
    (value) => {
      value.bindings.manifest.id = 'old'
      value.bindingsBytes = Buffer.from(JSON.stringify(value.bindings))
    },
    (value) => {
      value.bindings.record.status = 'running'
      value.bindingsBytes = Buffer.from(JSON.stringify(value.bindings))
    },
    (value) => {
      value.bindings.record.plan_hash = 'a'.repeat(64)
      value.bindingsBytes = Buffer.from(JSON.stringify(value.bindings))
    },
    (value) => {
      value.bindings.record.data_verified_at = '2026-01-01T00:00:00'
      value.bindingsBytes = Buffer.from(JSON.stringify(value.bindings))
    },
    (value) => {
      value.bindings.record.plan.databases.push({
        ...value.bindings.record.plan.databases[0],
        source_key: 'another',
      })
      value.bindings.record.plan_hash = sha256(
        Buffer.from(JSON.stringify(value.bindings.record.plan)),
      )
      value.bindingsBytes = Buffer.from(JSON.stringify(value.bindings))
    },
  ]) {
    const value = fixture()
    change(value)
    assert.throws(() => buildRestoreProof(value))
  }
})
