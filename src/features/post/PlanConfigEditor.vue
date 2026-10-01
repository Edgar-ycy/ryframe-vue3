<template>
  <p class="capability-config-hint">当前能力无需额外配置。</p>
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
