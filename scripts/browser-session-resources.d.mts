export type SessionResource = { kind: 'user' | 'role'; name: string; id: string }
export type SessionResourceReceipt = {
  format_version: number
  scope_id: string
  test_id: string
  tenant_id: string
  status: string
  resources: {
    kind: 'user' | 'role'
    name: string
    id?: string
    phase: string
    http_status?: number
    delete_status?: number
  }[]
}
export type SessionResources = {
  snapshot(): SessionResourceReceipt
  create<T extends { status: number; id?: unknown }>(
    kind: 'user' | 'role',
    name: string,
    run: () => Promise<T>,
  ): Promise<T>
  cleanup(remove: (resource: SessionResource) => Promise<{ status: number }>): Promise<void>
}
export function createSessionResources(options: {
  scopeId: string | undefined
  testId: string
  tenantId: string
  save: (receipt: SessionResourceReceipt) => Promise<void>
}): Promise<SessionResources>
