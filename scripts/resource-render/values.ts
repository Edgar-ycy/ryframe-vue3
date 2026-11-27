const integerTypes = ['i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64'] as const
type ValueType =
  (typeof integerTypes)[number] | 'string' | 'decimal' | 'bool' | 'date' | 'date_time' | 'json'
export type Widget =
  'text' | 'textarea' | 'number' | 'switch' | 'select' | 'date' | 'date_time' | 'json' | 'hidden'

export interface Labels {
  zh_cn: string
  en: string
}

export interface FieldValue {
  name: string
  value_type: ValueType
  wire_type: ValueType
  nullable: boolean
}

interface EnumField {
  enum_values: Readonly<Record<string, Labels>>
}

const integers = new Set<ValueType>(integerTypes)
const exactText = new Set<ValueType>(['i64', 'u64', 'decimal'])
const explicitFormWidgets: Partial<Record<Widget, Widget>> = {
  textarea: 'textarea',
  number: 'number',
  switch: 'switch',
  date: 'date',
  date_time: 'date_time',
  json: 'json',
}

export const quote = (value: string): string => JSON.stringify(value)

export function objectBlock(properties: readonly string[]): string {
  return `    {\n${properties.map((property) => `      ${property},\n`).join('')}    },\n`
}

export function tsDefault(field: FieldValue): string {
  if (['date', 'date_time'].includes(field.value_type) && field.nullable) return 'null'
  if (field.value_type === 'json') return "''"
  if (exactText.has(field.value_type) && field.wire_type === 'string') return "''"
  if (integers.has(field.value_type)) return '0'
  if (field.value_type === 'bool') return 'false'
  return "''"
}

export function enumValue(
  value: string,
  field: Pick<FieldValue, 'value_type' | 'wire_type'>,
): string {
  if (field.wire_type === 'string') return quote(value)
  if (integers.has(field.value_type)) return value
  if (field.value_type === 'bool' && ['true', 'false'].includes(value)) return value
  return quote(value)
}

export function formInput(field: FieldValue, optional: boolean): string {
  const value = `form.${field.name}`
  if (['date', 'date_time'].includes(field.value_type)) {
    if (field.nullable) return `${value} == null || ${value} === '' ? null : ${value}`
    if (optional) return `${value} == null || ${value} === '' ? undefined : ${value}`
  }
  if (field.value_type === 'json') {
    if (field.nullable) return `${value}.trim() === '' ? null : JSON.parse(${value})`
    if (optional) return `${value}.trim() === '' ? undefined : JSON.parse(${value})`
    return `${value}.trim() === '' ? null : JSON.parse(${value})`
  }
  if (exactText.has(field.value_type) && field.wire_type === 'string') {
    if (field.nullable) return `${value} === '' ? null : ${value}`
    if (optional) return `${value} === '' ? undefined : ${value}`
  }
  return value
}

export function formType(field: { value_type: ValueType; typescript_type: string }): string {
  return field.value_type === 'json' ? 'string' : field.typescript_type
}

export function editValue(field: Pick<FieldValue, 'name' | 'value_type' | 'nullable'>): string {
  const value = `record.${field.name}`
  if (field.value_type === 'json') {
    if (field.nullable) return `${value} == null ? '' : JSON.stringify(${value}, null, 2)`
    return `JSON.stringify(${value}, null, 2)`
  }
  return field.nullable ? `${value} ?? null` : value
}

export function formWidget(field: EnumField & { widget: Widget }): Widget | 'radio' {
  if (Object.keys(field.enum_values).length > 0) return 'radio'
  return explicitFormWidgets[field.widget] ?? 'text'
}

export function enumEntries(field: EnumField): [string, Labels][] {
  return Object.entries(field.enum_values).sort(([left], [right]) => {
    // Rust 的 BTreeMap 按 Unicode 标量顺序排序，不能使用 JS 对整数属性的枚举顺序。
    const a = [...left]
    const b = [...right]
    for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
      // 字符来自字符串迭代器，每个条目至少包含一个 UTF-16 码元。
      if (a[index] !== b[index]) return a[index].codePointAt(0)! - b[index].codePointAt(0)!
    }
    return a.length - b.length
  })
}
