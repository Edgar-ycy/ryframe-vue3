import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { buildRestoreProof, requiredScenarios, restoreProofBindings } from '../restore-proof.mjs'
import { sha256 } from '../restore-build.mjs'

function fixture() {
  const plan = {
    id: 'drill-v2',
    backup_id: 'set-v2',
    scope_id: 'isolated-v2',
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
    object_prefix: 'isolated-v2/',
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
    manifest: { id: 'set-v2', scope_id: 'source-v2', source_sha: 'c'.repeat(40) },
  }
  const bindingsBytes = Buffer.from(JSON.stringify(bindings))
  const source = (head) => ({
    head,
    patch_sha256: 'd'.repeat(64),
    files: [],
    clean: true,
  })
  const artifact = (role, digest) => ({
    executable: path.resolve(`${role}.exe`),
    command: ['cargo', 'build'],
    bytes: 1,
    sha256: digest,
  })
  const runtime = {
    format_version: 2,
    kind: 'restore-runtime',
    restore: {
      id: plan.id,
      backup_id: plan.backup_id,
      plan_hash: bindings.record.plan_hash,
      scope_id: plan.scope_id,
      data_verified_at: bindings.record.data_verified_at,
    },
    paths: {
      backend_root: path.resolve('backend'),
      frontend_root: path.resolve('frontend'),
      runtime_dir: path.resolve('runtime'),
      bindings: path.resolve('bindings.json'),
      backend_build: path.resolve('backend-build.json'),
      frontend_build: path.resolve('frontend-build.json'),
    },
    digests: {
      bindings: sha256(bindingsBytes),
      backend_build: 'e'.repeat(64),
      frontend_build: 'f'.repeat(64),
    },
    source: { backend_sha: bindings.manifest.source_sha, frontend_sha: plan.frontend_sha },
    endpoints: {
      api: plan.api_ready_url,
      worker: plan.worker_ready_url,
      frontend: 'http://127.0.0.1:4174',
    },
    backend: {
      format_version: 1,
      kind: 'restore-backend-build',
      source: source(bindings.manifest.source_sha),
      source_inventory: {},
      artifacts: {
        api: artifact('api', '3'.repeat(64)),
        worker: artifact('worker', '4'.repeat(64)),
      },
    },
    frontend: {
      format_version: 1,
      kind: 'restore-frontend-build',
      source: source(plan.frontend_sha),
      files: [{ path: 'index.html', bytes: 1, sha256: '5'.repeat(64) }],
    },
    processes: {
      api: {
        receipt_path: path.resolve('runtime/api.json'),
        receipt_sha256: '1'.repeat(64),
        identity: { pid: 101, started: 'api-started', executable: path.resolve('api.exe') },
      },
      worker: {
        receipt_path: path.resolve('runtime/worker.json'),
        receipt_sha256: '2'.repeat(64),
        identity: { pid: 102, started: 'worker-started', executable: path.resolve('worker.exe') },
      },
    },
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

test('恢复 ID 与资源 scope 使用正式生产边界', () => {
  const bytesAfter = (value, field, fieldValue) => {
    value.bindings.record.plan[field] = fieldValue
    if (field === 'backup_id') value.bindings.manifest.id = fieldValue
    if (field === 'scope_id') value.bindings.record.plan.object_prefix = `${fieldValue}/`
    value.bindings.record.plan_hash = sha256(
      Buffer.from(JSON.stringify(value.bindings.record.plan)),
    )
    return Buffer.from(JSON.stringify(value.bindings))
  }

  for (const [field, value] of [
    ['id', 'r'.repeat(64)],
    ['backup_id', 'b'.repeat(64)],
    ['scope_id', 'a1'],
    ['scope_id', `a${'_'.repeat(46)}z`],
  ]) {
    assert.doesNotThrow(() => restoreProofBindings(bytesAfter(fixture(), field, value)))
  }
  for (const [field, value] of [
    ['id', 'Restore'],
    ['id', 'restore.v2'],
    ['id', '_restore'],
    ['id', 'r'.repeat(65)],
    ['backup_id', 'Backup'],
    ['backup_id', 'backup.v2'],
    ['backup_id', 'b'.repeat(65)],
    ['scope_id', 'a'],
    ['scope_id', `a${'_'.repeat(47)}z`],
    ['scope_id', 'Scope'],
    ['scope_id', 'scope.dot'],
    ['scope_id', '-scope'],
    ['scope_id', 'scope-'],
  ]) {
    assert.throws(() => restoreProofBindings(bytesAfter(fixture(), field, value)))
  }

  for (const scope of ['a1', `a${'_'.repeat(46)}z`]) {
    const value = fixture()
    value.bindings.manifest.scope_id = scope
    assert.doesNotThrow(() => restoreProofBindings(Buffer.from(JSON.stringify(value.bindings))))
  }
  for (const scope of [
    undefined,
    'a',
    `a${'_'.repeat(47)}z`,
    'Source',
    'source.v2',
    '-source',
    'source-',
    'isolated-v2',
  ]) {
    const value = fixture()
    if (scope === undefined) delete value.bindings.manifest.scope_id
    else value.bindings.manifest.scope_id = scope
    assert.throws(() => restoreProofBindings(Buffer.from(JSON.stringify(value.bindings))))
  }
})

test('仅格式正确的摘要、替换的运行收据或绑定收据不能生成证明', () => {
  const wrongDigest = fixture()
  wrongDigest.verifiedRuntimeDigest = 'd'.repeat(64)
  assert.throws(() => buildRestoreProof(wrongDigest), /实际摘要/u)

  const changedRuntime = fixture()
  changedRuntime.runtime.restore.scope_id = 'other'
  changedRuntime.runtimeBytes = Buffer.from(JSON.stringify(changedRuntime.runtime))
  changedRuntime.verifiedRuntimeDigest = sha256(changedRuntime.runtimeBytes)
  assert.throws(() => buildRestoreProof(changedRuntime), /运行产物收据/u)

  const changedBindings = fixture()
  changedBindings.bindings.record.plan.scope_id = 'other'
  changedBindings.bindingsBytes = Buffer.from(JSON.stringify(changedBindings.bindings))
  assert.throws(() => buildRestoreProof(changedBindings), /恢复业务验收/u)
})

test('v2 运行收据必须绑定摘要、绝对路径、精确源码与完整进程集合', () => {
  for (const change of [
    (value) => {
      value.runtime.digests.bindings = 'a'.repeat(64)
    },
    (value) => {
      value.runtime.paths.bindings = 'bindings.json'
    },
    (value) => {
      value.runtime.source.backend_sha = 'e'.repeat(40)
    },
    (value) => {
      value.runtime.source.frontend_sha = 'e'.repeat(40)
    },
    (value) => {
      value.runtime.backend.source.clean = false
    },
    (value) => {
      value.runtime.processes.api.receipt_path = 'api.json'
    },
    (value) => {
      value.runtime.processes.worker.receipt_sha256 = 'invalid'
    },
    (value) => {
      value.runtime.backend.artifacts.api.bytes = '1'
    },
    (value) => {
      value.runtime.frontend.files[0].path = '../index.html'
    },
    (value) => {
      value.runtime.endpoints.frontend = 'http://localhost:4174'
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

test('v1、字段缺失、未知字段与字段类型错误不能生成 v2 恢复证明', () => {
  for (const change of [
    (value) => {
      value.runtime.format_version = 1
    },
    (value) => {
      delete value.runtime.restore.data_verified_at
    },
    (value) => {
      value.runtime.paths.runtime_dir = 7
    },
    (value) => {
      value.runtime.processes.api.identity.pid = '101'
    },
    (value) => {
      value.runtime.backend = []
    },
    (value) => {
      value.runtime.restore.unknown = true
    },
    (value) => {
      value.runtime.unknown = true
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
