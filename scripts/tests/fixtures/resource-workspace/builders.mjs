export const operationNames = [
  'delete_system_orders_by_id',
  'get_system_orders',
  'get_system_orders_by_id',
  'post_system_orders',
  'put_system_orders_by_id',
]

export const orderPermissionMarkers = [
  '"system:order:list"',
  '"system:order:create"',
  '"system:order:update"',
  '"system:order:delete"',
]

export const componentMarker = 'export interface components {\n    schemas: {\n'

export function missingContract() {
  return {
    permissions: 'export const permissionCatalog = [\n]\n',
    operations: "import { bindJsonOperation } from '../operationRequest'\n",
    schema: componentMarker + '    }\n}\nexport interface operations {\n}\n',
  }
}

export function generatedContract({ detail = false } = {}) {
  return {
    permissions: orderPermissionMarkers.join('\n'),
    operations: operationNames
      .map((name) => `export const ${name} = bindJsonOperation({})\n`)
      .join(''),
    schema:
      componentMarker +
      '        ApiPageResponse_OrderVo: {};\n' +
      '        ApiResponse_OrderVo: { data?: { id: string } };\n' +
      '        CreateOrderDto: {};\n' +
      '        UpdateOrderDto: {};\n' +
      (detail ? '        OrderDetailVo: {};\n' : '') +
      '    };\n}\nexport interface operations {\n' +
      operationNames.map((name) => `    ${name}: {}\n`).join('') +
      '}\n',
  }
}
