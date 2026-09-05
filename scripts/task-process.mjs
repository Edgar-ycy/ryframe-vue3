import { spawn } from 'node:child_process'

/** 等待已登记的直接子进程及其输出关闭。 */
export function runTaskProcess(invocation, { cwd, env, interactive, control, spawnChild = spawn }) {
  if (control.signal.aborted) return Promise.resolve({ code: 1, cancelled: true })
  return new Promise((resolve) => {
    const child = spawnChild(invocation.command, invocation.args, {
      cwd,
      env,
      shell: false,
      stdio: interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const result = { code: 1, stderr: '', stdout: '' }
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
    child.once('exit', (code, signal) => {
      result.code = code ?? 1
      result.signal = signal
      if (result.code !== 0) control.fail(result)
    })
    const unregister = control.register((signal) => {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
      try {
        child.kill(signal)
      } catch (cause) {
        if (cause.code !== 'ESRCH') result.error ??= cause
      }
    })
    child.once('close', (code, signal) => {
      unregister()
      resolve(Object.assign(result, { code: code ?? 1, signal }))
    })
  })
}
