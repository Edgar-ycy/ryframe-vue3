import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { requireCrudResourceCatalog } from '../crud-resource-contract.ts'

interface FixtureField {
  value_type: string
  wire_type: string
  nullable: boolean
  widget: string
  usage: Record<string, boolean>
  validation: Record<string, unknown>
  labels: unknown
  enum_values: Record<string, unknown>
}

interface FixtureResource {
  storage: string
  access: { system_tenant_only?: unknown }
  fields: FixtureField[]
}

const source: { 'x-ryframe-crud-resources': { resources: FixtureResource[] } } = JSON.parse(
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
  assert.ok(
    requireCrudResourceCatalog(catalog, document).some((entry) => Object.is(entry, resource)),
  )
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
] as const

function integerCatalog(
  kind: string,
  minimum: string | number | null,
  maximum: string | number | null,
) {
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

function editableCatalog(kind: string, widget: string, nullable = false) {
  const fixture = integerCatalog(kind, null, null)
  const { field } = fixture
  field.wire_type = ['i64', 'u64', 'decimal'].includes(kind) ? 'string' : kind
  field.widget = widget
  field.enum_values = {}
  field.nullable = nullable
  field.validation.required = !nullable
  field.usage.create = field.usage.update = field.usage.read = true
  field.usage.create_optional = field.usage.update_optional = false
  return fixture
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
  const { document, catalog, field } = integerCatalog('i64', '0', '1')
  field.wire_type = 'string'
  field.enum_values = {}
  field.widget = 'text'
  assert.ok(requireCrudResourceCatalog(catalog, document))
  field.widget = 'number'
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /丢失精度/u)
})

test('u64 字符串枚举保持完整容量并拒绝负数、溢出和数字控件', () => {
  const { document, catalog, field } = integerCatalog('u64', '0', null)
  field.wire_type = 'string'
  field.enum_values = {
    0: { zh_cn: '零', en: 'Zero' },
    '18446744073709551615': { zh_cn: '最大值', en: 'Maximum' },
  }
  assert.ok(requireCrudResourceCatalog(catalog, document))
  for (const value of ['-1', '-0', '18446744073709551616', '01', '+1', '1e3']) {
    field.enum_values = { [value]: { zh_cn: '无效', en: 'Invalid' } }
    assert.throws(() => requireCrudResourceCatalog(catalog, document), /整数范围|规范十进制/u)
  }
  field.enum_values = {}
  field.widget = 'text'
  assert.ok(requireCrudResourceCatalog(catalog, document))
  field.wire_type = 'u64'
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /wire_type/u)
  field.wire_type = 'string'
  field.widget = 'number'
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /丢失精度/u)
  field.widget = 'select'
  field.enum_values = { '9007199254740993': { zh_cn: '精确值', en: 'Exact' } }
  field.validation.maximum = '42'
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /范围约束/u)
  field.validation.maximum = null
  field.validation.minimum = '-1'
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /整数范围/u)
})

test('64位范围以精确字符串校验，拒绝舍入、非法格式、溢出与倒置', () => {
  for (const [kind, minimum, maximum] of [
    ['i64', '-9223372036854775808', '9223372036854775807'],
    ['u64', '0', '18446744073709551615'],
  ] as const) {
    const { document, catalog, field } = integerCatalog(kind, minimum, maximum)
    field.wire_type = 'string'
    assert.ok(requireCrudResourceCatalog(catalog, document))
    for (const value of [Number(maximum), 0, '01', '-0', '+1', '1e3', ' 1', '0.5', true, {}]) {
      field.validation.maximum = value
      assert.throws(() => requireCrudResourceCatalog(catalog, document), /字符串|规范十进制/u)
    }
    field.validation.maximum = String(BigInt(maximum) + 1n)
    assert.throws(() => requireCrudResourceCatalog(catalog, document), /整数范围/u)
    field.validation.maximum = maximum
    field.validation.minimum = String(BigInt(minimum) - 1n)
    assert.throws(() => requireCrudResourceCatalog(catalog, document), /整数范围/u)
    field.enum_values = {}
    field.widget = 'text'
    field.validation.minimum = '10'
    field.validation.maximum = '2'
    assert.throws(() => requireCrudResourceCatalog(catalog, document), /不能大于/u)
    field.validation.minimum = '2'
    field.validation.maximum = '10'
    assert.ok(requireCrudResourceCatalog(catalog, document))
  }
})

test('Decimal 只能使用字符串传输及文本控件，不能退回数字输入', () => {
  const { document, catalog, field } = integerCatalog('decimal', null, null)
  field.wire_type = 'string'
  field.enum_values = {}
  field.widget = 'text'
  assert.ok(requireCrudResourceCatalog(catalog, document))
  field.widget = 'number'
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /丢失精度/u)
  field.widget = 'text'
  field.wire_type = 'decimal'
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /wire_type/u)
})

test('公共契约接受现有渲染器的类型匹配控件并保留输入', () => {
  for (const [type, widget, nullable = false] of [
    ['json', 'json'],
    ['json', 'json', true],
    ['bool', 'switch'],
    ['date', 'date'],
    ['date_time', 'date_time'],
    ['string', 'textarea'],
    ['string', 'text'],
    ['i32', 'number'],
    ['i32', 'text'],
  ] as const) {
    const { document, catalog, resource, field } = editableCatalog(type, widget, nullable)
    field.usage.create_optional = true
    field.usage.update_optional = !nullable
    const before = structuredClone(catalog)
    assert(
      requireCrudResourceCatalog(catalog, document).some((entry) => Object.is(entry, resource)),
    )
    assert.deepEqual(catalog, before)
  }
  const { document, catalog, field } = editableCatalog('bool', 'select')
  field.enum_values = {
    false: { zh_cn: '否', en: 'No' },
    true: { zh_cn: '是', en: 'Yes' },
  }
  assert(requireCrudResourceCatalog(catalog, document))
})

test('控件不能跨类型使用，未知控件及可编辑 hidden 仍拒绝', () => {
  for (const [type, widget] of [
    ['string', 'json'],
    ['json', 'textarea'],
    ['json', 'text'],
    ['json', 'number'],
    ['bool', 'text'],
    ['i32', 'switch'],
    ['date', 'date_time'],
    ['date_time', 'date'],
    ['bool', 'textarea'],
    ['string', 'number'],
    ['string', 'unsupported'],
    ['string', 'hidden'],
  ] as const) {
    const { document, catalog } = editableCatalog(type, widget)
    assert.throws(() => requireCrudResourceCatalog(catalog, document), /\.widget:/u)
  }
  const { document, catalog, field } = editableCatalog('json', 'hidden')
  field.usage.create = field.usage.update = false
  assert(requireCrudResourceCatalog(catalog, document))
})

test('新增编辑控件仍校验传输、有限枚举及 nullable 和动作语义', () => {
  const mutations: [string, string, (field: FixtureField) => unknown, RegExp][] = [
    ['json', 'json', (f) => (f.wire_type = 'string'), /wire_type/u],
    ['bool', 'switch', (f) => (f.wire_type = 'string'), /wire_type/u],
    ['json', 'json', (f) => (f.nullable = true), /required=true/u],
    ['date', 'date', (f) => (f.usage.create = false), /create_optional/u],
    ['date_time', 'date_time', (f) => (f.usage.update = false), /update_optional/u],
    ['string', 'textarea', (f) => (f.usage.read = f.usage.list = false), /read 或 list/u],
    ['json', 'select', (f) => (f.enum_values = { a: f.labels }), /不支持.*枚举/u],
    ['bool', 'select', (f) => (f.enum_values = { 0: f.labels }), /false\/true/u],
    ['bool', 'switch', (f) => (f.enum_values = { true: f.labels }), /只能配合 select/u],
    ['bool', 'select', () => {}, /必须声明有限枚举/u],
  ]
  for (const [type, widget, mutate, diagnostic] of mutations) {
    const { document, catalog, field } = editableCatalog(type, widget)
    field.usage.create_optional = field.usage.update_optional = true
    mutate(field)
    assert.throws(() => requireCrudResourceCatalog(catalog, document), diagnostic)
  }
  const { document, catalog, field } = editableCatalog('json', 'json', true)
  field.usage.update_optional = true
  assert.throws(() => requireCrudResourceCatalog(catalog, document), /明确更新语义/u)
})
