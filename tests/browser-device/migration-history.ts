import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { parseXtaskJsonReceipt } from '../support/xtask-receipt'

const execute = promisify(execFile)
type Operation =
  'inspect' | 'plan-history' | 'historical-expired' | 'export-backup' | 'verify-cleaned'
const writeOperations = new Set<Operation>(['historical-expired', 'export-backup'])

interface MigrationHistoryInvocation {
  executable: 'cargo'
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
    'xtask',
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

function absoluteEnvironmentPath(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim()
  if (!value || !path.isAbsolute(value)) {
    throw new Error(`历史保留期 fixture 缺少绝对路径配置 ${name}`)
  }
  return path.resolve(value)
}

function invocation(
  backend: string,
  runtime: string,
  python: string,
  operation: Operation,
  tenant: string,
  migration: string,
  planSha256: string | undefined,
  environment: NodeJS.ProcessEnv,
): MigrationHistoryInvocation {
  return {
    executable: 'cargo',
    arguments: migrationHistoryArguments(runtime, operation, tenant, migration, planSha256),
    options: {
      cwd: backend,
      encoding: 'utf8',
      env: { ...environment, RYFRAME_PYTHON: python },
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
  const scope = environment.RYFRAME_E2E_SCOPE_ID || environment.APP_SCOPE_ID
  if (!scope) throw new Error('历史保留期 fixture 缺少明确隔离运行配置')
  const backend = absoluteEnvironmentPath(environment, 'RYFRAME_E2E_BACKEND_DIR')
  const runtime = absoluteEnvironmentPath(environment, 'RYFRAME_E2E_RUNTIME_DIR')
  const python = absoluteEnvironmentPath(environment, 'RYFRAME_E2E_PYTHON')
  const command = invocation(
    backend,
    runtime,
    python,
    operation,
    tenant,
    migration,
    planSha256,
    environment,
  )
  const stdout = await (dependencies.execute ?? executeInvocation)(command)
  return parseMigrationHistoryReceipt(stdout, scope, tenant, migration)
}
