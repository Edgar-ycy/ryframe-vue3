<template>
  <div class="app-wrapper" :class="{ 'sidebar-collapse': appStore.sidebarCollapsed, 'no-tagsview': !settingsStore.tagsView, 'is-mobile': appStore.isMobile }">
    <!-- 侧边栏 -->
    <Sidebar />
    <div
      v-if="appStore.isMobile && !appStore.sidebarCollapsed"
      class="mobile-sidebar-mask"
      @click="appStore.closeSidebar()"
    />
    <!-- 右侧主体 -->
    <div class="main-container">
      <!-- 顶栏 -->
      <Navbar />
      <!-- 标签页 -->
      <TagsView v-if="settingsStore.tagsView" />
      <!-- 主内容区 -->
      <AppMain />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import Sidebar from './Sidebar/index.vue'
import Navbar from './Navbar/index.vue'
import TagsView from './TagsView/index.vue'
import AppMain from './AppMain/index.vue'

const appStore = useAppStore()
const settingsStore = useSettingsStore()

// 初始化时应用持久化设置到 DOM
settingsStore.initSettings()

// 从后端同步皮肤/主题配置（覆盖 localStorage 的默认值）
onMounted(() => {
  appStore.initResponsive()
  settingsStore.syncFromServer()
})
</script>
