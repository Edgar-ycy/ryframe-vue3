import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { requireCrudResourceCatalog } from '../crud-resource-contract.mjs'

const source = JSON.parse(
  await readFile(new URL('../../openapi/openapi.json', import.meta.url), 'utf8'),
)

function globalCatalog() {
  const document = structuredClone(source)
  const catalog = document['x-ryframe-crud-resources']
  const resource = catalog.resources.find((item) => item.storage === 'control_row')
  assert.ok(resource, '当前契约必须包含控制库标准资源')
  resource.access.system_tenant_only = true
  return { document, catalog, resource }
}

test('控制库全局访问标志进入当前 CRUD 契约', () => {
  const { document, catalog, resource } = globalCatalog()
  assert.ok(requireCrudResourceCatalog(catalog, document).includes(resource))
})

test('全局访问标志拒绝无效取值和租户数据范围', () => {
  for (const value of [false, 'true', 1, null]) {
    const { document, catalog, resource } = globalCatalog()
    resource.access.system_tenant_only = value
    assert.throws(() => requireCrudResourceCatalog(catalog, document), /system_tenant_only/u)
  }
  const { document, catalog, resource } = globalCatalog()
  resource.storage = 'tenant_data'
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /system_tenant_only/u)
})
