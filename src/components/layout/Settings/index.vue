<template>
  <div class="drawer-settings">
    <el-drawer
      v-model="visible"
      :title="t('settings.title')"
      :size="300"
      direction="rtl"
      append-to-body
    >
      <div class="drawer-body">
        <div class="setting-section">
          <div class="setting-label">{{ t('settings.locale') }}</div>
          <el-radio-group
            :model-value="settingsStore.locale"
            :disabled="localeSaving"
            @change="handleLocaleChange"
          >
            <el-radio-button value="zh-CN">{{ t('shell.locale.zhCn') }}</el-radio-button>
            <el-radio-button value="en-US">{{ t('shell.locale.enUs') }}</el-radio-button>
          </el-radio-group>
        </div>

        <div class="setting-section">
          <div class="setting-label">{{ t('settings.theme') }}</div>
          <el-radio-group :model-value="settingsStore.theme" @change="handleThemeChange">
            <el-radio-button value="light">{{ t('settings.light') }}</el-radio-button>
            <el-radio-button value="dark">{{ t('settings.dark') }}</el-radio-button>
          </el-radio-group>
        </div>

        <div class="setting-section">
          <ThemePicker
            :model-value="settingsStore.themeColor"
            :label="t('settings.themeColor')"
            @update:model-value="settingsStore.setThemeColor"
          />
        </div>

        <div class="setting-section">
          <div class="setting-label">{{ t('settings.componentSize') }}</div>
          <el-radio-group
            :model-value="settingsStore.componentSize"
            @change="handleComponentSizeChange"
          >
            <el-radio-button value="large">{{ t('settings.large') }}</el-radio-button>
            <el-radio-button value="default">{{ t('settings.default') }}</el-radio-button>
            <el-radio-button value="small">{{ t('settings.small') }}</el-radio-button>
          </el-radio-group>
        </div>

        <el-divider />

        <div class="setting-section">
          <div class="setting-label">{{ t('settings.tagsView') }}</div>
          <el-switch
            :model-value="settingsStore.tagsView"
            @change="settingsStore.toggleTagsView()"
          />
          <span class="setting-hint">{{ t('settings.tagsViewHint') }}</span>
        </div>

        <div class="setting-section">
          <div class="setting-label">{{ t('settings.sidebarLogo') }}</div>
          <el-switch
            :model-value="settingsStore.sidebarLogo"
            @change="settingsStore.toggleSidebarLogo()"
          />
          <span class="setting-hint">{{ t('settings.sidebarLogoHint') }}</span>
        </div>

        <el-divider />

        <el-button type="primary" style="width: 100%" @click="settingsStore.resetSettings()">
          {{ t('settings.restore') }}
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { updateProfile } from '@/api/modules/auth'
import { messageController } from '@/app/messages/messageController'
import { normalizeLocale, type AppLocale } from '@/i18n'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import ThemePicker from './ThemePicker.vue'

type ComponentSize = 'large' | 'default' | 'small'
type Theme = 'light' | 'dark'

const visible = defineModel<boolean>({ default: false })
const settingsStore = useSettingsStore()
const userStore = useUserStore()
const { t } = useI18n()
const localeMutation = useServerStateMutation<void, AppLocale>('profile', {
  mutationFn: async (locale) => {
    await updateProfile({
      nickname: userStore.nickname,
      email: userStore.email || undefined,
      phone: userStore.phone || undefined,
      preferred_locale: locale,
    })
  },
  onSuccess: (_data, locale) => {
    userStore.setPreferredLocale(locale)
  },
})
const localeSaving = localeMutation.pending

async function handleLocaleChange(value: string | number | boolean | undefined): Promise<void> {
  if (typeof value !== 'string') return
  const locale = normalizeLocale(value)
  if (!locale || locale === settingsStore.locale || localeMutation.pending.value) return

  settingsStore.setLocale(locale)
  if (userStore.sessionStatus !== 'authenticated' || !userStore.nickname) return

  await localeMutation.mutateAsync(locale)
  if (settingsStore.locale === locale && userStore.sessionStatus === 'authenticated') {
    messageController.restartConnection()
  }
}

function handleThemeChange(value: string | number | boolean | undefined): void {
  if (value === 'light' || value === 'dark') settingsStore.setTheme(value satisfies Theme)
}

function handleComponentSizeChange(value: string | number | boolean | undefined): void {
  if (value === 'large' || value === 'default' || value === 'small') {
    settingsStore.setComponentSize(value satisfies ComponentSize)
  }
}
</script>

<style scoped>
.drawer-body {
  padding: 0 8px;
}

.setting-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.setting-label {
  min-width: 70px;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.setting-hint {
  width: 100%;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
