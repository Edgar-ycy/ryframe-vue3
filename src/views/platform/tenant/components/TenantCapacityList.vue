<template>
  <el-card shadow="never" class="tenant-list-card">
    <template #header>
      <div class="list-heading">
        <strong>{{ t('tenantCapacity.total', { count: tenantPage?.total ?? 0 }) }}</strong>
        <span v-if="tenantPage?.items[0]?.usage">
          {{ t('tenantCapacity.calculatedAt') }}:
          {{ formatDate(tenantPage.items[0].usage.calculated_at) }}
        </span>
      </div>
    </template>

    <div class="tenant-table-wrap">
      <el-table
        v-loading="loading"
        :data="tenantPage?.items ?? []"
        border
        stripe
        class="tenant-table"
      >
        <el-table-column :label="t('tenantCapacity.tenantName')" min-width="190" fixed="left">
          <template #default="{ row }">
            <button class="tenant-name-button" type="button" @click="emit('detail', row.tenant_id)">
              <strong>{{ row.name }}</strong>
              <small>{{ row.tenant_id }}</small>
            </button>
          </template>
        </el-table-column>
        <el-table-column :label="t('tenantCapacity.status')" width="112" align="center">
          <template #default="{ row }">
            <el-tag :type="tenantStatusType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('tenantCapacity.expiration')" min-width="165">
          <template #default="{ row }">
            <div class="expiration-cell">
              <el-tag :type="expirationType(row.expiration_status)" effect="plain" size="small">
                {{ expirationLabel(row.expiration_status) }}
              </el-tag>
              <span>{{ formatDate(row.expire_at) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          v-if="canViewUsage"
          :label="t('tenantCapacity.capacityStatus')"
          width="150"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="capacityType(row.capacity_status)" effect="plain">
              {{ capacityLabel(row.capacity_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="canViewUsage" :label="t('tenantCapacity.users')" min-width="220">
          <template #default="{ row }">
            <TenantQuotaMeter
              v-if="row.usage"
              :label="t('tenantCapacity.users')"
              :quota="row.usage.users"
            />
            <span v-else>{{ t('tenantCapacity.notAvailable') }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="canViewUsage" :label="t('tenantCapacity.roles')" min-width="220">
          <template #default="{ row }">
            <TenantQuotaMeter
              v-if="row.usage"
              :label="t('tenantCapacity.roles')"
              :quota="row.usage.roles"
            />
            <span v-else>{{ t('tenantCapacity.notAvailable') }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="canViewUsage" :label="t('tenantCapacity.storage')" min-width="240">
          <template #default="{ row }">
            <TenantQuotaMeter
              v-if="row.usage"
              :label="t('tenantCapacity.storage')"
              :quota="row.usage.storage"
              unit="storage"
            />
            <span v-else>{{ t('tenantCapacity.notAvailable') }}</span>
          </template>
        </el-table-column>
        <el-table-column
          :label="t('tenantCapacity.actions')"
          width="238"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <el-button type="primary" link icon="View" @click="emit('detail', row.tenant_id)">
              {{ t('tenantCapacity.details') }}
            </el-button>
            <el-button
              v-perm="'tenant:edit'"
              type="primary"
              link
              icon="Edit"
              :disabled="statusPending || !isMutableStatus(row.status)"
              @click="emit('edit', row)"
            >
              {{ t('tenantCapacity.edit') }}
            </el-button>
            <el-button
              v-perm="'tenant:status'"
              :type="row.status === 'enabled' ? 'warning' : 'success'"
              link
              :loading="togglingTenantId === row.tenant_id"
              :disabled="
                row.tenant_id === 'system' || statusPending || !isMutableStatus(row.status)
              "
              @click="emit('toggle', row)"
            >
              {{ statusActionLabel(row.status) }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('tenantCapacity.empty')" :image-size="72" />
        </template>
      </el-table>
    </div>

    <div v-loading="loading" class="tenant-card-list" aria-live="polite">
      <el-empty
        v-if="!loading && (tenantPage?.items.length ?? 0) === 0"
        :description="t('tenantCapacity.empty')"
      />
      <article
        v-for="tenant in tenantPage?.items ?? []"
        :key="tenant.tenant_id"
        class="tenant-mobile-card"
      >
        <header>
          <button type="button" @click="emit('detail', tenant.tenant_id)">
            <strong>{{ tenant.name }}</strong>
            <small>{{ tenant.tenant_id }}</small>
          </button>
          <el-tag :type="tenantStatusType(tenant.status)" size="small">
            {{ statusLabel(tenant.status) }}
          </el-tag>
        </header>
        <div class="mobile-tags">
          <el-tag :type="expirationType(tenant.expiration_status)" effect="plain" size="small">
            {{ expirationLabel(tenant.expiration_status) }}
          </el-tag>
          <el-tag
            v-if="tenant.capacity_status"
            :type="capacityType(tenant.capacity_status)"
            effect="plain"
            size="small"
          >
            {{ capacityLabel(tenant.capacity_status) }}
          </el-tag>
        </div>
        <p class="mobile-expiry">
          {{ t('tenantCapacity.expireAt') }}: {{ formatDate(tenant.expire_at) }}
        </p>
        <div v-if="tenant.usage" class="mobile-quotas">
          <TenantQuotaMeter :label="t('tenantCapacity.users')" :quota="tenant.usage.users" />
          <TenantQuotaMeter :label="t('tenantCapacity.roles')" :quota="tenant.usage.roles" />
          <TenantQuotaMeter
            :label="t('tenantCapacity.storage')"
            :quota="tenant.usage.storage"
            unit="storage"
          />
        </div>
        <footer>
          <el-button type="primary" plain icon="View" @click="emit('detail', tenant.tenant_id)">
            {{ t('tenantCapacity.details') }}
          </el-button>
          <el-button
            v-perm="'tenant:edit'"
            icon="Edit"
            :disabled="statusPending || !isMutableStatus(tenant.status)"
            @click="emit('edit', tenant)"
          >
            {{ t('tenantCapacity.edit') }}
          </el-button>
          <el-button
            v-perm="'tenant:status'"
            :type="tenant.status === 'enabled' ? 'warning' : 'success'"
            :loading="togglingTenantId === tenant.tenant_id"
            :disabled="
              tenant.tenant_id === 'system' || statusPending || !isMutableStatus(tenant.status)
            "
            @click="emit('toggle', tenant)"
          >
            {{ statusActionLabel(tenant.status) }}
          </el-button>
        </footer>
      </article>
    </div>

    <el-pagination
      v-if="(tenantPage?.total ?? 0) > 0"
      class="tenant-pagination tenant-pagination--desktop"
      :current-page="page"
      :page-size="pageSize"
      :total="tenantPage?.total ?? 0"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      background
      @current-change="emit('page-change', $event)"
      @size-change="emit('page-size-change', $event)"
    />
    <div v-if="(tenantPage?.total ?? 0) > 0" class="tenant-pagination-mobile">
      <el-select
        :model-value="pageSize"
        :aria-label="t('tenantCapacity.total', { count: tenantPage?.total ?? 0 })"
        @update:model-value="emit('page-size-change', $event)"
      >
        <el-option
          v-for="size in [10, 20, 50, 100]"
          :key="size"
          :label="String(size)"
          :value="size"
        />
      </el-select>
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :total="tenantPage?.total ?? 0"
        layout="prev, pager, next"
        size="small"
        background
        @current-change="emit('page-change', $event)"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { TenantCapacity, TenantCapacityPage } from '@/api/modules/tenant'
import TenantQuotaMeter from './TenantQuotaMeter.vue'

defineProps<{
  canViewUsage: boolean
  loading: boolean
  page: number
  pageSize: number
  statusPending: boolean
  tenantPage?: TenantCapacityPage
  togglingTenantId?: string | null
  formatDate: (value: string | null | undefined) => string
  statusLabel: (status: string) => string
  capacityType: (status: string | null | undefined) => TagProps['type']
  capacityLabel: (status: string | null | undefined) => string
  expirationType: (status: string) => TagProps['type']
  expirationLabel: (status: string) => string
}>()

const emit = defineEmits<{
  detail: [tenantId: string]
  edit: [tenant: TenantCapacity]
  toggle: [tenant: TenantCapacity]
  'page-change': [page: number]
  'page-size-change': [pageSize: number]
}>()

const { t } = useI18n()

function isMutableStatus(status: string): boolean {
  return status === 'enabled' || status === 'disabled'
}

function tenantStatusType(status: string): TagProps['type'] {
  if (status === 'enabled') return 'success'
  if (status === 'disabled' || status === 'provisioning_failed') return 'danger'
  return 'warning'
}

function statusActionLabel(status: string): string {
  if (status === 'enabled') return t('tenantCapacity.disable')
  if (status === 'disabled') return t('tenantCapacity.enable')
  return t('tenantCapacity.pendingAction')
}
</script>

<style scoped lang="scss" src="./TenantCapacityList.scss"></style>
