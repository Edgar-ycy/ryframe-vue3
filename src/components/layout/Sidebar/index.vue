<template>
  <div class="sidebar-container">
    <div v-if="settingsStore.sidebarLogo" class="logo">
      <span v-show="!appStore.sidebarCollapsed">RyFrame</span>
      <span v-show="appStore.sidebarCollapsed" style="font-size: 16px;">R</span>
    </div>
    <el-scrollbar>
      <el-menu
        :default-active="route.path"
        :collapse="appStore.sidebarCollapsed"
        :unique-opened="true"
        :background-color="'transparent'"
        :text-color="settingsStore.theme === 'dark' ? '#a5b4fc' : '#9ca3af'"
        :active-text-color="settingsStore.themeColor"
        @select="handleMenuSelect"
      >
        <template v-for="menu in permissionStore.menus" :key="menu.path">
          <el-sub-menu v-if="isSubMenu(menu)" :index="menu.path">
            <template #title>
              <el-icon v-if="menu.meta?.icon"><component :is="resolveElementIcon(menu.meta.icon)" /></el-icon>
              <span>{{ translateNavigationTitle(menu.meta?.title) }}</span>
            </template>
            <el-menu-item
              v-for="child in visibleChildren(menu)"
              :key="child.path"
              :index="resolvePath(menu.path, child.path)"
            >
              <el-icon v-if="child.meta?.icon"><component :is="resolveElementIcon(child.meta.icon)" /></el-icon>
              <template #title>{{ translateNavigationTitle(child.meta?.title) }}</template>
            </el-menu-item>
          </el-sub-menu>

          <el-menu-item v-else :index="leafPath(menu)">
            <el-icon v-if="leafMeta(menu).icon">
              <component :is="resolveElementIcon(leafMeta(menu).icon)" />
            </el-icon>
            <template #title>{{ translateNavigationTitle(leafMeta(menu).title) }}</template>
          </el-menu-item>
        </template>
        <el-menu-item v-if="canManageTenants" index="/platform/tenants">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>{{ t('navigation.tenant') }}</template>
        </el-menu-item>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { OfficeBuilding } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { RouteMeta, RouteRecordRaw } from 'vue-router'
import { usePermission } from '@/hooks/usePermission'
import { translateNavigationTitle } from '@/i18n'
import { resolveElementIcon } from '@/shared/ui/icons'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const permissionStore = usePermissionStore()
const settingsStore = useSettingsStore()
const userStore = useUserStore()
const { hasPermission, isAdmin } = usePermission()
const { t } = useI18n()

const canManageTenants = computed(() =>
  userStore.tenantId === 'system'
  && (isAdmin() || hasPermission('tenant:list')),
)

function handleMenuSelect(indexPath: string): void {
  const target = router.resolve(indexPath)
  if (target.path !== route.path) void router.push(target)
  if (appStore.isMobile) appStore.closeSidebar()
}

function visibleChildren(menu: RouteRecordRaw): RouteRecordRaw[] {
  return (menu.children || []).filter(child => !child.meta?.hidden)
}

function isSubMenu(menu: RouteRecordRaw): boolean {
  if (!menu.children?.length) return false
  if (menu.meta?.alwaysShow) return true
  return visibleChildren(menu).length > 1
}

function leafPath(menu: RouteRecordRaw): string {
  const visible = visibleChildren(menu)
  if (visible.length === 1) return resolvePath(menu.path, visible[0].path)
  return menu.path
}

function leafMeta(menu: RouteRecordRaw): RouteMeta {
  const visible = visibleChildren(menu)
  if (visible.length === 1) return visible[0].meta || {}
  return menu.meta || {}
}

function resolvePath(parentPath: string, childPath: string): string {
  if (childPath.startsWith('/')) return childPath
  return `${parentPath.replace(/\/$/, '')}/${childPath}`.replace(/\/{2,}/g, '/')
}
</script>
