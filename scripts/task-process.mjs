import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { taskWorkerProtocol } from './task-worker-protocol.mjs'

const windowsTaskWorker = fileURLToPath(new URL('./windows-task-worker.mjs', import.meta.url))

function killChild(child, signal) {
  try {
    child.kill(signal)
  } catch (cause) {
    if (cause.code !== 'ESRCH') throw cause
  }
}

function stopTaskTree(child, signal) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal)
      return
    } catch (cause) {
      if (cause.code === 'ESRCH') return
    }
  } else {
    if (signal === 'SIGKILL' || !child.connected) killChild(child, 'SIGKILL')
    else {
      try {
        child.send({ type: taskWorkerProtocol.stop, signal }, (error) => {
          if (error && child.exitCode === null && child.signalCode === null) {
            killChild(child, 'SIGKILL')
          }
        })
      } catch {
        killChild(child, 'SIGKILL')
      }
    }
    return
  }
  killChild(child, signal)
}

function childInvocation(invocation, interactive) {
  if (process.platform !== 'win32') {
    return {
      command: invocation.command,
      args: invocation.args,
      detached: true,
      stdio: interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    }
  }
  return {
    command: process.execPath,
    args: [windowsTaskWorker],
    detached: false,
    stdio: interactive
      ? ['inherit', 'inherit', 'inherit', 'ipc']
      : ['ignore', 'pipe', 'pipe', 'ipc'],
  }
}

function resultError(value) {
  if (!value || typeof value !== 'object') return undefined
  return Object.assign(new Error(value.message ?? 'Windows 任务执行失败'), value)
}

/** 等待已登记的直接子进程及其输出关闭。 */
export function runTaskProcess(invocation, { cwd, env, interactive, control, spawnChild = spawn }) {
  if (control.signal.aborted) return Promise.resolve({ code: 1, cancelled: true })
  return new Promise((resolve) => {
    const target = childInvocation(invocation, interactive)
    const child = spawnChild(target.command, target.args, {
      cwd,
      env,
      shell: false,
      stdio: target.stdio,
      windowsHide: true,
      detached: target.detached,
    })
    const result = { code: 1, stderr: '', stdout: '' }
    let taskResult
    let unregister = () => undefined
    if (!interactive) {
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (chunk) => (result.stdout += chunk))
      child.stderr.on('data', (chunk) => (result.stderr += chunk))
    }
    child.on('error', (cause) => {
      result.error ??= cause
      control.fail(result)
    })
    if (process.platform === 'win32') {
      child.on('message', (message) => {
        if (message?.type === taskWorkerProtocol.ready) {
          if (!control.signal.aborted) {
            child.send({ type: taskWorkerProtocol.start, invocation }, (error) => {
              if (!error) return
              result.error ??= error
              control.fail(result)
            })
          }
          return
        }
        if (message?.type !== taskWorkerProtocol.result || taskResult) return
        taskResult = message
        result.code = message.code ?? 1
        result.signal = message.signal
        result.error ??= resultError(message.error)
        unregister()
        if (result.error || result.code !== 0) control.fail(result)
      })
    }
    child.once('exit', (code, signal) => {
      if (taskResult) return
      result.code = process.platform === 'win32' && code === 0 ? 1 : (code ?? 1)
      result.signal = signal
      if (process.platform !== 'win32' && result.code !== 0) control.fail(result)
    })
    unregister = control.register((signal) => {
      try {
        stopTaskTree(child, signal)
      } catch (cause) {
        if (cause.code !== 'ESRCH') result.error ??= cause
      }
    })
    child.once('close', (code, signal) => {
      unregister()
      const workerCode = process.platform === 'win32' && code === 0 ? 1 : (code ?? 1)
      if (process.platform === 'win32' && !taskResult && workerCode !== 0) {
        result.code = workerCode
        result.signal = signal
        control.fail(result)
      }
      resolve(
        Object.assign(
          result,
          taskResult
            ? { code: taskResult.code ?? 1, signal: taskResult.signal }
            : { code: workerCode, signal },
        ),
      )
    })
  })
}
