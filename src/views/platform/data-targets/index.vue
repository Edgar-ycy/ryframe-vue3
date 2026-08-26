<template>
  <div class="page-container data-target-page">
    <header class="page-heading">
      <div>
        <h1>{{ t('tenantData.targetsTitle') }}</h1>
        <p>{{ t('tenantData.targetsSubtitle') }}</p>
      </div>
      <el-button icon="Refresh" :loading="targetsQuery.isFetching.value" @click="refreshTargets">
        {{ t('tenantData.refresh') }}
      </el-button>
    </header>

    <el-alert
      v-if="!canView"
      :title="t('tenantData.noPlacementPermission')"
      type="info"
      show-icon
      :closable="false"
    />
    <template v-else>
      <el-card shadow="never" class="target-card">
        <template #header>
          <div class="card-heading">
            <strong>{{ t('tenantData.targetCount', { count: targetPage?.total ?? 0 }) }}</strong>
            <el-input
              v-model="keyword"
              clearable
              maxlength="100"
              :placeholder="t('tenantData.searchTarget')"
              prefix-icon="Search"
              :aria-label="t('tenantData.searchTarget')"
            />
          </div>
        </template>

        <el-alert
          v-if="targetsQuery.error.value"
          :title="t('tenantData.targetsUnavailable')"
          type="warning"
          show-icon
          :closable="false"
          class="load-alert"
        >
          <el-button type="warning" plain @click="refreshTargets">{{
            t('tenantData.retry')
          }}</el-button>
        </el-alert>

        <DataTargetList
          v-model:page="page"
          v-model:page-size="pageSize"
          :health-label="healthLabel"
          :loading="targetsQuery.isFetching.value"
          :targets="targets"
          :total="targetPage?.total ?? 0"
          @detail="openTargetDetail"
        />
      </el-card>
    </template>

    <el-dialog
      v-model="detailVisible"
      :title="t('tenantData.targetDetailTitle')"
      width="min(680px, calc(100vw - 24px))"
      destroy-on-close
    >
      <div v-loading="detailQuery.isFetching.value" class="detail-panel">
        <el-alert
          v-if="detailQuery.error.value"
          :title="t('tenantData.targetDetailUnavailable')"
          type="warning"
          show-icon
          :closable="false"
        >
          <el-button type="warning" plain @click="refreshTargetDetail">
            {{ t('tenantData.retry') }}
          </el-button>
        </el-alert>
        <template v-else-if="targetDetail">
          <el-descriptions :column="2" border>
            <el-descriptions-item :label="t('tenantData.targetKey')">{{
              targetDetail.key
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.health')">
              <el-tag :type="healthTagType(targetDetail.health)">{{
                healthLabel(targetDetail.health)
              }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.mode')">{{
              t(`tenantData.${targetDetail.mode}`)
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.kind')">{{
              targetDetail.kind
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.lastVerifiedAt')">{{
              formatDate(targetDetail.last_verified_at)
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.poolConnected')">{{
              targetDetail.connected ? t('tenantData.connected') : t('tenantData.disconnected')
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.reservedConnections')">{{
              targetDetail.reserved_connections
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.totalConnectionBudget')">{{
              targetDetail.max_total_connections
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.openTargets')">{{
              targetDetail.open_targets
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.openingTargets')">{{
              targetDetail.opening_targets
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('tenantData.schemaFingerprint')" :span="2">
              <code>{{ targetDetail.schema_fingerprint || t('tenantData.notAvailable') }}</code>
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">{{ t('tenantData.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  getDataTarget,
  listDataTargets,
  type DataTargetPage,
  type DataTargetDetail,
} from '@/api/modules/dataTarget'
import { TENANT_DATA_PERMISSIONS } from '@/features/tenant-data/permissions'
import { healthTagType } from '@/features/tenant-data/presentation'
import { formatLocalizedDate } from '@/i18n'
import { requireOperationData } from '@/shared/http/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'
import DataTargetList from './DataTargetList.vue'

const { t } = useI18n()
const userStore = useUserStore()
const keyword = ref('')
const appliedKeyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const detailVisible = ref(false)
const selectedTargetKey = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
const canView = computed(() =>
  hasPermission(userStore.permissions, TENANT_DATA_PERMISSIONS.placementView),
)

const targetsQuery = useTenantQuery<DataTargetPage>(
  () => userStore.tenantId,
  () => userStore.tenantId === 'system' && canView.value,
  'platform-data-targets',
  () => ({ page: page.value, page_size: pageSize.value, q: appliedKeyword.value }),
  async (signal) =>
    requireOperationData(
      await listDataTargets(
        {
          page: page.value,
          page_size: pageSize.value,
          q: appliedKeyword.value || undefined,
        },
        signal,
      ),
    ),
  { staleTime: 0, refetchInterval: false, meta: { errorMode: 'silent' } },
)

const targetPage = targetsQuery.data
const targets = computed(() => targetPage.value?.items ?? [])
const detailQuery = useTenantQuery<DataTargetDetail>(
  () => userStore.tenantId,
  () =>
    userStore.tenantId === 'system' &&
    canView.value &&
    detailVisible.value &&
    Boolean(selectedTargetKey.value),
  'platform-data-target-detail',
  () => ({ target_key: selectedTargetKey.value }),
  async (signal) => requireOperationData(await getDataTarget(selectedTargetKey.value, signal)),
  { staleTime: 0, refetchInterval: false, meta: { errorMode: 'silent' } },
)
const targetDetail = detailQuery.data

watch(keyword, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    appliedKeyword.value = value.trim()
    searchTimer = undefined
  }, 300)
})
watch(pageSize, () => {
  page.value = 1
})
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

function healthLabel(health: string): string {
  const key =
    {
      healthy: 'healthHealthy',
      verified: 'healthHealthy',
      degraded: 'healthDegraded',
      unavailable: 'healthUnavailable',
    }[health] ?? 'healthUnknown'
  return t(`tenantData.${key}`)
}

function formatDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : t('tenantData.notAvailable')
}

function openTargetDetail(targetKey: string): void {
  selectedTargetKey.value = targetKey
  detailVisible.value = true
}

async function refreshTargetDetail(): Promise<void> {
  await detailQuery.refetch()
}

async function refreshTargets(): Promise<void> {
  await targetsQuery.refetch()
}
</script>

<style scoped>
.data-target-page {
  min-width: 0;
}

.page-heading,
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-heading {
  align-items: flex-start;
  margin-bottom: 16px;
}

.page-heading h1 {
  margin: 0;
  font-size: 24px;
}

.page-heading p {
  margin: 7px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.card-heading :deep(.el-input) {
  width: min(340px, 48vw);
}

.load-alert {
  margin-bottom: 14px;
}

.detail-panel {
  min-height: 150px;
}

@media (width <= 767px) {
  .page-heading,
  .card-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .page-heading :deep(.el-button),
  .card-heading :deep(.el-input) {
    width: 100%;
    min-height: 42px;
  }

  .target-card :deep(.el-card__body) {
    padding: 12px;
  }
}
</style>
