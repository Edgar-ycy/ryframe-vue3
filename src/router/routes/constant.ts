import type { RouteRecordRaw } from 'vue-router'
import { ROOT_LAYOUT_ROUTE_NAME } from '@/router/layout'
import { withRouteComponentName } from '@/shared/navigation/namedRouteComponent'
import { withRouteMessageCatalogs } from '@/i18n/lazyCatalog'

const dashboardPage = withRouteMessageCatalogs('home', () => import('@/views/index.vue'))

const profilePage = withRouteMessageCatalogs(
  'account.profile',
  () => import('@/views/profile/index.vue'),
)

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: withRouteComponentName(
      'Login',
      withRouteMessageCatalogs('account.login', () => import('@/views/login/index.vue')),
    ),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: withRouteComponentName(
      'ResetPassword',
      withRouteMessageCatalogs(
        'account.reset-password',
        () => import('@/views/reset-password/index.vue'),
      ),
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
        component: withRouteComponentName('Index', dashboardPage),
        meta: { title: '首页', icon: 'HomeFilled', affix: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: withRouteComponentName('Profile', profilePage),
        meta: { title: '个人中心', icon: 'User', hidden: true },
      },
      {
        path: 'profile/exports',
        name: 'ProfileExports',
        component: withRouteComponentName(
          'ProfileExports',
          withRouteMessageCatalogs(
            'account.exports',
            () => import('@/views/profile/exports/index.vue'),
          ),
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
    component: withRouteComponentName(
      '404',
      withRouteMessageCatalogs('account.error', () => import('@/views/error/404.vue')),
    ),
    meta: { title: '404', hidden: true },
  },
  {
    path: '/401',
    name: '401',
    component: withRouteComponentName(
      '401',
      withRouteMessageCatalogs('account.error', () => import('@/views/error/401.vue')),
    ),
    meta: { title: '无权限', hidden: true },
  },
  {
    path: '/403',
    name: '403',
    component: withRouteComponentName(
      '403',
      withRouteMessageCatalogs('account.error', () => import('@/views/error/403.vue')),
    ),
    meta: { title: '禁止访问', hidden: true },
  },
  {
    path: '/503',
    name: '503',
    component: withRouteComponentName(
      '503',
      withRouteMessageCatalogs('account.error', () => import('@/views/error/503.vue')),
    ),
    meta: { title: '服务暂不可用', hidden: true },
  },
  {
    path: '/feature-unavailable',
    name: 'FeatureUnavailable',
    component: withRouteComponentName(
      'FeatureUnavailable',
      withRouteMessageCatalogs(
        'account.error',
        () => import('@/views/error/feature-unavailable.vue'),
      ),
    ),
    meta: { title: '功能不可用', hidden: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: { hidden: true },
  },
]
