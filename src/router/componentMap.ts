/**
 * 组件路径 → 懒加载函数 映射表
 *
 * 后端菜单数据中 component 字段的值（如 "system/user/index"）
 * 通过此表解析为 Vue 组件的异步导入函数。
 *
 * 当后端新增菜单页面时，只需在此表中添加一行映射即可。
 */
import type { Component } from 'vue'

type ComponentLoader = () => Promise<Component>

// ===== 特殊组件 =====

/** Layout 布局组件 */
const LAYOUT: ComponentLoader = () => import('@/components/layout/index.vue')

/** 内链 iframe 组件 */
const INNER_LINK: ComponentLoader = () => import('@/views/redirect/index.vue')

/** 父级目录占位组件（无实际内容，仅用于路由嵌套） */
const PARENT_VIEW: ComponentLoader = () => Promise.resolve({ template: '<router-view />' }) as any

// ===== 页面组件 =====

const componentMap: Record<string, ComponentLoader> = {
  // ── 首页 ──
  'dashboard/index': () => import('@/views/dashboard/index.vue'),

  // ── 系统管理 ──
  'system/user/index':    () => import('@/views/system/user/index.vue'),
  'system/role/index':    () => import('@/views/system/role/index.vue'),
  'system/menu/index':    () => import('@/views/system/menu/index.vue'),
  'system/dept/index':    () => import('@/views/system/dept/index.vue'),
  'system/post/index':    () => import('@/views/system/post/index.vue'),
  'system/config/index':  () => import('@/views/system/config/index.vue'),
  'system/dict/index':    () => import('@/views/system/dict/index.vue'),
  'system/notice/index':  () => import('@/views/system/notice/index.vue'),
  'system/permission/index': () => import('@/views/system/permission/index.vue'),
  'system/operlog/index':   () => import('@/views/monitor/operlog/index.vue'),
  'system/logininfor/index': () => import('@/views/monitor/loginlog/index.vue'),

  // ── 系统监控 ──
  'monitor/server/index':   () => import('@/views/monitor/server/index.vue'),
  'monitor/runtime/index':  () => import('@/views/monitor/runtime/index.vue'),
  'monitor/cache/index':    () => import('@/views/monitor/cache/index.vue'),
  'monitor/db-pool/index':  () => import('@/views/monitor/db-pool/index.vue'),
  'monitor/operlog/index':  () => import('@/views/monitor/operlog/index.vue'),
  'monitor/loginlog/index': () => import('@/views/monitor/loginlog/index.vue'),
  'monitor/online/index':   () => import('@/views/monitor/online/index.vue'),

  // ── 系统工具 ──
  'tools/gen/index': () => import('@/views/tools/gen/index.vue'),

  // ── 个人中心 ──
  'profile/index': () => import('@/views/profile/index.vue'),
}

/**
 * 根据后端 component 字段解析为路由组件
 *
 * @param componentPath - 后端返回的 component 值，如 "system/user/index"
 * @returns 路由组件（同步 Layout 或异步懒加载）
 */
export function resolveComponent(componentPath: string): ComponentLoader | null {
  if (!componentPath) return null

  const normalized = componentPath.trim()

  // 特殊标识
  if (normalized === 'Layout') return LAYOUT
  if (normalized === 'InnerLink') return INNER_LINK
  if (normalized === 'ParentView') return PARENT_VIEW

  // 查表
  const loader = componentMap[normalized]
  if (loader) return loader

  // 未知组件：使用 router-view 占位并在控制台警告
  console.warn(`[ComponentMap] 未找到组件映射: "${normalized}"，将以 <router-view /> 占位`)
  return PARENT_VIEW
}

export { LAYOUT, INNER_LINK, PARENT_VIEW }
export default componentMap
