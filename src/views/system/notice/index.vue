<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('system.notice.title')">
          <el-input v-model="queryParams.title" :placeholder="t('system.notice.enterTitle')" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item :label="t('system.common.type')">
          <el-select v-model="queryParams.notice_type" :placeholder="t('system.notice.typePlaceholder')" clearable style="width:120px">
            <el-option :label="t('system.notice.notice')" value="notice" />
            <el-option :label="t('system.notice.announcement')" value="announcement" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('system.common.status')">
          <el-select v-model="queryParams.status" :placeholder="t('system.common.status')" clearable style="width:100px">
            <el-option :label="t('system.notice.published')" value="1" />
            <el-option :label="t('system.notice.draft')" value="0" />
            <el-option :label="t('system.notice.closed')" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'system:notice:list'" type="primary" icon="Search" @click="handleSearch">{{ t('system.common.search') }}</el-button>
          <el-button v-perm="'system:notice:list'" icon="Refresh" @click="handleReset">{{ t('system.common.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>{{ t('system.notice.list') }}</span>
          <el-button v-perm="'system:notice:add'" type="primary" icon="Plus" @click="handleAdd">{{ t('system.common.add') }}</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" :label="t('system.common.id')" width="70" align="center" />
        <el-table-column prop="title" :label="t('system.notice.shortTitle')" min-width="180" show-overflow-tooltip />
        <el-table-column prop="content" :label="t('system.common.content')" min-width="200" show-overflow-tooltip />
        <el-table-column :label="t('system.common.type')" align="center">
          <template #default="{ row }">
            <el-tag :type="row.notice_type === 'notice' ? 'primary' : 'warning'" size="small">
              {{ row.notice_type === 'notice' ? t('system.notice.notice') : t('system.notice.announcement') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="t('system.common.status')" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : row.status === '2' ? 'info' : 'warning'" size="small">
              {{ row.status === '1'
                ? t('system.notice.published')
                : row.status === '2'
                  ? t('system.notice.closed')
                  : t('system.notice.draft') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" :label="t('system.common.createdAt')" />
        <el-table-column :label="t('system.common.actions')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.status === '1'"
              v-perm="'system:message:publish'"
              type="primary"
              link
              :loading="publishingId === row.id"
              @click="handlePublishMessage(row)"
            >
              {{ t('system.notice.publishToMessageCenter') }}
            </el-button>
            <el-button v-perm="'system:notice:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">{{ t('system.common.edit') }}</el-button>
            <el-button v-perm="'system:notice:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">{{ t('system.common.delete') }}</el-button>
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

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item :label="t('system.notice.title')" prop="title">
          <el-input v-model="form.title" :placeholder="t('system.notice.enterNoticeTitle')" />
        </el-form-item>
        <el-form-item :label="t('system.notice.typePlaceholder')">
          <el-select v-model="form.notice_type" style="width:100%">
            <el-option :label="t('system.notice.notice')" value="notice" />
            <el-option :label="t('system.notice.announcement')" value="announcement" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('system.common.content')" prop="content">
          <div class="markdown-editor">
            <el-input
              v-model="form.content"
              class="markdown-editor__input"
              type="textarea"
              :rows="10"
              :placeholder="t('system.notice.markdownPlaceholder')"
            />
            <section class="markdown-editor__preview" :aria-label="t('system.notice.markdownPreview')">
              <p v-if="!form.content" class="markdown-editor__empty">
                {{ t('system.notice.previewEmpty') }}
              </p>
              <!-- 仅允许绑定由 renderMarkdown 禁用原始 HTML 并经 DOMPurify 清洗后的受限内容。 -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-else class="markdown-editor__content" v-html="renderedContent" />
            </section>
          </div>
        </el-form-item>
        <el-form-item v-if="dialog.isEdit" :label="t('system.common.status')">
          <el-radio-group v-model="form.status">
            <el-radio value="1">{{ t('system.notice.published') }}</el-radio>
            <el-radio value="0">{{ t('system.notice.draft') }}</el-radio>
            <el-radio value="2">{{ t('system.notice.closed') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">{{ t('system.common.cancel') }}</el-button>
        <el-button v-if="dialog.isEdit" v-perm="'system:notice:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('system.common.confirm') }}</el-button>
        <el-button v-else v-perm="'system:notice:add'" type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('system.common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  listNotice,
  getNotice,
  createNotice,
  updateNotice,
  deleteNotice,
  publishNoticeToMessageCenter,
  type NoticeRecord,
} from '@/api/modules/notice'
import type { Id } from '@/shared/http/types'
import { useUserStore } from '@/stores/user'
import { invalidateTenantResource } from '@/shared/query/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { renderMarkdown } from '@/shared/markdown/render'

const queryParams = ref({ page: 1, page_size: 10, title: '', notice_type: '', status: '' })
const { t } = useI18n()
const userStore = useUserStore()
const noticesQuery = useTenantQuery(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated',
  'notices',
  () => ({ ...queryParams.value }),
  () => listNotice({ ...queryParams.value }),
)
const loading = computed(() => noticesQuery.isFetching.value)
const tableData = computed<NoticeRecord[]>(() => noticesQuery.data.value?.data?.items ?? [])
const total = computed(() => noticesQuery.data.value?.data?.total ?? 0)

async function fetchData() {
  await noticesQuery.refetch()
}

async function refreshNotices() {
  await invalidateTenantResource(userStore.tenantId, 'notices')
  await fetchData()
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.title = ''; queryParams.value.notice_type = ''; queryParams.value.status = ''; handleSearch() }

const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<Id | null>(null)
const publishingId = ref<Id | null>(null)
const form = ref({ title: '', notice_type: 'notice', content: '', status: '1' })
const renderedContent = computed(() => renderMarkdown(form.value.content))
const rules = computed<FormRules>(() => ({
  title: [{ required: true, message: t('system.notice.enterTitle'), trigger: 'blur' }],
  content: [{ required: true, message: t('system.notice.enterContent'), trigger: 'blur' }],
}))

function resetForm() { form.value.title = ''; form.value.notice_type = 'notice'; form.value.content = ''; form.value.status = '1'; formRef.value?.clearValidate() }

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = t('system.notice.addTitle'); dialog.value.isEdit = false
  resetForm(); dialog.value.visible = true
}

async function handleEdit(row: NoticeRecord) {
  currentEditId.value = row.id
  dialog.value.title = t('system.notice.editTitle'); dialog.value.isEdit = true
  resetForm()
  const res = await getNotice(row.id)
  if (!res.data) throw new Error(t('system.notice.detailMissing'))
  const d = res.data
  form.value.title = d.title; form.value.notice_type = d.notice_type || 'notice'
  form.value.content = d.content; form.value.status = d.status
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    const data = {
      title: form.value.title,
      content: form.value.content,
      notice_type: form.value.notice_type,
    }
    if (dialog.value.isEdit) {
      await updateNotice(currentEditId.value!, { ...data, status: form.value.status })
      ElMessage.success(t('system.common.updateSuccess'))
    } else {
      await createNotice(data)
      ElMessage.success(t('system.common.addSuccess'))
    }
    dialog.value.visible = false; await refreshNotices()
  } finally { submitLoading.value = false }
}

async function handlePublishMessage(row: NoticeRecord) {
  try {
    await ElMessageBox.confirm(
      t('system.notice.publishMessageConfirm', { title: row.title }),
      t('system.common.prompt'),
      { type: 'warning' },
    )
  } catch {
    return
  }

  publishingId.value = row.id
  try {
    await publishNoticeToMessageCenter(row.id)
    ElMessage.success(t('system.notice.publishMessageSuccess'))
  } catch {
    ElMessage.error(t('system.notice.publishMessageFailed'))
  } finally {
    publishingId.value = null
  }
}

async function handleDelete(row: NoticeRecord) {
  try {
    await ElMessageBox.confirm(
      t('system.notice.deleteConfirm', { name: row.title }),
      t('system.common.warning'),
      { type: 'warning' },
    )
    await deleteNotice(row.id)
    ElMessage.success(t('system.common.deleteSuccess')); await refreshNotices()
  } catch { /* 用户取消 */ }
}

</script>

<style scoped>
.markdown-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  width: 100%;
}

.markdown-editor__preview {
  min-height: 232px;
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-regular);
}

.markdown-editor__empty {
  margin: 0;
  color: var(--el-text-color-placeholder);
}

.markdown-editor__content :deep(pre) {
  overflow: auto;
  padding: 10px;
  border-radius: 4px;
  background: var(--el-fill-color-dark);
}

@media (width <= 720px) {
  .markdown-editor { grid-template-columns: 1fr; }
}
</style>
