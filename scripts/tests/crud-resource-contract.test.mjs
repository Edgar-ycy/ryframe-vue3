import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'

import { renderCrudResourceCatalog } from '../api-artifacts.mjs'
import { requireCrudResourceCatalog } from '../crud-resource-contract.mjs'

const labels = { en: 'Post name', zh_cn: '岗位名称' }

function contract() {
  const operations = {
    create: 'post_system_posts',
    delete: 'delete_system_posts_by_id',
    list: 'get_system_posts',
    read: 'get_system_posts_by_id',
    update: 'put_system_posts_by_id',
  }
  const permissions = {
    create: 'system:post:add',
    delete: 'system:post:remove',
    list: 'system:post:list',
    read: 'system:post:list',
    update: 'system:post:edit',
  }
  return {
    openapi: '3.1.0',
    paths: {
      '/api/v1/system/posts': {
        get: { operationId: operations.list },
        post: { operationId: operations.create },
      },
      '/api/v1/system/posts/{id}': {
        delete: { operationId: operations.delete },
        get: { operationId: operations.read },
        put: { operationId: operations.update },
      },
    },
    'x-ryframe-crud-resources': {
      version: 1,
      resources: [{
        access: { capability: 'system.post', permissions },
        api: { operations, path: '/api/v1/system/posts' },
        extension_permissions: { export: 'system:post:export' },
        fields: [{
          enum_values: {},
          labels,
          name: 'name',
          nullable: false,
          order: 10,
          usage: {
            create: true,
            create_optional: false,
            filter: true,
            list: true,
            read: true,
            sort: true,
            update: true,
            update_optional: false,
          },
          validation: {
            max_length: 100,
            maximum: null,
            min_length: 1,
            minimum: null,
            required: true,
          },
          value_type: 'string',
          widget: 'text',
          wire_type: 'string',
        }],
        labels: { en: 'Post', zh_cn: '岗位' },
        menu: {
          icon: null,
          key: 'system.post',
          labels: { en: 'Posts', zh_cn: '岗位管理' },
          order: 8,
          parent: 'system',
        },
        module: 'system',
        name: 'post',
        profile: 'flat_crud',
        route: { key: 'system.post', path: '/system/post' },
        storage: 'control_row',
      }],
    },
    'x-ryframe-permission-catalog': {
      codes: [
        'system:post:add',
        'system:post:edit',
        'system:post:export',
        'system:post:list',
        'system:post:remove',
      ],
      version: 1,
    },
  }
}

function resource(document) {
  return document['x-ryframe-crud-resources'].resources[0]
}

function addPermission(document, permission) {
  const catalog = document['x-ryframe-permission-catalog'].codes
  document['x-ryframe-permission-catalog'].codes = [...new Set([...catalog, permission])].sort()
}

function addDeviceResource(document) {
  const device = structuredClone(resource(document))
  const operations = {
    create: 'post_system_devices',
    delete: 'delete_system_devices_by_id',
    list: 'get_system_devices',
    read: 'get_system_devices_by_id',
    update: 'put_system_devices_by_id',
  }
  const permissions = {
    create: 'system:device:add',
    delete: 'system:device:remove',
    list: 'system:device:list',
    read: 'system:device:list',
    update: 'system:device:edit',
  }
  device.access = { capability: 'system.device', permissions }
  device.api = { operations, path: '/api/v1/system/devices' }
  device.extension_permissions = {}
  device.labels = { en: 'Device', zh_cn: '设备' }
  device.menu = {
    icon: 'monitor',
    key: 'system.device',
    labels: { en: 'Devices', zh_cn: '设备管理' },
    order: 80,
    parent: 'system',
  }
  device.name = 'device'
  device.route = { key: 'SystemDevice', path: '/system/device' }
  device.storage = 'tenant_data'
  document.paths['/api/v1/system/devices'] = {
    get: { operationId: operations.list },
    post: { operationId: operations.create },
  }
  document.paths['/api/v1/system/devices/{id}'] = {
    delete: { operationId: operations.delete },
    get: { operationId: operations.read },
    put: { operationId: operations.update },
  }
  for (const permission of Object.values(permissions)) addPermission(document, permission)
  document['x-ryframe-crud-resources'].resources.unshift(device)
  return device
}

function generatedTypeErrors(source) {
  const fileName = 'crudResources.generated.ts'
  const options = {
    module: ts.ModuleKind.ESNext,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
  }
  const host = ts.createCompilerHost(options)
  const readSourceFile = host.getSourceFile.bind(host)
  host.fileExists = name => name === fileName || ts.sys.fileExists(name)
  host.readFile = name => name === fileName ? source : ts.sys.readFile(name)
  host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => (
    name === fileName
      ? ts.createSourceFile(name, source, languageVersion, true, ts.ScriptKind.TS)
      : readSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile)
  )
  const program = ts.createProgram([fileName], options, host)
  return ts.getPreEmitDiagnostics(program)
    .filter(diagnostic => diagnostic.file?.fileName === fileName)
    .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

test('接受与 OpenAPI 操作和权限目录严格对应的资源目录', () => {
  const document = contract()
  const resources = requireCrudResourceCatalog(document['x-ryframe-crud-resources'], document)
  assert.equal(resources[0].name, 'post')
  assert.deepEqual(resources[0].extension_permissions, {
    export: 'system:post:export',
  })

  const generated = renderCrudResourceCatalog(document)
  assert.match(generated, /export const crudResourceCatalog = \[/u)
  assert.match(generated, /export const crudResourceCatalogByName/u)
  assert.match(generated, /"post": crudResourceCatalog\[0\]/u)
  assert.match(generated, /findCrudResource<Name extends CrudResourceName>/u)
  assert.match(generated, /CrudResourceDescriptorByName<Name>/u)
  assert.doesNotMatch(generated, /\bany\b/u)
  assert.doesNotMatch(generated, /as unknown as/u)
})

test('生成的 name 查找保持具体 descriptor 类型关联', () => {
  const document = contract()
  addDeviceResource(document)
  const generated = `${renderCrudResourceCatalog(document)}
const postDescriptor = findCrudResource('post')
const deviceDescriptor = findCrudResource('device')
const postName: 'post' = postDescriptor.name
const deviceName: 'device' = deviceDescriptor.name
void [postName, deviceName]
`
  assert.deepEqual(generatedTypeErrors(generated), [])
})

test('允许没有扩展动作的空 extension_permissions', () => {
  const document = contract()
  resource(document).extension_permissions = {}
  assert.doesNotThrow(
    () => requireCrudResourceCatalog(document['x-ryframe-crud-resources'], document),
  )
})

test('拒绝缺少 extension_permissions 和任意页面布局字段', () => {
  const missing = contract()
  delete resource(missing).extension_permissions
  assert.throws(
    () => requireCrudResourceCatalog(missing['x-ryframe-crud-resources'], missing),
    /extension_permissions/u,
  )

  const layout = contract()
  resource(layout).layout = { columns: 12 }
  assert.throws(
    () => requireCrudResourceCatalog(layout['x-ryframe-crud-resources'], layout),
    /字段必须精确为/u,
  )
})

test('严格校验扩展权限的排序、命名、冲突和目录成员关系', () => {
  const unsorted = contract()
  addPermission(unsorted, 'system:post:archive')
  resource(unsorted).extension_permissions = {
    export: 'system:post:export',
    archive: 'system:post:archive',
  }
  assert.throws(
    () => requireCrudResourceCatalog(unsorted['x-ryframe-crud-resources'], unsorted),
    /必须按名称字典序排列/u,
  )

  const conflict = contract()
  resource(conflict).extension_permissions = {
    create: 'system:post:add',
    export: 'system:post:export',
  }
  assert.throws(
    () => requireCrudResourceCatalog(conflict['x-ryframe-crud-resources'], conflict),
    /不能覆盖标准 CRUD 动作/u,
  )

  const invalidName = contract()
  resource(invalidName).extension_permissions = {
    'batch-export': 'system:post:export',
  }
  assert.throws(
    () => requireCrudResourceCatalog(invalidName['x-ryframe-crud-resources'], invalidName),
    /扩展权限名必须是小写 snake_case/u,
  )

  const unknown = contract()
  resource(unknown).extension_permissions.export = 'system:post:archive'
  assert.throws(
    () => requireCrudResourceCatalog(unknown['x-ryframe-crud-resources'], unknown),
    /不在 x-ryframe-permission-catalog 中/u,
  )
})

test('CRUD 权限必须使用严格三段 kebab-case 且属于全局目录', () => {
  const multiword = contract()
  addPermission(multiword, 'system:work-order:list')
  resource(multiword).access.permissions.create = 'system:work-order:list'
  assert.doesNotThrow(
    () => requireCrudResourceCatalog(multiword['x-ryframe-crud-resources'], multiword),
  )

  for (const invalidPermission of [
    'system:work_order:list',
    'system:-work-order:list',
    'system:work-order-:list',
    'system:work--order:list',
  ]) {
    const invalid = contract()
    resource(invalid).access.permissions.create = invalidPermission
    assert.throws(
      () => requireCrudResourceCatalog(invalid['x-ryframe-crud-resources'], invalid),
      /必须是三段小写 kebab-case 权限码/u,
    )
  }

  const unknown = contract()
  resource(unknown).access.permissions.create = 'system:post:archive'
  assert.throws(
    () => requireCrudResourceCatalog(unknown['x-ryframe-crud-resources'], unknown),
    /不在 x-ryframe-permission-catalog 中/u,
  )
})

for (const [action, routePath, method, wrongMethod] of [
  ['create', '/api/v1/system/posts', 'post', 'put'],
  ['list', '/api/v1/system/posts', 'get', 'head'],
  ['read', '/api/v1/system/posts/{id}', 'get', 'head'],
  ['update', '/api/v1/system/posts/{id}', 'put', 'patch'],
  ['delete', '/api/v1/system/posts/{id}', 'delete', 'options'],
]) {
  test(`拒绝 ${action} operationId 的请求方法漂移`, () => {
    const document = contract()
    const operation = document.paths[routePath][method]
    delete document.paths[routePath][method]
    document.paths[routePath][wrongMethod] = operation
    assert.throws(
      () => requireCrudResourceCatalog(document['x-ryframe-crud-resources'], document),
      /应映射为/u,
    )
  })
}

test('拒绝 operationId 的请求路径漂移', () => {
  const document = contract()
  const detail = '/api/v1/system/posts/{id}'
  const operation = document.paths[detail].get
  delete document.paths[detail].get
  document.paths['/api/v1/system/posts/{post_id}'] = { get: operation }
  assert.throws(
    () => requireCrudResourceCatalog(document['x-ryframe-crud-resources'], document),
    /应映射为 GET \/api\/v1\/system\/posts\/\{id\}/u,
  )
})

for (const [title, mutate, expected] of [
  ['非 system 模块', item => { item.module = 'platform' }, /仅支持 system/u],
  ['集合 API 尾斜杠', item => { item.api.path += '/' }, /api\.path: 字符串格式无效/u],
  ['非 select 枚举', item => {
    item.fields[0].enum_values = { active: labels }
  }, /enum_values 只能配合 select/u],
  ['required 与 nullable 冲突', item => { item.fields[0].nullable = true }, /required=true 冲突/u],
  ['无 create 的 create_optional', item => {
    item.fields[0].usage.create = false
    item.fields[0].usage.create_optional = true
  }, /create_optional 只能用于 create/u],
  ['nullable 的 update_optional', item => {
    item.fields[0].nullable = true
    item.fields[0].validation.required = false
    item.fields[0].usage.update_optional = true
  }, /nullable 与 update_optional/u],
  ['负数长度边界', item => { item.fields[0].validation.min_length = -1 }, /非负安全整数/u],
  ['倒置长度边界', item => {
    item.fields[0].validation.min_length = 101
  }, /min_length 不能大于 max_length/u],
  ['错误类型的长度约束', item => {
    item.fields[0].value_type = 'i32'
    item.fields[0].wire_type = 'i32'
    item.fields[0].widget = 'number'
  }, /长度约束只能用于 string/u],
  ['不支持的可编辑控件', item => { item.fields[0].widget = 'textarea' }, /可编辑字段只支持/u],
  ['不可回读的编辑字段', item => {
    item.fields[0].usage.list = false
    item.fields[0].usage.read = false
  }, /必须同时出现在 read 或 list/u],
]) {
  test(`拒绝 flat_crud v1 非法语义：${title}`, () => {
    const document = contract()
    mutate(resource(document))
    assert.throws(
      () => requireCrudResourceCatalog(document['x-ryframe-crud-resources'], document),
      expected,
    )
  })
}

test('枚举键必须与值类型一致', () => {
  const document = contract()
  const field = resource(document).fields[0]
  field.enum_values = { maybe: labels }
  field.validation.max_length = null
  field.validation.min_length = null
  field.validation.required = false
  field.value_type = 'bool'
  field.widget = 'select'
  field.wire_type = 'bool'
  assert.throws(
    () => requireCrudResourceCatalog(document['x-ryframe-crud-resources'], document),
    /bool 枚举仅支持 false\/true/u,
  )
})

for (const [kind, mutate, expected] of [
  ['菜单键', (device, post) => { post.menu.key = device.menu.key }, /菜单键重复/u],
  ['路由键', (device, post) => { post.route.key = device.route.key }, /路由键重复/u],
  ['路由路径', (device, post) => { post.route.path = device.route.path }, /路由路径重复/u],
]) {
  test(`拒绝跨资源重复${kind}`, () => {
    const document = contract()
    const post = resource(document)
    const device = addDeviceResource(document)
    mutate(device, post)
    assert.throws(
      () => requireCrudResourceCatalog(document['x-ryframe-crud-resources'], document),
      expected,
    )
  })
}
