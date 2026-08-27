import { ElMessage } from 'element-plus'
import { createUserImport } from '@/api/modules/userImport'
import { downloadImportTemplate } from '@/api/modules/user'
import { downloadBlobDirect } from '@/hooks/useDownload'
import { translate } from '@/i18n'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'

interface ImportCommand {
  file: File
  idempotencyKey: string
  signature: string
}

/** 用户页的模板下载、异步导入创建和历史抽屉状态。 */
export function useUserImportManagement(refreshUsers: () => void | Promise<unknown>) {
  const importDialogVisible = ref(false)
  const importHistoryVisible = ref(false)
  const templateLoading = ref(false)
  const pendingKeys = new Map<string, string>()

  const importMutation = useServerStateMutation('user-imports', {
    mutationFn: ({ file, idempotencyKey }: ImportCommand) => createUserImport(file, idempotencyKey),
    onSuccess: () => ElMessage.success(translate('system.userImport.createSuccess')),
  })

  function openImport(): void {
    if (importMutation.pending.value) return
    importDialogVisible.value = true
  }

  function openHistory(): void {
    importHistoryVisible.value = true
  }

  async function submitImport(file: File): Promise<void> {
    if (importMutation.pending.value) return
    const signature = `${file.name}:${file.size}:${file.lastModified}`
    const idempotencyKey = pendingKeys.get(signature) ?? createIdempotencyKey('user-import')
    const command = { file, idempotencyKey, signature }
    try {
      await importMutation.mutateAsync(command)
      pendingKeys.delete(signature)
    } catch (error) {
      if (shouldReuseIdempotencyKey(error)) pendingKeys.set(signature, idempotencyKey)
      else pendingKeys.delete(signature)
      throw error
    }
    importDialogVisible.value = false
    importHistoryVisible.value = true
    await refreshUsers()
  }

  async function handleDownloadTemplate(): Promise<void> {
    if (templateLoading.value) return
    templateLoading.value = true
    try {
      const blob = await downloadImportTemplate()
      downloadBlobDirect(blob, translate('system.userImport.templateFilename'))
    } finally {
      templateLoading.value = false
    }
  }

  return {
    handleDownloadTemplate,
    importDialogVisible,
    importHistoryVisible,
    importLoading: importMutation.pending,
    openHistory,
    openImport,
    submitImport,
    templateLoading,
  }
}
