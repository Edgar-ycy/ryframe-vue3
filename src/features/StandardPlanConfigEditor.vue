<template>
  <p>当前能力无需额外配置，关闭管理能力不会删除已有数据。</p>
</template>

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
