import assert from 'node:assert/strict'
import test from 'node:test'

import { renderFields } from '../resource-render/fields.mjs'
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

test('Post actions 插槽保留最后成功查询、选择归属及完整的强类型插槽参数', () => {
  const page = renderTransport(fixture('post'), version).get('page.vue')
  for (const expected of [
    'name="actions"',
    ':last-successful-query="lastSuccessfulQuery ?? null"',
    'lastSuccessfulQuery: PostQuery | null',
    'actions?(props:',
    '<template v-if="slots.actions" #actions="{ selectedExportIds, captureSelectionOwnership }">',
    ':selected-export-ids="selectedExportIds"',
    ':capture-selection-ownership="captureSelectionOwnership"',
    "import { computed } from 'vue'",
    'selectedExportIds: string[]',
    'captureSelectionOwnership: () => () => boolean',
    ':can-export="canExport"',
  ])
    assert.ok(page.includes(expected), expected)
})

test('Post radio 及创建更新限制、API 类型与菜单注册保持契约', () => {
  const resource = fixture('post')
  const fields = renderFields(resource, version).get('fields.ts')
  for (const expected of ['disabledOnEdit: true', 'editOnly: true', 'String(record.name)'])
    assert.ok(fields.includes(expected), expected)
  const view = execute(resource, assets(resource))
  assert.equal(view.formFields.find((field) => field.key === 'status')?.kind, 'radio')
  const transport = renderTransport(resource, version)
  const api = transport.get('api.ts')
  for (const expected of [
    'ApiSchema, OperationJsonBody, OperationQuery',
    "export type PostRecord = ApiSchema<'PostVo'>",
    "export type PostQuery = OperationQuery<'get_system_posts'>",
    "OperationJsonBody<'post_system_posts'>",
  ])
    assert.ok(api.includes(expected), expected)
  assert.ok(!api.includes('export interface PostRecord'))
  for (const expected of [
    'routeKey: "system.post"',
    'permissionCode: "system:post:list"',
    'page: () => import("@/views/system/post/index.vue")',
  ])
    assert.ok(transport.get('registration.ts').includes(expected), expected)
})
