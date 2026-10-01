import type { Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TenantConfigBundle, TenantConfigTransfer } from '@/api/modules/tenantConfigTransfer'
import { HttpError } from '@/shared/http/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { useTenantConfigTransferManagement } from './composables/useTenantConfigTransferManagement'

type Management = Pick<
  ReturnType<typeof useTenantConfigTransferManagement>,
  | 'applyTransfer'
  | 'captureIdentity'
  | 'createFromPackage'
  | 'createPackage'
  | 'downloadPackage'
  | 'fetchData'
  | 'fetchItems'
  | 'fetchPackages'
  | 'identityMatches'
  | 'itemQueryParams'
  | 'previewTransfer'
  | 'queryParams'
  | 'rollbackTransfer'
  | 'selectPackage'
  | 'selectTransfer'
  | 'uploadPackage'
>

interface ConfigTransferPageActionsOptions {
  historyVisible: Ref<boolean>
  management: Management
  t: (key: string) => string
  uploadVisible: Ref<boolean>
}

/** 配置迁移页面的异步副作用只允许回写到发起操作的完整会话范围。 */
export function createConfigTransferPageActions(options: ConfigTransferPageActionsOptions) {
  const { historyVisible, management, t, uploadVisible } = options

  function beginPageOperation() {
    const operation = beginServerStatePageOperation()
    const guard = management.captureIdentity()
    const ownsOperation = () => management.identityMatches(guard)
    operation.assertCurrent(ownsOperation)
    return { guard, operation, ownsOperation }
  }

  function showError(error: unknown, page: ReturnType<typeof beginPageOperation>): void {
    if (!page.operation.isCurrent(page.ownsOperation)) {
      page.operation.assertCurrent(page.ownsOperation)
    }
    if (error instanceof HttpError && error.kind === 'cancelled') throw error
    const message = error instanceof Error ? error.message : t('shell.http.requestFailed')
    page.operation.apply(() => ElMessage.error(message), page.ownsOperation)
  }

  async function refreshPackages(): Promise<void> {
    const page = beginPageOperation()
    try {
      await management.fetchPackages()
      page.operation.assertCurrent(page.ownsOperation)
    } catch (error) {
      showError(error, page)
    }
  }

  async function refreshTransfers(): Promise<void> {
    const page = beginPageOperation()
    try {
      await management.fetchData()
      page.operation.assertCurrent(page.ownsOperation)
    } catch (error) {
      showError(error, page)
    }
  }

  async function handleGeneratePackage(): Promise<void> {
    const page = beginPageOperation()
    try {
      const bundle = await management.createPackage()
      page.operation.assertCurrent(page.ownsOperation)
      await management.selectPackage(bundle, page.guard)
      page.operation.apply(
        () => ElMessage.success(t('tenantConfigTransfer.createPackageSuccess')),
        page.ownsOperation,
      )
    } catch (error) {
      showError(error, page)
    }
  }

  async function handleSelectPackage(bundle: TenantConfigBundle): Promise<void> {
    const page = beginPageOperation()
    try {
      await management.selectPackage(bundle, page.guard)
      page.operation.assertCurrent(page.ownsOperation)
    } catch (error) {
      showError(error, page)
    }
  }

  async function handleCreateFromPackage(bundle: TenantConfigBundle): Promise<void> {
    const page = beginPageOperation()
    try {
      await management.selectPackage(bundle, page.guard)
      page.operation.assertCurrent(page.ownsOperation)
      await management.createFromPackage(bundle)
      page.operation.apply(
        () => ElMessage.success(t('tenantConfigTransfer.createTransferSuccess')),
        page.ownsOperation,
      )
    } catch (error) {
      showError(error, page)
    }
  }

  async function handleUploadPackage(file: File): Promise<void> {
    const page = beginPageOperation()
    try {
      await management.uploadPackage(file)
      page.operation.apply(() => {
        uploadVisible.value = false
      }, page.ownsOperation)
      page.operation.apply(
        () => ElMessage.success(t('tenantConfigTransfer.uploadSuccess')),
        page.ownsOperation,
      )
    } catch (error) {
      showError(error, page)
    }
  }

  async function handleDownloadPackage(bundle: TenantConfigBundle): Promise<void> {
    const page = beginPageOperation()
    try {
      await management.downloadPackage(bundle)
      page.operation.apply(
        () => ElMessage.success(t('tenantConfigTransfer.downloadSuccess')),
        page.ownsOperation,
      )
    } catch (error) {
      showError(error, page)
    }
  }

  async function handlePreview(transfer: TenantConfigTransfer): Promise<void> {
    const page = beginPageOperation()
    try {
      await management.previewTransfer(transfer)
      page.operation.apply(
        () => ElMessage.success(t('tenantConfigTransfer.previewSubmitted')),
        page.ownsOperation,
      )
    } catch (error) {
      showError(error, page)
    }
  }

  async function handleApply(transfer: TenantConfigTransfer): Promise<void> {
    const page = beginPageOperation()
    try {
      await ElMessageBox.confirm(
        t('tenantConfigTransfer.applyConfirm'),
        t('tenantConfigTransfer.applyConfirmTitle'),
        {
          type: 'warning',
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
        },
      )
      page.operation.assertCurrent(page.ownsOperation)
      await management.applyTransfer(transfer)
      page.operation.apply(
        () => ElMessage.success(t('tenantConfigTransfer.applySubmitted')),
        page.ownsOperation,
      )
    } catch (error) {
      if (page.operation.isCurrent(page.ownsOperation) && (error === 'cancel' || error === 'close'))
        return
      showError(error, page)
    }
  }

  async function handleRollback(transfer: TenantConfigTransfer): Promise<void> {
    const page = beginPageOperation()
    try {
      await ElMessageBox.confirm(
        t('tenantConfigTransfer.rollbackConfirm'),
        t('tenantConfigTransfer.rollbackConfirmTitle'),
        {
          type: 'warning',
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
        },
      )
      page.operation.assertCurrent(page.ownsOperation)
      await management.rollbackTransfer(transfer)
      page.operation.apply(
        () => ElMessage.success(t('tenantConfigTransfer.rollbackSubmitted')),
        page.ownsOperation,
      )
    } catch (error) {
      if (page.operation.isCurrent(page.ownsOperation) && (error === 'cancel' || error === 'close'))
        return
      showError(error, page)
    }
  }

  async function handleItemsPageChange(nextPage: number, pageSize: number): Promise<void> {
    const page = beginPageOperation()
    page.operation.apply(() => {
      management.itemQueryParams.value.page = nextPage
    }, page.ownsOperation)
    page.operation.apply(() => {
      management.itemQueryParams.value.page_size = pageSize
    }, page.ownsOperation)
    try {
      await management.fetchItems()
      page.operation.assertCurrent(page.ownsOperation)
    } catch (error) {
      showError(error, page)
    }
  }

  async function handleHistoryPageChange(page: number, pageSize: number): Promise<void> {
    const operationPage = beginPageOperation()
    operationPage.operation.apply(() => {
      management.queryParams.value.page = page
    }, operationPage.ownsOperation)
    operationPage.operation.apply(() => {
      management.queryParams.value.page_size = pageSize
    }, operationPage.ownsOperation)
    try {
      await management.fetchData()
      operationPage.operation.assertCurrent(operationPage.ownsOperation)
    } catch (error) {
      showError(error, operationPage)
    }
  }

  async function handleSelectTransfer(transfer: TenantConfigTransfer): Promise<void> {
    const page = beginPageOperation()
    try {
      await management.selectTransfer(transfer, page.guard)
      page.operation.apply(() => {
        historyVisible.value = false
      }, page.ownsOperation)
    } catch (error) {
      showError(error, page)
    }
  }

  return {
    handleApply,
    handleCreateFromPackage,
    handleDownloadPackage,
    handleGeneratePackage,
    handleHistoryPageChange,
    handleItemsPageChange,
    handlePreview,
    handleRollback,
    handleSelectPackage,
    handleSelectTransfer,
    handleUploadPackage,
    refreshPackages,
    refreshTransfers,
  }
}
