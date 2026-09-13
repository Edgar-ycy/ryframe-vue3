import { EventEmitter, once } from 'node:events'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { holdMigrationGate } from '../browser-device/migration-gate'

const tenant = 'tenant-1'
const migration = 'migration-1'
const backend = path.resolve('.local-tests', '迁移 gate', 'backend root')
const runtime = path.resolve('.local-tests', '迁移 gate', 'runtime root')
const environment = {
  RYFRAME_E2E_BACKEND_DIR: backend,
  RYFRAME_E2E_PYTHON: 'python-fixture',
  RYFRAME_E2E_RUNTIME_DIR: runtime,
  RYFRAME_E2E_SCOPE_ID: 'scope-1',
}

type SpawnOptions = { env: NodeJS.ProcessEnv; stdio: 'pipe'; windowsHide: true }

class FakeMigrationGateProcess extends EventEmitter {
  readonly stdin = new PassThrough()
  readonly stdout = new PassThrough()
  readonly stderr = new PassThrough()
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  readonly killSignals: Array<NodeJS.Signals | number | undefined> = []
  onKill: (() => void) | undefined
  closed = false

  kill(signal?: NodeJS.Signals | number): boolean {
    this.killSignals.push(signal)
    this.onKill?.()
    return true
  }

  close(code: number | null = 0, signal: NodeJS.Signals | null = null): void {
    if (this.closed) return
    this.closed = true
    this.exitCode = code
    this.signalCode = signal
    this.stdout.end()
    this.stderr.end()
    this.emit('close', code, signal)
  }

  receipt(state: string, extra: Record<string, unknown> = {}): void {
    this.stdout.write(
      JSON.stringify({
        migration_id: migration,
        scope_id: environment.RYFRAME_E2E_SCOPE_ID,
        state,
        tenant_id: tenant,
        ...extra,
      }) + '\n',
    )
  }
}

function spawnFixture(
  child: FakeMigrationGateProcess,
  captured: { arguments?: string[]; command?: string; options?: SpawnOptions } = {},
  initial: Record<string, unknown> = {},
) {
  return (command: string, arguments_: string[], options: SpawnOptions) => {
    captured.command = command
    captured.arguments = arguments_
    captured.options = options
    child.stdin.on('data', (chunk: Buffer) => {
      if (chunk.toString('utf8').includes('"operation":"release"')) {
        child.receipt('released')
      }
    })
    queueMicrotask(() => child.receipt('held', initial))
    return child
  }
}

describe('Device 迁移 gate 进程生命周期', () => {
  it('传递固定调用参数并等待正常 close 后才完成释放', async () => {
    const child = new FakeMigrationGateProcess()
    const captured: { arguments?: string[]; command?: string; options?: SpawnOptions } = {}
    const gate = await holdMigrationGate(tenant, migration, {
      environment,
      spawnProcess: spawnFixture(child, captured),
    })
    expect(captured.command).toBe('python-fixture')
    expect(captured.arguments).toEqual([
      '-X',
      'utf8',
      '-u',
      path.join(backend, 'scripts/full_stack_migration_gate.py'),
      '--backend-root',
      backend,
      '--runtime-dir',
      runtime,
      '--tenant',
      tenant,
      '--migration',
      migration,
    ])
    expect(captured.options).toEqual({ env: environment, stdio: 'pipe', windowsHide: true })

    const finished = once(child.stdin, 'finish')
    let settled = false
    const releasing = gate.release().finally(() => (settled = true))
    await finished
    await Promise.resolve()
    expect(settled).toBe(false)
    child.close()
    await releasing
    expect(child.killSignals).toEqual([])
  })

  it('宽限期结束后强制停止，并等待 close 完成后再报告超时', async () => {
    const child = new FakeMigrationGateProcess()
    child.onKill = () => setTimeout(() => child.close(null, 'SIGKILL'), 10)
    const gate = await holdMigrationGate(tenant, migration, {
      environment,
      forceCloseTimeoutMs: 100,
      gracefulCloseTimeoutMs: 5,
      spawnProcess: spawnFixture(child),
    })

    await expect(gate.release()).rejects.toThrow('迁移 gate 关闭超时')
    expect(child.killSignals).toEqual(['SIGKILL'])
    expect(child.closed).toBe(true)
  })

  it('已经发布 release 收据后仍保留 helper 的非零退出状态', async () => {
    const child = new FakeMigrationGateProcess()
    child.stdin.once('finish', () => child.close(17))
    const gate = await holdMigrationGate(tenant, migration, {
      environment,
      spawnProcess: spawnFixture(child),
    })

    await expect(gate.release()).rejects.toThrow('迁移 gate 已退出（17）')
    expect(child.killSignals).toEqual([])
  })

  it('强制停止后仍未 close 时明确失败，不把 helper 当作已回收', async () => {
    const child = new FakeMigrationGateProcess()
    const gate = await holdMigrationGate(tenant, migration, {
      environment,
      forceCloseTimeoutMs: 5,
      gracefulCloseTimeoutMs: 5,
      spawnProcess: spawnFixture(child),
    })

    await expect(gate.release()).rejects.toThrow('迁移 gate 强制关闭后仍未退出')
    expect(child.killSignals).toEqual(['SIGKILL'])
    expect(child.closed).toBe(false)
  })

  it('初始化协议失败时完成强制回收并同时保留原始错误', async () => {
    const child = new FakeMigrationGateProcess()
    child.onKill = () => queueMicrotask(() => child.close(null, 'SIGKILL'))

    let failure: unknown
    try {
      await holdMigrationGate(tenant, migration, {
        environment,
        forceCloseTimeoutMs: 100,
        gracefulCloseTimeoutMs: 5,
        spawnProcess: spawnFixture(child, {}, { scope_id: 'wrong-scope' }),
      })
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(AggregateError)
    if (!(failure instanceof AggregateError)) throw failure
    expect(failure.errors[0]).toHaveProperty(
      'message',
      '迁移 gate 收据与当前 scope、租户、任务或阶段不匹配',
    )
    expect(failure.errors[1]).toHaveProperty('message', '迁移 gate 关闭超时')
    expect(child.closed).toBe(true)
  })
})
