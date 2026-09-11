import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { buildRestoreEvidence, requiredScenarios, restoreProofBindings } from '../restore-proof.mjs'
import { sha256 } from '../build-source-inventory.mjs'
import { restoreRuntimeFixture } from './build-receipt-fixture.mjs'

function fixture(options = {}) {
  const value = restoreRuntimeFixture({
    id: 'drill-v3',
    backupId: 'set-v3',
    scopeId: 'isolated-v3',
    backupSourceSha: 'c'.repeat(40),
    dataVerifiedAt: new Date(1000).toISOString(),
    ...options,
  })
  return {
    ...value,
    frontendEndpoint: value.runtime.endpoints.frontend,
    verifiedRuntimeDigest: sha256(value.runtimeBytes),
    runtimeEvidencePath: path.resolve(value.paths.runtimeDir, 'published-runtime.json'),
    targetPlanPath: path.resolve(value.paths.runtimeDir, 'target-plan.json'),
    sourceGeneration: {
      path: path.resolve(value.paths.runtimeDir, 'source-stop.json'),
      bytes: 11,
      sha256: '7'.repeat(64),
    },
    datasetLineage: {
      path: path.resolve(value.paths.runtimeDir, 'dataset-lineage.json'),
      bytes: 13,
      sha256: '8'.repeat(64),
    },
    runnerRoot: path.resolve(value.paths.runtimeDir, 'runner'),
    runnerSha: 'f'.repeat(40),
    verifierRoot: path.resolve(value.paths.runtimeDir, 'verifier'),
    verifierSha: 'e'.repeat(40),
    started: 2000,
    completed: 3000,
    runs: [{ title: ['正式恢复'], status: 'passed', retry: 0, scenarios: requiredScenarios }],
    status: 'passed',
  }
}

function buildRestoreProof(value) {
  return buildRestoreEvidence(value).proof
}

test('证明绑定完整真实测试结果、数据验证时刻、运行收据与精确源码', () => {
  const value = fixture()
  const result = buildRestoreProof(value)
  assert.equal(result.plan_hash, value.bindings.record.plan_hash)
  assert.equal(result.scenarios.length, 9)
  assert.equal(result.completed_at, new Date(3000).toISOString())
  assert.equal(result.runtime_receipt_sha256, value.verifiedRuntimeDigest)
  assert.equal(result.backup_source_sha, value.runtime.source.backup_source_sha)
  assert.equal(result.backend_product_sha, value.runtime.source.backend_product_sha)
  assert.equal(result.backend_execution_sha, value.runtime.source.backend_execution_sha)
  assert.equal(result.runner_sha, value.runnerSha)
  assert.equal(result.verifier_sha, value.verifierSha)
  assert.match(result.tests_receipt_sha256, /^[a-f0-9]{64}$/u)
  assert.equal(result.target_plan_sha256, sha256(value.targetPlanBytes))
  assert.equal(result.source_generation_sha256, value.sourceGeneration.sha256)
  assert.equal(result.dataset_lineage_sha256, value.datasetLineage.sha256)
})

test('B0 业务证明区分备份、产品、执行与适配来源', () => {
  const value = fixture({
    backupSourceSha: 'a'.repeat(40),
    backendProductSha: 'b'.repeat(40),
    backendExecutionSha: 'c'.repeat(40),
    frontendSha: 'd'.repeat(40),
  })
  const proof = buildRestoreProof(value)
  assert.equal(proof.backup_source_sha, 'a'.repeat(40))
  assert.equal(proof.backend_product_sha, 'b'.repeat(40))
  assert.equal(proof.backend_execution_sha, 'c'.repeat(40))
  assert.equal(proof.backend_adapter_contract, 'legacy-stable-readiness-b0-v1')
})

test('runner 与 verifier 必须使用精确源码路径和 SHA', () => {
  for (const change of [
    (value) => {
      value.runnerSha = 'a'.repeat(39)
    },
    (value) => {
      value.verifierSha = 'A'.repeat(40)
    },
    (value) => {
      value.runnerRoot = 'runner'
    },
  ]) {
    const value = fixture()
    change(value)
    assert.throws(() => buildRestoreProof(value), /runner|verifier/u)
  }
})

test('来源 STOP 与 C52 血缘必须使用不同的完整文件描述', () => {
  for (const change of [
    (value) => {
      value.sourceGeneration.bytes = 0
    },
    (value) => {
      value.datasetLineage.sha256 = 'A'.repeat(64)
    },
    (value) => {
      value.datasetLineage.path = value.sourceGeneration.path
    },
    (value) => {
      value.sourceGeneration.unknown = true
    },
  ]) {
    const value = fixture()
    change(value)
    assert.throws(() => buildRestoreProof(value), /STOP|血缘/u)
  }
})

test('测试 sidecar 绑定运行副本、目标计划、五类来源和执行源码', () => {
  const value = fixture({
    backupSourceSha: 'a'.repeat(40),
    backendProductSha: 'b'.repeat(40),
    backendExecutionSha: 'c'.repeat(40),
    frontendSha: 'd'.repeat(40),
  })
  const evidence = buildRestoreEvidence(value)
  assert.deepEqual(
    Object.keys(evidence.proof).sort(),
    [
      'axe_serious_or_critical',
      'backend_adapter_contract',
      'backend_execution_sha',
      'backend_product_sha',
      'backup_source_sha',
      'completed_at',
      'dataset_lineage_sha256',
      'frontend_sha',
      'frontend_url',
      'plan_hash',
      'restore_id',
      'runner_sha',
      'scenarios',
      'scope_id',
      'source_generation_sha256',
      'started_at',
      'target_plan_sha256',
      'tests_receipt_sha256',
      'unexpected_console_messages',
      'unexpected_network_failures',
      'verifier_sha',
      'runtime_receipt_sha256',
    ].sort(),
  )
  assert.deepEqual(evidence.testsReceipt, {
    format_version: 1,
    kind: 'restore-browser-tests',
    restore: {
      id: value.bindings.record.plan.id,
      plan_hash: value.bindings.record.plan_hash,
      scope_id: value.bindings.record.plan.scope_id,
    },
    runtime: {
      path: value.runtimeEvidencePath,
      bytes: value.runtimeBytes.byteLength,
      sha256: value.verifiedRuntimeDigest,
    },
    target_plan: {
      path: value.targetPlanPath,
      bytes: value.targetPlanBytes.byteLength,
      sha256: sha256(value.targetPlanBytes),
    },
    source_generation: value.sourceGeneration,
    dataset_lineage: value.datasetLineage,
    sources: {
      ...value.runtime.source,
      runner: { root: value.runnerRoot, sha: value.runnerSha },
      verifier: { root: value.verifierRoot, sha: value.verifierSha },
    },
    frontend_url: value.frontendEndpoint,
    started_at: new Date(value.started).toISOString(),
    completed_at: new Date(value.completed).toISOString(),
    runs: value.runs,
  })
  assert.equal(evidence.proof.tests_receipt_sha256, sha256(evidence.testsBytes))
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
    'isolated-v3',
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

test('v3 运行收据必须绑定摘要、绝对路径、精确源码与完整进程集合', () => {
  for (const change of [
    (value) => {
      value.runtime.digests.bindings = 'a'.repeat(64)
    },
    (value) => {
      value.runtime.paths.bindings = 'bindings.json'
    },
    (value) => {
      value.runtime.source.backup_source_sha = 'e'.repeat(40)
    },
    (value) => {
      value.runtime.source.backend_product_sha = 'e'.repeat(40)
    },
    (value) => {
      value.runtime.source.backend_execution_sha = 'e'.repeat(40)
    },
    (value) => {
      value.runtime.source.frontend_sha = 'e'.repeat(40)
    },
    (value) => {
      value.runtime.backend.sources.full.source.snapshot.clean = false
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
      delete value.runtime.processes.frontend
    },
  ]) {
    const value = fixture()
    change(value)
    value.runtimeBytes = Buffer.from(JSON.stringify(value.runtime))
    value.verifiedRuntimeDigest = sha256(value.runtimeBytes)
    assert.throws(() => buildRestoreProof(value), /运行产物收据/u)
  }
})

test('旧版本、字段缺失、未知字段与字段类型错误不能生成恢复证明', () => {
  for (const change of [
    (value) => {
      value.runtime.format_version = 2
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
    [{ title: ['失败'], status: 'failed', retry: 0, scenarios: requiredScenarios }],
    [{ title: ['跳过'], status: 'skipped', retry: 0, scenarios: requiredScenarios }],
    [{ title: ['重跑'], status: 'passed', retry: 1, scenarios: requiredScenarios }],
    [{ title: ['缺失'], status: 'passed', retry: 0, scenarios: ['login'] }],
    [
      {
        title: ['缺失恢复数据'],
        status: 'passed',
        retry: 0,
        scenarios: requiredScenarios.filter((name) => name !== 'restored-data'),
      },
    ],
    [
      {
        title: ['重复'],
        status: 'passed',
        retry: 0,
        scenarios: [...requiredScenarios, 'login'],
      },
    ],
    [
      {
        title: ['未知'],
        status: 'passed',
        retry: 0,
        scenarios: [...requiredScenarios, 'unknown'],
      },
    ],
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

test('测试 sidecar 的每个 run 必须使用后端接受的严格字段', () => {
  for (const change of [
    (run) => {
      delete run.title
    },
    (run) => {
      run.title = []
    },
    (run) => {
      run.title = [' ']
    },
    (run) => {
      run.scenarios = [null, ...requiredScenarios.slice(1)]
    },
    (run) => {
      run.unknown = true
    },
  ]) {
    const value = fixture()
    change(value.runs[0])
    assert.throws(() => buildRestoreProof(value))
  }
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
