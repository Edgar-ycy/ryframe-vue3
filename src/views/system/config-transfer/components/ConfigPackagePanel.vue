<template>
  <el-card shadow="never" class="transfer-card">
    <template #header>
      <div class="panel-header">
        <div>
          <h2>{{ t('tenantConfigTransfer.packagesTitle') }}</h2>
          <p>{{ t('tenantConfigTransfer.packagesHint') }}</p>
        </div>
        <div class="panel-actions">
          <el-button
            v-if="canList"
            v-perm="'system:config-package:list'"
            icon="Refresh"
            :loading="loading"
            :title="t('tenantConfigTransfer.refresh')"
            @click="emit('refresh')"
          >
            {{ t('tenantConfigTransfer.refresh') }}
          </el-button>
          <el-button v-perm="'system:config-transfer:add'" icon="Upload" @click="emit('upload')">
            {{ t('tenantConfigTransfer.uploadPackage') }}
          </el-button>
          <el-button
            v-perm="'system:config-package:export'"
            type="primary"
            icon="Box"
            :loading="creating"
            :disabled="creating"
            @click="emit('generate')"
          >
            {{ t('tenantConfigTransfer.createPackage') }}
          </el-button>
        </div>
      </div>
    </template>

    <el-alert
      :title="t('tenantConfigTransfer.securityHint')"
      type="info"
      show-icon
      :closable="false"
      class="security-alert"
    />

    <template v-if="canList">
      <el-empty
        v-if="!loading && packages.length === 0"
        :description="t('tenantConfigTransfer.packageEmpty')"
      />

      <div v-else class="desktop-package-table">
        <el-table
          v-loading="loading"
          :data="packages"
          border
          stripe
          :empty-text="t('tenantConfigTransfer.packageEmpty')"
        >
          <el-table-column width="56" align="center">
            <template #default="{ row }">
              <el-radio
                :model-value="selectedPackageId"
                :value="row.id"
                :aria-label="t('tenantConfigTransfer.usePackage')"
                @change="selectPackage(row.id)"
              >
                <span class="visually-hidden">{{ t('tenantConfigTransfer.usePackage') }}</span>
              </el-radio>
            </template>
          </el-table-column>
          <el-table-column
            :label="t('tenantConfigTransfer.sourceTenant')"
            min-width="180"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <strong>{{ row.source_tenant_name }}</strong>
              <small class="secondary-line">{{ row.source_tenant_key }}</small>
            </template>
          </el-table-column>
          <el-table-column :label="t('tenantConfigTransfer.origin')" width="132">
            <template #default="{ row }">{{ originLabel(row.origin) }}</template>
          </el-table-column>
          <el-table-column
            :label="t('tenantConfigTransfer.sourceVersion')"
            min-width="130"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ row.source_app_version }}</template>
          </el-table-column>
          <el-table-column :label="t('tenantConfigTransfer.itemCount')" width="110" align="right">
            <template #default="{ row }">{{ row.item_count }}</template>
          </el-table-column>
          <el-table-column :label="t('tenantConfigTransfer.packageStatus')" width="120">
            <template #default="{ row }">
              <el-tag :type="packageStatusTag(row.status)" size="small">{{
                statusLabel(row.status)
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('tenantConfigTransfer.createdAt')" min-width="160">
            <template #default="{ row }">{{ formatLocalizedDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column :label="t('tenantConfigTransfer.operation')" width="178" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'succeeded'"
                v-perm="'system:config-transfer:add'"
                type="primary"
                link
                :loading="creatingTransfer && selectedPackageId === row.id"
                :disabled="creatingTransfer || !canDownloadPackageById(row.id)"
                @click="usePackage(row.id)"
              >
                {{ t('tenantConfigTransfer.usePackage') }}
              </el-button>
              <el-button
                v-if="row.status === 'succeeded'"
                v-perm="'system:config-package:download'"
                link
                :loading="downloadingPackageId === row.id"
                :disabled="Boolean(downloadingPackageId) || !canDownloadPackageById(row.id)"
                @click="downloadPackage(row.id)"
              >
                {{ t('tenantConfigTransfer.downloadPackage') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="packages.length" v-loading="loading" class="mobile-package-list">
        <article
          v-for="item in packages"
          :key="item.id"
          class="mobile-package-card"
          :class="{ 'is-selected': selectedPackageId === item.id }"
        >
          <header>
            <el-radio
              :model-value="selectedPackageId"
              :value="item.id"
              @change="emit('select', item)"
            >
              <strong>{{ item.source_tenant_name }}</strong>
            </el-radio>
            <el-tag :type="packageStatusTag(item.status)" size="small">{{
              statusLabel(item.status)
            }}</el-tag>
          </header>
          <dl>
            <div>
              <dt>{{ t('tenantConfigTransfer.sourceKey') }}</dt>
              <dd>{{ item.source_tenant_key }}</dd>
            </div>
            <div>
              <dt>{{ t('tenantConfigTransfer.sourceVersion') }}</dt>
              <dd>{{ item.source_app_version }}</dd>
            </div>
            <div>
              <dt>{{ t('tenantConfigTransfer.itemCount') }}</dt>
              <dd>{{ item.item_count }}</dd>
            </div>
            <div>
              <dt>{{ t('tenantConfigTransfer.createdAt') }}</dt>
              <dd>{{ formatLocalizedDate(item.created_at) }}</dd>
            </div>
          </dl>
          <footer v-if="item.status === 'succeeded'">
            <el-button
              v-perm="'system:config-transfer:add'"
              type="primary"
              :loading="creatingTransfer && selectedPackageId === item.id"
              :disabled="creatingTransfer || !canDownloadTenantConfigPackage(item)"
              @click="emit('use', item)"
            >
              {{ t('tenantConfigTransfer.usePackage') }}
            </el-button>
            <el-button
              v-perm="'system:config-package:download'"
              :loading="downloadingPackageId === item.id"
              :disabled="Boolean(downloadingPackageId) || !canDownloadTenantConfigPackage(item)"
              @click="emit('download', item)"
            >
              {{ t('tenantConfigTransfer.downloadPackage') }}
            </el-button>
          </footer>
        </article>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { TenantConfigBundle } from '@/api/modules/tenantConfigTransfer'
import { formatLocalizedDate } from '@/i18n'
import { canDownloadTenantConfigPackage } from '../presentation'

const props = defineProps<{
  packages: TenantConfigBundle[]
  canList: boolean
  loading: boolean
  creating: boolean
  creatingTransfer: boolean
  selectedPackageId?: string
  downloadingPackageId?: string
}>()

const emit = defineEmits<{
  refresh: []
  generate: []
  upload: []
  select: [item: TenantConfigBundle]
  use: [item: TenantConfigBundle]
  download: [item: TenantConfigBundle]
}>()

const { t } = useI18n()

function findPackage(id: string): TenantConfigBundle | undefined {
  return props.packages.find((item) => item.id === id)
}

function selectPackage(id: string): void {
  const item = findPackage(id)
  if (item) emit('select', item)
}

function usePackage(id: string): void {
  const item = findPackage(id)
  if (item) emit('use', item)
}

function downloadPackage(id: string): void {
  const item = findPackage(id)
  if (item) emit('download', item)
}

function canDownloadPackageById(id: string): boolean {
  const item = findPackage(id)
  return item ? canDownloadTenantConfigPackage(item) : false
}

function originLabel(origin: string): string {
  return t(`tenantConfigTransfer.${origin === 'generated' ? 'originGenerated' : 'originUploaded'}`)
}

function statusLabel(status: string): string {
  const key =
    {
      pending: 'statusPending',
      running: 'statusRunning',
      succeeded: 'statusSucceeded',
      failed: 'statusFailed',
      expired: 'statusExpired',
    }[status] ?? 'statusUnknown'
  return t(`tenantConfigTransfer.${key}`)
}

function packageStatusTag(status: string): TagProps['type'] {
  if (status === 'succeeded') return 'success'
  if (status === 'failed' || status === 'expired') return 'danger'
  if (status === 'pending') return 'warning'
  return 'primary'
}
</script>

<style scoped lang="scss" src="./ConfigPackagePanel.scss"></style>
