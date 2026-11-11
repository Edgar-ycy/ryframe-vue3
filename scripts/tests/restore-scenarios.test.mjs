import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { sha256 } from '../build-source-inventory.mjs'
import { requiredScenarios } from '../restore-proof.mjs'
import { realTestSelection, restoreSpecs } from '../restore-scenarios.mjs'
import {
  b0BuildSources,
  legacyB0FrontendBuild,
  restoreRuntimeFixture,
} from './build-receipt-fixture.mjs'
import { restoreLineageFixture } from './restore-lineage-fixture.mjs'

const root = path.resolve(import.meta.dirname, '../..')

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
  const authority = {
    format_version: 1,
    kind: 'restore-dataset-authority',
    runtime: {
      path: runtimeReceipt,
      bytes: value.runtimeBytes.byteLength,
      sha256: sha256(value.runtimeBytes),
    },
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
  const tool = { executable: path.join(coordinator, 'registered-xtask'), verifyUnchanged() {} }
  return {
    ...value,
    authority,
    datasetAuthority: (input) => {
      assert.equal(Object.hasOwn(input, 'python'), false)
      assert.equal(input.tool, tool)
      return { authority, lineage: lineage.lineage }
    },
    lineage,
    tool,
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

test('普通 core 与 业务 保留故障验收且不加载恢复旧数据场景', () => {
  for (const fixture of ['core', 'business'])
    assert.deepEqual(realTestSelection(undefined, fixture), {
      selection: { testIgnore: ['**/restore-existing.spec.ts'] },
      reporter: undefined,
      worker: undefined,
    })
})

test('B0 原产品前端与当前 runner 分离并绑定内嵌构建和全部运行预检证据', (t) => {
  const value = restoreFixture(t, {
    backupSourceSha: 'a'.repeat(40),
    ...b0BuildSources,
    frontendBuildReceipt: legacyB0FrontendBuild,
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
    value.tool,
    root,
    checkout,
    (input) => {
      const result = value.datasetAuthority(input)
      rmSync(result.authority.source_generation.path)
      rmSync(result.authority.dataset_lineage.path)
      return result
    },
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
      sha: b0BuildSources.frontendSha,
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
    datasetAuthority: value.authority,
  })
  assert.deepEqual(result.worker, value.authority)
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
    realTestSelection(
      restore,
      fixture,
      value.runtime.endpoints.frontend,
      value.tool,
      source,
      (directory) => path.resolve(directory),
      value.datasetAuthority,
    )
  assert.throws(() => select(value.restore, 'business'), /core/u)
  assert.throws(() => select({ ...value.restore, unknown: true }), /字段/u)
  assert.throws(
    () =>
      select({ ...value.restore, python: path.join(value.restore.coordinatorDir, 'python.exe') }),
    /字段/u,
  )
  assert.throws(() => select({ ...value.restore, bindings: 'bindings.json' }), /绝对路径/u)
  writeFileSync(value.restore.targetPlan, '{invalid')
  assert.throws(() => select(value.restore), /JSON/u)
  const forged = restoreFixture(t)
  assert.throws(
    () =>
      realTestSelection(
        forged.restore,
        'core',
        forged.runtime.endpoints.frontend,
        forged.tool,
        root,
        (directory) => path.resolve(directory),
        () => {
          throw new Error('后端拒绝伪造来源链')
        },
      ),
    /后端拒绝伪造来源链/u,
  )
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
          value.tool,
          root,
          (_directory, _sha, label) => {
            if (label === '恢复测试 runner 源码') throw new Error(error)
            return value.paths.frontendRoot
          },
          value.datasetAuthority,
        ),
      new RegExp(error, 'u'),
    )
  }
})

test('真实浏览器配置先完成恢复选择，再创建报告目录', async () => {
  const source = await readFile(path.join(root, 'playwright.real.config.ts'), 'utf8')
  const selection = source.indexOf('const restore = realTestSelection(')
  const report = source.indexOf('const reportDirectory =')
  const directory = source.indexOf('mkdirSync(directory')
  assert.ok(selection >= 0 && selection < report && report < directory)
  assert.doesNotMatch(source, /process\.env\.(RYFRAME_|PLAYWRIGHT_CHANNEL)/u)
  assert.match(source, /if \(restore\.reporter\)[\s\S]+restore-reporter\.mjs/u)
  assert.match(source, /environment\.restore \? bindWorkerTool\(environment\.workerTool\)/u)
  assert.match(source, /metadata: restore\.worker/u)
  assert.match(source, /actionTimeout: 15_000/u)
  assert.match(source, /navigationTimeout: 30_000/u)
})

test('restore worker 在首次登录前重验配置冻结的数据权威', async () => {
  const source = await readFile(
    path.join(root, 'tests/browser-real/restore-existing.spec.ts'),
    'utf8',
  )
  const expected = source.indexOf('info.config.metadata.restoreDatasetAuthority')
  const authority = source.indexOf('restoreDatasetEvidence(expectedAuthority)')
  const tool = source.indexOf('bindWorkerTool(workerTool)')
  const loginCall = source.indexOf('await login(')
  assert.ok(expected >= 0 && expected < authority && authority < tool && tool < loginCall)
  for (const name of [
    'RYFRAME_RESTORE_TARGET_PLAN',
    'RYFRAME_RESTORE_RUNTIME_RECEIPT',
    'RYFRAME_RESTORE_BINDINGS',
  ])
    assert.doesNotMatch(source, new RegExp(name, 'u'))
})
