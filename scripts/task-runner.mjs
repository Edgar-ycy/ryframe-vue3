import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'

import { verifyLocalContractState } from './api-contract-state.mjs'
import { sourceSnapshot, writeBuildReceipt } from './restore-build.mjs'
import { taskSpecs } from './task-specs.mjs'
import {
  consumerContext,
  createTaskPlan,
  parseTaskArguments,
  TaskUsageError,
  taskRunnerHelp,
  validateConsumerState,
} from './task-runner-contract.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const activeChildren = new Set()
let interruptedSignal

function cachePath(tool) {
  const configured = process.env.RYFRAME_FAST_CHECK_CACHE_ROOT?.trim()
  return configured
    ? path.join(configured, tool, 'cache')
    : path.join(root, '.local-tests', tool, 'cache')
}

function taskInvocation(task) {
  const invocation = taskSpecs[task.id].invoke(task)
  if (invocation.kind === 'action') return invocation
  const args = (invocation.args ?? []).map((value) =>
    typeof value === 'string' ? value : cachePath(value.cache),
  )
  if (invocation.kind === 'script') {
    return { command: process.execPath, args: [path.join(root, invocation.file), ...args] }
  }
  if (invocation.kind === 'policy-tests') {
    const files = readdirSync(path.join(root, 'scripts', 'tests'))
      .filter((name) => name.endsWith('.test.mjs'))
      .sort()
      .map((name) => path.join(root, 'scripts', 'tests', name))
    return { command: process.execPath, args: ['--test', ...files] }
  }
  const manifestPath = path.join(
    root,
    'node_modules',
    ...invocation.packageName.split('/'),
    'package.json',
  )
  if (!existsSync(manifestPath)) throw new Error('缺少项目依赖：' + invocation.packageName)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const relative = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[invocation.name]
  if (!relative) throw new Error(invocation.packageName + ' 未声明 ' + invocation.name + ' 二进制')
  return {
    command: process.execPath,
    args: [path.resolve(path.dirname(manifestPath), relative), ...args],
  }
}

function spawnTask(task, invocation, interactive) {
  return new Promise((resolve) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...task.env },
      shell: false,
      stdio: interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    activeChildren.add(child)
    let settled = false
    let stderr = ''
    let stdout = ''
    if (!interactive) {
      child.stdout.on('data', (chunk) => (stdout += chunk))
      child.stderr.on('data', (chunk) => (stderr += chunk))
    }
    child.once('error', (error) => {
      if (settled) return
      settled = true
      activeChildren.delete(child)
      resolve({ code: 1, error, stderr, stdout })
    })
    child.once('close', (code, signal) => {
      if (settled) return
      settled = true
      activeChildren.delete(child)
      resolve({ code: code ?? 1, signal, stderr, stdout })
    })
  })
}

async function runTask(task, interactive) {
  const invocation = taskInvocation(task)
  if (invocation.kind !== 'action') return spawnTask(task, invocation, interactive)
  if (invocation.action !== 'api-source') throw new Error('未知任务动作：' + invocation.action)
  const state = await verifyLocalContractState(root)
  if (task.params.consumer) {
    validateConsumerState(task.params.consumer, state, readFileSync(task.params.consumer.candidate))
  }
  return { code: 0, stdout: '本地 OpenAPI ' + state.mode + ' 态校验通过' }
}

export class TaskRunError extends Error {
  constructor(exitCode) {
    super('前端任务失败')
    this.exitCode = exitCode
  }
}

function signalExitCode(signal) {
  return signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : undefined
}

function reportResult(result, interactive) {
  const succeeded = !result.error && result.code === 0
  if (!interactive || !succeeded) {
    console.log(
      (succeeded ? '通过 ' : '失败 ') +
        taskSpecs[result.task.id].label +
        ' (' +
        Math.round(result.elapsed) +
        ' ms)',
    )
  }
  if (!succeeded) {
    const output = ((result.stdout ?? '') + (result.stderr ?? '')).trim()
    if (output) console.error(output)
    if (result.error) console.error(result.error.message)
  }
}

/** 执行 planner 的原始节点，收集实际结果；执行记录仅属于本次运行。 */
export async function executeTaskPlan(plan, { execute = runTask, report = reportResult } = {}) {
  const completed = new Map()
  for (const tasks of plan.groups) {
    if (interruptedSignal) throw new TaskRunError(signalExitCode(interruptedSignal))
    const pending = tasks.filter((task) => !completed.has(task.key))
    for (const task of pending) {
      if (task.dependencies.some((key) => completed.get(key)?.code !== 0)) {
        throw new Error('任务 ' + task.id + ' 的依赖尚未成功完成')
      }
    }
    const results = await Promise.all(
      pending.map(async (task) => {
        const startedAt = performance.now()
        try {
          const result = await execute(task, plan.interactive)
          return { ...result, elapsed: performance.now() - startedAt, task }
        } catch (error) {
          return { code: 1, error, elapsed: performance.now() - startedAt, task }
        }
      }),
    )
    for (const result of results) {
      completed.set(result.task.key, result)
      report(result, plan.interactive)
    }
    const failed = results.find((result) => result.error || result.code !== 0)
    if (failed) {
      throw new TaskRunError(
        signalExitCode(failed.signal ?? interruptedSignal) ?? (failed.code || 1),
      )
    }
  }
  return [...completed.values()]
}

function printPlan(plan) {
  console.log('将执行以下任务（仅预览，不创建缓存、报告或产物）：')
  const names = new Map(plan.groups.flat().map((task) => [task.key, task.id]))
  plan.groups.forEach((tasks, index) => {
    console.log('  阶段 ' + (index + 1) + ':')
    for (const task of tasks) {
      const dependencies = task.dependencies.map((key) => names.get(key)).join(', ') || '无'
      console.log(
        '    ' +
          task.id +
          ' ' +
          JSON.stringify(task.params) +
          '；依赖：' +
          dependencies +
          '；作用：' +
          task.effect,
      )
    }
  })
}

async function withSignals(action) {
  interruptedSignal = undefined
  const handlers = new Map(
    ['SIGINT', 'SIGTERM'].map((signal) => [
      signal,
      () => {
        interruptedSignal = signal
        for (const child of activeChildren) child.kill(signal)
      },
    ]),
  )
  for (const [signal, handler] of handlers) process.on(signal, handler)
  try {
    return await action()
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler)
  }
}

export async function runTaskRunner(argv) {
  const options = parseTaskArguments(argv)
  if (options.command === 'help') {
    console.log(taskRunnerHelp)
    return
  }
  const consumer = consumerContext(options, process.env.RYFRAME_CONSUMER_CONTRACT)
  const plan = createTaskPlan({ ...options, consumer, consumerCheck: consumer !== undefined })
  if (options.plan) {
    printPlan(plan)
    return
  }
  return withSignals(async () => {
    const buildSource =
      options.command === 'build' && options.real ? sourceSnapshot(root) : undefined
    const results = await executeTaskPlan(plan)
    if (buildSource) writeBuildReceipt(root, buildSource)
    return results
  })
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isMain) {
  runTaskRunner(process.argv.slice(2)).catch((error) => {
    if (error instanceof TaskUsageError) {
      console.error(error.message + '\n\n' + taskRunnerHelp)
      process.exitCode = 2
    } else {
      if (!(error instanceof TaskRunError)) console.error(error.stack ?? error.message)
      process.exitCode = error.exitCode ?? signalExitCode(interruptedSignal) ?? 1
    }
  })
}
