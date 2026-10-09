import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import BusinessReporter, {
  requiredBusinessScenarios,
  verifyBusinessTestReceipt,
} from '../business-reporter.mjs'

function runs() {
  return [
    {
      title: ['真实业务数据从 shared-control 复制校验并切换到 shared'],
      status: 'passed',
      retry: 0,
      scenarios: ['shared-migration'],
    },
    {
      title: ['真实业务数据从 dedicated-a 复制校验并切换到 dedicated-b'],
      status: 'passed',
      retry: 0,
      scenarios: ['dedicated-migration', 'retention'],
    },
    {
      title: ['真实排队业务迁移取消恢复源数据，并允许再次迁移'],
      status: 'passed',
      retry: 0,
      scenarios: ['cancellation'],
    },
    {
      title: ['真实业务复制阻塞时 Worker 崩溃，重启后同一迁移恢复并完成校验'],
      status: 'passed',
      retry: 0,
      scenarios: ['crash-recovery'],
    },
  ]
}

function receipt(overrides = {}) {
  return {
    format_version: 1,
    kind: 'business-browser-tests',
    fixture: 'business',
    server: 'preview',
    run_id: 'r24-business-preview',
    status: 'passed',
    runs: runs(),
    ...overrides,
  }
}

test('严格接受唯一标题、零重试和完整 Business 场景', () => {
  const value = receipt()
  assert.equal(
    verifyBusinessTestReceipt(value, { server: 'preview', runId: 'r24-business-preview' }),
    value,
  )
  assert.deepEqual(
    new Set(value.runs.flatMap((run) => run.scenarios)),
    new Set(requiredBusinessScenarios),
  )
})

test('拒绝失败、跳过、重试、重复标题和缺失或重复场景', () => {
  for (const [field, value] of [
    ['status', 'failed'],
    ['server', 'other'],
    ['run_id', 'UPPER'],
  ]) {
    assert.throws(
      () =>
        verifyBusinessTestReceipt(receipt({ [field]: value }), {
          server: 'preview',
          runId: 'r24-business-preview',
        }),
      /Business/u,
    )
  }
  for (const mutate of [
    (value) => (value[0].status = 'failed'),
    (value) => (value[0].status = 'skipped'),
    (value) => (value[0].retry = 1),
    (value) => (value[1].title = [...value[0].title]),
    (value) => (value[0].title = ['未登记的额外测试']),
    (value) => (value[0].title = ['额外前缀', ...value[0].title]),
    (value) => (value[0].scenarios = []),
    (value) => value[0].scenarios.push('shared-migration'),
    (value) => (value[0].scenarios = ['unknown']),
    (value) => value.push({ title: ['extra'], status: 'passed', retry: 0, scenarios: [] }),
  ]) {
    const value = runs()
    mutate(value)
    assert.throws(
      () =>
        verifyBusinessTestReceipt(receipt({ runs: value }), {
          server: 'preview',
          runId: 'r24-business-preview',
        }),
      /Business/u,
    )
  }
})

test('reporter 只以全新文件发布通过收据', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ryframe-business-reporter-'))
  const output = path.join(root, 'business-tests.json')
  const reporter = new BusinessReporter({ output, server: 'dev', runId: 'r24-business-dev' })
  for (const run of runs()) {
    reporter.onTestEnd(
      {
        titlePath: () => run.title,
        annotations: run.scenarios.map((description) => ({
          type: 'business-scenario',
          description,
        })),
      },
      { status: run.status, retry: run.retry },
    )
  }
  assert.equal(reporter.onEnd({ status: 'passed' }), undefined)
  const value = JSON.parse(readFileSync(output, 'utf8'))
  assert.equal(value.server, 'dev')
  assert.throws(
    () => new BusinessReporter({ output, server: 'dev', runId: 'r24-business-dev' }),
    /全新 run id/u,
  )
})

test('reporter 不发布不完整成功收据', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ryframe-business-reporter-'))
  const output = path.join(root, 'business-tests.json')
  mkdirSync(path.dirname(output), { recursive: true })
  const reporter = new BusinessReporter({
    output,
    server: 'preview',
    runId: 'r24-business-preview',
  })
  reporter.onTestEnd({ titlePath: () => ['only'], annotations: [] }, { status: 'passed', retry: 0 })
  assert.deepEqual(reporter.onEnd({ status: 'passed' }), { status: 'failed' })
  assert.throws(() => readFileSync(output), /ENOENT/u)

  writeFileSync(output, 'existing')
  assert.throws(
    () => new BusinessReporter({ output, server: 'preview', runId: 'r24-business-preview' }),
    /全新 run id/u,
  )
})
