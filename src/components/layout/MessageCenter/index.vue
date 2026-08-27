<template>
  <el-badge
    :value="badgeValue()"
    :hidden="(unreadData ?? 0) === 0"
    :max="99"
    class="message-center-trigger"
  >
    <el-button
      text
      circle
      :aria-label="t('messageCenter.open')"
      :title="t('messageCenter.title')"
      @click="openDrawer"
    >
      <el-icon :size="20"><Bell /></el-icon>
    </el-button>
  </el-badge>

  <MessageInboxDrawer
    v-if="visible"
    v-model:visible="visible"
    v-model:selected-ids="selectedIds"
    :connection-status="messageStore.connectionStatus"
    :connection-label="connectionLabel()"
    :messages="inboxData?.records ?? []"
    :unread-count="unreadData ?? 0"
    :loading="inboxLoading || unreadLoading"
    :mutating="mutating"
    @drawer-open="handleDrawerOpen"
    @retry-realtime="restartRealtime"
    @refresh="refresh"
    @mark-all-read="markAllRead"
    @delete-selected="deleteSelected"
    @open-detail="openDetail"
    @delete-one="deleteOne"
  />

  <MessageDetailDialog
    v-if="detailVisible"
    v-model:visible="detailVisible"
    :message="detailMessage()"
    :mutating="mutating"
    @delete-one="deleteOne"
  />
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { MessageInboxQuery, MessageRecord } from '@/api/modules/messages'
import { messageController } from '@/app/messages/messageController'
import { useMessageCenterQueries } from '@/app/messages/messageQueries'
import MessageDetailDialog from './MessageDetailDialog.vue'
import MessageInboxDrawer from './MessageInboxDrawer.vue'
import { useMessageCenterActions } from './useMessageCenterActions'
import { useMessageStore } from '@/stores/message'

const messageStore = useMessageStore()
const inboxQuery = {
  limit: 100,
  unread_only: false,
} satisfies MessageInboxQuery
const messageCenter = useMessageCenterQueries(inboxQuery)
const { inboxData, unreadData, inboxLoading, unreadLoading, mutating } = messageCenter
const visible = ref(false)
const selectedIds = ref<string[]>([])
const detailVisible = ref(false)
const detailSeed = ref<MessageRecord>()
const { t } = useI18n()

function badgeValue(): string | number {
  const unreadCount = unreadData.value ?? 0
  return unreadCount > 99 ? '99+' : unreadCount
}

function connectionLabel(): string {
  return (
    {
      connecting: t('messageCenter.connecting'),
      connected: t('messageCenter.connected'),
      retrying: t('messageCenter.retrying'),
      degraded: t('messageCenter.degraded'),
      disconnected: t('messageCenter.disconnected'),
    }[messageStore.connectionStatus] ?? t('messageCenter.disconnected')
  )
}

function currentMessages(): MessageRecord[] {
  return inboxData.value?.records ?? []
}

function detailMessage(): MessageRecord | undefined {
  const id = detailSeed.value?.id
  return currentMessages().find((message) => message.id === id) ?? detailSeed.value
}

const { deleteOne, deleteSelected, markAllRead, openDetail, refresh } = useMessageCenterActions({
  detailSeed,
  detailVisible,
  messageCenter,
  messageStore: messageController,
  selectedIds,
})

function acknowledgeReceivedMessages(records = currentMessages()): void {
  messageController.queueAcknowledgement(
    records.filter((message) => !message.acked_at).map((message) => message.id),
  )
}

watch(
  currentMessages,
  (records) => {
    const ids = records.map((message) => message.id)
    messageController.pruneDeletedMessages(ids)
    selectedIds.value = selectedIds.value.filter((id) => ids.includes(id))
    // 无论来源是首次加载、手动刷新还是补拉，进入收件箱即自动确认送达。
    acknowledgeReceivedMessages(records)
  },
  { immediate: true },
)

watch(
  () => messageStore.socketError,
  (message) => {
    if (!message) return
    ElMessage.warning(message)
    messageStore.clearSocketError()
  },
)

onMounted(() => {
  messageController.bindSession()
  // 缓存命中早于 mounted 时，此处补一次确认，避免会话尚未绑定导致漏记。
  acknowledgeReceivedMessages()
})

onUnmounted(() => {
  messageController.unbindSession()
})

function restartRealtime(): void {
  messageController.restartConnection()
}

function openDrawer(): void {
  visible.value = true
}

function handleDrawerOpen(): void {
  void refresh()
}
</script>

<style scoped lang="scss">
.message-center-trigger :deep(.el-badge__content) {
  transform: translateY(-4px) translateX(4px);
}
</style>
