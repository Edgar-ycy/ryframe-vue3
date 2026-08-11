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

/** 构造与后端分页协议一致的空结果，保留调用方当前页与每页数量。 */
export function emptyPageResponse<T>(query?: PageQuery): PageResponse<T> {
  const pageSize = query?.page_size ?? 10
  return {
    items: [],
    page: query?.page ?? 1,
    page_size: pageSize,
    total: 0,
    total_pages: 0,
    max_page_size: pageSize,
  }
}
