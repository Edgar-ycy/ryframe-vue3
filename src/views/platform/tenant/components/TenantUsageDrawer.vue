<template>
  <el-drawer
    v-model="visible"
    :title="t('tenantCapacity.detailTitle')"
    size="min(760px, 100vw)"
    class="tenant-usage-drawer"
    @open="handleOpen"
    @closed="handleClosed"
  >
    <div v-loading="loading" class="drawer-content" aria-live="polite">
      <template v-if="tenant">
        <header class="tenant-heading">
          <div>
            <h2>{{ tenant.name }}</h2>
            <p>{{ tenant.tenant_id }}</p>
          </div>
          <div class="tenant-heading__tags">
            <el-tag :type="tenant.status === 'enabled' ? 'success' : 'danger'">
              {{ statusLabel(tenant.status) }}
            </el-tag>
            <el-tag :type="expirationType(tenant.expiration_status)" effect="plain">
              {{ expirationLabel(tenant.expiration_status) }}
            </el-tag>
            <el-tag v-if="tenant.capacity_status" :type="capacityType(tenant.capacity_status)" effect="plain">
              {{ capacityLabel(tenant.capacity_status) }}
            </el-tag>
          </div>
        </header>

        <p class="drawer-hint">{{ t('tenantCapacity.detailHint') }}</p>

        <div class="drawer-actions">
          <el-button icon="Refresh" :loading="refreshing" @click="emit('refresh')">
            {{ t('tenantCapacity.refresh') }}
          </el-button>
          <el-button v-perm="'tenant:edit'" type="primary" icon="Edit" @click="emit('edit', tenant)">
            {{ t('tenantCapacity.edit') }}
          </el-button>
        </div>

        <section class="drawer-section" :aria-label="t('tenantCapacity.basicInformation')">
          <h3>{{ t('tenantCapacity.basicInformation') }}</h3>
          <dl class="details-grid">
            <div><dt>{{ t('tenantCapacity.domain') }}</dt><dd>{{ tenant.domain || t('tenantCapacity.notAvailable') }}</dd></div>
            <div><dt>{{ t('tenantCapacity.expireAt') }}</dt><dd>{{ formatDate(tenant.expire_at) }}</dd></div>
            <div><dt>{{ t('tenantCapacity.status') }}</dt><dd>{{ statusLabel(tenant.status) }}</dd></div>
            <div><dt>{{ t('tenantCapacity.capacityStatus') }}</dt><dd>{{ tenant.capacity_status ? capacityLabel(tenant.capacity_status) : t('tenantCapacity.capacityUnavailable') }}</dd></div>
          </dl>
        </section>

        <section class="drawer-section" :aria-label="t('tenantCapacity.quotaConfiguration')">
          <h3>{{ t('tenantCapacity.quotaConfiguration') }}</h3>
          <dl class="details-grid">
            <div><dt>{{ t('tenantCapacity.maxUsers') }}</dt><dd>{{ quotaLimit(tenant.max_users) }}</dd></div>
            <div><dt>{{ t('tenantCapacity.maxRoles') }}</dt><dd>{{ quotaLimit(tenant.max_roles) }}</dd></div>
            <div><dt>{{ t('tenantCapacity.maxStorage') }}</dt><dd>{{ storageLimit(tenant.max_storage_mb) }}</dd></div>
            <div><dt>{{ t('tenantCapacity.maxRequests') }}</dt><dd>{{ quotaLimit(tenant.max_requests_per_min) }}</dd></div>
          </dl>
        </section>

        <template v-if="tenant.usage">
          <section class="drawer-section" :aria-label="t('tenantCapacity.quotaOverview')">
            <div class="section-heading">
              <h3>{{ t('tenantCapacity.quotaOverview') }}</h3>
              <span>{{ t('tenantCapacity.calculatedAt') }}: {{ formatDate(tenant.usage.calculated_at) }}</span>
            </div>
            <div class="quota-grid">
              <TenantQuotaMeter :label="t('tenantCapacity.users')" :quota="tenant.usage.users" />
              <TenantQuotaMeter :label="t('tenantCapacity.roles')" :quota="tenant.usage.roles" />
              <TenantQuotaMeter :label="t('tenantCapacity.storage')" :quota="tenant.usage.storage" unit="storage" />
            </div>
          </section>

          <section class="drawer-section" :aria-label="t('tenantCapacity.requestWindow')">
            <h3>{{ t('tenantCapacity.requestWindow') }}</h3>
            <p class="section-description">{{ t('tenantCapacity.currentWindowHint') }}</p>
            <el-alert
              v-if="tenant.usage.request_window.status === 'unknown'"
              :title="t('tenantCapacity.currentWindowUnknown')"
              type="warning"
              show-icon
              :closable="false"
            />
            <template v-else>
              <TenantQuotaMeter
                :label="t('tenantCapacity.requestWindow')"
                :quota="requestQuota(tenant.usage.request_window)"
              />
              <p v-if="tenant.usage.request_window.remaining_secs != null" class="window-remaining">
                {{ t('tenantCapacity.currentWindowRemaining', { seconds: tenant.usage.request_window.remaining_secs }) }}
              </p>
            </template>
          </section>

          <section class="drawer-section" :aria-label="t('tenantCapacity.auxiliaryStatus')">
            <h3>{{ t('tenantCapacity.auxiliaryStatus') }}</h3>
            <dl class="auxiliary-grid">
              <div><dt>{{ t('tenantCapacity.pendingJobs') }}</dt><dd>{{ tenant.usage.auxiliary.pending_jobs }}</dd></div>
              <div><dt>{{ t('tenantCapacity.runningJobs') }}</dt><dd>{{ tenant.usage.auxiliary.running_jobs }}</dd></div>
              <div><dt>{{ t('tenantCapacity.deadJobs') }}</dt><dd>{{ tenant.usage.auxiliary.dead_jobs }}</dd></div>
              <div><dt>{{ t('tenantCapacity.enabledSchedules') }}</dt><dd>{{ tenant.usage.auxiliary.enabled_schedules }}</dd></div>
              <div><dt>{{ t('tenantCapacity.activeImports') }}</dt><dd>{{ tenant.usage.auxiliary.active_user_imports }}</dd></div>
              <div><dt>{{ t('tenantCapacity.cronStatus') }}</dt><dd>{{ tenant.usage.auxiliary.cron_enabled ? t('tenantCapacity.cronEnabled') : t('tenantCapacity.cronDisabled') }}</dd></div>
            </dl>
          </section>
        </template>

        <el-alert
          v-else
          :title="t('tenantCapacity.usagePermissionHint')"
          type="info"
          show-icon
          :closable="false"
        />
      </template>
      <el-empty v-else-if="!loading" :description="t('tenantCapacity.empty')" />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type {
  TenantCapacity,
  TenantQuotaUsage,
  TenantRequestWindowUsage,
} from '@/api/modules/tenant'
import { formatLocalizedDate, getApplicationLocale } from '@/i18n'
import TenantQuotaMeter from './TenantQuotaMeter.vue'

defineProps<{
  tenant?: TenantCapacity
  loading: boolean
  refreshing: boolean
}>()

const emit = defineEmits<{
  open: []
  closed: []
  refresh: []
  edit: [tenant: TenantCapacity]
}>()

const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()

function handleOpen(): void {
  emit('open')
}

function handleClosed(): void {
  emit('closed')
}

function capacityType(status: string): TagProps['type'] {
  if (status === 'exceeded' || status === 'critical') return 'danger'
  if (status === 'warning') return 'warning'
  if (status === 'normal') return 'success'
  return 'info'
}

function expirationType(status: string): TagProps['type'] {
  if (status === 'expired') return 'danger'
  if (status === 'expiring') return 'warning'
  if (status === 'active') return 'success'
  return 'info'
}

function capacityLabel(status: string): string {
  const suffixes: Record<string, string> = {
    normal: 'Normal', warning: 'Warning', critical: 'Critical', exceeded: 'Exceeded', unlimited: 'Unlimited', unknown: 'Unknown',
  }
  return t(`tenantCapacity.capacity${suffixes[status] ?? 'Unknown'}`)
}

function expirationLabel(status: string): string {
  const suffixes: Record<string, string> = {
    active: 'Active', expiring: 'Expiring', expired: 'Expired', never: 'Never',
  }
  return t(`tenantCapacity.expiration${suffixes[status] ?? 'Active'}`)
}

function statusLabel(status: string): string {
  return status === 'enabled' ? t('tenantCapacity.statusEnabled') : t('tenantCapacity.statusDisabled')
}

function requestQuota(request: TenantRequestWindowUsage): TenantQuotaUsage {
  return {
    used: request.current ?? 0,
    limit: request.limit,
    percentage_basis_points: request.percentage_basis_points,
    status: request.status,
  }
}

function formatDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : t('tenantCapacity.notAvailable')
}

function quotaLimit(value: number): string {
  if (value === 0) return t('tenantCapacity.unlimited')
  return new Intl.NumberFormat(getApplicationLocale()).format(value)
}

function storageLimit(value: number): string {
  if (value === 0) return t('tenantCapacity.unlimited')
  return `${new Intl.NumberFormat(getApplicationLocale()).format(value)} MiB`
}
</script>

<style scoped>
.drawer-content {
  min-height: 220px;
}

.tenant-heading,
.tenant-heading__tags,
.drawer-actions,
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tenant-heading {
  align-items: flex-start;
}

.tenant-heading h2,
.drawer-section h3 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.tenant-heading p {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}

.tenant-heading__tags {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.drawer-hint,
.section-description,
.window-remaining {
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.drawer-hint {
  margin: 12px 0;
}

.drawer-actions {
  justify-content: flex-end;
  margin-bottom: 18px;
}

.drawer-section {
  padding: 18px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.drawer-section h3 {
  font-size: 16px;
}

.section-heading {
  align-items: baseline;
  margin-bottom: 14px;
}

.section-heading span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.details-grid,
.auxiliary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 14px 0 0;
}

.details-grid > div,
.auxiliary-grid > div {
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}

dt {
  margin-bottom: 5px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

dd {
  margin: 0;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;
}

.quota-grid {
  display: grid;
  gap: 18px;
  margin-top: 14px;
}

.section-description {
  margin: 8px 0 14px;
}

.window-remaining {
  margin: 8px 0 0;
  font-size: 12px;
  text-align: right;
}

@media (width <= 480px) {
  .tenant-heading,
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .tenant-heading__tags {
    justify-content: flex-start;
  }

  .drawer-actions {
    justify-content: stretch;
  }

  .drawer-actions :deep(.el-button) {
    flex: 1;
    min-height: 42px;
  }

  .details-grid,
  .auxiliary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
