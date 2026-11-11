import { EventEmitter, once } from 'node:events'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { holdMigrationGate } from '../support/migration-gate'
import { bindWorkerTool } from '../../scripts/worker-tool.mjs'

vi.mock('../../scripts/worker-tool.mjs', () => ({ bindWorkerTool: vi.fn() }))

const toolRoot = path.resolve('.local-tests', '工具来源 N')
const executable = path.join(toolRoot, 'verified-tool.exe')
const verifyUnchanged = vi.fn()
beforeEach(() => {
  verifyUnchanged.mockReset()
  vi.mocked(bindWorkerTool).mockReturnValue({ executable, verifyUnchanged })
})

const tenant = 'tenant-1'
const migration = 'migration-1'
const backend = path.resolve('.local-tests', '迁移 gate', 'backend root')
const runtime = path.resolve('.local-tests', '迁移 gate', 'runtime root')
const binding = {
  backendDir: backend,
  runtimeDir: runtime,
  scopeId: 'scope-1',
  workerTool: {
    root: toolRoot,
    binding: {
      path: path.join(toolRoot, '.local-tests', 'frontend-origin-tool.json'),
      bytes: 2,
      sha256: 'a'.repeat(64),
    },
  },
}

type SpawnOptions = { cwd: string; env: NodeJS.ProcessEnv; stdio: 'pipe'; windowsHide: true }

class FakeMigrationGateProcess extends EventEmitter {
  readonly stdin = new PassThrough()
  readonly stdout = new PassThrough()
  readonly stderr = new PassThrough()
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  readonly killSignals: Array<NodeJS.Signals | number | undefined> = []
  releaseRequests = 0
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
        scope_id: binding.scopeId,
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
        child.releaseRequests += 1
        child.receipt('released')
      }
    })
    queueMicrotask(() => child.receipt('held', initial))
    return child
  }
}

describe('业务迁移 gate 进程生命周期', () => {
  it('绑定 N 程序与 O 运行目录并等待正常 close 后完成全部并发释放', async () => {
    const child = new FakeMigrationGateProcess()
    const captured: { arguments?: string[]; command?: string; options?: SpawnOptions } = {}
    const gate = await holdMigrationGate(tenant, migration, {
      binding,
      environment: { PATH: 'fixed-path', APP_ENV: 'prod', APP_PASSWORD: 'must-not-pass' },
      spawnProcess: spawnFixture(child, captured),
    })
    expect(bindWorkerTool).toHaveBeenCalledWith(binding.workerTool)
    expect(captured.command).toBe(executable)
    expect(captured.arguments).toEqual([
      'check',
      'recovery',
      'fixture',
      'retention',
      'hold-copy',
      '--runtime-dir',
      runtime,
      '--tenant',
      tenant,
      '--migration',
      migration,
    ])
    expect(captured.options).toEqual({
      cwd: backend,
      env: { PATH: 'fixed-path', APP_ENV: 'test' },
      stdio: 'pipe',
      windowsHide: true,
    })

    const finished = once(child.stdin, 'finish')
    let settled = false
    const firstRelease = gate.release()
    const secondRelease = gate.release()
    const releasing = Promise.all([firstRelease, secondRelease]).finally(() => (settled = true))
    await finished
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(verifyUnchanged).not.toHaveBeenCalled()
    child.close()
    await releasing
    await gate.release()
    expect(child.releaseRequests).toBe(1)
    expect(child.killSignals).toEqual([])
    expect(verifyUnchanged).toHaveBeenCalledTimes(1)
  })

  it('来源绑定拒绝时不创建迁移 gate 子进程', async () => {
    const failure = new Error('来源绑定拒绝')
    vi.mocked(bindWorkerTool).mockImplementationOnce(() => {
      throw failure
    })
    const spawnProcess = vi.fn()
    await expect(holdMigrationGate(tenant, migration, { binding, spawnProcess })).rejects.toBe(
      failure,
    )
    expect(spawnProcess).not.toHaveBeenCalled()
  })

  it('正常回收后来源漂移仍拒绝，且不重放释放请求', async () => {
    const child = new FakeMigrationGateProcess()
    const drift = new Error('来源已漂移')
    child.stdin.once('finish', () => child.close())
    verifyUnchanged.mockImplementationOnce(() => {
      expect(child.closed).toBe(true)
      throw drift
    })
    const gate = await holdMigrationGate(tenant, migration, {
      binding,
      spawnProcess: spawnFixture(child),
    })
    await expect(gate.release()).rejects.toBe(drift)
    expect(child.releaseRequests).toBe(1)
  })

  it('宽限期结束后强制停止，并等待 close 完成后再报告超时', async () => {
    const child = new FakeMigrationGateProcess()
    child.onKill = () => setTimeout(() => child.close(null, 'SIGKILL'), 10)
    const gate = await holdMigrationGate(tenant, migration, {
      binding,
      environment: {},
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
      binding,
      environment: {},
      spawnProcess: spawnFixture(child),
    })

    await expect(gate.release()).rejects.toThrow('迁移 gate 已退出（17）')
    expect(child.killSignals).toEqual([])
  })

  it('强制停止未收敛时允许后续 release 再次受限回收并固定终态', async () => {
    const child = new FakeMigrationGateProcess()
    let killCount = 0
    child.onKill = () => {
      killCount += 1
      if (killCount === 2) queueMicrotask(() => child.close(null, 'SIGKILL'))
    }
    const gate = await holdMigrationGate(tenant, migration, {
      binding,
      environment: {},
      forceCloseTimeoutMs: 5,
      gracefulCloseTimeoutMs: 5,
      spawnProcess: spawnFixture(child),
    })

    const firstRelease = gate.release()
    await expect(firstRelease).rejects.toThrow('迁移 gate 强制关闭后仍未退出')
    expect(child.killSignals).toEqual(['SIGKILL'])
    expect(child.closed).toBe(false)

    const secondRelease = gate.release()
    await expect(secondRelease).rejects.toThrow('迁移 gate 关闭超时')
    expect(child.killSignals).toEqual(['SIGKILL', 'SIGKILL'])
    expect(child.closed).toBe(true)
    expect(child.releaseRequests).toBe(1)

    const terminalRelease = gate.release()
    await expect(terminalRelease).rejects.toThrow('迁移 gate 关闭超时')
  })

  it.each(['stdin', 'stdout', 'stderr'] as const)(
    '保留 release 收据后的 %s transport error',
    async (stream) => {
      const child = new FakeMigrationGateProcess()
      const transportError = new Error(`${stream} transport failed`)
      child.stdin.once('finish', () => {
        child[stream].emit('error', transportError)
        child.close()
      })
      const gate = await holdMigrationGate(tenant, migration, {
        binding,
        environment: {},
        spawnProcess: spawnFixture(child),
      })

      await expect(gate.release()).rejects.toBe(transportError)
      expect(child.killSignals).toEqual([])
    },
  )

  it('初始化协议失败时完成强制回收并同时保留原始错误', async () => {
    const child = new FakeMigrationGateProcess()
    child.onKill = () => queueMicrotask(() => child.close(null, 'SIGKILL'))
    const drift = new Error('来源已漂移')
    verifyUnchanged.mockImplementationOnce(() => {
      expect(child.closed).toBe(true)
      throw drift
    })

    let failure: unknown
    try {
      await holdMigrationGate(tenant, migration, {
        binding,
        environment: {},
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
    expect(failure.errors).toContain(drift)
    expect(child.closed).toBe(true)
  })
})
