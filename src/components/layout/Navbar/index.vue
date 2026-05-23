<template>
  <div class="navbar">
    <!-- 折叠按钮 -->
    <div class="hamburger" @click="appStore.toggleSidebar()">
      <el-icon><Fold v-if="!appStore.sidebarCollapsed" /><Expand v-else /></el-icon>
    </div>

    <!-- 面包屑 -->
    <el-breadcrumb class="breadcrumb" separator="/">
      <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.path">
        {{ item.meta?.title }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <!-- 右侧操作 -->
    <div class="navbar-right">
      <!-- 全屏切换 -->
      <el-icon class="navbar-action" @click="toggleFullscreen" style="cursor:pointer;font-size:18px;margin-right:12px">
        <FullScreen />
      </el-icon>
      <!-- 主题切换 -->
      <el-switch
        v-model="isDark"
        inline-prompt
        style="--el-switch-on-color: #409EFF; margin-right:12px"
        @change="toggleTheme"
      >
        <template #active-icon><el-icon><Moon /></el-icon></template>
        <template #inactive-icon><el-icon><Sunny /></el-icon></template>
      </el-switch>
      <!-- 布局设置 -->
      <el-icon class="navbar-action" style="cursor:pointer;font-size:18px;margin-right:12px" @click="settingsVisible = true">
        <Setting />
      </el-icon>
      <el-dropdown @command="handleCommand">
        <span class="user-info">
          <el-avatar :size="32" :src="userStore.avatar">
            <el-icon><UserFilled /></el-icon>
          </el-avatar>
          <span>{{ userStore.nickname || userStore.username }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <!-- 布局设置抽屉 -->
      <Settings v-model="settingsVisible" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import Settings from '../Settings/index.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

const settingsVisible = ref(false)

const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta?.title)
  return matched
})

const isDark = ref(appStore.theme === 'dark')

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

function toggleTheme(val: boolean) {
  appStore.setTheme(val ? 'dark' : 'light')
  document.documentElement.classList.toggle('dark', val)
}

const handleCommand = async (command: string) => {
  switch (command) {
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
      } catch {
        return
      }
      await userStore.logout()
      router.push('/login')
      break
    case 'profile':
      router.push('/profile')
      break
  }
}
</script>
