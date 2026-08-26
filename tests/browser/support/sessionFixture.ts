import type { ApiFixtureOptions } from './types'

function menuItem(id: string, name: string, routeKey: string, permission: string, sort: number) {
  return {
    children: [],
    icon: '',
    id,
    menu_type: 'C',
    name,
    parent_id: id.startsWith('2') ? '200' : '100',
    perm_code: permission,
    route_key: routeKey,
    sort,
    status: '1',
    visible: true,
  }
}

export function createSessionContext(options: ApiFixtureOptions = {}) {
  const tenantId = options.tenantId ?? 'default'
  return {
    authorization_epoch: '11',
    business_data: { placement_generation: '3', state: 'active' },
    capabilities: [],
    is_super_admin: false,
    menus: [
      {
        children: [
          menuItem('101', 'system.user', 'system.user', 'system:user:list', 1),
          menuItem('102', 'system.post', 'system.post', 'system:post:list', 2),
        ],
        icon: 'Setting',
        id: '100',
        menu_type: 'M',
        name: 'system',
        parent_id: null,
        perm_code: null,
        route_key: 'system',
        sort: 1,
        status: '1',
        visible: true,
      },
      {
        children: [menuItem('201', 'platform.tenant', 'platform.tenant', 'tenant:list', 1)],
        icon: 'Platform',
        id: '200',
        menu_type: 'M',
        name: 'platform',
        parent_id: null,
        perm_code: null,
        route_key: 'platform',
        sort: 2,
        status: '1',
        visible: true,
      },
    ],
    permissions: [
      'system:user:list',
      'system:user:export',
      'system:post:list',
      'system:post:add',
      'system:post:edit',
      'system:post:remove',
      'system:post:export',
      'tenant:list',
      'tenant:usage:list',
      'tenant:add',
      'tenant:edit',
      'tenant:status',
    ],
    roles: ['tester'],
    runtime_epoch: '7',
    user: {
      email: 'tester@example.com',
      id: '42',
      nickname: '测试用户',
      phone: '13800000000',
      tenant_id: tenantId,
      tenant_name: tenantId === 'system' ? '系统租户' : '默认租户',
      username: 'tester',
    },
  }
}
