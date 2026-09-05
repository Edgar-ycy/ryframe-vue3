export interface RestoredTenant {
  tenant_id: string
  username: string
  password_env: string
  records: number
  posts: { id: string; code: string; name: string }[]
  files: { file_path: string; bytes: number; sha256: string }[]
}
export interface RestoredDataset {
  tenants: RestoredTenant[]
  records: number
  object_bytes: number
}
export function datasetDigest(bytes: string | Uint8Array): string
export function restoredDataset(
  datasetBytes: Uint8Array,
  planBytes: Uint8Array,
  bindingBytes: Uint8Array,
): RestoredDataset

export function restoredExistingVerification(
  result: unknown,
  datasetBytes: Uint8Array,
  planBytes: Uint8Array,
  bindingBytes: Uint8Array,
): void
