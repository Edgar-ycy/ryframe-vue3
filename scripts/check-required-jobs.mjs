import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ordinaryJobs = ['static', 'unit', 'build', 'browser', 'windows-smoke']
const scheduledJobs = ['node-22-compatibility', 'supply-chain', 'osv-scan']
const jobs = [...ordinaryJobs, ...scheduledJobs]
const eventMatrix = {
  push: {
    success: ordinaryJobs,
    skipped: scheduledJobs,
  },
  pull_request: {
    success: ordinaryJobs,
    skipped: scheduledJobs,
  },
  schedule: {
    success: scheduledJobs,
    skipped: ordinaryJobs,
  },
  workflow_dispatch: {
    success: [...ordinaryJobs, 'supply-chain', 'osv-scan'],
    skipped: ['node-22-compatibility'],
  },
}

export function validateRequiredJobs(event, results) {
  const errors = []
  const matrix = eventMatrix[event]
  if (!matrix) return [`不支持的 GitHub 事件：${event}`]
  const actualNames = Object.keys(results)
  for (const name of jobs) {
    if (!Object.hasOwn(results, name)) errors.push(`缺少 required job 结果：${name}`)
  }
  for (const name of actualNames) {
    if (!jobs.includes(name)) errors.push(`包含未知 required job：${name}`)
  }
  if (errors.length > 0) return errors

  const expected = new Map([
    ...matrix.success.map((name) => [name, 'success']),
    ...matrix.skipped.map((name) => [name, 'skipped']),
  ])
  for (const name of jobs) {
    if (results[name] !== expected.get(name)) {
      errors.push(`${name} 期望 ${expected.get(name)}，实际 ${results[name]}`)
    }
  }
  return errors
}

function parseArguments(argv) {
  let event
  const results = {}
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--event' && argv[index + 1]) {
      event = argv[index + 1]
      index += 1
      continue
    }
    if (value === '--job' && argv[index + 1]) {
      const raw = argv[index + 1]
      const separator = raw.indexOf('=')
      if (separator <= 0 || separator === raw.length - 1)
        throw new Error(`job 结果必须使用 name=result：${raw}`)
      const name = raw.slice(0, separator)
      if (Object.hasOwn(results, name)) throw new Error(`job 结果重复：${name}`)
      results[name] = raw.slice(separator + 1)
      index += 1
      continue
    }
    throw new Error(`未知参数：${value}`)
  }
  if (!event) throw new Error('缺少 --event')
  return { event, results }
}

function main() {
  const { event, results } = parseArguments(process.argv.slice(2))
  const errors = validateRequiredJobs(event, results)
  if (errors.length > 0) {
    for (const error of errors) console.error(error)
    process.exitCode = 1
    return
  }
  console.log(`Required 汇总校验通过（event=${event}）`)
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
