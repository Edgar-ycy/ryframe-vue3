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

const integerKinds = [
  ['i8', -128, 127],
  ['i16', -32768, 32767],
  ['u8', 0, 255],
  ['u16', 0, 65535],
  ['u32', 0, 4294967295],
]

function integerCatalog(kind, minimum, maximum) {
  const fixture = globalCatalog()
  const field = fixture.resource.fields.find((item) => item.usage.create)
  assert.ok(field, '当前标准资源必须包含可编辑测试字段')
  field.value_type = kind
  field.wire_type = kind
  field.validation.minimum = minimum
  field.validation.maximum = maximum
  field.validation.min_length = null
  field.validation.max_length = null
  delete field.validation.min_utf8_bytes
  delete field.validation.max_utf8_bytes
  field.enum_values = Object.fromEntries(
    [minimum, maximum].map((value) => [String(value), { zh_cn: '边界', en: 'Boundary' }]),
  )
  field.widget = 'select'
  return { ...fixture, field }
}

test('常用整数接受完整边界，拒绝范围溢出和非规范枚举', () => {
  for (const [kind, minimum, maximum] of integerKinds) {
    const { document, catalog, field } = integerCatalog(kind, minimum, maximum)
    assert.ok(requireCrudResourceCatalog(catalog, document))
    field.validation.maximum = maximum + 1
    assert.throws(() => requireCrudResourceCatalog(catalog, document), /整数范围/u)
    field.validation.maximum = maximum
    field.validation.maximum = maximum - 1
    assert.throws(() => requireCrudResourceCatalog(catalog, document), /范围约束/u)
    field.validation.maximum = maximum
    for (const value of [String(minimum - 1), String(maximum + 1), '-0', '01', '+1', '0.5']) {
      field.enum_values = { [value]: { zh_cn: '无效', en: 'Invalid' } }
      assert.throws(() => requireCrudResourceCatalog(catalog, document), /整数范围|规范十进制/u)
    }
    field.wire_type = 'string'
    assert.throws(() => requireCrudResourceCatalog(catalog, document), /wire_type/u)
  }
})

test('字符串传输的64位整数只能使用保持精度的表单控件', () => {
  const { document, catalog, field } = integerCatalog('i64', 0, 1)
  field.wire_type = 'string'
  field.enum_values = {}
  field.widget = 'text'
  assert.ok(requireCrudResourceCatalog(catalog, document))
  field.widget = 'number'
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /丢失精度/u)
})
