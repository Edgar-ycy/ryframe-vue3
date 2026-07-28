<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('system.post.name')">
          <el-input v-model="queryParams.name" :placeholder="t('system.post.enterName')" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item :label="t('system.post.code')">
          <el-input v-model="queryParams.code" :placeholder="t('system.post.enterCode')" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item :label="t('system.common.status')">
          <el-select v-model="queryParams.status" :placeholder="t('system.post.statusPlaceholder')" clearable style="width:120px">
            <el-option :label="t('system.common.normal')" value="1" />
            <el-option :label="t('system.common.disabled')" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'system:post:list'" type="primary" icon="Search" @click="handleSearch">{{ t('system.common.search') }}</el-button>
          <el-button v-perm="'system:post:list'" icon="Refresh" @click="handleReset">{{ t('system.common.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>{{ t('system.post.list') }}</span>
          <div>
            <el-button v-perm="'system:post:export'" icon="Download" :loading="exportLoading" @click="handleExport">{{ t('system.common.export') }}</el-button>
            <el-button v-perm="'system:post:add'" type="primary" icon="Plus" @click="handleAdd">{{ t('system.common.add') }}</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" :label="t('system.common.id')" width="70" align="center" />
        <el-table-column prop="name" :label="t('system.post.name')" min-width="130" show-overflow-tooltip />
        <el-table-column prop="code" :label="t('system.post.code')" />
        <el-table-column prop="sort" :label="t('system.common.sort')" align="center" />
        <el-table-column prop="status" :label="t('system.common.status')" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? t('system.common.normal') : t('system.common.disabled') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" :label="t('system.common.createdAt')" />
        <el-table-column :label="t('system.common.actions')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'system:post:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">{{ t('system.common.edit') }}</el-button>
            <el-button v-perm="'system:post:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">{{ t('system.common.delete') }}</el-button>
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

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="480px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item :label="t('system.post.name')" prop="name">
          <el-input v-model="form.name" :placeholder="t('system.post.enterName')" />
        </el-form-item>
        <el-form-item :label="t('system.post.code')" prop="code">
          <el-input v-model="form.code" :disabled="dialog.isEdit" :placeholder="t('system.post.enterCode')" />
        </el-form-item>
        <el-form-item :label="t('system.common.sort')">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item v-if="dialog.isEdit" :label="t('system.common.status')">
          <el-radio-group v-model="form.status">
            <el-radio value="1">{{ t('system.common.normal') }}</el-radio>
            <el-radio value="0">{{ t('system.common.disabled') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">{{ t('system.common.cancel') }}</el-button>
        <el-button v-if="dialog.isEdit" v-perm="'system:post:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('system.common.confirm') }}</el-button>
        <el-button v-else v-perm="'system:post:add'" type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('system.common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  listPost,
  getPost,
  createPost,
  updatePost,
  deletePost,
  exportPost,
  type PostRecord,
} from '@/api/modules/post'
import { useAsyncExport } from '@/hooks/useAsyncExport'
import type { Id } from '@/shared/http/types'
import { useUserStore } from '@/stores/user'
import { invalidateTenantResource } from '@/shared/query/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'

const { t } = useI18n()

const queryParams = ref({ page: 1, page_size: 10, name: '', code: '', status: '' })
const userStore = useUserStore()
const postsQuery = useTenantQuery(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated',
  'posts',
  () => ({ ...queryParams.value }),
  () => listPost({ ...queryParams.value }),
)
const loading = computed(() => postsQuery.isFetching.value)
const tableData = computed<PostRecord[]>(() => postsQuery.data.value?.data?.items ?? [])
const total = computed(() => postsQuery.data.value?.data?.total ?? 0)
const { exporting: exportLoading, exportAndDownload } = useAsyncExport()

function handleExport() {
  return exportAndDownload(() => exportPost(queryParams.value), {
    filename: t('system.post.exportFilename'),
  })
}

async function fetchData() {
  await postsQuery.refetch()
}

async function refreshPosts() {
  await invalidateTenantResource(userStore.tenantId, 'posts')
  await fetchData()
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.name = ''; queryParams.value.code = ''; queryParams.value.status = ''; handleSearch() }

const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<Id | null>(null)
const form = ref({ name: '', code: '', sort: 0, status: '1' })
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.post.enterName'), trigger: 'blur' }],
  code: [{ required: true, message: t('system.post.enterCode'), trigger: 'blur' }],
}))

function resetForm() { form.value.name = ''; form.value.code = ''; form.value.sort = 0; form.value.status = '1'; formRef.value?.clearValidate() }

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = t('system.post.addTitle'); dialog.value.isEdit = false
  resetForm(); dialog.value.visible = true
}

async function handleEdit(row: PostRecord) {
  currentEditId.value = row.id
  dialog.value.title = t('system.post.editTitle'); dialog.value.isEdit = true
  resetForm()
  const res = await getPost(row.id)
  if (!res.data) throw new Error(t('system.post.detailMissing'))
  const d = res.data
  form.value.name = d.name; form.value.code = d.code
  form.value.sort = d.sort ?? 0; form.value.status = d.status
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (dialog.value.isEdit) {
      await updatePost(currentEditId.value!, {
        name: form.value.name,
        sort: form.value.sort,
        status: form.value.status,
      })
      ElMessage.success(t('system.common.updateSuccess'))
    } else {
      await createPost({ name: form.value.name, code: form.value.code, sort: form.value.sort })
      ElMessage.success(t('system.common.addSuccess'))
    }
    dialog.value.visible = false; await refreshPosts()
  } finally { submitLoading.value = false }
}

async function handleDelete(row: PostRecord) {
  try {
    await ElMessageBox.confirm(
      t('system.post.deleteConfirm', { name: row.name }),
      t('system.common.warning'),
      { type: 'warning' },
    )
    await deletePost(row.id)
    ElMessage.success(t('system.common.deleteSuccess')); await refreshPosts()
  } catch { /* 用户取消 */ }
}

</script>
