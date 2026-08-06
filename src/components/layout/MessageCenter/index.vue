<template>
  <el-badge
    :value="badgeValue"
    :hidden="unreadCount === 0"
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

  <el-drawer
    v-model="visible"
    :title="t('messageCenter.title')"
    size="min(460px, 100vw)"
    append-to-body
    @open="handleDrawerOpen"
  >
    <div class="message-center__toolbar">
      <span
        class="message-center__connection"
        :class="`message-center__connection--${messageStore.connectionStatus}`"
      >
        {{ connectionLabel }}
      </span>
      <div class="message-center__toolbar-actions">
        <el-button text :loading="loading" @click="refresh">{{ t('common.refresh') }}</el-button>
        <el-button text :disabled="unreadCount === 0 || mutating" @click="markAllRead">
          {{ t('messageCenter.markAllRead') }}
        </el-button>
      </div>
    </div>

    <div class="message-center__batch-actions">
      <span>{{ t('messageCenter.selected', { count: selectedIds.length }) }}</span>
      <el-button
        type="danger"
        link
        :disabled="selectedIds.length === 0 || mutating"
        @click="deleteSelected"
      >
        {{ t('messageCenter.deleteSelected') }}
      </el-button>
    </div>

    <div v-loading="loading" class="message-center__body">
      <el-empty v-if="messages.length === 0" :description="t('messageCenter.empty')" />
      <el-scrollbar v-else class="message-center__scrollbar">
        <el-checkbox-group v-model="selectedIds" class="message-center__selection">
          <article
            v-for="message in messages"
            :key="message.id"
            class="message-item"
            :class="{ 'message-item--unread': !message.read_at }"
          >
            <el-checkbox
              :value="message.id"
              :aria-label="t('messageCenter.select', { title: message.title })"
            />
            <div class="message-item__content">
              <div class="message-item__heading">
                <button class="message-item__title" type="button" @click="openDetail(message)">
                  {{ message.title }}
                </button>
                <el-tag :type="severityType(message.severity)" size="small">
                  {{ severityLabel(message.severity) }}
                </el-tag>
              </div>
              <p class="message-item__text">{{ message.content }}</p>
              <div class="message-item__status">
                <el-tag :type="message.acked_at ? 'success' : 'info'" size="small" effect="plain">
                  {{ message.acked_at ? t('messageCenter.delivered') : t('messageCenter.deliveryPending') }}
                </el-tag>
                <el-tag :type="message.read_at ? 'success' : 'warning'" size="small" effect="plain">
                  {{ message.read_at ? t('messageCenter.read') : t('messageCenter.unread') }}
                </el-tag>
              </div>
              <div class="message-item__footer">
                <time :datetime="message.published_at">{{ formatTime(message.published_at) }}</time>
                <div class="message-item__actions">
                  <el-button link type="primary" @click="openDetail(message)">
                    {{ t('messageCenter.view') }}
                  </el-button>
                  <el-button
                    link
                    type="danger"
                    :disabled="mutating"
                    @click="deleteOne(message)"
                  >
                    {{ t('common.delete') }}
                  </el-button>
                </div>
              </div>
            </div>
          </article>
        </el-checkbox-group>
      </el-scrollbar>
    </div>
  </el-drawer>

  <el-dialog
    v-model="detailVisible"
    :title="detailMessage?.title || t('messageCenter.detailTitle')"
    width="min(720px, calc(100vw - 32px))"
    append-to-body
    destroy-on-close
  >
    <template v-if="detailMessage">
      <div class="message-detail__meta">
        <el-tag :type="severityType(detailMessage.severity)" size="small">
          {{ severityLabel(detailMessage.severity) }}
        </el-tag>
        <el-tag :type="detailMessage.acked_at ? 'success' : 'info'" size="small" effect="plain">
          {{ detailMessage.acked_at ? t('messageCenter.delivered') : t('messageCenter.deliveryPending') }}
        </el-tag>
        <el-tag :type="detailMessage.read_at ? 'success' : 'warning'" size="small" effect="plain">
          {{ detailMessage.read_at ? t('messageCenter.read') : t('messageCenter.unread') }}
        </el-tag>
        <time :datetime="detailMessage.published_at">{{ formatTime(detailMessage.published_at) }}</time>
      </div>
      <!-- 内容由禁用原始 HTML 的 markdown-it 渲染，并经过 DOMPurify 清洗。 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="message-detail__markdown" v-html="renderedDetail" />
    </template>
    <template #footer>
      <el-button @click="detailVisible = false">{{ t('common.confirm') }}</el-button>
      <el-button
        v-if="detailMessage"
        type="danger"
        :loading="mutating"
        @click="deleteOne(detailMessage)"
      >
        {{ t('common.delete') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Bell } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { MessageInboxQuery, MessageRecord } from '@/api/modules/messages'
import { useMessageCenterQueries } from '@/app/messages/messageQueries'
import { formatLocalizedDate } from '@/i18n'
import { renderMarkdown } from '@/shared/markdown/render'
import { useMessageStore } from '@/stores/message'

const messageStore = useMessageStore()
const inboxQuery = {
  limit: 100,
  unread_only: false,
} satisfies MessageInboxQuery
const messageCenter = useMessageCenterQueries(inboxQuery)
const { messages, unreadCount, loading, mutating } = messageCenter
const visible = ref(false)
const selectedIds = ref<string[]>([])
const detailVisible = ref(false)
const detailSeed = ref<MessageRecord>()
const { t } = useI18n()

const badgeValue = computed(() => unreadCount.value > 99 ? '99+' : unreadCount.value)
const connectionLabel = computed(() => ({
  connecting: t('messageCenter.connecting'),
  connected: t('messageCenter.connected'),
  retrying: t('messageCenter.retrying'),
  disconnected: t('messageCenter.disconnected'),
})[messageStore.connectionStatus])
const detailMessage = computed(() => {
  const id = detailSeed.value?.id
  return messages.value.find(message => message.id === id) ?? detailSeed.value
})
const renderedDetail = computed(() => renderMarkdown(detailMessage.value?.content ?? ''))

function acknowledgeReceivedMessages(records = messages.value): void {
  messageStore.queueAcknowledgement(
    records.filter(message => !message.acked_at).map(message => message.id),
  )
}

watch(
  messages,
  (records) => {
    const ids = records.map(message => message.id)
    messageStore.pruneDeletedMessages(ids)
    selectedIds.value = selectedIds.value.filter(id => ids.includes(id))
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
  messageStore.bindSession()
  // 缓存命中早于 mounted 时，此处补一次确认，避免会话尚未绑定导致漏记。
  acknowledgeReceivedMessages()
})

onUnmounted(() => {
  messageStore.unbindSession()
})

function openDrawer(): void {
  visible.value = true
}

function handleDrawerOpen(): void {
  void refresh()
}

async function openDetail(message: MessageRecord): Promise<void> {
  detailSeed.value = message
  detailVisible.value = true
  await nextTick()
  if (message.read_at) return
  try {
    await messageCenter.markRead(message.id)
  }
  catch {
    ElMessage.error(t('messageCenter.markReadFailed'))
  }
}

async function refresh(): Promise<void> {
  try {
    await messageCenter.refresh()
  }
  catch {
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
  }
  catch {
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
  }
  catch {
    return
  }
  await removeMessages([message.id])
}

async function removeMessages(ids: readonly string[]): Promise<boolean> {
  try {
    await messageCenter.remove(ids)
    messageStore.markMessagesDeleted(ids)
    if (detailSeed.value && ids.includes(detailSeed.value.id)) {
      detailVisible.value = false
      detailSeed.value = undefined
    }
    ElMessage.success(t('messageCenter.deleteSuccess'))
    return true
  }
  catch {
    ElMessage.error(t('messageCenter.deleteFailed'))
    return false
  }
}

async function markAllRead(): Promise<void> {
  try {
    await messageCenter.markAllRead()
  }
  catch {
    ElMessage.error(t('messageCenter.markAllReadFailed'))
  }
}

function severityType(severity: string): 'success' | 'warning' | 'danger' | 'info' {
  if (severity === 'success') return 'success'
  if (severity === 'warning' || severity === 'warn') return 'warning'
  if (severity === 'error' || severity === 'danger' || severity === 'critical') return 'danger'
  return 'info'
}

function severityLabel(severity: string): string {
  if (severity === 'success') return t('messageCenter.severitySuccess')
  if (severity === 'warning' || severity === 'warn') return t('messageCenter.severityWarning')
  if (severity === 'error' || severity === 'danger' || severity === 'critical') {
    return t('messageCenter.severityError')
  }
  return t('messageCenter.severityInfo')
}

function formatTime(value: string): string {
  return formatLocalizedDate(value)
}
</script>

<style scoped lang="scss">
.message-center-trigger :deep(.el-badge__content) {
  transform: translateY(-4px) translateX(4px);
}

.message-center__toolbar,
.message-center__batch-actions,
.message-item__heading,
.message-item__footer,
.message-item__actions,
.message-item__status,
.message-detail__meta {
  display: flex;
  align-items: center;
}

.message-center__toolbar {
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.message-center__toolbar-actions,
.message-item__actions,
.message-item__status,
.message-detail__meta {
  display: flex;
  gap: 6px;
}

.message-center__connection {
  color: var(--el-text-color-secondary);
  font-size: 12px;

  &--connected {
    color: var(--el-color-success);
  }

  &--retrying,
  &--connecting {
    color: var(--el-color-warning);
  }
}

.message-center__batch-actions {
  justify-content: space-between;
  padding: 10px 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.message-center__body {
  min-height: 220px;
}

.message-center__scrollbar {
  max-height: calc(100vh - 210px);
}

.message-center__selection {
  display: block;
}

.message-item {
  display: flex;
  gap: 10px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &--unread {
    padding-left: 8px;
    border-left: 3px solid var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.message-item__content {
  min-width: 0;
  flex: 1;
}

.message-item__heading {
  justify-content: space-between;
  gap: 8px;
}

.message-item__title {
  overflow: hidden;
  max-width: 300px;
  border: 0;
  background: transparent;
  color: var(--el-text-color-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-item__text {
  display: -webkit-box;
  overflow: hidden;
  margin: 6px 0;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.message-item__status {
  margin-bottom: 6px;
}

.message-item__footer {
  justify-content: space-between;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.message-detail__meta {
  flex-wrap: wrap;
  margin-bottom: 18px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.message-detail__markdown {
  overflow-wrap: anywhere;
  color: var(--el-text-color-primary);
  line-height: 1.7;

  :deep(pre) {
    overflow: auto;
    padding: 12px;
    border-radius: 6px;
    background: var(--el-fill-color-light);
  }

  :deep(img) {
    max-width: 100%;
  }

  :deep(table) {
    display: block;
    overflow-x: auto;
    max-width: 100%;
    border-collapse: collapse;
  }

  :deep(th),
  :deep(td) {
    padding: 6px 10px;
    border: 1px solid var(--el-border-color);
  }
}
</style>
