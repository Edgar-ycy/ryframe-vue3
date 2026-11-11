import { toolProcessEnvironment } from '../../scripts/tool-inputs.mjs'
import { loadRealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { bindWorkerTool, parseWorkerJson } from '../../scripts/worker-tool.mjs'

type WorkerOperation = 'start' | 'stop' | 'crash' | 'status'
const limit = 1024 * 1024
const uncertain = 'Worker 控制未确认完成；保留锁与收据，显式核对 status 或 reconcile，不自动重放'

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exact(value: Record<string, unknown>, fields: string[]): boolean {
  return Object.keys(value).length === fields.length && fields.every((key) => key in value)
}

function response(stdout: string, code: number, operation: WorkerOperation, scope: string) {
  let result: unknown
  try {
    result = parseWorkerJson(stdout)
  } catch {
    throw new Error(`${uncertain}；响应不是唯一字段的 JSON（exit ${code}）`)
  }
  if (!object(result)) throw new Error(uncertain)
  if (
    code === 1 &&
    exact(result, ['ok', 'error', 'message']) &&
    result.ok === false &&
    result.error === 'WorkerRejected' &&
    typeof result.message === 'string'
  ) {
    // 后端仅承诺固定守卫消息；不回显响应、stderr 或底层异常中的潜在凭据。
    throw new Error(`Worker 原生守卫拒绝操作（WorkerRejected，exit 1）；${uncertain}`)
  }
  if (code !== 0 || !exact(result, ['ok', 'result']) || result.ok !== true) {
    throw new Error(`${uncertain}；响应与退出状态不匹配（exit ${code}）`)
  }
  const receipt = result.result
  if (
    !object(receipt) ||
    receipt.scope_id !== scope ||
    receipt.operation !== operation ||
    receipt.outcome !== 'succeeded' ||
    receipt.error !== null ||
    receipt.error_type !== null ||
    (receipt.state !== 'running' && receipt.state !== 'stopped') ||
    (operation === 'start' && receipt.state !== 'running') ||
    ((operation === 'stop' || operation === 'crash') && receipt.state !== 'stopped')
  ) {
    throw new Error(`Worker 控制返回了不匹配的运行收据；${uncertain}`)
  }
  return receipt.state
}

export async function controlWorker(
  operation: WorkerOperation,
  signal?: AbortSignal,
): Promise<'running' | 'stopped'> {
  const {
    workerTool,
    backendDir: backend,
    runtimeDir: runtime,
    scopeId: scope,
  } = loadRealBrowserEnvironment()
  if (!backend || !runtime || !scope) throw new Error('Worker 测试缺少明确的后端、运行目录或 scope')
  const tool = bindWorkerTool(workerTool)
  const input = JSON.stringify({
    format_version: 1,
    kind: 'ryframe-full-stack-worker',
    operation: 'control',
    arguments: {
      backend: path.resolve(backend),
      directory: path.resolve(runtime),
      action: operation,
      timeout: 60,
    },
  })
  if (Buffer.byteLength(input) > limit) throw new Error('Worker 请求超过 1 MiB')
  try {
    signal?.throwIfAborted()
    return await new Promise<'running' | 'stopped'>((resolve, reject) => {
      let stdinFailed = false
      const child = execFile(
        tool.executable,
        ['__full-stack-worker'],
        {
          cwd: backend,
          encoding: 'utf8',
          timeout: 195_000,
          maxBuffer: limit,
          windowsHide: true,
          env: { ...toolProcessEnvironment(), APP_ENV: 'test' },
          signal,
        },
        (error, stdout) => {
          try {
            if (stdinFailed) throw new Error(`${uncertain}；stdin 传输失败`)
            if (error && (!('code' in error) || typeof error.code !== 'number')) {
              throw new Error(`${uncertain}；超时、取消或管道传输失败`)
            }
            const code = error && typeof error.code === 'number' ? error.code : 0
            resolve(response(stdout, code, operation, scope))
          } catch (failure) {
            reject(failure)
          }
        },
      )
      child.stdin?.on('error', () => {
        stdinFailed = true
        // 只终止本次控制 helper；持久 Worker 的未知结果由原生收据保留。
        child.kill()
      })
      child.stdin?.end(input)
    })
  } finally {
    tool.verifyUnchanged()
  }
}

export async function ensureWorkerRunning(): Promise<void> {
  if ((await controlWorker('status')) === 'stopped') await controlWorker('start')
}
