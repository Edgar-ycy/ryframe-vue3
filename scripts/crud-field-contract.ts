import {
  hasKey,
  requireExactKeys,
  requireLabels,
  requireRecord,
  requireString,
  type ContractRecord,
} from './crud-contract-format.ts'

export interface CrudField {
  name: string
  order: number
  value_type: string
}

const fieldKeys = [
  'enum_values',
  'labels',
  'name',
  'nullable',
  'order',
  'usage',
  'validation',
  'value_type',
  'widget',
  'wire_type',
]
const usageKeys = [
  'create',
  'create_optional',
  'filter',
  'list',
  'read',
  'sort',
  'update',
  'update_optional',
]
const optionalUsageKeys = ['filter_exact', 'sort_desc']
const validationKeys = ['max_length', 'maximum', 'min_length', 'minimum', 'required']
const optionalValidationKeys = ['max_utf8_bytes', 'min_utf8_bytes']
const integerRanges = new Map<string, [bigint, bigint]>([
  ['i8', [-128n, 127n]],
  ['i16', [-32768n, 32767n]],
  ['i32', [-2147483648n, 2147483647n]],
  ['i64', [-9223372036854775808n, 9223372036854775807n]],
  ['u8', [0n, 255n]],
  ['u16', [0n, 65535n]],
  ['u32', [0n, 4294967295n]],
  ['u64', [0n, 18446744073709551615n]],
])
const valueTypes = new Set([
  'bool',
  'date',
  'date_time',
  'decimal',
  'json',
  'string',
  ...integerRanges.keys(),
])
const editableWidgets = new Set([
  'date',
  'date_time',
  'json',
  'number',
  'select',
  'switch',
  'text',
  'textarea',
])
const widgets = new Set([...editableWidgets, 'hidden'])
const widgetValueTypes = new Map([
  ['text', new Set(['string', 'decimal', ...integerRanges.keys()])],
  ['textarea', new Set(['string'])],
  ['number', new Set(integerRanges.keys())],
  ['switch', new Set(['bool'])],
  ['date', new Set(['date'])],
  ['date_time', new Set(['date_time'])],
  ['json', new Set(['json'])],
])

export function requireField(field: unknown, location: string): asserts field is CrudField {
  requireExactKeys(field, fieldKeys, location)
  requireString(field.name, `${location}.name`, /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u)
  const valueType = field.value_type
  const wireType = field.wire_type
  if (typeof valueType !== 'string' || !valueTypes.has(valueType))
    throw new Error(`${location}.value_type: 不支持的字段类型`)
  if (typeof wireType !== 'string' || !valueTypes.has(wireType))
    throw new Error(`${location}.wire_type: 不支持的传输类型`)
  if (
    wireType !== valueType &&
    !(['i64', 'u64', 'decimal'].includes(valueType) && wireType === 'string')
  ) {
    throw new Error(`${location}.wire_type: 只允许 i64、u64、decimal 使用 string 传输`)
  }
  if (['u64', 'decimal'].includes(valueType) && wireType !== 'string') {
    throw new Error(`${location}.wire_type: u64、decimal 必须使用 string 传输`)
  }
  if (typeof field.nullable !== 'boolean') throw new Error(`${location}.nullable: 必须是布尔值`)
  if (typeof field.order !== 'number' || !Number.isInteger(field.order) || field.order < 0) {
    throw new Error(`${location}.order: 必须是非负整数`)
  }
  const widget = field.widget
  if (typeof widget !== 'string' || !widgets.has(widget))
    throw new Error(`${location}.widget: 不支持的控件类型`)
  requireLabels(field.labels, `${location}.labels`)

  const usage = field.usage
  const presentUsageKeys = optionalUsageKeys.filter((key) => hasKey(usage, key))
  requireExactKeys(usage, [...usageKeys, ...presentUsageKeys], `${location}.usage`)
  for (const key of [...usageKeys, ...presentUsageKeys]) {
    if (typeof usage[key] !== 'boolean') throw new Error(`${location}.usage.${key}: 必须是布尔值`)
  }
  const validation = field.validation
  const presentValidationKeys = optionalValidationKeys.filter((key) => hasKey(validation, key))
  requireExactKeys(
    validation,
    [...validationKeys, ...presentValidationKeys],
    `${location}.validation`,
  )
  if (typeof validation.required !== 'boolean') {
    throw new Error(`${location}.validation.required: 必须是布尔值`)
  }
  for (const key of ['min_length', 'max_length']) {
    const boundary = validation[key]
    if (boundary !== null && !isNonnegativeSafeInteger(boundary)) {
      throw new Error(`${location}.validation.${key}: 必须是非负安全整数或 null`)
    }
  }
  for (const key of optionalValidationKeys) {
    const boundary = validation[key]
    if (boundary !== undefined && !isNonnegativeSafeInteger(boundary)) {
      throw new Error(`${location}.validation.${key}: 必须是非负安全整数`)
    }
  }
  const [minimum, maximum] = requireIntegerBoundaries(valueType, wireType, validation, location)
  if (
    typeof validation.min_length === 'number' &&
    typeof validation.max_length === 'number' &&
    validation.min_length > validation.max_length
  ) {
    throw new Error(`${location}.validation: min_length 不能大于 max_length`)
  }
  if (
    typeof validation.min_utf8_bytes === 'number' &&
    typeof validation.max_utf8_bytes === 'number' &&
    validation.min_utf8_bytes > validation.max_utf8_bytes
  ) {
    throw new Error(`${location}.validation: min_utf8_bytes 不能大于 max_utf8_bytes`)
  }
  if (
    (validation.min_length !== null || validation.max_length !== null) &&
    valueType !== 'string'
  ) {
    throw new Error(`${location}.validation: 长度约束只能用于 string 字段`)
  }
  if (
    (validation.min_utf8_bytes !== undefined || validation.max_utf8_bytes !== undefined) &&
    valueType !== 'string'
  ) {
    throw new Error(`${location}.validation: UTF-8 字节约束只能用于 string 字段`)
  }
  if (validation.required && field.nullable) {
    throw new Error(`${location}: nullable 与 validation.required=true 冲突`)
  }

  if (usage.create_optional && !usage.create) {
    throw new Error(`${location}.usage: create_optional 只能用于 create 字段`)
  }
  if (usage.update_optional && !usage.update) {
    throw new Error(`${location}.usage: update_optional 只能用于 update 字段`)
  }
  if (usage.filter_exact && (!usage.filter || valueType !== 'string')) {
    throw new Error(`${location}.usage: filter_exact 只能用于 string 筛选字段`)
  }
  if (usage.sort_desc && !usage.sort) {
    throw new Error(`${location}.usage: sort_desc 只能用于默认排序字段`)
  }
  if (field.nullable && usage.update_optional) {
    throw new Error(`${location}.usage: nullable 与 update_optional 无法表达明确更新语义`)
  }
  const editable = usage.create || usage.update
  if (
    editable &&
    ['i64', 'u64', 'decimal'].includes(valueType) &&
    wireType === 'string' &&
    widget === 'number'
  ) {
    throw new Error(`${location}.widget: 精确数值字段须使用 text 或 select，number 会丢失精度`)
  }
  if (editable && !editableWidgets.has(widget)) {
    throw new Error(`${location}.widget: 可编辑字段不能使用 hidden 控件`)
  }
  const supported = widgetValueTypes.get(widget)
  if (supported && !supported.has(valueType)) {
    throw new Error(`${location}.widget: ${widget} 与 value_type=${valueType} 不匹配`)
  }
  if (editable && !(usage.read || usage.list)) {
    throw new Error(`${location}.usage: 可编辑字段必须同时出现在 read 或 list 视图`)
  }

  const enumValues = requireRecord(field.enum_values, `${location}.enum_values`)
  for (const [value, labels] of Object.entries(enumValues)) {
    requireEnumKey(value, valueType, `${location}.enum_values 的键`)
    if (integerRanges.has(valueType)) {
      const numeric = BigInt(value)
      if ((minimum !== null && numeric < minimum) || (maximum !== null && numeric > maximum)) {
        throw new Error(`${location}.enum_values: 枚举键超出字段范围约束`)
      }
    }
    requireLabels(labels, `${location}.enum_values.${value}`)
  }
  if (widget !== 'select' && Object.keys(enumValues).length > 0) {
    throw new Error(`${location}: enum_values 只能配合 select 控件`)
  }
  if (widget === 'select' && Object.keys(enumValues).length === 0) {
    throw new Error(`${location}: select 控件必须声明有限枚举`)
  }
}

function isNonnegativeSafeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function requireIntegerBoundaries(
  valueType: string,
  wireType: string,
  validation: ContractRecord,
  location: string,
): readonly (bigint | null)[] {
  const range = integerRanges.get(valueType)
  const exactString = wireType === 'string' && ['i64', 'u64'].includes(valueType)
  const bounds = ['minimum', 'maximum'].map((key) => {
    const value = validation[key]
    if (value === null) return null
    const path = `${location}.validation.${key}`
    if (!range) throw new Error(`${path}: 数值范围只能用于整数字段`)
    if (exactString) {
      return requireCanonicalInteger(requireString(value, path), range[0], range[1], path)
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value))
      throw new Error(`${path}: 必须是安全整数或 null`)
    const parsed = BigInt(value)
    if (parsed < range[0] || parsed > range[1]) {
      throw new Error(`${path}: 超出 ${valueType} 整数范围`)
    }
    return parsed
  })
  const [minimum, maximum] = bounds
  if (minimum !== null && maximum !== null && minimum > maximum) {
    throw new Error(`${location}.validation: minimum 不能大于 maximum`)
  }
  return bounds
}

function requireCanonicalInteger(
  value: string,
  minimum: bigint,
  maximum: bigint,
  location: string,
): bigint {
  if (!/^-?(?:0|[1-9][0-9]*)$/u.test(value) || value === '-0') {
    throw new Error(`${location}: 必须是规范十进制整数`)
  }
  const parsed = BigInt(value)
  if (parsed < minimum || parsed > maximum) {
    throw new Error(`${location}: 超出字段整数范围`)
  }
  return parsed
}

function requireEnumKey(value: string, valueType: string, location: string): void {
  requireString(value, location)
  if (valueType === 'string') return
  if (valueType === 'bool') {
    if (!['false', 'true'].includes(value))
      throw new Error(`${location}: bool 枚举仅支持 false/true`)
    return
  }
  const range = integerRanges.get(valueType)
  if (range) {
    requireCanonicalInteger(value, range[0], range[1], location)
    return
  }
  throw new Error(`${location}: ${valueType} 字段不支持 flat_crud v1 枚举`)
}
