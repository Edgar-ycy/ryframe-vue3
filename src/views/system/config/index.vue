<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('system.config.name')">
          <el-input
            v-model="queryParams.name"
            :placeholder="t('system.config.enterName')"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="t('system.config.key')">
          <el-input
            v-model="queryParams.key"
            :placeholder="t('system.config.enterKey')"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            v-perm="'system:config:list'"
            type="primary"
            icon="Search"
            @click="handleSearch"
            >{{ t('system.common.search') }}</el-button
          >
          <el-button v-perm="'system:config:list'" icon="Refresh" @click="handleReset">{{
            t('system.common.reset')
          }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('system.config.list') }}</span>
          <div>
            <el-button
              v-perm="'system:config:export'"
              icon="Download"
              :loading="exportLoading"
              :disabled="!canExport"
              :title="canExport ? undefined : t('system.common.exportRequiresSuccessfulQuery')"
              @click="handleExport"
            >
              {{ t('system.common.export') }}
            </el-button>
            <el-button v-perm="'system:config:add'" type="primary" icon="Plus" @click="handleAdd">{{
              t('system.common.add')
            }}</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableResponse?.items ?? []" border stripe>
        <el-table-column prop="id" :label="t('system.common.id')" width="70" align="center" />
        <el-table-column
          prop="name"
          :label="t('system.config.name')"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          prop="key"
          :label="t('system.config.key')"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          prop="value"
          :label="t('system.config.value')"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          prop="portable"
          :label="t('system.config.portable')"
          width="130"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="row.portable ? 'success' : 'info'" effect="plain">
              {{ t(row.portable ? 'system.common.yes' : 'system.common.no') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="remark"
          :label="t('system.config.remark')"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column :label="t('system.common.createdAt')" min-width="160">
          <template #default="{ row }">{{ formatLocalizedDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column :label="t('system.common.actions')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-perm="'system:config:edit'"
              type="primary"
              link
              icon="Edit"
              @click="handleEdit(row)"
              >{{ t('system.common.edit') }}</el-button
            >
            <el-button
              v-perm="'system:config:remove'"
              type="danger"
              link
              icon="Delete"
              :loading="deletingId === row.id"
              @click="handleDelete(row)"
            >
              {{ t('system.common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="tableResponse?.total ?? 0"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @change="fetchData"
      />
    </el-card>

    <ConfigFormDialog ref="formDialogRef" :after-saved="refreshData" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  deleteConfig,
  exportConfig,
  listConfig,
  type ConfigQuery,
  type ConfigRecord,
} from '@/api/modules/config'
import { confirmExportIntent, normalizeExportIntent } from '@/app/exports/exportIntent'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { formatLocalizedDate } from '@/i18n'
import { emptyPageResponse, type Id, type PageResponse } from '@/shared/http/types'
import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import ConfigFormDialog from './ConfigFormDialog.vue'

type ConfigFormDialogInstance = {
  openAdd: () => void
  openEdit: (config: ConfigRecord) => Promise<void>
}

const { t } = useI18n()
const userStore = useUserStore()
const formDialogRef = ref<ConfigFormDialogInstance>()
const authenticated = () => userStore.sessionStatus === 'authenticated'

const {
  appliedQuery: appliedQueryParams,
  applyDraft,
  clearSuccessfulQuery,
  draftQuery: queryParams,
  hasSuccessfulQuery: canExport,
  lastSuccessfulQuery,
  refreshApplied,
  runAppliedQuery,
} = useAppliedListQuery<ConfigQuery>({ page: 1, page_size: 10, name: '', key: '' })
const { pending: exportLoading, submitExport } = useExportJobRequest()

watch(
  () => [userStore.tenantId, userStore.userId] as const,
  () => clearSuccessfulQuery(),
  { flush: 'sync' },
)

const configsQuery = useTenantQuery<PageResponse<ConfigRecord>>(
  () => userStore.tenantId,
  authenticated,
  'configs',
  () => ({ scope: 'list', filters: { ...appliedQueryParams.value } }),
  (signal) =>
    runAppliedQuery(signal, async (query, requestSignal) => {
      const params = { ...query }
      const response = await listConfig(params, requestSignal)
      return response.data ?? emptyPageResponse<ConfigRecord>(params)
    }),
)
const tableResponse = configsQuery.data
const loading = configsQuery.isFetching

async function handleExport(): Promise<void> {
  const successfulQuery = lastSuccessfulQuery.value
  if (!successfulQuery) {
    ElMessage.warning(t('system.common.exportRequiresSuccessfulQuery'))
    return
  }
  const intent = normalizeExportIntent('configs', successfulQuery)
  if (!(await confirmExportIntent(intent))) return

  await submitExport(intent.signature, (idempotencyKey, signal) =>
    exportConfig(intent.filter, idempotencyKey, signal, intent.isEmpty),
  )
}

async function fetchData(): Promise<void> {
  if (applyDraft()) return
  await refreshData()
}

function handleSearch() {
  queryParams.value.page = 1
  void fetchData()
}
function handleReset() {
  queryParams.value = {
    page: 1,
    page_size: queryParams.value.page_size,
    name: '',
    key: '',
  }
  void fetchData()
}

async function refreshData(): Promise<void> {
  await refreshApplied(async () => {
    await configsQuery.refetch({ throwOnError: true })
  })
}

const deleteMutation = useTenantMutation<void, ConfigRecord>(() => userStore.tenantId, 'configs', {
  mutationFn: async (config) => {
    await deleteConfig(config.id)
  },
  onSuccess: () => {
    ElMessage.success(t('system.common.deleteSuccess'))
  },
})
const deletingId = computed<Id | null>(() =>
  deleteMutation.pending.value ? (deleteMutation.variables.value?.id ?? null) : null,
)

function handleAdd() {
  formDialogRef.value?.openAdd()
}

async function handleEdit(row: ConfigRecord) {
  await formDialogRef.value?.openEdit(row)
}

async function handleDelete(row: ConfigRecord) {
  if (deleteMutation.pending.value) return
  const confirmed = await confirmAction(
    t('system.config.deleteConfirm', { name: row.name }),
    t('system.common.warning'),
    { type: 'warning' },
  )
  if (!confirmed) return
  await deleteMutation.mutateAsync(row)
  await refreshData()
}
</script>
