import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'
import type { MenuTreeNode } from '@/api/modules/menu'

vi.mock('@/features/pageRegistry', () => {
  const component = () => Promise.resolve({ default: {} })
  const pages = {
    system: { path: '/system' },
    'system.absolute': { path: '/other', component },
    'system.missing': { path: '/system/missing' },
    'system.nested': { path: '/system/nested', component },
    'system.profile': { path: '/profile', component },
    'system.service': {
      path: '/system/service',
      component,
      requiredCapabilities: ['system.service_accounts'],
    },
    'system.user': { path: '/system/user', component },
  }
  return {
    getMenuPage: (routeKey?: string | null) =>
      routeKey ? pages[routeKey as keyof typeof pages] : undefined,
  }
})

vi.mock('@/shared/navigation/namedRouteComponent', () => ({
  withRouteComponentName: (name: string, component: unknown) => ({ name, component }),
}))

import {
  buildAccessibleMenus,
  buildRoutesFromMenuTree,
  installRouteProjection,
} from '@/features/navigation/routeProjection'

function menu(
  overrides: Partial<MenuTreeNode> & Pick<MenuTreeNode, 'id' | 'menu_type' | 'name'>,
): MenuTreeNode {
  return {
    children: [],
    icon: '',
    perm_code: 'system:user:list',
    route_key: 'system.user',
    sort: 1,
    status: '1',
    visible: true,
    ...overrides,
  } as MenuTreeNode
}

function route(
  path: string,
  meta?: RouteRecordRaw['meta'],
  children?: RouteRecordRaw[],
): RouteRecordRaw {
  return { path, component: {}, meta, children } as RouteRecordRaw
}

describe('菜单树路由投影', () => {
  beforeEach(() => {
    installRouteProjection({ constantRoutes: [] })
  })

  it('跳过禁用、按钮、固定页面和未知页面节点', () => {
    expect(
      buildRoutesFromMenuTree([
        menu({ id: '1', menu_type: 'C', name: '禁用', status: '0' }),
        menu({ id: '2', menu_type: 'F', name: '按钮' }),
        menu({ id: '3', menu_type: 'C', name: '个人中心', route_key: 'system.profile' }),
        menu({ id: '4', menu_type: 'C', name: '无组件', route_key: 'system.missing' }),
        menu({ id: '5', menu_type: 'F' as never, name: '未知' }),
      ]),
    ).toEqual([])
  })

  it('构建目录、相对子页面、图标和首个可见子路由重定向', () => {
    const routes = buildRoutesFromMenuTree([
      menu({
        id: '10',
        menu_type: 'M',
        name: '系统管理',
        route_key: 'system',
        icon: 'setting-tools',
        perm_code: '',
        children: [
          menu({ id: '11', menu_type: 'C', name: '隐藏用户', visible: false }),
          menu({ id: '12', menu_type: 'C', name: '嵌套页', route_key: 'system.nested' }),
        ],
      }),
    ])

    expect(routes).toHaveLength(1)
    expect(routes[0]).toMatchObject({
      path: '/system',
      name: '_system',
      redirect: '/system/nested',
      meta: {
        icon: 'SettingTools',
        hidden: false,
        alwaysShow: true,
        requiresPermission: false,
      },
    })
    expect(routes[0].children?.map((child) => child.path)).toEqual(['user', 'nested'])
    expect(routes[0].children?.[0].meta?.hidden).toBe(true)
  })

  it('过滤没有有效子页面的目录并为匿名目录生成稳定路径', () => {
    expect(
      buildRoutesFromMenuTree([
        menu({
          id: '20',
          menu_type: 'M',
          name: '空目录',
          route_key: undefined,
          children: [menu({ id: '21', menu_type: 'F', name: '按钮' })],
        }),
      ]),
    ).toEqual([])

    expect(
      buildRoutesFromMenuTree([
        menu({
          id: '22',
          menu_type: 'M',
          name: '匿名目录',
          route_key: undefined,
          perm_code: 'invalid-permission',
        }),
      ])[0],
    ).toMatchObject({
      path: '/menu-22',
      redirect: '/menu-22',
      name: 'menu_22',
      meta: { permission: undefined, requiresPermission: true },
    })
  })

  it('保留不属于父目录的绝对子页面路径', () => {
    expect(
      buildRoutesFromMenuTree(
        [menu({ id: '30', menu_type: 'C', name: '外部页面', route_key: 'system.absolute' })],
        '/system',
      )[0]?.path,
    ).toBe('/other')
  })
})

describe('可访问菜单投影', () => {
  beforeEach(() => {
    installRouteProjection({ constantRoutes: [] })
  })

  it('合并可见固定菜单并规范化固定路径', () => {
    installRouteProjection({
      constantRoutes: [
        {
          path: '/',
          children: [route('index', { title: '首页' }), route('/hidden', { hidden: true })],
        },
      ],
    })

    expect(buildAccessibleMenus([], [], [])).toMatchObject([
      { path: '/index', meta: { title: '首页' } },
    ])
  })

  it('逐项拒绝隐藏、缺能力、缺权限和无可见子节点的路由', () => {
    const routes: RouteRecordRaw[] = [
      route('/hidden', { hidden: true }),
      route('/capability', { requiredCapabilities: ['feature-a'] }),
      route('/missing-permission', { requiresPermission: true }),
      route('/invalid-permission', {
        permission: 'invalid' as never,
        requiresPermission: true,
      }),
      route('/denied', { permission: 'system:user:list', requiresPermission: true }),
      route('/empty-group', { alwaysShow: true }, [route('child', { hidden: true })]),
    ]

    expect(buildAccessibleMenus(routes, [], [])).toEqual([])
  })

  it('保留满足能力和权限要求的父子菜单并移除空 children', () => {
    const routes: RouteRecordRaw[] = [
      route('/system', { alwaysShow: true }, [
        route('user', { permission: 'system:user:list', requiresPermission: true }),
        route('service', {
          permission: 'system:service-account:list',
          requiresPermission: true,
          requiredCapabilities: ['system.service_accounts'],
        }),
      ]),
      route('/plain', undefined, []),
    ]

    expect(
      buildAccessibleMenus(
        routes,
        ['system:user:list', 'system:service-account:list'],
        ['system.service_accounts'],
      ),
    ).toMatchObject([
      { path: '/system', children: [{ path: 'user' }, { path: 'service' }] },
      { path: '/plain', children: undefined },
    ])
  })
})
