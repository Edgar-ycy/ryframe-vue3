import { closeSync, existsSync, fsyncSync, openSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { evidenceDirectory } from './restore-verification.mjs'

export const requiredDeviceScenarios = Object.freeze([
  'shared-migration',
  'dedicated-migration',
  'retention',
  'cancellation',
  'crash-recovery',
])

const runFields = ['title', 'status', 'retry', 'scenarios']

function exactObject(value, fields, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0')
  )
    throw new Error(`${label}字段必须精确匹配当前格式`)
  return value
}

function validRunId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/u.test(value)
}

export function verifyDeviceTestReceipt(value, expected) {
  const receipt = exactObject(
    value,
    ['format_version', 'kind', 'fixture', 'server', 'run_id', 'status', 'runs'],
    'Device 浏览器测试收据',
  )
  if (
    receipt.format_version !== 1 ||
    receipt.kind !== 'device-browser-tests' ||
    receipt.fixture !== 'device' ||
    !['dev', 'preview'].includes(receipt.server) ||
    !validRunId(receipt.run_id) ||
    receipt.status !== 'passed' ||
    receipt.server !== expected.server ||
    receipt.run_id !== expected.runId ||
    !Array.isArray(receipt.runs) ||
    receipt.runs.length !== 4
  )
    throw new Error('Device 浏览器测试收据与当前运行不一致')

  const titles = new Set()
  const scenarios = []
  for (const item of receipt.runs) {
    const run = exactObject(item, runFields, 'Device 浏览器测试明细')
    if (
      !Array.isArray(run.title) ||
      run.title.length === 0 ||
      run.title.some((part) => typeof part !== 'string' || !part.trim()) ||
      run.status !== 'passed' ||
      run.retry !== 0 ||
      !Array.isArray(run.scenarios) ||
      run.scenarios.length === 0 ||
      run.scenarios.some((scenario) => typeof scenario !== 'string' || !scenario)
    )
      throw new Error('Device 浏览器测试包含失败、跳过、重试或无效标题')
    const title = JSON.stringify(run.title)
    if (titles.has(title)) throw new Error('Device 浏览器测试标题重复')
    titles.add(title)
    scenarios.push(...run.scenarios)
  }
  const names = new Set(scenarios)
  if (
    scenarios.length !== requiredDeviceScenarios.length ||
    names.size !== requiredDeviceScenarios.length ||
    !requiredDeviceScenarios.every((name) => names.has(name))
  )
    throw new Error('Device 浏览器场景缺失、重复或包含未知值')
  return receipt
}

function publish(pathname, value) {
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n')
  const descriptor = openSync(pathname, 'wx')
  try {
    writeFileSync(descriptor, bytes)
    fsyncSync(descriptor)
  } finally {
    closeSync(descriptor)
  }
}

export default class DeviceReporter {
  runs = []

  constructor({ output, server, runId } = {}) {
    if (!['dev', 'preview'].includes(server) || !validRunId(runId) || typeof output !== 'string')
      throw new Error('Device reporter 缺少 server、run id 或输出文件')
    const parent = evidenceDirectory(path.dirname(path.resolve(output)), 'Device 测试结果目录')
    this.output = path.join(parent, path.basename(output))
    if (existsSync(this.output)) throw new Error('Device 测试收据必须使用全新 run id')
    this.server = server
    this.runId = runId
  }

  onTestEnd(test, result) {
    this.runs.push({
      title: test.titlePath(),
      status: result.status,
      retry: result.retry,
      scenarios: test.annotations
        .filter((item) => item.type === 'device-scenario')
        .map((item) => item.description),
    })
  }

  onEnd(result) {
    const receipt = {
      format_version: 1,
      kind: 'device-browser-tests',
      fixture: 'device',
      server: this.server,
      run_id: this.runId,
      status: result.status,
      runs: this.runs,
    }
    try {
      verifyDeviceTestReceipt(receipt, { server: this.server, runId: this.runId })
      publish(this.output, receipt)
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Device 测试收据生成失败')
      return { status: 'failed' }
    }
  }
}
