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

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('system.post.list') }}</span>
          <div>
            <el-button
              v-perm="'system:post:export'"
              icon="Download"
              :loading="exportLoading"
              :disabled="!canExport"
              :title="canExport ? undefined : t('system.common.exportRequiresSuccessfulQuery')"
              @click="handleExport"
            >
              {{ t('system.common.export') }}
            </el-button>
            <el-button v-perm="'system:post:add'" type="primary" icon="Plus" @click="handleAdd">{{ t('system.common.add') }}</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableResponse?.items ?? []" border stripe>
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
            <el-button
              v-perm="'system:post:remove'"
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
        :total="tableResponse?.total ?? 0" :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" background
        @change="fetchData"
      />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="480px" @close="resetDialog">
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
  createPost,
  deletePost,
  exportPost,
  getPost,
  listPost,
  updatePost,
  type PostCreateInput,
  type PostQuery,
  type PostRecord,
  type PostUpdateInput,
} from '@/api/modules/post'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { emptyPageResponse, type Id, type PageResponse } from '@/shared/http/types'
import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

const { t } = useI18n()

const {
  appliedQuery: appliedQueryParams,
  applyDraft,
  clearSuccessfulQuery,
  draftQuery: queryParams,
  hasSuccessfulQuery: canExport,
  lastSuccessfulQuery,
  refreshApplied,
  runAppliedQuery,
} = useAppliedListQuery<PostQuery>({
  page: 1,
  page_size: 10,
  name: '',
  code: '',
  status: '',
})
const userStore = useUserStore()
const authenticated = () => userStore.sessionStatus === 'authenticated'

watch(
  () => [userStore.tenantId, userStore.userId] as const,
  () => clearSuccessfulQuery(),
  { flush: 'sync' },
)

const postsQuery = useTenantQuery<PageResponse<PostRecord>>(
  () => userStore.tenantId,
  authenticated,
  'posts',
  () => ({ scope: 'list', filters: { ...appliedQueryParams.value } }),
  signal => runAppliedQuery(signal, async (query, requestSignal) => {
    const params = { ...query }
    const response = await listPost(params, requestSignal)
    return response.data ?? emptyPageResponse<PostRecord>(params)
  }),
)
const loading = postsQuery.isFetching
const tableResponse = postsQuery.data
const { pending: exportLoading, submitExport } = useExportJobRequest()

async function handleExport(): Promise<void> {
  const successfulQuery = lastSuccessfulQuery.value
  if (!successfulQuery) {
    ElMessage.warning(t('system.common.exportRequiresSuccessfulQuery'))
    return
  }
  const filters = { ...successfulQuery }
  await submitExport(
    `posts:${JSON.stringify(filters)}`,
    (idempotencyKey, signal) => exportPost(filters, idempotencyKey, signal),
  )
}

async function fetchData(): Promise<void> {
  if (applyDraft()) return
  await refreshData()
}

function handleSearch() { queryParams.value.page = 1; void fetchData() }
function handleReset() {
  queryParams.value = {
    page: 1,
    page_size: queryParams.value.page_size,
    name: '',
    code: '',
    status: '',
  }
  void fetchData()
}

async function refreshData(): Promise<void> {
  await refreshApplied(async () => {
    await postsQuery.refetch({ throwOnError: true })
  })
}

const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const currentEditId = ref<Id | null>(null)
const editingPost = ref<PostRecord | null>(null)
const form = ref({ name: '', code: '', sort: 0, status: '1' })
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.post.enterName'), trigger: 'blur' }],
  code: [{ required: true, message: t('system.post.enterCode'), trigger: 'blur' }],
}))

function resetForm() { form.value.name = ''; form.value.code = ''; form.value.sort = 0; form.value.status = '1'; formRef.value?.clearValidate() }

function resetDialog() {
  resetForm()
  currentEditId.value = null
  editingPost.value = null
}

const detailQuery = useTenantQuery<PostRecord>(
  () => userStore.tenantId,
  () => authenticated() && editingPost.value !== null,
  'posts',
  () => ({ scope: 'detail', id: editingPost.value?.id ?? null }),
  async signal => {
    const target = editingPost.value
    if (!target) throw new Error(t('system.post.detailMissing'))
    const response = await getPost(target.id, signal)
    if (!response.data) throw new Error(t('system.post.detailMissing'))
    return response.data
  },
)

type SavePostCommand =
  | { kind: 'create'; data: PostCreateInput }
  | { kind: 'update'; id: Id; data: PostUpdateInput }

const saveMutation = useTenantMutation<void, SavePostCommand>(
  () => userStore.tenantId,
  'posts',
  {
    mutationFn: async command => {
      if (command.kind === 'create') {
        await createPost(command.data)
      } else {
        await updatePost(command.id, command.data)
      }
    },
    onSuccess: (_data, command) => {
      ElMessage.success(t(command.kind === 'create'
        ? 'system.common.addSuccess'
        : 'system.common.updateSuccess'))
    },
  },
)
const submitLoading = saveMutation.pending

const deleteMutation = useTenantMutation<void, PostRecord>(
  () => userStore.tenantId,
  'posts',
  {
    mutationFn: async post => {
      await deletePost(post.id)
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
  editingPost.value = null
  dialog.value.title = t('system.post.addTitle'); dialog.value.isEdit = false
  resetForm(); dialog.value.visible = true
}

async function handleEdit(row: PostRecord) {
  if (saveMutation.pending.value) return
  currentEditId.value = row.id
  editingPost.value = row
  dialog.value.title = t('system.post.editTitle'); dialog.value.isEdit = true
  resetForm()
  await nextTick()
  const result = await detailQuery.refetch({ throwOnError: true })
  const d = result.data
  if (!d) throw new Error(t('system.post.detailMissing'))
  form.value.name = d.name; form.value.code = d.code
  form.value.sort = d.sort ?? 0; form.value.status = d.status
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
      data: {
        name: form.value.name,
        sort: form.value.sort,
        status: form.value.status,
      },
    })
  } else {
    await saveMutation.mutateAsync({
      kind: 'create',
      data: { name: form.value.name, code: form.value.code, sort: form.value.sort },
    })
  }
  dialog.value.visible = false
  await refreshData()
}

async function handleDelete(row: PostRecord) {
  if (deleteMutation.pending.value) return
  const confirmed = await confirmAction(
    t('system.post.deleteConfirm', { name: row.name }),
    t('system.common.warning'),
    { type: 'warning' },
  )
  if (!confirmed) return

  await deleteMutation.mutateAsync(row)
  await refreshData()
}

</script>
