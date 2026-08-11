<template>
  <el-dialog
    v-model="visible"
    :title="message?.title || t('messageCenter.detailTitle')"
    width="min(720px, calc(100vw - 32px))"
    append-to-body
    destroy-on-close
  >
    <template v-if="message">
      <div class="message-detail__meta">
        <el-tag :type="messageSeverityType(message.severity)" size="small">
          {{ severityLabel(message.severity) }}
        </el-tag>
        <el-tag :type="message.acked_at ? 'success' : 'info'" size="small" effect="plain">
          {{ message.acked_at ? t('messageCenter.delivered') : t('messageCenter.deliveryPending') }}
        </el-tag>
        <el-tag :type="message.read_at ? 'success' : 'warning'" size="small" effect="plain">
          {{ message.read_at ? t('messageCenter.read') : t('messageCenter.unread') }}
        </el-tag>
        <time :datetime="message.published_at">{{ formatMessageTime(message.published_at) }}</time>
      </div>
      <!-- 内容由禁用原始 HTML 的 markdown-it 渲染，并经过 DOMPurify 清洗。 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="message-detail__markdown" v-html="renderedDetail" />
    </template>
    <template #footer>
      <el-button @click="visible = false">{{ t('common.confirm') }}</el-button>
      <el-button
        v-if="message"
        type="danger"
        :loading="mutating"
        @click="emit('delete-one', message)"
      >
        {{ t('common.delete') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { MessageRecord } from '@/api/modules/messages'
import { renderMarkdown } from '@/shared/markdown/render'
import { formatMessageTime, messageSeverityType } from './formatters'

const props = defineProps<{
  message?: MessageRecord
  mutating: boolean
}>()

const emit = defineEmits<{
  'delete-one': [message: MessageRecord]
}>()

const { t } = useI18n()
const visible = defineModel<boolean>('visible', { required: true })
const renderedDetail = computed(() => renderMarkdown(props.message?.content ?? ''))

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
.message-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
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
