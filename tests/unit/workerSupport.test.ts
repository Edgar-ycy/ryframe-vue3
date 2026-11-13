import path from 'node:path'
import { PassThrough } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { controlWorker, ensureWorkerRunning } from '../browser-real/worker-support'

const mocked = vi.hoisted(() => ({
  execute: vi.fn(),
  bind: vi.fn(),
  verify: vi.fn(),
  environment: vi.fn(),
}))
vi.mock('node:child_process', async (original) => ({
  ...(await original<object>()),
  execFile: mocked.execute,
}))
vi.mock('../../scripts/worker-tool.mjs', async (original) => ({
  ...(await original<object>()),
  bindWorkerTool: mocked.bind,
}))
vi.mock('../../scripts/real-browser-environment.mjs', async (original) => ({
  ...(await original<object>()),
  loadRealBrowserEnvironment: mocked.environment,
}))

const backend = path.resolve('.local-tests/Worker 中文/backend root')
const runtime = path.resolve('.local-tests/Worker 中文/runtime root')
const toolRoot = path.resolve('.local-tests/Worker 中文/tool source N')
const executable = path.join(toolRoot, 'xtask.exe')
const workerTool = {
  root: toolRoot,
  binding: {
    path: path.join(toolRoot, '.local-tests/frontend-origin-tool.json'),
    bytes: 128,
    sha256: 'a'.repeat(64),
  },
}
const scope = 'worker-caller-test'
const secret = 'private-token-must-not-appear'

function receipt(operation = 'status', state = 'running', changes = {}) {
  return {
    ok: true,
    result: {
      operation,
      scope_id: scope,
      state,
      outcome: 'succeeded',
      error: null,
      error_type: null,
      ...changes,
    },
  }
}

function respond(value: unknown, error: object | null = null) {
  let input = ''
  mocked.execute.mockImplementation((_file, _args, _options, callback) => {
    const stdin = new PassThrough()
    stdin.on('data', (chunk: Buffer) => (input += chunk.toString()))
    stdin.on('finish', () =>
      queueMicrotask(() =>
        callback(error, typeof value === 'string' ? value : JSON.stringify(value)),
      ),
    )
    return { stdin }
  })
  return () => JSON.parse(input)
}

beforeEach(() => {
  mocked.bind.mockReturnValue({ root: workerTool.root, executable, verifyUnchanged: mocked.verify })
  mocked.environment.mockReturnValue({
    workerTool,
    backendDir: backend,
    runtimeDir: runtime,
    scopeId: scope,
  })
})

describe('浏览器 Worker 原生调用', () => {
  it.each([
    ['start', 'running'],
    ['stop', 'stopped'],
    ['crash', 'stopped'],
    ['status', 'running'],
    ['status', 'stopped'],
  ] as const)('%s 使用正式绑定、有界 stdin 和隔离环境', async (operation, state) => {
    const input = respond(receipt(operation, state))
    expect(await controlWorker(operation)).toBe(state)
    expect(mocked.bind).toHaveBeenCalledWith(workerTool)
    expect(mocked.execute).toHaveBeenCalledWith(
      executable,
      ['__full-stack-worker'],
      expect.objectContaining({
        cwd: backend,
        timeout: 195_000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        env: expect.objectContaining({ APP_ENV: 'test' }),
      }),
      expect.any(Function),
    )
    expect(input()).toEqual({
      format_version: 1,
      kind: 'ryframe-full-stack-worker',
      operation: 'control',
      arguments: { backend, directory: runtime, action: operation, timeout: 60 },
    })
    expect(mocked.verify).toHaveBeenCalledOnce()
  })

  it.each([
    receipt('stop'),
    receipt('status', 'unknown'),
    receipt('status', 'running', { scope_id: 'old-scope' }),
    receipt('status', 'running', { outcome: 'failed' }),
    receipt('status', 'running', { error: secret }),
    receipt('status', 'running', { error_type: 'failure' }),
    { ok: true, result: [] },
    { ok: true, result: receipt().result, extra: true },
    { ok: false },
    'invalid JSON',
    '{"ok":false,"ok":true,"result":{}}',
  ])('无效协议或收据失败关闭且不重试', async (value) => {
    respond(value)
    await expect(controlWorker('status')).rejects.toThrow(/不自动重放/u)
    expect(mocked.execute).toHaveBeenCalledOnce()
    expect(mocked.verify).toHaveBeenCalledOnce()
  })

  it.each([
    ['start', 'stopped'],
    ['stop', 'running'],
    ['crash', 'running'],
  ] as const)('拒绝 %s 的错误目标状态', async (operation, state) => {
    respond(receipt(operation, state))
    await expect(controlWorker(operation)).rejects.toThrow('不匹配的运行收据')
  })

  it('守卫失败保留类别和退出状态，但不回显潜在凭据', async () => {
    respond({ ok: false, error: 'WorkerRejected', message: secret }, { code: 1 })
    await expect(controlWorker('start')).rejects.toThrow('WorkerRejected，exit 1')
    await expect(controlWorker('start')).rejects.not.toThrow(secret)
  })

  it('成功响应与非零退出不匹配时拒绝', async () => {
    respond(receipt(), { code: 17, message: secret })
    await expect(controlWorker('status')).rejects.toThrow('exit 17')
  })

  it.each(['ETIMEDOUT', 'ABORT_ERR', 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', 'ENOENT'])(
    '传输失败 %s 保留未知结果并脱敏',
    async (code) => {
      respond(secret, { code, message: secret, stderr: secret })
      await expect(controlWorker('start')).rejects.toThrow('超时、取消或管道传输失败')
      expect(mocked.execute).toHaveBeenCalledOnce()
      expect(mocked.verify).toHaveBeenCalledOnce()
    },
  )

  it('调用传入取消信号，已取消则不启动进程', async () => {
    const controller = new AbortController()
    respond(receipt())
    await controlWorker('status', controller.signal)
    expect(mocked.execute.mock.calls[0][2].signal).toBe(controller.signal)
    mocked.execute.mockClear()
    controller.abort()
    await expect(controlWorker('start', controller.signal)).rejects.toThrow()
    expect(mocked.execute).not.toHaveBeenCalled()
  })

  it('stdin 错误同样不重试并复核工具', async () => {
    mocked.execute.mockImplementation((_file, _args, _options, callback) => {
      const stdin = new PassThrough()
      queueMicrotask(() => stdin.emit('error', new Error(secret)))
      return { stdin, kill: () => queueMicrotask(() => callback({ code: null }, '')) }
    })
    await expect(controlWorker('start')).rejects.toThrow('stdin 传输失败')
    expect(mocked.execute).toHaveBeenCalledOnce()
    expect(mocked.verify).toHaveBeenCalledOnce()
  })

  it('缺少或漂移的正式绑定禁止编译回退', async () => {
    mocked.bind.mockImplementation(() => {
      throw new Error('正式绑定缺失')
    })
    await expect(controlWorker('start')).rejects.toThrow('正式绑定缺失')
    expect(mocked.execute).not.toHaveBeenCalled()
  })

  it('调用后工具漂移覆盖成功结果', async () => {
    respond(receipt())
    mocked.verify.mockImplementation(() => {
      throw new Error('正式工具漂移')
    })
    await expect(controlWorker('status')).rejects.toThrow('正式工具漂移')
  })

  it('仅已确认停止时启动，状态未知不能进入启动', async () => {
    respond(receipt('status', 'stopped'))
    mocked.execute.mockImplementationOnce((_file, _args, _options, callback) => {
      const stdin = new PassThrough()
      stdin.on('finish', () => callback(null, JSON.stringify(receipt('status', 'stopped'))))
      return { stdin }
    })
    mocked.execute.mockImplementationOnce((_file, _args, _options, callback) => {
      const stdin = new PassThrough()
      stdin.on('finish', () => callback(null, JSON.stringify(receipt('start'))))
      return { stdin }
    })
    await ensureWorkerRunning()
    expect(mocked.execute).toHaveBeenCalledTimes(2)
    mocked.execute.mockClear()
    respond(receipt('status', 'unknown'))
    await expect(ensureWorkerRunning()).rejects.toThrow()
    expect(mocked.execute).toHaveBeenCalledOnce()
  })
})
