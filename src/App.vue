<template>
  <el-config-provider :size="settingsStore.componentSize" :locale="elementLocale">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { i18n } from '@/i18n'
import en from 'element-plus/es/locale/lang/en'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const settingsStore = useSettingsStore()
const elementLocale = computed(() => (i18n.global.locale.value === 'en-US' ? en : zhCn))
</script>
