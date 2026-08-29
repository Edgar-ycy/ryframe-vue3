import { describe, expect, it } from 'vitest'
import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { projectRouteRecords, restoreRouteRecords } from '@/router/routeProjectionAdapter'

describe('路由投影边界适配', () => {
  it('递归保留动态安装和菜单渲染所需字段', () => {
    const component = {} as Component
    const records: RouteRecordRaw[] = [
      {
        path: '/',
        name: 'Root',
        redirect: '/index',
        children: [
          {
            path: 'index',
            name: 'Index',
            component,
            meta: {
              title: '首页',
              permission: 'system:user:list',
              requiredCapabilities: ['dashboard'],
            },
          },
        ],
      },
    ]

    const projection = projectRouteRecords(records)
    expect(projection).toMatchObject([
      {
        path: '/',
        name: 'Root',
        redirect: '/index',
        children: [
          {
            path: 'index',
            name: 'Index',
            meta: {
              title: '首页',
              permission: 'system:user:list',
              requiredCapabilities: ['dashboard'],
            },
          },
        ],
      },
    ])
    expect(projection[0].children?.[0].component).toBe(component)

    const restored = restoreRouteRecords(projection)
    expect(restored[0].children?.[0].component).toBe(component)
    expect(restored[0].children?.[0].meta?.title).toBe('首页')
  })

  it('拒绝无法无损投影的函数式重定向', () => {
    const records: RouteRecordRaw[] = [
      {
        path: '/legacy',
        redirect: () => '/index',
      },
    ]

    expect(() => projectRouteRecords(records)).toThrow('不支持的非字符串重定向')
  })
})
