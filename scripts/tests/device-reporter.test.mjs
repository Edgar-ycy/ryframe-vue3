import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import DeviceReporter, {
  requiredDeviceScenarios,
  verifyDeviceTestReceipt,
} from '../device-reporter.mjs'

function runs() {
  return [
    { title: ['shared'], status: 'passed', retry: 0, scenarios: ['shared-migration'] },
    {
      title: ['dedicated'],
      status: 'passed',
      retry: 0,
      scenarios: ['dedicated-migration', 'retention'],
    },
    { title: ['cancel'], status: 'passed', retry: 0, scenarios: ['cancellation'] },
    { title: ['recover'], status: 'passed', retry: 0, scenarios: ['crash-recovery'] },
  ]
}

function receipt(overrides = {}) {
  return {
    format_version: 1,
    kind: 'device-browser-tests',
    fixture: 'device',
    server: 'preview',
    run_id: 'r24-device-preview',
    status: 'passed',
    runs: runs(),
    ...overrides,
  }
}

test('严格接受唯一标题、零重试和完整 Device 场景', () => {
  const value = receipt()
  assert.equal(
    verifyDeviceTestReceipt(value, { server: 'preview', runId: 'r24-device-preview' }),
    value,
  )
  assert.deepEqual(
    new Set(value.runs.flatMap((run) => run.scenarios)),
    new Set(requiredDeviceScenarios),
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
        verifyDeviceTestReceipt(receipt({ [field]: value }), {
          server: 'preview',
          runId: 'r24-device-preview',
        }),
      /Device/u,
    )
  }
  for (const mutate of [
    (value) => (value[0].status = 'failed'),
    (value) => (value[0].status = 'skipped'),
    (value) => (value[0].retry = 1),
    (value) => (value[1].title = ['shared']),
    (value) => (value[0].scenarios = []),
    (value) => value[0].scenarios.push('shared-migration'),
    (value) => (value[0].scenarios = ['unknown']),
    (value) => value.push({ title: ['extra'], status: 'passed', retry: 0, scenarios: [] }),
  ]) {
    const value = runs()
    mutate(value)
    assert.throws(
      () =>
        verifyDeviceTestReceipt(receipt({ runs: value }), {
          server: 'preview',
          runId: 'r24-device-preview',
        }),
      /Device/u,
    )
  }
})

test('reporter 只以全新文件发布通过收据', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ryframe-device-reporter-'))
  const output = path.join(root, 'device-tests.json')
  const reporter = new DeviceReporter({ output, server: 'dev', runId: 'r24-device-dev' })
  for (const run of runs()) {
    reporter.onTestEnd(
      {
        titlePath: () => run.title,
        annotations: run.scenarios.map((description) => ({ type: 'device-scenario', description })),
      },
      { status: run.status, retry: run.retry },
    )
  }
  assert.equal(reporter.onEnd({ status: 'passed' }), undefined)
  const value = JSON.parse(readFileSync(output, 'utf8'))
  assert.equal(value.server, 'dev')
  assert.throws(
    () => new DeviceReporter({ output, server: 'dev', runId: 'r24-device-dev' }),
    /全新 run id/u,
  )
})

test('reporter 不发布不完整成功收据', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ryframe-device-reporter-'))
  const output = path.join(root, 'device-tests.json')
  mkdirSync(path.dirname(output), { recursive: true })
  const reporter = new DeviceReporter({ output, server: 'preview', runId: 'r24-device-preview' })
  reporter.onTestEnd({ titlePath: () => ['only'], annotations: [] }, { status: 'passed', retry: 0 })
  assert.deepEqual(reporter.onEnd({ status: 'passed' }), { status: 'failed' })
  assert.throws(() => readFileSync(output), /ENOENT/u)

  writeFileSync(output, 'existing')
  assert.throws(
    () => new DeviceReporter({ output, server: 'preview', runId: 'r24-device-preview' }),
    /全新 run id/u,
  )
})
