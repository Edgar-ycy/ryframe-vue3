<template>
  <div class="app-wrapper" :class="{ 'sidebar-collapse': appStore.sidebarCollapsed, 'no-tagsview': !settingsStore.tagsView, 'is-mobile': appStore.isMobile }">
    <!-- 侧边栏 -->
    <Sidebar />
    <button
      v-if="appStore.isMobile && !appStore.sidebarCollapsed"
      type="button"
      class="mobile-sidebar-mask"
      :aria-label="t('shell.layout.closeMobileNavigation')"
      @click="appStore.closeSidebar()"
    />
    <!-- 右侧主体 -->
    <div class="main-container">
      <!-- 顶栏 -->
      <Navbar />
      <!-- 标签页 -->
      <TagsView v-if="settingsStore.tagsView" />
      <TenantBusinessDataBanner />
      <!-- 主内容区 -->
      <AppMain />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useShellSettingsQuery } from '@/app/settings/shellSettingsQuery'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import Sidebar from './Sidebar/index.vue'
import Navbar from './Navbar/index.vue'
import TagsView from './TagsView/index.vue'
import AppMain from './AppMain/index.vue'
import TenantBusinessDataBanner from './TenantBusinessDataBanner.vue'

const appStore = useAppStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
useShellSettingsQuery()

// 初始化时应用持久化设置到 DOM
settingsStore.initSettings()

onMounted(() => {
  appStore.initResponsive()
})

onUnmounted(() => {
  appStore.destroyResponsive()
})
</script>
