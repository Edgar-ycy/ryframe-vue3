<template>
  <section class="quota-meter" :aria-label="label">
    <div class="quota-meter__heading">
      <span class="quota-meter__label">{{ label }}</span>
      <el-tag :type="statusType()" effect="plain" size="small">
        {{ statusLabel() }}
      </el-tag>
    </div>
    <div
      v-if="quota.limit != null && quota.percentage_basis_points != null"
      class="quota-meter__track"
      role="progressbar"
      :aria-label="label"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="ariaValue()"
      :aria-valuetext="usageText()"
    >
      <span
        class="quota-meter__fill"
        :class="`is-${quota.status}`"
        :style="{ width: `${visualPercentage()}%` }"
      />
    </div>
    <div class="quota-meter__values">
      <span>{{ usageText() }}</span>
      <span v-if="quota.percentage_basis_points != null">
        {{ t('tenantCapacity.percentage', { value: displayPercentage() }) }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TenantQuotaUsage } from '@/api/modules/tenant'
import { getApplicationLocale } from '@/i18n'
import {
  capacityStatusType,
  quotaDisplayPercentage,
  quotaPercentage,
  storageUsedMiB,
} from '../presentation'

const props = withDefaults(
  defineProps<{
    label: string
    quota: TenantQuotaUsage
    unit?: 'count' | 'storage'
  }>(),
  {
    unit: 'count',
  },
)

const { t } = useI18n()

function statusType() {
  return capacityStatusType(props.quota.status)
}

function statusLabel(): string {
  return t(`tenantCapacity.capacity${statusSuffix(props.quota.status)}`)
}

function statusSuffix(status: string): string {
  const suffixes: Record<string, string> = {
    normal: 'Normal',
    warning: 'Warning',
    critical: 'Critical',
    exceeded: 'Exceeded',
    unlimited: 'Unlimited',
    unknown: 'Unknown',
  }
  return suffixes[status] ?? 'Unknown'
}

function visualPercentage(): number {
  return quotaPercentage(props.quota)
}

function displayPercentage(): string {
  return new Intl.NumberFormat(getApplicationLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(quotaDisplayPercentage(props.quota))
}

function ariaValue(): number | undefined {
  return props.quota.percentage_basis_points == null ? undefined : visualPercentage()
}

function usageText(): string {
  const used = formatAmount(props.quota.used)
  if (props.quota.limit == null) {
    return t('tenantCapacity.usedUnlimited', { used })
  }
  return t('tenantCapacity.usedOfLimit', {
    used,
    limit: formatAmount(props.quota.limit),
  })
}

function formatAmount(value: number): string {
  const normalized = props.unit === 'storage' ? storageUsedMiB(value) : value
  return (
    new Intl.NumberFormat(getApplicationLocale(), {
      maximumFractionDigits: props.unit === 'storage' ? 2 : 0,
    }).format(normalized) + (props.unit === 'storage' ? ' MiB' : '')
  )
}
</script>

<style scoped>
.quota-meter {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.quota-meter__heading,
.quota-meter__values {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.quota-meter__label {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.quota-meter__track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--el-fill-color-dark);
}

.quota-meter__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--el-color-info);
  transition: width 0.25s ease;
}

.quota-meter__fill.is-normal {
  background: var(--el-color-success);
}

.quota-meter__fill.is-warning {
  background: var(--el-color-warning);
}

.quota-meter__fill.is-critical,
.quota-meter__fill.is-exceeded {
  background: var(--el-color-danger);
}

.quota-meter__values {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.quota-meter__values span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
