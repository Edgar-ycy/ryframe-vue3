<template>
  <div class="export-selection-toolbar">
    <el-button :disabled="disabled || rowCount === 0" @click="$emit('selectPage')">
      {{ t('exportCenter.selectCurrentPage') }}
    </el-button>
    <span v-if="selectedCount > 0" aria-live="polite">
      {{ t('exportCenter.selectedRows', { count: selectedCount }) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
defineProps<{ disabled: boolean; rowCount: number; selectedCount: number }>()
defineEmits<{ selectPage: [] }>()
</script>

<style scoped>
.export-selection-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
  vertical-align: middle;
}
</style>
