import { spawn } from 'node:child_process'
import process from 'node:process'

import { taskWorkerProtocol } from './task-worker-protocol.mjs'
import { enterWindowsTaskJob } from './windows-task-job.mjs'

function serializeError(error) {
  return Object.fromEntries(
    ['message', 'code', 'errno', 'syscall', 'path', 'spawnargs']
      .filter((key) => error[key] !== undefined)
      .map((key) => [key, error[key]]),
  )
}

function closeTaskJob(closeJob, exitCode) {
  process.exitCode = exitCode
  try {
    closeJob()
    process.exit(exitCode)
  } catch (error) {
    process.stderr.write(`${error.stack ?? error}\n`)
    process.exit(exitCode)
  }
}

function reportResult(closeJob, result) {
  const close = () => closeTaskJob(closeJob, result.code ?? 1)
  if (!process.connected) return close()
  try {
    process.send({ type: taskWorkerProtocol.result, ...result }, close)
  } catch {
    close()
  }
}

function startTask(closeJob, invocation) {
  if (
    !invocation ||
    typeof invocation.command !== 'string' ||
    !Array.isArray(invocation.args) ||
    invocation.args.some((value) => typeof value !== 'string')
  ) {
    reportResult(closeJob, {
      code: 1,
      signal: null,
      error: { message: 'Windows 任务 worker 收到无效调用参数' },
    })
    return
  }
  const child = spawn(invocation.command, invocation.args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: 'inherit',
    windowsHide: true,
  })
  let spawnError
  child.once('error', (error) => (spawnError = error))
  child.once('close', (code, signal) => {
    reportResult(closeJob, {
      code: spawnError ? 1 : (code ?? 1),
      signal,
      ...(spawnError ? { error: serializeError(spawnError) } : {}),
    })
  })
  return child
}

function runWorker() {
  if (process.platform !== 'win32' || !process.send) {
    throw new Error('Windows 任务 worker 只能由任务运行器通过 IPC 启动')
  }
  const closeJob = enterWindowsTaskJob()
  let child
  let started = false
  process.on('disconnect', () => closeTaskJob(closeJob, 1))
  process.on('message', (message) => {
    if (message?.type === taskWorkerProtocol.start && !started) {
      started = true
      child = startTask(closeJob, message.invocation)
      return
    }
    if (message?.type !== taskWorkerProtocol.stop) return
    if (!child) return closeTaskJob(closeJob, 1)
    try {
      child.kill(message.signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM')
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
  })
  process.send({ type: taskWorkerProtocol.ready })
}

try {
  runWorker()
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`)
  process.exitCode = 1
}
