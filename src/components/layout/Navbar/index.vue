<template>
  <div class="navbar">
    <div class="hamburger" @click="appStore.toggleSidebar()">
      <el-icon><Fold v-if="!appStore.sidebarCollapsed" /><Expand v-else /></el-icon>
    </div>

    <el-breadcrumb class="breadcrumb" separator="/">
      <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.path">
        {{ item.meta?.title }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <div class="navbar-right">
      <el-tag effect="plain" type="info">
        {{ userStore.tenantName || userStore.tenantId }} · {{ userStore.tenantId }}
      </el-tag>
      <el-icon class="navbar-action" :size="24" @click="toggleFullscreen">
        <FullScreen />
      </el-icon>
      <el-switch
        v-model="isDark"
        inline-prompt
        class="theme-switch"
      >
        <template #active-icon><el-icon><Moon /></el-icon></template>
        <template #inactive-icon><el-icon><Sunny /></el-icon></template>
      </el-switch>
      <el-icon class="navbar-action" :size="24" @click="settingsVisible = true">
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
      <Settings v-model="settingsVisible" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Expand, Fold, FullScreen, Moon, Setting, Sunny, UserFilled } from '@element-plus/icons-vue'
import Settings from '../Settings/index.vue'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { logoutSession } from '@/app/session/sessionCoordinator'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const settingsVisible = ref(false)

const breadcrumbs = computed(() => route.matched.filter(item => item.meta?.title))

const isDark = computed({
  get: () => settingsStore.theme === 'dark',
  set: (val: boolean) => settingsStore.setTheme(val ? 'dark' : 'light'),
})

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
    else {
      await document.documentElement.requestFullscreen()
    }
  }
  catch {
    ElMessage.warning('当前浏览器无法切换全屏模式')
  }
}

const handleCommand = async (command: string) => {
  switch (command) {
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
      } catch {
        return
      }
      await logoutSession()
      break
    case 'profile':
      await router.push('/profile')
      break
  }
}
</script>

<style scoped>
.theme-switch {
  --el-switch-on-color: #409eff;
}
</style>
