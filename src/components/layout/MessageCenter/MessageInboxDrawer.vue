<template>
  <el-drawer
    v-model="visible"
    :title="t('messageCenter.title')"
    size="min(460px, 100vw)"
    append-to-body
    @open="emit('drawer-open')"
  >
    <div class="message-center__toolbar">
      <span
        class="message-center__connection"
        :class="`message-center__connection--${connectionStatus}`"
      >
        {{ connectionLabel }}
      </span>
      <div class="message-center__toolbar-actions">
        <el-button
          v-if="connectionStatus === 'degraded'"
          text
          @click="emit('retry-realtime')"
        >
          {{ t('messageCenter.retryRealtime') }}
        </el-button>
        <el-button text :loading="loading" @click="emit('refresh')">{{ t('common.refresh') }}</el-button>
        <el-button text :loading="mutating" :disabled="unreadCount === 0 || mutating" @click="emit('mark-all-read')">
          {{ t('messageCenter.markAllRead') }}
        </el-button>
      </div>
    </div>

    <div class="message-center__batch-actions">
      <span>{{ t('messageCenter.selected', { count: selectedIds.length }) }}</span>
      <el-button
        type="danger"
        link
        :loading="mutating"
        :disabled="selectedIds.length === 0 || mutating"
        @click="emit('delete-selected')"
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
                <button class="message-item__title" type="button" @click="emit('open-detail', message)">
                  {{ message.title }}
                </button>
                <el-tag :type="messageSeverityType(message.severity)" size="small">
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
                <time :datetime="message.published_at">{{ formatMessageTime(message.published_at) }}</time>
                <div class="message-item__actions">
                  <el-button link type="primary" @click="emit('open-detail', message)">
                    {{ t('messageCenter.view') }}
                  </el-button>
                  <el-button
                    link
                    type="danger"
                    :loading="mutating"
                    :disabled="mutating"
                    @click="emit('delete-one', message)"
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
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { MessageRecord } from '@/api/modules/messages'
import { formatMessageTime, messageSeverityType } from './formatters'

defineProps<{
  connectionStatus: string
  connectionLabel: string
  messages: MessageRecord[]
  unreadCount: number
  loading: boolean
  mutating: boolean
}>()

const emit = defineEmits<{
  'drawer-open': []
  'retry-realtime': []
  refresh: []
  'mark-all-read': []
  'delete-selected': []
  'open-detail': [message: MessageRecord]
  'delete-one': [message: MessageRecord]
}>()

const { t } = useI18n()
const visible = defineModel<boolean>('visible', { required: true })
const selectedIds = defineModel<string[]>('selectedIds', { required: true })

function severityLabel(severity: string): string {
  if (severity === 'success') return t('messageCenter.severitySuccess')
  if (severity === 'warning' || severity === 'warn') return t('messageCenter.severityWarning')
  if (severity === 'error' || severity === 'danger' || severity === 'critical') {
    return t('messageCenter.severityError')
  }
  return t('messageCenter.severityInfo')
}
</script>

<style scoped lang="scss">
.message-center__toolbar,
.message-center__batch-actions,
.message-item__heading,
.message-item__footer,
.message-item__actions,
.message-item__status {
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
.message-item__status {
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

  &--degraded {
    color: var(--el-color-info);
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
</style>
