import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { renderMenuRouteCatalog } from '../api-artifacts.ts'

const source = JSON.parse(
  await readFile(new URL('../../openapi/openapi.json', import.meta.url), 'utf8'),
)

function businessDocument() {
  const document = structuredClone(source)
  const resource = structuredClone(
    document['x-ryframe-crud-resources'].resources.find((item) => item.name === 'post'),
  )
  const previousApi = structuredClone(resource.api)
  resource.name = 'order_item'
  resource.module = 'business'
  resource.labels = { en: 'OrderItem', zh_cn: '订单明细' }
  resource.menu.labels = resource.labels
  resource.menu.key = 'sales-orders.order-item'
  resource.menu.parent = 'sales-orders'
  resource.route = { key: resource.menu.key, path: '/sales_orders/order_item' }
  resource.api = {
    path: '/api/v1/business/sales_orders/order_item',
    operations: {
      create: 'post_business_sales_orders_order_item',
      list: 'get_business_sales_orders_order_item',
      read: 'get_business_sales_orders_order_item_by_id',
      update: 'put_business_sales_orders_order_item_by_id',
      delete: 'delete_business_sales_orders_order_item_by_id',
    },
  }
  resource.access = {
    system_tenant_only: true,
    permissions: {
      create: 'sales-orders:order-item:add',
      read: 'sales-orders:order-item:list',
      list: 'sales-orders:order-item:list',
      update: 'sales-orders:order-item:edit',
      delete: 'sales-orders:order-item:remove',
    },
  }
  resource.extension_permissions = {}
  for (const suffix of ['', '/{id}']) {
    const path = structuredClone(document.paths[previousApi.path + suffix])
    for (const operation of Object.values(path)) {
      const action = Object.keys(previousApi.operations).find(
        (action) => previousApi.operations[action] === operation.operationId,
      )
      if (action) operation.operationId = resource.api.operations[action]
    }
    document.paths[resource.api.path + suffix] = path
  }
  document['x-ryframe-crud-resources'].resources = [resource]
  const catalog = document['x-ryframe-permission-catalog']
  catalog.codes = [
    ...new Set([...catalog.codes, ...Object.values(resource.access.permissions)]),
  ].sort()
  const route = {
    route_key: resource.route.key,
    title_key: 'orderItem',
    name: '订单明细',
    menu_type: 'C',
    page_key: resource.route.key,
    permission_code: resource.access.permissions.list,
    capability_code: null,
  }
  document['x-ryframe-menu-routes'].routes.push(route)
  return { document, route }
}

test('业务蛇形资源名通过菜单契约，路由分段使用中划线，标题键使用驼峰', () => {
  const { document } = businessDocument()
  const rendered = renderMenuRouteCatalog(document)
  assert.match(rendered, /"sales-orders.order-item": "orderItem"/u)
  assert.match(rendered, /"orderItem": "订单明细"/u)
  assert.match(rendered, /"orderItem": "OrderItem"/u)
})

test('业务菜单不能将下划线路由或标题键交给运行时猜测修复', () => {
  for (const field of ['route_key', 'title_key']) {
    const { document, route } = businessDocument()
    route[field] = field === 'route_key' ? 'sales_orders.order_item' : 'order_item'
    assert.throws(() => renderMenuRouteCatalog(document), new RegExp(`${field} 无效`, 'u'))
  }
})

test('不同业务路由不能覆盖同一个标题翻译键', () => {
  const { document, route } = businessDocument()
  document['x-ryframe-menu-routes'].routes.push({ ...route, route_key: 'other.order-item' })
  assert.throws(() => renderMenuRouteCatalog(document), /title_key 重复/u)
})

test('业务根目录使用独立标题键且不伪装为页面或权限', () => {
  const { document } = businessDocument()
  document['x-ryframe-menu-routes'].routes.push({
    route_key: 'sales-orders',
    title_key: 'salesOrdersBusinessDirectory',
    name: 'sales-orders',
    menu_type: 'M',
    page_key: null,
    permission_code: null,
    capability_code: null,
  })
  const rendered = renderMenuRouteCatalog(document)
  assert.match(rendered, /"sales-orders": "salesOrdersBusinessDirectory"/u)
  assert.match(
    rendered,
    /"defaultName": "sales-orders",\s+"icon": null,\s+"routeKey": "sales-orders",\s+"titleKey": "salesOrdersBusinessDirectory"/u,
  )
})
