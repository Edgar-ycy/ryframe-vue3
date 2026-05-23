<template>
  <div class="app-wrapper" :class="{ 'sidebar-collapse': appStore.sidebarCollapsed }">
    <!-- 侧边栏 -->
    <Sidebar />
    <!-- 右侧主体 -->
    <div class="main-container">
      <!-- 顶栏 -->
      <Navbar />
      <!-- 标签页 -->
      <TagsView />
      <!-- 主内容区 -->
      <AppMain />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import Sidebar from './Sidebar/index.vue'
import Navbar from './Navbar/index.vue'
import TagsView from './TagsView/index.vue'
import AppMain from './AppMain/index.vue'

const appStore = useAppStore()
</script>
