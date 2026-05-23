<template>
  <div class="theme-picker">
    <div class="theme-picker-label">{{ label }}</div>
    <el-color-picker
      :model-value="modelValue"
      :predefine="presetColors"
      show-alpha
      @update:model-value="(val: string) => $emit('update:modelValue', val)"
    />
    <div class="theme-presets">
      <div
        v-for="c in presetColors"
        :key="c"
        class="preset-item"
        :style="{ backgroundColor: c }"
        :class="{ active: modelValue === c }"
        @click="$emit('update:modelValue', c)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string
  /** 标签文字 */
  label?: string
  /** 预设颜色 */
  presetColors?: string[]
}

withDefaults(defineProps<Props>(), {
  modelValue: '#409EFF',
  label: '主题色',
  presetColors: () => [
    '#409EFF', // 蓝色（默认）
    '#1890FF', // 天蓝
    '#52C41A', // 绿色
    '#FA541C', // 橙色
    '#722ED1', // 紫色
    '#EB2F96', // 粉色
    '#13C2C2', // 青色
    '#F5222D', // 红色
  ],
})

defineEmits<{
  'update:modelValue': [val: string]
}>()
</script>

<style scoped>
.theme-picker {
  display: flex;
  align-items: center;
  gap: 12px;
}
.theme-picker-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  min-width: 60px;
}
.theme-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.preset-item {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}
.preset-item:hover,
.preset-item.active {
  border-color: #333;
  transform: scale(1.15);
}
</style>
