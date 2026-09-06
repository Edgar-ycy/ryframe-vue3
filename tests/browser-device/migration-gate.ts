import { spawn } from 'node:child_process'
import path from 'node:path'
import { createInterface } from 'node:readline'

type Receipt = Record<string, unknown>

function receipt(value: unknown): Receipt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('迁移 gate 未返回对象收据')
  }
  return Object.fromEntries(Object.entries(value))
}

export async function holdMigrationGate(tenant: string, migration: string) {
  const backend = process.env.RYFRAME_E2E_BACKEND_DIR
  const runtime = process.env.RYFRAME_E2E_RUNTIME_DIR
  const scope = process.env.RYFRAME_E2E_SCOPE_ID || process.env.APP_SCOPE_ID
  if (!backend || !runtime || !scope) throw new Error('迁移 gate 缺少隔离运行配置')
  const child = spawn(
    process.env.RYFRAME_E2E_PYTHON || 'python',
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
    { stdio: 'pipe', windowsHide: true },
  )
  const lines: string[] = []
  let failure: Error | undefined
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
    failure = error
    pending?.reject(error)
  }
  child.on('error', failed)
  child.stdin.on('error', failed)
  const exited = new Promise<void>((resolve) => {
    child.once('close', (code) => {
      failed(new Error(`迁移 gate 已退出（${code}）：${errors}`))
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

  async function close() {
    child.stdin.end()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        exited,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('迁移 gate 关闭超时')), 15_000)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
      // 仅回收此函数创建的 helper；关闭管道使它的 MySQL 事务连接随 EOF 回滚。
      if (child.exitCode === null && child.signalCode === null) child.kill()
      input.close()
    }
  }

  let held: Receipt
  try {
    held = await read('held')
  } catch (error) {
    await close()
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
      try {
        child.stdin.write(JSON.stringify({ operation: 'release' }) + '\n')
        await read('released')
      } finally {
        await close()
      }
    },
  }
}
