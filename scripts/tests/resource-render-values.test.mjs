import assert from 'node:assert/strict'
import test from 'node:test'

import { renderResourceAssets } from '../resource-render/index.mjs'
import { formType } from '../resource-render/values.ts'
import { common } from './fixtures/resource-render/builders.mjs'
import { execute } from './fixtures/resource-render/boundary-runtime.mjs'

const view = (resource) => execute(resource, renderResourceAssets([resource], '1.3.0'))

test('生成表单保留布尔与文本默认值，并把可空编辑缺值转为 null', () => {
  const resource = common()
  const note = resource.fields.find((field) => field.name === 'note')
  note.nullable = true
  note.typescript_type = 'string | null'
  const presentation = view(resource)
  const form = presentation.resource.emptyForm()
  assert.equal(form.enabled, false)
  assert.equal(form.name, '')
  assert.equal(form.note, '')
  assert.equal(form.happens_at, '')
  assert.equal(form.due_on, null)
  assert.equal(presentation.resource.editForm({ note: undefined }).note, null)
  assert.equal(presentation.resource.editForm({ note: '保留正文' }).note, '保留正文')
  const date = resource.fields.find((field) => field.name === 'due_on')
  date.nullable = false
  date.typescript_type = 'string'
  assert.equal(view(resource).resource.emptyForm().due_on, '')
})

test('生成 JSON 转换区分可选省略、可空清除及实际对象往返', () => {
  const resource = common()
  const metadata = resource.fields.find((field) => field.name === 'metadata')
  metadata.usage.create_optional = metadata.usage.update_optional = true
  assert.equal(formType(metadata), 'string')
  const presentation = view(resource)
  const form = presentation.resource.emptyForm()
  assert.equal(form.metadata, '')
  const record = { metadata: { key: '中文', count: 2 }, nullable_metadata: null }
  const edit = presentation.resource.editForm(record)
  assert.equal(edit.metadata, JSON.stringify(record.metadata, null, 2))
  assert.equal(edit.nullable_metadata, '')
  assert.equal(
    presentation.resource.editForm({ nullable_metadata: undefined }).nullable_metadata,
    '',
  )
  for (const action of ['create', 'update']) {
    const convert = presentation.resource[`${action}Input`]
    assert.deepEqual(structuredClone(convert(edit).metadata), record.metadata)
    for (const blank of ['', '   ']) {
      const converted = convert({ ...form, metadata: blank, nullable_metadata: blank })
      assert.equal(converted.metadata, undefined)
      assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(converted)), 'metadata'), false)
      assert.equal(converted.nullable_metadata, null)
    }
  }
  metadata.usage.create_optional = metadata.usage.update_optional = false
  const required = view(resource).resource
  for (const action of ['create', 'update'])
    assert.equal(required[`${action}Input`]({ ...form, metadata: '   ' }).metadata, null)
})

test('生成枚举保留布尔及引号值，并按 Rust Unicode 标量顺序排序', () => {
  const resource = common()
  const note = resource.fields.find((field) => field.name === 'note')
  const keys = ['2', '10', 'a"b', '\u{10000}', '\ue000']
  note.enum_values = Object.fromEntries(keys.map((key) => [key, { zh_cn: key, en: key }]))
  const enabled = resource.fields.find((field) => field.name === 'enabled')
  enabled.enum_values = { false: { zh_cn: '否', en: 'No' }, true: { zh_cn: '是', en: 'Yes' } }
  const presentation = view(resource)
  const column = (name) => presentation.columns.find((field) => field.key === name)
  assert.deepEqual(
    Array.from(column('enabled').options, (option) => option.value),
    [false, true],
  )
  assert.deepEqual(
    Array.from(column('note').options, (option) => option.value),
    ['10', '2', 'a"b', '\ue000', '\u{10000}'],
  )
  assert.equal(column('note').positiveValue, '\u{10000}')
})
