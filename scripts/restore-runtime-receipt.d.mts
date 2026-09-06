export interface RestoreRuntimeExpectation {
  apiEndpoint: string
  backendSha: string
  backupId: string
  dataVerifiedAt: string
  frontendSha: string
  planHash: string
  restoreId: string
  scopeId: string
  workerEndpoint: string
}

export function isRestoreIdentifier(value: unknown): value is string
export function isResourceScopeId(value: unknown): value is string

export function verifyRestoreRuntimeReceipt(input: {
  bindingsBytes: Uint8Array
  bytes: Uint8Array
  expected: RestoreRuntimeExpectation
  verifiedDigest: string
}): Readonly<{ digest: string; receipt: Record<string, unknown> }>
