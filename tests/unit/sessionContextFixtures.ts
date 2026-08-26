export function sessionContext(isSuperAdmin: boolean) {
  return {
    authorization_epoch: '11',
    business_data: {
      placement_generation: '3',
      state: 'active',
    },
    capabilities: [],
    is_super_admin: isSuperAdmin,
    menus: [],
    permissions: ['*:*:*'],
    roles: ['admin'],
    runtime_epoch: '7',
    user: {
      email: '',
      id: '42',
      nickname: '测试用户',
      phone: '',
      tenant_id: 'tenant-a',
      tenant_name: '租户甲',
      username: 'tester',
    },
  }
}
