<template>
  <el-select
    :model-value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :multiple="multiple"
    :filterable="filterable"
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-option
      v-for="opt in options"
      :key="opt.value"
      :label="opt.label"
      :value="multiple ? opt.value : opt.value"
    />
  </el-select>
</template>

<script setup lang="ts">
import { useDictStore } from '@/stores/dict'

interface Props {
  /** 字典类型编码 */
  typeCode: string
  modelValue?: string | string[] | number
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  multiple?: boolean
  filterable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择',
  disabled: false,
  clearable: true,
  multiple: false,
  filterable: true,
})

defineEmits<{
  'update:modelValue': [val: string | string[] | number]
}>()

const dictStore = useDictStore()
const options = ref<{ label: string; value: string }[]>([])

watch(() => props.typeCode, (code) => {
  if (code) {
    dictStore.loadDict(code).then(list => { options.value = list })
  }
}, { immediate: true })
</script>
