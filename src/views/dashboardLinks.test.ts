import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'
import { collectDashboardLinks } from './dashboardLinks'

describe('collectDashboardLinks', () => {
  const routes: RouteRecordRaw[] = [
    { path: '/index', name: 'Home', meta: { title: '首页' }, component: {} },
    {
      path: '/system',
      name: 'System',
      meta: { title: '系统管理' },
      children: [
        { path: 'user', name: 'User', meta: { title: '用户管理', icon: 'User' }, component: {} },
        { path: 'hidden', name: 'Hidden', meta: { title: '隐藏页', hidden: true }, component: {} },
      ],
    },
    { path: '/monitor', name: 'Monitor', meta: { title: '系统监控', icon: 'Monitor' }, component: {} },
    { path: '/monitor', name: 'Duplicate', meta: { title: '重复项' }, component: {} },
  ]

  it('returns visible leaf routes with resolved unique paths', () => {
    expect(collectDashboardLinks(routes)).toEqual([
      { title: '用户管理', path: '/system/user', icon: 'User' },
      { title: '系统监控', path: '/monitor', icon: 'Monitor' },
    ])
  })

  it('applies an explicit result limit', () => {
    expect(collectDashboardLinks(routes, 1)).toHaveLength(1)
    expect(collectDashboardLinks(routes, 0)).toEqual([])
  })
})
