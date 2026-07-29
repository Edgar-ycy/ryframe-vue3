<template>
  <div class="theme-picker">
    <div v-if="props.label" class="theme-picker-label">{{ props.label }}</div>
    <el-color-picker
      :model-value="props.modelValue"
      :predefine="props.presetColors"
      :aria-label="pickerLabel"
      show-alpha
      @update:model-value="(value: string) => emit('update:modelValue', value)"
    />
    <div class="theme-presets">
      <button
        v-for="color in props.presetColors"
        :key="color"
        type="button"
        class="preset-item"
        :style="{ backgroundColor: color }"
        :class="{ active: props.modelValue === color }"
        :aria-label="t('settings.selectThemeColor', { color })"
        :aria-pressed="props.modelValue === color"
        :title="t('settings.selectThemeColor', { color })"
        @click="selectPreset(color)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  modelValue?: string
  /** 标签文字 */
  label?: string
  /** 预设颜色 */
  presetColors?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '#4F46E5',
  label: '',
  presetColors: () => [
    '#4F46E5', // 靛蓝（默认）
    '#8B5CF6', // 紫罗兰
    '#EC4899', // 粉色
    '#F43F5E', // 玫瑰红
    '#F97316', // 橙色
    '#EAB308', // 黄色
    '#22C55E', // 绿色
    '#06B6D4', // 青色
    '#3B82F6', // 蓝色
    '#1E293B', // 石板灰
  ],
})

const emit = defineEmits<{
  'update:modelValue': [val: string]
}>()

const { t } = useI18n()
const pickerLabel = computed(() => props.label || t('settings.themeColor'))

function selectPreset(color: string): void {
  emit('update:modelValue', color)
}
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
  padding: 0;
  appearance: none;
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

.preset-item:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
</style>
