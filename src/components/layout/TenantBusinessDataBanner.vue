<template>
  <el-alert
    v-if="state && state !== 'active'"
    class="business-data-banner"
    :title="t(`shell.businessData.${state}`)"
    :type="alertType"
    show-icon
    :closable="false"
  >
    <template #default>
      {{ t('shell.businessData.placementGeneration', { generation: placementGeneration }) }}
    </template>
  </el-alert>
</template>

<script setup lang="ts">
import type { AlertProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useTenantContextStore } from '@/app/tenant-context'

const { t } = useI18n()
const tenantContext = useTenantContextStore()
const state = computed(() => tenantContext.businessData?.state)
const placementGeneration = computed(() => tenantContext.businessData?.placement_generation ?? '—')
const alertType = computed<AlertProps['type']>(() => (
  state.value === 'provisioning' ? 'warning' : 'error'
))
</script>

<style scoped>
.business-data-banner {
  border-radius: 0;
}
</style>
