import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MessageRecord } from '@/api/modules/messages'
import { HttpError } from '@/shared/http/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'
import type { MessageDetailSeed } from './messageCenterState'

interface MessageCenterActions {
  markRead: (id: string, expectedScope: ServerStateScope) => Promise<unknown>
  refresh: (expectedScope: ServerStateScope) => Promise<unknown>
  remove: (ids: string[], expectedScope: ServerStateScope) => Promise<unknown>
  markAllRead: (expectedScope: ServerStateScope) => Promise<unknown>
}

interface MessageStoreActions {
  markMessagesDeleted: (ids: string[]) => void
}

interface UseMessageCenterActionsOptions {
  detailSeed: Ref<MessageDetailSeed | undefined>
  detailVisible: Ref<boolean>
  messageCenter: MessageCenterActions
  messageStore: MessageStoreActions
  pageGeneration: Ref<number>
  selectedIds: Ref<string[]>
}

export function useMessageCenterActions({
  detailSeed,
  detailVisible,
  messageCenter,
  messageStore,
  pageGeneration,
  selectedIds,
}: UseMessageCenterActionsOptions) {
  const { t } = useI18n()

  function beginPageOperation() {
    const generation = pageGeneration.value
    try {
      const operation = beginServerStatePageOperation()
      return {
        operation,
        ownsOperation: () => pageGeneration.value === generation,
      }
    } catch (error) {
      if (error instanceof HttpError && error.kind === 'cancelled') return undefined
      throw error
    }
  }

  function shouldReportFailure(
    page: NonNullable<ReturnType<typeof beginPageOperation>>,
    error: unknown,
  ): boolean {
    return (
      page.operation.isCurrent(page.ownsOperation) &&
      !(error instanceof HttpError && error.kind === 'cancelled')
    )
  }

  async function openDetail(message: MessageRecord): Promise<void> {
    const page = beginPageOperation()
    if (!page) return
    page.operation.apply(() => {
      detailSeed.value = { message, scope: page.operation.scope }
      detailVisible.value = true
    }, page.ownsOperation)
    try {
      await nextTick()
      page.operation.assertCurrent(page.ownsOperation)
      if (message.read_at) return
      await messageCenter.markRead(message.id, page.operation.scope)
      page.operation.assertCurrent(page.ownsOperation)
    } catch (error) {
      if (shouldReportFailure(page, error)) ElMessage.error(t('messageCenter.markReadFailed'))
    }
  }

  async function refresh(): Promise<void> {
    const page = beginPageOperation()
    if (!page) return
    try {
      await messageCenter.refresh(page.operation.scope)
      page.operation.assertCurrent(page.ownsOperation)
    } catch (error) {
      if (shouldReportFailure(page, error)) ElMessage.warning(t('messageCenter.refreshFailed'))
    }
  }

  async function deleteSelected(): Promise<void> {
    const page = beginPageOperation()
    if (!page) return
    const ids = [...selectedIds.value]
    if (ids.length === 0) return
    try {
      await ElMessageBox.confirm(
        t('messageCenter.deleteSelectedConfirm', { count: ids.length }),
        t('messageCenter.deleteConfirmTitle'),
        { type: 'warning' },
      )
    } catch {
      return
    }
    if (await removeMessages(ids, page)) {
      try {
        page.operation.apply(() => {
          selectedIds.value = []
        }, page.ownsOperation)
      } catch (error) {
        if (!(error instanceof HttpError && error.kind === 'cancelled')) throw error
      }
    }
  }

  async function deleteOne(message: MessageRecord): Promise<void> {
    const page = beginPageOperation()
    if (!page) return
    try {
      await ElMessageBox.confirm(
        t('messageCenter.deleteOneConfirm', { title: message.title }),
        t('messageCenter.deleteConfirmTitle'),
        { type: 'warning' },
      )
    } catch {
      return
    }
    await removeMessages([message.id], page)
  }

  async function removeMessages(
    ids: string[],
    page: NonNullable<ReturnType<typeof beginPageOperation>>,
  ): Promise<boolean> {
    try {
      page.operation.assertCurrent(page.ownsOperation)
      await messageCenter.remove(ids, page.operation.scope)
      page.operation.apply(() => {
        messageStore.markMessagesDeleted(ids)
        if (detailSeed.value && ids.includes(detailSeed.value.message.id)) {
          detailVisible.value = false
          detailSeed.value = undefined
        }
        ElMessage.success(t('messageCenter.deleteSuccess'))
      }, page.ownsOperation)
      return true
    } catch (error) {
      if (shouldReportFailure(page, error)) ElMessage.error(t('messageCenter.deleteFailed'))
      return false
    }
  }

  async function markAllRead(): Promise<void> {
    const page = beginPageOperation()
    if (!page) return
    try {
      await messageCenter.markAllRead(page.operation.scope)
      page.operation.assertCurrent(page.ownsOperation)
    } catch (error) {
      if (shouldReportFailure(page, error)) ElMessage.error(t('messageCenter.markAllReadFailed'))
    }
  }

  return {
    deleteOne,
    deleteSelected,
    markAllRead,
    openDetail,
    refresh,
  }
}
