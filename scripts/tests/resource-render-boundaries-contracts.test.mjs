import assert from 'node:assert/strict'
import test from 'node:test'

import { renderResourceAssets } from '../resource-render/index.mjs'
import { renderTransport } from '../resource-render/transport.mjs'
import { fixture } from './fixtures/resource-render/builders.mjs'
import { field, globalOrder, numeric } from './fixtures/resource-render/boundary-ir.mjs'
import { execute } from './fixtures/resource-render/boundary-runtime.mjs'
import { order } from './fixtures/resource-render/order-ir.mjs'

const version = '1.3.0'
const assets = (resource) => renderResourceAssets([resource], version)
const keys = (fields) => Array.from(fields, (field) => field.key)

test('整数/unsigned/Decimal 保留精确类型、枚举及 optional/nullable 转换', () => {
  for (const type of ['i8', 'i16', 'i32', 'u8', 'u16', 'u32', 'i64', 'u64', 'decimal']) {
    const exact = ['i64', 'u64', 'decimal'].includes(type)
    for (const nullable of [false, true]) {
      const resource = numeric(type, nullable)
      const status = field(resource, 'status')
      const view = execute(resource, assets(resource))
      const form = view.resource.emptyForm()
      assert.equal(form.status, exact ? '' : 0)
      assert.equal(
        view.resource.createInput(form).status,
        exact ? (nullable ? null : undefined) : 0,
      )
      const precise = {
        i64: '9223372036854775807',
        u64: '18446744073709551615',
        decimal: '12345678901234.125000',
      }
      const value = exact ? precise[type] : 1
      assert.equal(view.resource.updateInput({ ...form, status: value }).status, value)
      const column = view.columns.find((f) => f.key === 'status')
      if (type !== 'decimal') {
        const values = Object.keys(status.enum_values)
          .sort()
          .map((k) => (exact ? k : Number(k)))
        assert.deepEqual(
          Array.from(column.options, (o) => o.value),
          values,
        )
      }
    }
  }
})

test('Order typed caller、relation Detail、全局系统租户限制及字符串 ID 保持契约', () => {
  const resource = order()
  assert.equal(execute(resource, assets(resource)).resource.storage, 'tenant_data')
  const base = renderTransport(resource, version)
  assert.ok(base.get('page.vue').includes('@/components/business/flat-crud'))
  assert.ok(!base.get('page.vue').includes('@/components/FlatCrudPage'))
  const api = base.get('api.ts')
  assert.ok(api.includes('@/api/generated/operations/system'))
  assert.ok(!api.includes('requestOperation') && !api.includes('url:'))
  for (const operation of Object.values(resource.api.operations)) assert.ok(api.includes(operation))
  resource.relations = [
    {
      name: 'parent',
      pascal_name: 'Parent',
      kind: 'belongs_to',
      local_field: 'id',
      target_resource: 'order',
      target_pascal_name: 'Order',
    },
  ]
  assert.equal(
    renderTransport(resource, version).get('api.ts'),
    api.replace(
      'export type OrderQuery',
      "export type OrderDetail = ApiSchema<'OrderDetailVo'>\nexport type OrderQuery",
    ),
  )
  const global = globalOrder()
  assert.ok(
    renderTransport(global, version).get('registration.ts').includes('requiresSystemTenant: true'),
  )
  for (const type of ['i64', 'u64']) {
    Object.assign(field(global, 'id'), { value_type: type, rust_type: type })
    const view = execute(global, assets(global))
    const id = type === 'i64' ? '9223372036854775807' : '18446744073709551615'
    assert.equal(view.resource.recordId({ id }), id)
    assert.ok(api.includes("import type { Id } from '@/shared/http/types'"))
  }
  const view = execute(order(), assets(order()))
  assert.equal(
    view.resource.recordId({ tenant_id: 'tenant', id: '9223372036854775807' }),
    '9223372036854775807',
  )
  assert.deepEqual(keys(view.queryFields), ['name', 'status'])
  assert.deepEqual(keys(view.columns), ['id', 'name', 'status', 'created_at', 'updated_at'])
})

test('Post 状态枚举在生成的表单中使用 radio 控件', () => {
  const resource = fixture('post')
  const view = execute(resource, assets(resource))
  assert.equal(view.formFields.find((field) => field.key === 'status')?.kind, 'radio')
})
