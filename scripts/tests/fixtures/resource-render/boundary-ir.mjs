import { order, wideOrder } from './order-ir.mjs'

export const field = (resource, name) => resource.fields.find((item) => item.name === name)

// 仅构造已校验 IR 的定向变体，不承担 TOML/数据库的归一化或有效性判断。
export function threshold() {
  const resource = wideOrder(3)
  const status = field(resource, 'status')
  for (const value of ['2', '3', '4']) status.enum_values[value] = structuredClone(status.labels)
  status.widget = 'number'
  status.validation.maximum = null
  for (const name of ['name', 'status', 'value_0', 'value_1']) {
    field(resource, name).validation.required = false
  }
  return resource
}

export function importLabels() {
  const resource = wideOrder(8)
  const name = field(resource, 'name')
  name.labels = { zh_cn: "hello from '../path", en: "import { sample } from '../path" }
  field(resource, 'status').enum_values['0'] = structuredClone(name.labels)
  return resource
}

export function emptyEnum() {
  const resource = wideOrder(0)
  const status = field(resource, 'status')
  status.enum_values = Object.fromEntries(
    Array.from({ length: 1641 }, (_, index) => [String(index), structuredClone(status.labels)]),
  )
  for (const item of resource.fields) item.usage.create = item.usage.update = false
  return resource
}

export function numeric(type, nullable) {
  const resource = order()
  const status = field(resource, 'status')
  const exact = ['i64', 'u64', 'decimal'].includes(type)
  Object.assign(status, {
    value_type: type,
    wire_type: exact ? 'string' : type,
    rust_type: type === 'decimal' ? 'rust_decimal::Decimal' : type,
    typescript_type: `${exact ? 'string' : 'number'}${nullable ? ' | null' : ''}`,
    widget: type === 'decimal' ? 'text' : 'select',
    nullable,
  })
  if (nullable) status.rust_type = `Option<${status.rust_type}>`
  status.usage.create_optional = true
  const bounds = {
    i8: [-128, 127],
    i16: [-32768, 32767],
    i32: [null, null],
    u8: [0, 255],
    u16: [0, 65535],
    u32: [0, 4294967295],
    i64: [null, null],
    u64: [0, null],
    decimal: [null, null],
  }
  const [minimum, maximum] = bounds[type]
  Object.assign(status.validation, { required: false, minimum, maximum })
  if (type === 'decimal') {
    status.enum_values = {}
    status.sql_type = 'DECIMAL(20,6)'
    status.default = '0.125000'
  }
  if (type === 'u64') {
    status.enum_values['18446744073709551615'] = structuredClone(status.labels)
    status.default = '18446744073709551615'
  }
  return resource
}

export function globalOrder() {
  const resource = order()
  Object.assign(resource, {
    storage: 'control_row',
    tenant_field: null,
    configuration_versioned: false,
    primary_key: ['id'],
    id_generation: 'auto_increment',
  })
  resource.access.system_tenant_only = true
  resource.fields = resource.fields.filter((item) => item.name !== 'tenant_id')
  for (const index of resource.indexes)
    index.fields = index.fields.filter((name) => name !== 'tenant_id')
  return resource
}

export function dated(count, visible, enumerated) {
  const resource = wideOrder(count)
  for (const item of resource.fields.filter((item) => item.value_type === 'date_time')) {
    item.usage.list = visible
    item.enum_values = enumerated ? { now: { zh_cn: '现在', en: 'Now' } } : {}
  }
  return resource
}
