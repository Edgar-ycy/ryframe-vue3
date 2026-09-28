import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const execute = promisify(execFile)
type WorkerOperation = 'start' | 'stop' | 'crash' | 'status'

export async function controlWorker(operation: WorkerOperation): Promise<'running' | 'stopped'> {
  const backend = process.env.RYFRAME_E2E_BACKEND_DIR
  const runtime = process.env.RYFRAME_E2E_RUNTIME_DIR
  const scope = process.env.RYFRAME_E2E_SCOPE_ID || process.env.APP_SCOPE_ID
  if (!backend || !runtime || !scope) throw new Error('Worker 测试缺少明确的后端、运行目录或 scope')
  const { stdout } = await execute(
    process.env.RYFRAME_E2E_PYTHON || 'python',
    [
      path.join(backend, 'scripts/full_stack_worker.py'),
      operation,
      '--backend-root',
      path.resolve(backend),
      '--runtime-dir',
      path.resolve(runtime),
    ],
    { timeout: 75_000, windowsHide: true },
  )
  const result: unknown = JSON.parse(stdout)
  if (
    typeof result !== 'object' ||
    result === null ||
    !('scope_id' in result) ||
    result.scope_id !== scope ||
    !('operation' in result) ||
    result.operation !== operation ||
    !('state' in result) ||
    (result.state !== 'running' && result.state !== 'stopped')
  ) {
    throw new Error('Worker 控制返回了不匹配的运行收据')
  }
  return result.state
}

export async function ensureWorkerRunning(): Promise<void> {
  if ((await controlWorker('status')) === 'stopped') await controlWorker('start')
}
