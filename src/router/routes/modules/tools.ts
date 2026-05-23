import Layout from '@/components/layout/index.vue'
import type { RouteRecordRaw } from 'vue-router'

export const toolsRoutes: RouteRecordRaw[] = [
  {
    path: '/tools',
    component: Layout,
    redirect: '/tools/gen',
    name: 'Tools',
    meta: { title: '系统工具', icon: 'Tools', alwaysShow: true },
    children: [
      {
        path: 'gen',
        name: 'Gen',
        component: () => import('@/views/tools/gen/index.vue'),
        meta: { title: '代码生成', icon: 'Monitor', permission: 'tools:gen:list' },
      },
    ],
  },
]
