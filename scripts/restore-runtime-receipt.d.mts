export interface RestoreRuntimeExpectation {
  authority: RestoreRuntimeAuthority
  builds: {
    backend: RestoreDocumentDescriptor
    frontend: RestoreDocumentDescriptor
  }
  roots: {
    execution_backend: string
    frontend: string
    source_backend: string
  }
}

export interface RestoreDocumentDescriptor {
  bytes: number
  path: string
  sha256: string
}

export interface RestoreRuntimeAuthority {
  api_endpoint: string
  backend_adapter_contract: string | null
  backend_execution_sha: string
  backend_product_sha: string
  backup_id: string
  backup_source_sha: string
  data_verified_at: string
  format_version: 2
  frontend_endpoint: string
  frontend_sha: string
  kind: 'restore-runtime-authority'
  plan_hash: string
  restore_id: string
  scope_id: string
  worker_endpoint: string
}

export function isRestoreIdentifier(value: unknown): value is string
export function isResourceScopeId(value: unknown): value is string

export function restoreRuntimeBinding(input: {
  frontendEndpoint: string
  manifest: Record<string, unknown>
  record: Record<string, unknown>
  targetPlanBytes: Uint8Array
}): Readonly<RestoreRuntimeExpectation>

export function inspectRestoreRuntimeReceipt(input: {
  bindingsBytes: Uint8Array
  bytes: Uint8Array
  expected: RestoreRuntimeExpectation
}): Readonly<{ digest: string; receipt: Record<string, unknown> }>

export function verifyRestoreRuntimeReceipt(input: {
  bindingsBytes: Uint8Array
  bytes: Uint8Array
  expected: RestoreRuntimeExpectation
  verifiedDigest: string
}): Readonly<{ digest: string; receipt: Record<string, unknown> }>
