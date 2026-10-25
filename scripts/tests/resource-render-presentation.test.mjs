import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { presentation } from '../resource-render/presentation.mjs'
import {
  columnProperties,
  formProperties,
  queryProperties,
} from '../resource-render/properties.mjs'
import { resourceDefinition } from '../resource-render/resource.mjs'

const post = JSON.parse(
  await readFile(new URL('./fixtures/resource-render/post.json', import.meta.url), 'utf8'),
)

test('状态枚举按原字符串次序选择正向状态，不被整数属性排序改变', () => {
  const field = structuredClone(post.fields.find((field) => field.name === 'status'))
  field.enum_values = { 2: { zh_cn: '二', en: 'Two' }, 10: { zh_cn: '十', en: 'Ten' } }
  assert.equal(columnProperties(field).at(-1), 'positiveValue: "2"')
  assert.equal(queryProperties(field).at(-1), 'options: statusOptions')
})

test('创建专有、编辑专有和必填控件各自保持原限制', () => {
  const code = post.fields.find((field) => field.name === 'code')
  const status = post.fields.find((field) => field.name === 'status')
  assert(formProperties(code).includes('disabledOnEdit: true'))
  assert(formProperties(status).includes('editOnly: true'))
  assert(formProperties(code).some((property) => property.startsWith('requiredMessage:')))
  const toggle = { ...code, widget: 'switch' }
  assert(!formProperties(toggle).some((property) => property.startsWith('requiredMessage:')))
})

test('隐藏筛选字段不进入查询表单，日期列只在需要时引入格式化参数', () => {
  const resource = structuredClone(post)
  resource.fields = resource.fields.filter((field) => field.value_type !== 'date_time')
  resource.fields.find((field) => field.name === 'id').usage.filter = true
  const output = presentation(resource, '1.3.0')
  assert(!output.includes('formatDate'))
  const query = output.split('  const queryFields = [')[1].split('  const columns = [')[0]
  assert(!query.includes('key: "id"'))
})

test('资源映射保留联合主键及可读名称的选择', () => {
  const resource = { ...post, primary_key: ['tenant_id', 'order_id'], tenant_field: 'tenant_id' }
  const mappings = Object.fromEntries(
    ['query_defaults', 'empty_form', 'edit_form', 'create_input', 'update_input'].map((name) => [
      name,
      '',
    ]),
  )
  const output = resourceDefinition(resource, mappings)
  assert(output.includes('recordId: record => String(record.order_id)'))
  assert(output.includes('`Delete ${String(record.name)}?`'))
  assert(!output.includes('{{'))
  const noLabels = { ...resource, fields: [] }
  assert(resourceDefinition(noLabels, mappings).includes('`Delete ${String(record.order_id)}?`'))
})
