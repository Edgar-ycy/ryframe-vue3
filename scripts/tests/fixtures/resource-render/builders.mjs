import fs from 'node:fs'

export function fixture(name) {
  return JSON.parse(fs.readFileSync(new URL(`./${name}.json`, import.meta.url), 'utf8'))
}

export function wide(count) {
  const resource = fixture('post')
  const template = resource.fields.find((field) => field.name === 'name')
  const status = resource.fields.find((field) => field.name === 'status')
  for (let index = 0; index < count; index += 1) {
    const field = structuredClone(template)
    field.name = field.column = `value_${index}`
    field.labels = { zh_cn: `字段${index}`, en: `Field ${index}` }
    field.usage.create = index % 7 !== 1
    field.usage.update = index % 7 !== 2
    field.usage.create_optional = field.usage.update_optional = index % 7 === 3
    field.nullable = index % 7 === 4
    field.value_type = ['decimal', 'i64', 'u64', 'i32', 'string'][index % 5]
    field.wire_type = field.value_type === 'i32' ? 'i32' : 'string'
    field.typescript_type = `${field.wire_type === 'i32' ? 'number' : 'string'}${field.nullable ? ' | null' : ''}`
    field.widget = field.value_type === 'i32' ? 'number' : 'text'
    if (index % 11 === 0) {
      field.enum_values = structuredClone(status.enum_values)
      field.widget = 'select'
    }
    resource.fields.push(field)
  }
  return resource
}

export function empty() {
  const resource = fixture('post')
  const status = resource.fields.find((field) => field.name === 'status')
  status.enum_values = Object.fromEntries(
    Array.from({ length: 1641 }, (_, index) => [String(index), structuredClone(status.labels)]),
  )
  for (const field of resource.fields) {
    field.usage.create = field.usage.update = field.usage.filter = false
    if (field.value_type === 'date_time') field.usage.list = false
  }
  return resource
}

export function labels() {
  const resource = wide(8)
  const name = resource.fields.find((field) => field.name === 'name')
  name.labels = { zh_cn: "hello from '../path", en: "import { sample } from '../path" }
  const status = resource.fields.find((field) => field.name === 'status')
  status.enum_values[Object.keys(status.enum_values).sort()[0]] = structuredClone(name.labels)
  return resource
}

export function common() {
  const resource = fixture('post')
  const template = resource.fields.find((field) => field.name === 'name')
  for (const [name, valueType, typescriptType, widget] of [
    ['enabled', 'bool', 'boolean', 'switch'],
    ['due_on', 'date', 'string', 'date'],
    ['happens_at', 'date_time', 'string', 'date_time'],
    ['amount', 'decimal', 'string', 'text'],
    ['metadata', 'json', 'unknown', 'json'],
    ['nullable_metadata', 'json', 'unknown', 'json'],
    ['note', 'string', 'string', 'textarea'],
    ['count', 'i32', 'number', 'number'],
  ]) {
    const field = structuredClone(template)
    field.name = field.column = name
    field.value_type = valueType
    field.wire_type = valueType === 'decimal' ? 'string' : valueType
    field.typescript_type = typescriptType
    field.widget = widget
    field.nullable = name === 'nullable_metadata'
    if (field.nullable) {
      field.validation = {
        ...field.validation,
        required: false,
        min_length: null,
        max_length: null,
      }
    }
    field.default = null
    field.enum_values = {}
    Object.assign(field.usage, {
      create: true,
      update: true,
      read: true,
      list: true,
      filter: false,
    })
    resource.fields.push(field)
  }
  return resource
}
