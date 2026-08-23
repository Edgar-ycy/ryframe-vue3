<template>
  <PostPage>
    <template #actions="{ canExport, lastSuccessfulQuery }">
      <el-button
        v-perm="postExportPermission"
        icon="Download"
        :disabled="!canExport"
        :loading="exportLoading"
        :title="canExport ? undefined : t('system.common.exportRequiresSuccessfulQuery')"
        @click="handleExport(lastSuccessfulQuery)"
      >
        {{ t('system.common.export') }}
      </el-button>
    </template>
  </PostPage>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { findCrudResource } from '@/api/generated/crudResources'
import { exportPost } from '@/api/modules/post'
import { confirmExportIntent, normalizeExportIntent } from '@/app/exports/exportIntent'
import { PostPage, type PostQuery } from '@/generated/resources/post'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'

const { t } = useI18n()
const { pending: exportLoading, submitExport } = useExportJobRequest()
const postExportPermission = findCrudResource('post').extension_permissions.export

async function handleExport(successfulQuery: PostQuery | null): Promise<void> {
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
