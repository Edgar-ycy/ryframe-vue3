<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('system.config.name')">
          <el-input v-model="queryParams.name" :placeholder="t('system.config.enterName')" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item :label="t('system.config.key')">
          <el-input v-model="queryParams.key" :placeholder="t('system.config.enterKey')" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'system:config:list'" type="primary" icon="Search" @click="handleSearch">{{ t('system.common.search') }}</el-button>
          <el-button v-perm="'system:config:list'" icon="Refresh" @click="handleReset">{{ t('system.common.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>{{ t('system.config.list') }}</span>
          <div>
            <el-button v-perm="'system:config:export'" icon="Download" :loading="exportLoading" @click="handleExport">{{ t('system.common.export') }}</el-button>
            <el-button v-perm="'system:config:add'" type="primary" icon="Plus" @click="handleAdd">{{ t('system.common.add') }}</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" :label="t('system.common.id')" width="70" align="center" />
        <el-table-column prop="name" :label="t('system.config.name')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="key" :label="t('system.config.key')" min-width="140" show-overflow-tooltip />
        <el-table-column prop="value" :label="t('system.config.value')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="remark" :label="t('system.config.remark')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="created_at" :label="t('system.common.createdAt')" />
        <el-table-column :label="t('system.common.actions')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'system:config:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">{{ t('system.common.edit') }}</el-button>
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
        :total="total" :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" background
        @change="fetchData"
      />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @close="resetDialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item :label="t('system.config.name')" prop="name">
          <el-input v-model="form.name" :placeholder="t('system.config.enterName')" />
        </el-form-item>
        <el-form-item :label="t('system.config.key')" prop="key">
          <el-input v-model="form.key" :disabled="dialog.isEdit" :placeholder="t('system.config.enterKey')" />
        </el-form-item>
        <el-form-item :label="t('system.config.value')" prop="value">
          <el-input v-model="form.value" type="textarea" :rows="3" :placeholder="t('system.config.enterValue')" />
        </el-form-item>
        <el-form-item :label="t('system.config.remark')">
          <el-input v-model="form.remark" type="textarea" :rows="2" :placeholder="t('system.config.enterRemark')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">{{ t('system.common.cancel') }}</el-button>
        <el-button v-if="dialog.isEdit" v-perm="'system:config:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('system.common.confirm') }}</el-button>
        <el-button v-else v-perm="'system:config:add'" type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('system.common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  createConfig,
  deleteConfig,
  exportConfig,
  getConfig,
  listConfig,
  updateConfig,
  type ConfigCreateInput,
  type ConfigQuery,
  type ConfigRecord,
} from '@/api/modules/config'
import { useAsyncExport } from '@/hooks/useAsyncExport'
import { useShellSettingsQuery } from '@/app/settings/shellSettingsQuery'
import type { Id, PageResponse } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

const { t } = useI18n()
const userStore = useUserStore()
const authenticated = () => userStore.sessionStatus === 'authenticated'
const { refresh: refreshShellSettings } = useShellSettingsQuery()

const queryParams = ref<ConfigQuery>({ page: 1, page_size: 10, name: '', key: '' })
const activeQueryParams = ref<ConfigQuery>({ ...queryParams.value })
const { pending: exportLoading, exportAndDownload } = useAsyncExport(() => userStore.tenantId)
const configsQuery = useTenantQuery<PageResponse<ConfigRecord>>(
  () => userStore.tenantId,
  authenticated,
  'configs',
  () => ({ scope: 'list', filters: { ...activeQueryParams.value } }),
  async signal => {
    const response = await listConfig({ ...activeQueryParams.value }, signal)
    return response.data ?? {
      items: [],
      page: activeQueryParams.value.page ?? 1,
      page_size: activeQueryParams.value.page_size ?? 10,
      total: 0,
      total_pages: 0,
      max_page_size: activeQueryParams.value.page_size ?? 10,
    }
  },
)
const tableData = computed(() => configsQuery.data.value?.items ?? [])
const total = computed(() => configsQuery.data.value?.total ?? 0)
const loading = computed(() => configsQuery.isFetching.value)

function handleExport() {
  return exportAndDownload(signal => exportConfig(activeQueryParams.value, signal), {
    filename: t('system.config.exportFilename'),
  })
}

async function fetchData() {
  const nextParams = { ...queryParams.value }
  if (JSON.stringify(nextParams) !== JSON.stringify(activeQueryParams.value)) {
    activeQueryParams.value = nextParams
    return
  }
  await configsQuery.refetch({ throwOnError: true })
}

function handleSearch() { queryParams.value.page = 1; void fetchData() }
function handleReset() { queryParams.value.name = ''; queryParams.value.key = ''; handleSearch() }

const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const currentEditId = ref<Id | null>(null)
const editingConfig = ref<ConfigRecord | null>(null)
const form = ref({ name: '', key: '', value: '', remark: '' })
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.config.enterName'), trigger: 'blur' }],
  key: [{ required: true, message: t('system.config.enterKey'), trigger: 'blur' }],
  value: [{ required: true, message: t('system.config.enterValue'), trigger: 'blur' }],
}))

function resetForm() { form.value.name = ''; form.value.key = ''; form.value.value = ''; form.value.remark = ''; formRef.value?.clearValidate() }

function resetDialog() {
  resetForm()
  currentEditId.value = null
  editingConfig.value = null
}

const detailQuery = useTenantQuery<ConfigRecord>(
  () => userStore.tenantId,
  () => authenticated() && editingConfig.value !== null,
  'configs',
  () => ({ scope: 'detail', id: editingConfig.value?.id ?? null }),
  async signal => {
    const target = editingConfig.value
    if (!target) throw new Error(t('system.config.detailMissing'))
    const response = await getConfig(target.id, signal)
    if (!response.data) throw new Error(t('system.config.detailMissing'))
    return response.data
  },
)

type SaveConfigCommand =
  | { kind: 'create'; data: ConfigCreateInput }
  | { kind: 'update'; id: Id; key: string; value: string }

const saveMutation = useTenantMutation<void, SaveConfigCommand>(
  () => userStore.tenantId,
  'configs',
  {
    mutationFn: async command => {
      if (command.kind === 'create') {
        await createConfig(command.data)
      } else {
        await updateConfig(command.id, { value: command.value })
      }
    },
    onSuccess: async (_data, command) => {
      ElMessage.success(t(command.kind === 'create'
        ? 'system.common.addSuccess'
        : 'system.common.updateSuccess'))
      if (
        command.kind === 'update'
        && (command.key === 'sys.index.skinName' || command.key === 'sys.index.sideTheme')
      ) {
        await refreshShellSettings()
      }
    },
  },
)
const submitLoading = saveMutation.pending

const deleteMutation = useTenantMutation<void, ConfigRecord>(
  () => userStore.tenantId,
  'configs',
  {
    mutationFn: async config => {
      await deleteConfig(config.id)
    },
    onSuccess: () => {
      ElMessage.success(t('system.common.deleteSuccess'))
    },
  },
)
const deletingId = computed<Id | null>(() => (
  deleteMutation.pending.value ? deleteMutation.variables.value?.id ?? null : null
))

function handleAdd() {
  currentEditId.value = null
  editingConfig.value = null
  dialog.value.title = t('system.config.addTitle'); dialog.value.isEdit = false
  resetForm(); dialog.value.visible = true
}

async function handleEdit(row: ConfigRecord) {
  if (saveMutation.pending.value) return
  currentEditId.value = row.id
  editingConfig.value = row
  dialog.value.title = t('system.config.editTitle'); dialog.value.isEdit = true
  resetForm()
  await nextTick()
  const result = await detailQuery.refetch({ throwOnError: true })
  const d = result.data
  if (!d) throw new Error(t('system.config.detailMissing'))
  form.value.name = d.name; form.value.key = d.key
  form.value.value = d.value; form.value.remark = d.remark || ''
  dialog.value.visible = true
}

async function handleSubmit() {
  if (saveMutation.pending.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (dialog.value.isEdit) {
    await saveMutation.mutateAsync({
      kind: 'update',
      id: currentEditId.value!,
      key: form.value.key,
      value: form.value.value,
    })
  } else {
    await saveMutation.mutateAsync({
      kind: 'create',
      data: {
        name: form.value.name,
        key: form.value.key,
        value: form.value.value,
        remark: form.value.remark || undefined,
      },
    })
  }
  dialog.value.visible = false
  await configsQuery.refetch({ throwOnError: true })
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
  await configsQuery.refetch({ throwOnError: true })
}
</script>
