<template>
  <el-tag
    :type="tagType"
    :size="size"
    :effect="effect"
    :round="round"
  >
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { useDictStore } from '@/stores/dict'

interface Props {
  /** 字典类型编码 */
  typeCode: string
  /** 字典值 */
  value?: string | number
  /** Tag 尺寸 */
  size?: '' | 'small' | 'large'
  /** Tag 主题 */
  effect?: 'dark' | 'light' | 'plain'
  /** 圆角 */
  round?: boolean
  /** 自定义颜色映射：value → el-tag type */
  colorMap?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  effect: 'light',
  round: false,
})

const dictStore = useDictStore()
const label = ref('')
const tagType = ref('info')

// 默认颜色映射
const defaultColorMap: Record<string, string> = {
  '0': 'danger',
  '1': 'success',
  '2': 'warning',
  '3': 'info',
}

async function loadLabel() {
  if (!props.typeCode || props.value === undefined || props.value === null) {
    label.value = '—'
    return
  }
  const options = await dictStore.loadDict(props.typeCode)
  const opt = options.find(o => o.value === String(props.value))
  label.value = opt?.label || String(props.value)

  // 颜色映射
  const colorMap = props.colorMap || defaultColorMap
  tagType.value = colorMap[String(props.value)] || 'info'
}

watch(
  [() => props.typeCode, () => props.value, () => props.colorMap],
  () => { loadLabel() },
  { immediate: true },
)
</script>
