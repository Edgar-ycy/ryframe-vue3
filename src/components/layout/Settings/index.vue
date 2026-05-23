<template>
  <div class="drawer-settings">
    <el-drawer
      v-model="visible"
      title="系统布局配置"
      :size="300"
      direction="rtl"
      append-to-body
    >
      <div class="drawer-body">
        <!-- 主题模式 -->
        <div class="setting-section">
          <div class="setting-label">主题模式</div>
          <el-radio-group :model-value="settingsStore.theme" @change="(val: string) => settingsStore.setTheme(val as 'light' | 'dark')">
            <el-radio-button value="light">浅色</el-radio-button>
            <el-radio-button value="dark">深色</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 主题色 -->
        <div class="setting-section">
          <ThemePicker
            :model-value="themeColor"
            @update:model-value="onThemeColorChange"
          />
        </div>

        <!-- 组件尺寸 -->
        <div class="setting-section">
          <div class="setting-label">组件尺寸</div>
          <el-radio-group :model-value="settingsStore.componentSize" @change="(val: string) => settingsStore.setComponentSize(val as ComponentSize)">
            <el-radio-button value="large">大</el-radio-button>
            <el-radio-button value="default">默认</el-radio-button>
            <el-radio-button value="small">小</el-radio-button>
          </el-radio-group>
        </div>

        <el-divider />

        <!-- 布局选项 -->
        <div class="setting-section">
          <div class="setting-label">标签页</div>
          <el-switch :model-value="settingsStore.tagsView" @change="settingsStore.toggleTagsView()" />
          <span class="setting-hint">开启后访问过的页面将以标签形式显示</span>
        </div>

        <div class="setting-section">
          <div class="setting-label">侧边栏 Logo</div>
          <el-switch :model-value="settingsStore.sidebarLogo" @change="settingsStore.toggleSidebarLogo()" />
          <span class="setting-hint">开启后侧边栏顶部显示 Logo</span>
        </div>

        <el-divider />

        <el-button type="primary" style="width:100%" @click="settingsStore.resetSettings()">
          恢复默认设置
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import ThemePicker from './ThemePicker.vue'
import { useSettingsStore } from '@/stores/settings'

type ComponentSize = 'large' | 'default' | 'small'

const visible = defineModel<boolean>({ default: false })
const settingsStore = useSettingsStore()
const themeColor = ref('#409EFF')

function onThemeColorChange(color: string) {
  themeColor.value = color
  // 设置 CSS 变量，动态修改主题色
  document.documentElement.style.setProperty('--el-color-primary', color)
}
</script>

<style scoped>
.drawer-body { padding: 0 8px; }
.setting-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.setting-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  min-width: 70px;
}
.setting-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  width: 100%;
  margin-top: 4px;
}
</style>
