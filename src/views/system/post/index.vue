<template>
  <FlatCrudPage
    v-model:dialog-visible="dialogVisible"
    v-model:form="form"
    v-model:page="page"
    v-model:page-size="pageSize"
    :columns="presentation.columns"
    :deleting-key="deletingKey"
    :dialog-title="dialogTitle"
    :editing="editing"
    :form-fields="presentation.formFields"
    :labels="presentation.labels"
    :loading="listQuery.isFetching.value"
    :permissions="presentation.permissions"
    :query="query"
    :query-fields="presentation.queryFields"
    :row-key="presentation.resource.recordId"
    :rows="listQuery.data.value?.items ?? []"
    :saving="saving"
    :total="listQuery.data.value?.total ?? 0"
    @add="add"
    @edit="edit"
    @page-change="changePage"
    @remove="remove"
    @reset="reset"
    @search="search"
    @submit="submit"
    @update:query="setQuery"
  >
    <template #actions>
      <el-button
        v-perm="'system:post:export'"
        icon="Download"
        :disabled="!canExport"
        :loading="exportLoading"
        :title="canExport ? undefined : t('system.common.exportRequiresSuccessfulQuery')"
        @click="handleExport"
      >
        {{ t('system.common.export') }}
      </el-button>
    </template>
  </FlatCrudPage>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { exportPost } from '@/api/modules/post'
import { confirmExportIntent, normalizeExportIntent } from '@/app/exports/exportIntent'
import { FlatCrudPage, useFlatCrudResource } from '@/components/business/flat-crud'
import { createPostPresentation } from '@/generated/resources/post'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { formatLocalizedDate } from '@/i18n'

const { t } = useI18n()
const translate = (key: string, params?: Record<string, string>) => String(t(key, params ?? {}))
const presentation = computed(() => createPostPresentation(translate, formatLocalizedDate))
const {
  add,
  canExport,
  changePage,
  deletingKey,
  dialogTitle,
  dialogVisible,
  edit,
  editing,
  form,
  lastSuccessfulQuery,
  listQuery,
  page,
  pageSize,
  query,
  remove,
  reset,
  search,
  setQuery,
  submit,
  saving,
} = useFlatCrudResource(presentation.value.resource)
const { pending: exportLoading, submitExport } = useExportJobRequest()

async function handleExport(): Promise<void> {
  const successfulQuery = lastSuccessfulQuery.value
  if (!successfulQuery) {
    ElMessage.warning(t('system.common.exportRequiresSuccessfulQuery'))
    return
  }
  const intent = normalizeExportIntent('posts', successfulQuery)
  if (!(await confirmExportIntent(intent))) return

  await submitExport(
    intent.signature,
    (idempotencyKey, signal) => exportPost(
      intent.filter,
      idempotencyKey,
      signal,
      intent.isEmpty,
    ),
  )
}
</script>
