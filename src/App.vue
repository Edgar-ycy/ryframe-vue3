<template>
  <el-config-provider :size="settingsStore.componentSize" :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const settingsStore = useSettingsStore()
</script>
