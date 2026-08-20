import type { RouteRecordRaw } from 'vue-router'
import { ROOT_LAYOUT_ROUTE_NAME } from '@/router/layout'
import { withRouteComponentName } from '@/router/namedRouteComponent'

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: withRouteComponentName('Login', () => import('@/views/login/index.vue')),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: withRouteComponentName(
      'ResetPassword',
      () => import('@/views/reset-password/index.vue'),
    ),
    meta: { title: '重置密码', hidden: true },
  },
  {
    path: '/',
    name: ROOT_LAYOUT_ROUTE_NAME,
    component: () => import('@/components/layout/index.vue'),
    redirect: '/index',
    children: [
      {
        path: 'index',
        name: 'Index',
        component: withRouteComponentName('Index', () => import('@/views/index.vue')),
        meta: { title: '首页', icon: 'HomeFilled', affix: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: withRouteComponentName('Profile', () => import('@/views/profile/index.vue')),
        meta: { title: '个人中心', icon: 'User', hidden: true },
      },
      {
        path: 'profile/exports',
        name: 'ProfileExports',
        component: withRouteComponentName(
          'ProfileExports',
          () => import('@/views/profile/exports/index.vue'),
        ),
        meta: { title: '我的导出', icon: 'Download', hidden: true },
      },
    ],
  },
  {
    path: '/redirect/:path(.*)*',
    name: 'Redirect',
    component: withRouteComponentName('Redirect', () => import('@/views/redirect/index.vue')),
    meta: { title: '重定向', hidden: true },
  },
  {
    path: '/404',
    name: '404',
    component: withRouteComponentName('404', () => import('@/views/error/404.vue')),
    meta: { title: '404', hidden: true },
  },
  {
    path: '/401',
    name: '401',
    component: withRouteComponentName('401', () => import('@/views/error/401.vue')),
    meta: { title: '无权限', hidden: true },
  },
  {
    path: '/403',
    name: '403',
    component: withRouteComponentName('403', () => import('@/views/error/403.vue')),
    meta: { title: '禁止访问', hidden: true },
  },
  {
    path: '/503',
    name: '503',
    component: withRouteComponentName('503', () => import('@/views/error/503.vue')),
    meta: { title: '服务暂不可用', hidden: true },
  },
  {
    path: '/feature-unavailable',
    name: 'FeatureUnavailable',
    component: withRouteComponentName(
      'FeatureUnavailable',
      () => import('@/views/error/feature-unavailable.vue'),
    ),
    meta: { title: '功能不可用', hidden: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: { hidden: true },
  },
]
