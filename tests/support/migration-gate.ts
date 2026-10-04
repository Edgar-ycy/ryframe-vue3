import { spawn } from 'node:child_process'
import path from 'node:path'
import { createInterface } from 'node:readline'
import type { Readable, Writable } from 'node:stream'

type Receipt = Record<string, unknown>

interface MigrationGateProcess {
  stdin: Writable
  stdout: Readable
  stderr: Readable
  exitCode: number | null
  signalCode: NodeJS.Signals | null
  kill(signal?: NodeJS.Signals | number): boolean
  on(event: 'error', listener: (error: Error) => void): this
  once(event: 'close', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this
}

type SpawnMigrationGate = (
  command: string,
  arguments_: string[],
  options: { env: NodeJS.ProcessEnv; stdio: 'pipe'; windowsHide: true },
) => MigrationGateProcess

interface MigrationGateOptions {
  environment?: NodeJS.ProcessEnv
  forceCloseTimeoutMs?: number
  gracefulCloseTimeoutMs?: number
  spawnProcess?: SpawnMigrationGate
}

function receipt(value: unknown): Receipt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('迁移 gate 未返回对象收据')
  }
  return Object.fromEntries(Object.entries(value))
}

export async function holdMigrationGate(
  tenant: string,
  migration: string,
  {
    environment = process.env,
    forceCloseTimeoutMs = 5_000,
    gracefulCloseTimeoutMs = 15_000,
    spawnProcess = spawn,
  }: MigrationGateOptions = {},
) {
  const backend = environment.RYFRAME_E2E_BACKEND_DIR
  const runtime = environment.RYFRAME_E2E_RUNTIME_DIR
  const scope = environment.RYFRAME_E2E_SCOPE_ID || environment.APP_SCOPE_ID
  if (!backend || !runtime || !scope) throw new Error('迁移 gate 缺少隔离运行配置')
  const child = spawnProcess(
    environment.RYFRAME_E2E_PYTHON || 'python',
    [
      '-X',
      'utf8',
      '-u',
      path.join(backend, 'scripts/full_stack_migration_gate.py'),
      '--backend-root',
      path.resolve(backend),
      '--runtime-dir',
      path.resolve(runtime),
      '--tenant',
      tenant,
      '--migration',
      migration,
    ],
    { env: environment, stdio: 'pipe', windowsHide: true },
  )
  const lines: string[] = []
  let transportFailure: Error | undefined
  let closeWakeError: Error | undefined
  let exitError: Error | undefined
  let closed = false
  let errors = ''
  let pending: { resolve: (line: string) => void; reject: (error: Error) => void } | undefined
  const input = createInterface({ input: child.stdout })
  input.on('line', (line) => {
    if (pending) pending.resolve(line)
    else lines.push(line)
  })
  child.stderr.on('data', (data: Buffer) => {
    errors = (errors + data.toString('utf8')).slice(-4096)
  })
  const transportFailed = (error: Error) => {
    transportFailure ??= error
    pending?.reject(transportFailure)
  }
  input.on('error', transportFailed)
  child.on('error', transportFailed)
  child.stdin.on('error', transportFailed)
  child.stdout.on('error', transportFailed)
  child.stderr.on('error', transportFailed)
  const exited = new Promise<void>((resolve) => {
    child.once('close', (code, signal) => {
      closed = true
      closeWakeError = new Error(`迁移 gate 已退出（${signal ?? code}）：${errors}`)
      if (code !== 0 || signal !== null) exitError = closeWakeError
      pending?.reject(transportFailure ?? closeWakeError)
      resolve()
    })
  })

  async function read(state: string, timeout = 40_000): Promise<Receipt> {
    if (transportFailure) throw transportFailure
    const line =
      lines.shift() ??
      (await new Promise<string>((resolve, reject) => {
        if (transportFailure) return reject(transportFailure)
        if (closed) return reject(closeWakeError!)
        const timer = setTimeout(() => {
          pending = undefined
          reject(new Error(`等待 gate ${state} 超时：${errors}`))
        }, timeout)
        pending = {
          resolve: (value) => {
            clearTimeout(timer)
            pending = undefined
            resolve(value)
          },
          reject: (error) => {
            clearTimeout(timer)
            pending = undefined
            reject(error)
          },
        }
      }))
    const result = receipt(JSON.parse(line))
    if (
      result.scope_id !== scope ||
      result.tenant_id !== tenant ||
      result.migration_id !== migration ||
      result.state !== state
    ) {
      throw new Error('迁移 gate 收据与当前 scope、租户、任务或阶段不匹配')
    }
    return result
  }

  async function exitsWithin(timeout: number): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        exited.then(() => true),
        new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(false), timeout)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  function combinedError(candidates: Array<Error | undefined>): Error | undefined {
    const distinct = [...new Set(candidates.filter((error): error is Error => Boolean(error)))]
    if (distinct.length === 0) return undefined
    if (distinct.length === 1) return distinct[0]
    return new AggregateError(distinct, distinct.map((error) => error.message).join('；'))
  }

  let stdinEnded = false
  let stdinEndError: Error | undefined
  let gracefulTimeoutError: Error | undefined

  async function closeAttempt(primary?: Error): Promise<void> {
    if (!stdinEnded) {
      stdinEnded = true
      try {
        child.stdin.end()
      } catch (error) {
        stdinEndError = error instanceof Error ? error : new Error(String(error))
      }
    }

    if (
      !closed &&
      !gracefulTimeoutError &&
      !(await exitsWithin(gracefulCloseTimeoutMs)) &&
      !closed
    ) {
      gracefulTimeoutError = new Error('迁移 gate 关闭超时')
    }

    const attemptErrors: Error[] = []
    if (!closed && child.exitCode === null && child.signalCode === null) {
      try {
        // 仅强制回收此函数创建的 helper；外层任务 Job/进程组负责浏览器任务树。
        child.kill('SIGKILL')
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) {
          attemptErrors.push(error instanceof Error ? error : new Error(String(error)))
        }
      }
    }
    if (!closed && !(await exitsWithin(forceCloseTimeoutMs)) && !closed) {
      attemptErrors.push(new Error('迁移 gate 强制关闭后仍未退出'))
    }
    if (closed) input.close()
    const failure = combinedError([
      primary,
      stdinEndError,
      gracefulTimeoutError,
      transportFailure,
      exitError,
      ...attemptErrors,
    ])
    if (failure) throw failure
  }

  let held: Receipt
  try {
    held = await read('held')
  } catch (error) {
    await closeAttempt(error instanceof Error ? error : new Error(String(error)))
    throw error
  }
  let releaseReceipt: Promise<void> | undefined
  let releaseInFlight: Promise<void> | undefined
  let releaseTerminal: Promise<void> | undefined

  function requestRelease(): Promise<void> {
    releaseReceipt ??= (async () => {
      child.stdin.write(JSON.stringify({ operation: 'release' }) + '\n')
      await read('released')
    })()
    return releaseReceipt
  }

  async function performRelease(): Promise<void> {
    let releaseError: Error | undefined
    try {
      await requestRelease()
    } catch (error) {
      releaseError = error instanceof Error ? error : new Error(String(error))
    }
    await closeAttempt(releaseError)
  }

  function release(): Promise<void> {
    if (releaseTerminal) return releaseTerminal
    if (releaseInFlight) return releaseInFlight
    const attempt = performRelease()
    releaseInFlight = attempt
    void attempt.then(
      () => settleRelease(attempt),
      () => settleRelease(attempt),
    )
    return attempt
  }

  function settleRelease(attempt: Promise<void>): void {
    if (closed) releaseTerminal = attempt
    if (releaseInFlight === attempt) releaseInFlight = undefined
  }

  return {
    held,
    async waitBlocked() {
      child.stdin.write(JSON.stringify({ operation: 'wait-blocked' }) + '\n')
      const result = await read('blocked')
      return receipt(result.proof)
    },
    release,
  }
}
