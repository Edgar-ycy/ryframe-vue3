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

        <div class="target-table-wrap">
          <el-table
            v-loading="targetsQuery.isFetching.value"
            :data="targets"
            row-key="key"
            border
            stripe
            class="target-table"
          >
            <el-table-column
              prop="key"
              :label="t('tenantData.targetKey')"
              min-width="180"
              fixed="left"
              show-overflow-tooltip
            />
            <el-table-column :label="t('tenantData.mode')" width="112" align="center">
              <template #default="{ row }">
                <el-tag :type="row.mode === 'dedicated' ? 'warning' : 'info'" effect="plain">
                  {{ t(`tenantData.${row.mode}`) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="kind" :label="t('tenantData.kind')" width="112" />
            <el-table-column prop="region" :label="t('tenantData.region')" min-width="120">
              <template #default="{ row }">{{
                row.region || t('tenantData.notAvailable')
              }}</template>
            </el-table-column>
            <el-table-column :label="t('tenantData.health')" width="122" align="center">
              <template #default="{ row }">
                <el-tag :type="healthTagType(row.health)">{{ healthLabel(row.health) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="schema_fingerprint"
              :label="t('tenantData.schemaFingerprint')"
              min-width="230"
              show-overflow-tooltip
            >
              <template #default="{ row }"
                ><code>{{ row.schema_fingerprint || t('tenantData.notAvailable') }}</code></template
              >
            </el-table-column>
            <el-table-column :label="t('tenantData.poolConnected')" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="row.connected ? 'success' : 'info'" effect="plain">
                  {{ row.connected ? t('tenantData.connected') : t('tenantData.disconnected') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="pool_max_connections"
              :label="t('tenantData.poolMax')"
              width="120"
              align="right"
            >
              <template #default="{ row }">{{
                row.pool_max_connections ?? t('tenantData.notAvailable')
              }}</template>
            </el-table-column>
            <el-table-column
              prop="active_leases"
              :label="t('tenantData.poolActive')"
              width="110"
              align="right"
            />
            <el-table-column
              :label="t('tenantData.actions')"
              width="100"
              fixed="right"
              align="center"
            >
              <template #default="{ row }">
                <el-button type="primary" link @click="openTargetDetail(row.key)">
                  {{ t('tenantData.details') }}
                </el-button>
              </template>
            </el-table-column>
            <template #empty><el-empty :description="t('tenantData.noTargets')" /></template>
          </el-table>
        </div>

        <div v-loading="targetsQuery.isFetching.value" class="target-card-list" aria-live="polite">
          <el-empty
            v-if="!targetsQuery.isFetching.value && targets.length === 0"
            :description="t('tenantData.noTargets')"
          />
          <article v-for="target in targets" :key="target.key" class="target-mobile-card">
            <header>
              <strong>{{ target.key }}</strong>
              <el-tag :type="healthTagType(target.health)" size="small">{{
                healthLabel(target.health)
              }}</el-tag>
            </header>
            <dl>
              <div>
                <dt>{{ t('tenantData.mode') }}</dt>
                <dd>{{ t(`tenantData.${target.mode}`) }}</dd>
              </div>
              <div>
                <dt>{{ t('tenantData.kind') }}</dt>
                <dd>{{ target.kind }}</dd>
              </div>
              <div>
                <dt>{{ t('tenantData.region') }}</dt>
                <dd>{{ target.region || t('tenantData.notAvailable') }}</dd>
              </div>
              <div>
                <dt>{{ t('tenantData.poolConnected') }}</dt>
                <dd>
                  {{ target.connected ? t('tenantData.connected') : t('tenantData.disconnected') }}
                </dd>
              </div>
              <div>
                <dt>{{ t('tenantData.poolMax') }}</dt>
                <dd>{{ target.pool_max_connections ?? t('tenantData.notAvailable') }}</dd>
              </div>
              <div>
                <dt>{{ t('tenantData.poolActive') }}</dt>
                <dd>{{ target.active_leases }}</dd>
              </div>
              <div class="fingerprint">
                <dt>{{ t('tenantData.schemaFingerprint') }}</dt>
                <dd>{{ target.schema_fingerprint || t('tenantData.notAvailable') }}</dd>
              </div>
            </dl>
            <el-button type="primary" plain @click="openTargetDetail(target.key)">
              {{ t('tenantData.details') }}
            </el-button>
          </article>
        </div>

        <el-pagination
          v-if="(targetPage?.total ?? 0) > 0"
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="targetPage?.total ?? 0"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
          class="target-pagination"
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
.card-heading,
.target-mobile-card header {
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

.target-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.target-table {
  min-width: 1220px;
}

code {
  font-size: 12px;
}

.target-card-list {
  display: none;
}

.target-pagination {
  justify-content: flex-end;
  margin-top: 18px;
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

  .target-table-wrap {
    display: none;
  }

  .target-card-list {
    display: grid;
    gap: 12px;
    min-height: 120px;
  }

  .target-mobile-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color);
    border-radius: 10px;
  }

  .target-mobile-card strong {
    overflow-wrap: anywhere;
  }

  .target-mobile-card dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 14px 0 0;
  }

  .target-mobile-card dl > div {
    min-width: 0;
  }

  .target-mobile-card .fingerprint {
    grid-column: 1 / -1;
  }

  dt {
    margin-bottom: 4px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .target-pagination {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .target-card :deep(.el-card__body) {
    padding: 12px;
  }
}
</style>
