import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
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

function unixProcessGroupAlive(processGroup) {
  try {
    process.kill(-processGroup, 0)
    return true
  } catch (cause) {
    if (cause.code === 'ESRCH') return false
    throw cause
  }
}

function stopTaskTree(child, processGroup, signal) {
  if (process.platform !== 'win32') {
    if (!processGroup) return
    try {
      process.kill(-processGroup, signal)
      return
    } catch (cause) {
      if (cause.code === 'ESRCH') return
      throw cause
    }
  }
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
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
}

async function waitForUnixProcessGroup(processGroup, timeoutMs = 5000) {
  if (!processGroup) return
  const deadline = Date.now() + timeoutMs
  while (unixProcessGroupAlive(processGroup)) {
    if (Date.now() >= deadline) throw new Error(`任务进程组 ${processGroup} 未能完成回收`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
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

const sensitiveEnvironmentName =
  /password|passwd|secret|token|authorization|auth|cookie|access[_-]?key|private[_-]?key|api[_-]?key/iu

function redactTaskProcessLog(content, environment) {
  const secrets = Object.entries(environment ?? {})
    .filter(
      ([name, value]) => sensitiveEnvironmentName.test(name) && String(value ?? '').length > 0,
    )
    .map(([, value]) => String(value))
    .sort((left, right) => right.length - left.length)
  let redacted = content
  for (const secret of new Set(secrets)) redacted = redacted.split(secret).join('[REDACTED]')
  return redacted
    .replace(
      /(\b(?:proxy-)?authorization\s*[:=]\s*)(?:(?:bearer|basic)\s+)?[^\r\n]+/giu,
      '$1[REDACTED]',
    )
    .replace(/(\b(?:set-cookie|cookie)\s*:\s*)[^\r\n]+/giu, '$1[REDACTED]')
    .replace(/\b(bearer|basic)\s+[^\s,;]+/giu, '$1 [REDACTED]')
    .replace(
      /(\b[a-z0-9_-]*(?:password|passwd|secret|token|access[_-]?key|private[_-]?key|api[_-]?key|auth|cookie)[a-z0-9_-]*\b['"]?\s*[:=]\s*)(?:"(?:\\.|[^"\r\n])*"|'(?:\\.|[^'\r\n])*'|[^\s,;}\]\r\n]+)/giu,
      '$1[REDACTED]',
    )
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^:\s/@]+:)[^@\s/]+(@)/giu, '$1[REDACTED]$2')
}

function writeTaskProcessLog(outputFile, result, metadata = {}, environment) {
  mkdirSync(path.dirname(outputFile), { recursive: true })
  const fields = Object.entries(metadata)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${String(value)}`)
  const content = [
    '# RyFrame 任务进程日志',
    ...fields,
    `exit_code=${result.code ?? 1}`,
    `signal=${result.signal ?? ''}`,
    '',
    '[stdout]',
    result.stdout ?? '',
    '',
    '[stderr]',
    result.stderr ?? '',
    '',
  ].join('\n')
  writeFileSync(outputFile, redactTaskProcessLog(content, environment), 'utf8')
  return outputFile
}

/** 等待已登记的任务进程树及其输出关闭。 */
export function runTaskProcess(
  invocation,
  { cwd, env, interactive, control, outputFile, outputMetadata, spawnChild = spawn },
) {
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
    const processGroup = process.platform !== 'win32' && child.pid ? child.pid : undefined
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
        stopTaskTree(child, processGroup, signal)
      } catch (cause) {
        if (cause.code !== 'ESRCH') result.error ??= cause
      }
    })
    child.once('close', (code, signal) => {
      void (async () => {
        let workerCode = process.platform === 'win32' && code === 0 ? 1 : (code ?? 1)
        if (process.platform !== 'win32' && processGroup) {
          try {
            if (unixProcessGroupAlive(processGroup) && !control.signal.aborted) {
              result.error ??= new Error('任务直接子进程退出后仍有存活后代')
              result.code = workerCode || 1
              result.signal = signal
              control.fail(result)
            }
            await waitForUnixProcessGroup(processGroup)
          } catch (cause) {
            result.error ??= cause
            workerCode ||= 1
            if (!control.signal.aborted) {
              result.code = workerCode
              result.signal = signal
              control.fail(result)
            }
          }
        }
        unregister()
        if (process.platform === 'win32' && !taskResult && workerCode !== 0) {
          result.code = workerCode
          result.signal = signal
          control.fail(result)
        }
        const completed = Object.assign(
          result,
          taskResult
            ? { code: taskResult.code ?? 1, signal: taskResult.signal }
            : { code: result.error && workerCode === 0 ? 1 : workerCode, signal },
        )
        if (outputFile) {
          try {
            completed.artifacts = [
              ...(completed.artifacts ?? []),
              writeTaskProcessLog(outputFile, completed, outputMetadata, env),
            ]
          } catch (cause) {
            completed.error ??= new Error(`无法保存任务进程日志：${cause.message}`, { cause })
            if (completed.code === 0) completed.code = 1
            control.fail(completed)
          }
        }
        resolve(completed)
      })()
    })
  })
}
