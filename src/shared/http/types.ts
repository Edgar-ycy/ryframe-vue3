export type Id = string

export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data?: T
  rows?: T extends readonly (infer Item)[] ? Item[] : T[]
  total?: number
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
  rows: T[]
  total: number
}
