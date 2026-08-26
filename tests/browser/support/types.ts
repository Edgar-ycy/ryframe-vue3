export interface ExportJobFixture {
  completed_at?: string | null
  content_type?: string | null
  created_at: string
  error_message?: string | null
  expires_at?: string | null
  file_size?: number | null
  id: string
  matched_rows: number
  notification_read_at?: string | null
  resource: string
  result_file_name?: string | null
  snapshot_at: string
  status: string
  updated_at: string
}

export interface PostFixture {
  code: string
  created_at: string
  id: string
  name: string
  remark: string | null
  sort: number
  status: string
}

export interface RequestContext {
  authorization?: string
  tenantId?: string
}

export interface ApiFixtureState {
  deletionBodies: unknown[]
  exportBodies: unknown[]
  postCreateBodies: unknown[]
  postDeleteIds: string[]
  postExportBodies: unknown[]
  postRequestContexts: RequestContext[]
  postUpdateBodies: unknown[]
  tenantRequestContexts: RequestContext[]
}

export interface ApiFixtureOptions {
  multiTenancyEnabled?: boolean
  tenantId?: 'default' | 'system'
}

export interface BrowserDiagnostics {
  console: string[]
  httpErrors: string[]
  pageErrors: string[]
  requestFailures: string[]
  unhandledApi: string[]
}

export const NOW = '2026-08-21T00:00:00Z'
export const EXPIRES_AT = '2099-08-21T00:00:00Z'
