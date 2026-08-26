import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { requireCrudResourceCatalog } from '../crud-resource-contract.mjs'

const openapi = JSON.parse(
  readFileSync(new URL('../../openapi/openapi.json', import.meta.url), 'utf8'),
)

test('接受数据范围、精确筛选、倒序和 UTF-8 字节边界扩展', () => {
  const resources = requireCrudResourceCatalog(openapi['x-ryframe-crud-resources'], openapi)
  const notice = resources.find((resource) => resource.name === 'notice')

  assert.equal(notice?.access.owner_field, 'created_by')
  assert.equal(
    notice?.fields.find((field) => field.name === 'notice_type')?.usage.filter_exact,
    true,
  )
  assert.equal(notice?.fields.find((field) => field.name === 'created_at')?.usage.sort_desc, true)
  assert.equal(
    notice?.fields.find((field) => field.name === 'content_markdown')?.validation.max_utf8_bytes,
    60_000,
  )
})
