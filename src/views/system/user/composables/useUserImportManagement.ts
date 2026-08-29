import { ElMessage } from 'element-plus'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { createUserImport } from '@/api/modules/userImport'
import { downloadImportTemplate } from '@/api/modules/user'
import { downloadBlobDirect } from '@/hooks/useDownload'
import { translate } from '@/i18n'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import {
  assertServerStateScopeCurrent,
  invalidateServerStateResource,
  isServerStateScopeCurrent,
  useServerStateScope,
} from '@/shared/query/client'
import {
  beginServerStatePageOperation,
  propagateServerStatePageOperationError,
} from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'

interface ImportCommand {
  file: File
  idempotencyKey: string
  scope: ServerStateScope
}

export async function hashUserImportFile(file: File): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function userImportRetryOwner(
  scope: ServerStateScope,
  file: File,
  contentHash: string,
): string {
  const metadata = `${file.name}:${file.size}:${file.lastModified}:${file.type}`
  return `${scope.tenantId}\0${scope.subjectId}\0${scope.sessionEpoch}\0${metadata}\0${contentHash}`
}

/** 用户页的模板下载、异步导入创建和历史抽屉状态。 */
export function useUserImportManagement(refreshUsers: () => void | Promise<unknown>) {
  const importDialogVisible = ref(false)
  const importHistoryVisible = ref(false)
  const importPreparing = ref(false)
  const templateLoading = ref(false)
  const pendingKeys = new Map<string, string>()
  const pageLifecycle = useServerStatePageLifecycle(resetProjection)

  const importMutation = useServerStateMutation<unknown, ImportCommand>('user-imports', {
    invalidateOnSuccess: false,
    meta: { errorMode: 'silent' },
    mutationFn: (command) => {
      assertServerStateScopeCurrent(command.scope)
      return createUserImport(command.file, command.idempotencyKey)
    },
  })

  function resetProjection(): void {
    importDialogVisible.value = false
    importHistoryVisible.value = false
    importPreparing.value = false
    templateLoading.value = false
  }

  watch(useServerStateScope(), () => pendingKeys.clear(), { flush: 'sync' })
  onScopeDispose(() => pendingKeys.clear())

  function openImport(): void {
    if (!pageLifecycle.pageActive.value || importMutation.pending.value) return
    importDialogVisible.value = true
  }

  function openHistory(): void {
    if (!pageLifecycle.pageActive.value) return
    importHistoryVisible.value = true
  }

  async function submitImport(file: File, expectedScope: ServerStateScope): Promise<void> {
    if (importPreparing.value || importMutation.pending.value) return
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = beginServerStatePageOperation()
    assertServerStateScopeCurrent(expectedScope)
    operation.assertCurrent(ownsOperation)
    operation.apply(() => {
      importPreparing.value = true
    }, ownsOperation)
    try {
      let contentHash: string
      try {
        contentHash = await hashUserImportFile(file)
      } catch (error) {
        propagateServerStatePageOperationError(error, operation, ownsOperation)
      }
      operation.assertCurrent(ownsOperation)
      if (importMutation.pending.value) return
      const owner = userImportRetryOwner(operation.scope, file, contentHash)
      const idempotencyKey = pendingKeys.get(owner) ?? createIdempotencyKey('user-import')
      const command = { file, idempotencyKey, scope: expectedScope }
      try {
        await importMutation.mutateAsync(command)
        pendingKeys.delete(owner)
      } catch (error) {
        if (isServerStateScopeCurrent(expectedScope)) {
          if (shouldReuseIdempotencyKey(error)) pendingKeys.set(owner, idempotencyKey)
          else pendingKeys.delete(owner)
        }
        propagateServerStatePageOperationError(error, operation, ownsOperation)
      }
      operation.assertCurrent(ownsOperation)
      await Promise.all([
        invalidateServerStateResource(operation.scope, 'user-imports'),
        invalidateServerStateResource(operation.scope, 'users'),
      ])
      operation.assertCurrent(ownsOperation)
      await refreshUsers()
      operation.assertCurrent(ownsOperation)
      ElMessage.success(translate('system.userImport.createSuccess'))
      importDialogVisible.value = false
      importHistoryVisible.value = true
    } finally {
      if (operation.isCurrent(ownsOperation)) importPreparing.value = false
    }
  }

  async function handleDownloadTemplate(): Promise<void> {
    if (templateLoading.value) return
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = beginServerStatePageOperation()
    operation.apply(() => {
      templateLoading.value = true
    }, ownsOperation)
    try {
      const blob = await downloadImportTemplate()
      if (operation.isCurrent(ownsOperation)) {
        downloadBlobDirect(blob, translate('system.userImport.templateFilename'))
      }
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    } finally {
      if (operation.isCurrent(ownsOperation)) templateLoading.value = false
    }
  }

  return {
    handleDownloadTemplate,
    importDialogVisible,
    importHistoryVisible,
    importLoading: computed(() => importPreparing.value || importMutation.pending.value),
    openHistory,
    openImport,
    submitImport,
    templateLoading,
  }
}
