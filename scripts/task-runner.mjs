import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'

import { verifyLocalContractState } from './api-contract-state.mjs'
import { sourceSnapshot, writeBuildReceipt } from './restore-build.mjs'
import { taskSpecs } from './task-specs.mjs'
import { runTaskProcess } from './task-process.mjs'
import { TaskRunControl, withTaskSignals } from './task-run-control.mjs'
import {
  consumerContext,
  createTaskPlan,
  parseTaskArguments,
  TaskUsageError,
  taskRunnerHelp,
  validateConsumerState,
} from './task-runner-contract.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))

function cachePath(tool) {
  const configured = process.env.RYFRAME_FAST_CHECK_CACHE_ROOT?.trim()
  return configured
    ? path.join(configured, tool, 'cache')
    : path.join(root, '.local-tests', tool, 'cache')
}

function taskInvocation(task) {
  const invocation = task.invocation
  if (!invocation) throw new Error('任务缺少实际调用声明：' + task.id)
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

async function runTask(task, interactive, control) {
  const invocation = taskInvocation(task)
  if (invocation.kind !== 'action') {
    return runTaskProcess(invocation, {
      cwd: path.resolve(root, task.workingDirectory),
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...task.env },
      interactive,
      control,
    })
  }
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

function reportResult(result, interactive) {
  const succeeded = !result.cancelled && !result.error && result.code === 0
  if (!interactive || !succeeded) {
    console.log(
      (result.cancelled ? '取消 ' : succeeded ? '通过 ' : '失败 ') +
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
export async function executeTaskPlan(
  plan,
  { execute = runTask, report = reportResult, control = new TaskRunControl() } = {},
) {
  const completed = new Map()
  try {
    for (const tasks of plan.groups) {
      if (control.signal.aborted) throw new TaskRunError(control.exitCode)
      const pending = tasks.filter((task) => !completed.has(task.key))
      for (const task of pending) {
        if (task.dependencies.some((key) => completed.get(key)?.code !== 0)) {
          throw new Error('任务 ' + task.id + ' 的依赖尚未成功完成')
        }
      }
      const results = await Promise.all(
        pending.map(async (task) => {
          const startedAt = performance.now()
          let result
          try {
            result = control.signal.aborted
              ? { code: 1, cancelled: true }
              : await execute(task, plan.interactive, control)
          } catch (error) {
            result = { code: 1, error }
          }
          const cancelled = control.signal.aborted && !control.ownsFailure(result)
          if (!cancelled && (result.error || result.code !== 0)) control.fail(result)
          return { ...result, cancelled, elapsed: performance.now() - startedAt, task }
        }),
      )
      let reportError
      for (const result of results) {
        completed.set(result.task.key, result)
        try {
          report(result, plan.interactive)
        } catch (error) {
          reportError ??= error
        }
      }
      if (control.signal.aborted) throw new TaskRunError(control.exitCode)
      if (reportError) throw reportError
    }
    return [...completed.values()]
  } finally {
    control.dispose()
  }
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
          task.effect +
          '；工作目录：' +
          task.workingDirectory +
          '；调用：' +
          JSON.stringify(task.invocation) +
          '；环境：' +
          JSON.stringify(task.env) +
          '；编译覆盖：' +
          (task.compilationCoverage.join(', ') || '无') +
          '；允许写入：' +
          (task.allowedWrites.join(', ') || '无') +
          '；外部资源：' +
          (task.externalResources.join(', ') || '无') +
          '；并发资源：' +
          (task.concurrencyResources.join(', ') || '无'),
      )
    }
  })
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
  const control = new TaskRunControl()
  return withTaskSignals(async () => {
    const buildSource =
      options.command === 'build' && options.real ? sourceSnapshot(root) : undefined
    const results = await executeTaskPlan(plan, { control })
    if (buildSource) writeBuildReceipt(root, buildSource)
    return results
  }, control)
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
      process.exitCode = error.exitCode ?? 1
    }
  })
}
