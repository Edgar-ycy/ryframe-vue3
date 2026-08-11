<template>
  <div class="chart-container">
    <div
      ref="canvasRef"
      class="chart-canvas"
      role="img"
      :aria-label="chartLabel"
      :style="{ minHeight }"
    />
    <div v-if="$slots.summary" class="chart-summary">
      <slot name="summary" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  AriaComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { init, use, type ECharts, type EChartsCoreOption } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { useSettingsStore } from '@/stores/settings'

use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DatasetComponent,
  AriaComponent,
  SVGRenderer,
])

withDefaults(defineProps<{
  chartLabel: string
  minHeight?: string
}>(), {
  minHeight: '320px',
})

const emit = defineEmits<{
  restore: []
  settingsChange: []
}>()

const settingsStore = useSettingsStore()
const canvasRef = ref<HTMLElement>()
let instance: ECharts | undefined
let resizeObserver: ResizeObserver | undefined
let resizeFrame: number | undefined
let lastOption: EChartsCoreOption | undefined
let active = true
let previousTheme = settingsStore.theme
let previousThemeColor = settingsStore.themeColor
let previousLocale = settingsStore.locale

function createInstance(): void {
  if (!active || instance || !canvasRef.value) return
  instance = init(canvasRef.value, settingsStore.theme === 'dark' ? 'dark' : undefined, {
    renderer: 'svg',
  })
  if (lastOption) instance.setOption(lastOption, { notMerge: true })
}

function destroyInstance(): void {
  instance?.dispose()
  instance = undefined
}

function setOption(option: EChartsCoreOption): void {
  lastOption = option
  createInstance()
  instance?.setOption(option, { notMerge: true })
}

function clear(): void {
  lastOption = undefined
  instance?.clear()
}

function resize(): void {
  instance?.resize()
}

function scheduleResize(): void {
  if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = undefined
    resize()
  })
}

function cancelScheduledResize(): void {
  if (resizeFrame === undefined) return
  cancelAnimationFrame(resizeFrame)
  resizeFrame = undefined
}

const unsubscribeSettings = settingsStore.$subscribe((_mutation, state) => {
  const themeChanged = state.theme !== previousTheme
  const visualChanged = themeChanged
    || state.themeColor !== previousThemeColor
    || state.locale !== previousLocale
  previousTheme = state.theme
  previousThemeColor = state.themeColor
  previousLocale = state.locale
  if (!visualChanged) return
  if (themeChanged) {
    destroyInstance()
    createInstance()
  }
  emit('settingsChange')
})

onMounted(() => {
  active = true
  createInstance()
  if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleResize)
    resizeObserver.observe(canvasRef.value)
  }
})

onActivated(() => {
  active = true
  createInstance()
  emit('restore')
})

onDeactivated(() => {
  active = false
  cancelScheduledResize()
  destroyInstance()
})

onUnmounted(() => {
  active = false
  cancelScheduledResize()
  resizeObserver?.disconnect()
  resizeObserver = undefined
  unsubscribeSettings()
  destroyInstance()
})

defineExpose({ clear, resize, setOption })
</script>

<style scoped>
.chart-container {
  min-width: 0;
  max-width: 100%;
}

.chart-canvas {
  width: 100%;
}

.chart-summary {
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}
</style>
