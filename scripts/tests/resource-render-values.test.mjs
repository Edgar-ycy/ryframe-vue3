import assert from 'node:assert/strict'
import test from 'node:test'

import {
  editValue,
  enumEntries,
  enumValue,
  formInput,
  formType,
  formWidget,
  objectBlock,
  tsDefault,
} from '../resource-render/values.mjs'

const field = (changes = {}) => ({
  name: 'amount',
  value_type: 'i64',
  wire_type: 'string',
  typescript_type: 'string | null',
  nullable: false,
  enum_values: {},
  widget: 'text',
  ...changes,
})

test('精确整数和 Decimal 表单保留字符串，普通数值及布尔保留各自默认值', () => {
  for (const value_type of ['i64', 'u64', 'decimal']) {
    assert.equal(tsDefault(field({ value_type })), "''")
    assert.equal(
      formInput(field({ value_type }), true),
      "form.amount === '' ? undefined : form.amount",
    )
    assert.equal(
      formInput(field({ value_type, nullable: true }), true),
      "form.amount === '' ? null : form.amount",
    )
    assert.equal(formInput(field({ value_type }), false), 'form.amount')
  }
  for (const value_type of ['i8', 'i16', 'i32', 'u8', 'u16', 'u32']) {
    assert.equal(tsDefault(field({ value_type, wire_type: value_type })), '0')
  }
  assert.equal(tsDefault(field({ value_type: 'bool', wire_type: 'bool' })), 'false')
  for (const value_type of ['string', 'date', 'date_time']) {
    assert.equal(tsDefault(field({ value_type })), "''")
  }
})

test('JSON 创建、替换、可选及编辑行为保持独立', () => {
  const json = field({ value_type: 'json', typescript_type: 'unknown' })
  assert.equal(tsDefault(json), "''")
  assert.equal(formType(json), 'string')
  assert.equal(
    formInput(json, true),
    "form.amount.trim() === '' ? undefined : JSON.parse(form.amount)",
  )
  assert.equal(formInput(json, false), "form.amount.trim() === '' ? null : JSON.parse(form.amount)")
  assert.equal(
    formInput({ ...json, nullable: true }, true),
    "form.amount.trim() === '' ? null : JSON.parse(form.amount)",
  )
  assert.equal(editValue(json), 'JSON.stringify(record.amount, null, 2)')
  assert.equal(
    editValue({ ...json, nullable: true }),
    "record.amount == null ? '' : JSON.stringify(record.amount, null, 2)",
  )
  assert.equal(editValue(field()), 'record.amount')
  assert.equal(editValue(field({ nullable: true })), 'record.amount ?? null')
  assert.equal(formType(field()), 'string | null')
})

test('枚举保留精确传输类型并按 Rust 字符串顺序排序', () => {
  assert.equal(
    enumValue('18446744073709551615', field({ value_type: 'u64' })),
    '"18446744073709551615"',
  )
  assert.equal(enumValue('127', field({ value_type: 'i8', wire_type: 'i8' })), '127')
  assert.equal(enumValue('false', field({ value_type: 'bool', wire_type: 'bool' })), 'false')
  assert.equal(enumValue('否', field({ value_type: 'bool', wire_type: 'bool' })), '"否"')
  assert.equal(enumValue('a"b', field()), '"a\\"b"')
  const values = { 2: {}, 10: {}, '\u{10000}': {}, '\ue000': {} }
  assert.deepEqual(
    enumEntries(field({ enum_values: values })).map(([key]) => key),
    ['10', '2', '\ue000', '\u{10000}'],
  )
})

test('枚举优先使用单选，其他控件保持原资源选择', () => {
  for (const widget of ['textarea', 'number', 'switch', 'date', 'date_time', 'json']) {
    assert.equal(formWidget(field({ widget })), widget)
    assert.equal(formWidget(field({ widget, enum_values: { 1: {} } })), 'radio')
  }
  assert.equal(formWidget(field({ widget: 'hidden' })), 'text')
  assert.equal(
    objectBlock(['key: "a"', "kind: 'text'"]),
    '    {\n      key: "a",\n      kind: \'text\',\n    },\n',
  )
})
