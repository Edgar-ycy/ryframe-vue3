export type Id = string

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
  request_id: string
  error_key?: string | null
  details?: unknown
}

export interface PageQuery {
  page?: number
  page_size?: number
}

export function stripPagination<T extends object>(query?: T) {
  if (!query) return undefined
  const filters = { ...query } as T & PageQuery
  delete filters.page
  delete filters.page_size
  return filters as Omit<T, keyof PageQuery>
}

export interface PageResponse<T> {
  items: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
  max_page_size: number
}
