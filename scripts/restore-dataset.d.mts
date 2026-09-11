export interface RestoreLineageTenant {
  tenant_id: string
  username: string
  password_env: string
  posts: { id: string; code: string; name: string }[]
  files: { file_path: string; bytes: number; sha256: string }[]
}

export interface RestoreDatasetLineageDocument {
  tenants: RestoreLineageTenant[]
  scale: { post_samples: number; business_objects: number }
  scopes: { origin_tenant_scope_id: string }
  verification: { request_interval_ms: number }
  [key: string]: unknown
}

export interface RestoreFileDescriptor {
  path: string
  bytes: number
  sha256: string
}

export interface RestoreDatasetAuthorityRecord {
  format_version: 1
  kind: 'restore-dataset-authority'
  runtime: Readonly<RestoreFileDescriptor>
  target_plan: Readonly<RestoreFileDescriptor>
  source_generation: Readonly<RestoreFileDescriptor>
  dataset_lineage: Readonly<RestoreFileDescriptor>
  target: Readonly<{ scope_id: string; api_url: string; frontend_url: string }>
  execution_backend: string
}

export interface VerifiedRestoreDatasetAuthority {
  authority: Readonly<RestoreDatasetAuthorityRecord>
  lineage: Readonly<RestoreDatasetLineageDocument>
}

export interface RestoreDatasetVerification {
  format_version: 1
  kind: 'restore-target-existing-verification'
  status: 'target_existing_data_verified'
  scope_id: string
  source_scope_id: string
  actions: { business: 'read_only'; objects: 'read_only'; session: 'login_logout' }
  restore_success: false
  tenants: number
  posts: number
  files: number
}

export function datasetDigest(bytes: string | Uint8Array): string
export function restoreDatasetAuthority(value: unknown): Readonly<RestoreDatasetAuthorityRecord>
export function restoreDatasetEvidence(value: unknown): Readonly<VerifiedRestoreDatasetAuthority>
export function verifyRestoreDatasetAuthority(
  input: {
    backendRoot: string
    bindingsBytes: Uint8Array
    frontendEndpoint: string
    python: string
    runtimeReceipt: string
    targetPlan: string
  },
  options?: { expected?: RestoreDatasetAuthorityRecord },
): Readonly<VerifiedRestoreDatasetAuthority>
export function verifyRestoredDataset(input: {
  authority: VerifiedRestoreDatasetAuthority
  verifierRoot: string
}): Promise<Readonly<RestoreDatasetVerification>>
