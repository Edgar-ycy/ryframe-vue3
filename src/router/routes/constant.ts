import type { RouteRecordRaw } from 'vue-router'

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/reset-password/index.vue'),
    meta: { title: '重置密码', hidden: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/index.vue'),
    redirect: '/index',
    children: [
      {
        path: 'index',
        name: 'Index',
        component: () => import('@/views/index.vue'),
        meta: { title: '首页', icon: 'HomeFilled', affix: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心', icon: 'User', hidden: true },
      },
      {
        path: 'platform/tenants',
        name: 'PlatformTenants',
        component: () => import('@/views/platform/tenant/index.vue'),
        meta: {
          title: '租户管理',
          icon: 'OfficeBuilding',
          hidden: true,
          requiresPermission: true,
          permission: 'tenant:list',
        },
      },
    ],
  },
  {
    path: '/redirect',
    name: 'Redirect',
    component: () => import('@/views/redirect/index.vue'),
    meta: { title: '重定向', hidden: true },
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '404', hidden: true },
  },
  {
    path: '/401',
    name: '401',
    component: () => import('@/views/error/401.vue'),
    meta: { title: '无权限', hidden: true },
  },
  {
    path: '/403',
    name: '403',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '禁止访问', hidden: true },
  },
  {
    path: '/500',
    name: '500',
    component: () => import('@/views/error/500.vue'),
    meta: { title: '服务器错误', hidden: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: { hidden: true },
  },
]
