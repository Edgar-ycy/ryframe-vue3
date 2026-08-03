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
    size="min(420px, 100vw)"
    append-to-body
    @open="handleDrawerOpen"
  >
    <div class="message-center__toolbar">
      <span class="message-center__connection" :class="`message-center__connection--${messageStore.connectionStatus}`">
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
      <el-button type="primary" link :disabled="selectedIds.length === 0 || mutating" @click="acknowledgeSelected">
        {{ t('messageCenter.acknowledge') }}
      </el-button>
    </div>

    <div v-loading="loading" class="message-center__body">
      <el-empty v-if="messages.length === 0" :description="t('messageCenter.empty')" />
      <el-scrollbar v-else class="message-center__scrollbar">
        <article
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="{ 'message-item--unread': !message.read_at }"
        >
          <el-checkbox
            v-model="selectedIds"
            :value="message.id"
            :aria-label="t('messageCenter.select', { title: message.title })"
          />
          <div class="message-item__content">
            <div class="message-item__heading">
              <button class="message-item__title" type="button" @click="markRead(message)">
                {{ message.title }}
              </button>
              <el-tag :type="severityType(message.severity)" size="small">{{ severityLabel(message.severity) }}</el-tag>
            </div>
            <p class="message-item__text">{{ message.content }}</p>
            <div class="message-item__footer">
              <time :datetime="message.published_at">{{ formatTime(message.published_at) }}</time>
              <div class="message-item__actions">
                <el-tag v-if="message.acked_at" size="small" type="success">{{ t('messageCenter.acknowledged') }}</el-tag>
                <el-button v-else link type="primary" :disabled="mutating" @click="acknowledgeMessage(message.id)">
                  {{ t('messageCenter.acknowledge') }}
                </el-button>
                <el-button v-if="!message.read_at" link type="primary" :disabled="mutating" @click="markRead(message)">
                  {{ t('messageCenter.markRead') }}
                </el-button>
              </div>
            </div>
          </div>
        </article>
      </el-scrollbar>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { Bell } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { MessageInboxQuery, MessageRecord } from '@/api/modules/messages'
import { useMessageCenterQueries } from '@/app/messages/messageQueries'
import { formatLocalizedDate } from '@/i18n'
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
const { t } = useI18n()

const badgeValue = computed(() => unreadCount.value > 99 ? '99+' : unreadCount.value)
const connectionLabel = computed(() => ({
  connecting: t('messageCenter.connecting'),
  connected: t('messageCenter.connected'),
  retrying: t('messageCenter.retrying'),
  disconnected: t('messageCenter.disconnected'),
})[messageStore.connectionStatus])

watch(
  () => messages.value.map(message => message.id),
  (ids) => {
    selectedIds.value = selectedIds.value.filter(id => ids.includes(id))
  },
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

async function refresh(): Promise<void> {
  try {
    await messageCenter.refresh()
  }
  catch {
    ElMessage.warning(t('messageCenter.refreshFailed'))
  }
}

async function acknowledgeSelected(): Promise<void> {
  try {
    await messageCenter.acknowledge(selectedIds.value)
    selectedIds.value = []
  }
  catch {
    ElMessage.error(t('messageCenter.acknowledgeFailed'))
  }
}

async function acknowledgeMessage(id: string): Promise<void> {
  try {
    await messageCenter.acknowledge([id])
  }
  catch {
    ElMessage.error(t('messageCenter.acknowledgeFailed'))
  }
}

async function markRead(message: MessageRecord): Promise<void> {
  try {
    await messageCenter.markRead(message.id)
  }
  catch {
    ElMessage.error(t('messageCenter.markReadFailed'))
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
.message-item__actions {
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
.message-item__actions {
  display: flex;
  gap: 4px;
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
  max-width: 280px;
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

.message-item__footer {
  justify-content: space-between;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
