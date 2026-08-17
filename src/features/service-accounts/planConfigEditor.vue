<script setup lang="ts">
defineProps<{
  modelValue: Record<string, unknown>
  variantCode: string
  schemaVersion: number
}>()

defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()
</script>

<template>
  <el-alert
    type="info"
    :closable="false"
    show-icon
    title="服务账号当前使用 default 变体，schema_version 为 1，无额外配置项。"
  />
</template>
