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
  let failure: Error | undefined
  let exitError: Error | undefined
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
  const failed = (error: Error) => {
    failure ??= error
    pending?.reject(failure)
  }
  child.on('error', failed)
  child.stdin.on('error', failed)
  child.stdout.on('error', failed)
  child.stderr.on('error', failed)
  const exited = new Promise<void>((resolve) => {
    child.once('close', (code, signal) => {
      exitError = new Error(`迁移 gate 已退出（${signal ?? code}）：${errors}`)
      failed(exitError)
      resolve()
    })
  })

  async function read(state: string, timeout = 40_000): Promise<Receipt> {
    const line =
      lines.shift() ??
      (await new Promise<string>((resolve, reject) => {
        if (failure) return reject(failure)
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

  async function close() {
    const errors: Error[] = []
    try {
      child.stdin.end()
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
    if (await exitsWithin(gracefulCloseTimeoutMs)) {
      input.close()
      if (child.exitCode !== 0 || child.signalCode !== null) errors.push(exitError!)
      if (errors.length) throw errors[0]
      return
    }

    errors.push(new Error('迁移 gate 关闭超时'))
    if (child.exitCode === null && child.signalCode === null) {
      try {
        // 仅强制回收此函数创建的 helper；外层任务 Job/进程组负责浏览器任务树。
        child.kill('SIGKILL')
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) {
          errors.push(error instanceof Error ? error : new Error(String(error)))
        }
      }
    }
    const forcedClosed = await exitsWithin(forceCloseTimeoutMs)
    input.close()
    if (!forcedClosed) errors.push(new Error('迁移 gate 强制关闭后仍未退出'))
    throw errors.length === 1
      ? errors[0]
      : new AggregateError(errors, errors.map((error) => error.message).join('；'))
  }

  async function closePreserving(primary?: Error): Promise<void> {
    try {
      await close()
    } catch (cleanup) {
      const cleanupError = cleanup instanceof Error ? cleanup : new Error(String(cleanup))
      if (primary) {
        throw new AggregateError(
          [primary, cleanupError],
          `${primary.message}；迁移 gate 清理失败：${cleanupError.message}`,
        )
      }
      throw cleanupError
    }
    if (primary) throw primary
  }

  let held: Receipt
  try {
    held = await read('held')
  } catch (error) {
    await closePreserving(error instanceof Error ? error : new Error(String(error)))
    throw error
  }
  let released = false
  return {
    held,
    async waitBlocked() {
      child.stdin.write(JSON.stringify({ operation: 'wait-blocked' }) + '\n')
      const result = await read('blocked')
      return receipt(result.proof)
    },
    async release() {
      if (released) return
      released = true
      let releaseError: Error | undefined
      try {
        child.stdin.write(JSON.stringify({ operation: 'release' }) + '\n')
        await read('released')
      } catch (error) {
        releaseError = error instanceof Error ? error : new Error(String(error))
      }
      await closePreserving(releaseError)
    },
  }
}
