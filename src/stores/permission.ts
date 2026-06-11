import { defineStore } from 'pinia'
import { resolveComponent, LAYOUT } from '@/router/componentMap'
import { constantRoutes } from '@/router/routes/constant'
import type { MenuTreeNode } from '@/api/modules/menu'
import type { RouteRecordRaw } from 'vue-router'

/** 提取 constantRoutes 中 Layout 组件的可见子路由，作为独立顶级菜单项（首页、个人中心等） */
function getConstantMenus(): RouteRecordRaw[] {
  const layoutRoute = constantRoutes.find(r => r.path === '/' && r.children)
  if (!layoutRoute) return []
  // 取出子路由，过滤 hidden，将相对路径解析为绝对路径
  const children = layoutRoute.children || []
  return children
    .filter(c => !c.meta?.hidden)
    .map(c => ({
      ...c,
      path: '/' + String(c.path).replace(/^\/+/, ''),
    }))
}

interface PermissionState {
  /** 已注册的动态路由（含 hidden 页面） */
  routes: RouteRecordRaw[]
  /** 侧边栏菜单（不含 hidden 页面） */
  menus: RouteRecordRaw[]
  /** 是否已完成路由加载（防止守卫重复触发） */
  isRoutesLoaded: boolean
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    routes: [],
    menus: [],
    isRoutesLoaded: false,
  }),

  actions: {
    /**
     * 核心方法：从后端菜单树生成 Vue Router 路由
     *
     * @param menuTree - 后端 /system/menus/user 返回的菜单树
     * @returns 生成的路由数组（可直接 addRoute）
     */
    generateRoutes(menuTree: MenuTreeNode[]) {
      const routes = buildRoutesFromMenuTree(menuTree)
      this.routes = routes
      // 侧边栏菜单 = 常量路由（首页/个人中心） + 动态路由（排除 hidden）
      this.menus = [...getConstantMenus(), ...filterHiddenRoutes(routes)]
      this.isRoutesLoaded = true
      return routes
    },

    resetRoutes() {
      this.routes = []
      this.menus = []
      this.isRoutesLoaded = false
    },
  },
})

// ============================================================
//  字段兼容层：后端可能返回不同版本的字段名
// ============================================================

/** 获取节点名称（兼容 name / menu_name） */
function getNodeTitle(n: MenuTreeNode): string {
  return n.name ?? n.menu_name ?? ''
}

/** 判断 is_cache / is_frame（兼容 boolean / string / number） */
function toBool(v: any): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  return v === '1' || v === 'true'
}

/** 获取排序号（兼容 sort / order_num） */
function getNodeSort(n: MenuTreeNode): number {
  return n.sort ?? n.order_num ?? 0
}

/** 判断节点是否可见（兼容 boolean / string） */
function isNodeVisible(n: MenuTreeNode): boolean {
  if (n.visible === undefined || n.visible === null) return true
  if (typeof n.visible === 'boolean') return n.visible
  return n.visible !== '0' // 字符串 '0' 表示隐藏
}

/** 推断菜单类型：若 menu_type 缺失，从 component 字段推导 */
function getMenuType(n: MenuTreeNode): string {
  if (n.menu_type) return n.menu_type
  // component 为空 → 按钮 F
  if (!n.component) return 'F'
  // component 为 'Layout' → 目录 M
  if (n.component === 'Layout' || n.component === 'ParentView') return 'M'
  // 其他 → 菜单 C
  return 'C'
}

/** 图标名转 PascalCase（setting → Setting, tree-table → TreeTable） */
function iconPascalCase(icon: string): string {
  if (!icon) return ''
  return icon.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
}

// ============================================================
//  核心转换：后端菜单树 → Vue Router RouteRecordRaw[]
// ============================================================

/** 与 constantRoutes 冲突的路径，跳过不生成动态路由 */
const SKIP_PATHS = new Set(['/', '/dashboard', '/login', '/404', '/401', '/403', '/500', '/redirect', '/profile'])

/**
 * 将后端菜单树节点（含 children）递归转为路由
 *
 * @param nodes  当前层级的菜单节点
 * @param parentPath  父级路由 path（用于将子节点绝对路径转为相对路径）
 */
function buildRoutesFromMenuTree(nodes: MenuTreeNode[], parentPath?: string): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = []

  for (const node of nodes) {
    // 跳过停用的菜单（菜单 status 约定: '1'=正常, '0'=停用，与用户/角色接口相反）
    if (node.status !== '1') continue

    // 按钮（F）不产生路由
    const type = getMenuType(node)
    if (type === 'F') continue

    // 跳过与 constantRoutes 冲突的路径
    if (SKIP_PATHS.has(normalizePath(node.path))) continue

    const route = nodeToRoute(node, parentPath)
    if (route) routes.push(route)
  }

  return routes
}

/** 单个节点 → RouteRecordRaw */
function nodeToRoute(node: MenuTreeNode, parentPath?: string): RouteRecordRaw | null {
  const type = getMenuType(node)
  if (type === 'M') return buildDirectoryRoute(node, parentPath)
  if (type === 'C') return buildMenuRoute(node, parentPath)
  return null
}

/** M 目录 → 路由（使用 Layout 组件，包含子路由） */
function buildDirectoryRoute(node: MenuTreeNode, _parentPath?: string): RouteRecordRaw {
  const dirPath = normalizePath(node.path)
  const children = node.children?.length
    ? buildRoutesFromMenuTree(node.children, dirPath)
    : []

  const visibleChildren = children.filter(c => c.meta?.hidden !== true)

  const route: RouteRecordRaw = {
    path: dirPath,
    name: node.path.replace(/\//g, '_'),
    component: LAYOUT,
    redirect: visibleChildren[0] ? `${dirPath}/${visibleChildren[0].path}`.replace(/\/\//g, '/') : dirPath,
    meta: {
      title: getNodeTitle(node),
      icon: iconPascalCase(node.icon) || undefined,
      hidden: !isNodeVisible(node),
      alwaysShow: true,
      noCache: toBool(node.is_cache),
      sort: getNodeSort(node),
    },
    children,
  }

  return route
}

/** C 菜单 → 路由（叶子页面节点） */
function buildMenuRoute(node: MenuTreeNode, parentPath?: string): RouteRecordRaw {
  const compPath = node.component || ''
  const component = resolveComponent(compPath)

  // 子节点路径：若以 / 开头且父路径存在，则去父路径前缀转为相对路径
  let routePath = node.path
  if (parentPath && node.path.startsWith(parentPath)) {
    routePath = node.path.slice(parentPath.length).replace(/^\//, '') || ''
  }
  if (!routePath) routePath = node.path

  const route = {
    path: routePath,
    name: node.path.replace(/\//g, '_'),
    component: component || undefined,
    meta: {
      title: getNodeTitle(node),
      icon: iconPascalCase(node.icon) || undefined,
      hidden: !isNodeVisible(node),
      noCache: toBool(node.is_cache),
      permission: node.perms || undefined,
      sort: getNodeSort(node),
      ...(toBool(node.is_frame) ? { isFrame: true } : {}),
    },
  } as RouteRecordRaw

  // 如果还有子节点（按钮权限 F），收集 perms
  if (node.children?.length) {
    const buttonPerms = node.children
      .filter(c => getMenuType(c) === 'F' && c.perms)
      .map(c => c.perms!)
    if (buttonPerms.length) {
      route.meta = { ...route.meta, buttonPerms }
    }
  }

  return route
}

/** 路径规范化：去除首尾斜杠，添加前导 / */
function normalizePath(path: string): string {
  if (!path) return '/'
  let p = path.trim()
  p = p.replace(/^\/+/, '').replace(/\/+$/, '')
  return '/' + p
}

// ============================================================

/** 过滤 hidden: true 的路由（用于侧边栏菜单） */
function filterHiddenRoutes(routes: readonly RouteRecordRaw[]): RouteRecordRaw[] {
  return routes
    .filter(r => !r.meta?.hidden)
    .map(r => {
      const result: RouteRecordRaw = { ...r }
      if (r.children) {
        const filtered = filterHiddenRoutes(r.children)
        result.children = filtered.length ? filtered : undefined
      }
      return result
    })
}
