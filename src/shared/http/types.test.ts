import { describe, expect, it } from 'vitest'

import { stripPagination } from './types'

describe('stripPagination', () => {
  it('removes pagination without mutating the source query', () => {
    const query = { page: 3, page_size: 50, name: 'admin', status: '1' }

    expect(stripPagination(query)).toEqual({ name: 'admin', status: '1' })
    expect(query).toEqual({ page: 3, page_size: 50, name: 'admin', status: '1' })
  })

  it('preserves filter-only queries and optional input', () => {
    expect(stripPagination({ code: 'enabled' })).toEqual({ code: 'enabled' })
    expect(stripPagination()).toBeUndefined()
  })
})
