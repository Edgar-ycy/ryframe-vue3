<template>
  <div class="navbar">
    <el-button
      text
      circle
      class="hamburger"
      :aria-label="t('navbar.toggleSidebar')"
      :title="t('navbar.toggleSidebar')"
      @click="appStore.toggleSidebar()"
    >
      <el-icon><Fold v-if="!appStore.sidebarCollapsed" /><Expand v-else /></el-icon>
    </el-button>

    <el-breadcrumb class="breadcrumb" separator="/">
      <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.path">
        {{ translateNavigationTitle(item.meta?.title) }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <div class="navbar-right">
      <el-tag class="tenant-tag" effect="plain" type="info">
        <span class="tenant-tag__value" :title="`${userStore.tenantName || userStore.tenantId} · ${userStore.tenantId}`">
          {{ userStore.tenantName || userStore.tenantId }} · {{ userStore.tenantId }}
        </span>
      </el-tag>
      <el-button
        text
        circle
        class="navbar-action navbar-fullscreen-action"
        :aria-label="t('navbar.toggleFullscreen')"
        :title="t('navbar.toggleFullscreen')"
        @click="toggleFullscreen"
      >
        <el-icon :size="24"><FullScreen /></el-icon>
      </el-button>
      <el-switch
        v-model="isDark"
        inline-prompt
        class="theme-switch"
        :aria-label="t('settings.theme')"
      >
        <template #active-icon><el-icon><Moon /></el-icon></template>
        <template #inactive-icon><el-icon><Sunny /></el-icon></template>
      </el-switch>
      <MessageCenter />
      <el-button
        text
        circle
        class="navbar-action"
        :aria-label="t('navbar.openSettings')"
        :title="t('navbar.openSettings')"
        @click="settingsVisible = true"
      >
        <el-icon :size="24"><Setting /></el-icon>
      </el-button>
      <el-dropdown @command="handleCommand">
        <span class="user-info">
          <el-avatar :size="32" :src="avatarSrc">
            <el-icon><UserFilled /></el-icon>
          </el-avatar>
          <span>{{ userStore.nickname || userStore.username }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">{{ t('navbar.profile') }}</el-dropdown-item>
            <el-dropdown-item command="logout" divided>{{ t('navbar.logout') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <Settings v-model="settingsVisible" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Expand, Fold, FullScreen, Moon, Setting, Sunny, UserFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { logoutSession } from '@/app/session/sessionCoordinator'
import { translateNavigationTitle } from '@/i18n'
import { useAuthenticatedImage } from '@/hooks/useAuthenticatedImage'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import MessageCenter from '../MessageCenter/index.vue'
import Settings from '../Settings/index.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const { imageSrc: avatarSrc } = useAuthenticatedImage(() => userStore.avatar)

const settingsVisible = ref(false)
const breadcrumbs = computed(() => route.matched.filter(item => item.meta?.title))

const isDark = computed({
  get: () => settingsStore.theme === 'dark',
  set: (value: boolean) => settingsStore.setTheme(value ? 'dark' : 'light'),
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
    ElMessage.warning(t('navbar.fullscreenUnavailable'))
  }
}

async function handleCommand(command: string): Promise<void> {
  switch (command) {
    case 'logout':
      if (!await confirmAction(
        t('navbar.logoutConfirm'),
        t('navbar.prompt'),
        { type: 'warning' },
      )) return
      await logoutSession()
      break
    case 'profile':
      await router.push('/profile')
      break
  }
}
</script>

<style scoped>
.tenant-tag {
  display: inline-flex;
  min-width: 0;
  max-width: min(28vw, 320px);
}

.tenant-tag__value {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-switch {
  --el-switch-on-color: var(--color-primary);
}

@media (width <= 480px) {
  .tenant-tag {
    max-width: 88px;
  }
}
</style>
