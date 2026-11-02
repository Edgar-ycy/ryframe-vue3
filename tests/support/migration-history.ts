import { toolProcessEnvironment } from '../../scripts/tool-inputs.mjs'
import { loadRealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'
import type { RealBrowserEnvironment } from '../../scripts/real-browser-environment.mjs'
import { bindWorkerTool } from '../browser-real/worker-tool.mjs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseXtaskJsonReceipt } from '../../scripts/xtask-receipt.mjs'

const execute = promisify(execFile)
type Operation =
  'inspect' | 'plan-history' | 'historical-expired' | 'export-backup' | 'verify-cleaned'
const writeOperations = new Set<Operation>(['historical-expired', 'export-backup'])

interface MigrationHistoryInvocation {
  executable: string
  arguments: string[]
  options: {
    cwd: string
    encoding: 'utf8'
    env: NodeJS.ProcessEnv
    maxBuffer: number
    timeout: number
    windowsHide: true
  }
}

interface MigrationHistoryDependencies {
  binding?: Pick<RealBrowserEnvironment, 'backendDir' | 'runtimeDir' | 'scopeId' | 'workerTool'>
  environment?: NodeJS.ProcessEnv
  execute?: (invocation: MigrationHistoryInvocation) => Promise<string>
}

export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('历史保留期 fixture 未返回有效对象')
  }
  return Object.fromEntries(Object.entries(value))
}

export function migrationHistoryArguments(
  runtime: string,
  operation: Operation,
  tenant: string,
  migration: string,
  planSha256?: string,
): string[] {
  return [
    'check',
    'recovery',
    'fixture',
    'retention',
    operation,
    '--runtime-dir',
    runtime,
    '--tenant',
    tenant,
    '--migration',
    migration,
    ...(planSha256 ? ['--plan-sha256', planSha256] : []),
    ...(writeOperations.has(operation) ? ['--write'] : []),
  ]
}

function invocation(
  executable: string,
  backend: string,
  runtime: string,
  operation: Operation,
  tenant: string,
  migration: string,
  planSha256: string | undefined,
  environment: NodeJS.ProcessEnv,
): MigrationHistoryInvocation {
  return {
    executable,
    arguments: migrationHistoryArguments(runtime, operation, tenant, migration, planSha256),
    options: {
      cwd: backend,
      encoding: 'utf8',
      env: { ...toolProcessEnvironment(environment), APP_ENV: 'test' },
      maxBuffer: 256 * 1024,
      timeout: 150_000,
      windowsHide: true,
    },
  }
}

async function executeInvocation(value: MigrationHistoryInvocation): Promise<string> {
  const { stdout } = await execute(value.executable, value.arguments, value.options)
  return stdout
}

export function parseMigrationHistoryReceipt(
  stdout: string,
  scope: string,
  tenant: string,
  migration: string,
): Record<string, unknown> {
  const result = parseXtaskJsonReceipt(stdout)
  if (
    result.scope_id !== scope ||
    result.tenant_id !== tenant ||
    result.migration_id !== migration
  ) {
    throw new Error('历史保留期 fixture 返回了其他运行、租户或迁移的收据')
  }
  return result
}

export async function migrationHistory(
  operation: Operation,
  tenant: string,
  migration: string,
  planSha256?: string,
  dependencies: MigrationHistoryDependencies = {},
): Promise<Record<string, unknown>> {
  const environment = dependencies.environment ?? process.env
  const binding = dependencies.binding ?? loadRealBrowserEnvironment()
  const scope = binding.scopeId
  if (!scope) throw new Error('历史保留期 fixture 缺少明确隔离运行配置')
  const backend = binding.backendDir
  const runtime = binding.runtimeDir
  const tool = bindWorkerTool(binding.workerTool)
  const command = invocation(
    tool.executable,
    backend,
    runtime,
    operation,
    tenant,
    migration,
    planSha256,
    environment,
  )
  let outcome: { ok: true; value: Record<string, unknown> } | { ok: false; error: unknown }
  try {
    const stdout = await (dependencies.execute ?? executeInvocation)(command)
    outcome = { ok: true, value: parseMigrationHistoryReceipt(stdout, scope, tenant, migration) }
  } catch (error) {
    outcome = { ok: false, error }
  }
  try {
    tool.verifyUnchanged()
  } catch (error) {
    if (!outcome.ok) {
      throw new AggregateError([outcome.error, error], '迁移历史执行与工具来源核验均失败', {
        cause: error,
      })
    }
    throw error
  }
  if (!outcome.ok) throw outcome.error
  return outcome.value
}
