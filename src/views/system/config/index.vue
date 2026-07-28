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
            <el-button v-perm="'system:config:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">{{ t('system.common.delete') }}</el-button>
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

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @close="resetForm">
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
  listConfig,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  exportConfig,
  type ConfigRecord,
} from '@/api/modules/config'
import { useSettingsStore } from '@/stores/settings'
import { useDownload } from '@/hooks/useDownload'
import type { Id } from '@/shared/http/types'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const loading = ref(false)
const tableData = ref<ConfigRecord[]>([])
const total = ref(0)
const queryParams = ref({ page: 1, page_size: 10, name: '', key: '' })
const { downloading: exportLoading, downloadBlob } = useDownload()

function handleExport() {
  return downloadBlob(() => exportConfig(queryParams.value), {
    filename: t('system.config.exportFilename'),
  })
}

async function fetchData() {
  loading.value = true
  try {
    const res = await listConfig(queryParams.value)
    tableData.value = res.data?.items || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.name = ''; queryParams.value.key = ''; handleSearch() }

const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<Id | null>(null)
const form = ref({ name: '', key: '', value: '', remark: '' })
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.config.enterName'), trigger: 'blur' }],
  key: [{ required: true, message: t('system.config.enterKey'), trigger: 'blur' }],
  value: [{ required: true, message: t('system.config.enterValue'), trigger: 'blur' }],
}))

function resetForm() { form.value.name = ''; form.value.key = ''; form.value.value = ''; form.value.remark = ''; formRef.value?.clearValidate() }

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = t('system.config.addTitle'); dialog.value.isEdit = false
  resetForm(); dialog.value.visible = true
}

async function handleEdit(row: ConfigRecord) {
  currentEditId.value = row.id
  dialog.value.title = t('system.config.editTitle'); dialog.value.isEdit = true
  resetForm()
  const res = await getConfig(row.id)
  if (!res.data) throw new Error(t('system.config.detailMissing'))
  const d = res.data
  form.value.name = d.name; form.value.key = d.key
  form.value.value = d.value; form.value.remark = d.remark || ''
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (dialog.value.isEdit) {
      await updateConfig(currentEditId.value!, { value: form.value.value })
      ElMessage.success(t('system.common.updateSuccess'))
      // 如果修改的是皮肤/主题相关配置，立即应用到页面
      if (form.value.key === 'sys.index.skinName' || form.value.key === 'sys.index.sideTheme') {
        await settingsStore.syncFromServer()
      }
    } else {
      await createConfig({
        name: form.value.name,
        key: form.value.key,
        value: form.value.value,
        remark: form.value.remark || undefined,
      })
      ElMessage.success(t('system.common.addSuccess'))
    }
    dialog.value.visible = false
    await fetchData()
  } catch {
    // 请求错误由 HTTP 层统一展示。
  } finally { submitLoading.value = false }
}

async function handleDelete(row: ConfigRecord) {
  try {
    await ElMessageBox.confirm(
      t('system.config.deleteConfirm', { name: row.name }),
      t('system.common.warning'),
      { type: 'warning' },
    )
    await deleteConfig(row.id)
    ElMessage.success(t('system.common.deleteSuccess')); await fetchData()
  } catch { /* 用户取消 */ }
}

onMounted(() => fetchData())
</script>
