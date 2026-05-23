import Layout from '@/components/layout/index.vue'
import type { RouteRecordRaw } from 'vue-router'

export const monitorRoutes: RouteRecordRaw[] = [
  {
    path: '/monitor',
    component: Layout,
    redirect: '/monitor/server',
    name: 'Monitor',
    meta: { title: '系统监控', icon: 'Monitor', alwaysShow: true },
    children: [
      {
        path: 'server',
        name: 'Server',
        component: () => import('@/views/monitor/server/index.vue'),
        meta: { title: '服务器监控', icon: 'Cpu', permission: 'monitor:server:list' },
      },
      {
        path: 'operlog',
        name: 'OperLog',
        component: () => import('@/views/monitor/operlog/index.vue'),
        meta: { title: '操作日志', icon: 'Document', permission: 'monitor:operlog:list' },
      },
      {
        path: 'loginlog',
        name: 'LoginLog',
        component: () => import('@/views/monitor/loginlog/index.vue'),
        meta: { title: '登录日志', icon: 'Tickets', permission: 'monitor:loginlog:list' },
      },
      {
        path: 'online',
        name: 'Online',
        component: () => import('@/views/monitor/online/index.vue'),
        meta: { title: '在线用户', icon: 'Connection', permission: 'monitor:online:list' },
      },
    ],
  },
]
