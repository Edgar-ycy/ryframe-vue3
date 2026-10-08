import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { sha256 } from '../build-source-inventory.mjs'
import { requiredScenarios } from '../restore-proof.mjs'
import RestoreReporter from '../restore-reporter.mjs'
import { restoreRuntimeFixture } from './build-receipt-fixture.mjs'
import { restoreLineageFixture } from './restore-lineage-fixture.mjs'

function fixture(t, verify, expectedDigest, checkout = (root) => root, authorityFactory) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  mkdirSync(path.resolve('.local-tests/playwright-real'), { recursive: true })
  const directory = mkdtempSync(path.join(local, 'restore-reporter-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const id = `proof-${randomUUID()}`
  const value = restoreRuntimeFixture({
    directory,
    id,
    backupId: 'backup',
    scopeId: 'restore-unit',
    backupSourceSha: 'c'.repeat(40),
    dataVerifiedAt: new Date(Date.now() - 1000).toISOString(),
  })
  for (const root of [
    value.paths.backendProductRoot,
    value.paths.backendExecutionRoot,
    value.paths.frontendRoot,
  ])
    mkdirSync(root, { recursive: true })
  const runtime = path.join(directory, 'runtime.json')
  const targetPlan = path.join(directory, 'target-plan.json')
  const lineage = restoreLineageFixture(directory, value.targetPlan)
  writeFileSync(value.paths.bindings, value.bindingsBytes)
  writeFileSync(runtime, value.runtimeBytes)
  writeFileSync(targetPlan, lineage.bytes)
  const environment = {
    RYFRAME_RESTORE_BINDINGS: value.paths.bindings,
    RYFRAME_RESTORE_RUNTIME_RECEIPT: runtime,
    RYFRAME_RESTORE_TARGET_PLAN: targetPlan,
    RYFRAME_RESTORE_BACKEND_DIR: directory,
    RYFRAME_RESTORE_VERIFIER_SHA: 'e'.repeat(40),
    RYFRAME_RESTORE_RUNNER_SHA: 'f'.repeat(40),
    RYFRAME_PYTHON: path.join(directory, 'python.exe'),
    RYFRAME_E2E_SCOPE_ID: 'restore-unit',
  }
  for (const [key, configured] of Object.entries(environment)) {
    const previous = process.env[key]
    process.env[key] = configured
    t.after(() => {
      if (previous === undefined) delete process.env[key]
      else process.env[key] = previous
    })
  }
  const output = path.resolve(`.local-tests/playwright-real/restore-${id}.json`)
  for (const suffix of ['', '-runtime', '-tests'])
    t.after(() =>
      rmSync(path.resolve(`.local-tests/playwright-real/restore-${id}${suffix}.json`), {
        force: true,
      }),
    )
  const digest = sha256(readFileSync(runtime))
  const authority = {
    format_version: 1,
    kind: 'restore-dataset-authority',
    runtime: { path: runtime, bytes: value.runtimeBytes.byteLength, sha256: digest },
    target_plan: {
      path: targetPlan,
      bytes: lineage.bytes.byteLength,
      sha256: sha256(lineage.bytes),
    },
    source_generation: lineage.sourceGeneration,
    dataset_lineage: lineage.datasetLineage,
    target: {
      scope_id: value.bindings.record.plan.scope_id,
      api_url: new URL(value.runtime.endpoints.api).origin,
      frontend_url: value.runtime.endpoints.frontend,
    },
    execution_backend: value.paths.backendExecutionRoot,
  }
  const datasetAuthority =
    authorityFactory?.(authority, lineage) ??
    (() => {
      for (const item of [authority.source_generation, authority.dataset_lineage]) {
        const bytes = readFileSync(item.path)
        if (bytes.byteLength !== item.bytes || sha256(bytes) !== item.sha256)
          throw new Error('dataset authority changed')
      }
      return { authority, lineage: lineage.lineage }
    })
  const reporter = new RestoreReporter({
    checkout,
    verify: () => verify(digest),
    datasetAuthority,
    expectedRestore: {
      binding: {
        path: value.paths.bindings,
        sha256: expectedDigest ?? sha256(value.bindingsBytes),
      },
      target: { path: targetPlan, sha256: sha256(lineage.bytes) },
      runtime: { path: runtime, sha256: digest },
      sourceGeneration: lineage.sourceGeneration,
      datasetLineage: lineage.datasetLineage,
      verifierRoot: directory,
      verifierSha: 'e'.repeat(40),
      runnerRoot: process.cwd(),
      runnerSha: 'f'.repeat(40),
      python: environment.RYFRAME_PYTHON,
      datasetAuthority: authority,
    },
  })
  reporter.onBegin({ projects: [{ use: { baseURL: value.runtime.endpoints.frontend } }] })
  reporter.onTestEnd(
    {
      titlePath: () => ['fixture'],
      annotations: requiredScenarios.map((description) => ({
        type: 'restore-scenario',
        description,
      })),
    },
    { status: 'passed', retry: 0 },
  )
  return {
    reporter,
    runtime,
    bindings: value.paths.bindings,
    targetPlan,
    output,
    digest,
    lineage,
    authority,
  }
}

test('全部测试完成后重新核验来源，并保存与证明摘要对应的运行收据', (t) => {
  let calls = 0
  const item = fixture(t, (digest) => {
    calls++
    return digest
  })
  assert.equal(calls, 1)
  assert.equal(item.reporter.onEnd({ status: 'passed' }), undefined)
  assert.equal(calls, 2)
  const proof = JSON.parse(readFileSync(item.output))
  const tests = JSON.parse(readFileSync(item.output.replace('.json', '-tests.json')))
  assert.equal(proof.runtime_receipt_sha256, item.digest)
  assert.equal(proof.runner_sha, 'f'.repeat(40))
  assert.equal(proof.verifier_sha, 'e'.repeat(40))
  assert.equal(
    proof.tests_receipt_sha256,
    sha256(readFileSync(item.output.replace('.json', '-tests.json'))),
  )
  assert.equal(sha256(readFileSync(item.output.replace('.json', '-runtime.json'))), item.digest)
  assert.deepEqual(tests.runs, [
    { title: ['fixture'], status: 'passed', retry: 0, scenarios: requiredScenarios },
  ])
  assert.equal(tests.kind, 'restore-browser-tests')
  assert.equal(tests.sources.runner.sha, proof.runner_sha)
  assert.equal(tests.sources.verifier.sha, proof.verifier_sha)
  assert.equal(tests.runtime.sha256, proof.runtime_receipt_sha256)
  assert.equal(tests.target_plan.sha256, proof.target_plan_sha256)
  assert.deepEqual(tests.source_generation, item.lineage.sourceGeneration)
  assert.deepEqual(tests.dataset_lineage, item.lineage.datasetLineage)
  assert.equal(proof.source_generation_sha256, item.lineage.sourceGeneration.sha256)
  assert.equal(proof.dataset_lineage_sha256, item.lineage.datasetLineage.sha256)
  assert.equal(tests.runtime.path, item.output.replace('.json', '-runtime.json'))
  assert.equal(path.dirname(tests.runtime.path), path.dirname(item.output))
})

test('reporter 开始与结束都重验配置阶段冻结的同一数据权威', (t) => {
  const observed = []
  const item = fixture(
    t,
    (digest) => digest,
    undefined,
    (root) => root,
    (authority, lineage) => (_input, options) => {
      observed.push(options.expected)
      return { authority, lineage: lineage.lineage }
    },
  )
  assert.equal(observed.length, 1)
  assert.deepEqual(observed[0], item.authority)
  assert.equal(item.reporter.onEnd({ status: 'passed' }), undefined)
  assert.equal(observed.length, 2)
  assert.deepEqual(observed[1], item.authority)
})

test('reporter 结束时权威变化会拒绝证明', (t) => {
  let calls = 0
  const item = fixture(
    t,
    (digest) => digest,
    undefined,
    (root) => root,
    (authority, lineage) => () => {
      calls++
      if (calls === 1) return { authority, lineage: lineage.lineage }
      return {
        authority: {
          ...authority,
          source_generation: { ...authority.source_generation, sha256: '0'.repeat(64) },
        },
        lineage: lineage.lineage,
      }
    },
  )
  t.mock.method(console, 'error', () => {})
  assert.deepEqual(item.reporter.onEnd({ status: 'passed' }), { status: 'failed' })
  assert.equal(existsSync(item.output), false)
})

test('测试结束时进程或源码核验失败不会写成功证明', (t) => {
  let calls = 0
  const item = fixture(t, (digest) => {
    if (++calls > 1) throw new Error('process changed')
    return digest
  })
  t.mock.method(console, 'error', () => {})
  assert.deepEqual(item.reporter.onEnd({ status: 'passed' }), { status: 'failed' })
  assert.equal(existsSync(item.output), false)
})

test('测试结束时 runner 或 verifier 源码变化会拒绝证明', (t) => {
  t.mock.method(console, 'error', () => {})
  for (const changedLabel of ['恢复测试 runner 源码', '恢复证明协调后端']) {
    let checks = 0
    const item = fixture(
      t,
      (digest) => digest,
      undefined,
      (root, _sha, label) => {
        if (label === changedLabel && ++checks === 2) throw new Error(`${label} changed`)
        return root
      },
    )
    assert.deepEqual(item.reporter.onEnd({ status: 'passed' }), { status: 'failed' })
    assert.equal(existsSync(item.output), false)
  }
})

test('测试中替换任一恢复输入会拒绝成功证明', (t) => {
  t.mock.method(console, 'error', () => {})
  for (const selected of [
    (item) => item.runtime,
    (item) => item.bindings,
    (item) => item.targetPlan,
    (item) => item.lineage.sourceGeneration.path,
    (item) => item.lineage.datasetLineage.path,
  ]) {
    const item = fixture(t, (digest) => digest)
    writeFileSync(selected(item), '{}')
    assert.deepEqual(item.reporter.onEnd({ status: 'passed' }), { status: 'failed' })
    assert.equal(existsSync(item.output), false)
  }
})

test('任一证明输出已存在时不会留下其他部分收据', (t) => {
  const item = fixture(t, (digest) => digest)
  const testsOutput = item.output.replace('.json', '-tests.json')
  writeFileSync(testsOutput, 'existing')
  t.mock.method(console, 'error', () => {})
  assert.deepEqual(item.reporter.onEnd({ status: 'passed' }), { status: 'failed' })
  assert.equal(existsSync(item.output), false)
  assert.equal(existsSync(item.output.replace('.json', '-runtime.json')), false)
  assert.equal(readFileSync(testsOutput, 'utf8'), 'existing')
})

test('恢复输入必须使用绝对普通文件且 scope 必须精确匹配', (t) => {
  const item = fixture(t, (digest) => digest)
  process.env.RYFRAME_RESTORE_BINDINGS = 'bindings.json'
  assert.throws(
    () => item.reporter.onBegin({ projects: [{ use: { baseURL: 'http://127.0.0.1:4174' } }] }),
    /绝对路径/u,
  )
  process.env.RYFRAME_RESTORE_BINDINGS = item.bindings
  process.env.RYFRAME_E2E_SCOPE_ID = 'other'
  assert.throws(
    () => item.reporter.onBegin({ projects: [{ use: { baseURL: 'http://127.0.0.1:4174' } }] }),
    /scope/u,
  )
})

test('reporter 拒绝与配置预检不一致的恢复绑定', (t) => {
  assert.throws(() => fixture(t, (digest) => digest, '0'.repeat(64)), /预检结果/u)
})
