import { common, wide } from './builders.mjs'

// 对照后端 tests/fixtures/order.toml、ir/normalize.rs 与 ir/model.rs 的已归一化形状。
// 这里消费 IR，不解析 TOML、不承担后端输入校验；source_hash 沿用旧测试的显式输入。
function field(name, type, order, widget, zh, en, usage, changes = {}) {
  const nullable = changes.nullable ?? false
  const wire = name === 'id' ? 'string' : type
  const rust = {
    string: 'String',
    i64: 'i64',
    i32: 'i32',
    date_time: 'chrono::DateTime<chrono::Utc>',
  }
  return {
    name,
    column: name,
    value_type: type,
    wire_type: wire,
    rust_type: nullable ? `Option<${rust[type]}>` : rust[type],
    typescript_type: `${wire === 'i32' ? 'number' : 'string'}${nullable ? ' | null' : ''}`,
    order,
    nullable,
    default: null,
    usage: {
      create: false,
      create_optional: false,
      update: false,
      update_optional: false,
      read: false,
      list: false,
      filter: false,
      sort: false,
      ...Object.fromEntries(usage.map((key) => [key, true])),
    },
    validation: {
      required: false,
      min_length: null,
      max_length: null,
      minimum: null,
      maximum: null,
      pattern: null,
    },
    labels: { zh_cn: zh, en },
    widget,
    enum_values: {},
    ...changes,
  }
}

export function order() {
  const resource = {
    schema_version: 1,
    name: 'order',
    pascal_name: 'Order',
    module: 'system',
    profile: 'flat_crud',
    storage: 'tenant_data',
    tenant_field: 'tenant_id',
    configuration_versioned: true,
    table: 'biz_order',
    primary_key: ['tenant_id', 'id'],
    bootstrap_migration: true,
    schema_hash: '40380cfa4db04ee422970ef81d6cb1f74f231bc4b09c5c4b061a1dc1d16ff490',
    schema_revision: null,
    indexes: [
      { name: 'idx_order_tenant_status', fields: ['tenant_id', 'status'], unique: false },
      { name: 'uk_order_tenant_name', fields: ['tenant_id', 'name'], unique: true },
    ],
    soft_delete: { field: 'del_flag', active: 0, deleted: 1 },
    audit: {
      created_at: 'created_at',
      created_by: null,
      updated_at: 'updated_at',
      updated_by: null,
    },
    fields: [
      field('tenant_id', 'string', 10, 'hidden', '租户', 'Tenant', ['read', 'filter']),
      field('id', 'i64', 20, 'hidden', '设备编号', 'Order ID', ['read', 'list', 'sort']),
      field('name', 'string', 30, 'text', '设备名称', 'Order name', [
        'create',
        'update',
        'read',
        'list',
        'filter',
      ]),
      field('status', 'i32', 40, 'select', '状态', 'Status', [
        'create',
        'update',
        'read',
        'list',
        'filter',
      ]),
      field('created_at', 'date_time', 50, 'date_time', '创建时间', 'Created at', ['read', 'list']),
      field(
        'updated_at',
        'date_time',
        60,
        'date_time',
        '更新时间',
        'Updated at',
        ['read', 'list'],
        {
          nullable: true,
        },
      ),
      field('del_flag', 'i32', 70, 'hidden', '删除标记', 'Deleted flag', ['read'], { default: 0 }),
    ],
    relations: [],
    api: {
      path: '/api/v1/system/orders',
      operations: {
        create: 'post_system_orders',
        read: 'get_system_orders_by_id',
        list: 'get_system_orders',
        update: 'put_system_orders_by_id',
        delete: 'delete_system_orders_by_id',
      },
    },
    access: {
      capability: 'business.order',
      permissions: {
        create: 'system:order:create',
        read: 'system:order:read',
        list: 'system:order:list',
        update: 'system:order:update',
        delete: 'system:order:delete',
      },
    },
    menu: {
      key: 'business.order',
      parent: 'system',
      order: 80,
      icon: 'monitor',
      labels: { zh_cn: '设备管理', en: 'Orders' },
    },
    route: { key: 'business.order', path: '/system/order' },
    labels: { zh_cn: '设备', en: 'Order' },
    extension_permissions: {},
    backend_extensions: { health_probe: true },
    frontend_extensions: { detail_drawer: false },
    source_path: 'order.toml',
    source_hash: 'test',
  }
  Object.assign(resource.fields[2].validation, { required: true, min_length: 1, max_length: 100 })
  const status = resource.fields[3]
  status.default = 1
  Object.assign(status.validation, { required: true, minimum: 0, maximum: 1 })
  status.enum_values = { 0: { zh_cn: '停用', en: 'Disabled' }, 1: { zh_cn: '启用', en: 'Enabled' } }
  return resource
}

export function wideOrder(count) {
  const resource = order()
  resource.module = 'business'
  const fields = wide(count).fields.filter((item) => item.name.startsWith('value_'))
  for (const item of fields) {
    item.validation = structuredClone(resource.fields[2].validation)
    if (Object.keys(item.enum_values).length) {
      item.enum_values = structuredClone(resource.fields[3].enum_values)
    }
  }
  resource.fields.push(...fields)
  return resource
}

export function commonOrder() {
  const resource = order()
  resource.module = 'business'
  const names = ['enabled', 'due_on', 'happens_at', 'amount', 'metadata', 'note', 'count']
  const rust = [
    'bool',
    'chrono::NaiveDate',
    'chrono::DateTime<chrono::Utc>',
    'rust_decimal::Decimal',
    'serde_json::Value',
    'String',
    'i32',
  ]
  for (const item of common().fields.filter((item) => names.includes(item.name))) {
    item.validation = structuredClone(resource.fields[2].validation)
    item.labels = structuredClone(resource.fields[2].labels)
    item.rust_type = rust[names.indexOf(item.name)]
    item.usage.sort = false
    if (item.value_type === 'decimal') item.sql_type = 'DECIMAL(20,6)'
    resource.fields.push(item)
  }
  return resource
}
