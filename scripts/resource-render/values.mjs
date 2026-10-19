const integers = new Set(['i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64'])
const exactText = new Set(['i64', 'u64', 'decimal'])

export const quote = (value) => JSON.stringify(value)

export function objectBlock(properties) {
  return `    {\n${properties.map((property) => `      ${property},\n`).join('')}    },\n`
}

export function tsDefault(field) {
  if (field.value_type === 'json') return "''"
  if (exactText.has(field.value_type) && field.wire_type === 'string') return "''"
  if (integers.has(field.value_type)) return '0'
  if (field.value_type === 'bool') return 'false'
  return "''"
}

export function enumValue(value, field) {
  if (field.wire_type === 'string') return quote(value)
  if (integers.has(field.value_type)) return value
  if (field.value_type === 'bool' && ['true', 'false'].includes(value)) return value
  return quote(value)
}

export function formInput(field, optional) {
  const value = `form.${field.name}`
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

export function formType(field) {
  return field.value_type === 'json' ? 'string' : field.typescript_type
}

export function editValue(field) {
  const value = `record.${field.name}`
  if (field.value_type === 'json') {
    if (field.nullable) return `${value} == null ? '' : JSON.stringify(${value}, null, 2)`
    return `JSON.stringify(${value}, null, 2)`
  }
  return field.nullable ? `${value} ?? null` : value
}

export function formWidget(field) {
  if (Object.keys(field.enum_values).length > 0) return 'radio'
  return (
    {
      textarea: 'textarea',
      number: 'number',
      switch: 'switch',
      date: 'date',
      date_time: 'date_time',
      json: 'json',
    }[field.widget] ?? 'text'
  )
}

export function enumEntries(field) {
  return Object.entries(field.enum_values).sort(([left], [right]) => {
    // Rust 的 BTreeMap 按 Unicode 标量顺序排序，不能使用 JS 对整数属性的枚举顺序。
    const a = [...left].map((character) => character.codePointAt(0))
    const b = [...right].map((character) => character.codePointAt(0))
    for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
      if (a[index] !== b[index]) return a[index] - b[index]
    }
    return a.length - b.length
  })
}
