<template>
  <div class="sidebar-container">
    <div v-if="settingsStore.sidebarLogo" class="logo">
      <span v-show="!appStore.sidebarCollapsed">RyFrame</span>
      <span v-show="appStore.sidebarCollapsed" style="font-size: 16px;">R</span>
    </div>
    <el-scrollbar>
      <el-menu
        :default-active="activeMenu"
        :collapse="appStore.sidebarCollapsed"
        :unique-opened="true"
        :background-color="menuBgColor"
        :text-color="menuTextColor"
        :active-text-color="settingsStore.themeColor"
        @select="handleMenuSelect"
      >
        <template v-for="menu in permissionStore.menus" :key="menu.path">
          <!-- 子菜单：alwaysShow 或多于1个可见子节点 -->
          <el-sub-menu
            v-if="isSubMenu(menu)"
            :index="menu.path"
            :teleported="false"
          >
            <template #title>
              <el-icon v-if="menu.meta?.icon"><component :is="menu.meta.icon" /></el-icon>
              <span>{{ menu.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="child in visibleChildren(menu)"
              :key="child.path"
              :index="resolvePath(menu.path, child.path)"
            >
              <el-icon v-if="child.meta?.icon"><component :is="child.meta.icon" /></el-icon>
              <template #title>{{ child.meta?.title }}</template>
            </el-menu-item>
          </el-sub-menu>

          <!-- 叶子菜单项：单子节点折叠为自身 -->
          <el-menu-item
            v-else
            :index="leafPath(menu)"
          >
            <el-icon v-if="leafMeta(menu).icon">
              <component :is="leafMeta(menu).icon" />
            </el-icon>
            <template #title>{{ leafMeta(menu).title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { resolve } from 'path-browserify'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import { useSettingsStore } from '@/stores/settings'
import type { RouteRecordRaw } from 'vue-router'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const permissionStore = usePermissionStore()
const settingsStore = useSettingsStore()

const activeMenu = computed(() => route.path)

// 侧边栏配色：深色主题和浅色主题使用不同背景
const menuBgColor = computed(() => settingsStore.theme === 'dark' ? '#1a1a2e' : '#111827')
const menuTextColor = computed(() => settingsStore.theme === 'dark' ? '#a5b4fc' : '#9ca3af')

function handleMenuSelect(indexPath: string) {
  router.push(indexPath)
}

/** 获取可见子节点（排除 hidden） */
function visibleChildren(menu: RouteRecordRaw): RouteRecordRaw[] {
  return (menu.children || []).filter(c => !c.meta?.hidden)
}

/** 是否渲染为子菜单 */
function isSubMenu(menu: RouteRecordRaw): boolean {
  if (!menu.children?.length) return false
  if (menu.meta?.alwaysShow) return true
  return visibleChildren(menu).length > 1
}

/** 叶子菜单的路径 */
function leafPath(menu: RouteRecordRaw): string {
  const visible = visibleChildren(menu)
  // 单子节点折叠：取子节点完整路径
  if (visible.length === 1) {
    return resolve(menu.path, visible[0].path)
  }
  return menu.path
}

/** 叶子菜单的 meta 信息 */
function leafMeta(menu: RouteRecordRaw): Record<string, any> {
  const visible = visibleChildren(menu)
  // 单子节点折叠：取子节点的 meta
  if (visible.length === 1) {
    return visible[0].meta || {}
  }
  return menu.meta || {}
}

/** 拼接父子路径 */
function resolvePath(parentPath: string, childPath: string): string {
  return resolve(parentPath, childPath)
}
</script>
