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

export interface RestoredDatasetLineage {
  lineage: RestoreDatasetLineageDocument
  sourceGeneration: Readonly<RestoreFileDescriptor>
  sourceRuntime: Readonly<RestoreFileDescriptor>
  datasetLineage: Readonly<RestoreFileDescriptor>
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
export function restoredDatasetLineage(targetPlanBytes: Uint8Array): RestoredDatasetLineage
export function verifyRestoredDataset(input: {
  bindingsBytes: Uint8Array
  targetPlanBytes: Uint8Array
  frontendEndpoint: string
  verifierRoot: string
  lineage: RestoreDatasetLineageDocument
}): Promise<Readonly<RestoreDatasetVerification>>
