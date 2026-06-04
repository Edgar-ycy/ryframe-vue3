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
  modelValue: '#6366F1',
  label: '主题色',
  presetColors: () => [
    '#6366F1', // Indigo（默认）
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#1E293B', // Slate
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
