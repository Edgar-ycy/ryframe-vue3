import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MessageRecord } from '@/api/modules/messages'

interface MessageCenterActions {
  markRead: (id: string) => Promise<unknown>
  refresh: () => Promise<unknown>
  remove: (ids: string[]) => Promise<unknown>
  markAllRead: () => Promise<unknown>
}

interface MessageStoreActions {
  markMessagesDeleted: (ids: string[]) => void
}

interface UseMessageCenterActionsOptions {
  detailSeed: Ref<MessageRecord | undefined>
  detailVisible: Ref<boolean>
  messageCenter: MessageCenterActions
  messageStore: MessageStoreActions
  selectedIds: Ref<string[]>
}

export function useMessageCenterActions({
  detailSeed,
  detailVisible,
  messageCenter,
  messageStore,
  selectedIds,
}: UseMessageCenterActionsOptions) {
  const { t } = useI18n()

  async function openDetail(message: MessageRecord): Promise<void> {
    detailSeed.value = message
    detailVisible.value = true
    await nextTick()
    if (message.read_at) return
    try {
      await messageCenter.markRead(message.id)
    } catch {
      ElMessage.error(t('messageCenter.markReadFailed'))
    }
  }

  async function refresh(): Promise<void> {
    try {
      await messageCenter.refresh()
    } catch {
      ElMessage.warning(t('messageCenter.refreshFailed'))
    }
  }

  async function deleteSelected(): Promise<void> {
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
    if (await removeMessages(ids)) selectedIds.value = []
  }

  async function deleteOne(message: MessageRecord): Promise<void> {
    try {
      await ElMessageBox.confirm(
        t('messageCenter.deleteOneConfirm', { title: message.title }),
        t('messageCenter.deleteConfirmTitle'),
        { type: 'warning' },
      )
    } catch {
      return
    }
    await removeMessages([message.id])
  }

  async function removeMessages(ids: string[]): Promise<boolean> {
    try {
      await messageCenter.remove(ids)
      messageStore.markMessagesDeleted(ids)
      if (detailSeed.value && ids.includes(detailSeed.value.id)) {
        detailVisible.value = false
        detailSeed.value = undefined
      }
      ElMessage.success(t('messageCenter.deleteSuccess'))
      return true
    } catch {
      ElMessage.error(t('messageCenter.deleteFailed'))
      return false
    }
  }

  async function markAllRead(): Promise<void> {
    try {
      await messageCenter.markAllRead()
    } catch {
      ElMessage.error(t('messageCenter.markAllReadFailed'))
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
