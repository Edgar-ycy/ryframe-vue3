import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { sha256 } from '../build-source-inventory.mjs'
import { requiredScenarios } from '../restore-proof.mjs'
import { realTestSelection, restoreSpecs } from '../restore-scenarios.mjs'
import { restoreRuntimeFixture } from './build-receipt-fixture.mjs'
import { restoreLineageFixture } from './restore-lineage-fixture.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const b0FrontendSha = '0087ea2ecf62530d042b9e52f5c950fb34c66d78'

function restoreFixture(t, options = {}) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  const directory = mkdtempSync(path.join(local, 'restore-selection-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const value = restoreRuntimeFixture({ directory, ...options })
  const coordinator = path.join(directory, 'coordinator')
  for (const item of [
    coordinator,
    value.paths.backendProductRoot,
    value.paths.backendExecutionRoot,
    value.paths.frontendRoot,
  ])
    mkdirSync(item, { recursive: true })
  const targetPlan = path.join(directory, 'target-plan.json')
  const runtimeReceipt = path.join(directory, 'runtime.json')
  const lineage = restoreLineageFixture(directory, value.targetPlan)
  writeFileSync(value.paths.bindings, value.bindingsBytes)
  writeFileSync(targetPlan, lineage.bytes)
  writeFileSync(runtimeReceipt, value.runtimeBytes)
  return {
    ...value,
    lineage,
    restore: {
      bindings: value.paths.bindings,
      targetPlan,
      runtimeReceipt,
      coordinatorDir: coordinator,
      verifierSha: 'e'.repeat(40),
      runnerSha: 'f'.repeat(40),
    },
  }
}

test('普通 core 与 Device 保留故障验收且不加载恢复旧数据场景', () => {
  for (const fixture of ['core', 'device'])
    assert.deepEqual(realTestSelection(undefined, fixture), {
      selection: { testIgnore: ['**/restore-existing.spec.ts'] },
      reporter: undefined,
    })
})

test('B0 产品前端与当前 runner 分离并绑定全部 v3 预检证据', (t) => {
  const value = restoreFixture(t, {
    backupSourceSha: 'a'.repeat(40),
    backendProductSha: 'b'.repeat(40),
    backendExecutionSha: 'c'.repeat(40),
    frontendSha: b0FrontendSha,
  })
  const calls = []
  const checkout = (directory, sha, label) => {
    calls.push({ directory, sha, label })
    return path.resolve(directory)
  }
  const result = realTestSelection(
    value.restore,
    'core',
    value.runtime.endpoints.frontend,
    root,
    checkout,
  )
  assert.deepEqual(result.selection, { testMatch: restoreSpecs })
  assert.deepEqual(restoreSpecs, [
    '**/full-stack.spec.ts',
    '**/product-tenant.spec.ts',
    '**/post-export.spec.ts',
    '**/session.spec.ts',
    '**/notice.spec.ts',
    '**/schedule.spec.ts',
    '**/restore-existing.spec.ts',
  ])
  assert.deepEqual(calls, [
    {
      directory: value.restore.coordinatorDir,
      sha: value.restore.verifierSha,
      label: '恢复证明协调后端',
    },
    {
      directory: value.paths.frontendRoot,
      sha: b0FrontendSha,
      label: '恢复产品前端源码',
    },
    { directory: root, sha: 'f'.repeat(40), label: '恢复测试 runner 源码' },
  ])
  assert.deepEqual(result.reporter, {
    binding: { path: value.paths.bindings, sha256: sha256(value.bindingsBytes) },
    target: { path: value.restore.targetPlan, sha256: sha256(value.lineage.bytes) },
    runtime: { path: value.restore.runtimeReceipt, sha256: sha256(value.runtimeBytes) },
    sourceGeneration: value.lineage.sourceGeneration,
    datasetLineage: value.lineage.datasetLineage,
    verifierRoot: value.restore.coordinatorDir,
    verifierSha: value.restore.verifierSha,
    runnerRoot: root,
    runnerSha: value.restore.runnerSha,
  })
  assert.equal(result.selection.testMatch.includes('**/restore-existing.spec.ts'), true)
  assert.deepEqual(requiredScenarios, [
    'login',
    'session',
    'post',
    'notice',
    'tenant',
    'export',
    'message',
    'schedule',
    'restored-data',
  ])
})

test('恢复专用套件登记全部且仅一次业务证明场景', async () => {
  const observed = []
  for (const pattern of restoreSpecs) {
    const source = await readFile(
      path.join(root, 'tests', 'browser-real', pattern.slice(3)),
      'utf8',
    )
    observed.push(
      ...[...source.matchAll(/type:\s*'restore-scenario',\s*description:\s*'([^']+)'/gu)].map(
        (match) => match[1],
      ),
    )
  }
  assert.deepEqual([...observed].sort(), [...requiredScenarios].sort())
})

test('恢复输入、fixture 与场景来源在配置副作用前失败关闭', (t) => {
  const value = restoreFixture(t)
  const select = (restore, fixture = 'core', source = root) =>
    realTestSelection(restore, fixture, value.runtime.endpoints.frontend, source, (directory) =>
      path.resolve(directory),
    )
  assert.throws(() => select(value.restore, 'device'), /core/u)
  assert.throws(() => select({ ...value.restore, unknown: true }), /字段/u)
  assert.throws(() => select({ ...value.restore, bindings: 'bindings.json' }), /绝对路径/u)
  writeFileSync(value.restore.targetPlan, '{invalid')
  assert.throws(() => select(value.restore), /JSON/u)
  const replaced = restoreFixture(t)
  writeFileSync(replaced.lineage.sourceGeneration.path, '{}')
  assert.throws(() => select(replaced.restore), /登记摘要/u)
  const another = restoreFixture(t)
  assert.throws(
    () => select(another.restore, 'core', path.dirname(another.restore.bindings)),
    /场景不存在/u,
  )
})

test('runner 核验失败会在报告目录和服务创建前传播', (t) => {
  const value = restoreFixture(t)
  for (const error of ['恢复测试 runner 源码必须是预期 SHA', '恢复测试 runner 源码必须干净']) {
    assert.throws(
      () =>
        realTestSelection(
          value.restore,
          'core',
          value.runtime.endpoints.frontend,
          root,
          (_directory, _sha, label) => {
            if (label === '恢复测试 runner 源码') throw new Error(error)
            return value.paths.frontendRoot
          },
        ),
      new RegExp(error, 'u'),
    )
  }
})

test('真实浏览器配置先完成恢复选择，再创建目录与控制端点', async () => {
  const source = await readFile(path.join(root, 'playwright.real.config.ts'), 'utf8')
  const selection = source.indexOf('const restore = realTestSelection(')
  const report = source.indexOf('const reportDirectory =')
  const directory = source.indexOf('mkdirSync(directory')
  const control = source.indexOf('const controlId =')
  assert.ok(selection >= 0 && selection < report && report < directory && directory < control)
  assert.match(source, /if \(restore\.reporter\)[\s\S]+restore-reporter\.mjs/u)
  assert.match(source, /actionTimeout: 15_000/u)
  assert.match(source, /navigationTimeout: 30_000/u)
})
