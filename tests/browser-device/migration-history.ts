import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const execute = promisify(execFile)
type Operation =
  'inspect' | 'plan-history' | 'historical-expired' | 'export-backup' | 'verify-cleaned'

export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('历史保留期 fixture 未返回有效对象')
  }
  return Object.fromEntries(Object.entries(value))
}

export async function migrationHistory(
  operation: Operation,
  tenant: string,
  migration: string,
  planSha256?: string,
) {
  const backend = process.env.RYFRAME_E2E_BACKEND_DIR
  const runtime = process.env.RYFRAME_E2E_RUNTIME_DIR
  const scope = process.env.RYFRAME_E2E_SCOPE_ID || process.env.APP_SCOPE_ID
  if (!backend || !runtime || !scope) throw new Error('历史保留期 fixture 缺少明确隔离运行配置')
  const { stdout } = await execute(
    process.env.RYFRAME_E2E_PYTHON || 'python',
    [
      '-X',
      'utf8',
      path.join(backend, 'scripts/full_stack_migration_history.py'),
      operation,
      '--backend-root',
      path.resolve(backend),
      '--runtime-dir',
      path.resolve(runtime),
      '--tenant',
      tenant,
      '--migration',
      migration,
      ...(planSha256 ? ['--plan-sha256', planSha256] : []),
    ],
    { timeout: 150_000, windowsHide: true },
  )
  const result = record(JSON.parse(stdout))
  if (
    result.scope_id !== scope ||
    result.tenant_id !== tenant ||
    result.migration_id !== migration
  ) {
    throw new Error('历史保留期 fixture 返回了其他运行、租户或迁移的收据')
  }
  return result
}
