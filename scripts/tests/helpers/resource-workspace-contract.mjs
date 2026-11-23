import { readFileSync } from 'node:fs'

const orderPermissionMarkers = ['list', 'create', 'update', 'delete'].map(
  (action) => `"system:order:${action}"`,
)
const operationNames = [
  'delete_system_orders_by_id',
  'get_system_orders',
  'get_system_orders_by_id',
  'post_system_orders',
  'put_system_orders_by_id',
]
const generatedSchemaMarkers = [
  'ApiPageResponse_OrderVo:',
  'ApiResponse_OrderVo:',
  'CreateOrderDto:',
  'UpdateOrderDto:',
]
const fixtureSchemaMarkers = [
  'type OrderContractRecord = {',
  'OrderVo: OrderContractRecord;',
  'OrderDetailVo: OrderContractRecord & {',
]
const componentMarker = 'export interface components {\n    schemas: {\n'

function orderFrontendContractState({ permissions, operations, schema }) {
  const permissionsPresent = orderPermissionMarkers.map((marker) => permissions.includes(marker))
  const operationConstants = operationNames.map((name) =>
    operations.includes(`export const ${name} =`),
  )
  const schemaOperations = operationNames.map((name) => schema.includes(`    ${name}: {`))
  const generatedSchema = generatedSchemaMarkers.map((marker) => schema.includes(marker))
  const fixtureSchema = fixtureSchemaMarkers.map((marker) => schema.includes(marker))
  const commonComplete =
    permissionsPresent.every(Boolean) &&
    operationConstants.every(Boolean) &&
    schemaOperations.every(Boolean)
  const generatedComplete = generatedSchema.every(Boolean)
  const generatedAny = generatedSchema.some(Boolean)
  const fixtureComplete = fixtureSchema.every(Boolean)
  const fixtureAny = fixtureSchema.some(Boolean)
  const generatedDetailPresent = schema.includes('OrderDetailVo:')
  if (commonComplete && fixtureComplete && !generatedAny) return 'complete'
  if (commonComplete && generatedComplete && !fixtureAny) {
    return generatedDetailPresent ? 'complete' : 'generated-basic'
  }
  if (
    permissionsPresent.some(Boolean) ||
    operationConstants.some(Boolean) ||
    schemaOperations.some(Boolean) ||
    generatedAny ||
    fixtureAny ||
    generatedDetailPresent
  ) {
    throw new Error('只发现部分权限、operation 或 schema 标记，拒绝猜测并重复装配')
  }
  return 'missing'
}

function assertComplete(contract, message) {
  if (orderFrontendContractState(contract) !== 'complete') throw new Error(message)
}

function addGeneratedOrderDetailSchema(schema) {
  if (schema.split(componentMarker).length !== 2) {
    throw new Error('OpenAPI schema 必须包含唯一的 components 接口')
  }
  const detailSchema =
    '        OrderDetailVo: import("./core").components["schemas"]["OrderVo"] & {\n' +
    '            parent?: import("./core").components["schemas"]["OrderVo"] | null;\n' +
    '        };\n'
  return schema.replace(componentMarker, () => componentMarker + detailSchema)
}

function readFixture(name) {
  try {
    return readFileSync(new URL(`../fixtures/resource-workspace/${name}`, import.meta.url), 'utf8')
  } catch {
    throw new Error('无法读取 Order 前端契约 fixture')
  }
}

export function prepareOrderFrontendContract({ permissions, operations, schema }) {
  const contract = { permissions, operations, schema }
  switch (orderFrontendContractState(contract)) {
    case 'complete':
      return null
    case 'generated-basic': {
      const upgraded = { ...contract, schema: addGeneratedOrderDetailSchema(schema) }
      assertComplete(upgraded, '刚升级的 Order 前端契约应完整')
      return upgraded
    }
  }

  const permissionMarker = 'export const permissionCatalog = [\n'
  if (!permissions.includes(permissionMarker)) {
    throw new Error('权限清单缺少 permissionCatalog')
  }
  permissions = permissions.replace(
    permissionMarker,
    () => permissionMarker + orderPermissionMarkers.map((marker) => `  ${marker},\n`).join(''),
  )
  operations += '\n' + readFixture('order_operations.ts.part')
  if (!schema.includes(componentMarker)) {
    throw new Error('OpenAPI schema 缺少 components 接口')
  }
  schema = schema.replace(
    componentMarker,
    () =>
      componentMarker +
      '        OrderVo: OrderContractRecord;\n' +
      '        OrderDetailVo: OrderContractRecord & { parent?: OrderContractRecord | null };\n',
  )
  const operationMarker = 'export interface operations {\n'
  if (!schema.includes(operationMarker)) throw new Error('OpenAPI schema 缺少 operations 接口')
  const fixture = readFixture('order_schema.ts.part')
  schema = schema.replace(operationMarker, () => fixture)
  const updated = { permissions, operations, schema }
  assertComplete(updated, '刚装配的 Order 前端契约应完整')
  return updated
}
