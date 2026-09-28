import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { promisify } from 'node:util'
import { parseXtaskJsonReceipt } from '../../scripts/xtask-receipt.mjs'

const execute = promisify(execFile)

export type ArtifactInspectionOperation = 'snapshot' | 'verify-deleted'
export type ArtifactInspectionState = 'present' | 'pending' | 'deleted'

interface ExportArtifactReceipt {
  bytes: number
  sha256: string
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value).sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function snowflakeId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[1-9][0-9]{0,18}$/u.test(value) &&
    BigInt(value) <= 9_223_372_036_854_775_807n
  )
}

export function parseArtifactInspection(
  stdout: string,
  operation: ArtifactInspectionOperation,
  expectedJobId: string,
): ArtifactInspectionState {
  const result = parseXtaskJsonReceipt(stdout)
  if (
    !hasExactKeys(result, ['job_id', 'state']) ||
    result.job_id !== expectedJobId ||
    typeof result.state !== 'string'
  ) {
    throw new Error('对象清理验收返回了无效结果')
  }
  const allowed = operation === 'snapshot' ? ['present'] : ['deleted', 'pending']
  if (!allowed.includes(result.state)) {
    throw new Error('对象清理验收返回了与操作不一致的状态')
  }
  return result.state as ArtifactInspectionState
}

export function verifyDownloadedExportContent(
  receiptJson: string,
  expectedJobId: string,
  content: Uint8Array,
): void {
  let receipt: unknown
  try {
    receipt = JSON.parse(receiptJson)
  } catch {
    throw new Error('导出对象收据不是有效 JSON')
  }
  if (
    !record(receipt) ||
    !hasExactKeys(receipt, [
      'bucket',
      'bytes',
      'database',
      'file_id',
      'job_id',
      'key',
      'scope_id',
      'server_uuid',
      'sha256',
    ]) ||
    receipt.job_id !== expectedJobId ||
    !snowflakeId(receipt.job_id) ||
    !snowflakeId(receipt.file_id) ||
    receipt.bucket !== 'exports' ||
    typeof receipt.bytes !== 'number' ||
    !Number.isSafeInteger(receipt.bytes) ||
    receipt.bytes <= 0 ||
    receipt.bytes > 64 * 1024 * 1024 ||
    typeof receipt.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(receipt.sha256) ||
    typeof receipt.database !== 'string' ||
    !/^[a-zA-Z0-9_]{1,64}$/u.test(receipt.database) ||
    typeof receipt.scope_id !== 'string' ||
    !/^[a-z0-9][a-z0-9_-]{0,46}[a-z0-9]$/u.test(receipt.scope_id) ||
    typeof receipt.server_uuid !== 'string' ||
    !/^[a-f0-9-]{36}$/u.test(receipt.server_uuid) ||
    typeof receipt.key !== 'string' ||
    !receipt.key ||
    receipt.key.split('/').some((part) => ['', '.', '..'].includes(part)) ||
    /[\\:\0]/u.test(receipt.key)
  ) {
    throw new Error('导出对象收据与本次下载不一致')
  }
  const expected: ExportArtifactReceipt = { bytes: receipt.bytes, sha256: receipt.sha256 }
  const actualSha256 = createHash('sha256').update(content).digest('hex')
  if (content.byteLength !== expected.bytes || actualSha256 !== expected.sha256) {
    throw new Error('下载内容与已核验的物理对象不一致')
  }
}

function absoluteEnvironmentPath(name: string): string {
  const value = process.env[name]?.trim()
  if (!value || !path.isAbsolute(value)) {
    throw new Error(`对象清理验收缺少绝对路径配置 ${name}`)
  }
  return path.resolve(value)
}

export function artifactInspectionArguments(
  runtime: string,
  operation: ArtifactInspectionOperation,
  jobId: string,
  receipt: string,
): string[] {
  return [
    'xtask',
    'check',
    'recovery',
    'fixture',
    'artifact',
    operation,
    '--runtime-dir',
    runtime,
    '--job-id',
    jobId,
    '--receipt',
    receipt,
  ]
}

export function artifactInspectionInvocation(
  backend: string,
  runtime: string,
  python: string,
  operation: ArtifactInspectionOperation,
  jobId: string,
  receipt: string,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return {
    executable: 'cargo',
    arguments: artifactInspectionArguments(runtime, operation, jobId, receipt),
    options: {
      cwd: backend,
      encoding: 'utf8' as const,
      env: { ...environment, RYFRAME_PYTHON: python },
      maxBuffer: 64 * 1024,
      timeout: 45_000,
      windowsHide: true,
    },
  }
}

export async function inspectExportArtifact(
  operation: ArtifactInspectionOperation,
  jobId: string,
  receipt: string,
): Promise<ArtifactInspectionState> {
  if (!snowflakeId(jobId) || !path.isAbsolute(receipt)) {
    throw new Error('对象清理验收的任务或收据路径无效')
  }
  const backend = absoluteEnvironmentPath('RYFRAME_E2E_BACKEND_DIR')
  const runtime = absoluteEnvironmentPath('RYFRAME_E2E_RUNTIME_DIR')
  const python = absoluteEnvironmentPath('RYFRAME_E2E_PYTHON')
  const invocation = artifactInspectionInvocation(
    backend,
    runtime,
    python,
    operation,
    jobId,
    path.resolve(receipt),
  )
  const { stdout } = await execute(invocation.executable, invocation.arguments, invocation.options)
  return parseArtifactInspection(stdout, operation, jobId)
}
