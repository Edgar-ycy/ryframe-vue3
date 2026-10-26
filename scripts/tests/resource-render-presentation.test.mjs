import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { renderResourceAssets } from '../resource-render/index.mjs'
import { execute } from './fixtures/resource-render/boundary-runtime.mjs'
import { resourceDefinition } from '../resource-render/resource.mjs'

const post = JSON.parse(
  await readFile(new URL('./fixtures/resource-render/post.json', import.meta.url), 'utf8'),
)

test('生成状态枚举及筛选使用字符串次序，必填提示不误加给开关', () => {
  const resource = structuredClone(post)
  const status = resource.fields.find((field) => field.name === 'status')
  status.enum_values = { 2: { zh_cn: '二', en: 'Two' }, 10: { zh_cn: '十', en: 'Ten' } }
  status.usage.filter = true
  const code = resource.fields.find((field) => field.name === 'code')
  const presentation = execute(resource, renderResourceAssets([resource], '1.3.0'))
  assert.equal(presentation.columns.find((field) => field.key === 'status').positiveValue, '2')
  assert.deepEqual(
    Array.from(
      presentation.queryFields.find((field) => field.key === 'status').options,
      (option) => option.value,
    ),
    ['10', '2'],
  )
  assert.ok(presentation.formFields.find((field) => field.key === 'code').requiredMessage)
  code.widget = 'switch'
  const toggle = execute(resource, renderResourceAssets([resource], '1.3.0'))
  assert.equal(toggle.formFields.find((field) => field.key === 'code').requiredMessage, undefined)
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
